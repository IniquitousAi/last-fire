# Last Fire: the character bible (written 2026-10-19, for buying from Tripo later)

His words: know exactly what we want before spending real money; as perfect, beautiful and fast as possible; "a way later thing".
This file is that list. Nothing is bought or signed up for yet. Rules carried in: no cyan, orange, gold, yellow, brown or olive;
grim, gritty, grown-up, never cute; the Hollow is **one thing wearing many masks** (PLAN-SPACE.md, his pick A), the shapes our brains
are built to see in the dark; learn from references, never copy them. Our colors: hot pink 0xff4fd8 (matters to you), red 0xff3b5c
(danger), violet (the dark's edge), deep electric blue (Earth's night), grey-blue salvage metal 0x2a2e38 (LOOK.md).

## What exists now (measured from the files today)
| Model | Used for | Triangles | Bones | Clips the code calls |
| --- | --- | --- | --- | --- |
| c/soldier.glb (Quaternius CC0) | friends, the Night worker | 7,752 | 4 skins of 62 | Run, Idle_Gun, Walk |
| c/survivor.glb (Quaternius CC0) | the Clerk, a Council member | 1,908 | 41 | SitIdle, Idle |
| c/wraith.glb (Quaternius CC0) | every mask, stretched (LOOK table) | 3,144 | 38 | Flying_Idle, Fast_Flying, Punch, Death |
| c/shard.glb (Quaternius CC0) | the shard | 1,989 | none | none (it spins in code) |

The horde caps at 32 Hollow (MAX_HOLLOW in core/game.js), plus up to 3 friends and 3 camp people: about 38 skinned bodies at once.

## What the research says (sources at the bottom)
**Tripo pricing, read from tripo3d.ai/pricing on 2026-10-19:** Free $0, 200 credits a month, models public and non-commercial.
Pro $20 a month (or $240 a year), 3,000 credits, private models, commercial use, multiview to 3D, Smart Mesh, unlimited image
generation. Max $90 a month, 25,000 credits. Extra credits: $10 for 1,000. A new-user coupon showed 50% off the first month.
Credit costs on that page: HD generate 15 (Ultra +15, texture +10, HD texture +10, quad +5); texture gen 10 (PBR +5, HD +10);
retopology 5 (smart low poly +30, quad +5); Smart Mesh 35; segmentation 5; auto rig 20.

**What it outputs (Tripo developer docs):** GLB by default, FBX too (quad meshes arrive as FBX only). With PBR on: base color,
metallic, roughness and normal maps. Texture quality standard, detailed (HD) or extreme (8K). `face_limit` sets the polycount;
with smart low poly it is 500 to 20,000 triangles (500 to 10,000 quads), "hand-crafted" topology, best on simple inputs, can fail
on complex ones. Inputs: PNG, JPG or WebP, at least 256 px, "clean background and minimal occlusion"; multiview takes a front
image plus at least one of left, back, right.
**Rigging:** types biped, quadruped, hexapod, octopod, avian, serpentine, aquatic, others; biped v1.0 has 90+ animation presets;
v3.0 is better for humanoids and can name bones to Mixamo, Unity, Unreal or VRM. A free rig check runs first. Tripo's own help says
it wants a T-pose humanoid or an upright quadruped; seated, crouched, flying or odd poses misplace joints; fused shapes, extra
limbs and complex faces need manual work. So: always generate in a T-pose or A-pose, animate the pose later.
**Good vs bad results:** image to 3D beats text to 3D for control (you judge the picture for free before paying for the mesh);
multiview (front, side, back) fixes the guessed back side. Plain background, even light, no hard shadows (they bake into the shape),
arms away from the body, fingers apart, one character per image. Ask for the material, not the mood ("matte rubberized fabric",
not "scary").

**Browser budgets (three.js r186, our vendor copy):** a three.js forum test of low-poly skinned crowds (900 triangles, 25 bones)
started dropping under 60 fps past about 200 skinned meshes, and the cost was CPU (animation mixers, bone matrices), not
triangles. We have about 38, so bones and mixers stay cheap if far ones update at half rate. Triangles: our target is under
250,000 character triangles on screen in the worst night (most of the horde at LOD1). Textures: a 2048 RGBA texture is 16 MB of
GPU memory uncompressed; KTX2 (Basis) cuts that roughly 4 to 8 times (Khronos, vendor figure, measure ours); ETC1S for color,
UASTC for normal maps. Masks are mostly black, so 1024 textures are enough for every enemy.

