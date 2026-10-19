# Last Fire: the queue

Anything he says to change or add goes here, in no order; he rambles, the queue remembers (his rule, 2026-10-19). Claude picks the order by
the bottleneck: what he will see first and most. Every finished task adds one new task from research, INNOVATION.md first (his rule, after
03:18). Temp rule (his words, about 03:13): "never ask, just build nonstop with logic and truth as ur fuel"; a download still needs his yes.
Item numbers are kept forever (other files cite them); done items move to the Done list with their version.

## JOB ONE (his words, 2026-10-19 about 09:00): an AI plays the whole game, tutorial to end game
"If you can progress through the game as an AI, then we're building a decent game. So I just need you to progress to the end game.
But keep in mind, I really want visuals to be AAA... AAA visuals, but DevOps performance." Also: "not enough immersion... not enough
guidance of the lore and tutorial".
- **The robot exists:** `sim/autoplay.cjs` plays the real client with a fake controller only, seeing what a player sees (`?autoplay`'s
  `window.__eyes`). Each run writes `playtests/autoplay/<time>/run.json` and screenshots. Target stages: the 8 guide steps, the first night,
  the drop to Earth, the truck, back to the Moon, the end game.
- **Found and fixed so far (v153):** the use button now checks the board (only B did); the day waits through the first three guide steps
  (night fell on a slow new player at step 2); the robot's own runs cap at 40 fps (the card hit 97%).
- **Found, still open:** the menu has no controller focus (SOLO needs a mouse); after the guide nothing says where the drop to Earth is.
- **Looks:** his pick is look 3, the cinematic night (default from v153; `?look=0` is the old look). Performance floor: 120+ fps at 1000x900.

## HIS PLAYTEST OF v154 (2026-10-19 about 09:40, his words in taste rules 102 to 104): fix in this order, each with proof on the checklist
"There's no way you actually played this game and was like, yep, that looks nice." Claude is the main dev: he only plays and judges by eye.
1. **Enemies:** see-through sparkly wireframe, flashing, ugly, can't tell what they are. Make them solid, readable shapes in every light (the
   rule "smoke in the dark" must read as a dark solid silhouette, not glitter). DONE v155: they no longer stand inside you or each other;
   still open: clipping through walls and props (camp solids and Earth towers are not in core/ yet).
2. **A big bright light on the floor at spawn** (the desk lamp pool or the guide ring): find it from the spawn spot and tame it.
3. **UI boxes:** no bordered cards or boxes on the build bar, prompts, wrist; seamless and readable like Cyberpunk 2077 (rule 103).
4. **The Cyberpunk loop:** get a Cyberpunk 2077 dialogue-scene screenshot (web reference), put ours beside it at the same moment, list every
   difference, fix the biggest, repeat; a critic pass that never grades its own work (OPUS-GAMEDEV.md, the Gauntlet Loop).
5. **Smooth animations, aiming, movement wired:** DONE v155: the Blender rifle rig is the default gun. Open: the pistol, shotgun and LMG are
   still the blocky kit models (build them in Blender like the rifle, rule 100).
6. **Dev loadout = every item:** guns 1 to 5 are all held; open: relay, lamp and flare need light, so dev mode needs free building.
7. **The checklist** (his rule): every idea has a task and five proven marks (BUILT, TESTED, SEEN, PAD, PLAYED); `node sim/checklist_verify.mjs`
   erases unproven marks. v156 start: 0 of 69 done, 81 of 345 marks. Knock out the most marks per minute: a SEEN screenshot sweep, a PAD test
   per interactive item, and a full robot run for PLAYED.

## The eras and unlocks (his words, 2026-10-19; dev mode today has everything unlocked, "messy af lol")
- Start on the **Moon: era 3**. Pistol and shotgun only, no vehicle.
- Then **Earth: era 4**, a taste of the real game.
- Back to the **Moon for the tutorial** (planning, building, defending), or skip and stay on Earth and get oriented there.
- Once the tutorial is smooth, **the real game is on Earth, at the real base camp** (reasoned).
- So the rifle, the rail and the rest are late-game unlocks.

