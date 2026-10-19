# Earth: the plan (his picture 2026-10-19, research the same day)

**His words:** Earth's community lives walled in (the one thing taken from Maze Runner; the rest is ours): giant walls you can tell were white
once, eaten black by the dark. Outside: dark gray, fog mixed with dark, some green uncorrupted pockets. A normal day and night cycle. Rain that
drips down your visor. It should feel like Cyberpunk 2077 with survival, and give scientific awe.

**Built (skeleton):** the walls (core/game.js `WALLS`, 100 m square, 30 m high, a gate in each side) in the towers' format, so light,
shadows, the faces in the walls and collision work on them; the ruins moved outside. Robots: every trip still comes back; a perfect solo
player's tension 0.68 to 0.28 (inside the walls is safer, as a community should be); a whole truck 13 trips from the city (was 16).

## Build order (feeling per hour first; every step looked at from the player's spot and run through sim/basics.cjs)
1. **Sky and Earth's day and night:** three's `Sky` (Preetham: turbidity, rayleigh, mie) driven by Earth's own clock, sun disc hidden from
   the baked environment; stars fade in below the horizon; a lit moon disc; violet and electric blue at night, never cyan or orange.
2. **Rain in the world:** one instanced set of streak quads wrapped around the player, animated in the vertex shader (no CPU per drop), lit
   by the lamps (hot pink and violet catch); wet ground: lower roughness plus ripple normals from a rain amount; puddles from a mask and the sky.
3. **The visor:** drops simulated on the CPU into a small data texture (Raindrop-FX's idea, MIT, github.com/SardineFish/raindrop-fx: about
   2 to 3 ms at 1080p for 600 drops), refraction in one pass over the world only (the HUD is DOM, never touched); heavier rain, more drops;
   a wipe on a button (pad: a binding). Heartfelt (Shadertoy) is CC BY-NC-SA: the idea only, never its code.
4. **Fog and light:** exponential height fog toward dark gray, faint violet near the walls; god rays cheaply (radial blur from the sun's
   screen spot, or pmndrs GodRaysEffect if it runs on r186), sample count the cost lever.
5. **Awe staging** (Keltner and Haidt: vastness plus a picture that no longer fits; awe can mix fear and wonder): a long dark approach that
   ends at the 30 m walls with a human-size door beside it for scale; one far sightline where the dark visibly creeps over a wall; a green
   pocket seen through a gap only after you crest a ruin; a slow dusk event in the sky (a huge moon, a violet aurora).
6. **Body:** breath fog on the visor after sprints; rain on the helmet shell in the audio, muffled.

**Gaps:** no developer talk found on Cyberpunk, Battlefield, Metro or Star Citizen visor rain; no three.js rain frame costs (measure here);
the only presence study on diegetic HUDs found no difference (Carleton/York 2015), so visor effects are mood, not proven presence.
