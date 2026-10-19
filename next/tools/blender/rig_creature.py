"""Rig a generated creature mesh (Hunyuan3D-2 from Daniel's creature-front.png) for Last Fire.
The MESH is generated (not hand built); this script only decimates it, builds a simple armature, weights the mesh to it by distance, and keys six clips.
  blender -b --factory-startup --python rig_creature.py -- <in.glb> <out.glb> [tris=14000] [height=2.9]
Bone positions were read off the front view (px in a 520x720 render of the mesh's front, ortho): see PX below. Forward is Blender -Y (exports as three's +Z).
"""
import bpy, sys, math, json
import numpy as np
from mathutils import Vector, Quaternion, Matrix

a = sys.argv[sys.argv.index('--') + 1:]; SRC, OUT = a[0], a[1]; LODS = [int(x) for x in (a[2] if len(a) > 2 else '14000,5000,1500').split(',')]; HEIGHT = float(a[3]) if len(a) > 3 else 2.9   # (three levels of detail on ONE skeleton: near, mid past 15 m, far past 40 m)
FPS = 30
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
for o in list(bpy.context.scene.objects):
    if o is not ob: bpy.data.objects.remove(o, do_unlink=True)
ob.parent = None; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
tris = sum(len(p.vertices) - 2 for p in ob.data.polygons); print('TRIS in', tris)
# measure once on the raw mesh so every level of detail lands in the same place
vs0 = np.array([v.co[:] for v in ob.data.vertices]); lo0, hi0 = vs0.min(0), vs0.max(0); K = HEIGHT / (hi0[2] - lo0[2]); CTR = (lo0 + hi0) / 2
raw = ob; ob = None; lods = []
for li, target in enumerate(LODS):
    o = raw.copy(); o.data = raw.data.copy(); o.name = f'Body_LOD{li}'; bpy.context.scene.collection.objects.link(o); bpy.context.view_layer.objects.active = o
    md = o.modifiers.new('d', 'DECIMATE'); md.ratio = min(1.0, target / tris); bpy.ops.object.modifier_apply(modifier='d')
    print('LOD', li, 'tris', sum(len(p.vertices) - 2 for p in o.data.polygons))
    o.data.materials.clear(); m = bpy.data.materials.new('Body'); m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.03, 0.025, 0.05, 1); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    for v in o.data.vertices: v.co = Vector(((v.co.x - CTR[0]) * K, (v.co.y - CTR[1]) * K, (v.co.z - lo0[2]) * K))
    lods.append(o)
bpy.data.objects.remove(raw, do_unlink=True)
vs = np.array([v.co[:] for v in lods[0].data.vertices]); lo, hi = vs.min(0), vs.max(0); print('BOX', lo.round(2), hi.round(2))
# px (front view 520x720, ortho scale = 1.15 * the old height of 1.95) -> metres on the new mesh: 720 px = 1.15 * HEIGHT
M_PER_PX = 1.15 * HEIGHT / 720; ZC = HEIGHT / 2


def P(px, py, y=0.0): return Vector(((px - 260) * M_PER_PX, y, ZC + (360 - py) * M_PER_PX))


def mir(x): return 520 - x


CH = {}   # chain name -> (parent bone or None, [points])
CH['spine'] = ('root', [P(255, 322), P(255, 232), P(258, 140), P(260, 52)])
for s, f in (('L', lambda x: x), ('R', mir)):
    CH['arm' + s] = ('spine_1', [P(f(205), 175), P(f(110), 285), P(f(78), 360), P(f(88), 440)])
T = [[(200, 310), (165, 470), (140, 565), (150, 668)], [(230, 322), (215, 470), (200, 570), (208, 645)], [(255, 332), (258, 420), (262, 490)],
     [(280, 326), (300, 430), (312, 530), (318, 600)], [(312, 312), (350, 450), (375, 560), (388, 668)]]
for i, t in enumerate(T): CH[f'tend{i}'] = ('spine_0', [P(*q) for q in t])
# the foot-most points sit on the ground; lift the whole rig so the lowest tendril tip touches z=0
low = min(p.z for _, (_, pts) in CH.items() for p in pts)
print('lowest bone point z', round(low, 3), 'mesh min z', round(float(lo[2]), 3))

