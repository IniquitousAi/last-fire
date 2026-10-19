"""First-person arms for Last Fire: one armature, nanite-suit sleeves, gloved hands, grip solver, baker.

Reusable for every gun: a gun script supplies the grip contacts (where each hand goes on its gun)
and the motion; this module owns the body.

Hand space (per hand): origin at the wrist joint, +Y toward the middle knuckle, +Z out of the back
of the hand. For the right hand +X points to the little finger; the left hand is the mirror image
(+X toward its thumb). Every finger bone uses the same convention (Y along the bone, Z toward the
nail), so curling a finger is a negative rotation about its local X on both hands.
"""
import bpy, bmesh, math
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from fp_lib import *  # noqa

# ---------------------------------------------------------------------------
#  The hand (right hand numbers; the left is mirrored in X). Gloved sizes, metres.
# ---------------------------------------------------------------------------
#        name      MCP knuckle               yaw  phalanx lengths            radii (MCP, PIP, DIP, tip)
FINGERS = [
    ('index',  (-0.0265, 0.088, 0.004),   7.0, (0.044, 0.026, 0.021), (0.0100, 0.0093, 0.0086, 0.0079)),
    ('middle', (-0.0078, 0.092, 0.005),   1.5, (0.048, 0.029, 0.023), (0.0103, 0.0096, 0.0088, 0.0081)),
    ('ring',   ( 0.0108, 0.088, 0.003),  -4.0, (0.045, 0.028, 0.022), (0.0098, 0.0091, 0.0084, 0.0077)),
    ('pinky',  ( 0.0272, 0.079, -0.001), -10.0, (0.035, 0.022, 0.019), (0.0088, 0.0082, 0.0076, 0.0069)),
]
THUMB = dict(cmc=(-0.0195, 0.022, -0.007), dir=(-0.60, 0.72, -0.34), nail=(-0.55, 0.12, 0.82),
             lens=(0.042, 0.032, 0.027), radii=(0.0135, 0.0121, 0.0109, 0.0097))
REST_CURL = 8.0          # degrees per finger joint in the rest pose (a relaxed hand)
HAND_LEN = 0.075         # hand bone: wrist -> palm
DIGITS = ['thumb', 'index', 'middle', 'ring', 'pinky']


def _mx(v, side):
    return Vector((-v[0], v[1], v[2])) if side == 'L' else Vector(v)


def hand_bone_defs(side):
    """[(name, parent, head, tail, zhint, r_head, r_tail)] in hand space."""
    s = side
    defs = [('hand_' + s, None, Vector((0, 0, 0)), Vector((0, HAND_LEN, 0)), Vector((0, 0, 1)), 0.02, 0.02)]
    for name, mcp, yaw, lens, radii in FINGERS:
        p = _mx(mcp, side)
        sgn = 1 if side == 'R' else -1
        d = Vector((-math.sin(D2R(yaw)) * sgn, math.cos(D2R(yaw)), 0.0))
        z = Vector((0, 0, 1))
        parent = 'hand_' + s
        for j in range(3):
            x = d.cross(z).normalized()
            d = (Quaternion(x, -D2R(REST_CURL)) @ d).normalized()
            z = (Quaternion(x, -D2R(REST_CURL)) @ z).normalized()
            tail = p + d * lens[j]
            bn = '%s_%02d_%s' % (name, j + 1, s)
            defs.append((bn, parent, p.copy(), tail, z.copy(), radii[j], radii[j + 1]))
            parent, p = bn, tail
    p = _mx(THUMB['cmc'], side)
    d = _mx(THUMB['dir'], side).normalized()
    z = _mx(THUMB['nail'], side)
    z = (z - d * z.dot(d)).normalized()
    parent = 'hand_' + s
    for j in range(3):
        tail = p + d * THUMB['lens'][j]
        bn = 'thumb_%02d_%s' % (j + 1, s)
        defs.append((bn, parent, p.copy(), tail, z.copy(), THUMB['radii'][j], THUMB['radii'][j + 1]))
        x = d.cross(z).normalized()
        if j < 2:
            d = (Quaternion(x, -D2R(10)) @ d).normalized()
            z = (Quaternion(x, -D2R(10)) @ z).normalized()
        parent, p = bn, tail
    return defs


def digit_chain(side, digit):
    return ['%s_%02d_%s' % (digit, j, side) for j in (1, 2, 3)]


