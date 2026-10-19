"""Last Fire: first-person assault rifle, arms and animations (Blender 5.2, headless).

Run (from anywhere):
    blender.exe -b --factory-startup --python rifle_fp.py -- [--renders] [--debug] [--stage gun|full]

Writes  next/assets/fp/rifle_fp.glb  (and rifle_fp.blend beside it), renders to
next/playtests/blender-rifle/.

Feel target: Call of Duty: Modern Warfare (2019), Infinity Ward's published animation rules:
weight matches the gun, an active idle of small muscular moves (no ship-deck sway), one continuous
reload with the magazine swap physically shown, reload_tac (no charging handle) and reload_empty
(charging handle), and modest gun motion during reloads so an aimed reload can stay on target.

Gun space: origin at the web of the right hand on the pistol grip, bore along +Y, up +Z, right +X.
"""
import sys, os, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector, Matrix, Quaternion, Euler
from fp_lib import *  # noqa
from fp_arms import *  # noqa

ARGV = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
DO_RENDERS = '--renders' in ARGV
DEBUG = '--debug' in ARGV
STAGE = ARGV[ARGV.index('--stage') + 1] if '--stage' in ARGV else 'full'
OUT_GLB = os.path.join(ASSETS, 'rifle_fp.glb')
RENDERS = os.path.join(NEXT, 'playtests', 'blender-rifle')
os.makedirs(ASSETS, exist_ok=True)
os.makedirs(RENDERS, exist_ok=True)
os.makedirs(os.path.join(RENDERS, 'debug'), exist_ok=True)
T0 = time.time()


def log(*a):
    print('[%6.1fs]' % (time.time() - T0), *a, flush=True)


BZ = 0.050             # bore height above the grip origin
ZC = 0.111             # optic window centre (the reticle) height
RETICLE = Vector((0.0, 0.0200, ZC))
MAG_SEAT = Vector((0.0, 0.119, 0.034))      # top centre of a seated magazine
CHARGE_REST = Vector((-0.028, 0.131, 0.057))
TRIGGER_PIVOT = Vector((0.0, 0.046, 0.004))
MAG_AXIS = Vector((0.0, 0.0, -1.0))         # the magazine leaves the magwell straight down
WELL_DEPTH = 0.068                          # how far the magazine sits inside the magwell
CHARGE_TRAVEL = 0.072
FOV = 54.0
GRIP_PALM_DOWN = 0.037     # palm centre this far down the grip from its top
GRIP_PALM_BACK = -0.004    # and this far behind the grip's centre line

VIOLET = hex_lin('#7b5cff')
PINK = hex_lin('#ff2a8d')


def make_materials():
    M = {
        'black': material('rifle_black', (0.016, 0.016, 0.018), rough=0.52),
        'graphite': material('rifle_graphite', (0.050, 0.051, 0.056), rough=0.34, metal=0.55),
        'metal': material('rifle_metal', (0.040, 0.040, 0.043), rough=0.28, metal=0.9),
        'polymer': material('rifle_polymer', (0.021, 0.021, 0.024), rough=0.66),
        'glass': material('rifle_glass', (0.10, 0.07, 0.25), rough=0.04, alpha=0.16),
        'glow': material('glow_violet', (0.02, 0.02, 0.03), emit=VIOLET, strength=9.0),
        'reticle': material('glow_pink', (0.03, 0.0, 0.01), emit=PINK, strength=14.0),
        'suit': material('suit_black', (0.011, 0.011, 0.013), rough=0.46, sheen=0.35),
        'glove': material('glove_black', (0.024, 0.024, 0.027), rough=0.40),
    }
    M['seam'] = M['glow']
    for k in ('glass', 'reticle'):
        M[k].use_backface_culling = False
    return M


# ---------------------------------------------------------------------------
#  The rifle (minimalist futurism: few strong forms, rounded edges, thin seams of light)
# ---------------------------------------------------------------------------

def slot_x(name, y0, y1, z0, z1, x0, x1, r):
    return prism_x(name, rrect((y1 - y0) / 2, (z1 - z0) / 2, r, 3, (y0 + y1) / 2, (z0 + z1) / 2), x0, x1)


