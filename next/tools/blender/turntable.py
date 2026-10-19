"""Turntable stills of a glb: blender -b --factory-startup --python turntable.py -- in.glb outprefix [decimate_to_tris]
Prints triangle count and size; renders front, 3/4, side, back with a flat grey light (Workbench), so the shape is judged without any material."""
import bpy, sys, math, mathutils
a = sys.argv[sys.argv.index('--') + 1:]; src, pre = a[0], a[1]; target = int(a[2]) if len(a) > 2 else 0
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in meshes:
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='OBJECT')
tris = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons); print('TRIS', tris)
if target and tris > target:
    for o in meshes:
        md = o.modifiers.new('d', 'DECIMATE'); md.ratio = target / tris
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='d')
    print('TRIS after', sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons))
lo = mathutils.Vector((1e9,) * 3); hi = mathutils.Vector((-1e9,) * 3)
for o in meshes:
    for c in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(c); lo = mathutils.Vector(map(min, lo, w)); hi = mathutils.Vector(map(max, hi, w))
ctr = (lo + hi) / 2; size = hi - lo; print('SIZE', tuple(round(x, 2) for x in size))
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = 520; sc.render.resolution_y = 720
sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'SINGLE'; sc.display.shading.single_color = (0.55, 0.55, 0.6); sc.world = bpy.data.worlds.new('w'); sc.world.color = (0.03, 0.03, 0.05)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(size) * 1.15
for name, ang in (('front', 0), ('q', 45), ('side', 90), ('back', 180)):
    r = max(size) * 3; z = ctr.z
    cam.location = (ctr.x + math.sin(math.radians(ang)) * r, ctr.y - math.cos(math.radians(ang)) * r, z)
    d = ctr - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = f'{pre}-{name}.png'; bpy.ops.render.render(write_still=True)
