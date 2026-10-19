"""The Hollow's bodies for Last Fire: two rigged, animated creatures built from code (our own work, no downloaded model).

His vision (2026-10-19): the dark's creatures are TALL, many-limbed things made of tendrils, like walking dead trees, near black,
half hidden in fog as silhouettes, with a faint crimson or violet vein glow and no other glow. Not humanoid zombies, not cartoons.

  Thornwalker  a thin trunk on two long stilt legs, four tendril arms dragging to the ground, a crown of bare branches, no face.
               (walker, giant, watcher: the client scales and tints it per kind)
  Skitter      a low pod on eight long jointed legs that arch up and out like a harvestman's, two whips and a tail.
               (runner and the face that tears out of a wall)

Each is one skinned mesh (Body and Vein materials) with the clips Idle, Walk, Run, Attack, HitReact, Death. The walk and run clips'
ground speed is MEASURED from the feet (printed at the end) so the client can match animation speed to real ground speed.
Run: blender -b --factory-startup --python dark_creatures.py -- <out folder>      (Blender 5.2, headless)
Forward is Blender -Y, which exports as three's +Z (what the client's yaw expects).
"""
import bpy, bmesh, math, sys, os, json
from mathutils import Vector, Quaternion

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '.'
FPS = 30
V = Vector
SIDES = 7


# ----------------------------------------------------------------------------- geometry: tapered tubes skinned to a chain of bones
class Builder:
    def __init__(self, name):
        self.name = name; self.bones = {}     # bone name -> (head, tail, parent name or None)
        self.verts = []; self.faces = []; self.fmat = []; self.weights = []   # weights[i] = {bone: w}
        self.order = []

    def bone(self, name, head, tail, parent):
        self.bones[name] = (V(head), V(tail), parent); self.order.append(name)

    def chain(self, name, pts, radii, parent, vein=True, turns=2.5, tip=True, sub=3, mat=0, vr=0.011):
        """pts: joints; one bone per segment (name_0, name_1 ...); the tube is smooth across the joints."""
        pts = [V(p) for p in pts]; names = []
        for i in range(len(pts) - 1):
            n = f'{name}_{i}'; self.bone(n, pts[i], pts[i + 1], parent if i == 0 else names[-1]); names.append(n)
        samples = []
        for i in range(len(pts) - 1):
            for k in range(sub):
                f = k / sub; samples.append((pts[i].lerp(pts[i + 1], f), radii[i] + (radii[i + 1] - radii[i]) * f, i + f))
        samples.append((pts[-1], radii[-1], len(pts) - 1))
        self.sweep(samples, names, mat, tip)
        if vein:
            vs = []
            for idx, (p, r, t) in enumerate(samples):
                tg = (samples[min(idx + 1, len(samples) - 1)][0] - samples[max(idx - 1, 0)][0]).normalized()
                ref = V((0, 0, 1)) if abs(tg.z) < 0.9 else V((1, 0, 0)); nn = tg.cross(ref).normalized(); bb = tg.cross(nn)
                a = turns * 2 * math.pi * t / max(1, len(pts) - 1)
                vs.append((p + (nn * math.cos(a) + bb * math.sin(a)) * r * 0.97, vr, t))
            self.sweep(vs, names, 1, False)
        return names

    def sweep(self, samples, names, mat, tip):
        base = len(self.verts); rings = []
        for idx, (p, r, t) in enumerate(samples):
            tg = (samples[min(idx + 1, len(samples) - 1)][0] - samples[max(idx - 1, 0)][0]).normalized()
            ref = V((0, 0, 1)) if abs(tg.z) < 0.9 else V((1, 0, 0)); nn = tg.cross(ref).normalized(); bb = tg.cross(nn)
            w = {}
            for b in range(len(names)):
                x = max(0.0, 1 - abs(t - (b + 0.5)))
                if x > 0: w[names[b]] = x
            s = sum(w.values()); w = {k: v / s for k, v in w.items()}
            ring = []
            for j in range(SIDES):
                a = 2 * math.pi * j / SIDES; self.verts.append(p + (nn * math.cos(a) + bb * math.sin(a)) * r); self.weights.append(w); ring.append(len(self.verts) - 1)
            rings.append(ring)
        for a, b in zip(rings, rings[1:]):
            for j in range(SIDES):
                self.faces.append((a[j], a[(j + 1) % SIDES], b[(j + 1) % SIDES], b[j])); self.fmat.append(mat)
        if tip:
            p, r, t = samples[-1]; tg = (samples[-1][0] - samples[-2][0]).normalized(); self.verts.append(p + tg * r * 5); self.weights.append(self.weights[rings[-1][0]]); ap = len(self.verts) - 1
            for j in range(SIDES):
                self.faces.append((rings[-1][j], rings[-1][(j + 1) % SIDES], ap)); self.fmat.append(mat)