def build_gun(M):
    P = {}
    # upper receiver: one long monolithic block, charging-handle slot on the left
    up = prism_x('upper', fillet([(-0.090, 0.034), (0.178, 0.034), (0.178, 0.0775), (-0.090, 0.0775)],
                                 [0.004, 0.003, 0.004, 0.007], 3), -0.0170, 0.0170)
    cut(up, slot_x('c_ch', 0.052, 0.142, 0.0505, 0.0635, -0.025, -0.0125, 0.004))
    cut(up, slot_x('c_port', 0.012, 0.062, 0.050, 0.066, 0.0125, 0.025, 0.003))
    for sx in (-1, 1):
        cut(up, prism_x('c_line', rrect(0.090, 0.0009, 0.0008, 2, -0.002, 0.0700), sx * 0.0170 - 0.0008, sx * 0.0170 + 0.0008))
    finish(up, M['black'], bev=0.0032, segs=3)
    P['upper'] = up

    # lower receiver with the magwell and an integral trigger guard
    lp = [(-0.072, 0.037), (0.158, 0.037), (0.161, -0.002), (0.165, -0.030), (0.150, -0.0345), (0.082, -0.0345),
          (0.074, -0.028), (0.020, -0.031), (0.010, -0.022), (0.006, 0.002), (-0.034, 0.002), (-0.062, 0.010),
          (-0.072, 0.022)]
    lr = [0.004, 0.003, 0.006, 0.003, 0.002, 0.003, 0.004, 0.006, 0.004, 0.003, 0.006, 0.008, 0.004]
    lo = prism_x('lower', fillet(lp, lr, 3), -0.0158, 0.0158)
    cut(lo, slot_x('c_trig', 0.020, 0.072, -0.025, 0.003, -0.03, 0.03, 0.008))
    cut(lo, rbox('c_well', (0.0270, 0.0650, 0.090), (0.0, 0.119, -0.010), r=0.0035))
    finish(lo, M['graphite'], bev=0.0018, segs=3)
    P['lower'] = lo

    # pistol grip: lofted egg sections along a 17 degree rake
    rake = D2R(17)
    A = Vector((0.0, -0.014, 0.006))
    g = Vector((0.0, -math.sin(rake), -math.cos(rake)))
    v = Vector((0.0, math.cos(rake), -math.sin(rake)))
    Lg = 0.106
    table = [(-0.07, 0.0128, 0.0205), (0.0, 0.0131, 0.0210), (0.12, 0.0138, 0.0216), (0.30, 0.0148, 0.0226),
             (0.48, 0.0152, 0.0231), (0.66, 0.0150, 0.0229), (0.84, 0.0148, 0.0229), (0.95, 0.0150, 0.0234),
             (1.00, 0.0138, 0.0214), (1.025, 0.0098, 0.0160)]
    rings = []
    for t, hw, hd in table:
        c = A + g * (Lg * t)
        rings.append([c + Vector((x, 0, 0)) + v * y for (x, y) in superellipse(hw, hd, 24, 2.5, front=0.80)])
    gr = loft('grip', rings)
    finish(gr, M['polymer'], smooth_angle=50)
    P['grip'] = gr

    # handguard: chamfered lower corners, a thin violet seam in a groove on each side
    hp = [(-0.0235, BZ + 0.0285), (0.0235, BZ + 0.0285), (0.0235, BZ - 0.010), (0.013, BZ - 0.0305),
          (-0.013, BZ - 0.0305), (-0.0235, BZ - 0.010)]
    sec = fillet(hp, [0.004, 0.004, 0.006, 0.006, 0.006, 0.006], 4)
    rings = []
    for y, k in ((0.172, 1.0), (0.180, 1.0), (0.440, 0.99), (0.461, 0.96), (0.470, 0.90)):
        rings.append([(x * k, y, BZ + (z - BZ) * k) for (x, z) in sec])
    hg = loft('handguard', rings)
    for sx in (-1, 1):
        cut(hg, rbox('c_seam%d' % sx, (0.0036, 0.236, 0.0028), (sx * 0.0235, 0.322, BZ + 0.004), r=0.0012))
    for sx in (-1, 1):
        for i, y in enumerate((0.230, 0.300, 0.370)):
            c = prism_x('c_vent', rrect(0.022, 0.0028, 0.0027, 3, y, 0.0), -0.003, 0.003)
            c.matrix_world = Matrix.Translation((sx * 0.0183, 0, BZ - 0.0203)) @ Matrix.Rotation(sx * D2R(27), 4, 'Y')
            transform_mesh(c, c.matrix_world); c.matrix_world = Matrix()
            cut(hg, c)
    for sx in (-1, 1):
        for y in (0.205, 0.250, 0.295, 0.340, 0.385, 0.430):
            c = prism_x('c_tv', rrect(0.014, 0.0022, 0.0021, 3, y, BZ + 0.0205), sx * 0.0235 - 0.0025, sx * 0.0235 + 0.0025)
            cut(hg, c)
    finish(hg, M['black'], smooth_angle=40)
    P['handguard'] = hg
    seams = []
    for sx in (-1, 1):
        s = rbox('seam%d' % sx, (0.0016, 0.232, 0.0016), (sx * 0.0226, 0.322, BZ + 0.004), r=0.0007)
        finish(s, M['glow'], wn=False)
        seams.append(s)
    P['seams'] = seams

    # top rail, slotted over the receiver only (restrained detail)
    rp = [(-0.0108, 0.0772), (0.0108, 0.0772), (0.0108, 0.0835), (0.0097, 0.0862), (-0.0097, 0.0862), (-0.0108, 0.0835)]
    rl = prism_y('rail', rp, -0.084, 0.452)
    bevel(rl, 0.0006, 2, 35)
    bm = bmesh.new()
    y = -0.074
    while y < 0.166:
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, y, 0.0868)) @ Matrix.Diagonal((0.030, 0.0048, 0.0036, 1)))
        y += 0.0100
    for y in (0.405, 0.4150, 0.425, 0.435):
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, y, 0.0868)) @ Matrix.Diagonal((0.030, 0.0048, 0.0036, 1)))
    cutter = obj_from_bm('c_rail', bm)
    cut(rl, cutter)
    finish(rl, M['graphite'], smooth_angle=30)
    P['rail'] = rl

    # barrel and muzzle device
    br = lathe_y('barrel', [(0.0095, 0.440), (0.0095, 0.552)], 20)
    finish(br, M['metal'], smooth_angle=60, wn=False)
    P['barrel'] = br
    mz = lathe_y('muzzle', [(0.0124, 0.546), (0.0140, 0.551), (0.0140, 0.604), (0.0129, 0.613), (0.0072, 0.614),
                            (0.0062, 0.604)], 24, cz=BZ)
    transform_mesh(mz, Matrix())
    for y in (0.566, 0.584):
        cut(mz, slot_x('c_port', y - 0.0045, y + 0.0045, BZ - 0.0026, BZ + 0.0026, -0.03, 0.03, 0.0024))
    finish(mz, M['graphite'], smooth_angle=40)
    P['muzzle'] = mz
    # lathe_y spins about Y through (cx, cz); the barrel needs moving to the bore
    transform_mesh(br, Matrix.Translation((0, 0, BZ)))

    # stock: one sculpted piece with a lightening cut, rubber butt pad
    sp = [(-0.088, 0.0745), (-0.315, 0.068), (-0.336, 0.058), (-0.338, -0.066), (-0.318, -0.076), (-0.072, 0.012),
          (-0.088, 0.034)]
    st = prism_x('stock', fillet(sp, [0.003, 0.020, 0.008, 0.008, 0.014, 0.010, 0.004], 5), -0.0150, 0.0150)
    hole = prism_x('c_hole', fillet([(-0.112, 0.058), (-0.312, 0.054), (-0.312, -0.050)], [0.010, 0.016, 0.016], 6),
                   -0.03, 0.03)
    cut(st, hole)
    finish(st, M['graphite'], bev=0.0040, segs=3)
    P['stock'] = st
    pad = prism_x('buttpad', fillet([(-0.336, 0.058), (-0.347, 0.056), (-0.349, -0.068), (-0.338, -0.072)], 0.003, 2),
                  -0.0182, 0.0182)
    finish(pad, M['polymer'], bev=0.002, segs=2)
    P['buttpad'] = pad

    # optic: a hooded tunnel sight with a pink ring reticle
    base = rbox('optic_base', (0.026, 0.070, 0.0085), (0.0, 0.002, 0.0902), r=0.004)
    finish(base, M['graphite'], bev=0.0012, segs=2)
    hr = []
    for y, k in ((-0.032, 0.90), (-0.028, 0.95), (0.020, 1.0), (0.030, 1.04)):
        hr.append([(x, y, z) for (x, z) in rrect(0.0195 * k, 0.0170 * k, 0.0085 * k, 4, 0.0, ZC + 0.0012 * (1 - k) * 10)])
    ho = loft('optic', hr)
    cut(ho, prism_y('c_win', rrect(0.0155, 0.0128, 0.0062, 4, 0.0, ZC), -0.05, 0.05))
    finish(ho, M['black'], bev=0.0016, segs=3)
    side = rbox('optic_side', (0.008, 0.030, 0.014), (0.0215, -0.002, ZC - 0.003), r=0.003)
    finish(side, M['graphite'], bev=0.0012, segs=2)
    glass = prism_y('optic_glass', rrect(0.0156, 0.0129, 0.0062, 4, 0.0, ZC), 0.0205, 0.0212)
    finish(glass, M['glass'], wn=False)
    bm = bmesh.new()
    n = 32
    ro, ri = 0.0030, 0.0024
    outer = [bm.verts.new((ro * math.cos(2 * math.pi * i / n), RETICLE.y, ZC + ro * math.sin(2 * math.pi * i / n))) for i in range(n)]
    inner = [bm.verts.new((ri * math.cos(2 * math.pi * i / n), RETICLE.y, ZC + ri * math.sin(2 * math.pi * i / n))) for i in range(n)]
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((outer[i], outer[j], inner[j], inner[i]))
    dot = [bm.verts.new((0.00055 * math.cos(2 * math.pi * i / 10), RETICLE.y, ZC + 0.00055 * math.sin(2 * math.pi * i / 10))) for i in range(10)]
    bm.faces.new(dot)
    ret = obj_from_bm('reticle', bm, recalc=False)
    ret.data.materials.append(M['reticle'])
    P['optic'] = [base, ho, side, glass, ret]

    # small controls: selector, bolt catch (left), mag release (right)
    sel = rbox('selector', (0.0030, 0.016, 0.0052), (-0.0172, -0.012, 0.024), r=0.0022)
    finish(sel, M['metal'], bev=0.0008, segs=2)
    bc = rbox('boltcatch', (0.0030, 0.010, 0.013), (-0.0172, 0.074, 0.021), r=0.002)
    finish(bc, M['metal'], bev=0.0008, segs=2)
    mr = lathe_y('magrel', [(0.0, 0.0), (0.0042, 0.0), (0.0042, 0.003), (0.0, 0.003)], 16)
    transform_mesh(mr, Matrix.Translation((0.0158, 0.078, 0.014)) @ Matrix.Rotation(D2R(-90), 4, 'Z'))
    finish(mr, M['metal'], wn=False)
    P['controls'] = [sel, bc, mr]

    # moving parts --------------------------------------------------------
    # magazine: gently curved below the magwell, separate baseplate with a violet line
    rings = []
    ss = [0.0, 0.025, 0.10, 0.20, 0.33, 0.45, 0.60, 0.75, 0.90, 1.0]
    for s in ss:
        z = 0.034 - 0.206 * s
        cy = 0.119 + 0.032 * max(0.0, (s - 0.33) / 0.67) ** 1.6
        hw, hd = (0.0105, 0.0245) if s == 0.0 else ((0.0122, 0.0295) if s < 0.40 else (0.0127, 0.0298))
        rings.append([(x, y, z) for (x, y) in rrect(hw, hd, 0.0045, 3, 0.0, cy)])
    mag = loft('mag', rings)
    for z in (-0.070, -0.082, -0.094):
        rib = prism_z('c_rib', rrect(0.0145, 0.0320, 0.004, 3, 0.0, 0.119 + 0.032 * max(0.0, ((0.034 - z) / 0.206 - 0.33) / 0.67) ** 1.6), z - 0.0012, z + 0.0012)
        inner = prism_z('c_ribin', rrect(0.0117, 0.0290, 0.004, 3, 0.0, 0.119 + 0.032 * max(0.0, ((0.034 - z) / 0.206 - 0.33) / 0.67) ** 1.6), z - 0.003, z + 0.003)
        cut(rib, inner)
        cut(mag, rib)
    finish(mag, M['polymer'], smooth_angle=40)
    cyb = 0.119 + 0.032
    brings = []
    for z, hw, hd in ((-0.168, 0.0128, 0.0300), (-0.171, 0.0141, 0.0322), (-0.184, 0.0141, 0.0324), (-0.187, 0.0128, 0.0306)):
        brings.append([(x, y, z) for (x, y) in rrect(hw, hd, 0.0050, 3, 0.0, cyb + 0.001)])
    plate = loft('mag_plate', brings)
    finish(plate, M['graphite'], smooth_angle=40)
    mseam = rbox('mag_seam', (0.0220, 0.0012, 0.0016), (0.0, cyb + 0.001 + 0.0326, -0.1775), r=0.0005)
    finish(mseam, M['glow'], wn=False)
    magj = join('mag', [mag, plate, mseam])
    transform_mesh(magj, Matrix.Translation(-MAG_SEAT))
    P['mag'] = magj

    kn = prism_z('charge', fillet([(-0.0150, 0.1225), (-0.0150, 0.1385), (-0.0300, 0.1405), (-0.0410, 0.1385),
                                   (-0.0420, 0.1300), (-0.0400, 0.1215), (-0.0300, 0.1205)], 0.0025, 3), 0.0500, 0.0640)
    finish(kn, M['graphite'], bev=0.0012, segs=2)
    transform_mesh(kn, Matrix.Translation(-CHARGE_REST))
    P['charge'] = kn

    tp = [(0.0465, 0.004), (0.0505, -0.004), (0.0500, -0.012), (0.0470, -0.0185), (0.0440, -0.0215),
          (0.0425, -0.0200), (0.0450, -0.0135), (0.0462, -0.006), (0.0440, 0.004)]
    tr = prism_x('trigger', fillet(tp, 0.001, 2), -0.0032, 0.0032)
    finish(tr, M['metal'], bev=0.0009, segs=2)
    transform_mesh(tr, Matrix.Translation(-TRIGGER_PIVOT))
    P['trigger'] = tr
    return P