## The budget table
| # | Character | LOD0 tris | LOD1 tris (past 25 m) | Texture (KTX2) | Bones | Rig |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | The crew suit (you, friends, learned friend) | 12,000 | 4,000 | 2048 color, 1024 normal and ORM | about 50 (with simple hands) | biped |
| 2 | The Clerk | 10,000 | 3,000 | 1024 set | about 50 | biped |
| 3 | The Night worker | 10,000 | 3,000 | 1024 set | about 50 | biped |
| 4 | A Council member | 10,000 | 3,000 | 1024 set | about 50 | biped |
| 5 | Walker mask | 7,000 | 2,000 | 1024 set | about 25 (no fingers) | biped |
| 6 | Runner mask (the corner of the eye) | 6,000 | 1,800 | 1024 set | about 30 | quadruped |
| 7 | Watcher mask (the tall one in the hat) | 7,000 | 2,000 | 1024 set | about 25 | biped |
| 8 | Face mask (the face in the surface) | 8,000 | 2,500 | 1024 set | about 25 | biped or others |
| 9 | Shard | 3,000 | 1,000 | 512 color plus emissive | none | none, code spins it |
| 10 | Giant | 15,000 | 5,000 | 2048 color, 1024 normal | about 30 | biped |
| 11 | The Hag (the weight on the chest, planned) | 7,000 | 2,000 | 1024 set | about 30 | biped, posed later |
| 12 | Boss: the thing at the end of the hall (lore implies it) | 30,000 | 10,000 | 2048 set | about 40 | others |
Worst night: 8 masks near at LOD0 (56k) + 24 far at LOD1 (48k) + giant (15k) + 3 friends (36k) = about 155k. Room left for the boss.

