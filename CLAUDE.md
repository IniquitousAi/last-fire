# Last Fire: rules for Claude (the game's own home, his pick 2026-10-19)

**One rule file (CHIEF 8:58pm, 2026-10-20):** Daniel's rules live in `C:/Users/danie/Desktop/projects/vibe-lab/CLAUDE.md`; read it first. This file adds only this project's own rules.

**Top rule, weighs most (Daniel, 2026-10-19, "put a lot of weight on" it): the game must feel like him.** "I want this game to feel like me a lot. I think eventually I'll be able to clone myself in a digital space. At the very least, it'll repeat my same jokes over and over again and make me laugh." Check every choice against him first (his taste rules and the Twin, his words, his jokes, the Atlas); a great feature that is not him loses to one that is.


Daniel's browser co-op survival FPS (three.js, plain JS, GitHub Pages). Live: https://iniquitousai.github.io/last-fire/next/ . Code in `next/`.
**Claude is the main dev. Daniel only plays (on a controller, to relax) and judges by eye.** Anything he finds that a test or Claude's own
eyes could have caught first is a miss. Who he is and his wider rules: `../vibe-lab/DANIEL.md`, `../vibe-lab/CLAUDE.md`; this file wins for the game.

## Before any version ships (in this order)
1. `node next/sim/basics.cjs`: the basics gate. Every FPS basic a player expects, tested in a real browser at his window size
   (1000x900) and his full screen (1920x908). A FAIL blocks the ship. A new basic he has to ask for is added here the same turn.
2. The rule robots for what changed: `node next/sim/director.mjs`, `breach.mjs`, `light_rule.mjs` (rules), `ship.mjs` (ship), etc.
3. **Look from the player's spot:** a screenshot of every screen the change touches, read by Claude before shipping (taste rule 104).
4. `node next/sim/checklist_verify.mjs`: the in-game checklist (Esc, CHECKLIST). Every idea has a task and five proven marks (BUILT,
   TESTED, SEEN, PAD, PLAYED); marks without proof are erased. Knock out the most marks per minute.
5. Ship: `python next/bump.py "<plain note>"`, `git add` exact paths (never `next/playtests/` wholesale), commit, push.

## Where things are
- `next/QUEUE.md`: the work list, his newest playtest on top. `next/DESIGN.md`: the spine. `next/PATCH-NOTES.md`: versions.
- `next/sim/autoplay.cjs`: the robot player (fake controller, sees only the screen). `next/OPUS-GAMEDEV.md`: what works for AI game dev.
- Research: `CYBERPUNK.md` (numbers), `LOOK.md` (art direction), `IMMERSION.md`, `GAMEDEV-TRICKS.md`, `INNOVATION.md`.
- Preview server: "Last Fire" in `../vibe-lab/.claude/launch.json` (port 8092, serves this folder).

## The game's taste
Load the game rules first: taste tool, action "list", scope "game" (rules 76 to 104 are Last Fire's). The ones most often missed:
nothing bobs; enemies solid and readable, never clipping (102); seamless UI without boxes, compared with Cyberpunk 2077 (103);
newest rigs and every item on by default in dev (104); no cyan, orange, gold or mud; grim and grown-up, never kid-like.

## How to work (what failed before)
- Judge with eyes, not only numbers: tests passed while the game looked like a placeholder (2026-10-19).
- Copy proven setups (Poly Haven scans, Blender rigs, real game values); never hand-build 3D from code primitives.
- Controller first: every new move gets a pad binding and a simulated-pad test.
- Short versions, each one shipped and looked at; a feel beats a number.