def static_parts(P):
    out = [P['upper'], P['lower'], P['grip'], P['handguard'], P['rail'], P['barrel'], P['muzzle'], P['stock'],
           P['buttpad']] + P['seams'] + P['optic'] + P['controls']
    return out


# ---------------------------------------------------------------------------
#  Where the hands go (solved against the real gun surfaces)
# ---------------------------------------------------------------------------

def palm_target_frame(side, y_dir, z_dir, palm_point):
    W = frame(y_dir, z_dir)
    pl = Vector((0.0, 0.050, -0.0135))
    W.translation = Vector(palm_point) - W.to_3x3() @ pl
    return W


def thumb_pose(side, flex, abduct, twist=0.0):
    q = Quaternion((0, 1, 0), D2R(twist) * (1 if side == 'R' else -1)) @ \
        Quaternion((0, 0, 1), D2R(abduct) * (1 if side == 'R' else -1)) @ curl_q(flex)
    return q


def spread_all(side, rots, toward_thumb):
    for d, deg in toward_thumb.items():
        b = '%s_01_%s' % (d, side)
        rots[b] = rots.get(b, Quaternion()) @ spread_q(deg, side)
    return rots


def solve_contacts(P):
    """Hand frames (gun space) and finger rotations for every contact the clips use."""
    hmR, hmL = HandModel('R'), HandModel('L')
    def objs(names):
        out = []
        for n in names:
            o = P[n]
            out.extend(o if isinstance(o, list) else [o])
        return out
    # the magazine mesh is authored around MAG_SEAT; a seated copy for the solver
    bvh_grip = bvh_of(objs(['grip', 'lower', 'upper']))
    bvh_trig = bvh_of(objs(['lower', 'grip']))
    bvh_guard = bvh_of(objs(['handguard', 'rail']))
    bvh_mag = bvh_of([P['mag']], Matrix.Translation(MAG_SEAT))
    bvh_charge = bvh_of([P['charge']], Matrix.Translation(CHARGE_REST))
    bvh_upper = bvh_of(objs(['upper', 'lower', 'handguard']))
    S = {}

    # ---- right hand on the pistol grip ----
    # fingers run forward (perpendicular to the raked grip), palm flat on the grip's right side,
    # index knuckle at trigger height; then seat the palm and close the fingers around the front
    rake = D2R(17)
    gX = Vector((0.0, -math.sin(rake), -math.cos(rake)))
    gV = Vector((0.0, math.cos(rake), -math.sin(rake)))
    Y = (Quaternion(gX, D2R(-8)) @ gV).normalized()
    Z = Vector((1.0, 0.0, 0.0))
    A = Vector((0.0, -0.014, 0.006))
    W = palm_target_frame('R', Y, Z, A + gX * GRIP_PALM_DOWN + gV * GRIP_PALM_BACK)
    W = seat_palm(W, bvh_grip, 'R', clearance=0.0010)
    base = spread_all('R', {}, {'index': -2, 'middle': 0.5, 'ring': 3.5, 'pinky': 8})
    rots = dict(base)
    for d in ('middle', 'ring', 'pinky'):
        rots, touched, ang = close_digit(hmR, W, rots, digit_chain('R', d), bvh_grip, maxdeg=(95, 105, 85))
        log('R grip %-6s touched %s angles %s' % (d, touched, ['%.0f' % a for a in ang]))
    rots, e, x = reach_thumb(hmR, W, rots, 'R', Vector((0.0168, 0.016, 0.000)), bvh_upper,
                             lims=((-35, 60), (-25, 40), (-40, 40), (-10, 35), (-10, 35)))
    log('R thumb on the left side: %.1f mm %s' % (e * 1000, ['%.0f' % v for v in x]))
    P0 = hmR.fk(rots)
    log('R index MCP (gun space)', tuple(round(c, 4) for c in W @ P0['index_01_R'].translation),
        'wrist', tuple(round(c, 4) for c in W.translation))
    trig = dict(rots)
    trig, err, x = reach_digit(hmR, W, trig, digit_chain('R', 'index'), Vector((0.0, 0.0518, -0.0095)), bvh_trig, 'R',
                               x0=(0, 25, 40))
    log('R index on trigger: pad error %.1f mm, params %s' % (err * 1000, ['%.1f' % a for a in x]))
    Pt = hmR.fk(trig)
    log('   index tip', tuple(round(c, 4) for c in W @ (Pt['index_03_R'] @ Vector((0, hmR.length['index_03_R'], 0)))))
    frm = dict(rots)
    best = None
    for tgt in (Vector((0.0170, 0.066, 0.005)), Vector((0.0170, 0.072, 0.000)), Vector((0.0170, 0.060, -0.002))):
        for x0 in ((-10, -20, 5), (0, -10, 10), (10, 0, 5)):
            fr = dict(rots)
            fr, e2, x2 = reach_digit(hmR, W, fr, digit_chain('R', 'index'), tgt, bvh_upper, 'R', x0=x0, pad=0.5,
                                     mcp_min=-35, straight=3.0, spread_range=(-45, 45), grid=True)
            if best is None or e2 < best[0]:
                best = (e2, fr, x2)
    err2, frm, x2 = best
    log('R index on frame: pad error %.1f mm, params %s' % (err2 * 1000, ['%.1f' % a for a in x2]))
    S['R_trigger'] = (W, trig)
    S['R_frame'] = (W, frm)

    # ---- left hand under the handguard (thumb along the left side) ----
    # search the hand's turn under the handguard and its roll toward the left side; keep the one
    # whose thumb lies along the left side best (fingers always close around the right side)
    best = None
    for yaw in (-30, -15, 0, 15, 30):
        for roll in (-30, -15, 0, 15):
            Yd = Quaternion((0, 1, 0), D2R(roll)) @ (Quaternion((0, 0, 1), D2R(yaw)) @ Vector((0.93, 0.30, 0.20)))
            Zd = Quaternion((0, 1, 0), D2R(roll)) @ (Quaternion((0, 0, 1), D2R(yaw)) @ Vector((-0.30, 0.05, -0.95)))
            W = palm_target_frame('L', Yd, Zd, Vector((0.0, 0.282, BZ)))
            W = seat_palm(W, bvh_guard, 'L', clearance=0.0010)
            rots = spread_all('L', {}, {'index': -3, 'middle': 0.0, 'ring': 3, 'pinky': 7})
            for d in ('index', 'middle', 'ring', 'pinky'):
                rots, touched, ang = close_digit(hmL, W, rots, digit_chain('L', d), bvh_guard, maxdeg=(90, 105, 85))
            palm_y = (W @ Vector((0, 0.05, 0))).y
            tgt = Vector((-0.0246, palm_y + 0.045, BZ - 0.010))
            rots, e, x = reach_thumb(hmL, W, rots, 'L', tgt, bvh_guard,
                                     lims=((-35, 60), (-25, 70), (-40, 40), (-10, 30), (-10, 22)))
            Pq = hmL.fk(rots)
            top = max((W @ (Pq['%s_03_L' % d] @ Vector((0, hmL.length['%s_03_L' % d], 0)))).z
                      for d in ('index', 'middle', 'ring', 'pinky'))
            score = e + 3.0 * max(0.0, top - (BZ + 0.012)) + 0.00012 * (abs(x[3]) + abs(x[4])) / 10.0
            if best is None or score < best[0]:
                best = (score, W, dict(rots), yaw, roll, e)
    score, W, rots, yaw, roll, e = best
    log('L thumb along the handguard: %.1f mm (hand turned %d, rolled %d)' % (e * 1000, yaw, roll))
    S['L_guard'] = (W, rots)

    # ---- left hand on the magazine (palm on its front, thumb up the left face) ----
    W = palm_target_frame('L', Vector((0.60, 0.10, 0.79)), Vector((-0.18, 0.98, 0.0)), Vector((0.0, 0.135, -0.090)))
    W = seat_palm(W, bvh_mag, 'L', clearance=0.0010)
    rots = spread_all('L', {}, {'index': -4, 'middle': -1, 'ring': 2, 'pinky': 5})
    for d in ('index', 'middle', 'ring', 'pinky'):
        rots, touched, ang = close_digit(hmL, W, rots, digit_chain('L', d), bvh_mag, maxdeg=(95, 105, 85))
        log('L mag %-6s touched %s angles %s' % (d, touched, ['%.0f' % a for a in ang]))
    rots, e, x = reach_thumb(hmL, W, rots, 'L', Vector((-0.0128, 0.128, -0.050)), bvh_mag)
    log('L thumb on the magazine: %.1f mm' % (e * 1000))
    S['L_mag'] = (W, rots)

    # ---- left hand hooking the charging handle ----
    knob_front = Vector((-0.0355, 0.1415, 0.057))
    W = palm_target_frame('L', Vector((-0.15, -0.10, 0.98)), Vector((0.0, 1.0, 0.0)),
                          Vector((-0.050, 0.180, 0.000)))
    rots = spread_all('L', {}, {'index': 0, 'middle': 0, 'ring': 0, 'pinky': 0})
    rots, e1, x1 = reach_digit(hmL, W, rots, digit_chain('L', 'index'), knob_front + Vector((0, 0.001, 0.002)),
                               bvh_charge, 'L', x0=(0, 50, 60))
    rots, e2, x3 = reach_digit(hmL, W, rots, digit_chain('L', 'middle'), knob_front + Vector((0.0, 0.003, -0.008)),
                               bvh_charge, 'L', x0=(0, 55, 60))
    log('L charge hook: index %.1f mm, middle %.1f mm' % (e1 * 1000, e2 * 1000))
    for d in ('ring', 'pinky'):
        rots, touched, ang = close_digit(hmL, W, rots, digit_chain('L', d), bvh_upper, maxdeg=(80, 95, 70))
        log('L charge %s touched %s %s' % (d, touched, ['%.0f' % a for a in ang]))
    rots, e, x = reach_thumb(hmL, W, rots, 'L', Vector((-0.0185, 0.150, 0.040)), bvh_upper)
    log('L thumb under the charging handle: %.1f mm' % (e * 1000))
    S['L_charge'] = (W, rots)

    # open and relaxed hands for travel
    S['L_open'] = (None, relaxed('L', 12))
    S['L_flat'] = (None, relaxed('L', 4))
    return S


