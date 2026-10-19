# What people do with Opus 5.5 to make games easy (research, 2026-10-19)

Three research helpers (official sources, the community, tools and repos). Honest gaps: no first-party Anthropic game material for Opus 5.5;
no direct Reddit, X or HN threads could be read (blog recaps only); nobody has an AI that plays a full FPS from tutorial to end game: our
`sim/autoplay.cjs` is ahead of what anyone has published.

## The techniques that would speed us up, ranked
1. **The Gauntlet Loop** (Matt Shumer's "Claude of Duty", July 2026, on Opus 5): the builder never grades itself. Fresh critic agents score
   screenshots against a named reference game, blind, with a number. His critic score went from 3.59 to 5.05 of 10; real Call of Duty still won.
   For us: a critic pass on every look change against Cyberpunk 2077 night shots, with a pass line.
   ([explainx](https://explainx.ai/blog/claude-of-duty-opus-5-procedural-fps-july-2026), [Decrypt](https://decrypt.co/374560/dumbest-ai-prompt-claude-beat-careful-game-design))
2. **Capture and diff harness:** a fresh page per screenshot (reused pages gave shots that would not repeat), fixed camera spots, a
   per-pixel diff gate before commit. Trust measurements over a critic's words.
3. **Profile real play, not still scenes:** Claude of Duty's still benchmark lied; shader compiles during play caused 1.2 s stalls.
   Warming every material at load fixed it. For us: IMMERSION.md's hitch hunt (item D) is worth doing, and the robot run can log the worst frame.
4. **Deterministic test hooks:** `threejs-game-skills` (github.com/majidmanzarpour/threejs-game-skills, about 960 stars) exposes game
   state, a seed and a step function to Playwright bots. We have the start of it (`?test`, `?autoplay`'s `__eyes`).
5. **Route bots first, smart bots second:** scripted route bots per level found unreachable spots and invulnerability holes in shipped
   browser games (Friendslop, Sept 2026; Montanha, Oct 2026, built in a day on Opus 5.5).
6. **One owner per coupled system:** parallel agents on tightly linked code (weapons and player) did worse than one sequential owner.

## Tools worth taking (all free)
| Tool | What it does for us | Note |
| --- | --- | --- |
| chrome-devtools MCP (53.8k stars, Apache-2.0) | Chrome's own performance traces of a real night | already installed |
| Spector.js (1.6k, MIT) | every WebGL draw call in one frame: overdraw, state thrash | script or extension |
| stats-gl (283) | on-screen CPU and GPU time a robot can read | plain JS |
| glTF-Transform (2.0k, MIT) | squeeze our GLBs (meshopt, KTX2) for faster loads on GitHub Pages | Node CLI |
| Quaternius Universal Animation Library | about 260 CC0 clips, replaces Mixamo (in maintenance) | download needs his yes |
| Claude-Code-Game-Studios (26.9k, MIT) | game-dev skills (QA, design review) to mine, Godot and Unity leaning | read, do not adopt whole |

3D generators (TRELLIS.2, Hunyuan3D) are NVIDIA only; on his AMD card the route is their free cloud tiers, then the Blender cleanup script.

## What fails, by the reports
- Strong visuals, weak mechanics: backwards controls, unclear hits, mannequin people.
- The model misses animation and sign errors it cannot see; screenshots caught washed-out light a reading of the code did not.
- Cost and overreach: a Minecraft clone burned about 25M tokens; small issues blown into rewrites.