class HandModel:
    """Rest frames of one hand in hand space, plus FK for the grip solver."""

    def __init__(self, side):
        self.side = side
        self.defs = hand_bone_defs(side)
        self.rest = {}
        self.parent = {}
        self.radius = {}
        for name, par, head, tail, zh, r0, r1 in self.defs:
            M = frame(tail - head, zh, head)
            self.rest[name] = M
            self.parent[name] = par
            self.radius[name] = (r0, r1)
            self.length = getattr(self, 'length', {})
            self.length[name] = (tail - head).length
        self.rel = {n: (self.rest[p].inverted() @ self.rest[n]) if p else self.rest[n] for n, p in self.parent.items()}
        self.order = [d[0] for d in self.defs]

    def fk(self, rots):
        """Pose matrices in hand space. rots: {bone: Quaternion} local (missing = rest)."""
        P = {}
        for n in self.order:
            p = self.parent[n]
            R = rots.get(n)
            M = (P[p] @ self.rel[n]) if p else self.rel[n]
            if R is not None and p is not None:
                M = M @ R.to_matrix().to_4x4()
            P[n] = M
        return P

    def segments(self, P, bones):
        out = []
        for n in bones:
            M = P[n]
            out.append((n, M.translation.copy(), (M @ Vector((0, self.length[n], 0))), self.radius[n]))
        return out


def curl_q(deg):
    return Quaternion((1, 0, 0), -D2R(deg))


def spread_q(deg_toward_thumb, side):
    return Quaternion((0, 0, 1), D2R(deg_toward_thumb) * (1 if side == 'R' else -1))


# ---------------------------------------------------------------------------
#  Grip solver: seat the palm on a surface, then close each finger until it touches
# ---------------------------------------------------------------------------

PALM_SAMPLES = [(x, y, -0.0135) for x in (-0.024, -0.012, 0.0, 0.012, 0.024) for y in (0.030, 0.045, 0.060, 0.075)] + \
               [(-0.022, 0.032, -0.019), (0.024, 0.040, -0.016)]


def seat_palm(W, bvh, side, clearance=0.0012, samples=None):
    """Slide hand frame W (gun space) along its back-of-hand axis until the palm just touches."""
    pts = [_mx(p, side) for p in (samples or PALM_SAMPLES)]
    z = W.to_3x3() @ Vector((0, 0, 1))
    def gap(s):
        M = Matrix.Translation(z * s) @ W
        return min(signed_dist(bvh, M @ p) for p in pts)
    # bisect between a placement that touches (lo) and one that is clear (hi)
    if gap(0.0) < clearance:
        lo, hi = 0.0, 0.08
    else:
        lo, hi = -0.06, 0.0
    for _ in range(40):
        mid = 0.5 * (lo + hi)
        if gap(mid) < clearance:
            lo = mid
        else:
            hi = mid
    return Matrix.Translation(z * hi) @ W


def _seg_contact(W, seg, bvh, clearance, nsamp=5):
    name, a, b, (r0, r1) = seg
    worst = 1.0
    for i in range(nsamp + 1):
        t = i / nsamp
        p = W @ (a.lerp(b, t))
        r = r0 + (r1 - r0) * t
        worst = min(worst, signed_dist(bvh, p) - r)
    return worst < clearance


def close_digit(hm, W, rots, chain, bvh, maxdeg=(85, 100, 80), ratio=(1.0, 1.2, 0.85), step=1.25,
                clearance=0.0004, base=None):
    """Grasp closing: curl the unfrozen joints together; a joint freezes when its segment (or any
    segment it carries) touches. Returns the updated rots and which segments touched."""
    base = {n: rots.get(n, Quaternion()).copy() for n in chain} if base is None else base
    ang = [0.0, 0.0, 0.0]
    frozen = [False, False, False]
    touched = [False, False, False]
    for _ in range(400):
        if all(frozen):
            break
        for j in range(3):
            if not frozen[j]:
                ang[j] = min(maxdeg[j], ang[j] + step * ratio[j])
                if ang[j] >= maxdeg[j]:
                    frozen[j] = True
        for j, n in enumerate(chain):
            rots[n] = base[n] @ curl_q(ang[j])
        P = hm.fk(rots)
        segs = hm.segments(P, chain)
        for k in range(2, -1, -1):
            if _seg_contact(W, segs[k], bvh, clearance):
                touched[k] = True
                for j in range(k + 1):
                    if not frozen[j]:
                        ang[j] = max(0.0, ang[j] - step * ratio[j] * 0.5)
                    frozen[j] = True
                break
    for j, n in enumerate(chain):
        rots[n] = base[n] @ curl_q(ang[j])
    return rots, touched, ang