def close_thumb(hm, W, rots, side, bvh):
    chain = ['thumb_01_%s' % side, 'thumb_02_%s' % side, 'thumb_03_%s' % side]
    base = {n: rots.get(n, Quaternion()).copy() for n in chain}
    rots, touched, ang = close_digit(hm, W, rots, chain, bvh, maxdeg=(25, 55, 60), ratio=(0.4, 1.0, 0.9), base=base)
    log('%s thumb touched %s angles %s' % (side, touched, ['%.0f' % a for a in ang]))
    return rots


def relaxed(side, deg):
    rots = {}
    for d in ('index', 'middle', 'ring', 'pinky'):
        for j, n in enumerate(digit_chain(side, d)):
            rots[n] = curl_q(deg * (1.0, 1.3, 0.9)[j] + (d == 'pinky') * 4)
    rots['thumb_01_' + side] = thumb_pose(side, 6, 8)
    rots['thumb_02_' + side] = curl_q(deg * 0.6)
    rots['thumb_03_' + side] = curl_q(deg * 0.5)
    return rots


# ---------------------------------------------------------------------------
#  Finger pose tracks
# ---------------------------------------------------------------------------

class Fingers:
    """Keys of whole-hand finger states; each digit follows with a small stagger (organic close)."""

    def __init__(self, side):
        self.side = side
        self.k = []

    def add(self, t, rots):
        self.k.append((t, rots))
        self.k.sort(key=lambda x: x[0])
        return self

    def sample(self, t):
        out = {}
        for di, d in enumerate(DIGITS):
            te = t - 0.010 * di
            for n in digit_chain(self.side, d):
                out[n] = self._at(te, n)
        return out

    def _at(self, t, n):
        k = self.k
        if t <= k[0][0]:
            return k[0][1].get(n, Quaternion())
        if t >= k[-1][0]:
            return k[-1][1].get(n, Quaternion())
        i = max(j for j in range(len(k) - 1) if k[j][0] <= t)
        u = smootherstep(k[i][0], k[i + 1][0], t)
        a = k[i][1].get(n, Quaternion())
        b = k[i + 1][1].get(n, Quaternion())
        if a.dot(b) < 0:
            b = -b
        return a.slerp(b, u)


