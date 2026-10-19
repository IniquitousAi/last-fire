"""Shared helpers for Last Fire's first-person viewmodels (Blender 5.2, run headless).

Our own code. Method learned (not copied) from public build-script pipelines: every asset is a
re-runnable Python script; the .glb is a build artefact.

Conventions (camera space, metres):
    Blender origin = the player's eye. The view looks along Blender +Y, up = +Z, right = +X.
    Exported +Y up, so in three.js the view looks along -Z (the usual camera forward).
"""
import bpy, bmesh, math, os, sys, json, struct
import numpy as np
from mathutils import Vector, Matrix, Quaternion, Euler
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.abspath(os.path.join(HERE, '..', '..'))
ASSETS = os.path.join(NEXT, 'assets', 'fp')
FPS = 60
D2R = math.radians


# ---------------------------------------------------------------------------
#  Scene and objects
# ---------------------------------------------------------------------------

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.render.fps = FPS
    scn.unit_settings.system = 'METRIC'
    return scn


def link(ob, col=None):
    (col or bpy.context.scene.collection).objects.link(ob)
    return ob


def obj_from_bm(name, bm, recalc=True):
    if recalc:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me))


def obj_from_data(name, verts, faces, recalc=True):
    bm = bmesh.new()
    vs = [bm.verts.new(Vector(v)) for v in verts]
    for f in faces:
        try:
            bm.faces.new([vs[i] for i in f])
        except ValueError:
            pass
    return obj_from_bm(name, bm, recalc)


