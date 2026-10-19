# Last Fire: the queue


## North star (his words, 2026-10-19): Cyberpunk 2077 as close to one-to-one as possible, plus friends and survival

Never stop working on the game; use REA and GitHub to learn from the best. Cyberpunk's yellow becomes hot pink and violet (his palette). In order:
1. Kiroshi scan: middle mouse pings the dark; shapes within 30 m show as violet outlines for 2 s, 8 s cooldown (they stay smoke: you see, you do not hit).
2. Tech weapon: the railgun sniper (Blender helper is building it) charges 0.4 s, pierces cover and bodies, quick scope.
3. Smart pistol: rounds curve onto a scanned shape.
4. Eye HUD: the wrist hologram plus a Kiroshi frame (thin corner brackets, live readouts); learn from Venge.io's REA capture.
5. Neon on wet ground: more puddles and the camp's signs reflected (the wet shader exists).
6. Double jump and air dash (have: boost jump and dodge); sandevistan-style slow time only in solo.
7. Small: the camp board's Earth hologram has a cyan rim (banned color); it is not drawn by firecore.js, likely a model's texture: find it and recolor violet.
8. DONE v141: item 1, the Kiroshi scan.

## TOP FIVE (Daniel, 2026-10-19 about 05:50: "make sure our top five priority tasks are complete or in progress... finish first or start ASAP")
1. **The truck**: SHIPPED v130, a smooth code-modeled body that grows part by part. Open: wrecks are heavy (14.6k triangles each), the roof lamp housing not seen by eye yet.
2. **The spaceship**: body shipped v128, flight works; open: fly the drop to Earth, check the cockpit view from inside.
3. **The HUD, crosshair included**: crosshair and aim-link ring fixed v129; open: the rest of the HUD pass (gauntlet findings).
4. **The character model**: SHIPPED v131 (crew.js). Open: shots from friends do not trigger their recoil yet (the bang message has no player id); hits show only from health drops.
5. **The hands and reload**: first-person arms and a real reload (helper, hands.js + mockups/hands.html), to be wired into main.js.
- **Next helpers, one at a time (his PC):** the full-game gauntlet with screenshots (stopped 05:55 to lighten the load; restart first), then the realism audit (REALISM.md: why it does not feel real, lighting, shadows, ground detail).

His rule (2026-10-19, before 02:55): anything he says to change or add goes here, in no particular order; he rambles, the queue remembers.
Claude picks the order by the bottleneck: what he will see first and most.

**Temp rule (his words, 2026-10-19 about 03:13): "never ask, just build nonstop with logic and truth as ur fuel".** No questions until he lifts it; picks are made by evidence and logged. Done items move to the bottom with their version.