def blend_rots(a, b, u):
    out = {}
    for n in set(a) | set(b):
        qa, qb = a.get(n, Quaternion()), b.get(n, Quaternion())
        if qa.dot(qb) < 0:
            qb = -qb
        out[n] = qa.slerp(qb, u)
    return out


def tweak(rots, side, extra_curl=0.0):
    out = dict(rots)
    for d in ('index', 'middle', 'ring', 'pinky'):
        for n in digit_chain(side, d):
            out[n] = out.get(n, Quaternion()) @ curl_q(extra_curl)
    return out


# ---------------------------------------------------------------------------
#  Gun poses and motion
# ---------------------------------------------------------------------------

def gun_matrix(pos, yaw=0.0, pitch=0.0, roll=0.0):
    return Matrix.Translation(pos) @ Matrix.Rotation(D2R(yaw), 4, 'Z') @ Matrix.Rotation(D2R(pitch), 4, 'X') @ \
        Matrix.Rotation(D2R(roll), 4, 'Y')


HIP = dict(pos=Vector((0.108, 0.205, -0.143)), yaw=6.5, pitch=2.0, roll=4.0)
EYE_RELIEF = 0.165


def hip(dpos=(0, 0, 0), dyaw=0.0, dpitch=0.0, droll=0.0):
    return gun_matrix(HIP['pos'] + Vector(dpos), HIP['yaw'] + dyaw, HIP['pitch'] + dpitch, HIP['roll'] + droll)


def ads():
    return gun_matrix(Vector((0.0, EYE_RELIEF - RETICLE.y, -RETICLE.z)))


def local_offset(M, dpos=(0, 0, 0), pitch=0.0, yaw=0.0, roll=0.0):
    """Offset in the gun's own frame (recoil, micro-motion), pivoting at the grip."""
    return M @ Matrix.Translation(dpos) @ Matrix.Rotation(D2R(yaw), 4, 'Z') @ Matrix.Rotation(D2R(pitch), 4, 'X') @ \
        Matrix.Rotation(D2R(roll), 4, 'Y')


def micro(t, amp=1.0):
    """Active idle: a slow breath plus small muscular corrections. Every frequency is a multiple of
    0.25 Hz so the 4 s loop closes exactly. Millimetres and tenths of a degree, never sway."""
    w = 2 * math.pi
    dx = 0.00045 * math.sin(w * 0.75 * t + 0.4) + 0.00020 * math.sin(w * 2.0 * t + 1.1)
    dy = 0.00040 * math.sin(w * 0.5 * t + 2.0)
    dz = 0.00110 * math.sin(w * 0.25 * t) + 0.00030 * math.sin(w * 1.25 * t + 0.5)
    pitch = 0.22 * math.sin(w * 0.25 * t + 0.3) + 0.06 * math.sin(w * 1.5 * t + 0.9)
    yaw = 0.10 * math.sin(w * 0.5 * t + 1.0) + 0.04 * math.sin(w * 1.75 * t)
    roll = 0.14 * math.sin(w * 0.75 * t + 2.0)
    return (dx * amp, dy * amp, dz * amp), pitch * amp, yaw * amp, roll * amp


def impulse(t, t0, freq=9.0, damp=14.0):
    if t < t0:
        return 0.0
    x = t - t0
    return math.sin(2 * math.pi * freq * x) * math.exp(-damp * x)


# ---------------------------------------------------------------------------
#  Clips
# ---------------------------------------------------------------------------

class Clip:
    def __init__(self, rig, S, base):
        self.rig, self.S, self.base = rig, S, base
        self.gun = None
        self.L = None
        self.fL = None
        self.fR = None
        self.mag_attach = []      # (t0, t1) while the left hand holds the magazine
        self.mag_free = None      # (t_release, t_catch) the dropped magazine falls
        self.mag_rail = None
        self.charge = None
        self.trigger = None
        self.extra = None
        self._hist = []

    def poles(self, G, hands):
        out = {}
        cfg = self.rig.cfg
        for s in 'RL':
            S = Vector(cfg['shoulder'][s])
            Wp = (G @ hands[s]).translation
            out[s] = S.lerp(Wp, 0.5) + Vector(cfg['pole_dir'][s]).normalized() * 0.35
        return out

    def state(self, t):
        G = self.gun(t)
        if self.extra:
            G = self.extra(t, G)
        WR = self.S['R_trigger'][0]
        WL = self.L.matrix(t) if self.L else self.S['L_guard'][0]
        fingers = {}
        fingers.update(self.fR.sample(t))
        fingers.update(self.fL.sample(t))
        parts = {'mag': Matrix.Translation(MAG_SEAT),
                 'charge': Matrix.Translation(CHARGE_REST + Vector((0, -(self.charge(t) if self.charge else 0.0), 0))),
                 'trigger': Matrix.Translation(TRIGGER_PIVOT) @ Matrix.Rotation(D2R(self.trigger(t) if self.trigger else 0.0), 4, 'X')}
        if getattr(self, 'parts_fn', None):
            parts.update(self.parts_fn(t))
        hands = {'R': WR, 'L': WL}
        st = dict(gun=G, parts=parts, hands=hands, poles=self.poles(G, hands), fingers=fingers)
        held = any(a <= t < b for (a, b) in self.mag_attach)
        if held:
            WLg = self.S['L_mag'][0]
            off = WLg.inverted() @ Matrix.Translation(MAG_SEAT)
            def attach(rig, off=off, t=t):
                Mh = rig.arm.pose.bones['hand_L'].matrix
                M = Mh @ off
                self._hist.append((t, M.copy()))
                return {'mag': M}
            st['attach'] = attach
        elif self.mag_free and self.mag_free[0] <= t < self.mag_free[1]:
            def attach(rig, t=t, G=G):
                return {'mag': self.falling(t)}
            st['attach'] = attach
        return st

    def falling(self, t):
        hist = [h for h in self._hist if h[0] < self.mag_free[0] + 1e-6]
        (t1, M1), (t0, M0) = hist[-1], hist[-2]
        dt = t1 - t0
        v = (M1.translation - M0.translation) / dt
        x = t - t1
        g = Vector((0, 0, -9.81))
        p = M1.translation + v * x + g * (0.5 * x * x)
        q = M1.to_quaternion() @ Quaternion(Vector((1.0, 0.3, 0.2)).normalized(), x * 7.0)
        return Matrix.Translation(p) @ q.to_matrix().to_4x4()


def static_fingers(S, side, key):
    f = Fingers(side)
    f.add(0.0, S[key][1])
    return f


