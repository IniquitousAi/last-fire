# The skeleton (his rule, 2026-10-19: build the whole game rough first, then he says yes or no)

Every stage of the finished game, playable end to end in its roughest honest form, before any stage gets polished. Each stage is a gray-box
of the right size, with its real rule, a placeholder look, and a one-line goal on screen. The robot player (`sim/autoplay.cjs`) plays the
whole skeleton every version and reports how far it got; he plays it and says yes or no per stage. A stage is polished only after its yes.

| # | Stage | What exists today | Skeleton job |
| --- | --- | --- | --- |
| 1 | Menu to the Moon camp (era 3, pistol and shotgun) | built, guided (9 steps) | trim the guide to era 3 guns |
| 2 | The first Moon night | built | keep |
| 3 | The drop to Earth (era 4, a taste) | the lander, 150 s, a ring of tower boxes | **the Maze:** black once-white walls, gray fog outside, green uncorrupted pockets, Earth's own day and night |
| 4 | Back to the Moon tutorial: plan, build, defend | pieces exist (relays, lamps, the truck bay) | one guided pass through planning, building and defending |
| 5 | Earth base camp: the real game | not built | a placeholder camp inside the Maze, the loop: go out, bring back, build, hold the night |
| 6 | The endless part: it scales forever on true numbers | the Director, the learned friend, the camp economy | one curve per system the simulators tune, shown on the Simulator page |

Order: stage 3's Maze and Earth lighting first (he asked, and every later stage happens on Earth), then 5, then 4, then trims.
