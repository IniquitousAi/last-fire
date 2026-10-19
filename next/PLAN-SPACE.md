# Last Fire, the space start: the execution path (researched 2026-10-19 about 02:30)

His ask: the Moon is the safe base; Earth is consumed by the dark and dangerous; many scary enemy types, not zombies, nothing overused;
nobody is sure if they are demons, aliens, or just the dark itself, "in the form of something we think is our imagination". Make it make
sense, cool to shoot, cool to hear. Simulate everything that can be simulated, then judge taste and feel after. Only free assets, only AI prompting.

## 1. The theme, made to make sense (one idea, three drafts to pick from)

The research gives the hook for free. Sleep paralysis and pareidolia produce the same few shapes in every human, because brains share
wiring: a dark human outline at the end of the bed, a face in a pattern, something at the edge of sight. Every culture dressed the same
shape differently: demons and witches before, aliens and the Hat Man now. **The body is biology; the costume is culture.**
That is exactly "nobody is sure if they are demons or aliens": the monsters are the shapes the brain is built to see in the dark.

**The rule that makes it play:** the dark has no shape of its own. In the dark it is smoke you cannot hit. Light forces it to commit
to a shape (the one your brain fills in), and only then can you shoot it, and it shatters into the light it stole (the motes we already have).
So the light network is not decoration: your relays and lamps are what make the enemy real enough to kill. Nothing else plays like that.

The three drafts (the why, not the what):
- **A. One thing, many masks.** The dark is a single mind wearing the shapes from our heads. Every type is a costume it learned works on you
  (fits the daemon: "the dark learns you"). The codex labels it honestly: demon? *(guess)*, alien? *(guess)*, imagination? *(reasoned)*.
- **B. Every shape is its own creature.** Earth's dark is a whole ecology of separate things that evolved to look like what we fear.
- **C. They were us.** The shapes are what Earth's people became when the dark took them; the Moon is who got out.

Recommended: **A**. It is the only one where the enemy, the daemon and the truth labels are the same idea, and it never needs explaining in text.

A first roster from real phenomena (each one a role in combat, not just a look):

| Shape (what people really report) | Role in a fight | Why it is scary and cool to shoot |
| --- | --- | --- |
| The tall watcher (the Hat Man) | stands at the edge of your light and moves only when you are not looking at it | your own eyes are the weapon; it shatters in one clean shot when lit |
| The face in the surface (pareidolia) | ambush: walls, rocks and rubble grow a face and lunge | you learn to distrust patterns, which is how it feels for real |
| The corner of the eye | fast flickers that only exist at the screen edge, solid when centered | rewards turning to face things; a crisp hit sound when it locks |
| The weight on the chest (the Old Hag) | pins you; you break free by looking at a light, or a friend shoots it off | solo works, co-op is faster (his "just as good solo") |
| The thing at the end of the hall | the giant: slow, huge, shapes shift every time the light flickers | a boss you fight by controlling the light, not just by aiming |

Our current core kinds map onto these with no rules change: walker becomes the watcher, runner becomes the corner of the eye,
shard becomes the face, giant stays the giant. The Hag is the one new rule.

**Moon and Earth:** the Moon is the camp (already built: the wall, the fire, the people). Earth is the run: you drop through the dark,
build a light chain to hold ground, pull light (and people, later) back up. Short, dangerous trips from a safe home: the
"one more night" feeling without copying any game's mechanic.

## 2. The execution path: simulate what can be simulated, his eyes only at the end of each layer

Each layer is finished and pushed live before the next starts (the research is blunt: build one mechanic, confirm it, then the next;
asking for the whole game at once is the most common way to break a project). Tags say who judges: **sim** (robots, no human),
**check** (an automatic test with a pass line), **his eyes** (only taste and feel).

| Layer | What gets decided | Who judges | Tool we already have or will use |
| --- | --- | --- | --- |
| 0. Rules | spawn rates, enemy health, damage, light economy, Earth trip length, difficulty per night | **sim** | `next/core` + `next/sim` robots, breeder, certifier (as EA did on The Sims Mobile: agents on a light copy of the core, thousands of runs) |
| 1. Feel numbers | time to kill, hits to kill, how long a telegraph shows before a hit lands, how close they get | **sim** with human limits (reaction about 250 ms, aim error, turn speed) | a player-model bot in `next/sim`; pass lines set from shooter research, not guessed |
| 2. Readability | can you tell every enemy apart at 5, 15 and 40 m, in the dark and in light | **check**: render each one as a black silhouette, measure overlap between types and contrast with the ground | a headless render script; fail if two silhouettes overlap more than the line |
| 3. Assets | the models, the motion, the sounds | **check** for size, frame rate and license; **his eyes** for the one finished enemy | see section 3 |
| 4. Taste | does it feel good, scary, fun | **his eyes**: one 2 minute Earth drop on the live link, then Tab feedback | the ride-along link, version pop-up, Tab feedback |