def build_armature(B):
    ad = bpy.data.armatures.new(B.name + 'Rig'); ob = bpy.data.objects.new(B.name, ad); bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; bpy.ops.object.mode_set(mode='EDIT')
    for n in B.order:
        h, t, par = B.bones[n]; eb = ad.edit_bones.new(n); eb.head = h; eb.tail = t if (t - h).length > 1e-4 else h + V((0, 0, 0.05))
        if par: eb.parent = ad.edit_bones[par]
    bpy.ops.object.mode_set(mode='OBJECT'); return ob


def build_mesh(B, arm):
    me = bpy.data.meshes.new(B.name + 'Mesh'); me.from_pydata([tuple(v) for v in B.verts], [], B.faces); me.update()
    body = bpy.data.materials.new('Body'); body.diffuse_color = (0.03, 0.025, 0.05, 1); body.use_nodes = True
    bsdf = body.node_tree.nodes['Principled BSDF']; bsdf.inputs['Base Color'].default_value = (0.03, 0.025, 0.05, 1); bsdf.inputs['Roughness'].default_value = 0.95
    vein = bpy.data.materials.new('Vein'); vein.use_nodes = True; vb = vein.node_tree.nodes['Principled BSDF']
    vb.inputs['Base Color'].default_value = (0.1, 0.0, 0.02, 1); vb.inputs['Emission Color'].default_value = (1.0, 0.1, 0.25, 1); vb.inputs['Emission Strength'].default_value = 1.0
    me.materials.append(body); me.materials.append(vein)
    for p, m in zip(me.polygons, B.fmat): p.material_index = m; p.use_smooth = True
    ob = bpy.data.objects.new(B.name + 'Body', me); bpy.context.scene.collection.objects.link(ob)
    for n in B.order: ob.vertex_groups.new(name=n)
    for i, w in enumerate(B.weights):
        for n, x in w.items(): ob.vertex_groups[n].add([i], x, 'REPLACE')
    ob.parent = arm; md = ob.modifiers.new('Armature', 'ARMATURE'); md.object = arm
    return ob


# ----------------------------------------------------------------------------- animation helpers
def Q(axis, ang): return Quaternion(axis, ang)
X, Y, Z = V((1, 0, 0)), V((0, 1, 0)), V((0, 0, 1))


class Poser:
    """Rotations are given about WORLD axes in the rest pose (parent to child they compose in order), so the maths reads like a person doing it."""
    def __init__(self, arm):
        self.arm = arm; self.pose = {}; self.loc = {}
        self.rest = {b.name: b.matrix_local.to_quaternion() for b in arm.data.bones}

    def rot(self, bone, axis, ang):
        q = Q(axis, ang); self.pose[bone] = self.pose.get(bone, Quaternion()) @ q if False else q @ self.pose.get(bone, Quaternion())

    def move(self, bone, delta):
        self.loc[bone] = self.loc.get(bone, V()) + V(delta)

    def apply(self, frame):
        for pb in self.arm.pose.bones:
            rc = self.rest[pb.name]; q = self.pose.get(pb.name, Quaternion())
            pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = rc.inverted() @ q @ rc
            d = self.loc.get(pb.name)
            pb.location = (rc.inverted() @ d) if d is not None else V()
            pb.keyframe_insert('rotation_quaternion', frame=frame)
            if d is not None or pb.name in KEY_LOC: pb.keyframe_insert('location', frame=frame)
        self.pose = {}; self.loc = {}


