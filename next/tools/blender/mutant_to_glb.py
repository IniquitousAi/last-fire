# Mixamo "Mutant" (via mohsenheydari/three-fps, Mixamo terms allow game use) -> one glb with five clips: idle, walk, run, punch, die.
# Run: blender -b --factory-startup --python mutant_to_glb.py -- <folder with the six fbx> <out.glb>
import bpy, sys, os
src, out = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(src, 'mutant.fbx'))
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
clips = {'idle': 'mutant breathing idle.fbx', 'walk': 'mutant walking.fbx', 'run': 'mutant run.fbx', 'punch': 'mutant punch.fbx', 'die': 'mutant dying.fbx'}
arm.animation_data_create()
for name, f in clips.items():
    before = set(bpy.data.objects); acts0 = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=os.path.join(src, f))
    new = [a for a in bpy.data.actions if a not in acts0]
    act = max(new, key=lambda a: len(a.fcurves) if hasattr(a, 'fcurves') else 0); act.name = name; act.use_fake_user = True
    for o in set(bpy.data.objects) - before: bpy.data.objects.remove(o, do_unlink=True)
    tr = arm.animation_data.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, int(act.frame_range[0]), act)
arm.animation_data.action = None
# textures: shrink to 1024 so the file stays small
for im in bpy.data.images:
    if im.size[0] > 1024: im.scale(1024, int(1024 * im.size[1] / im.size[0]))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS', export_image_format='JPEG', export_jpeg_quality=80)
tris = sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == 'MESH' for p in o.data.polygons)
print('DONE', out, 'tris', tris, 'clips', [a.name for a in bpy.data.actions if a.use_fake_user])