The rule from his own law: stop digging when the answer would not change the next build. Layers 0 to 2 never ask him anything.

## 3. Assets: free only, AI first where it is honest

His PC has an **AMD Radeon RX 6600 XT (8 GB)** and 32 GB of RAM. The strong open 3D models (TRELLIS.2, Hunyuan3D) are built for NVIDIA cards
(TRELLIS.2 lists 24 GB), so they run **in the free hosted demos**, not on his card.

- **Models, in this order:** (1) CC0 packs we can use as-is (Quaternius monsters and sci-fi kit, Kenney, Poly Pizza);
  (2) **TRELLIS.2** free demo on Hugging Face (MIT license: free to ship) from a concept image; (3) Meshy free plan as a backup
  (CC BY 4.0: free to ship with a credit line, 10 downloads a month). Hunyuan3D is skipped: its license excludes the EU, UK and South Korea.
  Every generated model goes through one headless Blender script: shrink to a game budget, fix the scale, cold palette, export GLB.
- **Motion:** humanoid shapes get free rigs and moves from **Mixamo** or **AccuRIG** (both free; humanoids only).
  The non-human shapes (smoke, faces, flickers) animate **in code**: shaders and procedural movement. That is cheaper, it never looks
  stiff, and it fits creatures that are half smoke. No hand-built characters (taste 12).
- **Sound:** CC0 first (Kenney audio, Freesound filtered to CC0, the free Sonniss GDC bundle, royalty free), plus sounds built in the
  browser the way the fire already is: layered breath, reversed whispers, a crisp glass shatter for a kill. Hosted free AI sound tiers are
  mostly not allowed in a shipped game (ElevenLabs free forbids it), so they are skipped. Stable Audio Open runs on a Community license:
  check its terms before shipping anything made with it.
- **Every file** gets a line in `assets/CREDITS.txt` with its license, kept with the file.

## 4. The order of work (each one a pushed version he can play)

1. **The Moon is home**: the camp is on the Moon, Earth hangs in the sky, consumed by dark. (A small change: the camp already looks lunar.)
2. **The rule**: enemies are smoke in the dark and solid in light; robots retune the nights (layer 0 and 1).
3. **The drop**: a lander ride from the camp to an Earth zone and back, gray boxes only (greybox), robots tune the trip length.
4. **The silhouettes**: five shapes as plain dark forms, the readability check passes (layer 2).
5. **One enemy done all the way** (the tall watcher): model, motion, sound, hit and death. This is the bar; he judges it.
6. **The rest** copy that recipe; the readability and frame rate checks gate each one.

## 5. What the research says, and how sure it is

- Agents on a light copy of the core mechanics find imbalance before players do (EA, AIIDE 2018; Politowski et al. 2023; RaidEnv 2023;
  Dungeons and Replicants, 213 players modeled). *checked*: published research. This is our `core`/`sim` split already.
- Doom's "push forward" combat: the player takes what they need from enemies. Our motes already do this. *checked*: GDC 2018 talk.
- AI does roughly the first 70% (movement, wiring, placeholders) and is weakest at feel, balance and the last integration bugs.
  *guess*: vendor blogs, not measured. It still says where his eyes are worth the most: feel, at the end of each layer.
- Shadow figures look alike across people because of shared brain wiring, and culture picks the costume. *reasoned*: popular
  science summaries (PBS), not peer review.

Sources: arXiv 2304.08699 (Politowski et al.), AIIDE 2018 "Exploring Gameplay With AI Agents" (EA), RaidEnv (IEEE 2023), Dungeons and
Replicants II (Pfau, Liapis, Yannakakis, Malaka), GDC 2018 DOOM combat talk, Noclip "Designing Demons" (DOOM Eternal), PBS "The Hat Man and
the Shadow People", Meshy pricing docs, Hunyuan3D 2.1 and TRELLIS.2 pages, Quaternius packs, Mixamo and AccuRIG pages.