KEY_LOC = {'root', 'hips', 'body_0'}


def make_clip(arm, name, frames, fn, loop):
    """fn(poser, phase 0..1 over the clip, t seconds) sets that frame's pose. frames+1 keys so a loop wraps cleanly."""
    ad = arm.animation_data_create(); act = bpy.data.actions.new(name); ad.action = act; P = Poser(arm)
    for f in range(frames + 1):
        fn(P, f / frames, f / FPS); P.apply(f + 1)
    act.use_fake_user = True
    ad.action = None; tr = ad.nla_tracks.new(); tr.name = name; tr.strips.new(name, 1, act)
    return act


def stride_speed(arm, act, feet, frames, lo=0.03):
    """measure ground speed: while a foot is on the ground it moves back at the speed the body goes forward"""
    arm.animation_data.action = act; sc = bpy.context.scene; tot = []; cyc = frames / FPS
    for fb in feet:
        ys = []; zs = []
        for f in range(frames + 1):
            sc.frame_set(f + 1); p = arm.matrix_world @ arm.pose.bones[fb].tail; ys.append(p.y); zs.append(p.z)
        zmin = min(zs); v = []
        for i in range(frames):
            if zs[i] < zmin + lo and zs[i + 1] < zmin + lo: v.append((ys[i + 1] - ys[i]) * FPS)   # +Y is backwards on the body, so +y motion = forward ground speed
        if v: tot.append(sum(v) / len(v))
    arm.animation_data.action = None
    return sum(tot) / len(tot) if tot else 0.0


# ----------------------------------------------------------------------------- the Thornwalker
def thornwalker():
    B = Builder('Thornwalker')
    B.bone('root', (0, 0, 0), (0, 0, 0.1), None)
    trunk = [(0, 0, 1.25), (0, 0, 1.7), (0, 0.03, 2.15), (0, 0, 2.45), (0, -0.04, 2.7)]
    B.chain('hips', trunk[:], [.13, .11, .10, .07, .03], 'root', turns=3.0, sub=3)   # hips_0 hips, hips_1 spine low, hips_2 spine high, hips_3 neck
    for s, sn in ((1, 'L'), (-1, 'R')):
        B.chain('leg' + sn, [(s * .14, 0, 1.30), (s * .2, -.28, .70), (s * .2, .10, .18), (s * .2, -.30, .02)], [.06, .05, .035, .012], 'hips_0', turns=2.0)
        B.chain('armU' + sn, [(s * .10, 0, 2.2), (s * .45, -.25, 2.35), (s * .85, -.55, 2.05), (s * 1.15, -.95, 1.55), (s * 1.25, -1.45, 1.0), (s * 1.2, -1.9, .5)], [.045, .04, .032, .024, .016, .006], 'hips_2', turns=3.0)
        B.chain('armD' + sn, [(s * .09, 0.03, 1.85), (s * .40, .1, 1.8), (s * .80, -.1, 1.35), (s * 1.0, -.45, .8), (s * 1.05, -.85, .35), (s * 1.0, -1.1, .05)], [.04, .035, .028, .02, .014, .005], 'hips_1', turns=3.0)
    for i, d in enumerate([(0, 0, 1), (.5, 0, .8), (-.5, 0, .8), (0, -.5, .8), (0, .5, .8)]):
        d = V(d).normalized(); b0 = V((0, -.04, 2.7)); B.chain(f'crown{i}', [b0, b0 + d * .5 + V((0, -.05, 0)), b0 + d * 1.0 + V((0.1 * (i % 2 * 2 - 1), -.2, 0))], [.03, .02, .006], 'hips_3', vein=False)
    return B