def reach_digit(hm, W, rots, chain, target, bvh_block=None, side='R', x0=(0, 20, 30), pad=0.6,
                dip_ratio=0.75, clearance=0.0003, spread_range=(-30, 30), base=None, mcp_min=-10, straight=0.0, grid=False):
    """Put the pad of the digit's last segment on `target` (gun space): solve spread, MCP and PIP
    (DIP follows PIP) by coordinate descent, penalising any segment that sinks into bvh_block."""
    base = {n: rots.get(n, Quaternion()).copy() for n in chain} if base is None else base
    target = Vector(target)

    def apply(p):
        sp, a, b = p
        rots[chain[0]] = base[chain[0]] @ spread_q(sp, side) @ curl_q(a)
        rots[chain[1]] = base[chain[1]] @ curl_q(b)
        rots[chain[2]] = base[chain[2]] @ curl_q(b * dip_ratio)

    def cost(p):
        if not (spread_range[0] <= p[0] <= spread_range[1] and mcp_min <= p[1] <= 95 and 0 <= p[2] <= 105):
            return 1e9
        apply(p)
        P = hm.fk(rots)
        M = P[chain[2]]
        r = hm.radius[chain[2]]
        padp = W @ (M @ Vector((0, hm.length[chain[2]] * pad, -(r[0] + r[1]) * 0.5)))
        c = (padp - target).length_squared + straight * 1e-8 * (p[2] ** 2)
        if bvh_block is not None:
            for seg in hm.segments(P, chain):
                name, a, b2, (r0, r1) = seg
                for i in range(5):
                    t = i / 4
                    q = W @ a.lerp(b2, t)
                    pen = (r0 + (r1 - r0) * t) - signed_dist(bvh_block, q) - clearance
                    if pen > 0:
                        c += 4.0 * pen * pen
        return c

    best = list(x0)
    bc = cost(best)
    starts = [x0, (x0[0] + 8, x0[1] + 10, x0[2]), (x0[0] - 8, x0[1], x0[2] + 15)]
    if grid:
        cand = []
        for sp in range(int(spread_range[0]), int(spread_range[1]) + 1, 4):
            for a_ in range(int(mcp_min), 61, 4):
                for b_ in range(0, 61, 8):
                    cand.append((cost([sp, a_, b_]), [sp, a_, b_]))
        cand.sort(key=lambda c: c[0])
        starts = [c[1] for c in cand[:3]]
    for start in starts:
        p = list(start)
        c = cost(p)
        st = 8.0
        while st > 0.2:
            improved = False
            for i in range(3):
                for sgn in (1, -1):
                    q = list(p)
                    q[i] += sgn * st
                    cq = cost(q)
                    if cq < c:
                        p, c, improved = q, cq, True
            if not improved:
                st *= 0.5
        if c < bc:
            best, bc = p, c
    apply(best)
    return rots, math.sqrt(bc), best


def reach_thumb(hm, W, rots, side, target, bvh_block=None, x0=(15, 10, 0, 20, 20), pad=0.55, clearance=0.0003,
                lims=((-35, 60), (-25, 70), (-40, 40), (-10, 70), (-10, 80))):
    """Thumb pad onto `target`: abduction, base flex and twist at the base joint, then the two
    knuckles, by coordinate descent with a penetration penalty and a mild preference for an
    evenly bent thumb."""
    chain = ['thumb_%02d_%s' % (j, side) for j in (1, 2, 3)]
    sg = 1 if side == 'R' else -1
    target = Vector(target)

    def apply(p):
        ab, f1, tw, f2, f3 = p
        rots[chain[0]] = Quaternion((0, 0, 1), D2R(ab) * sg) @ curl_q(f1) @ Quaternion((0, 1, 0), D2R(tw) * sg)
        rots[chain[1]] = curl_q(f2)
        rots[chain[2]] = curl_q(f3)

    def cost(p):
        if any(not (lo <= v <= hi) for v, (lo, hi) in zip(p, lims)):
            return 1e9
        apply(p)
        P = hm.fk(rots)
        M = P[chain[2]]
        r = hm.radius[chain[2]]
        padp = W @ (M @ Vector((0, hm.length[chain[2]] * pad, -(r[0] + r[1]) * 0.5)))
        c = (padp - target).length_squared + 2e-9 * ((p[3] - p[4]) ** 2) + 4e-9 * (p[3] ** 2 + p[4] ** 2 + p[2] ** 2)
        if bvh_block is not None:
            for seg in hm.segments(P, chain[1:]):
                name, a, b2, (r0, r1) = seg
                for i in range(5):
                    t = i / 4
                    q = W @ a.lerp(b2, t)
                    pen = (r0 + (r1 - r0) * t) - signed_dist(bvh_block, q) - clearance
                    if pen > 0:
                        c += 4.0 * pen * pen
        return c

    best, bc = list(x0), cost(list(x0))
    for start in (x0, (x0[0] + 20, x0[1], x0[2], x0[3], x0[4]), (x0[0] - 15, x0[1] + 10, x0[2], x0[3] + 15, x0[4] + 10),
                  (x0[0], x0[1], x0[2] + 25, x0[3], x0[4]), (x0[0], x0[1], x0[2] - 25, x0[3], x0[4]),
                  (x0[0] + 10, x0[1] + 35, x0[2], x0[3] + 10, x0[4]), (x0[0] + 35, x0[1] + 25, x0[2] + 15, x0[3], x0[4])):
        p = list(start)
        c = cost(p)
        st = 10.0
        while st > 0.2:
            improved = False
            for i in range(5):
                for sgn in (1, -1):
                    q = list(p)
                    q[i] += sgn * st
                    cq = cost(q)
                    if cq < c:
                        p, c, improved = q, cq, True
            if not improved:
                st *= 0.5
        if c < bc:
            best, bc = p, c
    apply(best)
    return rots, math.sqrt(bc), best


# ---------------------------------------------------------------------------
#  Glove mesh (signed distance field -> surface nets -> decimate)
# ---------------------------------------------------------------------------

