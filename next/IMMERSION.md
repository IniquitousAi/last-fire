# Immersion: the feeling of really being there, for the least work (plan, 2026-10-19)

**Status (v153): the top three are SHIPPED**: footsteps v149, breath and heartbeat v150, far sounds v151 (their tests pass). Next is section 5, Later. His picks from earlier today are kept word for word at the bottom.

**The answer in one line:** the game already looks the part, but it is nearly silent about your own body. You walk in silence (there are no
footsteps of your own in `next/`), you never breathe, and the world's far sounds are only wind. Sound is the cheapest way to make the
feeling of being there: it costs nothing on the graphics card, and the research below backs it. The top three are all sound plus one
small camera change.

## 1. What the research says (short, with links)

Words used below:
- **Presence**: the feeling of "I am here". Slater splits it in two.
- **Place illusion**: "I am in this place." It comes from the world answering your body the way a real place would (you move, the
  view and the sound change the right way).
- **Plausibility illusion**: "this is really happening." It comes from the world reacting to you, events that are about you, and
  nothing that breaks what you expect.

| Finding | What it means for us | Source |
| --- | --- | --- |
| Presence has two parts: place illusion and plausibility illusion. Plausibility grows when the world reacts to you and events refer to you. | Two kinds of fixes: body cues (place) and a world that answers (plausibility). | [Slater 2009, Phil. Trans. B](https://www.citedrive.com/en/discovery/place-illusion-and-plausibility-can-lead-to-realistic-behaviour-in-immersive-virtual-environments); [Slater et al. 2022 update](https://dx.doi.org/10.3389/frvir.2022.914392) |
| Immersion has three levels: engagement, engrossment, total immersion. Each has barriers, from the player, the system and the setting. Total immersion needs empathy and atmosphere. | Atmosphere is the gate to the top level; sound is most of atmosphere. | [Brown and Cairns 2004](https://www-users.york.ac.uk/~pc530/pubs/Immersion.pdf); [Cairns, levels in a handbook draft](https://www-users.york.ac.uk/~pc530/pubs/Cairns_Handbook_Draft.pdf) |
| Even broken behavior often goes unnoticed once a player is immersed. | Small flaws matter less than missing cues; add the missing cues first. | [Cheng and Cairns](https://www-users.york.ac.uk/~pc530/pubs/Cheng.pdf) |
| Immersion can be measured by questionnaire and by behavior (how slowly you switch to another task, eye movements); anxiety runs high in immersed players. | Our tests can use behavior, not just "does it feel good". Tension is part of immersion, not an enemy of it. | [Jennett et al. 2008](https://www-users.york.ac.uk/~pc530/pubs/JennettIJHCS08.pdf) |
| Spatial sound raised presence with a medium to strong effect over no sound; spatial sounds also raised body arousal (like someone entering your personal space). | Every world sound placed in 3D (we already use HRTF, a model of how your head and ears shape sound). | [IEEE VR 2013](https://computer.org/csdl/proceedings-article/vr/2013/06549396/12OmNqNG3ev); [Hendrix and Barfield 1996](https://experts.umn.edu/en/publications/presence-in-virtual-environments-as-a-function-of-visual-and-audi/); [Kobayashi et al. 2015](https://link.springer.com/10.1007/s42489-019-00003-5) |
| Hearing your own footsteps raised presence; footsteps, a little head bob and foot vibration together raised presence and the feeling of moving. | The single biggest gap we have. | [Nordahl, footsteps and presence (slides)](https://vbn.aau.dk/ws/files/19876810/Rolf_Nordahl_at_Yale_NIW_Presentation_2_Motivation.pdf); [Kruijff et al. 2016, cited in Frontiers 2021](https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2021.654088/pdf); [Frontiers 2020: self-triggered footsteps change presence subscales](https://www.frontiersin.org/journals/robotics-and-ai/articles/10.3389/frobt.2020.00020/epub) |
| Moving shadows raised presence for people who lean on their eyes; better lighting alone did not. | Moving bodies casting shadows from the fire is worth more than prettier light. | [Slater, Usoh, Chrysanthou 1995](https://link.springer.com/doi/10.1007/978-3-7091-9433-1_2); [Khanna et al. 2006](https://dblp1.uni-trier.de/db/conf/vrst/vrst2006.html) |
| Frame rate and jitter (uneven frame times) hurt presence; lag hurts presence in headsets. | Keep the 150 fps, and hunt hitches more than averages. | [Louis et al. 2019](https://hal.archives-ouvertes.fr/hal-02323605); [Halbhuber et al. 2023](https://muc2023.mensch-und-computer.de/wp-content/uploads/2024/04/index0f6c.html) |
| Removing the HUD raised immersion in expert players; information on gear in the world (diegetic: it exists inside the story) is the guideline. | Already our rule; the next step is the body itself telling you its state. | [Iacovides et al.](https://discovery-pp.ucl.ac.uk/1470398/1/chip0179-iacovidesA.pdf); [Fagerholt and Lorentzon 2009, Beyond the HUD (EA DICE)](https://odr.chalmers.se/handle/20.500.12380/111921); [Peacocke et al. 2015](https://www.csit.carleton.ca/~rteather/pdfs/GEM2015_HUDs.pdf) |

What the great games did (values and logic only):
- **Hunt: Showdown** (Crytek): audio pillars are feedback, immersion, emotion. Every sound answers "what is it, where is it, is it
  dangerous". Sounds lose highs with distance, louder ones carry farther, dense walls muffle more, a dedicated echo system bounces
  gunshots off far hills, and rain is placed by casting rays from the sky. [Hunt audio pillars](https://www.huntshowdown.com/news/hunt-audio-readability-realism-and-consistency);
  [80.lv interview](https://80.lv/articles/crytek-on-the-sound-design-of-hunt-showdown); [PlayStation Blog](https://blog.playstation.com/?p=221483); [Thundershower tech](https://www.huntshowdown.com/news/behind-the-storm-technical-design-of-thundershower-in-hunt-showdown)
- **Dead Space remake** (EA Motive): A.L.I.V.E. drives the hero's breathing, heart rate and voice from what is happening, all the time,
  with lines recorded injured, normal and tired. [GFinity](https://www.gfinityesports.com/article/dead-space-remake-isaac-talk); [DSOGaming](https://www.dsogaming.com/?p=162183)
- **Metro**: almost no HUD; the watch and the gas mask carry the information, and keeping the mask alive is a ritual you feel.
  [Wikipedia, Metro Exodus](https://en.wikipedia.org/wiki/Metro_Exodus); [Metro 2033](https://en.wikipedia.org/wiki/Metro_2033_(video_game)); [Game Maker's Toolkit transcript](https://amara.org/subtitles/FRCN2F4ENtoc/en/1/download/Why%20Metro%20Exodus%20is%20so%20Immersive%20%20Game%20Makers%20Toolkit.en.vtt)
- **Half-Life: Alyx** (Valve): players spend their "attention budget" exploring, so Valve put interactivity into everything within reach.
  [TheGamer interview](https://www.thegamer.com/valve-half-life-alyx-vr-exclusive-interview/)
- **Red Dead Redemption 2**: people keep their own day when you are not there, react differently by who they are, and camp talk turns
  into events. [GamingBolt](https://gamingbolt.com/red-dead-redemption-2-rockstar-talks-about-player-choice-dynamic-npc-interactions-indoor-environments-and-more); [Wccftech](https://wccftech.com/rockstar-explains-npc-interaction-rdr2/amp/)
- **S.T.A.L.K.E.R.**: a simple off-screen simulation (A-Life) made the world feel alive because things happened without you; STALKER 2
  had to shrink it for memory and speed. [Game Developer, A-Life](https://www.gamedeveloper.com/design/a-life-an-insight-into-ambitious-ai); [PureXbox](https://www.purexbox.com/news/2024/12/stalker-2-dev-explains-buggy-xbox-and-pc-launch-promises-to-fix-a-life-2-0-system)
- **Escape from Tarkov**: positional audio (footsteps, far gunfire) decides fights; they moved to Steam Audio for it. [GameSpot 12.10 notes](https://www.gamespot.com/articles/escape-from-tarkov-12-10-patch-notes-are-here/1100-6489402/)
- **Dishonored** (Arkane): systems create the drama; Harvey Smith argues hit points crowd out awareness, light, sound and facing.
  [GDC 2013 session](https://gdcvault.com/play/1018062/Empowering-the-Player-in-a); [Game Developer podcast](https://www.gamedeveloper.com/design/why-it-s-still-worth-making-immersive-sims-ft-harvey-smith-ben-horne)
- **Cyberpunk 2077**: its audio talks cover ambience, acoustics and a mixing "director" between you and the city's many sounds (slides
  are members-only). [GDC: Sounds of Night City](https://gdcvault.com/play/1029310/Sounds-of-Night-City-Audio); [GDC: Mixing Music and Mods](https://gdcvault.com/play/1034382/Mixing-Music-and-Mods-Cyberpunk); [A Sound Effect interview](https://www.asoundeffect.com/cyberpunk-2077-sound/)

What works in the browser:
- **Web Audio HRTF** costs roughly 10 times a plain left-right pan (a secondary estimate); desktops handle 64 to 128 sources; the audio
  thread has about 2.9 ms per 128-sample block. [abratabia, audio performance](https://www.abratabia.com/web-game-audio/audio-performance.php); [W3C audio list](https://lists.w3.org/Archives/Public/public-audio/2014JulSep/0034.html)
- **Resonance Audio** (Google, Apache 2.0): room reflections and a constant-cost reverb for the web, if we ever need real rooms.
  [Docs](https://developers.google.cn/resonance-audio/develop/web/getting-started); [open-source post](https://opensource.googleblog.com/2018/03/resonance-audio-open-source.html)
- **Gaussian splats** (scenes made of millions of soft colored dots, captured or generated): World Labs Marble exports to Spark, a
  three.js splat renderer, but export needs a paid plan and splats carry baked light. [Marble export docs](https://docs.worldlabs.ai/marble/export/gaussian-splat); [Spark route](https://docs.worldlabs.ai/marble/export/gaussian-splat/spark.md); [Collider Builder](https://www.worldlabs.ai/labs/showcase/collider-builder)
- **Ground fog in three.js**: a height-based fog patched into the shaders is cheap; FogExp2 (what we use) is distance only.
  [High-performance ground fog](https://discourse.threejs.org/t/high-performance-ground-fog-for-games-three-js/88522); [three.js fog manual](https://threejs.org/manual/en/fog)
- **Post effects**: N8AO (contact shading in corners) and god rays exist as passes; no trusted millisecond numbers were found, so each
  must be measured here. [N8AO](https://github.com/N8python/n8ao); [three-good-godrays](https://cdn.jsdelivr.net/npm/three-good-godrays@0.12.0/README.md); [pmndrs postprocessing](https://github.com/pmndrs/postprocessing)
- **Step rate**: runners land 150 to 180 steps a minute at moderate speeds, faster with speed. [Laura Norris Running](https://lauranorrisrunning.com/what-is-the-ideal-running-cadence-for-performance/); [Equinox](https://www.equinox.com/articles/2019/04/does-cadence-matter)

## 2. What the game already has (read from the code, v144)

| Already there | Where |
| --- | --- |
| Fire roar, crackles and level hum placed in 3D with HRTF; wind that grows in the dark | `client/ambience.js` |
| Other players' guns and the dark's groans placed in 3D; far sounds lose highs (16000 / (1 + d/18) Hz) and get more echo | `src/combat.js` `dest()` |
| One reverb for the whole world: a 2.4 s soft tail, same in the camp, the open Moon and Earth's towers | `src/combat.js` `ctx()` |
| "Sound is sharp only in light": the world muffles when you stand in the dark | `sound.muffle`, `main.js` line 582 |
| A landing thud, only for falls faster than 7 m/s | `main.js` `move()` |
| (fixed v149) **No footsteps of your own.** `sound.step()` exists but nothing in `next/` calls it (the old game called it every 1.9 m walking, 2.5 m sprinting) | `src/combat.js` line 104, `src/main.js` line 362 |
| No camera bob; the gun and arms bob on their own clock, not tied to your feet | `client/hands.js` `update()` (`this.walk`) |
| (fixed v150) No breathing or heartbeat for you; camp people do breathe (14 a minute) and look around | `client/camp.js` |
| Film grade (violet shadows, grain, edge color split, vignette), bloom, distance fog, wet ground that doubles lights, rim light on bodies | `main.js` lines 40 to 175 |
| Lamp shadows on the ground for the camp's fixed pieces; moving bodies cast no shadow | `main.js` `updateShade()` |
| Hit reactions, hit stop, kick, slow time, the scan | `main.js`, `core/game.js` |
| Diegetic info: wrist hologram, holo tags, your glow is your health | `client/wrist.js`, QUEUE Done list |

## 3. Every candidate, scored

Impact is 1 to 10 on the feeling of being there, from the evidence column. Effort is hours of Claude's work including its test.
Frame cost is graphics time per frame at 150 fps (the whole frame is 6.7 ms). Ratio is impact divided by hours.

| # | Candidate | Impact (evidence) | Hours | Frame cost | Ratio |
| --- | --- | --- | --- | --- | --- |
| A | **Your footsteps, tied to a small view bob and a landing dip** | 8 (Nordahl; Kruijff 2016; Tarkov; the biggest gap) | 1.5 | 0 GPU, under 0.05 ms per step | **5.3** |
| B | **Your breath and heartbeat follow your body** | 6 (Dead Space A.L.I.V.E.; Iacovides: state without a HUD) | 2 | 0 GPU, about 0.02 ms per frame | **3.0** |
| C | **Far sounds you cannot place, each from a real cause** | 6 (Hunt's "what, where, dangerous"; Brown and Cairns: atmosphere; his own pick) | 2 | 0 GPU, under 0.05 ms per sound | **3.0** |
| D | Hitch hunt: compile every shader at load, measure the worst frame | 4 if hitches exist, 0 if not (Louis 2019: jitter) | 1 | negative (removes spikes) | 4.0, but unproven |
| E | Camp people react to you: flinch and look at a gunshot, step aside, glance when you pass | 5 (Slater: plausibility; RDR2) | 2 | 0 | 2.5 |
| F | Reverb by place (tight in the walled camp, dry and open outside, a slap echo off Earth's towers at 2d/343 s) | 6 (Hunt echo system; Cyberpunk acoustics talk) | 2.5 | 0 GPU; 2 more reverbs on the audio thread | 2.4 |
| G | Moving bodies cast long shadows away from the fire (one cheap stretched dark quad per body, faded by the light there) | 7 (Slater 1995; Khanna 2006) | 3 | about 0.05 ms (one instanced mesh) | 2.3 |
| H | Field of view to Cyberpunk's 80 horizontal (we play at about 110) | 4 for immersion, more for the Cyberpunk match | 0.5 | 0 | 8, **already CYBERPUNK.md #1**, not repeated |
| I | Ground fog that rolls in at dusk, thicker in hollows | 5 (his pick "fog rolling in") | 3 | about 0.1 ms | 1.7 |
| J | Haze cones under the 6 nearest lamps | 5 (LOOK.md change 4) | 3 | 0.1 to 0.4 ms | 1.7 |
| K | Sounds muffled through the camp wall and towers (Hunt occlusion) | 4 | 2 | 0 GPU | 2.0 |
| L | Earth rain: wet everything, drops placed by rays from the sky | 7 (Hunt Thundershower) | 8 | 0.3 to 0.8 ms | 0.9 |
| M | Camp murmur, one voice per living person (INNOVATION 16C) | 5 | 4 (made-up voices risk sounding fake) | 0 | 1.3 |
| N | Gaussian splat scenes (Spark plus Marble) | 3 here: baked light fights "light is the whole game"; paid export; millions of dots to sort | 10+ | 2 to 6 ms | 0.3 |
| O | More ready-made props, each with a reason to be there | 5 | 4 | small | 1.3 |

## 4. The top three

### 1. Your footsteps (ratio 5.3)

**What you feel:** you hear yourself. Each footfall is a soft crunch on Moon dust, a hard tap on the camp's plates, grit on Earth's
concrete; sprinting adds the rattle of your gear; a heavy load makes steps thump lower. The view dips a hair on every step and drops
when you land from a height, so your body has weight.

**What to build:**
- `src/combat.js`: a new `sound.foot({ run, crouch, surf, side, load })`, three layers on the existing buffers: a heel (`buf.step`,
  lowpass 500 to 800 Hz), a scuff (a 40 ms noise, highpass 3000 Hz for dust, bandpass 1800 Hz for plate, 2500 Hz for concrete), and
  when running a gear tick (`buf.rattle`, gain 0.05). Rate random by plus or minus 8%; a filter frequency never repeats twice in a row
  (keep the last one). Left and right feet pan to -0.12 and +0.12 (a `StereoPanner`). Load: rate times (1 - 0.15 x load), gain times
  (1 + 0.4 x load), with load = carried light / the most you can carry. It goes through `out`, so the dark still muffles it.
- New `client/steps.js`, pure (no sound, no drawing) so it can be tested: `step(state, dx, dz, mode)` adds distance and returns how
  many footfalls happened plus the phase (0 to 1 through the current step). Step length: walk **1.75 m** (4.6 m/s gives 158 steps a
  minute), sprint **2.45 m** (7.4 m/s gives 181), crouch **1.1 m**. No steps in the air, in a seat, flying the ship, or while sliding
  (the slide gets one long scrape instead).
- `client/main.js` `move()`: call `step()` after the position update; for each footfall call `sound.foot`. Surface: Earth is
  concrete; in the camp, within 2 m of a solid piece is plate; elsewhere dust.
- View: eye height minus `A x |sin(phase x pi)|`, A = **0.012 m** walking, **0.022 m** sprinting, **0** while aiming past half way
  (matches his rule that the gun holds still in the sights). No sideways roll (roll is what makes people sick). Landing: lower the
  thud's threshold from 7 to 4 m/s and add a dip of `min(0.12, 0.012 x fall speed)` m that springs back in 0.25 s.
- `client/hands.js` `update()`: take `s.phase` and set `this.walk = phase x pi` when moving, so the gun's bob lands on the same
  footfall as the sound.

**Test with a known answer** (a Node script in `sim/`, no browser):
- Walk 100 m straight: exactly **57** footfalls (100 / 1.75). Sprint 100 m: exactly **40** (100 / 2.45). Stand still 60 s, sit in the
  truck 60 s, fly 60 s: **0**.
- 1000 footfalls in a row: **0** back-to-back repeats of the filter frequency.
- A 1.5 m drop (7.75 m/s at our gravity of 20): the dip is **0.093 m** and is back under 1 mm by 0.4 s. A 3 m drop (10.95 m/s)
  hits the cap: **0.12 m**.
- In the browser (DEMO mode): count `sound.foot` calls over a scripted 10 s walk: 26 plus or minus 1 (4.6 x 10 / 1.75).

**Frame budget:** zero graphics cost. Under 0.05 ms of main-thread time per footfall (6 small audio nodes), about 3 per second.
The fps counter at the board at night must stay at 145 or more (within 3% of today's 150).

### 2. Your breath and heartbeat (ratio 3.0)

**What you feel:** after a long sprint you hear yourself breathing hard inside the helmet, and it settles as you rest. When you are
badly hurt, or the dark is close, a slow heavy heartbeat comes up under everything and speeds up. In the dark the world goes muffled
but your own breath does not, so you feel alone in your suit. At rest you hear nothing: it is never a constant noise.

**What to build:**
- New `client/body.js`, with a pure `bodyState(prev, input, dt)` and a `Body` class that plays it:
  - exertion e (0 to 1): +0.12 a second while sprinting, +0.15 per dodge or boost jump, -0.08 a second otherwise.
  - fear f (0 to 1): 1 when a shape of the dark is within 6 m, 0 past 14 m, straight line between; times 1.3 out of the light, capped at 1.
  - hurt h = 1 - health / 100.
  - Breath: rate **14 a minute** at rest (the same as the camp people in `camp.js`) up to **40** at e = 1. Each breath is filtered
    noise: inhale 0.45 x period, bandpass sweeping 700 to 1100 Hz; exhale, 600 Hz. Gain **0** while e is under 0.25, up to 0.12.
  - Heartbeat: silent unless h over 0.5 or f over 0.6. Beats a minute = 70 + 70 x max(h, f). Each beat is a "lub" (sine 55 to 40 Hz,
    90 ms) and a "dub" 160 ms later at 70% of the gain. Gain up to 0.25, through the existing compressor.
  - Over 0.75 hurt, the world's vignette in the grade pass deepens by 0.04 on each beat (a new `uBeat` uniform in `main.js`'s grade
    shader). World only: the HUD is never touched.
- Your body goes to the Ambience's `master`, not through the dark muffle (it is inside your helmet). `main.js` builds `new Body(ambience.ac, ambience.master)` after the first click and calls `body.update(dt, { sprint, dodged, hp, nearDark, lightHere })` each frame.
- Audio values change only when they move more than 2% (no new work per frame otherwise).

**Test with a known answer** (Node, on `bodyState` alone):
- Sprint 10 s, then rest 20 s: breathing goes from 14 to at least **32** a minute by the end of the sprint, and back under **18** by
  the end of the rest.
- Health 100 and no dark within 14 m: heartbeat gain exactly **0** and breath gain exactly **0** at rest.
- Health 20: **126** beats a minute (70 + 70 x 0.8), plus or minus 1.
- Every change of state moves the breath within 1 s (INNOVATION 16B's robot test).

**Frame budget:** zero graphics cost; about 0.02 ms a frame for the state math; 2 to 4 audio nodes per breath or beat, at most about
5 a second at a full sprint.

### 3. Far sounds you cannot place, each one true (ratio 3.0)

**What you feel:** out past the light, every so often, something far off: a long metal groan, a dull impact, a scrape, something
heavy shifting in the dust. You turn your head and it is behind you, somewhere. At night they come more often. Later you learn they
were real: there was a shape of the dark there, or a wreck shifting. Nothing is played for nothing.

**What to build:**
- `client/ambience.js`: a scheduler. Waiting time between sounds is random with a mean of **11 s** by day and **7 s** at night (dusk
  in between), never under 3 s.
- Each sound needs a cause that exists right now: half the time the position of a real shape of the dark between 35 and 110 m away
  (the ones you cannot see), else a real place: an Earth wreck (`g.parts` or the wreck list), a tower edge, the camp's gate from
  outside. If there is no cause, no sound. Never closer than 35 m.
- Six made-in-the-browser voices, no files: metal creak (two slightly detuned sawtooth tones through a narrow bandpass, pitch gliding
  down over 2 s), far impact (`buf.step` at 0.3 speed, heavy reverb), scrape (noise with a bandpass sweeping 400 to 1600 Hz), deep
  groan (the existing `sound.groan(pos, true)`), dust slide (2 s of noise, slow attack), a dry crack (the crackle buffer at 0.25 speed).
  A voice does not play again until 4 others have (the "no repeat while fresh ones remain" rule from his picks below).
- Each one is placed with an HRTF panner like `dest()`, with the same distance rule (highs fade with distance, more echo far away),
  and through the dark muffle, so in the dark you hear them smeared and wrong.

**Test with a known answer** (Node, scheduler alone, fixed seed, 600 game seconds each):
- Day: 55 plus or minus 10 sounds (600 / 11). Night: 86 plus or minus 12 (600 / 7).
- **0** sounds without a cause that exists at that moment; **0** closer than 35 m.
- **0** back-to-back repeats of a voice; no voice repeats within any run of 5.
- With no dark and no wrecks in range: **0** sounds.

**Frame budget:** zero graphics cost; under 0.05 ms per sound (about 6 audio nodes), about 6 to 9 a minute.

## 5. Later (in order)

1. **Hitch hunt** (D): log the worst frame over a 5-minute scripted night; if any frame passes 20 ms, call `renderer.compile()` on
   everything at load (the first flare, the truck, the ship). 15 minutes to measure before anything is built.
2. **Camp people react to you** (E): a gunshot within 15 m makes them flinch and look for 1.5 s; within 2 m they step aside.
3. **Reverb by place** (F): three reverb tails crossfaded by where you stand (camp 0.7 s, open 1.2 s faint, Earth towers with a slap
   echo at 2 x distance / 343 s). Route the fire and wind through it too.
4. **Shadows of moving bodies from the fire** (G): one stretched dark quad per body, length by the fire's height, faded by the light
   at that spot. Your own shadow too.
5. **Field of view** (H): checked and kept at 78 (84 across in his window, near Cyberpunk's 80).
6. **Ground fog at dusk** (I), then **lamp haze** (J), then **wall occlusion** (K).
7. **Earth rain** (L), the big one, after the cheap ones are proven.
8. **No for now:** Gaussian splats (N). Baked light in the splats would fight the game's one rule (light), export needs a paid plan,
   and the sort cost would eat the frame budget. Revisit only for a far backdrop.

---

## His picks (2026-10-19, unchanged)

Research: Brown and Cairns 2004 (engagement, engrossment, total immersion, each with barriers); Jennett et al. 2008, the Immersion Experience Questionnaire (cognitive involvement, emotional involvement, real-world dissociation, challenge, control; short form 2025); reward prediction error (Schultz: dopamine answers a reward that beats expectation, not a predicted one; intermittent reward builds persistence). The honest version here: fair surprises, never a slot machine.

He picked every barrier and every detail (all four of each). Each becomes a rule with a check: robots and scripts check what can be measured; his feedback (Tab) checks the rest.

| His pick | The rule | The check |
| --- | --- | --- |
| Breaker: fake-feeling people | Camp people speak from what really happened (the event log), never a canned loop; a line is not heard again while unheard ones remain (Rem's rule). | A script replays 10 hours of logs: 0 repeated lines while fresh ones remain; every line names a real event. |
| Breaker: rules that do not add up | Every rule follows the world's logic, and the robots try to break it. | Rule tests in sim/ (like the camp's 9 checks); any rule a robot can exploit or contradict fails. |
| Breaker: UI in the way | The information lives in the world: the odds board, the wrist screen, the fire's size, the light on the ground. The HUD only shows what your body would know. | Screenshot audit: HUD covers under 6% of the screen in play; at most 1 pop-up per 10 minutes. |
| Breaker: repetition you notice | Every sound has variants, every place a reason to differ; something new to decide at least every 4 beats (Era 1's novelty rule). | Sound audit: no clip twice in a row; the robots' novelty check per night. |
| Detail: the world reacts | Marks stay (built), people mention what you did yesterday, the board's footnotes cite real events. | Each night's log produces at least 3 visible consequences the next day. |
| Detail: sound | The camp's murmur, wind in the dark, distant sounds you cannot place; every hit crunchy. | Layers exist and vary by place and time; his ears decide. |
| Detail: light and weather | Light is the whole game: fog rolling in, rain on the fire, the dark's edge moving. | His eyes decide; the robots check weather never makes a death unavoidable. |
| Detail: things that make sense up close | Every object has a reason to be where it is, and a story if you look (paperwork humor lives here). | Every placed object carries a reason field; none placed at random. |