def anim_thornwalker(arm, k=1.0):
    ar = ['armUL', 'armUR', 'armDL', 'armDR']; arms = [(f'{a}_{i}', a, i) for a in ar for i in range(5)]
    crown = [f'crown{i}_{j}' for i in range(5) for j in range(2)]

    def tend(P, ph, amp, spd, lead=0.0):   # tendrils: a wave that travels down each arm
        for k, (bn, a, i) in enumerate(arms):
            s = 1 if a.endswith('L') else -1; off = (0 if a.startswith('armU') else 1.7) + (0 if s == 1 else 0.9)
            w = math.sin(2 * math.pi * ph * spd - i * .7 + off) * amp * (0.5 + 0.25 * i)
            P.rot(bn, X, w + lead); P.rot(bn, Y, s * math.sin(2 * math.pi * ph * spd * 0.5 - i * .5 + off) * amp * 0.6)

    def crownsway(P, ph, a):
        for j, c in enumerate(crown): P.rot(c, X, math.sin(2 * math.pi * ph - j * .6) * a); P.rot(c, Y, math.cos(2 * math.pi * ph - j * .5) * a)

    def idle(P, ph, t):
        P.move('hips_0', (0, 0, math.sin(2 * math.pi * ph) * .012)); P.rot('hips_1', X, math.sin(2 * math.pi * ph) * .03); tend(P, ph, .12, 1); crownsway(P, ph, .05)

    def walk_like(period_ph, A, lift, bob, lean, armamp, crown_amp, zero_head=False):
        def fn(P, ph, t):
            for s, sn in ((1, 'L'), (-1, 'R')):
                p = 2 * math.pi * ph + (0 if s == 1 else math.pi)
                P.rot(f'leg{sn}_0', X, -A * math.sin(p)); P.rot(f'leg{sn}_1', X, lift * max(0, math.cos(p) + 0.2) + 0.25 * A * math.sin(p)); P.rot(f'leg{sn}_2', X, -0.5 * lift * max(0, math.cos(p)) - 0.25 * A * math.sin(p))
            P.move('hips_0', (0, 0, -bob * abs(math.sin(2 * math.pi * ph)) + bob * 0.5)); P.rot('hips_1', X, lean); P.rot('hips_1', Z, 0.08 * math.sin(2 * math.pi * ph) * (A / 0.5)); P.rot('hips_2', Z, -0.12 * math.sin(2 * math.pi * ph) * (A / 0.5))
            tend(P, ph, armamp, 2, lean * 1.2); crownsway(P, ph, crown_amp)
        return fn

    def attack(P, ph, t):
        e = lambda a, b, x: min(1, max(0, (x - a) / (b - a)))
        wind = e(0, .35, ph) * (1 - e(.35, .45, ph)); lash = e(.35, .5, ph) * (1 - e(.6, 1, ph))
        P.rot('hips_1', X, -.35 * wind + .55 * lash); P.rot('hips_2', X, -.2 * wind + .4 * lash)
        for bn, a, i in arms:
            s = 1 if a.endswith('L') else -1; P.rot(bn, X, (0.45 * wind * (1 + i * .3)) - (.95 + .25 * i) * lash); P.rot(bn, Y, s * (.25 * wind + .1 * lash))
        P.rot('legL_0', X, -.3 * lash); P.rot('legR_0', X, .15 * lash); crownsway(P, ph, .2 * lash + .05)
        P.move('hips_0', (0, -.25 * lash, -.1 * lash))

    def hit(P, ph, t):
        k = math.sin(math.pi * min(1, ph * 1.2)) * math.exp(-ph * 1.5)
        P.rot('hips_1', X, .55 * k); P.rot('hips_2', X, .4 * k); P.rot('hips_3', X, .3 * k); P.move('hips_0', (0, .18 * k, -.08 * k))
        for bn, a, i in arms: P.rot(bn, X, .8 * k * (1 + i * .2) * (1 if a.startswith('armU') else .6)); P.rot(bn, Y, (1 if a.endswith('L') else -1) * .5 * k)
        crownsway(P, ph, .3 * k)

    def death(P, ph, t):
        e = lambda a, b, x: min(1, max(0, (x - a) / (b - a))); k = e(0, .55, ph); fall = k * k   # a tree going over: slow, then gathering speed
        bounce = math.sin(math.pi * e(.55, .75, ph)) * .06 * (1 - e(.75, 1, ph))
        P.rot('root', X, -(1.45 * fall) + bounce)
        for sn in 'LR':
            P.rot(f'leg{sn}_0', X, -1.2 * e(0, .4, ph)); P.rot(f'leg{sn}_1', X, 2.0 * e(0, .4, ph)); P.rot(f'leg{sn}_2', X, -.7 * e(0, .4, ph))
        P.move('hips_0', (0, 0, -.5 * e(0, .4, ph)))
        for bn, a, i in arms:
            s = 1 if a.endswith('L') else -1; P.rot(bn, Y, s * (-.5 * e(.2, .7, ph)) ); P.rot(bn, X, -.4 * fall * (i + 1) / 3 + math.sin(ph * 9 - i) * .12 * (1 - ph))
        P.rot('hips_1', X, .4 * fall); P.rot('hips_3', X, .3 * fall); crownsway(P, ph, .25 * (1 - ph))

    return {
        'Idle': (60, idle, 'idle'), 'Walk': (36, walk_like(1, .50 * k, .55 * k, .035, .06, .22 * k, .08), 'walk'), 'Run': (20, walk_like(1, .80 * k, .90 * k, .06, .30, .35 * k, .12), 'run'),
        'Attack': (24, attack, None), 'HitReact': (14, hit, None), 'Death': (50, death, None)}, ['legL_2', 'legR_2']