def make_idle(rig, S, length=4.0):
    c = Clip(rig, S, hip())
    c.gun = lambda t: local_offset(hip(), *micro(t))
    c.fR = static_fingers(S, 'R', 'R_trigger')
    fl = Fingers('L')
    g = S['L_guard'][1]
    fl.add(0.0, g).add(2.2, g).add(2.55, tweak(g, 'L', 3.0)).add(2.75, tweak(g, 'L', 3.0)).add(3.2, g).add(4.0, g)
    c.fL = fl
    return c


def make_ads(rig, S, length=2.0):
    c = Clip(rig, S, ads())
    def gun(t):
        dpos, p, y, r = micro(t * 2.0, 0.22)
        return local_offset(ads(), dpos, p, y, r)
    c.gun = gun
    c.fR = static_fingers(S, 'R', 'R_trigger')
    c.fL = static_fingers(S, 'L', 'L_guard')
    return c


def make_fire(rig, S, length=0.14):
    c = Clip(rig, S, hip())
    tau = 0.020
    def gun(t):
        k = (t / tau) * math.exp(1 - t / tau) * (1.0 - smoothstep(0.07, length, t))
        k2 = impulse(t, 0.0, 11.0, 30.0) * (1.0 - smoothstep(0.08, length, t))
        return local_offset(hip(), (0.0008 * k2, -0.020 * k, 0.0035 * k), pitch=2.6 * k + 0.4 * k2, yaw=-0.5 * k2,
                            roll=0.7 * k2)
    c.gun = gun
    c.trigger = lambda t: -14.0 * (smoothstep(0.0, 0.018, t) - smoothstep(0.05, 0.11, t))
    c.fR = static_fingers(S, 'R', 'R_trigger')
    c.fL = static_fingers(S, 'L', 'L_guard')
    return c


def belt_frame(G_at):
    """Left hand at the left hip pouch, in root space -> converted to gun space at that moment."""
    B = frame(Vector((0.15, 0.35, 0.92)), Vector((-0.92, 0.25, 0.1)), Vector((-0.170, 0.110, -0.500)))
    return G_at.inverted() @ B


def reload_clip(rig, S, empty, drop_only=False):
    """empty: drop the magazine and work the charging handle. drop_only: drop it, no charging handle."""
    drop = empty or drop_only
    charge_on = empty and not drop_only
    T = 2.3 if drop_only else (2.5 if empty else 2.0)
    c = Clip(rig, S, hip())
    WG, WM, WC = S['L_guard'][0], S['L_mag'][0], S['L_charge'][0]
    tilt = dict(dpos=(-0.045, -0.015, 0.072), dyaw=9.0, dpitch=10.0, droll=22.0)

    if drop_only:
        tk = dict(lift=0.08, pre=0.22, grab=0.28, out=0.40, rel=0.45, belt=0.70, leave=0.78, pre_in=1.08, seat=1.30,
                  let=1.36, guard=1.76, end=2.3, tilt_in=0.30, tilt_out0=1.50, tilt_out1=2.02)
    elif empty:
        tk = dict(lift=0.08, pre=0.22, grab=0.28, out=0.40, rel=0.45, belt=0.70, leave=0.78, pre_in=1.08, seat=1.30,
                  let=1.36, pre_ch=1.60, hook=1.68, pulled=1.86, snap=1.885, away=1.96, guard=2.22, end=2.5,
                  tilt_in=0.30, tilt_out0=1.95, tilt_out1=2.40)
    else:
        tk = dict(lift=0.08, pre=0.24, grab=0.30, out=0.44, belt=0.74, leave=0.80, pre_in=1.06, seat=1.30, let=1.36,
                  guard=1.72, end=2.0, tilt_in=0.30, tilt_out0=1.40, tilt_out1=1.90)

    G0 = hip()
    G1 = hip(tilt['dpos'], tilt['dyaw'], tilt['dpitch'], tilt['droll'])
    gt = Track()
    gt.add(0.0, G0, stop=True)
    gt.add(tk['tilt_in'], G1, stop=True)
    # while the magazine is out the gun drifts a touch toward the incoming hand, then meets it
    gt.add(tk['pre_in'] - 0.05, hip((-0.043, -0.013, 0.068), 8.0, 11.5, 23.0))
    gt.add(tk['seat'], hip((-0.044, -0.014, 0.070), 8.5, 9.5, 22.0), stop=True)
    if charge_on:
        gt.add(tk['hook'], hip((-0.034, -0.014, 0.058), 11.0, 7.0, 16.0), stop=True)
        gt.add(tk['pulled'], hip((-0.036, -0.020, 0.058), 11.5, 7.0, 16.0), stop=True)
    gt.add(tk['tilt_out0'], hip((-0.024, -0.008, 0.040), 6.0, 5.0, 12.0))
    gt.add(tk['tilt_out1'], G0, stop=True)
    gt.add(T, G0, stop=True)

    seat_t = tk['seat']
    snap_t = tk.get('snap')

    def gun(t):
        G = gt.matrix(t)
        # firm seat: the gun takes the hit of the magazine locking in
        k = impulse(t, seat_t, 7.0, 16.0)
        G = local_offset(G, (0, 0, 0.0035 * k), pitch=1.1 * k, roll=-0.6 * k)
        if snap_t:
            k2 = impulse(t, snap_t, 9.0, 18.0)
            G = local_offset(G, (0, 0.003 * k2, 0.001 * k2), pitch=-0.8 * k2, yaw=0.4 * k2)
        dpos, p, y, r = micro(t, 0.5)
        return local_offset(G, dpos, p, y, r)
    c.gun = gun

    # left hand path ------------------------------------------------------
    def along(W, s):
        return Matrix.Translation(MAG_AXIS * s) @ W

    def gun_at(t):
        return gt.matrix(t)

    L = Track()
    L.add(0.0, WG, stop=True)
    lift = Matrix.Translation((-0.010, -0.040, -0.050)) @ mat_lerp(WG, WM, 0.35)
    L.add(tk['lift'] + 0.06, lift)
    pre = Matrix.Translation(WM.to_3x3() @ Vector((0, -0.010, 0.016)) + Vector((0, 0, -0.012))) @ WM
    L.add(tk['pre'], pre)
    L.add(tk['grab'], WM, stop=True)
    g, o = tk['grab'], tk['out']
    for u in (0.25, 0.55, 0.8, 1.0):
        s = (WELL_DEPTH + 0.020) * smoothstep(0.0, 1.0, u) if u < 1 else WELL_DEPTH + 0.020
        L.add(g + (o - g) * u, along(WM, s))
    belt = belt_frame(gun_at(tk['belt']))
    if drop:
        fling = Matrix.Translation((-0.050, -0.010, -0.090)) @ along(WM, WELL_DEPTH + 0.02)
        L.add(tk['rel'] + 0.03, fling)
        L.add(tk['belt'], belt, stop=True)
    else:
        mid = Matrix.Translation((-0.06, -0.03, -0.17)) @ mat_lerp(along(WM, 0.09), belt, 0.5)
        L.add((o + tk['belt']) * 0.5, mid)
        L.add(tk['belt'], belt, stop=True)
    L.add(tk['leave'], Matrix.Translation(Vector((0.02, 0.02, 0.06))) @ belt)
    pre_in = along(WM, WELL_DEPTH + 0.030)
    up_mid = Matrix.Translation((-0.050, 0.010, -0.120)) @ mat_lerp(belt, pre_in, 0.55)
    L.add((tk['leave'] + tk['pre_in']) * 0.5, up_mid)
    L.add(tk['pre_in'], pre_in)
    pi, se = tk['pre_in'], tk['seat']
    for u, s in ((0.35, WELL_DEPTH * 0.55), (0.70, WELL_DEPTH * 0.12)):
        L.add(pi + (se - pi) * u, along(WM, s))
    L.add(se, WM, stop=True)
    L.add(tk['let'], Matrix.Translation(WM.to_3x3() @ Vector((0, -0.006, 0.010))) @ WM, stop=False)
    if charge_on:
        ch_pre = Matrix.Translation(WC.to_3x3() @ Vector((0.0, -0.012, 0.018))) @ WC
        L.add(tk['pre_ch'], ch_pre)
        L.add(tk['hook'], WC, stop=True)
        L.add(tk['pulled'], Matrix.Translation((0, -CHARGE_TRAVEL, 0)) @ WC, stop=True)
        L.add(tk['away'], Matrix.Translation(WC.to_3x3() @ Vector((0, -0.010, 0.030)) + Vector((0.0, -0.05, -0.035))) @ WC)
        L.add(tk['guard'] - 0.10, Matrix.Translation((-0.012, -0.012, -0.030)) @ WG)
        L.add(tk['guard'], WG, stop=True)
    else:
        L.add(tk['guard'] - 0.12, Matrix.Translation((-0.010, -0.015, -0.035)) @ WG)
        L.add(tk['guard'], WG, stop=True)
    L.add(T, WG, stop=True)
    c.L = L

    # magazine ------------------------------------------------------------
    if drop:
        c.mag_attach = [(tk['grab'], tk['rel']), (tk['belt'], tk['seat'])]
        c.mag_free = (tk['rel'], tk['belt'])
    else:
        c.mag_attach = [(tk['grab'], tk['seat'])]

    # charging handle -----------------------------------------------------
    if charge_on:
        h, p, sn = tk['hook'], tk['pulled'], tk['snap']
        def charge(t):
            if t < h:
                return 0.0
            if t < p:
                return CHARGE_TRAVEL * smootherstep(h + 0.01, p, t)
            if t < sn:
                return CHARGE_TRAVEL
            x = t - sn
            base_ = CHARGE_TRAVEL * max(0.0, 1.0 - x / 0.030) ** 2
            return base_ + 0.0025 * impulse(t, sn + 0.030, 16.0, 40.0)
        c.charge = charge

    # fingers ---------------------------------------------------------------
    fl = Fingers('L')
    gR = S['L_guard'][1]
    fl.add(0.0, gR).add(tk['lift'], S['L_open'][1]).add(tk['pre'], S['L_open'][1]).add(tk['grab'], S['L_mag'][1])
    if drop:
        fl.add(tk['rel'], S['L_mag'][1]).add(tk['rel'] + 0.07, S['L_open'][1])
        fl.add(tk['belt'] - 0.06, S['L_open'][1])
    fl.add(tk['belt'], S['L_mag'][1]).add(tk['seat'], S['L_mag'][1])
    fl.add(tk['let'] + 0.04, S['L_flat'][1])
    if charge_on:
        fl.add(tk['pre_ch'], S['L_open'][1]).add(tk['hook'], S['L_charge'][1]).add(tk['pulled'], S['L_charge'][1])
        fl.add(tk['away'], S['L_flat'][1])
    fl.add(tk['guard'] - 0.08, S['L_open'][1]).add(tk['guard'], gR).add(T, gR)
    c.fL = fl
    fr = Fingers('R')
    tR, fR_ = S['R_trigger'][1], S['R_frame'][1]
    back = tk['guard'] - 0.10
    fr.add(0.0, tR).add(0.16, fR_).add(back, fR_).add(back + 0.16, tR).add(T, tR)
    c.fR = fr
    return c, T