def glove_sdf(side, hm):
    sx = -1 if side == 'L' else 1
    R = {n: (hm.rest[n].translation.copy(), (hm.rest[n] @ Vector((0, hm.length[n], 0))), hm.radius[n]) for n in hm.order}
    def X(v):
        return np.array(_mx(v, side))

    def f(P):
        palm = sd_rbox(P, X((-0.001, 0.046, -0.001)), (0.037, 0.044, 0.0125), 0.010)
        then = sd_ellipsoid(P, X((-0.022, 0.032, -0.008)), (0.016, 0.026, 0.0125))
        hyp = sd_ellipsoid(P, X((0.024, 0.040, -0.006)), (0.012, 0.032, 0.0105))
        Pw = P * np.array([1.0, 1.0, 1.30])
        wrist = sd_capsule(Pw, (0, -0.045, 0), (0, 0.010, -0.0013), 0.0268, 0.0280)
        band = sd_capsule(Pw, (0, -0.006, 0), (0, 0.004, 0), 0.0288, 0.0288)
        d = smin(palm, then, 0.010)
        d = smin(d, hyp, 0.010)
        d = smin(d, wrist, 0.018)
        d = smin(d, band, 0.0015)
        plate = sd_rbox(P, X((0.0, 0.050, 0.0098)), (0.031, 0.030, 0.0036), 0.0032)
        d = smin(d, plate, 0.0025)
        for name, mcp, yaw, lens, radii in FINGERS:
            fd = None
            for j in range(3):
                bn = '%s_%02d_%s' % (name, j + 1, side)
                a, b, (r0, r1) = R[bn]
                a = np.array(a); b = np.array(b)
                if j == 0:
                    a = a - (b - a) / np.linalg.norm(b - a) * 0.010
                c = sd_capsule(P, a, b, r0, r1)
                fd = c if fd is None else np.minimum(fd, c)
            d = smin(d, fd, 0.0065)
        # knuckle guard: a low ridge over the four knuckles
        i0 = np.array(R['index_01_' + side][0]) + np.array([0, 0, 0.0088])
        p0 = np.array(R['pinky_01_' + side][0]) + np.array([0, 0, 0.0078])
        d = smin(d, sd_capsule(P, i0, p0, 0.0048, 0.0044), 0.003)
        td = None
        for j in range(3):
            bn = 'thumb_%02d_%s' % (j + 1, side)
            a, b, (r0, r1) = R[bn]
            c = sd_capsule(P, np.array(a), np.array(b), r0, r1)
            td = c if td is None else np.minimum(td, c)
        d = smin(d, td, 0.010)
        return d
    return f


def build_glove(side, hm, target_tris=3200, h=0.0011):
    f = glove_sdf(side, hm)
    pts = [hm.rest[n].translation for n in hm.order] + [hm.rest[n] @ Vector((0, hm.length[n], 0)) for n in hm.order]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))) - Vector((0.03, 0.10, 0.03))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))) + Vector((0.03, 0.02, 0.03))
    ob = mesh_from_sdf('glove_' + side, f, lo, hi, h)
    t = tri_count(ob)
    decimate(ob, min(1.0, target_tris / max(t, 1)))
    me = ob.data
    me.shade_smooth()
    return ob, f


# ---------------------------------------------------------------------------
#  Sleeve mesh (lofted along the arm with dense loops at the elbow and wrist)
# ---------------------------------------------------------------------------

UPPER_R = [(0.0, 0.050, 0.052), (0.20, 0.048, 0.050), (0.50, 0.044, 0.047), (0.80, 0.039, 0.040), (1.0, 0.038, 0.039)]
FORE_R = [(0.0, 0.040, 0.038), (0.18, 0.0455, 0.0395), (0.40, 0.0425, 0.0345), (0.65, 0.0360, 0.0290),
          (0.88, 0.0318, 0.0262), (1.0, 0.0322, 0.0268)]


def _interp(table, u):
    for i in range(len(table) - 1):
        a, b = table[i], table[i + 1]
        if u <= b[0]:
            t = (u - a[0]) / (b[0] - a[0])
            t = t * t * (3 - 2 * t)
            return a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t
    return table[-1][1], table[-1][2]