ad = bpy.data.armatures.new('Rig'); arm = bpy.data.objects.new('CreatureRig', ad); bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
rb = ad.edit_bones.new('root'); rb.head = (0, 0, 0); rb.tail = (0, 0, 0.1)
segs = []   # (bone name, head, tail)
for name, (par, pts) in CH.items():
    prev = None
    for i in range(len(pts) - 1):
        n = f'{name}_{i}'; eb = ad.edit_bones.new(n); eb.head, eb.tail = pts[i], pts[i + 1]; eb.parent = ad.edit_bones[prev] if prev else ad.edit_bones[par]; prev = n; segs.append((n, pts[i], pts[i + 1]))
bpy.ops.object.mode_set(mode='OBJECT')

# weights: nearest bone segments by distance, top 3, falling off with distance cubed (same rule for every level of detail)
A = np.array([s[1][:] for s in segs]); B = np.array([s[2][:] for s in segs]); AB = B - A; L2 = (AB ** 2).sum(1)
for ob in lods:
    for s in segs: ob.vertex_groups.new(name=s[0])
    ob.vertex_groups.new(name='root')
    vs = np.array([v.co[:] for v in ob.data.vertices]); W = []
    for i0 in range(0, len(vs), 2000):
        v = vs[i0:i0 + 2000][:, None, :]; t = np.clip(((v - A) * AB).sum(2) / L2, 0, 1); d = np.linalg.norm(v - (A + AB * t[..., None]), axis=2)
        top = np.argsort(d, 1)[:, :3]
        for r in range(d.shape[0]):
            ids = top[r]; ds = d[r, ids]; w = 1 / (ds + 0.03) ** 3; w /= w.sum(); W.append(list(zip(ids, w)))
    for vi, lst in enumerate(W):
        for bi, w in lst:
            if w > 0.02: ob.vertex_groups[segs[bi][0]].add([vi], float(w), 'ADD')
    ob.parent = arm; mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = arm


# ------------------------------------------------------------------ animation (same pose helper as dark_creatures.py: world-axis rotations in the rest frame)
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))


class Poser:
    def __init__(self, arm): self.arm = arm; self.pose = {}; self.loc = {}; self.rest = {b.name: b.matrix_local.to_quaternion() for b in arm.data.bones}
    def rot(self, bone, axis, ang): self.pose[bone] = Quaternion(axis, ang) @ self.pose.get(bone, Quaternion())
    def move(self, bone, d): self.loc[bone] = self.loc.get(bone, Vector()) + Vector(d)
    def apply(self, frame):
        for pb in self.arm.pose.bones:
            rc = self.rest[pb.name]; q = self.pose.get(pb.name, Quaternion()); pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = rc.inverted() @ q @ rc
            d = self.loc.get(pb.name); pb.location = (rc.inverted() @ d) if d is not None else Vector()
            pb.keyframe_insert('rotation_quaternion', frame=frame)
            if d is not None or pb.name == 'root': pb.keyframe_insert('location', frame=frame)
        self.pose = {}; self.loc = {}


def make_clip(name, frames, fn):
    ad = arm.animation_data_create(); act = bpy.data.actions.new(name); ad.action = act; Pz = Poser(arm)
    for f in range(frames + 1): fn(Pz, f / frames); Pz.apply(f + 1)
    act.use_fake_user = True; ad.action = None; tr = ad.nla_tracks.new(); tr.name = name; tr.strips.new(name, 1, act); return act


def stride_speed(act, tips, frames):
    arm.animation_data.action = act; sc = bpy.context.scene; out = []
    for tb in tips:
        ys, zs = [], []
        for f in range(frames + 1): sc.frame_set(f + 1); p = arm.matrix_world @ arm.pose.bones[tb].tail; ys.append(p.y); zs.append(p.z)
        zmin = min(zs); v = [(ys[i + 1] - ys[i]) * FPS for i in range(frames) if zs[i] < zmin + 0.04 and zs[i + 1] < zmin + 0.04]
        if v: out.append(sum(v) / len(v))
    arm.animation_data.action = None; return sum(out) / len(out) if out else 0.0


tends = [f'tend{i}' for i in range(5)]; arms = [f'arm{s}' for s in 'LR']
nb = lambda c: len([1 for s in segs if s[0].startswith(c + '_')])