def set_active(ob):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def apply_mods(ob):
    """Bake the modifier stack into the mesh (works headless, no operator context)."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    me.name = ob.name
    if old.users == 0:
        bpy.data.meshes.remove(old)
    return ob


def bevel(ob, w, segs=3, angle=35, profile=0.5, apply=True):
    m = ob.modifiers.new('bev', 'BEVEL')
    m.width = w
    m.segments = segs
    m.limit_method = 'ANGLE'
    m.angle_limit = D2R(angle)
    m.use_clamp_overlap = True
    m.profile = profile
    m.miter_outer = 'MITER_ARC'
    if apply:
        apply_mods(ob)
    return ob


def boolean(ob, cutter, op='DIFFERENCE'):
    m = ob.modifiers.new('bool', 'BOOLEAN')
    m.operation = op
    m.object = cutter
    m.solver = 'EXACT'
    cutter.hide_render = True
    apply_mods(ob)
    me = cutter.data
    bpy.data.objects.remove(cutter, do_unlink=True)
    if me.users == 0:
        bpy.data.meshes.remove(me)
    return ob


def cut(ob, *cutters):
    for c in cutters:
        boolean(ob, c, 'DIFFERENCE')
    return ob


def join(name, objs):
    objs = [o for o in objs if o is not None]
    set_active(objs[0])
    for o in objs:
        o.select_set(True)
    with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs, selected_objects=objs):
        bpy.ops.object.join()
    ob = objs[0]
    ob.name = name
    ob.data.name = name
    return ob


def smooth(ob, angle=35):
    me = ob.data
    me.shade_smooth()
    me.set_sharp_from_angle(angle=D2R(angle))
    return ob


def weighted_normals(ob):
    m = ob.modifiers.new('wn', 'WEIGHTED_NORMAL')
    m.keep_sharp = True
    m.weight = 50
    m.mode = 'FACE_AREA'
    apply_mods(ob)
    return ob


def finish(ob, mat=None, bev=0.0, segs=3, bev_angle=35, smooth_angle=35, wn=True):
    if bev > 0:
        bevel(ob, bev, segs, bev_angle)
    smooth(ob, smooth_angle)
    if wn:
        weighted_normals(ob)
    if mat is not None:
        ob.data.materials.clear()
        ob.data.materials.append(mat)
    return ob


def decimate(ob, ratio):
    m = ob.modifiers.new('dec', 'DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio = ratio
    apply_mods(ob)
    return ob


def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def transform_mesh(ob, mat):
    ob.data.transform(mat)
    ob.data.update()
    return ob


# ---------------------------------------------------------------------------
#  2D outlines and solids
# ---------------------------------------------------------------------------

def fillet(pts, r, n=4):
    """Round the corners of a closed 2D polygon. r: one radius or a list per corner (0 keeps it sharp)."""
    N = len(pts)
    rs = list(r) if isinstance(r, (list, tuple)) else [r] * N
    out = []
    for i in range(N):
        p0, p1, p2 = Vector(pts[i - 1]), Vector(pts[i]), Vector(pts[(i + 1) % N])
        ri = rs[i]
        a, b = p0 - p1, p2 - p1
        la, lb = a.length, b.length
        if ri <= 0 or la < 1e-9 or lb < 1e-9:
            out.append((p1.x, p1.y))
            continue
        a.normalize(); b.normalize()
        ang = math.acos(max(-1.0, min(1.0, a.dot(b))))
        if ang < 1e-3 or abs(ang - math.pi) < 1e-3:
            out.append((p1.x, p1.y))
            continue
        d = ri / math.tan(ang / 2)
        d = min(d, 0.48 * la, 0.48 * lb)
        rr = d * math.tan(ang / 2)
        s, e = p1 + a * d, p1 + b * d
        c = p1 + (a + b).normalized() * (rr / math.sin(ang / 2))
        a0 = math.atan2(s.y - c.y, s.x - c.x)
        a1 = math.atan2(e.y - c.y, e.x - c.x)
        da = a1 - a0
        while da > math.pi: da -= 2 * math.pi
        while da < -math.pi: da += 2 * math.pi
        for k in range(n + 1):
            t = a0 + da * k / n
            out.append((c.x + rr * math.cos(t), c.y + rr * math.sin(t)))
    return out


def rrect(hw, hh, r, n=4, cx=0.0, cy=0.0):
    pts = [(cx - hw, cy - hh), (cx + hw, cy - hh), (cx + hw, cy + hh), (cx - hw, cy + hh)]
    return fillet(pts, r, n)


def superellipse(rx, ry, n=24, p=2.6, cx=0.0, cy=0.0, front=1.0):
    """Superellipse; `front` scales the +y half (egg shapes)."""
    out = []
    for i in range(n):
        t = 2 * math.pi * i / n
        c, s = math.cos(t), math.sin(t)
        x = rx * math.copysign(abs(c) ** (2 / p), c)
        y = ry * math.copysign(abs(s) ** (2 / p), s)
        if y > 0:
            y *= front
        out.append((cx + x, cy + y))
    return out


def _prism(name, pts, a0, a1, axis):
    bm = bmesh.new()
    def P(u, v, w):
        if axis == 'X': return (w, u, v)
        if axis == 'Y': return (u, w, v)
        return (u, v, w)
    A = [bm.verts.new(P(p[0], p[1], a0)) for p in pts]
    B = [bm.verts.new(P(p[0], p[1], a1)) for p in pts]
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((A[i], A[j], B[j], B[i]))
    bm.faces.new(A)
    bm.faces.new(list(reversed(B)))
    return obj_from_bm(name, bm)


def prism_x(name, pts_yz, x0, x1):
    """Side profile (y, z) extruded across X: the workhorse for gun silhouettes."""
    return _prism(name, pts_yz, x0, x1, 'X')


def prism_y(name, pts_xz, y0, y1):
    """Cross-section (x, z) extruded along the bore (Y)."""
    return _prism(name, pts_xz, y0, y1, 'Y')


def prism_z(name, pts_xy, z0, z1):
    return _prism(name, pts_xy, z0, z1, 'Z')


def loft(name, rings, cap0=True, cap1=True):
    """Skin equal-length rings of 3D points."""
    bm = bmesh.new()
    vs = [[bm.verts.new(Vector(p)) for p in r] for r in rings]
    n = len(rings[0])
    for k in range(len(rings) - 1):
        for i in range(n):
            j = (i + 1) % n
            try:
                bm.faces.new((vs[k][i], vs[k][j], vs[k + 1][j], vs[k + 1][i]))
            except ValueError:
                pass
    if cap0:
        bm.faces.new(list(reversed(vs[0])))
    if cap1:
        bm.faces.new(vs[-1])
    return obj_from_bm(name, bm)


def lathe_y(name, prof, segs=24, y0=0.0, cx=0.0, cz=0.0):
    """Spin a profile [(r, y), ...] about an axis parallel to Y through (cx, cz). Ends at r=0 close."""
    rings = []
    for (r, y) in prof:
        rings.append([(cx + r * math.cos(2 * math.pi * i / segs), y0 + y, cz + r * math.sin(2 * math.pi * i / segs))
                      for i in range(segs)])
    ob = loft(name, rings, cap0=prof[0][0] > 1e-6, cap1=prof[-1][0] > 1e-6)
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.to_mesh(ob.data); bm.free()
    return ob


def rbox(name, size, loc, r=0.0, n=3):
    """Box with rounded vertical (Z) edges via the outline, then optional bevel by the caller."""
    hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
    pts = rrect(hx, hy, r, n, loc[0], loc[1]) if r > 0 else [(loc[0] - hx, loc[1] - hy), (loc[0] + hx, loc[1] - hy),
                                                            (loc[0] + hx, loc[1] + hy), (loc[0] - hx, loc[1] + hy)]
    return prism_z(name, pts, loc[2] - hz, loc[2] + hz)


# ---------------------------------------------------------------------------
#  Materials (glTF-exportable Principled only)
# ---------------------------------------------------------------------------

def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_lin(h):
    h = h.lstrip('#')
    return tuple(srgb_to_lin(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4))


def material(name, color, rough=0.5, metal=0.0, emit=None, strength=0.0, alpha=1.0, coat=0.0, sheen=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    if m.node_tree is None:
        m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color[:3], 1.0)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit is not None:
        b.inputs['Emission Color'].default_value = (*emit[:3], 1.0)
        b.inputs['Emission Strength'].default_value = strength
    if coat > 0:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.25
    if sheen > 0:
        b.inputs['Sheen Weight'].default_value = sheen
        b.inputs['Sheen Roughness'].default_value = 0.4
    if alpha < 1.0:
        b.inputs['Alpha'].default_value = alpha
        for attr, val in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try:
                setattr(m, attr, val)
            except Exception:
                pass
    m.diffuse_color = (*color[:3], alpha)
    return m


# ---------------------------------------------------------------------------
#  Signed distance fields -> mesh (our own surface nets, numpy)
# ---------------------------------------------------------------------------

def sd_capsule(P, a, b, r1, r2):
    a = np.asarray(a, float); b = np.asarray(b, float)
    ba = b - a
    pa = P - a
    t = np.clip((pa @ ba) / float(ba @ ba), 0.0, 1.0)
    d = np.linalg.norm(pa - t[:, None] * ba, axis=1)
    return d - (r1 + (r2 - r1) * t)


def _local(P, c, R):
    q = P - np.asarray(c, float)
    return q @ np.asarray(R, float) if R is not None else q


def sd_ellipsoid(P, c, r, R=None):
    q = _local(P, c, R)
    r = np.asarray(r, float)
    k0 = np.linalg.norm(q / r, axis=1)
    k1 = np.linalg.norm(q / (r * r), axis=1)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


def sd_rbox(P, c, half, rad, R=None):
    q = np.abs(_local(P, c, R)) - (np.asarray(half, float) - rad)
    return np.linalg.norm(np.maximum(q, 0.0), axis=1) + np.minimum(np.max(q, axis=1), 0.0) - rad


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def surface_nets(f, lo, hi, h, project_iters=3):
    """Quad mesh of the zero set of f (vectorised numpy f: (N,3)->(N,)). Returns verts, faces."""
    lo = np.asarray(lo, float); hi = np.asarray(hi, float)
    n = (np.ceil((hi - lo) / h)).astype(int) + 1
    xs = [lo[i] + np.arange(n[i]) * h for i in range(3)]
    X, Y, Z = np.meshgrid(xs[0], xs[1], xs[2], indexing='ij')
    P = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)
    F = np.empty(len(P))
    chunk = 400000
    for s in range(0, len(P), chunk):
        F[s:s + chunk] = f(P[s:s + chunk])
    F = F.reshape(n)
    nx, ny, nz = n
    off = [(0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1)]
    C = [F[i:nx - 1 + i, j:ny - 1 + j, k:nz - 1 + k] for (i, j, k) in off]
    cmin = np.minimum.reduce(C); cmax = np.maximum.reduce(C)
    active = (cmin < 0) & (cmax >= 0)
    idx = -np.ones(active.shape, dtype=np.int64)
    I, J, K = np.nonzero(active)
    idx[I, J, K] = np.arange(len(I))
    base = lo + np.stack([I, J, K], 1) * h
    acc = np.zeros((len(I), 3)); cnt = np.zeros(len(I))
    edges = [(0, 1), (2, 3), (4, 5), (6, 7), (0, 2), (1, 3), (4, 6), (5, 7), (0, 4), (1, 5), (2, 6), (3, 7)]
    Ca = [c[I, J, K] for c in C]
    for e0, e1 in edges:
        f0, f1 = Ca[e0], Ca[e1]
        m = (f0 < 0) != (f1 < 0)
        t = f0[m] / (f0[m] - f1[m])
        p0 = base[m] + np.asarray(off[e0]) * h
        p1 = base[m] + np.asarray(off[e1]) * h
        acc[m] += p0 + t[:, None] * (p1 - p0)
        cnt[m] += 1
    V = acc / np.maximum(cnt, 1)[:, None]
    # project onto the surface along the gradient
    e = h * 0.25
    for _ in range(project_iters):
        d = f(V)
        g = np.stack([(f(V + [e, 0, 0]) - f(V - [e, 0, 0])), (f(V + [0, e, 0]) - f(V - [0, e, 0])),
                      (f(V + [0, 0, e]) - f(V - [0, 0, e]))], 1) / (2 * e)
        gl2 = np.maximum((g * g).sum(1), 1e-12)
        step = (d / gl2)[:, None] * g
        sl = np.linalg.norm(step, axis=1)
        step *= np.minimum(1.0, (h * 0.5) / np.maximum(sl, 1e-12))[:, None]
        V = V - step
    S = F < 0
    faces = []
    # x edges
    ex = S[:-1, :, :] != S[1:, :, :]
    ex[:, 0, :] = False; ex[:, -1, :] = False; ex[:, :, 0] = False; ex[:, :, -1] = False
    a, b, c = np.nonzero(ex)
    q = np.stack([idx[a, b - 1, c - 1], idx[a, b, c - 1], idx[a, b, c], idx[a, b - 1, c]], 1)
    faces.append(np.where(S[a, b, c][:, None], q, q[:, ::-1]))
    ey = S[:, :-1, :] != S[:, 1:, :]
    ey[0, :, :] = False; ey[-1, :, :] = False; ey[:, :, 0] = False; ey[:, :, -1] = False
    a, b, c = np.nonzero(ey)
    q = np.stack([idx[a - 1, b, c - 1], idx[a - 1, b, c], idx[a, b, c], idx[a, b, c - 1]], 1)
    faces.append(np.where(S[a, b, c][:, None], q, q[:, ::-1]))
    ez = S[:, :, :-1] != S[:, :, 1:]
    ez[0, :, :] = False; ez[-1, :, :] = False; ez[:, 0, :] = False; ez[:, -1, :] = False
    a, b, c = np.nonzero(ez)
    q = np.stack([idx[a - 1, b - 1, c], idx[a, b - 1, c], idx[a, b, c], idx[a - 1, b, c]], 1)
    faces.append(np.where(S[a, b, c][:, None], q, q[:, ::-1]))
    Fc = np.concatenate(faces, 0)
    Fc = Fc[(Fc >= 0).all(1)]
    return V, Fc


def mesh_from_sdf(name, f, lo, hi, h):
    V, Fc = surface_nets(f, lo, hi, h)
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(V))
    me.vertices.foreach_set('co', V.astype(np.float32).ravel())
    me.loops.add(len(Fc) * 4)
    me.loops.foreach_set('vertex_index', Fc.astype(np.int32).ravel())
    me.polygons.add(len(Fc))
    me.polygons.foreach_set('loop_start', (np.arange(len(Fc)) * 4).astype(np.int32))
    me.update(calc_edges=True)
    me.validate()
    ob = link(bpy.data.objects.new(name, me))
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=h * 0.05)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    return ob


# ---------------------------------------------------------------------------
#  Spatial queries
# ---------------------------------------------------------------------------

def bvh_of(objs, mat=None):
    """BVH of objects in world space (or `mat` @ world)."""
    verts, polys = [], []
    for ob in objs:
        M = ob.matrix_world if mat is None else mat @ ob.matrix_world
        base = len(verts)
        verts.extend([M @ v.co for v in ob.data.vertices])
        polys.extend([[base + i for i in p.vertices] for p in ob.data.polygons])
    return BVHTree.FromPolygons(verts, polys, all_triangles=False)


def signed_dist(bvh, p):
    loc, nor, idx, d = bvh.find_nearest(p)
    if loc is None:
        return 1.0
    return d if (p - loc).dot(nor) >= 0 else -d


# ---------------------------------------------------------------------------
#  Motion: Hermite tracks with Catmull-Rom tangents (stop keys ease in and out)
# ---------------------------------------------------------------------------

def qlog(q):
    q = q.normalized()
    if q.w < 0:
        q = -q
    ax, ang = q.to_axis_angle()
    return Vector(ax) * ang


def qexp(v):
    ang = v.length
    if ang < 1e-12:
        return Quaternion()
    return Quaternion(v / ang, ang)


def smoothstep(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def smootherstep(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * t * (t * (t * 6 - 15) + 10)


class Track:
    """Keys of (time, position, rotation). Interior keys pass through with Catmull-Rom velocity;
    `stop` keys (and the ends) come to rest, so contacts ease in and out."""

    def __init__(self):
        self.k = []

    def add(self, t, pos, rot=None, stop=False):
        if isinstance(pos, Matrix):
            rot = pos.to_quaternion()
            pos = pos.to_translation()
        q = (rot or Quaternion()).copy()
        if self.k and self.k[-1][2].dot(q) < 0:
            q = -q
        self.k.append((float(t), Vector(pos), q, stop))
        self.k.sort(key=lambda x: x[0])
        return self

    def _vel(self, i):
        k = self.k
        if k[i][3] or i == 0 or i == len(k) - 1:
            return Vector((0, 0, 0)), Vector((0, 0, 0))
        (tp, pp, qp, _), (t, p, q, _), (tn, pn, qn, _) = k[i - 1], k[i], k[i + 1]
        hp, hn = t - tp, tn - t
        v = ((p - pp) / hp * hn + (pn - p) / hn * hp) / (hp + hn)
        qi = q.inverted()
        wb = -qlog(qi @ qp) / hp
        wf = qlog(qi @ qn) / hn
        w = (wb * hn + wf * hp) / (hp + hn)
        return v, w

    def sample(self, t):
        k = self.k
        if t <= k[0][0]:
            return k[0][1].copy(), k[0][2].copy()
        if t >= k[-1][0]:
            return k[-1][1].copy(), k[-1][2].copy()
        i = max(j for j in range(len(k) - 1) if k[j][0] <= t)
        t0, p0, q0, _ = k[i]
        t1, p1, q1, _ = k[i + 1]
        h = t1 - t0
        u = (t - t0) / h
        v0, w0 = self._vel(i)
        v1, w1 = self._vel(i + 1)
        h00 = 2 * u ** 3 - 3 * u ** 2 + 1
        h10 = u ** 3 - 2 * u ** 2 + u
        h01 = -2 * u ** 3 + 3 * u ** 2
        h11 = u ** 3 - u ** 2
        pos = p0 * h00 + v0 * (h * h10) + p1 * h01 + v1 * (h * h11)
        r1 = qlog(q0.inverted() @ q1)
        r = w0 * (h * h10) + r1 * h01 + w1 * (h * h11)
        return pos, q0 @ qexp(r)

    def matrix(self, t):
        p, q = self.sample(t)
        return Matrix.Translation(p) @ q.to_matrix().to_4x4()


def mat_lerp(A, B, u):
    pa, qa = A.to_translation(), A.to_quaternion()
    pb, qb = B.to_translation(), B.to_quaternion()
    return Matrix.Translation(pa.lerp(pb, u)) @ qa.slerp(qb, u).to_matrix().to_4x4()


def frame(y_dir, z_dir, origin=(0, 0, 0)):
    """4x4 with +Y along y_dir and +Z as close to z_dir as possible."""
    y = Vector(y_dir).normalized()
    z = Vector(z_dir)
    z = (z - y * z.dot(y)).normalized()
    x = y.cross(z)
    M = Matrix((x, y, z)).transposed().to_4x4()
    M.translation = Vector(origin)
    return M


def rot_local(M, axis, deg):
    return M @ Matrix.Rotation(D2R(deg), 4, axis)


# ---------------------------------------------------------------------------
#  Render and export
# ---------------------------------------------------------------------------

def render_setup(res=(1000, 900), samples=32):
    scn = bpy.context.scene
    scn.render.engine = 'BLENDER_EEVEE'
    try:
        scn.eevee.taa_render_samples = samples
    except Exception:
        pass
    scn.render.resolution_x, scn.render.resolution_y = res
    scn.render.resolution_percentage = 100
    scn.render.film_transparent = False
    scn.view_settings.view_transform = 'AgX'
    try:
        scn.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        pass
    if scn.world is None:
        scn.world = bpy.data.worlds.new('World')
    w = scn.world
    if w.node_tree is None:
        w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = (0.045, 0.045, 0.06, 1)
    bg.inputs['Strength'].default_value = 1.0
    return scn


def add_light(name, kind, loc, target, energy, size=0.5, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color
    if kind == 'AREA':
        ld.size = size
    lo = link(bpy.data.objects.new(name, ld))
    lo.location = Vector(loc)
    lo.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return lo


def camera(name, loc, look=None, rot=None, fov_v=54.0, lens=None):
    cd = bpy.data.cameras.new(name)
    cd.clip_start = 0.01
    cd.clip_end = 100
    if lens:
        cd.lens = lens
    else:
        cd.sensor_fit = 'VERTICAL'
        cd.angle_y = D2R(fov_v)
    co = link(bpy.data.objects.new(name, cd))
    co.location = Vector(loc)
    if look is not None:
        co.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    elif rot is not None:
        co.rotation_euler = rot
    return co


def render(path, cam):
    scn = bpy.context.scene
    scn.camera = cam
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('RENDERED', path, flush=True)


def glb_info(path):
    """Parse a .glb's JSON chunk: animations with durations, nodes, meshes."""
    with open(path, 'rb') as fh:
        data = fh.read()
    magic, ver, length = struct.unpack_from('<III', data, 0)
    clen, ctype = struct.unpack_from('<II', data, 12)
    js = json.loads(data[20:20 + clen].decode('utf-8'))
    out = {'bytes': length, 'animations': [], 'nodes': [n.get('name') for n in js.get('nodes', [])]}
    acc = js.get('accessors', [])
    for a in js.get('animations', []):
        tmax = 0.0
        for s in a['samplers']:
            mx = acc[s['input']].get('max')
            if mx:
                tmax = max(tmax, mx[0])
        out['animations'].append((a.get('name'), round(tmax, 4), len(a['channels'])))
    return out