# ----------------------------------------------------------------------------- the Hunched (the Stalker's thin humanoid: red slit eyes)
def eyes(B, parent, c, w=0.07, r=0.014):
    """two red slits: short bright tubes across the face (c: centre of the face, forward is -Y)"""
    for s, n in ((1, 'a'), (-1, 'b')):
        B.chain('eye' + n, [(s * w * 0.4 + c[0], c[1], c[2]), (s * w * 1.4 + c[0], c[1] + 0.012, c[2] + 0.02)], [r, r * 0.6], parent, vein=False, tip=False, mat=1)


def hunched():
    B = Builder('Hunched')
    B.bone('root', (0, 0, 0), (0, 0, 0.1), None)
    B.chain('hips', [(0, 0, 1.15), (0, -.12, 1.6), (0, -.35, 2.0), (0, -.6, 2.2), (0, -.85, 2.22)], [.1, .1, .09, .07, .05], 'root', turns=3.0)
    B.chain('head', [(0, -.8, 2.25), (0, -1.0, 2.2)], [.085, .05], 'hips_3', vein=False)
    eyes(B, 'hips_3', (0, -1.0, 2.22))
    for s, sn in ((1, 'L'), (-1, 'R')):
        B.chain('leg' + sn, [(s * .12, 0, 1.15), (s * .18, -.3, .6), (s * .18, .1, .12), (s * .18, -.22, .02)], [.07, .06, .04, .015], 'hips_0', turns=2.0)
        B.chain('armU' + sn, [(s * .12, -.3, 1.9), (s * .2, -.42, 1.65), (s * .26, -.6, 1.2), (s * .28, -.8, .8), (s * .27, -1.0, .4), (s * .24, -1.15, .1)], [.05, .045, .035, .028, .02, .006], 'hips_2', turns=3.0)
    return B


