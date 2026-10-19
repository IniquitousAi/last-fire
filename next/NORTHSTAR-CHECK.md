# The north star check: Arcane + Destiny + Maze Runner (checklist item 56)

His picture (ref/vision-2026-10-19.jpg, "THIS! i told grok my vision") is the three made into one image by him. Each reference is checked
twice: the look, as a number from sim/lookmatch.py against his picture, and the story, as the rule in the game that carries it.
Feelings only, never their mechanics (his rule).

| Reference | What we take | The look, measured | The story, in the rules |
| --- | --- | --- | --- |
| Arcane | saturated color only where it means something, on near black; red and violet that never blend to pink | red and violet glow shares within 3 points of his picture in the wall view (playtests/look/rounds.md, round 4) | the corruption cracks: core/rift.js#riftLight, client/rift.js#lfCrack |
| Destiny | awe far away: a sky with a nebula band, a light that is the only thing between you and the dark | the far view's black share within 14 points of his picture (round 4) | light is the rule: core/game.js#SOLID_AT; the Rift's endless waves: core/rift.js#riftStep |
| Maze Runner | a community walled in by giant walls that were white once; a door in the wall nobody comes back from | the wall view, slate with red glyphs and fog against it (round 4 gap 0.20, round 1 0.39) | the walls: core/game.js#WALLS; the Rift in the north gate: core/rift.js#RIFT |

What is still missing against the three, in order: the forest of black pines (lane C, ez-tree), the creatures in the fog (lane E), the
suit in third person (lane D).
