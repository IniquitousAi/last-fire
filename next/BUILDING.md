# Last Fire: building (design doc, 2026-10-19)

His words: two ways to play, balanced by teamwork: all-out violence, and a builder who can build "literally anything", put together logically (a truck from parts found on Earth), with storage and weight. "Let's figure out how we're going to do the building." His filters: logic and truth, no recipe trees from nowhere, nothing you would recognize from another game, copy only feelings, grounded and grown-up, and robots test it before it ships.

Ideas only. Nothing here is built. Labels follow ANSWERS.md: **checked** (a study or a developer's own words show it), **reasoned** (worked out from a checked finding or the game's own rules), **guess** (taste and logic).

## What already exists (core/game.js)

- `PARTS`: six truck parts with real weights (frame 60 kg, engine 45, cab 40, axle 25, wheel 18, battery 15) and an `after` list (an axle needs the frame first). That list is already a load path: a part sits on what holds it.
- `strip`: wrecks on Earth hand you a part; a kind you stripped yourself is learned (`g.learned`), the rest only reasoned (v96).
- `fit`: at the BAY, the next fittable part goes on in a fixed order. No placing yet: one key, one part.
- `MAX_LOAD` 140 kg on your back, `speedOf` slows you with weight; `CAR.store` 400 kg in the truck bed.
- `NODE` relays and lamps, `grow` the fire, and the economy (dues, standing, prices) all spend light. Light is the currency, so anything built should earn or save light.

## What the best builders teach (the feelings, not the mechanics)

| Game | What makes it feel good | What we take | Label |
| --- | --- | --- | --- |
| Zelda: Tears of the Kingdom (Ultrahand) | Visible "glue" bulge shows a join at a glance; one same satisfying sound every attach; crude builds still work; parts look like real things so you know what they do | A join you can see and hear, the same every time; real-looking parts; ugly but working is fine | checked (Nintendo, Ask the Developer vol. 4; GDC 2024 physics and sound talk: vehicle sound comes from the physics, not a clip) |
| Besiege | The moment it breaks shows you which beam was weak; failure teaches | Every failure points at its cause | reasoned (reviews, no dev source found) |
| Kerbal Space Program | Build, launch, explode, learn; the test is the game | The first run is the exam | reasoned (GDC 2014 modular design, GDC 2015 postmortem titles; player accounts) |
| Valheim | Stability you can read on the piece before it falls | Structural truth shown before the mistake, not after | checked (game behavior; color ramp copied by everyone, so we do not copy it) |
| Space Engineers | You weld blocks up from components and grind them back down; damage deforms real mass | Taking apart and putting together are the same skill run backward | checked (official wiki: welder, grinder) |
| Teardown | Everything is physical, but the shipped game held whole houses on one voxel; integrity came later as a prototype | Truth matters more than spectacle; fake physics gets noticed | checked (PC Gamer review; Tuxedo Labs dev on the prototype) |
| Satisfactory | A hologram previews the piece; blue valid, red blocked; snap guides show the connection points | Show where it will go and what it connects to before you commit | checked (Satisfactory wiki, Build Gun) |
| Stormworks | Deep, but co-op editing of one vehicle has been asked for since early access and is still hard | Plan co-op building from day one; it is not a patch | reasoned (Steam forum, not official) |

Two research findings set the floor:
- **We love what we build only if it gets finished.** Built then destroyed, or left unfinished, the value boost vanished (Norton, Mochon and Ariely 2012, Journal of Consumer Psychology 22(3)). So every build must be finishable in one evening, and a failed run must leave the machine standing, not in pieces. checked.
- **Fiddly first person placement** is a recurring complaint: ghosts at a fixed distance, no fine adjustment, hard to see (The Forest, Steam discussion; Factorio forum asks ghosts to snap from 1 to 2 tiles off). reasoned.

## The core loop, in 5 steps