# ----------------------------------------------------------------------------- the Goliath (a black armoured brute, red cracks in the chest)
def goliath():
    B = Builder('Goliath')
    B.bone('root', (0, 0, 0), (0, 0, 0.1), None)
    B.chain('hips', [(0, 0, 1.2), (0, 0, 1.75), (0, -.05, 2.3), (0, -.1, 2.65), (0, -.2, 2.85)], [.3, .38, .42, .2, .12], 'root', turns=4.0, vr=0.02)
    B.chain('head', [(0, -.25, 2.85), (0, -.5, 2.9)], [.14, .09], 'hips_3', vein=False)
    eyes(B, 'hips_3', (0, -.58, 2.92), w=0.1, r=0.02)
    for s, sn in ((1, 'L'), (-1, 'R')):
        B.chain('leg' + sn, [(s * .25, 0, 1.25), (s * .32, -.1, .65), (s * .32, .05, .15), (s * .32, -.25, .03)], [.17, .15, .11, .07], 'hips_0', turns=2.0, vr=0.018)
        B.chain('armU' + sn, [(s * .4, -.05, 2.5), (s * .75, -.1, 2.1), (s * .95, -.35, 1.55), (s * 1.05, -.7, 1.0), (s * 1.1, -.95, .6), (s * 1.1, -1.1, .35)], [.16, .17, .15, .12, .1, .05], 'hips_2', turns=2.0, vr=0.016)
        B.chain('armD' + sn, [(s * .3, 0, 2.0), (s * .55, .1, 1.6), (s * .7, -.1, 1.25), (s * .8, -.35, .9), (s * .85, -.55, .6), (s * .85, -.7, .4)], [.1, .1, .09, .07, .05, .03], 'hips_1', turns=2.0)
        B.chain('crown' + ('0' if s == 1 else '1'), [(s * .1, -.25, 2.9), (s * .25, -.3, 3.2), (s * .2, -.4, 3.5)], [.05, .035, .008], 'hips_3', vein=False)
    return B

# ----------------------------------------------------------------------------- the Skitter
def skitter():
    B = Builder('Skitter')
    B.bone('root', (0, 0, 0), (0, 0, 0.1), None)
    B.chain('body', [(0, .30, .85), (0, 0, .85), (0, -.30, .88), (0, -.55, .9)], [.12, .21, .17, .08], 'root', turns=3.0, sub=3)   # body_0 abdomen, body_1 thorax, body_2 head
    ys = [-.35, -.10, .12, .35]
    for s, sn in ((1, 'L'), (-1, 'R')):
        for i, y in enumerate(ys):
            par = 'body_1' if i in (1, 2) else ('body_2' if i == 0 else 'body_0')
            B.chain(f'leg{sn}{i}', [(s * .12, y * .5, .85), (s * .75, y * 1.4, 1.65), (s * 1.45, y * 1.9, .95), (s * 1.85, y * 2.2, .0)], [.04, .034, .02, .008], par, turns=1.5)
        B.chain(f'whip{sn}', [(s * .05, -.55, .9), (s * .2, -1.0, 1.15), (s * .35, -1.5, 1.0), (s * .5, -1.95, .6)], [.025, .02, .012, .004], 'body_2', vein=False)
    B.chain('tail', [(0, .30, .85), (0, .8, 1.05), (0, 1.4, .85), (0, 1.9, .35)], [.04, .03, .018, .006], 'body_0', vein=False)
    return B