def build_sleeve(side, S, E, W, up_frame, fore_frame, seam_deg, n_around=28):
    """Returns (object, per-vertex weights dict list, seam face mask). S/E/W: shoulder, elbow, wrist."""
    L1 = (E - S).length
    L2 = (W - E).length
    u1 = (E - S).normalized()
    u2 = (W - E).normalized()
    blend = 0.055
    # ring stations: arc length along the arm; denser at the elbow and the wrist
    st = []
    s = -0.03
    while s < L1 + L2 + 0.016:
        st.append(s)
        near_elbow = abs(s - L1) < 0.07
        near_wrist = s > L1 + L2 - 0.05
        s += 0.009 if near_elbow else (0.010 if near_wrist else 0.024)
    st.append(L1 + L2 + 0.016)
    a = []
    base = [2 * math.pi * i / n_around for i in range(n_around)]
    sd = D2R(seam_deg)
    half = D2R(2.4)
    base = [x for x in base if abs(((x - sd + math.pi) % (2 * math.pi)) - math.pi) > half * 1.6]
    angles = sorted(base + [(sd - half) % (2 * math.pi), (sd + half) % (2 * math.pi)])
    seam_i = angles.index((sd - half) % (2 * math.pi))
    rings, info = [], []
    for s in st:
        if s < L1 - blend:
            c = S + u1 * s
            T = u1
            Xa = up_frame.col[0].to_3d()
        elif s > L1 + blend:
            c = E + u2 * (s - L1)
            T = u2
            Xa = fore_frame.col[0].to_3d()
        else:
            t = (s - (L1 - blend)) / (2 * blend)
            p0, p1 = E - u1 * blend, E + u2 * blend
            c = p0 * (1 - t) ** 2 + E * 2 * t * (1 - t) + p1 * t * t
            T = ((E - p0) * 2 * (1 - t) + (p1 - E) * 2 * t).normalized()
            Xa = up_frame.col[0].to_3d().lerp(fore_frame.col[0].to_3d(), t)
        X = (Xa - T * Xa.dot(T)).normalized()
        Z = T.cross(X)  # X, T(Y), Z right handed
        if s <= L1:
            rx, rz = _interp(UPPER_R, max(0.0, s) / L1)
        elif s <= L1 + L2:
            rx, rz = _interp(FORE_R, (s - L1) / L2)
        else:
            rx, rz = 0.0350, 0.0293
        if s < 0:
            k = 1.0 - (s / -0.03) ** 2 * 0.25
            rx, rz = rx * k, rz * k
        rings.append([c + X * (rx * math.cos(an)) + Z * (rz * math.sin(an)) for an in angles])
        info.append(s)
    # rolled lip at the cuff: step inward and back inside the sleeve
    last = rings[-1]
    cen = sum(last, Vector()) / len(last)
    T = u2
    rings.append([cen + (p - cen) * 0.93 - T * 0.002 for p in last])
    info.append(L1 + L2 + 0.014)
    rings.append([cen + (p - cen) * 0.90 - T * 0.012 for p in last])
    info.append(L1 + L2 + 0.004)
    # shoulder dome
    first = rings[0]
    c0 = sum(first, Vector()) / len(first)
    dome = [[c0 + (p - c0) * k - u1 * (0.02 * (1 - k)) for p in first] for k in (0.7, 0.35)]
    rings = dome[::-1] + rings
    info = [-0.05, -0.04] + info
    bm = bmesh.new()
    vs = [[bm.verts.new(p) for p in r] for r in rings]
    n = len(angles)
    for k in range(len(rings) - 1):
        for i in range(n):
            j = (i + 1) % n
            f = bm.faces.new((vs[k][i], vs[k][j], vs[k + 1][j], vs[k + 1][i]))
            f.material_index = 1 if (i == seam_i and 0.02 < info[k] and info[k + 1] < L1 + L2 + 0.012 and k >= 2) else 0
    bm.faces.new(list(reversed(vs[0])))
    ob = obj_from_bm('sleeve_' + side, bm)
    # weights per ring
    ws = []
    for k, s in enumerate(info):
        w_up = 1.0 - smoothstep(L1 - 0.050, L1 + 0.045, s)
        w_hand = smoothstep(L1 + L2 - 0.012, L1 + L2 + 0.016, s) * 0.55
        w_tw = smoothstep(L1 + 0.30 * L2, L1 + 0.88 * L2, s)
        fore = 1.0 - w_up
        d = {'upperarm_' + side: w_up,
             'forearm_' + side: fore * (1 - w_tw) * (1 - w_hand),
             'forearm_twist_' + side: fore * w_tw * (1 - w_hand),
             'hand_' + side: fore * w_hand}
        ws.append(d)
    vw = []
    for k in range(len(rings)):
        for i in range(n):
            vw.append(ws[k])
    return ob, vw


# ---------------------------------------------------------------------------
#  Weights for the glove: soft nearest-bone by surface distance
# ---------------------------------------------------------------------------