1. **Find a dead machine.** Earth sites list their machines on the board with honest odds ("Pump station: 2 pumps, 40% one still turns. Bring a wrench and low expectations."). You pick by the odds (v81 already does this for parts).
2. **Strip it to learn it.** Taking it apart is first person and part by part: each piece you pull shows how it was joined (bolted, welded, plugged, belted) and what it sat on. When you finish, the crew holds a **reasoned** blueprint: what touches what, written by you, with your name.
3. **Haul it home.** Weight is real: 140 kg on your back at under half speed, 400 kg in the truck bed. Glowing parts draw the dark. The fighter's job is the route; the builder's job is the load.
4. **Put it back together at camp.** You place the parts in first person (below). The joins you saw on Earth are the only joins that exist: you cannot bolt where there were no holes.
5. **Run it, and let the run check it.** The first run is under real load. It runs or it fails, and a failure names its join ("Axle mount, left. It was always going to be the left."). A machine that runs N real nights becomes **checked**, and the board's survival number moves by exactly what it measurably saves. That is the payoff: you raised the number, and the number is honest.

Why this is true to the lore: nobody knows how the old world worked, knowledge is the crew's currency, and it counts fully only once checked (ANSWERS.md). Reverse engineering is how a person would really learn. The truck already follows steps 1, 3 and 4 in a thin form.

## How placing works in first person

**Recommended: hold and seat.**
- **You carry the part in your hands**, not a menu. Its weight shows in the body (slower turns, lower view, heavier breath, INNOVATION.md 8B). Over 40 kg it needs two hands from two people, or a stand (solo), or the winch (build 1).
- **No grid. Joins snap, space does not.** Each part has the real join points you saw while stripping (bolt holes, a shaft, a plug). Bring a join within about 15 cm and 10 degrees of its mate and it is pulled the rest of the way and seated. Everywhere else the part is free in your hands. This is the Factorio ghost lesson: forgive the last few centimeters, never the decision.
- **Fastening takes time and practice.** Hold the use button to bolt it; the time drops with repetition on a flattening curve (the same rule as reloads, v52). A seated but unfastened part wobbles and can fall.
- **Structural truth is a line of light, not a color ramp.** When a part is seated, a thin trace runs from it down through whatever holds it to the ground. The trace thins as the load nears the limit, and the part creaks. Look at it and the visor reads one number: "holds 140 of 160 kg". Built on `after`: every part rests on something real.
- **The join you see and hear.** One fastening sound, always the same, always satisfying, and a visible bead or bolt head at every join (the Ultrahand lesson, without the glue).
- **Undo is honest:** unbolting takes the same time as bolting. Nothing is free, nothing is lost.

