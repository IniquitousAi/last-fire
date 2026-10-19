# Last Fire (working name): a co-op survival FPS in the browser

For Daniel and Dalton, two players, one link. Started 2026-10-18.

## The loop (7 Days to Die's, the part that works)

Prepare by day, survive the night, recover, and every 7th night a siege. Every day is a choice of what to spend daylight on:
gather, build, craft, or explore for better loot. (Sources: fan guides on the blood moon cycle, xgamingserver.com and guildorder.com;
the meaningful-choices rule from our own game research, game/RESEARCH.md. No developer talk on 7 Days to Die was found.)

## The enemy: the dark itself

Not zombies. **The Hollow**: shapes the night is made of. They exist only outside light.

- **Light is the whole game.** A campfire or torch keeps them out of its circle and hurts them at its edge. Fire needs fuel (wood),
  and wood is also what you build with: every log is a choice between a wall and another hour of light.
- **Light also calls them.** A big fire is seen from far away. Bright and safe, or dark and hidden: your call each night.
- **They unmake what is built in the dark.** An unlit wall loses blocks to them; a lit one holds.
- **Daylight burns them away.** Morning is the reward, and it comes slowly.
- **Every 7th night is the Long Night.** It runs longer, and three times as many come. You know it is coming; that is the tension.

Why it makes sense: one rule (light) explains the enemy, the danger, the resources and the base, so every decision connects to one thing.
It also suits the look: the graphics budget goes to darkness, fire and fog, where it shows most.

## The foundation (performance from day one)

- The world is blocks in 16 x 16 chunks, one merged mesh each, faces only where they touch air, soft corner shading baked in (no textures to load).
- Every Hollow is drawn in one instanced draw. A few real point lights (the fires), everything else baked.
- Multiplayer: browser to browser (WebRTC via PeerJS's free broker). The host runs the world and the Hollow; the other player sends
  movement, shots and block changes. A room code joins you.

## Checked daily (LAW.md law 17)

Spam every key, play a night for real, judge looks, the 5-second test. The scores decide what gets worked on next.