# ---------------------------------------------------------------------------
#  Renders
# ---------------------------------------------------------------------------

def light_rig():
    for o in [o for o in bpy.data.objects if o.name.startswith('_L')]:
        bpy.data.objects.remove(o, do_unlink=True)
    add_light('_Lkey', 'AREA', (0.55, 0.15, 0.75), (0.08, 0.45, -0.12), 34, 0.8)
    add_light('_Lfill', 'AREA', (-0.9, 0.3, 0.1), (0.05, 0.4, -0.12), 7, 1.5, (0.85, 0.85, 1.0))
    add_light('_Lrim', 'AREA', (0.2, 1.6, 0.5), (0.08, 0.4, -0.12), 40, 1.0, (0.75, 0.72, 1.0))
    add_light('_Lunder', 'AREA', (0.1, 0.4, -0.9), (0.08, 0.4, -0.12), 5, 1.0, (0.6, 0.55, 1.0))


def set_visible(objs, vis):
    for o in objs:
        o.hide_render = not vis


def main():
    reset_scene()
    M = make_materials()
    P = build_gun(M)
    log('gun built')
    # put the moving parts at their seated place for solving and outside renders
    statics = static_parts(P)
    gun_tris = sum(tri_count(o) for o in statics) + tri_count(P['mag']) + tri_count(P['charge']) + tri_count(P['trigger'])
    log('gun triangles', gun_tris)
    if STAGE == 'gun':
        render_setup((1000, 900), 48)
        centre = Vector((0, 0.10, 0.02))
        add_light('_Lkey', 'AREA', (-0.6, 0.2, 0.8), centre, 60, 1.0)
        add_light('_Lrim', 'AREA', (0.4, 1.0, 0.4), centre, 60, 1.0)
        add_light('_Lfill', 'AREA', (-0.8, -0.6, 0.0), centre, 15, 1.5)
        mag = P['mag']; mag.location = MAG_SEAT
        P['charge'].location = CHARGE_REST; P['trigger'].location = TRIGGER_PIVOT
        render(os.path.join(RENDERS, 'debug', 'gun_left.png'), camera('_c1', centre + Vector((-0.62, 0.42, 0.26)), look=centre, lens=50))
        render(os.path.join(RENDERS, 'debug', 'gun_side.png'), camera('_c2', centre + Vector((-1.0, 0.0, 0.0)), look=centre, lens=50))
        render(os.path.join(RENDERS, 'debug', 'gun_right.png'), camera('_c3', centre + Vector((0.6, -0.4, 0.2)), look=centre, lens=50))
        return
    S = solve_contacts(P)
    log('contacts solved')

    cfg = dict(upper_len=0.300, fore_len=0.295,
               shoulder={'R': (0.200, -0.120, -0.290), 'L': (-0.150, 0.050, -0.270)},
               pole_dir={'R': (0.55, -0.30, -0.78), 'L': (-0.62, 0.10, -0.78)})
    rig = Rig(cfg)
    G = hip()
    parts_rest = {'mag': Matrix.Translation(MAG_SEAT), 'charge': Matrix.Translation(CHARGE_REST),
                  'trigger': Matrix.Translation(TRIGGER_PIVOT)}
    wrist = {'R': G @ S['R_trigger'][0], 'L': G @ S['L_guard'][0]}
    arm = rig.build(G, parts_rest, wrist)
    log('rig built:', len(arm.data.bones), 'bones')
    skin = rig.build_skin(M, seam_deg={'R': 205.0, 'L': 30.0})
    arms_tris = sum(tri_count(o) for o in skin)
    log('arms triangles', arms_tris, [(o.name, tri_count(o)) for o in skin])

    rifle = join('rifle', statics)
    rig.attach(rifle, 'gun')
    rig.attach(P['mag'], 'mag')
    rig.attach(P['charge'], 'charge')
    rig.attach(P['trigger'], 'trigger')
    rig.add_constraints()

    if STAGE == 'contacts':
        contact_renders(rig, S, P, rifle, skin)
        return

    # pose check before baking: the rest state should already be the idle grip
    clips = {}
    clips['idle'] = (make_idle(rig, S), int(4.0 * FPS))
    clips['ads'] = (make_ads(rig, S), int(2.0 * FPS))
    clips['fire'] = (make_fire(rig, S), int(round(0.14 * FPS)))
    ct, Tt = reload_clip(rig, S, empty=False)
    clips['reload_tac'] = (ct, int(round(Tt * FPS)))
    ce, Te = reload_clip(rig, S, empty=True)
    clips['reload_empty'] = (ce, int(round(Te * FPS)))
    for name, (clip, n) in clips.items():
        rig.bake(name, n, clip.state)
    rig.strip_controls()

    cam_empty = link(bpy.data.objects.new('camera', None))
    cam_empty.empty_display_type = 'ARROWS'
    cam_empty.empty_display_size = 0.05
    cam_empty.parent = arm
    cam_empty['fov_deg'] = FOV
    cam_empty['note'] = 'eye point: three.js camera here, looking down -Z, up +Y'

    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ASSETS, 'rifle_fp.blend'))
    log('saved blend')

    if DO_RENDERS:
        do_renders(rig, clips, P, rifle, skin)

    rig.to_nla()
    set_active(arm)
    for o in bpy.data.objects:
        o.select_set(False)
    arm.select_set(True)
    for o in arm.children_recursive:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_animations=True, export_animation_mode='NLA_TRACKS',
                              export_force_sampling=True, export_frame_step=1, export_skins=True,
                              export_morph=False, export_extras=True, export_cameras=False, export_lights=False)
    info = glb_info(OUT_GLB)
    log('EXPORTED', OUT_GLB, info['bytes'] // 1024, 'KB')
    for a in info['animations']:
        log('  clip %-13s %.3f s, %d channels' % a)
    log('TRIS gun %d arms %d total %d' % (gun_tris, arms_tris, gun_tris + arms_tris))
    print('BONES', [b.name for b in arm.data.bones], flush=True)


def gun_cam(name, G, eye_gs, look_gs, lens=55):
    return camera(name, G @ Vector(eye_gs), look=G @ Vector(look_gs), lens=lens)


def contact_renders(rig, S, P, rifle, skin):
    """Fast check of every hand contact: posed live (IK), views placed in gun space."""
    render_setup((900, 700), 24)
    light_rig()
    base = make_idle(rig, S)
    out = os.path.join(RENDERS, 'debug')
    sleeves = [o for o in skin if o.name.startswith('sleeve')]
    set_visible(sleeves, False)
    for key in ('L_guard', 'L_mag', 'L_charge', 'R_frame'):
        st = base.state(0.0)
        if key == 'R_frame':
            st['fingers'].update(S['R_frame'][1])
        else:
            st['hands']['L'] = S[key][0]
            st['fingers'].update(S[key][1])
        rig.pose(st)
        G = st['gun']
        Lc = S[key][0] @ Vector((0, 0.05, 0))
        Rc = Vector((0.0, 0.01, -0.02))
        views = {'L': (Lc + Vector((-0.36, 0.0, 0.06)), Lc), 'D': (Lc + Vector((-0.10, 0.04, -0.36)), Lc),
                 'F': (Lc + Vector((-0.12, 0.36, 0.0)), Lc), 'B': (Lc + Vector((-0.10, -0.34, 0.08)), Lc)}
        if key == 'R_frame':
            views = {}
        if key in ('L_guard', 'R_frame'):
            views.update({'RL': (Rc + Vector((-0.34, 0.03, 0.04)), Rc), 'RR': (Rc + Vector((0.34, 0.02, 0.0)), Rc),
                          'RD': (Rc + Vector((0.08, 0.06, -0.34)), Rc)})
        for v, (e, l) in views.items():
            render(os.path.join(out, 'contact_%s_%s.png' % (key, v)), gun_cam('_cc', G, e, l, lens=50))
    set_visible(sleeves, True)


def do_renders(rig, clips, P, rifle, skin):
    render_setup((1000, 900), 48)
    light_rig()
    cam = camera('_fpcam', (0, 0, 0), rot=(D2R(90), 0, 0), fov_v=FOV)
    shots = [('fp_idle', 'idle', 0.0), ('fp_ads', 'ads', 0.0)]
    for p in (15, 35, 55, 75, 90):
        shots.append(('fp_reload_empty_%02d' % p, 'reload_empty', p / 100.0))
    if DEBUG:
        for p in (10, 20, 30, 45, 60, 70, 80, 95):
            shots.append(('debug/tac_%02d' % p, 'reload_tac', p / 100.0))
        for p in (5, 10, 20, 25, 45, 50, 62, 68, 72, 80):
            shots.append(('debug/empty_%02d' % p, 'reload_empty', p / 100.0))
        shots.append(('debug/fire_peak', 'fire', 0.15))
    for fn, clip, u in shots:
        n = rig.actions[clip][1]
        rig.show(clip, u * n)
        render(os.path.join(RENDERS, fn + '.png'), cam)
    # outside views
    rig.show('idle', 0)
    G = rig.arm.pose.bones['gun'].matrix
    centre = G @ Vector((0, 0.10, 0.02))
    set_visible(skin, False)
    c2 = camera('_out', centre + Vector((-0.62, 0.42, 0.26)), look=centre, lens=50)
    render(os.path.join(RENDERS, 'gun_34.png'), c2)
    if DEBUG:
        c3 = camera('_out2', centre + Vector((0.55, -0.35, 0.20)), look=centre, lens=50)
        render(os.path.join(RENDERS, 'debug', 'gun_34_back.png'), c3)
    set_visible(skin, True)
    gun_objs = [rifle, P['mag'], P['charge'], P['trigger']]
    set_visible(gun_objs, False)
    ac = Vector((0.03, 0.20, -0.24))
    c4 = camera('_arms', ac + Vector((-0.62, 0.42, 0.22)), look=ac, lens=35)
    render(os.path.join(RENDERS, 'arms_34.png'), c4)
    if DEBUG:
        c5 = camera('_arms2', ac + Vector((0.85, 0.55, -0.10)), look=ac, lens=40)
        render(os.path.join(RENDERS, 'debug', 'arms_right.png'), c5)
    set_visible(gun_objs, True)
    if DEBUG:
        # close-ups of each hand contact
        Rw = rig.arm.pose.bones['hand_R'].matrix.translation
        Lw = rig.arm.pose.bones['hand_L'].matrix.translation
        c6 = camera('_cuR', Rw + Vector((-0.20, 0.12, 0.10)), look=Rw + Vector((0, 0.05, 0.0)), lens=50)
        render(os.path.join(RENDERS, 'debug', 'close_R_left.png'), c6)
        c7 = camera('_cuR2', Rw + Vector((0.22, 0.10, 0.02)), look=Rw + Vector((0, 0.05, 0.0)), lens=50)
        render(os.path.join(RENDERS, 'debug', 'close_R_right.png'), c7)
        c8 = camera('_cuL', Lw + Vector((-0.22, 0.05, -0.12)), look=Lw + Vector((0.03, 0.05, 0.0)), lens=50)
        render(os.path.join(RENDERS, 'debug', 'close_L_under.png'), c8)
        for clip, u, nm in (('reload_empty', 0.112, 'close_mag_grab'), ('reload_empty', 0.70, 'close_charge'),
                            ('reload_empty', 0.52, 'close_mag_seat')):
            rig.show(clip, u * rig.actions[clip][1])
            Lw = rig.arm.pose.bones['hand_L'].matrix.translation
            c9 = camera('_cu' + nm, Lw + Vector((-0.24, 0.08, 0.06)), look=Lw + Vector((0.02, 0.04, 0.0)), lens=50)
            render(os.path.join(RENDERS, 'debug', nm + '.png'), c9)


if __name__ == '__main__':
    main()
