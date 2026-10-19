# Last Fire

A co-op survival FPS in the browser (Three.js r186 in `vendor/`, PeerJS browser to browser). Up to 4 players: one HOSTs and shares a 6-letter code; friends JOIN with it.

- **The new foundation (play this):** https://iniquitousai.github.io/last-fire/next/ , all code in `next/`.
- **The old game:** https://iniquitousai.github.io/last-fire/ (root `src/`, kept running, not developed).

## The new foundation, in one breath
A camp on the Moon around the Last Fire; Earth below is taken by a dark that wears masks. Light is the rule: in the dark the enemies are smoke, in light they are solid.
You drop to Earth to strip wrecks for truck parts, build the truck, fly the ship, and keep the camp's books. Robots play every rule before it ships.

## Where things are (`next/`)
| Part | Files |
| --- | --- |
| Rules (shared by the game and the robots) | `core/game.js`, `core/ship.js`, `core/habits.js`, `core/camp.js` |
| The game in the browser | `client/main.js` and its modules, `index.html` |
| Robots (node) and the Simulator page | `sim/*.mjs`, `sim.html` |
| The work list and the thinking | `QUEUE.md` (every ask, in no order), `INNOVATION.md`, `GAMEDEV-TRICKS.md`, `SHIP.md`, `PLAN-SPACE.md`, `ANSWERS.md` (his picks) |
| What changed | `PATCH-NOTES.md`, and `version.json` (the UPDATE READY pop-up) |

## Shipping
`python next/bump.py "what changed, in his words"` checks every module parses and that no code hides after a `//` comment, bumps the version everywhere, then commit and push: GitHub Pages is live in about a minute.
