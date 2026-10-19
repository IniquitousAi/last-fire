# Last Fire, rebuilt: the design

His rules (2026-10-18): hardcore, fun, grown-up, never Minecraft or kid-like. It feels brand new: no mechanic anyone would recognize from another game. Copy only the feelings that make the great ones good. Performance and safety first, then quality of life, then looks.

## The feelings we want, and the mechanic that makes each one (all ours, all from one rule: light)

| The feeling | Where players know it from | Our mechanic |
| --- | --- | --- |
| Dread of a deadline you can see coming | the countdown to a horde | **The Tide.** Each dusk the dark rolls in from the valley's rim as a visible wall. The world shrinks to what your light can hold. |
| Wanting more, so you risk too much | looting greed | **Light is the only currency.** A Hollow bursts into motes of light when it dies. You have to walk out and gather them, and while you carry them you glow, and the dark comes for whoever glows. Bank them at the fire. |
| Needing your friends | reviving a teammate | **Shared glow.** Players near each other burn brighter (each adds to the radius), so the Hollow avoid a group and hunt the one who strays. A fallen player becomes an **Ember**: a friend carries it to the fire to bring them back. |
| Growth that never resets, "one more night" | leveling a base | **The Fire grows.** Feeding it light levels it up: its circle widens and each level wakes something it can make. The base is the light itself, not walls. |
| You chose this fight | pulling the boss | **You call the escalation.** Each time the fire levels up, the dark answers that night with something new. You decide when to provoke it. |
| Finding something great | a rare drop | **Relics.** Guns and parts are found in the ruins by day, never bought. Parts fit guns at the fire. |
| The crunch of a good hit | every great shooter | Craft, not a mechanic. Ash shells crack off with a hard ping and a crack, the first hit you hear from where it happened, recoil you control. |

## The night, start to end (the sawtooth: build up, peak, relief)

Dusk, the Tide rolls in. Quiet: scouts test the edge of your light. Build-up: they come in numbers, the shards go for the fire. The peak is whatever the fire's last level woke. Dawn burns them off, and that's the relief. You count the light you gathered and feed the fire.

## Rules carried over from eras 1 and 2 (game/LESSONS.md, game/PSYCH.md)

- Something new to decide at least every 4 beats. Beats of 20 to 75 s, a night of about 6 to 10 minutes, 25 to 70% of beats tense, at least 2 relief dips a night.
- Nothing earned is ever taken away: a fall costs your carried light, never the fire's.
- Damage a perfect player cannot avoid is a design bug.
- Every promise is seen and heard. Every control answers. Mouse-first. Every screen has a visible BACK. Nothing overlaps.
- Two to five choices on any bar (Hick's law).

## Tech (performance first)

- Smooth heightmap terrain and real CC0 ruin models. No block grid.
- 32 Hollow on the map at most (pacing and frame rate both), animated CC0 models (Quaternius), host-run.
- The proven safety layer from the first game: the host checks everything, 6-letter codes, an integrity-pinned library, a strict content policy.
- Each piece ships alone at /last-fire/next/ for testing; the main link switches over when the new one is better.

## The dark learns you (his pick, 2026-10-18)

Each session is recorded: positions and events, a few KB a minute, nothing personal. While nobody plays, the daemon replays those nights headless and breeds Hollow tactics (a genome: which side to probe, when to rush, whom to isolate, when the shards go for the fire) that beat how this crew actually plays. The next session's dark uses the winners. The same robots also playtest every night against the fun checklist above, and a tactic that makes nights unfair (a death a perfect player cannot avoid, or under 25% or over 70% of beats tense) is thrown out.

So the code is split from the first commit, like The Last Light's Core and Sim:
- `core/`: the rules only, plain JavaScript, no drawing, deterministic from a seed (named random streams, one per system). The browser and the daemon run the same file.
- `sim/`: headless robots and the tactic breeder (Node), run by the daemon behind the heat gate.
- `client/`: drawing, sound, input and network around the core.

## The game his answers describe (2026-10-18, rounds 1 to 6 in ANSWERS.md; this replaces the valley-and-one-fire concept above where they differ)

**One sentence:** an endless dark you push back with light you engineer, in a world that remembers you and learns you, with something cosmic waiting at the edge.

| His why | The what, invented for it |
| --- | --- |
| Endless; more world | The dark has no edge. Your light is the map: everything inside your lit network is known, safe ground, and the frontier is wherever your light ends. Pushing it out reveals new land, so the world grows by what you light. |
| Clever engineering | You build light machines that follow real optics: lenses focus, mirrors bend beams, relays carry light from your fire across the land, prisms split it. A network of light is your base, your weapon and your map at once. The dark goes for its weakest link. |
| Remembers and adapts | The world is saved and keeps every mark (wrecked relays, scorched ground, where a friend fell). The daemon breeds the dark from your recorded nights, so it learns which links you neglect and which way you never look. |
| Cosmic and unknowable; awe | Past the frontier the sky and the land get stranger: phenomena of light and gravity, never props. You don't fully explain it; you get closer. |
| Tense but fun; setup then chaos | Calm lit time to plan and engineer, then the dark tests the network and it's a fight. |
| No babysitting; logic wins | Losses follow the world's own rules: a broken relay goes dark, what you carry drops where you fall and waits there, the world keeps it all. Nothing is reset, nothing is forgiven by a mercy rule. |
| Never lost, the world shows you | No tutorials and no quest markers: the light itself shows what's known, and the frontier always has something glowing just past it. |
| Infinite growth, nobody punished | Power, reach, options and impact all grow forever on curves of diminishing returns, tuned by the robots so grinders and casuals both progress. |
| Dark with humor; either solo or crew | Serious world, funny crew. Solo and a crew are both full games, scaled by how many are on. |
