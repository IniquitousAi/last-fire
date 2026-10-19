# Game dev tricks, the juicy ones (his ask, 2026-10-19)

"Do extremely intense research on all tips and tricks for game dev... the extra juicy secret ones... like game devs don't want you to know this."
Searched 14 times plus 2 full articles: GDKeys "Game Design Dirty Little Secrets" (38 tricks from working devs), Game Developer (Alien: Isolation's AI, hidden mechanics),
Monolith's F.E.A.R. diary and Jeff Orkin's GDC talk, Valve and Turtle Rock on the Left 4 Dead Director, the viral TikTok series retold by GameByte and Bored Panda,
The Astronauts on aim assist, Game Maker's Toolkit on guiding the eye, and gun-sound and three.js performance guides. Honest note: most "secret" tricks are well known
to devs; the listicles mostly repeat the same 10. The best ones come from devs describing their own game.

Status: **HAS** = Last Fire already does it. **SHIPPED** = added tonight. **QUEUED** = next. **NO** = does not fit, and why.

## Your health bar is lying to you (and that is a good thing)
1. **The last sliver is worth more.** Doom and Assassin's Creed give the bottom of the bar more real health than it shows: every fight feels like a close call. **SHIPPED v111** (under 25% light you take 60% damage).
2. **One hit never kills you from healthy.** Control leaves you at 1 if you were not already dying. **SHIPPED v111** (above 40, a killing hit leaves 1). Robots, 32 seeds: careful 0.19 falls a game before, 0.16 after; inside the noise. It is a fairness floor, not a measured gain.
3. **A couple of seconds of invincibility at the brink.** BioShock. **NO** for now: v111 already covers it; stacking mercies makes the dark toothless.

## Enemies are told to miss
4. **The first shots always miss.** BioShock, Uncharted (first two shots after you leave cover), Assassin's Creed. They are a warning, not damage. **NO**: our dark does not shoot; its version is #5.
5. **Enemies behind you go slow.** BioShock, Devil May Cry, Dishonored 2: nothing important happens where you cannot see. RoboQuest even slows bullets in a cone in front of you. **QUEUED** (a horror twist: behind you it still *moves*, you hear it, but it strikes only once it is in your view or very close).
6. **They "reposition" so you can heal.** Combat designers fake a flank so you get a breath. **QUEUED** with the Director (#12).

## Your aim is better than you think
7. **Bullet magnetism.** Shots bend a little toward a target near the crosshair; it is on the gun, not the enemy (The Astronauts, Destiny). **SHIPPED v112**: the first bullet or pellet within about 3 degrees of a solid enemy bends 65% of the way to its body (never the head).
8. **Your sword is longer than it looks; theirs is shorter.** Shadow of Mordor stretches the player's hitbox and shrinks the enemy's. **QUEUED**: the dark's reach a little shorter than its claws look.
9. **The last bullet hits harder.** System Shock: the last round in the mag hits 4 times harder. **QUEUED**: a last-round crack (with its own sound, so it is a feeling, not a secret).
10. **Bad luck is quietly paid back.** XCOM gives a hidden bonus after misses in a row; RoboQuest raises a perk's odds each time it fails. **QUEUED** for wreck parts and Earth finds: a dry run is followed by a better one.

## The game is a director, not a spawner
11. **The Alien is never allowed to cheat**, but it is given a "menace gauge": when your stress has been high too long, it retreats into the vents so fear never turns to annoyance (Alien: Isolation). **HAS** a light version (the dawn), **QUEUED** properly as #12.
12. **The Director.** Left 4 Dead tracks each player's stress (damage taken, being alone, time since the last fight) and runs build up, peak, relax. It hunts whoever is safest or farthest from the group. **QUEUED, the big one**: our spawner already has phases; a stress score per player with a forced relax after a peak, tested by robots on tension (it must stay in the flow band).
13. **Smart enough is "seems smart".** F.E.A.R.'s AI has only 3 states; what made it feel genius is that enemies say what they are doing ("flanking!") and squads are just nearby enemies. It did not matter how smart the AI was if you did not notice. **QUEUED**: the masks *show* intent (the face in the wall turns before it lunges, the watcher's eyes brighten when it decides). Never words: they are not people.
14. **Fewer enemies after you die a lot.** Resident Evil 4. **NO**: hidden difficulty drops break his "progress never resets" pride; the Director does this honestly.

## New players get secretly buffed
15. **Gears of War gives new players extra damage until their first few kills**, so the first match feels good and they come back. **QUEUED** for co-op: a friend's first night, the dark takes slightly longer to notice them (invisible, gone after night one).

## It is a magic trick, not a world
16. **Squeeze-through doors are loading screens.** **HAS** a cousin (the lander drop hides the Earth load).
17. **Only what you look at exists.** Everything off camera is skipped. **HAS** (three.js culling); **QUEUED**: check draw calls with renderer.info, instance the camp's repeated props (rule of thumb: under 100 draw calls).
18. **Fake expensive light.** Billboard clouds with a rim light from the sun; screen-space fake lights that switch to real ones when you are near. **HAS** (rim light, the fire is a raymarch); **QUEUED**: real lights only near you, cheap fakes far away.
19. **Two Cornifers, find one, the other vanishes.** Hollow Knight places a helper at both entrances so you always meet one. **QUEUED** for Earth: the first wreck is always on the side you walk toward.

## Feel: the juice
20. **Hit stop 50 to 100 ms on a heavy hit.** Shorter is invisible, longer looks like lag. **HAS** (hit stop).
21. **Screen shake: small, short (0.1 to 0.3 s), eased out, the camera not the body.** **HAS** (kick); check it eases.
22. **Coyote time and input buffering.** Jump 0.1 to 0.25 s after leaving a ledge (RoboQuest 0.25); a press slightly early still counts. **QUEUED**: both, for jumping and for F at the truck and ship.
23. **Gun sound in five layers** (transient, body, sub, mechanics, tail) aligned on one instant; a pitched-down copy underneath for punch; the player's own gun mixed loudest. **QUEUED** with item 9's crack.

## Guide the eye without arrows
24. **Weenies.** Disney's word for a big landmark that pulls you forward. **HAS** (the fire, Earth in the sky). **QUEUED**: one weenie per Earth district (a lit tower top).
25. **Yellow paint is a crutch; light is the paint.** Naughty Dog defines a clear path with contrast; Remedy refused yellow paint. **HAS**, and ours is better by law: light *is* the rule.
26. **Breadcrumbs.** Collectibles and enemies placed so chasing them walks you down the route. **HAS** (motes and cells lead out).

## The hook versions (how they say it on social media)
- "Your health bar is lying to you." (1, 2)
- "Enemies in shooters are programmed to miss you." (4)
- "Games secretly buff you in your first match." (15)
- "That door you squeeze through? It is a loading screen." (16)
- "The game literally stops for a tenth of a second when you hit something." (20)
- "The AI in F.E.A.R. was not smart. It just told you it was." (13)
- "Racing games cheat so the cars behind you catch up." (rubber banding: **NO**, nothing races here)