def glove_weights(ob, side, hm, sdf, Hrest):
    """Hrest: hand rest frame in armature space (the glove mesh is already in armature space)."""
    inv = Hrest.inverted()
    V = np.array([tuple(inv @ v.co) for v in ob.data.vertices])
    names = [n for n in hm.order if n != 'hand_' + side]
    D = []
    for n in names:
        a = np.array(hm.rest[n].translation)
        b = np.array(hm.rest[n] @ Vector((0, hm.length[n], 0)))
        r0, r1 = hm.radius[n]
        if n.endswith('_01_' + side) and not n.startswith('thumb'):
            a = a + (a - b) / np.linalg.norm(a - b) * 0.004
        D.append(sd_capsule(V, a, b, r0, r1))
    D = np.array(D)
    palm = sd_rbox(V, np.array(_mx((-0.001, 0.046, -0.001), side)), (0.037, 0.044, 0.0125), 0.010)
    palm = smin(palm, sd_ellipsoid(V, np.array(_mx((0.024, 0.040, -0.006), side)), (0.012, 0.032, 0.0105)), 0.01)
    Pw = V * np.array([1, 1, 1.3])
    palm = np.minimum(palm, sd_capsule(Pw, (0, -0.05, 0), (0, 0.012, 0), 0.027, 0.028))
    D = np.vstack([palm[None, :] - 0.0015, D])
    allnames = ['hand_' + side] + names
    dmin = D.min(0)
    W = np.exp(-np.maximum(D - dmin, 0) / 0.0022)
    # under the sleeve the cuff copies the sleeve's own weights at the same spot, so the two
    # surfaces always move together (no poke-through when the wrist twists)
    y = V[:, 1]
    def ss(e0, e1, x):
        t = np.clip((x - e0) / (e1 - e0), 0, 1)
        return t * t * (3 - 2 * t)
    hand_sl = 0.55 * ss(-0.012, 0.016, y)
    k = ss(0.004, 0.022, y)
    W = W / W.sum(0)
    W = W * k
    W[0] += (1 - k) * hand_sl
    allnames.append('forearm_twist_' + side)
    W = np.vstack([W, ((1 - k) * (1 - hand_sl))[None, :]])
    return allnames, W


def assign_weights(ob, names, W, keep=4):
    groups = {n: (ob.vertex_groups.get(n) or ob.vertex_groups.new(name=n)) for n in names}
    W = np.array(W, float)
    for vi in range(W.shape[1]):
        col = W[:, vi]
        top = np.argsort(-col)[:keep]
        s = col[top].sum()
        for t in top:
            w = col[t] / s if s > 0 else 0
            if w > 0.004:
                groups[names[t]].add([vi], float(w), 'REPLACE')