## North star (his words, 2026-10-19): Cyberpunk 2077 as close to one-to-one as possible, plus friends and survival
Never stop working on the game; use REA and GitHub to learn from the best. Cyberpunk's yellow becomes hot pink and violet. Numbers in
CYBERPUNK.md, art direction in LOOK.md. Open:
- **Eye HUD:** the wrist hologram plus a Kiroshi frame (thin corner brackets, live readouts). (REA's Venge.io capture hung 16 min once: retry only with a 3-minute limit.)
- **Neon on wet ground:** more puddles and the camp's signs reflected (the wet shader exists).

## Open
- **The truck:** wrecks are heavy (14.6k triangles each); the roof lamp housing not seen by eye yet.
- **The ship:** fly the drop to Earth yourself; check the cockpit view from inside; a real model (TRELLIS.2 free quota ran out; download needs his yes).
- **The HUD pass**, crosshair done (v129, v133); the rest from the robot's findings.
1. **UI you can't tell is UI.** No plain text floating on the screen; every word has a reason in the world (wrist screen, holographic watch, visor readouts). Wrist messages, heard speech, holo tags and the aim link are done (v35 to v39); still plain: the spawn-in line. (2026-10-19)
2. **The home screen needs a lot of work.** Complicated sci-fi visor vibes, not a plain panel. (v120's Reactor copy was undone in v121: it felt like an office slide.)
3. **Warmth:** parked by him ("I'll think on it later"). He praised the truck cab warming you; he wants mechanics that replace stereotypical ones. Do not build until he decides.
4. **Two play styles, balanced by teamwork:** all-out violence (hordes, modern military gear, Serious Sam feel) and building anything (logical assembly, BUILDING.md).
5. **More enemy masks** from PLAN-SPACE.md: the face in the surface, the corner of the eye, the weight on the chest, the thing at the end of the hall.
6. **Gritty, gruesome, dark, hardcore** cyberpunk sci-fi space survival; never kiddie. A filter on everything.
7. **Simulated real people.** Use everything learned about him (chat logs, the Twin, Rim, Jev) to simulate real people: play with someone who plays exactly like Dalton and says some of the same things. Builds on the learned friend (ANSWERS.md) and `core/habits.js`.
19. **Real mask models, not cute imps** (PLAN-SPACE.md section 3): each mask from a concept image through the free TRELLIS.2 demo (MIT), then the Blender cleanup script. Download needs his yes.
24. **BIG: min-max the fire**: the core you build around, moving, loud, full of light; never normal fire colors; as inventive as it can get. First passes: plasma core (v70), the growth ring and hum (v106).
25. **Scary masks, never cute** (the smiling-dog model went in v65); real masks wait on item 19.
34. **Robot crews for the truck**: crews of 1 to 4 run the same Earth route; pass line: solo is slower but finishes about as often.
58. **Start as a kid, only with a real family**: when a parent falls for good you can go on as their child, inheriting standing and one practiced habit (SHIP.md).
59. **Genre doses decided by simulators**: every genre (cozy, hardcore, romance, comedy, cinematic) gets a robot-readable measure and is added only if the core loop's numbers hold (SHIP.md).
61. **The last round cracks harder** (GAMEDEV-TRICKS 9, with 23's five-layer gun sound). (The bullet pull and the shorter reach shipped in v112.)
63. **The first wreck is on the side you walk toward** (GAMEDEV-TRICKS 19). (Bad luck paid back shipped in v118.)
67. **Bold and confident UI** (the Reactor's weight and color, never its glow or layout): three rough versions of the HUD with heavy numbers; he picks one.

## Done
- 2026-10-19, v141 to v152: the Kiroshi scan (v141), the air line blue-violet (v142), slow time (v143), hit reactions and headshots (v144), the rail sniper (v146), the smart pistol (v147), controller with aim assist (v148), footsteps, breath and far sounds (v149 to v151), the ship's altitude hold (v152). FOV checked and kept at 78 (84 across in his window, near Cyberpunk's 80).
- Items 54 to 57, 60, 62, 64 to 66, 68: the fire's growth ring (v106), the loss on the board (v107), the ship flies with the HELMET HUD (v109, v152), the Director (v113), coyote time and jump buffer (v116), the masks show intent (v123), behind you it moves (v125), draw calls 102 to 73 (v123), the breach shows first (v124: 146 of 146 warned).
- The top five of 05:50: the truck body (v130), the ship body (v128), crosshair and aim ring (v129), the crew suit (v131), arms and reload (v132), friends' recoil (v132).
- Item 1 so far: messages from a wrist hologram (v35), people's speech as HEARD on the wrist (v36), prompts as holo tags on their object (v38), click-to-play as the visor's aim link standby (v39). Item 2: three rough home screens to pick from (v41). Tracers are light (v36, INNOVATION.md idea 1). VISOR hugs the edges, mirrored (v24). The drop to Earth (v25). Truck parts and weight (v26). Solid towers (v27). The truck drives (v29). The watcher (v30).
- v42 to v51: BOOT locked (v42), every menu is visor glass (v43), the staged first enemy (v44), the face in the wall (v45), the learned friend joins from DEV (v46) and talks in a manner worked out from how it plays (v47), shotgun and LMG (v48), the camp store resupplies ammo (v50), sound is sharp only in light (v51).
- Item 8, practice makes reloads faster (v52).
- Item 14, the horde floods through the thinnest light (v53). His cyan note: cyan removed everywhere, Tron neon instead (v54).
- Item 9, stake your own odds with a Brier score on the board (v55).
- His sky note: the world gets the sky's logic, rim light and ground glints (v57).
- Item 18, masks get the sky's treatment, and the enemies' wrong size fixed (v60).
- Item 17, people go out and some do not come back (v61). Gear-giving to raise their odds is still open.
- Item 10, tower shadows on Earth keep the dark smoke (v62).
- Item 20, your bunk shows your dues (v63).
- Item 22, fall traces and the cause on the wrist (v64).
- v65: the smiling-dog model removed. v70: item 24 first pass, the Last Fire as a plasma core with bloom (kept open for more passes).
- Item 23, the world keeps your friends' builds and falls (v71); bump.py guards against code after a // comment.
- Item 26, the roof lamp for the front seat (v72).
- Item 27, the dark wears what you looked at (v73; its patch note says only 'Small changes', on purpose: it never says so).
- Item 28, one light is your health (v74).
- Item 21, the wall of theories with live odds (v75 to v77).
- Item 30, the shielded box, TESTED AND NOT SHIPPED: 20 trips per style, a 30 kg box that hid your glow cut a perfect player's returns 95% to 65%; a 15 kg box that only hid you from the hunt: careful and perfect unchanged, greedy 55% to 45%. Solo you are the only target, so hiding buys nothing.
- Item 31, flares that pull and burn the hunt (v78), plus the ground-light slot fix.
- Item 32, the back seats' mounted gun with heat (v79).
- Item 33, climb between seats while the truck coasts (v80).
- Item 29, pick the site by its odds (v81 to v83); tags clamped clear of the corners.
- Item 35, robots pick up parts; the depot fixed to keep parts close; a wipe on Earth is now recorded (v84).
- Item 36, the whole truck takes a median 8 depot trips (v85).
- Item 37, sims report only when run directly.
- Item 38, tested and left as is: 45 Earth settings, 20 trips each; greedy solo tension stays 0.76 to 0.78 in every setting that keeps careful and perfect players in the band. It comes from roaming 60 m out, not from Earth's pressure.
- Item 39, the visor's motion sense on the compass (v87).
- Item 40, hit stop and the crack of light (v88); pointer lock refusals caught (v89).
- Item 41, the learned friend is faithful by a record-to-record round trip (v90, v91).
- Item 42, the carried-load habit, used once measured (v92).
- Item 43, YOUR WORDS for your learned copy (v93).
- Item 44, lines that fit the moment (v94).
- Item 45, wrecks to strip, and checked versus reasoned fit order (v96).
- Item 46, wrecks retimed with robots that strip them (v97).
- Item 47, the camp economy live: dues, standing, lamps refused and flares priced when behind, board lines (v99).
- Item 48, solo hours feed the camp pool, dues first (v100, v101).
- Item 49, the economy made fair in real nights by robot crews (v102).
- Item 50, honor lamps for credit (v103).
- Item 51, the Simulator page, opened from DEV (v104).
- Item 52, Earth's late pressure eased, perfect tension 0.68 (v105).
- Item 53, THE CAMP'S BOOKS on the Simulator page.
- Item 54, the fire grows visibly: a ring of light rolls to its new edge, and a low hum rises with each level (v106).
- Item 55, the loss goes on the board: site odds drop by exactly what trips lost, with a pink footnote (v107).
- Items 56 and 57, first pass: the ship flies (hover physics: drop test 4% bob, settled 3.15 s; robot pilot lands 300 m away in 8.1 s, 2.2 m off) with the HELMET HUD he picked (v109). Still open: the generated model (TRELLIS.2 retrying every 30 min: the free quota ran out), shared in co-op, flying the drop to Earth.
- GAMEDEV-TRICKS.md: 26 tricks researched (14 searches, 2 articles); v111 shipped two (careful falls 0.13 to 0), 60 to 66 queued.
- 2026-10-19: REA's Venge.io capture hung 16 min and saved nothing (empty file); stopped. Retry only with a 3-minute limit.