def anim_skitter(arm):
    legs = [(f'leg{sn}{i}', 1 if sn == 'L' else -1, i) for sn in 'LR' for i in range(4)]
    wh = [f'whip{sn}_{j}' for sn in 'LR' for j in range(3)] + [f'tail_{j}' for j in range(3)]

    def whips(P, ph, a, spd=1):
        for j, w in enumerate(wh): P.rot(w, Z, math.sin(2 * math.pi * ph * spd - j * .8 + (j // 3)) * a); P.rot(w, X, math.cos(2 * math.pi * ph * spd - j * .7) * a * .7)

    def gait(A, lift, bob):
        def fn(P, ph, t):
            for bn, s, i in legs:
                p = 2 * math.pi * ph + (math.pi if (i + (0 if s == 1 else 1)) % 2 else 0)
                P.rot(f'{bn}_0', Z, -s * A * math.sin(p)); P.rot(f'{bn}_1', Y, -s * lift * max(0, math.cos(p))); P.rot(f'{bn}_2', Y, s * .3 * lift * max(0, math.cos(p)))
            P.move('body_0', (0, 0, -bob * abs(math.sin(4 * math.pi * ph)))); P.rot('body_0', Z, .05 * math.sin(2 * math.pi * ph)); whips(P, ph, .25, 2)
        return fn

    def idle(P, ph, t):
        for bn, s, i in legs: P.rot(f'{bn}_1', Y, -s * .04 * math.sin(2 * math.pi * ph + i)); P.rot(f'{bn}_0', Z, s * .03 * math.sin(2 * math.pi * ph * 2 + i))
        P.move('body_0', (0, 0, .015 * math.sin(2 * math.pi * ph))); whips(P, ph, .18, 1)

    def attack(P, ph, t):
        e = lambda a, b, x: min(1, max(0, (x - a) / (b - a))); wind = e(0, .35, ph) * (1 - e(.35, .45, ph)); lash = e(.35, .5, ph) * (1 - e(.6, 1, ph))
        P.rot('body_0', X, .5 * wind - .35 * lash); P.move('body_0', (0, .25 * wind - .35 * lash, .15 * wind))
        for bn, s, i in legs:
            if i == 0: P.rot(f'{bn}_0', X, .9 * wind - .6 * lash); P.rot(f'{bn}_1', Y, -s * .6 * wind)
        for j, w in enumerate(wh): P.rot(w, X, -.9 * lash + .5 * wind); P.rot(w, Z, math.sin(ph * 18 - j) * .25 * lash)

    def hit(P, ph, t):
        k = math.sin(math.pi * min(1, ph * 1.2)) * math.exp(-ph * 1.5)
        P.rot('body_0', X, .5 * k); P.move('body_0', (0, .2 * k, -.08 * k))
        for bn, s, i in legs: P.rot(f'{bn}_1', Y, s * .35 * k)
        whips(P, ph, .6 * k, 2)

    def death(P, ph, t):
        e = lambda a, b, x: min(1, max(0, (x - a) / (b - a))); k = e(0, .5, ph); c = k * k * (3 - 2 * k)
        P.move('body_0', (0, 0, -.55 * c))
        for bn, s, i in legs:
            P.rot(f'{bn}_1', Y, s * 1.3 * c); P.rot(f'{bn}_2', Y, s * 1.0 * c); P.rot(f'{bn}_0', Z, -s * .2 * c * (1 if i < 2 else -1))
        for j, w in enumerate(wh): P.rot(w, X, .5 * c); P.rot(w, Z, math.sin(ph * 7 - j) * .2 * (1 - ph))

    return {'Idle': (60, idle, 'idle'), 'Walk': (32, gait(.35, .75, .02), 'walk'), 'Run': (16, gait(.55, 1.0, .04), 'run'),
            'Attack': (22, attack, None), 'HitReact': (12, hit, None), 'Death': (44, death, None)}, [f'leg{sn}{i}_2' for sn in 'LR' for i in range(4)]


# ----------------------------------------------------------------------------- run
def build(make, animate, outname):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    B = make(); arm = build_armature(B); build_mesh(B, arm)
    clips, feet = animate(arm); speeds = {}
    for name, (frames, fn, tag) in clips.items():
        act = make_clip(arm, name, frames, fn, tag is not None)
        if tag in ('walk', 'run'): speeds[tag] = round(stride_speed(arm, act, feet, frames), 2)
    arm.animation_data.action = None
    path = os.path.join(OUT, outname); bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS', export_apply=False, export_skins=True, export_yup=True, export_cameras=False, export_lights=False)
    print('DONE', outname, 'verts', len(B.verts), 'bones', len(B.order), 'clips', list(clips), 'ground speed m/s', speeds)
    return speeds


sp = {}
sp['thornwalker'] = build(thornwalker, anim_thornwalker, 'thornwalker.glb')
sp['skitter'] = build(skitter, anim_skitter, 'skitter.glb')
sp['hunched'] = build(hunched, lambda a: anim_thornwalker(a, 0.9), 'hunched.glb')
sp['goliath'] = build(goliath, lambda a: anim_thornwalker(a, 0.7), 'goliath.glb')
json.dump(sp, open(os.path.join(OUT, 'speeds.json'), 'w'))