**His rule (2026-10-19, after 03:18): every finished task adds one new task to this queue, made up on the spot from research; INNOVATION.md (the research worker's ideas) comes first.**

## Waiting

1. **UI you can't tell is UI.** No plain text floating on the screen; every word has a reason to be there in the world. A super thin wrist screen, a holographic watch that pops up a hologram, the visor's own readouts. Start with the moments he sees most: spawning in (the "Your old desk..." line is plain text), messages, prompts. (2026-10-19)
2. **The home screen needs a lot of work.** Complicated sci-fi visor vibes, not a plain panel. (2026-10-19)
3. **Warmth:** parked by him ("I'll think on it later"). His praise for the truck cab warming you; he wants mechanics that replace stereotypical ones. Do not build until he decides. (2026-10-19)
4. **Two play styles, balanced by teamwork:** all-out violence (hordes, modern military gear, Serious Sam feel) and building anything (logical assembly). The truck exists (v26 to v29); more to build, more horde violence. (2026-10-19)
5. **More enemy masks** from the plan: the face in the surface, the corner of the eye, the weight on the chest, the thing at the end of the hall. (PLAN-SPACE.md)
6. **Gritty, gruesome, dark, hardcore** cyberpunk sci-fi space survival; never kiddie. A filter on everything. (2026-10-19)

7. **Simulated real people.** Use everything learned about him (the chat logs, the Twin's data, Rim, Jev) to simulate real people: after Dalton or he plays a lot, play with someone who plays exactly like Dalton and says some of the same things; or work out from how someone plays how they probably talk. Always ask how the simulators can be used in fun ways. (2026-10-19; it builds on the learned friend in ANSWERS.md and the habits recorder in core/habits.js)






19. **Real mask models, not cute imps** (PLAN-SPACE.md section 3): the free Quaternius wraith and clawed bodies still have cartoon proportions. Make each mask from a concept image through the free TRELLIS.2 demo (MIT), then the Blender cleanup script. Downloading generated models needs his yes first (the safety rule outranks the temp rule). (added when item 18 finished)





24. **BIG: min-max the fire** (his ask, 2026-10-19): the fire is the core you build around, moving, loud, full of light; never normal fire colors; as creative and innovative as it can get; research first; the base can change too. Tools found for it: world bloom (three.js official examples), full-size screenshots (Playwright, installed), performance traces (chrome-devtools, installed), Blender 5.2 headless (installed at D:/Daniel/BlenderForSI).
25. **Scary masks, never cute** (his note: one mob looks like a smiling dog): v65 removed the dog model; real masks still wait on item 19.









34. **Robot crews for the truck** (INNOVATION.md robot test for seats): crews of 1 to 4 run the same Earth route with the truck; pass line: solo is slower but finishes about as often. (added when item 33 finished)




















54. **Fire min-max, pass 2** (item 24 stays open: his big ask): the fire's level growth as a visible event (a ring of light rolling out across the yard when it grows), and its sound layered with a low hum that rises with level. (added when item 53 finished)
55. **The loss goes on the board** (INNOVATION.md 13B, reasoned, from ANSWERS.md): when a trip loses a person or the truck, that site's odds on the board drop by exactly what was lost, and the footnote names it. Robot test: the odds change equals the simulated value of the loss. (added when item 54 finished)
56. **The ship** (his ask): the lander made drivable, smooth, bold and hyper-futuristic, with raycast hover physics (springs, dampers, inertia, banking). Robot test first: overshoot, settle time, landing on the pad. Model needs his download yes. See SHIP.md.
57. **The cockpit HUD** (his ask): an almost seamless helmet HUD like Iron Man's, laid out by AR and VR research and Vigil's lessons. Three rough looks in mockups/cockpit.html; he picks, then it gets built.
58. **Start as a kid, only with a real family** (his idea): two players who make a family can have a child; when a parent falls for good you can go on as the child, inheriting standing and one practiced habit. See SHIP.md.
59. **Genre doses decided by simulators** (his rule): every genre (cozy, hardcore, romance, comedy, cinematic) gets a robot-readable measure and is added only if the core loop's numbers hold.
60. **The Director** (GAMEDEV-TRICKS.md 11, 12): a stress score per player (damage, alone, time since the last fight); build up, peak, then a forced relax; it hunts whoever is safest. Robots: tension stays in the flow band.
61. **Aim that feels great** (7, 8, 9): a small bullet pull near the crosshair, the dark's reach a little shorter than its claws look, the last round in the mag cracks harder.
62. **Coyote time and input buffering** (22): jump 0.15 s after a ledge; F pressed a moment early still counts.
63. **Bad luck paid back** (10, 19): a dry Earth run is followed by a better one; the first wreck is on the side you walk toward.
64. **(SHIPPED v123: the eyes)** **The masks show intent** (13): the face turns before it lunges, the watcher's eyes brighten when it decides. Never words.
65. **(SHIPPED v125)** **Behind you it moves, in front it strikes** (5): you hear it behind you; it attacks once in view or very close.
66. **(SHIPPED v123: about 102 to 73)** **Draw calls under 100** (17, 18): measure renderer.info, instance the camp's repeated props, real lights only near you.
67. **Bold and confident UI** (his ask: the Reactor is the bar, DESIGN.md's lessons): three rough versions of the HUD and home screen with heavy numbers and status chips; saturated color only on the numbers and words that matter, keys and panels dark matte and heavy (his v115 correction); he picks one.
68. **(SHIPPED v124: 146 of 146 warned 2 s+, 93% on the weakest light)** **The breach shows before it pours** (INNOVATION.md 5A's unbuilt pass line): when the flood picks the dimmest gap, the dark there visibly bulges and the motion pings point to it at least 2 s before the rush. Robot test: warning lead time 2 s or more on 95% of breaches, and breaches still land on the weakest light. (added when items 64 and 66 finished)

## Done
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
