"""Last Fire: first-person railgun sniper on the shared arms rig (Blender 5.2, headless).

Run:
    blender.exe -b --factory-startup --python sniper_fp.py -- [--renders] [--debug]

Writes next/assets/fp/sniper_fp.glb (+ .blend), renders to next/playtests/blender-sniper/.

Our own design in the spirit of a near-future railgun marksman rifle (feel only, no shape copied):
long and sleek, matte black and graphite, a twin-rail cage around the barrel that spins up and
carries thin violet seams (material `glow_rail`, so the game can flash it on fire), a real tube
scope with a crosshair. It shares the rifle's grip, trigger, magwell and left-side charging handle,
so every hand contact solved for the rifle carries over exactly.

Clips: idle (4 s), fire (0.5 s heavy kick, rails kick a half turn), ads (scope on the camera axis),
reload (2.3 s cell swap, the spent cell drops), charge (0.4 s rail spin-up, two full turns).
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector, Matrix, Quaternion
from fp_lib import *  # noqa
from fp_arms import *  # noqa
import rifle_fp as R

ARGV = R.ARGV
DO_RENDERS = R.DO_RENDERS
DEBUG = R.DEBUG
OUT_GLB = os.path.join(ASSETS, 'sniper_fp.glb')
RENDERS = os.path.join(NEXT, 'playtests', 'blender-sniper')
os.makedirs(os.path.join(RENDERS, 'debug'), exist_ok=True)
log = R.log

BZ = R.BZ
ZS = 0.113                                   # scope axis height
SCOPE_RET = Vector((0.0, -0.050, ZS))        # crosshair plane, just inside the eyepiece
RAIL_PIVOT = Vector((0.0, 0.372, BZ))        # the rail cage spins about the bore from here
FIRE_LEN = 0.50
CHARGE_LEN = 0.40

# the shared clip code reads its pose constants from the rifle module: point them at this gun
R.RETICLE = SCOPE_RET
R.EYE_RELIEF = 0.082
R.HIP = dict(pos=Vector((0.104, 0.200, -0.140)), yaw=6.0, pitch=2.0, roll=4.0)


def lathe_closed(name, prof, segs=32, cz=0.0):
    """Spin a closed (r, y) outline about the bore axis: a hollow tube with real wall thickness."""
    bm = bmesh.new()
    rings = [[bm.verts.new((r * math.cos(2 * math.pi * i / segs), y, cz + r * math.sin(2 * math.pi * i / segs)))
              for i in range(segs)] for (r, y) in prof]
    n = len(prof)
    for k in range(n):
        k2 = (k + 1) % n
        for i in range(segs):
            j = (i + 1) % segs
            try:
                bm.faces.new((rings[k][i], rings[k][j], rings[k2][j], rings[k2][i]))
            except ValueError:
                pass
    return obj_from_bm(name, bm)


def disk(name, r, y, cz, segs=32):
    bm = bmesh.new()
    vs = [bm.verts.new((r * math.cos(2 * math.pi * i / segs), y, cz + r * math.sin(2 * math.pi * i / segs)))
          for i in range(segs)]
    bm.faces.new(vs)
    return obj_from_bm(name, bm, recalc=False)


def build_sniper(M):
    P = R.build_gun(M)
    # keep the rifle's lower, grip, trigger, controls, charging handle, stock and pad; replace the rest
    for k in ('upper', 'handguard', 'rail', 'barrel', 'muzzle', 'mag'):
        bpy.data.objects.remove(P.pop(k), do_unlink=True)
    for o in P.pop('seams') + P.pop('optic'):
        bpy.data.objects.remove(o, do_unlink=True)

    # long monolithic receiver with a sloped nose; the charging-handle slot stays on the left
    up = prism_x('upper', fillet([(-0.095, 0.034), (0.200, 0.034), (0.200, 0.064), (0.182, 0.0815), (-0.080, 0.0815),
                                  (-0.095, 0.070)], [0.004, 0.004, 0.010, 0.006, 0.010, 0.004], 4), -0.0185, 0.0185)
    cut(up, R.slot_x('c_ch', 0.052, 0.142, 0.0505, 0.0635, -0.026, -0.0125, 0.004))
    for sx in (-1, 1):
        cut(up, prism_x('c_line', rrect(0.110, 0.0009, 0.0008, 2, 0.040, 0.0715), sx * 0.0185 - 0.0008, sx * 0.0185 + 0.0008))
    finish(up, M['black'], bev=0.0034, segs=3)
    P['upper'] = up

    # short forend for the support hand (the rail cage ahead of it must stay free to spin)
    hp = [(-0.0255, BZ + 0.0300), (0.0255, BZ + 0.0300), (0.0255, BZ - 0.012), (0.014, BZ - 0.0340),
          (-0.014, BZ - 0.0340), (-0.0255, BZ - 0.012)]
    sec = fillet(hp, [0.005, 0.005, 0.007, 0.007, 0.007, 0.007], 4)
    rings = [[(x * k, y, BZ + (z - BZ) * k) for (x, z) in sec]
             for y, k in ((0.196, 1.0), (0.204, 1.0), (0.340, 1.0), (0.358, 0.93), (0.366, 0.80))]
    fe = loft('handguard', rings)
    for sx in (-1, 1):
        cut(fe, rbox('c_seam%d' % sx, (0.0036, 0.120, 0.0028), (sx * 0.0255, 0.272, BZ + 0.006), r=0.0012))
    finish(fe, M['black'], smooth_angle=40)
    P['handguard'] = fe
    seams = []
    for sx in (-1, 1):
        sm = rbox('seam%d' % sx, (0.0016, 0.116, 0.0016), (sx * 0.0246, 0.272, BZ + 0.006), r=0.0007)
        finish(sm, M['glow'], wn=False)
        seams.append(sm)
    P['seams'] = seams

    # scope rail on the receiver
    rp = [(-0.0108, 0.0810), (0.0108, 0.0810), (0.0108, 0.0870), (0.0097, 0.0895), (-0.0097, 0.0895), (-0.0108, 0.0870)]
    rl = prism_y('rail', rp, -0.080, 0.180)
    bevel(rl, 0.0006, 2, 35)
    bm = bmesh.new()
    y = -0.072
    while y < 0.176:
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, y, 0.0900)) @ Matrix.Diagonal((0.030, 0.0048, 0.0034, 1)))
        y += 0.0100
    cut(rl, obj_from_bm('c_rail', bm))
    finish(rl, M['graphite'], smooth_angle=30)
    P['rail'] = rl

    # barrel and the railgun muzzle block
    br = lathe_y('barrel', [(0.0105, 0.360), (0.0105, 0.800)], 20, cz=BZ)
    finish(br, M['metal'], smooth_angle=60, wn=False)
    P['barrel'] = br
    mz = prism_y('muzzle', rrect(0.0300, 0.0175, 0.0070, 4, 0.0, BZ), 0.796, 0.842)
    cut(mz, lathe_y('c_bore', [(0.0060, 0.70), (0.0060, 0.90)], 16, cz=BZ))
    cut(mz, prism_y('c_slot', rrect(0.0040, 0.0120, 0.0018, 2, 0.0, BZ), 0.830, 0.90))
    finish(mz, M['graphite'], bev=0.0020, segs=3)
    P['muzzle'] = mz

    # twin-rail cage (its own bone: spins about the bore)
    parts = []
    for sx in (-1, 1):
        bar = prism_y('bar%d' % sx, rrect(0.0042, 0.0125, 0.0030, 3, sx * 0.0245, BZ), 0.378, 0.796)
        finish(bar, M['graphite'], bev=0.0012, segs=2)
        parts.append(bar)
        gl = prism_y('rglow%d' % sx, rrect(0.0007, 0.0011, 0.0005, 2, sx * 0.0289, BZ), 0.392, 0.782)
        parts.append(gl)
    for y in (0.380, 0.520, 0.660, 0.792):
        ring = prism_y('ring', rrect(0.0300, 0.0168, 0.0080, 4, 0.0, BZ), y - 0.004, y + 0.004)
        cut(ring, prism_y('c_ring', rrect(0.0205, 0.0128, 0.0060, 4, 0.0, BZ), y - 0.01, y + 0.01))
        finish(ring, M['black'], bev=0.0012, segs=2)
        parts.append(ring)
    rail_glow = material('glow_rail', (0.02, 0.02, 0.03), emit=R.VIOLET, strength=9.0)
    for o in parts:
        if o.name.startswith('rglow'):
            o.data.materials.clear()
            o.data.materials.append(rail_glow)
    rails = join('rails', parts)
    transform_mesh(rails, Matrix.Translation(-RAIL_PIVOT))
    P['rails'] = rails

    # scope: a real hollow tube, rear and front glass, pink crosshair just inside the eyepiece
    prof = [(0.0200, -0.070), (0.0206, -0.064), (0.0206, -0.032), (0.0168, -0.020), (0.0168, 0.150), (0.0226, 0.178),
            (0.0242, 0.200), (0.0242, 0.228), (0.0214, 0.229), (0.0214, 0.202), (0.0147, 0.178), (0.0147, -0.018),
            (0.0177, -0.030), (0.0177, -0.069)]
    sc = lathe_closed('scope', prof, 40, cz=ZS)
    finish(sc, M['black'], smooth_angle=35)
    tur = lathe_y('turret', [(0.0, 0.0), (0.0095, 0.0), (0.0100, 0.003), (0.0100, 0.013), (0.0090, 0.015), (0.0, 0.015)], 24)
    transform_mesh(tur, Matrix.Translation((0, 0.060, ZS + 0.0160)) @ Matrix.Rotation(D2R(90), 4, 'X'))
    finish(tur, M['graphite'], smooth_angle=40, wn=False)
    tur2 = lathe_y('turret2', [(0.0, 0.0), (0.0085, 0.0), (0.0090, 0.003), (0.0090, 0.011), (0.0080, 0.013), (0.0, 0.013)], 24)
    transform_mesh(tur2, Matrix.Translation((0.0160, 0.060, ZS)) @ Matrix.Rotation(D2R(-90), 4, 'Z'))
    finish(tur2, M['graphite'], smooth_angle=40, wn=False)
    mounts = []
    for y in (0.000, 0.120):
        base = rbox('mount', (0.024, 0.016, ZS - 0.0168 - 0.0895 + 0.004), (0.0, y, (0.0895 + ZS - 0.0168) / 2), r=0.003)
        finish(base, M['graphite'], bev=0.0012, segs=2)
        rg = lathe_closed('mring', [(0.0190, y - 0.007), (0.0190, y + 0.007), (0.0166, y + 0.007), (0.0166, y - 0.007)], 32, cz=ZS)
        finish(rg, M['graphite'], smooth_angle=40)
        mounts += [base, rg]
    g1 = disk('glass_rear', 0.0177, -0.058, ZS)
    g2 = disk('glass_front', 0.0214, 0.215, ZS)
    for g in (g1, g2):
        g.data.materials.append(M['glass'])
    bm = bmesh.new()
    def bar_(x0, z0, x1, z1):
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(((x0 + x1) / 2, SCOPE_RET.y, (z0 + z1) / 2)) @
                              Matrix.Diagonal((max(x1 - x0, 0.0004), 0.0002, max(z1 - z0, 0.0004), 1)))
    for a in (0, 1, 2, 3):
        dx, dz = [(1, 0), (-1, 0), (0, 1), (0, -1)][a]
        r0, r1, r2 = 0.0016, 0.0090, 0.0175
        if dx:
            bar_(min(dx * r0, dx * r1), ZS - 0.00018, max(dx * r0, dx * r1), ZS + 0.00018)
            bar_(min(dx * r1, dx * r2), ZS - 0.0007, max(dx * r1, dx * r2), ZS + 0.0007)
        else:
            bar_(-0.00018, ZS + min(dz * r0, dz * r1), 0.00018, ZS + max(dz * r0, dz * r1))
            bar_(-0.0007, ZS + min(dz * r1, dz * r2), 0.0007, ZS + max(dz * r1, dz * r2))
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, SCOPE_RET.y, ZS)) @ Matrix.Diagonal((0.0007, 0.0002, 0.0007, 1)))
    ret = obj_from_bm('crosshair', bm, recalc=False)
    ret.data.materials.append(M['reticle'])
    P['optic'] = [sc, tur, tur2, g1, g2, ret] + mounts

    # cheek riser on the stock
    riser = prism_x('riser', fillet([(-0.250, 0.070), (-0.120, 0.072), (-0.124, 0.086), (-0.246, 0.084)], 0.004, 3),
                    -0.0130, 0.0130)
    finish(riser, M['black'], bev=0.0025, segs=3)
    P['controls'].append(riser)

    # energy cell: fits the shared magwell, chunky housing below with a violet band
    rings = []
    for z, hw, hd in ((0.034, 0.0105, 0.0245), (0.030, 0.0122, 0.0295), (-0.036, 0.0122, 0.0295),
                      (-0.042, 0.0150, 0.0332), (-0.104, 0.0150, 0.0332), (-0.112, 0.0128, 0.0300)):
        rings.append([(x, y, z) for (x, y) in rrect(hw, hd, 0.0048, 3, 0.0, 0.119)])
    cell = loft('mag', rings)
    finish(cell, M['polymer'], smooth_angle=40)
    band = loft('cell_band', [[(x, y, z) for (x, y) in rrect(0.0153, 0.0335, 0.0050, 3, 0.0, 0.119)] for z in (-0.062, -0.058)])
    finish(band, M['glow'], wn=False)
    cap = loft('cell_cap', [[(x, y, z) for (x, y) in rrect(hw, hd, 0.0050, 3, 0.0, 0.119)]
                            for z, hw, hd in ((-0.110, 0.0156, 0.0338), (-0.118, 0.0156, 0.0338), (-0.121, 0.0140, 0.0320))])
    finish(cap, M['graphite'], smooth_angle=40)
    magj = join('mag', [cell, band, cap])
    transform_mesh(magj, Matrix.Translation(-R.MAG_SEAT))
    P['mag'] = magj
    return P


def static_parts(P):
    return [P['upper'], P['lower'], P['grip'], P['handguard'], P['rail'], P['barrel'], P['muzzle'], P['stock'],
            P['buttpad']] + P['seams'] + P['optic'] + P['controls']


def rails_rot(deg):
    return {'rails': Matrix.Translation(RAIL_PIVOT) @ Matrix.Rotation(D2R(deg), 4, 'Y')}


def make_fire(rig, S):
    c = R.Clip(rig, S, R.hip())
    tau = 0.030
    L = FIRE_LEN
    def gun(t):
        k = (t / tau) * math.exp(1 - t / tau) * (1.0 - smoothstep(0.22, L, t))
        k2 = R.impulse(t, 0.0, 7.0, 12.0) * (1.0 - smoothstep(0.30, L, t))
        return R.local_offset(R.hip(), (0.0015 * k2, -0.046 * k, 0.010 * k), pitch=6.5 * k + 0.8 * k2,
                              yaw=-1.0 * k2, roll=1.6 * k2)
    c.gun = gun
    c.trigger = lambda t: -14.0 * (smoothstep(0.0, 0.020, t) - smoothstep(0.08, 0.20, t))
    c.fR = R.static_fingers(S, 'R', 'R_trigger')
    c.fL = R.static_fingers(S, 'L', 'L_guard')
    c.parts_fn = lambda t: rails_rot(180.0 * smootherstep(0.0, 0.32, t))   # half turn: the cage looks the same after
    return c


def make_charge(rig, S):
    c = R.Clip(rig, S, R.hip())
    L = CHARGE_LEN
    def gun(t):
        hum = 0.00035 * math.sin(2 * math.pi * 40 * t) * math.sin(math.pi * t / L)
        return R.local_offset(R.hip(), (hum, 0.0, hum * 0.7), pitch=0.25 * math.sin(math.pi * t / L))
    c.gun = gun
    c.fR = R.static_fingers(S, 'R', 'R_trigger')
    fl = R.Fingers('L')
    g = S['L_guard'][1]
    fl.add(0.0, g).add(0.12, R.tweak(g, 'L', 4.0)).add(0.30, R.tweak(g, 'L', 4.0)).add(L, g)
    c.fL = fl
    c.parts_fn = lambda t: rails_rot(720.0 * smootherstep(0.0, L, t))       # two full turns, spin up and settle
    return c


def main():
    reset_scene()
    M = R.make_materials()
    P = build_sniper(M)
    statics = static_parts(P)
    gun_tris = sum(tri_count(o) for o in statics) + sum(tri_count(P[k]) for k in ('mag', 'charge', 'trigger', 'rails'))
    log('sniper triangles', gun_tris)
    S = R.solve_contacts(P)
    cfg = dict(upper_len=0.300, fore_len=0.295,
               shoulder={'R': (0.200, -0.120, -0.290), 'L': (-0.150, 0.050, -0.270)},
               pole_dir={'R': (0.55, -0.30, -0.78), 'L': (-0.62, 0.10, -0.78)})
    rig = Rig(cfg)
    G = R.hip()
    parts_rest = {'mag': Matrix.Translation(R.MAG_SEAT), 'charge': Matrix.Translation(R.CHARGE_REST),
                  'trigger': Matrix.Translation(R.TRIGGER_PIVOT), 'rails': Matrix.Translation(RAIL_PIVOT)}
    wrist = {'R': G @ S['R_trigger'][0], 'L': G @ S['L_guard'][0]}
    arm = rig.build(G, parts_rest, wrist)
    skin = rig.build_skin(M, seam_deg={'R': 205.0, 'L': 30.0})
    arms_tris = sum(tri_count(o) for o in skin)
    gun = join('sniper', statics)
    rig.attach(gun, 'gun')
    for k in ('mag', 'charge', 'trigger', 'rails'):
        rig.attach(P[k], k)
    rig.add_constraints()
    clips = {'idle': (R.make_idle(rig, S), int(4.0 * FPS)),
             'ads': (R.make_ads(rig, S), int(2.0 * FPS)),
             'fire': (make_fire(rig, S), int(round(FIRE_LEN * FPS))),
             'charge': (make_charge(rig, S), int(round(CHARGE_LEN * FPS)))}
    cr, Tr = R.reload_clip(rig, S, empty=False, drop_only=True)
    clips['reload'] = (cr, int(round(Tr * FPS)))
    for name, (clip, n) in clips.items():
        rig.bake(name, n, clip.state)
    rig.strip_controls()
    cam_empty = link(bpy.data.objects.new('camera', None))
    cam_empty.parent = arm
    cam_empty['fov_deg'] = R.FOV
    cam_empty['note'] = 'eye point: three.js camera here, looking down -Z, up +Y'
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ASSETS, 'sniper_fp.blend'))
    if DO_RENDERS:
        renders(rig, P, gun, skin)
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


def renders(rig, P, gun, skin):
    render_setup((1000, 900), 48)
    R.light_rig()
    cam = camera('_fpcam', (0, 0, 0), rot=(D2R(90), 0, 0), fov_v=R.FOV)
    shots = [('fp_idle', 'idle', 0.0), ('fp_ads', 'ads', 0.0), ('fp_fire_peak', 'fire', 0.06), ('fp_charge_50', 'charge', 0.5)]
    for p in (15, 35, 55, 75, 90):
        shots.append(('fp_reload_%02d' % p, 'reload', p / 100.0))
    for fn, clip, u in shots:
        rig.show(clip, u * rig.actions[clip][1])
        render(os.path.join(RENDERS, fn + '.png'), cam)
    rig.show('idle', 0)
    G = rig.arm.pose.bones['gun'].matrix
    centre = G @ Vector((0, 0.25, 0.03))
    R.set_visible(skin, False)
    render(os.path.join(RENDERS, 'gun_34.png'), camera('_out', centre + Vector((-0.95, 0.55, 0.36)), look=centre, lens=50))
    if DEBUG:
        render(os.path.join(RENDERS, 'debug', 'gun_side.png'), camera('_out2', centre + Vector((-1.3, 0.0, 0.0)), look=centre, lens=50))
    R.set_visible(skin, True)


if __name__ == '__main__':
    main()