## The characters
**1. The crew suit.** What friends see of you. Feeling: a worker sent into the dark on purpose, not a hero. Silhouette: a broad,
hunched worker in a sealed suit with a boxy lamp pack on the back and a visor that is one dark slit. Details: salvage plates
bolted over fabric, hand-painted pink stencil numbers (the camp's forms), a lamp on the chest, cables to the pack, scuffed knees.
Palette: grey-blue 0x2a2e38 plates, black fabric, pink 0xff4fd8 stencils, the visor and lamp the only light.
Clips: Idle_Gun, Run (4 ways), Shoot, Reload, HitReact, Death (falls to an ember), Interact, Carry. Prompt (image to 3D, feed a
front plus side plus back concept): "full body survival work suit, sealed helmet with a single narrow dark visor slit, boxy
backpack lamp unit, grey-blue scuffed metal plates bolted over black rubberized fabric, small pink stenciled serial numbers,
chest lamp, utilitarian, realistic proportions, adult, T-pose, plain grey background, even soft light, no shadows".
Check: the pack reads at 30 m; hands separate; no warm tint in base color; visor not glossy white.

**2. The Clerk.** The camp's dry voice ("I don't make the quotas. I laminate them."). Feeling: tired, kind, done arguing.
Silhouette: a seated, narrow figure under a huge oversized coat with a clipboard against the chest. Details: lanyard of stamped
passes, fingerless gloves, a laminated form on the clipboard, reading lamp clipped to the collar, thin face, short grey hair.
Palette: muted blue-grey coat, black, one pink pass. Clips: SitIdle, SitTalk, Stamp, StandUp, Walk. Prompt: "middle-aged camp
clerk, tired face, oversized padded blue-grey work coat, lanyard of laminated passes, fingerless gloves, clipboard, small collar
lamp, realistic, grounded, A-pose standing, plain background, soft even light". Generate standing; sitting is an animation.
Check: the face is adult and plain, not cartoon; the rig check passes standing.

**3. The Night worker.** Guards the edge ("Light the edge, keep your back to the fire."). Feeling: calm because he has seen it.
Silhouette: tall, straight, a long rifle across the chest, a hooded cape heavy at the shoulders. Details: the crew suit's older
model, patched, a lamp on a pole on the back, tally marks scratched in the shoulder plate. Palette: black and grey-blue, a red
0xff3b5c warning band on the arm. Clips: Idle_Gun, Walk, LookOut, Talk. Prompt: "veteran night guard, older patched survival
suit, hooded heavy shoulder cape, long rifle held across the chest, pole lamp on back, scratched tally marks on shoulder plate,
red armband, realistic, T-pose with rifle removed, plain background". Generate the rifle apart; our guns are separate models.
Check: tall line reads apart from the crew suit at 30 m; tally marks visible at 5 m.

**4. A Council member.** One of the leaders who soften the odds; you used to be one. Feeling: polished, reasonable, wrong.
Silhouette: the only clean straight-edged figure in camp, a long stiff coat with a high collar. Details: violet panel trim (the
leaders' room style), a slate showing a softened number, spotless gloves. Palette: deep violet and black, clean, no wear.
Clips: Idle, TalkGesture, ArmsCrossed, Walk. Prompt: "camp leader, long stiff high-collared black coat with clean violet panel
trim, immaculate gloves, holding a thin data slate, composed adult face, realistic, A-pose, plain background, soft light".
Check: it looks cleaner than everyone else; that contrast is the point.

**5. Walker mask.** The plain shape the dark wears most. Feeling: someone you almost know, standing wrong. Silhouette: a tall
human outline with shoulders too high and arms too long, head a smooth blank. Details: surface like wet smoke frozen into cloth,
two pinpoint eyes (the code lights them), no mouth. Palette: near black, violet 0xb48cff edge and eyes. Clips: Flying_Idle
(sway), Fast_Flying (walk), Punch, HitReact, Death (shatters, code does the light). Prompt: "humanoid shadow figure, featureless
smooth head, overlong arms, shoulders slightly too high, body like dense black smoke frozen into draped fabric, two tiny eye
points, no mouth, no clothing details, unsettling realistic proportions, T-pose, plain light grey background".
Check: no grin, no teeth, no dog snout (his "smiling dog"); limbs separate for the rig.

**6. Runner mask (the corner of the eye).** Feeling: something was there. Silhouette: a low, long body on all fours, head
forward, longer than it is tall. Details: spine ridge, thin limbs, a head that is only a smooth wedge. Palette: black, pink
0xff4fa0 edge. Clips: Run (crawl sprint), Idle (crouch), Lunge, Death. Prompt: "thin black creature on all fours, human-like
limbs too long, low and stretched body, smooth wedge head with no face, visible spine ridge, smoke-like matte surface, standing
upright on four limbs, side view and front view, plain background". Rig: quadruped (v2.5). Check: the rig check passes four legs.

**7. Watcher mask (the tall one in the hat).** Moves only when nobody looks. Feeling: your own eyes are the weapon.
Silhouette: very tall and thin, a wide flat-brimmed hat, long coat to the ground, nothing else you can name. Details: no face
under the brim, two white pinpoints, coat edges dissolving into smoke at the hem. Palette: black, white eyes. Clips: Idle
(dead still), Step (one long glide), Strike, Death. Prompt: "very tall thin shadow man, wide flat brimmed hat, long black coat
reaching the ground with hem dissolving into smoke, no visible face under the brim, two small white eye points, arms long and
thin, T-pose, plain light background, even light". Check: hat and coat read as one shape at 30 m; the hat is part of the mesh.

**8. Face mask (the face in the surface).** Tears out of a wall on Earth. Feeling: you learn to distrust patterns.
Silhouette: a flat, wide upper body half out of a slab, one huge face, arms dragging it. Details: concrete skin with cracks, the
face only a suggestion of shadows (pareidolia, not a sculpted face), rebar where a spine would be. Palette: pale concrete grey,
magenta 0xff4fd8 cracks. Clips: Emerge, Lunge, Attack, Death. Prompt: "creature made of cracked grey concrete, flat wide torso
and two long arms, a large vague face formed by cracks and shadows on its chest, rebar spine, glowing magenta light inside the
cracks, T-pose, plain background". Check: the face must stay vague; a clear human face kills the idea.

**9. Shard.** Floats to the fire and drinks its light. Feeling: something precious that is wrong. Silhouette: a single tall
broken crystal, point down. Details: black glass with a pale blue core, chipped facets. Palette: black glass, blue 0x9fb6ff.
No rig, no clips: it spins in code. Prompt (text to 3D is fine): "single tall jagged black glass crystal shard, point down,
faceted, pale blue light inside, smooth dark-tech surface". Use smart low poly, face_limit 3000. Check: one piece, no base.

**10. Giant.** The heavy the fire wakes at level 3. Feeling: the light is not enough. Silhouette: twice a man's height, huge
hunched back, small head sunk between the shoulders, one arm longer. Details: plates of the dark's black glass grown over smoke,
red light in the seams. Palette: black, red 0xff2b40. Clips: Walk (heavy), Swing, HitReact, Death. Prompt: "massive hunched
humanoid twice human height, tiny head sunk between huge shoulders, one arm longer than the other, black glassy plates grown over
a smoky body, thin red glowing seams, T-pose, plain background". Check: the shell plates are separate in silhouette.

**11. The Hag (the weight on the chest, planned).** Pins you; a friend or a light frees you. Feeling: helpless, briefly.
Silhouette: a small, folded, impossibly thin figure that crouches on you. Details: long fingers, hair like smoke, bony back.
Palette: black, violet. Clips: Crawl, Pin, Release, Death. Prompt: "small extremely thin old shadow figure, long bony fingers,
smoke-like long hair, bony back, black and violet, realistic, T-pose standing, plain background". Generate standing, then crouch.
Check: thin, not comic; the rig must survive a deep crouch.

**12. Boss: the thing at the end of the hall.** Slow, huge, a new shape every time the light flickers. Feeling: you fight the
light, not the thing. Silhouette: a doorway-filling mass with too many long arms, always taller than the hall. Details: three
body states on one rig (ask Tripo for the same pose three times: walker-like, watcher-like, face-like), swapped on a flicker.
Palette: black, all four of our colors only in its seams. Clips: Loom, Advance, Sweep, Shift, Death. Prompt: "colossal shadow
being filling a corridor, many long thin arms, body like layered black smoke and glass, faint pink red and violet seams, no
face, symmetrical front pose arms spread, plain background". Rig: others (v3.0). Check: buy last, after every mask is proven.

## The buying plan (prices as read on 2026-10-19)
| Step | Credits | Why |
| --- | --- | --- |
| Concept images in Tripo's image tool, front plus side plus back | 0 on Pro (unlimited image generation) | judge the picture before any mesh |
| Per character: HD generate with PBR and HD texture, about 3 tries | 3 x 40 = 120 | first tries miss |
| Smart low poly for LOD0, retopology for LOD1 | 35 + 35 = 70 | our budget, not Tripo's millions |
| Auto rig (rig check is free) | 20 | the shard skips it |
| Per rigged character | about 210 to 250 | |
Order: 7 Watcher (the test) > 1 crew suit > 5 walker > 6 runner > 10 giant > 8 face > 9 shard > 3, 2, 4 camp people > 11 Hag >
12 boss. Twelve characters: about 2,600 to 3,000 credits, so one Pro month ($20) plus maybe one $10 pack: **$20 to $40 total**,
up to about $60 with bad luck. Max ($90) is never needed. The free-plan test costs $0.

**The cheap test first:** the Watcher, on the free plan's 200 credits (enough for one full pass: generate, low poly, rig, about
95 credits). Free models are public and non-commercial, so the test is never shipped; it only answers "is Tripo good enough".
Pass lines: under 7,000 triangles after smart low poly, the rig check passes, Idle and Strike play without broken shoulders,
it reads as itself in the silhouette check (PLAN-SPACE layer 2), no frame-rate drop with 32 copies in the sim scene. Pass: buy
Pro for one month and make all twelve in that month. Fail: back to TRELLIS.2 plus Mixamo (free, PLAN-SPACE section 3).

## Fix in code before importing
1. **Loaders:** vendor KTX2Loader, the Basis transcoder and the meshopt decoder for r186, and set them on the GLTFLoaders in
   client/main.js and client/camp.js. Every bought file goes through gltf-transform (resize, ETC1S color, UASTC normal, meshopt).
2. **Scale and hits:** the code scales each model by its box height (LOOK table: walker 2.56 m, runner 1.3 m, watcher 3.8 m,
   face 2.5 m, giant 5.4 m; people 1.7 to 1.8 m). Feet at the origin, facing +z. Head heights must match the hit spheres in
   KINDS (walker 2.2, runner 0.95, face 1.5, watcher 2.6, giant 2.85 m) or headshots miss.
3. **Rig mapping:** the code finds clips by name endings (Flying_Idle, Fast_Flying, Punch, Death, Run, Idle_Gun, Walk, SitIdle,
   Idle). Add a clip map per model ({ idle, move, attack, death }) instead of renaming files; ask Tripo for Mixamo bone names so free
   Mixamo clips fit too.
4. **Materials:** darken() finds eyes by the material names Eye_Black, Eye_White, Secondary; new masks need an emissive eye map
   instead. Camp people get their colors pulled 55% to 0x2a2e38; turn that off for authored textures. The smoke fade sets every
   material transparent; with real PBR this sorts badly, so switch to a dithered fade.
5. **Cost:** darken() sets frustumCulled false on every mask; give skinned meshes a padded bound and turn culling back on. Add
   LOD1 switching past 25 m and update far mixers at half rate.
6. **Credits:** one line per bought file in assets/CREDITS.txt (Tripo Pro, commercial use, the date).

## Sources
- Tripo pricing (read 2026-10-19): https://www.tripo3d.ai/pricing
- Tripo docs, image to model: https://developers.tripo3d.com/en/docs/generation-image-to-model/standard.md
- Tripo docs, auto rigging: https://developers.tripo3d.com/en/docs/animations-rig.md
- Tripo help on rig limits: https://www.tripo3d.ai/pt/blog/how-to-animate-an-ai-generated-3d-model
- Multiview inputs: https://it.freepik.com/ai/docs/3d-generator and https://docs.comfy.org/built-in-nodes/TripoImageToModelNodeV2
- Pose for rigging (Meshy, same rule): https://docs.meshy.ai/en/webapp/image-to-3d
- three.js skinned crowd costs: https://discourse.threejs.org/t/optimization-of-large-amounts-100-1000-of-skinned-meshes-cpu-bottlenecks/58196
- KTX2: https://www.khronos.org/news/press/khronos-ktx-2-0-textures-enable-compact-visually-rich-gltf-3d-assets and https://app.cinevva.com/tools/ktx2-compressor