def sway(P, ph, amp, spd=1, lead=0.0):
    for ci, c in enumerate(tends + arms):
        for j in range(nb(c)):
            P.rot(f'{c}_{j}', X, math.sin(2 * math.pi * ph * spd - j * .7 + ci * 1.1) * amp * (0.6 + 0.3 * j) + lead)
            P.rot(f'{c}_{j}', Y, math.cos(2 * math.pi * ph * spd - j * .6 + ci * .8) * amp * .6)


def idle(P, ph): P.move('spine_0', (0, 0, math.sin(2 * math.pi * ph) * .012)); P.rot('spine_1', X, math.sin(2 * math.pi * ph) * .03); sway(P, ph, .05)


def gait(A, lift, bob, lean, armamp):
    def fn(P, ph):
        for ci, c in enumerate(tends):
            p = 2 * math.pi * ph + ci * 2.5; s = math.sin(p)
            P.rot(f'{c}_0', X, -A * s); P.rot(f'{c}_1', X, lift * max(0, math.cos(p)) + .3 * A * s)
            if nb(c) > 2: P.rot(f'{c}_2', X, -.6 * lift * max(0, math.cos(p)))
        P.move('root', (0, 0, -bob * abs(math.sin(2 * math.pi * ph)))); P.rot('spine_0', X, lean); P.rot('spine_1', Z, .06 * math.sin(2 * math.pi * ph))
        for s, c in ((1, 'armL'), (-1, 'armR')):
            for j in range(nb(c)): P.rot(f'{c}_{j}', X, math.sin(2 * math.pi * ph + (0 if s == 1 else math.pi)) * armamp * (.6 + .3 * j) + lean)
    return fn


def attack(P, ph):
    e = lambda a, b, x: min(1, max(0, (x - a) / (b - a))); wind = e(0, .35, ph) * (1 - e(.35, .45, ph)); lash = e(.35, .5, ph) * (1 - e(.6, 1, ph))
    P.rot('spine_0', X, -.3 * wind + .5 * lash); P.rot('spine_1', X, -.2 * wind + .35 * lash)
    for c in arms:
        for j in range(nb(c)): P.rot(f'{c}_{j}', X, .8 * wind * (1 + j * .3) - 1.1 * lash * (1 + j * .25))
    P.move('root', (0, -.35 * lash, -.1 * lash)); sway(P, ph, .08)


def hit(P, ph):
    k = math.sin(math.pi * min(1, ph * 1.2)) * math.exp(-ph * 1.5); P.rot('spine_0', X, .5 * k); P.rot('spine_1', X, .4 * k); P.rot('spine_2', X, .3 * k); P.move('root', (0, .15 * k, -.05 * k))
    for c in arms: [P.rot(f'{c}_{j}', X, .8 * k) for j in range(nb(c))]
    sway(P, ph, .2 * k)


def death(P, ph):
    e = lambda a, b, x: min(1, max(0, (x - a) / (b - a))); k = e(0, .6, ph); fall = k * k
    P.rot('root', X, -(1.4 * fall) + math.sin(math.pi * e(.6, .8, ph)) * .05 * (1 - e(.8, 1, ph))); P.move('root', (0, 0, -.35 * e(0, .4, ph)))
    for ci, c in enumerate(tends):
        for j in range(nb(c)): P.rot(f'{c}_{j}', X, (.7 + .3 * j) * e(0, .5, ph) * (1 if ci % 2 else -1) + math.sin(ph * 8 - j + ci) * .1 * (1 - ph))
    for c in arms:
        for j in range(nb(c)): P.rot(f'{c}_{j}', X, -.5 * fall * (j + 1) / 3)
    P.rot('spine_1', X, .4 * fall)


tips = [f'tend{i}_{nb("tend" + str(i)) - 1}' for i in (0, 1, 3, 4)]
speeds = {}
make_clip('Idle', 60, idle)
for nm, fr, fn in (('Walk', 36, gait(.35, .7, .03, .05, .25)), ('Run', 20, gait(.6, 1.1, .06, .25, .4))):
    act = make_clip(nm, fr, fn); speeds[nm.lower()] = round(stride_speed(act, tips, fr), 2)
make_clip('Attack', 24, attack); make_clip('HitReact', 14, hit); make_clip('Death', 50, death)
arm.animation_data.action = None
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS', export_skins=True, export_yup=True, export_image_format='NONE')
print('DONE', OUT, 'bones', len(segs) + 1, 'ground speed', speeds)
json.dump(speeds, open(OUT.replace('.glb', '.speeds.json'), 'w'))
