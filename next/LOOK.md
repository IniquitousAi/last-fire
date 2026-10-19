# Last Fire: the look ("Cyberpunk 2077 vibes", his words, 2026-10-19)

What makes Cyberpunk 2077 feel like itself, learned and then translated into our rules: the Moon camp around the Last Fire, Earth taken by the
dark that wears masks, light is the rule. We learn the reasons, never the city. No cyan, no orange, gold, yellow, brown, olive, dark green or
dull dark color. Saturated hues only where they mean something. Glow lives in the world, never on the HUD. Grim, heavy, grown-up.

## What was researched (sources at the bottom)
CD Projekt Red's art and lighting leads: Jakub Knapik (lighting and FX art director) and Kacper Niepokolczycki (environment art director) on
80.lv; Marthe Jonkers (senior concept artist) on RPG Site; the GDC 2022 talk "Bringing Light to Night City"; Michal Janiszewski on the yellow;
the Interface In Game critique of the HUD; the three.js docs for LUTPass and its loaders. Honest gaps: no CDPR source I could open says
anything about wet streets, volumetric fog or face scanning; the GDC slides sit behind a login. Those parts below come from looking at the
game, not from a quote.

## What CDPR says they did
- **Four eras in one city, as a timeline.** Knapik orders them: a bleached, 80s-style Entropism (poverty, things just have to work),
  a plasticky 60s-style Kitsch (bright, round, form over function), corporate Neo-militarism (hard, utilitarian, power), and a rare,
  pseudo-natural Neo-kitsch for the ultra-rich. Every frame mixes them, so the city reads as old.
- **The rule of contrast.** Their own internal term: put the unexpected against the ordinary (a normal house with a car crashed through the
  roof). Each district has a color code; Phantom Liberty grouped colors and shapes so the eye has places to rest.
- **A living film set.** Physically based, cinematic lights on a 24-hour cycle and weather, so a change gives a predictable result. The
  city is dense with lamps, signs, screens and car lights; without ray tracing only about 10 lights cast shadows at once.
