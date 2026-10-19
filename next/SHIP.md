# The ship, the cockpit, and the family (his asks, 2026-10-19)

His words, short: a smooth, bold, hyper-futuristic ship with physics that look real when you drive it; a cockpit that is an almost seamless HUD like Iron Man's helmet; learn from Vigil's hundreds of dashboard layouts and from VR and AR glasses research; maybe start as a kid, but only if you start a real family (Sims vibes); every genre (hardcore FPS, RPG, survival, cozy campfire, builder, co-op, cinematic, romance, comedy) but simulators decide how much of each, "so we don't make our game terrible".

## Where the ship fits (logic, not a new map)

The lander already flies you from the Moon camp to Earth. **The ship is the lander made drivable**: you fly the drop yourself instead of a cut. It keeps every rule we have: it is a light source (its lamps make the dark solid), it carries weight (parts slow it like the truck), and its cockpit is warm like the truck's cab.

## The cockpit HUD: what the research says

| Finding | Source | What we do |
| --- | --- | --- |
| Eyes rotate about 15 degrees each way in comfort; key content goes in the 30 by 30 degree center, frequent content away from corners | Magic Leap 2 guideline (AHFE 2022); monocular HMD review (arXiv 2505.09047) | Speed, height, reticle inside 15 degrees; glance things at the edges |
| Text-heavy content works best inside about 15 degrees wide, glanceable content up to 30 degrees out | arXiv 2505.09047 | Long words never at the center; one-word readings near it |
| Central placement can cause "cognitive capture" (staring at the HUD, not the world) | same review | The center is the world; the HUD frames it |
| Iron Man's HUD: every element in focus and readable in 3D, each one serving a function, with modes (Flight, Battle, Diagnostic) and a radar that unfolds to 3D | Jayse Hansen interviews (Pushing Pixels, ProVideo Coalition, hudsandguis) | Three modes, each showing only its own readings |
| Real fighter HUDs: a flight path marker (where you really go), speed and height tapes, a pitch ladder | standard HUD symbology | Used in the CANOPY look |
| Metroid Prime's visor: its edges visible, steam and water on it, your own reflection in bright flashes | Metroid Prime analyses | The visor's black edge and a thin rim of light; no milky sheen (taste 3) |

What Vigil taught (vigil/TASTE_LOG.md): the thing a screen is named after is the biggest (flying means speed is biggest), a few huge numbers in calm space, one color means one thing everywhere, details one step away (modes), "flip, do not compare".

**Three rough looks are in `mockups/cockpit.html`**: A HELMET (curved visor, readings on its curve that settle a beat after you turn), B CANOPY (fighter glass, tapes and ladder), C GHOST (almost nothing until you look at an edge). He picks; then it gets built.

## The physics (what feels real)

Researched: raycast hover suspension (Phaser hovercar tutorial, GDSim devlog, GameDev.net raycast car). Each of four corners casts a ray down; a spring pushes up by how compressed it is, a damper resists how fast it compresses (no endless bounce). Real feel comes from: mass and inertia (it drifts, it does not stop dead), banking into turns, a nose that pitches when you thrust, and the camera and HUD lagging a hair. Robot test first: a sim flies the course and measures overshoot, settle time and whether a player can land on the pad in under a set time.

The model: never hand-built from primitives (taste 12). Candidates: Quaternius's CC0 LowPoly Spaceships pack (10 ships, glTF), Kenney's CC0 ships, or a generated one (TRELLIS.2). Low-poly packs miss "smooth and bold", so the generated or a high-poly CC0 model is the better fit. **A download needs his yes.**

## The family (start as a kid)

Researched: Rogue Legacy (each heir has traits that change play; progress carries over; its premise fades by the 6th or 7th generation, so it needs a new reason to come back), Wildermyth (heroes age, form relationships and pass on a legacy shaped by the story, not only stats). Our logical version: two players who choose to make a family at camp can have a child; when a parent falls for good, the player can continue as that child, who inherits the camp standing and one habit the parent practiced most. You only start as a kid if a real family exists.

## How much of each genre: the simulators decide

Every genre is a dose. Each one gets a measure the robots can read (for example: cozy = minutes at camp with no threat; hardcore = falls per hour; romance = time two players spend together by choice). A dose is added only if the robot crews show it does not lower the core loop's numbers (nights fair, trips worth it, the truck buildable). This is the "appropriate amount" test.