**Alternative: weld anywhere.** Any two surfaces can be joined with a cutting torch; physics decides if it holds. It is closer to "literally anything", but it is fiddly by the research above, nondeterministic (the robots need a deterministic `core/`), and it breaks the lore: you would be inventing joins nobody learned. Keep it for a later era as a tool you earn (the dark's own tech), not the base.

**Co-op:** two people seat a heavy part twice as fast (one holds, one bolts); the fighter holds the lit ring around the bay while the builder works, so building is also a defense. Solo uses stands and the winch: slower, never blocked.

## Three things to build first (beyond the truck and lamps)

| Build | Stripped from | Why (logic) | Feeling |
| --- | --- | --- | --- |
| **1. The winch** | A tow truck's drum, cable and motor on Earth | Heavy parts and wrecks are the bottleneck of building (the truck takes a median 8 depot trips, v85). A winch on the truck drags a whole wreck home or lifts a 60 kg frame into place for one person. It makes the other builds possible, and makes solo building fair. | Leverage. One person moving something that should take three. |
| **2. The light trailer** | A spare axle and wheels, a floodlight, a battery | Light makes the dark solid. A towed floodlight is a piece of camp you drag onto Earth: the fighter fights inside its beam, the builder strips under it. It ties the two play styles in one object. Weight cost: the truck slows while towing. | Bringing the fire with you. A pocket of safety you made. |
| **3. The generator** | A backup generator from a dead building (the pump station or hospital sites) | The fire eats 120 light a day (core/camp.js). A generator that runs the camp's lamps on salvaged cells takes load off the fire, so the dues ease for everyone and the board's number rises by a measured amount. It is the first build whose payoff is the honest number itself. | Raising the number with your own hands, and the camp eating a little better at dinner. |

Order by the bottleneck: the winch first (it speeds every later build), the trailer second (it serves both play styles), the generator third (its reward is slow and large).

## How the robots test it (sim/, before anything ships)

| Test | The number | Pass line |
| --- | --- | --- |
| Placement is not fiddly | Seats on the first try, with a scripted hand aiming with 3 degrees of noise and 5 cm of jitter | 95% or more, and under 4 s per seat for a practiced robot |
| Labels mean something | Failure rate of a reasoned machine's first run against the odds the board posted, over 200 runs | Within 5 points of the posted odds (Brier score as in v55); checked machines fail 0% from building errors |
| Finishable | Real minutes from first strip to first good run, per build, solo and crew of 2 | Every build finishes inside one evening (about 45 min) for a crew of 2, under 90 min solo |
| Teamwork wins | Board number gained per hour by crew mix: fighter plus builder, two builders, two fighters | The mixed crew beats both others by 10% or more; solo finishes about as often as a crew (his "just as good solo") |
| No best answer | Each build order across all Earth sites | No single order wins on every site |
| It earns its keep | Light saved per night by the generator, measured, against the board's change | The board moves by exactly the measured saving, no rounding up |

The sim follows the existing pattern (`sim/truckbuild.mjs`, `sim/robots.mjs`): deterministic seeds, a control without the feature, a second seed before anything is written down.

## What NOT to do

- **No crafting bench, no recipe list, no "press E to craft".** Nothing appears from a menu. Every part is carried, every join is seated by hand.
- **No tech tree unlocked by points or levels.** You know a machine because you took one apart, and the label says how sure you are.
- **No wood, stone, metal tiers.** Parts are things with a past (a bus wheel, worn), not materials with a number.
- **No foundation grid and no wall spam.** The base is the fire and its light; building is machines that solve problems ("clever engineering", his pick), not fortresses.
- **No green to red stability colors.** Everyone copied Valheim's; ours is a load line of light and one number when you look.
- **No floating blueprint ghost that builds itself.** A reasoned blueprint is a note on your wrist, not a hologram that fills in.
- **No durability bars.** A part wears and it shows in the run (a wobble, a sound), not a bar.
- **No breaking the build on a failure.** A failed run leaves it standing with the bad join lit; the research says a destroyed build loses its value.
- **No fake physics numbers.** Every kg, every limit, every odds line comes from `core/` and the sims.

## Sources (searched 2026-10-19, 14 searches, 2 pages read)

- Nintendo, Ask the Developer vol. 4, Tears of the Kingdom: nintendo.com/ph/interview/totk/04.html
- GDC 2024, "Tunes of the Kingdom: Evolving Physics and Sounds for Tears of the Kingdom": gdcvault.com/play/1034667 (via Digital Trends and GoNintendo coverage)
- Game Maker's Toolkit on Ultrahand design, via Zelda Dungeon (simple and logical, real-looking parts)
- Norton, Mochon, Ariely, "The IKEA effect: When labor leads to love", J. Consumer Psychology 22(3), 2012: dash.harvard.edu/handle/1/12136084
- Valheim structural integrity: Sportskeeda and Mobalytics building guides
- Space Engineers welder and grinder: spaceengineers.wiki.gg/wiki/Welder_(Tool); spaceengineersgame.com/features
- Teardown: PC Gamer review; 80.lv on the integrity prototype
- Satisfactory Build Gun: satisfactory.wiki.gg/wiki/Build_Gun
- Stormworks: Wikipedia; Steam discussion on co-op workbench editing
- Kerbal Space Program: GDC 2014 summit listing (gdconf.com), GDC 2015 postmortem (gamedeveloper.com)
- Placement complaints: Steam, The Forest discussion; Factorio forum, snapping to ghosts
- Besiege: Gamereactor and Pocket Gamer reviews (no developer interview found)