- **One signature color.** Yellow, chosen like the Coca-Cola bottle: memorable, and away from the genre's red and blue. It carries
  information (quickhacks, quest text). **Banned here.** Our replacement: **hot pink / magenta (0xff4fd8, already the game's accent)**
  means "this matters to you"; mid-bright red (0xff3b5c) means danger; violet is the world's own edge; deep electric blue is Earth's night.
- **The HUD is optics.** A red, text-heavy, low-fi look, slightly skewed, with optional chromatic ghosting so it feels projected onto the
  eye's lens; glitch when hacked. The critique: too much information and decoration that competes with what matters.

## The 5 traits, translated

1. **Eras you can read in the materials.** Night City's four styles map onto our eras: scavenged tech, light tech, the dark's own.
   Camp: Entropism is the base, Earth salvage bolted to lunar rock, grey-blue metal, hand-painted pink stencils. The leaders' room is our
   Neo-militarism: hard edges, clean violet panels, the softened odds framed on the wall. Earth: the pre-dark world is our Kitsch, cheerful
   rounded storefronts and dead ads under the dark. The dark's tech (late eras) is our Neo-kitsch: smooth, too perfect, wrong.
2. **Darkness cut by many small practical lights.** Night City is black between hundreds of lamps. The camp is black between its lights,
   each one a reason (a work lamp, a quota board, a relay). Earth has almost none: a surviving sign or a burning wreck is a landmark.
3. **Wet ground that doubles every light.** The Moon has no rain, so the camp's version is coolant and condensation from the water
   reclaimers pooling near lamps and machines: dark, glassy patches that hold a stretched streak of each light. Earth may truly rain.
4. **Words as light.** Night City's ads become our camp paperwork in neon: "SURVIVAL TODAY: 81%. HAVE A NICE DAY.", "FORM 7-C: REPORT
   ANYONE WHO STOPPED BEING ANYWHERE (IN TRIPLICATE)", "QUOTA: LIGHT. QUOTA MET: NO." The board's fine print as a smaller dim sign.
5. **A lens over a filmic image.** A grade with crushed, colored shadows, fine grain, and a touch of color split at the screen's edge,
   the feeling of seeing through optics. On the world only: our HUD is DOM over the canvas, so a post pass never touches it, by
   construction. The bodies get it too: the Hollow's masks and the crew's suits carry heavy, visible hardware, like Night City's cyberware.

## The 6 changes, cheapest high-impact first
Frame times are estimates for one full-screen pass at our 1.5 pixel ratio on a mid GPU; measure each with a GPU timer before shipping.
The renderer already has ACES tone mapping, bloom (UnrealBloomPass 0.6 / 0.5 / 0.82), FogExp2 0x04060c and a violet rim on every mesh.
Our vendor folder has ShaderPass but no LUTPass or FilmPass, so the first change is one custom pass, not three library ones.

| # | What | Why | Cost (estimate) | Effort |
| --- | --- | --- | --- | --- |
| 1 | **One grade pass** (ShaderPass before OutputPass): shadows pushed to deep violet, highs kept clean, warm hues rotated to red or pink so no orange or yellow can appear, fine animated grain, chromatic split only past 70% of the radius, light vignette. One pass, all math, no texture. | Trait 5; the single biggest "film" jump; also enforces the palette on every asset, CC0 models included. | about 0.2 ms, 1 pass | small: one shader, about 40 lines |
| 2 | **Neon paperwork signs**: emissive planes with CanvasTexture text from the lore (hot pink for the board, red for warnings, violet for forms), a slow flicker on one in three, instanced. | Traits 2 and 4; bloom already makes them sing; humor lives in paperwork by lore. | about 0 ms GPU, 1 draw call per material | small: text list plus one prop |
| 3 | **Wet patches near lamps**: in the ground shader, a noise mask times lamp proximity drops roughness to about 0.1 and adds a vertical streak of the nearest lamp's color under it. No SSR, no reflector. | Trait 3; doubles every light for free; SSR is a full extra pass and breaks at screen edges. | under 0.1 ms, no pass | medium: groundMat onBeforeCompile |
| 4 | **Haze shafts from lamps**: additive cone meshes, depthWrite off, faded by view angle and by distance, only for the 6 nearest lamps; plus height fog thicker near the ground. | Trait 2; the volumetric look without raymarching. | 0.1 to 0.4 ms (overdraw), capped at 6 | medium |
| 5 | **The masks glitch when they decide**: on the Hollow only, a 120 ms vertex jitter and red or magenta split on the mask when it picks a target. | Trait 5 on the enemy, not on you; it is trick 13 in GAMEDEV-TRICKS (show intent). | under 0.05 ms | medium |
| 6 | **Era materials**: a short material kit per era (salvage metal plus stencil, leaders' violet panels, Earth's pre-dark kitsch, the dark's seamless black glass) applied to the CC0 models. | Trait 1; makes the world feel old and layered. | 0 ms | large: art pass, era by era |

**Status (v153):** 1 SHIPPED v126 (the grade; look 3 in v153 removed its edge split and lifted shadows); 3 SHIPPED v127 (wet ground near lights, real specular in look 3); 5 partly, as the masks' eyes flaring (v123). Open: 2, 4, 6.

Order: 1, then 2 and 3 together (they need each other), then 4, 5, 6. Each one alone at /last-fire/next/, his eyes judge, three rough
versions where a look can vary (his rule).

## What NOT to do
- **No yellow, and no swapping yellow for cyan.** The genre default is pink plus cyan; ours is pink, red, violet and deep blue only.
- **No copied city.** No megabuildings, no kanji ads, no Night City layout, no car culture. Copying a reference's layout made the game feel
  like an office slide (his correction, 2026-10-19). Learn the reason, build our own thing.
- **No glow, chromatic split, scanlines or glitch on the HUD.** The Kiroshi ghosting is exactly what our rule forbids. HUD stays dark keys,
  dark panels, weight and color (the Reactor lessons), never glow.
- **No screen-space reflections, no full raymarched volumetrics, no path tracing.** They are the expensive part of Cyberpunk's look and
  the cheap fakes above get most of the feeling.
- **No pastel neon, no rainbow.** Every saturated pixel means something: a hue that means nothing is turned down.
- **No cute.** No chibi bodies, no bouncy kitsch on our people. Kitsch exists only as the dead Earth's leftovers, under the dark.
- **No clutter.** CDPR's own critics say the HUD carried too much; their Phantom Liberty fix was places for the eye to rest. Dark first.
- **No props in the void past the frontier.** Cosmic strangeness stays phenomena of light and gravity.

## Sources
- [80.lv: how Night City was built almost entirely by hand (Knapik, Niepokolczycki)](https://80.lv/articles/interview-how-cyberpunk-2077-s-night-city-was-built-almost-entirely-by-hand/)
- [RPG Site: interview with senior concept artist Marthe Jonkers](https://rpgsite.net/interview/8896-cyberpunk-2077-interview-exploring-the-environment-with-senior-concept-artist-marthe-jonkers)
- [Game Developer: how Cyberpunk 2077 lit up Night City (GDC 2022)](https://www.gamedeveloper.com/marketing/find-out-how-cyberpunk-2077-lit-up-night-city-in-this-gdc-2022-session) and [GDC Vault listing](https://gdcvault.com/play/1027959/Advanced-Graphics-Summit-Cyberpunk-2077)
- [NVIDIA: Ray Tracing Overdrive interview with CDPR](https://www.nvidia.com/en-sg/geforce/news/cyberpunk-2077-ray-tracing-overdrive-mode-interview)
- [Game World Observer: CDPR used Coca-Cola as the reference for its yellow](https://gameworldobserver.com/2022/05/25/cd-projekt-cyberpunk-2077-yellow-coca-cola)
- [Phaidon: Dieter Rams and Syd Mead behind the styles](https://staging2.phaidon.com/agenda/design/articles/2020/december/15/do-you-know-that-dieter-rams-was-a-major-influence-on-this-year-s-biggest-video-game)
- [Interface In Game: Cyberpunk 2077 UX/UI critique](https://interfaceingame.com/articles/cyberpunk-2077-ux-ui-critique) and [Dot Esports: the HUD ghosting](https://dotesports.com/cyberpunk/news/cyberpunk-2077-hud-feature-looks-like-a-glitch-on-ultrawide-monitor)
- [80.lv: character design in Phantom Liberty (Chojnacki)](https://80.lv/articles/a-look-at-character-design-in-cyberpunk-2077-phantom-liberty)
- [three.js docs: LUTPass](https://threejs.org/docs/pages/LUTPass.html), [LUTCubeLoader](https://threejs.org/docs/pages/LUTCubeLoader.html); [Godot puddle shader (noise mask plus roughness)](https://godotshaders.com/shader/rain-puddles-with-ripples-and-reflection/)