def smooth_weights(ob, W, iters=2, factor=0.5):
    """Laplacian smoothing of a (bones x verts) weight table over the mesh edges, renormalised."""
    me = ob.data
    E = np.empty(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get('vertices', E)
    E = E.reshape(-1, 2)
    n = len(me.vertices)
    deg = np.bincount(E.ravel(), minlength=n).astype(float)
    W = np.array(W, float)
    for _ in range(iters):
        acc = np.zeros_like(W)
        np.add.at(acc.T, E[:, 0], W[:, E[:, 1]].T)
        np.add.at(acc.T, E[:, 1], W[:, E[:, 0]].T)
        avg = acc / np.maximum(deg, 1)[None, :]
        W = (1 - factor) * W + factor * avg
        W = W / np.maximum(W.sum(0), 1e-9)[None, :]
    return W


# ---------------------------------------------------------------------------
#  The rig
# ---------------------------------------------------------------------------

def two_bone(S, W, L1, L2, pole_dir):
    d = (W - S).length
    d = min(d, (L1 + L2) * 0.9999)
    u = (W - S).normalized()
    along = (L1 * L1 - L2 * L2 + d * d) / (2 * d)
    h = math.sqrt(max(0.0, L1 * L1 - along * along))
    n = Vector(pole_dir)
    n = (n - u * n.dot(u)).normalized()
    return S + u * along + n * h


class Rig:
    """One armature: root, both arms with fingers, the gun and its moving parts, IK controls."""

    def __init__(self, cfg):
        self.cfg = cfg
        self.hands = {s: HandModel(s) for s in 'RL'}
        self.L1 = cfg['upper_len']
        self.L2 = cfg['fore_len']

    # rest pose -------------------------------------------------------------
    def build(self, gun_rest, part_rest, wrist_rest):
        """gun_rest: 4x4 armature-space. part_rest: {name: 4x4 in gun space} (mag, charge, trigger...).
        wrist_rest: {'R': 4x4 hand frame armature space, 'L': ...}."""
        cfg = self.cfg
        arm_data = bpy.data.armatures.new('viewmodel')
        arm = link(bpy.data.objects.new('viewmodel', arm_data))
        self.arm = arm
        set_active(arm)
        bpy.ops.object.mode_set(mode='EDIT')
        eb = arm_data.edit_bones

        def bone(name, head, tail, zhint, parent=None, deform=True, connect=False):
            b = eb.new(name)
            b.head = Vector(head)
            b.tail = Vector(tail)
            b.align_roll(Vector(zhint))
            b.use_deform = deform
            if parent:
                b.parent = eb[parent]
                b.use_connect = connect
            return b

        bone('root', (0, 0, 0), (0, 0.1, 0), (0, 0, 1))
        G = gun_rest
        bone('gun', G.translation, G @ Vector((0, 0.1, 0)), G.col[2].to_3d(), 'root')
        for pname, M in part_rest.items():
            A = G @ M
            bone(pname, A.translation, A @ Vector((0, 0.04, 0)), A.col[2].to_3d(), 'gun')
        self.rest_elbow = {}
        for s in 'RL':
            S = Vector(cfg['shoulder'][s])
            H = wrist_rest[s]
            Wp = H.translation
            E = two_bone(S, Wp, self.L1, self.L2, cfg['pole_dir'][s])
            # keep the bone lengths exact
            Wp = E + (Wp - E).normalized() * self.L2
            # rest pose keeps the wrist straight (hand in line with the forearm) so the glove cuff
            # sits inside the sleeve; the grip's wrist bend comes from the pose, not the rest
            H = frame(Wp - E, H.col[2].to_3d(), Wp)
            wrist_rest[s] = H
            self.rest_elbow[s] = E
            zh = H.col[2].to_3d()
            bone('upperarm_' + s, S, E, zh, 'root')
            bone('forearm_' + s, E, Wp, zh, 'upperarm_' + s, connect=True)
            bone('forearm_twist_' + s, E.lerp(Wp, 0.5), Wp, zh, 'forearm_' + s)
            hm = self.hands[s]
            for name, par, head, tail, zhint, r0, r1 in hm.defs:
                bone(name, H @ head, H @ tail, H.to_3x3() @ zhint, par or 'forearm_' + s,
                     connect=(par is None))
            bone('ik_hand_' + s, Wp, H @ Vector((0, HAND_LEN, 0)), zh, 'gun', deform=False)
            pole = E + (E - (S.lerp(Wp, 0.5))).normalized() * 0.25
            bone('pole_' + s, pole, pole + Vector((0, 0.03, 0)), (0, 0, 1), 'root', deform=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        self.wrist_rest = wrist_rest
        self.rest = {b.name: b.matrix_local.copy() for b in arm_data.bones}
        self.deform = [b.name for b in arm_data.bones if b.use_deform]
        for pb in arm.pose.bones:
            pb.rotation_mode = 'QUATERNION'
        return arm

    def add_constraints(self):
        arm = self.arm
        for s in 'RL':
            fo = arm.pose.bones['forearm_' + s]
            ik = fo.constraints.new('IK')
            ik.target = arm
            ik.subtarget = 'ik_hand_' + s
            ik.pole_target = arm
            ik.pole_subtarget = 'pole_' + s
            ik.chain_count = 2
            ik.use_tail = True
            ik.use_stretch = False
            ik.iterations = 800
            ha = arm.pose.bones['hand_' + s]
            cr = ha.constraints.new('COPY_ROTATION')
            cr.target = arm
            cr.subtarget = 'ik_hand_' + s
            cr.target_space = 'POSE'
            cr.owner_space = 'POSE'
        self.calibrate_poles()

    def calibrate_poles(self):
        arm = self.arm
        for s in 'RL':
            ik = arm.pose.bones['forearm_' + s].constraints[0]
            best = None
            for deg in range(-180, 180, 3):
                ik.pole_angle = D2R(deg)
                bpy.context.view_layer.update()
                e = arm.pose.bones['forearm_' + s].head
                err = (e - self.rest_elbow[s]).length
                # also the twist of the upper arm
                if best is None or err < best[0]:
                    best = (err, deg)
            for deg in [best[1] + x * 0.25 for x in range(-12, 13)]:
                ik.pole_angle = D2R(deg)
                bpy.context.view_layer.update()
                e = arm.pose.bones['forearm_' + s].head
                err = (e - self.rest_elbow[s]).length
                if err < best[0]:
                    best = (err, deg)
            ik.pole_angle = D2R(best[1])
            print('POLE %s angle %.2f deg, rest elbow error %.5f m' % (s, best[1], best[0]), flush=True)
        bpy.context.view_layer.update()

    # skin ------------------------------------------------------------------
    def build_skin(self, mats, seam_deg):
        objs = []
        for s in 'RL':
            hm = self.hands[s]
            H = self.wrist_rest[s]
            glove, sdf = build_glove(s, hm, target_tris=self.cfg.get('glove_tris', 3800))
            transform_mesh(glove, H)
            names, W = glove_weights(glove, s, hm, sdf, H)
            W = smooth_weights(glove, W, iters=2, factor=0.5)
            assign_weights(glove, names, W)
            glove.data.materials.append(mats['glove'])
            S = Vector(self.cfg['shoulder'][s])
            E = self.rest_elbow[s]
            up = self.rest['upperarm_' + s]
            fo = self.rest['forearm_' + s]
            sl, vw = build_sleeve(s, S, E, H.translation, up, fo, seam_deg[s])
            sl.data.materials.append(mats['suit'])
            sl.data.materials.append(mats['seam'])
            names = sorted({k for d in vw for k in d})
            Wm = np.array([[d.get(n, 0.0) for d in vw] for n in names])
            assign_weights(sl, names, Wm)
            smooth(sl, 60)
            for ob in (glove, sl):
                ob.parent = self.arm
                m = ob.modifiers.new('arm', 'ARMATURE')
                m.object = self.arm
                objs.append(ob)
        self.skin = objs
        return objs

    def attach(self, ob, bone):
        """Bone-parent a mesh authored in that bone's local space."""
        ob.parent = self.arm
        ob.parent_type = 'BONE'
        ob.parent_bone = bone
        b = self.arm.data.bones[bone]
        ob.matrix_parent_inverse = Matrix.Translation((0, -b.length, 0))
        ob.matrix_basis = Matrix()

    # posing and baking -------------------------------------------------------
    def pose(self, st):
        """st: dict with gun (4x4 arm space), parts {bone: 4x4 gun space}, hands {'R': 4x4 gun space},
        poles {'R': Vector}, fingers {bone: Quaternion}, attach (callable(rig) -> {bone: 4x4 arm space})."""
        arm = self.arm
        P = arm.pose.bones
        upd = bpy.context.view_layer.update
        P['gun'].matrix = st['gun']
        upd()
        for name, M in st.get('parts', {}).items():
            P[name].matrix = st['gun'] @ M
        for s in 'RL':
            P['ik_hand_' + s].matrix = st['gun'] @ st['hands'][s]
            P['pole_' + s].matrix = Matrix.Translation(st['poles'][s])
            P['forearm_twist_' + s].rotation_quaternion = Quaternion()
        for n, q in st.get('fingers', {}).items():
            P[n].rotation_quaternion = q
        upd()
        # forearm twist: 55 percent of the wrist's twist about the forearm axis
        for s in 'RL':
            fo, ha = P['forearm_' + s], P['hand_' + s]
            rest_rel = self.rest['forearm_' + s].inverted() @ self.rest['hand_' + s]
            local = (fo.matrix @ rest_rel).inverted() @ ha.matrix
            q = local.to_quaternion()
            tw = Quaternion((q.w, 0, q.y, 0)).normalized()
            P['forearm_twist_' + s].rotation_quaternion = Quaternion().slerp(tw, 0.55)
        if st.get('attach'):
            for name, M in st['attach'](self).items():
                P[name].matrix = M
        upd()

    def read(self):
        P = self.arm.pose.bones
        out = {}
        for n in self.deform:
            b = self.arm.data.bones[n]
            M = P[n].matrix
            if b.parent:
                par = b.parent.name
                L = (P[par].matrix @ self.rest[par].inverted() @ self.rest[n]).inverted() @ M
            else:
                L = self.rest[n].inverted() @ M
            out[n] = (L.to_translation(), L.to_quaternion())
        return out

    def check_reach(self, st, tag):
        bad = 0
        for s in 'RL':
            W = (st['gun'] @ st['hands'][s]).translation
            d = (W - Vector(self.cfg['shoulder'][s])).length
            if d > (self.L1 + self.L2) * 0.995:
                bad += 1
        return bad

    def bake(self, name, n_frames, state_at, loop=False):
        """Sample state_at(t) per frame, solve, store plain bone keys in a new action `name`."""
        arm = self.arm
        if arm.animation_data:
            arm.animation_data.action = None
        frames = []
        over = 0
        for f in range(n_frames + 1):
            t = f / FPS
            st = state_at(t)
            over += self.check_reach(st, name)
            self.pose(st)
            frames.append(self.read())
        if over:
            print('WARN %s: %d hand-frames beyond arm reach' % (name, over), flush=True)
        act = bpy.data.actions.new(name)
        act.use_fake_user = True
        ad = arm.animation_data or arm.animation_data_create()
        ad.action = act
        prevq = {}
        for n in self.deform:
            pb = arm.pose.bones[n]
            for f, fr in enumerate(frames):
                loc, q = fr[n]
                if n in prevq and prevq[n].dot(q) < 0:
                    q = -q
                prevq[n] = q
                pb.location = loc
                pb.rotation_quaternion = q
                pb.keyframe_insert('location', frame=f, group=n)
                pb.keyframe_insert('rotation_quaternion', frame=f, group=n)
        self.actions = getattr(self, 'actions', {})
        self.actions[name] = (act, n_frames)
        print('BAKED %s: %d frames (%.3f s)' % (name, n_frames, n_frames / FPS), flush=True)
        return act

    def strip_controls(self):
        """Remove IK constraints and control bones: the exported rig is plain keyed bones."""
        arm = self.arm
        for pb in arm.pose.bones:
            for c in list(pb.constraints):
                pb.constraints.remove(c)
        set_active(arm)
        bpy.ops.object.mode_set(mode='EDIT')
        for n in ('ik_hand_R', 'ik_hand_L', 'pole_R', 'pole_L'):
            eb = arm.data.edit_bones.get(n)
            if eb:
                arm.data.edit_bones.remove(eb)
        bpy.ops.object.mode_set(mode='OBJECT')

    def show(self, name, f):
        act, n = self.actions[name]
        ad = self.arm.animation_data
        ad.action = act
        try:
            if ad.action_slot is None and len(act.slots):
                ad.action_slot = act.slots[0]
        except Exception:
            pass
        bpy.context.scene.frame_set(int(round(f)))
        bpy.context.view_layer.update()

    def to_nla(self):
        ad = self.arm.animation_data
        for name, (act, n) in self.actions.items():
            tr = ad.nla_tracks.new()
            tr.name = name
            st = tr.strips.new(name, 0, act)
            st.name = name
        ad.action = None
