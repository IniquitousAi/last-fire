# Last Fire: Cyberpunk 2077, one to one (research, 2026-10-19)

His ask: make Last Fire feel like Cyberpunk 2077 "as close to one-to-one as possible", plus friends and survival, and go deeper than TweakDB.
This file is values and logic only. We read CD Projekt's own data and the modding community's notes, then rebuild the feel in three.js.
We never paste their files, models, textures or LUTs.

## Where the numbers come from (read this once)

- **The big find: CD Projekt's own tweak sources.** `CDPR-Modding-Documentation/Cyberpunk-Tweaks` on GitHub holds the plain-text `.tweak`
  files that ship with REDmod, the source TweakDB is compiled from. The repo is tagged **v2.3 (2025-07-26)**, so these are current
  2.x numbers, not the 2020 launch game. Its sister repo `CDPR-Modding-Documentation/Cyberpunk-Scripts` holds the game's script sources.
  Every "record" below is a path in those files.
- **What the tweak files do not hold:** per-gun fire rate, aim-in time and lock-on time live in curve files inside the game archives.
  For those I used the Cyberpunk Fandom wiki (read in the browser tab, the site blocks plain fetching) and say so.
- **Units:** meters, seconds, meters per second. Distances in Cyberpunk are real meters, same as ours.
- **Honest gaps:** no CDPR source says anything numeric about wet streets, volumetric fog density or bloom strength; the GDC 2022
  lighting talk is behind a login. Those parts come from the LUT pipeline the modders reverse engineered and from the game's settings, not
  from a number.

## Movement

Our current values for comparison are in `client/main.js` (walk 4.6, sprint 7.4, gravity 20, jump 6.2 m/s, AW exo moves on top).

| What | Cyberpunk value | Record (file) | How we rebuild it |
| --- | --- | --- | --- |
| Gravity | **-16 m/s²** up and down | `baseLocomotionState.upwardsGravity / downwardsGravity / defaultGravity` (`player_state_machine/locomotion/statebase_locomotion.tweak`) | Change our `vy -= 20 * dt` to 16. Floatier than ours by 20%. |
| Player capsule | height 1.8 m, radius 0.4 m; crouch and slide 1.0 m | same file, `capsuleHeight`, `capsuleRadius` | Our eye heights (1.62 / 1.1 / 0.85) already fit inside these. |
| Walk (default move) | **3.5 m/s** max | `PlayerLocomotion.player_locomotion_data_Stand` MaxSpeed (`characters/player/player_locomotion.tweak`) | Ours is 4.6. Cyberpunk's "walk" is a brisk jog; set 3.5. |
| Sprint | **7.5 m/s** | `player_locomotion_data_Sprint` MaxSpeed | Ours 7.4: already right, round to 7.5. |
| Crouch | **1.5 m/s** | `player_locomotion_data_Crouch` | Ours is 4.6 x 0.55 = 2.5. Set 1.5. |
| Crouch sprint | **5 m/s**, accel 10, costs **0.4 stamina** | `player_locomotion_data_CrouchSprint`; `staminaCosts.crouchSprint` (`player.tweak`) | A new state: crouch plus sprint key. Quiet and fast. |
| Aim walk | **1.5 m/s** | `player_locomotion_data_AimWalk` | Aiming slows you to a crawl; ours only drops 35%. |
| Ground accel / decel / brake | **24 / 24 / 48 m/s²**, `lerpSpeedRateToMaxSpeed` 3.0 | `BaseLocomotionStateAccelerationModifier` etc. (`player_locomotion_base.tweak`), `locomotionGround` | Swap our exponential `acc = 14` for a linear 24 m/s² ramp: 0 to sprint in 0.31 s, stop from sprint in 0.16 s (brake 48). |
| Air control | accel **5**, decel **1.3** m/s² | `LocomotionAirAccelerationModifier`, `LocomotionAirDecelerationModifier` | Your momentum carries in the air; you steer only a little. Ours uses 3. |
| Jump | height **1.0 m** (so 5.66 m/s launch at g 16) | `JumpJumpHeightModifier` value 1 | Ours: 6.2 m/s at g 20 = 0.96 m. Same height, slower arc once g is 16. Drop our "each jump shorter" MW rule. |
| Double jump (Reinforced Tendons) | second jump height **2.6**, plus a small speed boost 1 up to 4.5 m/s; **1** extra jump | `DoubleJumpJumpHeightModifier` 2.6, `DoubleJumpSpeedBoostModifier` 1, `...MaxSpeed` 4.5; `doubleJump.numberOfMultiJumps` 1; the implant just sets `BaseStats.HasDoubleJump` 1 (`cyberware/legs/legs_advanced.tweak`, `AdvancedBoostedTendons*`) | Replace the AW boost jump (4 pushes) with one clean second jump. |
| Charged jump (Fortified Ankles) | hold **0.08 s** min, **0.2 s** medium, **0.3 s** max; heights **1.5 / 2.5 / 3.0 m**; max charge rises with gravity **-40** and falls at **-14**; air max speed 6.5, boost 2.5 up to 10.5 | `chargeJump` (`statemachine_locomotion.tweak`), `player_locomotion_data_ChargeJump*` | Hold Space: release picks the height. The -40 up / -14 down is the "punch up, hang, drift down" feel. |
| Dodge (ground dash) | impulse **11 m/s** (6.2 with no stamina), max speed 25, gravity -4 during it, no steering during it | `dodge.dashImpulse`, `impulse`, `impulseNoStamina`, `maxSpeed`, `downwardsGravity`; `player_locomotion_data_Dodge` (MaxSpeed 10, accel 80, decel 90, `AllowMovementInput` 0) | Double-tap a direction (Cyberpunk's input). A hard 11 m/s shove that bleeds off at 90 m/s² in about 0.1 s. Replaces the AW dodge. |
| Air dash | impulse **10 m/s** (11 for the dash variant), **1 per airtime**, gravity -4 while it runs | `dodgeAir.impulse`, `numberOfAirDodges` 1, `airDashImpulse` 11; `player_locomotion_data_DodgeAir` (min 3.5, max 9, accel 55, decel 65) | Same key in the air. The -4 gravity is why the air dash floats. |
| Slide | enter only at **4.3 m/s** or more and within 55 degrees of facing; boost **+3 m/s** capped at **13 m/s**; decel **7.5 m/s²**; at least **0.5 s**; ends under **2.5 m/s**; holding back decelerates x6; camera pitch locked to -15..70 degrees and heading locked | `slide` (`statemachine_locomotion.tweak`), `player_locomotion_data_Slide`, `Slide` camera set (`camera/fppcameraparamsets.tweak`) | Ours is a fixed 0.8 s burst at 9 m/s. Rebuild: on slide, speed = min(13, speed + 3), then lose 7.5 m/s each second. From a 7.5 sprint: 10.5 m/s, about 1.1 s long. |
| Slide jump | jump height 3 during slide state | `player_locomotion_data_Slide` (JumpHeight via SpeedBoost table) | Optional: a jump out of a slide carries the slide speed. |
| Mantle and climb | climb ledges **0.8 to 2.0 m**; tall (over 1.6 m) takes **1.0 s up + 0.3 s over**, mid (over 1.2 m) **0.6 + 0.2**, low **0.3 + 0.1**; detection 1 m ahead | `climb` (`statemachine_locomotion.tweak`) | Raycast forward from chest when Space is held against a wall; lerp the camera up, then over. Good for Earth's tower ruins. |
| Vault | obstacles **0.8 to 1.2 m**, min speed 3.5, landing 0.232 s | `vault` | Same raycast, lower band, keep speed. |
| Landing | regular from 0.2 m, safe up to 1 m, superhero landing from 2.5 m, hard 5 m (0.6 s stun), very hard 10 m, death 20 m | `locomotionAir.*LandingHeight`, `hardLand.duration` | Fall damage and a landing dip scaled by these bands. |
| Superhero landing | crouch in the air above 2 m: slammed down at **-7.5 m/s**, a pressure wave spreading at **15 m/s**, 1.0 s on the ground | `superheroFall.downwardsImpulseStrength`, `superheroLand.propagationRate`, `groundedStateDuration` | Our AW slam already exists; retune it to these numbers and call it the landing. |
| Stamina | pool **100**; sprint **0**, jump **0**, slide **0**; dodge **25**, air dodge **33**; regen waits **1.66 s** (3.66 s when exhausted); exhausted state tied to a 0.33 ratio | `BaseStats.Stamina` (`player_base_stats.tweak`), `staminaCosts` (`player.tweak`), `abstractStaminaState` (`player_state_machine/stamina/statemachine_stamina.tweak`) | Since 2.0, running is free and **shooting costs stamina** (`WeaponTypeToStaminaCost`; snipers x190, smart guns x0.5, tech x1.1). Low stamina means worse aim, not slower legs. Good survival lever. |
| Field of view | default **80 horizontal** on foot, which is **51 vertical** at 16:9 (`fov = 51.f` in the default camera set); limits 40 to 100 | `camera/fppcameraparamsets.tweak` Default; the RED wiki "Camera" page confirms on-foot FOV is horizontal | Ours is `PerspectiveCamera(78)`: three.js FOV is vertical, so 78 vertical is about **111 horizontal**. That alone makes us feel unlike Cyberpunk. Make the slider horizontal, default 80, convert: `vfov = 2*atan(tan(h/2) / aspect)`. |
| Time | 1 game minute = 7.5 real seconds (`realTimeMultiplier` 8): a full day is 3 real hours | `timeSystem.settings` (`time.tweak`) | Use the same day length if our night cycle wants Night City's rhythm. |

## Weapons

**Three gun families.** Every Cyberpunk gun is Power, Tech or Smart. That split is the core of the combat feel.

| What | Value | Record | How we rebuild it |
| --- | --- | --- | --- |
| Headshot bonus by class | assault rifle **+100%** (x2), pistol **+150%** (x2.5), shotgun **+85%** (x1.85), sniper **+300%** (x4); smart pistols **-15 points**, smart rifles **-50**, smart snipers **-100** | `Base_*_RPG_Stats.HeadshotDamageMultiplier` in `items/weapons/ranged/bases/*.tweak`; meaning "+1.0 = 100% bonus" from the RED wiki weapon BaseStats sheet (tested in game) | Our guns use `G.head`; set it per class to these. Smart guns trade headshots for never missing. |
| Power: ricochet | base chance **5%**, **+95%** with the ricochet perk; **1** bounce; bounces off surfaces hit at **0 to 60 degrees**; after the bounce it turns up to **12.5 degrees** (pistols) or **8** (snipers) toward a target | `Base_Power_Handgun_Stats`, `Base_Power_Sniper_Rifle_Stats` (`RicochetChance`, `RicochetCount`, `RicochetTargetSearchAngle`, `RicochetMin/MaxAngle`) | In our raycast: if the hit is world geometry at a glancing angle, reflect once and bend toward the nearest shape inside the cone. A blue-white spark line shows the bounce (no cyan: use violet). |
| Tech: charge | thresholds: **50%** base max, **75%** "fully charged", **100%** overcharge; base `ChargeTime` 1.0 s, effective charge 0.5 | `Base_Tech_Stats` (`base_weapon.tweak`) | Hold fire to charge; a bar fills; release fires. |
| Tech: wall pierce | through-cover damage **x0.5** on snipers (`TechPierceDamageFactor` -0.5), **x0.8** on the Kenshin pistol (-0.2); Kenshin looks for targets inside a **10 degree** cone behind the wall | `Base_Tech_Sniper_Stats`, `Base_Kenshin_Technical_Stats`; `TechPierceChargeLevel` decides how much charge pierces (RED wiki sheet) | Our raycast continues through one wall at half damage when charge passed 75%. Pairs perfectly with the Kiroshi outline (you see them through the wall, you shoot them through the wall). |
| Smart: lock and homing | lock sound at **0 s, 0.29 s, 0.6 s** (so a lock is 0.6 s); lock cone **9 by 9 degrees** on the Yukimura pistol, 6 by 3.33 (hip) / 4 by 5 (aim) on the Ashura sniper; lock drops **1.6 to 2 s** after the target leaves the cone; base hit chance **35%** per bullet on the Yukimura | `SmartGunUIParams.smartAudioEventsDelays` (`smart_gun_config/configs.tweak`), `Base_Yukimura_SmartGun_SmartLink_Stats`, `Base_Ashura_SmartGun_SmartLink_Stats` | Lock = target inside the cone for 0.6 s. Locked bullets steer toward the target, the rest miss on purpose. |
| Smart: bullet path | bullets corkscrew: spiral radius **0.3 m**, one turn every **0.4 to 0.8 s**, spiral ramps in between **0.4 and 1.5 m** from the muzzle; misses fly **-25 to +25 degrees** sideways and **0 to 15** up, never within **10 degrees** of the target; projectile gravity **-5** | `SmartGunMissParams_Default` | Smart rounds are slow visible projectiles, not hitscan. Draw a short pink tracer with this spiral; the spiral is the look. |
| Sniper bullet help | bullet magnetism **0.25 degrees** (1.5 for high velocity); "dead reckoning" corrects up to 25 degrees within **40 m** | `Base_Sniper_Rifle_Misc_Stats`, `Base_*_DeadReckoning_Stats` | A tiny, invisible aim assist for snipers. |
| Tsunami Nekomata (tech sniper) | charge **1.25 s**; 1.7 shots per second; 191 damage per hit; reload 2.0 s; **4** rounds; effective range **90 m**; headshot +300%; armor pierce +50%; can charge from the hip; aim FOV **30**; recoil kick **6.4 to 7.2** hip, **2.45 to 2.8** aimed; hip spread 1.33 to 5.32, **zero** aimed spread | Fandom infobox (2.x); `Base_Nekomata_*` (`rifles/nekomata/base_nekomata.tweak`) | Our futuristic sniper. Huge kick, perfect aimed accuracy, charge to go through walls. |
| Tsunami Rasetsu (Phantom Liberty) | charge **1.5 s**; 0.8 shots per second; 246 per hit; reload 3.6 s; **3** rounds; charged rounds **pass through enemies and bend to hit several at once** | Fandom infobox | Our "boss" version: a charged shot that chains between up to 3 shapes. |
| Aim zoom | `AimFOV` per gun: Yukimura **49**, Kenshin **40**, Nekomata **30**, Ajax rifle **22**, Ashura sniper **12.75** | `Base_*_Aim_Stats` | Units not documented; treat as the aimed camera FOV (the wiki calls it "the illusion of zoom"). Pistols barely zoom; snipers zoom about 4x. Ours zooms every gun by 22 degrees. |
| Gun blur while aiming | the gun model itself goes soft: Nekomata `weaponBlurIntensity` 1.0, near plane 0.27, far plane 0.6, gun vignette 0.136 at radius 0.648; pistols: depth of field 0.5 with near focus 0.12 | `Base_Nekomata` fields; `dofHandgunAiming` (`player.tweak`) | A cheap pass on our second (view model) scene: blur the gun a little while aiming, so the eye goes to the target. |
| Recoil and spread | assault rifle Ajax: kick **0.6 to 0.9**, hip spread **1.0 to 4.0**, aimed **0.25 to 1.0**; Kenshin pistol: kick 0.35 to 0.7, hip 0.66 to 2.64, aimed 0.125 to 0.5. Rifle sway drift 0.6 to 0.9, full drift after 3 kicks | `Base_Ajax_Constant_Stats`, `Base_Kenshin_Constant_Stats`, `Base_Assault_Rifle_Sway_Stats` | The pattern: aimed spread is a quarter of hip spread; max spread is 4x the first shot. Copy those ratios into GUNS. |
| Weapon states | sprint end to ready **0.2 s**; auto reload after **0.3 s** empty; overheat lock 5.5 s; idle animations every 30 s | `notReady.sprintEndDuration`, `noAmmo.timeToAutoReload` (`player_state_machine/weapon/statemachine_weapon.tweak`) | Our sprint-to-fire is 0.21 s (MW): Cyberpunk is 0.2. Keep. |
| Sandevistan (time slow, for the player) | world speed **50%** (Dynalar, 8 s, 55 s cooldown) down to **15%** (Militech Apogee, 6 s, 30 s cooldown); the user is not slowed | `TimeDilationSandevistanTimeScale` and `...Duration` (`system_replacement/sandevistan_advanced.tweak`); percentages from the Fandom pages | Co-op cannot slow the world for one player. Rebuild as a local "overclock": for 6 s your aim sway, recoil and the dark's visible motion are drawn at 15% speed on your screen only, while the server runs normally. Inspiration only. |

## Scanner and HUD

| What | Value | Record | How we rebuild it |
| --- | --- | --- | --- |
| Scanner slow-mo | while scanning, the world runs at **3%** speed and the player at **10%**, but only if an enemy or camera is in view | `focusModeTimeDilation` (`time.tweak`) | Solo: copy exactly. Co-op: we cannot slow a shared world; slow only your own camera input and draw the dark frozen in a still frame for you (your screen, not the server). |
| Scanner zoom | zoom steps **1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.5x** (mouse wheel) | `zoomLevelAbstract.zoomLevels` (`player_state_machine/zoom/statemachine_zoom.tweak`) | Our scan (Z or middle click) gets wheel zoom in these steps. |
| Quickhack screen | world at **1%** for 0.35 s ease | `quickHackScreen` | Inspiration for our build menu: freeze while choosing, solo only. |
| Detection meter | 0 to 100; drawn as an eye that fills from the bottom (`percent * 0.0095` of its height); states Relaxed, Aware, Alerted, Combat; the distance label appears at **10 m** or more; markers fade past **50 m** | `stealthMappins.script` (`Cyberpunk-Scripts`) | Above each shape that is noticing you, a small eye fills in hot pink, then turns red at full. That is the single most recognizable Cyberpunk stealth signal. |
| HUD colors | the HUD's red "Bittersweet" is **(1.176, 0.381, 0.348)**, **brighter than white** (an HDR value over 1), about #FF6158; the blue "ElectricBlue" is #5EF6FF; yellow "Dandelion" (1.119, 0.844, 0.257); background "BlackPearl" #0E0E17; panel reds RedOxide #691617 and Bordeaux #431618 | `ThemeColors.reds` in `psiberx/cp2077-codeware`, which mirrors the game's `main_colors.inkstyle` | **Our swap:** Bittersweet red stays red (#ff3b5c, danger); ElectricBlue becomes violet **#b026ff**; Dandelion yellow becomes hot pink **#ff2a8d**; background #0E0E17 is fine (near black, blue-leaning). The over-1 brightness is how they make text "pop" without a halo: we keep the halo off and just let UI text be the brightest thing on screen. |
| HUD panel recipe | a panel is: darkest background at **61%** opacity, a red tint layer at **7%**, a red frame at **21.7%**, title in Rajdhani **Medium**, **uppercase**, size 50 (ink units), small "fluff" text at 20 | `InGamePopupHeader.reds` (Codeware, built to match the game's own popups) | Our pause menu and prompts: same opacities, violet or pink instead of blue, thin frame lines, no glow. |
| Fonts | main HUD font is **Rajdhani** (`fonts/raj/raj.inkfontfamily`, 19 of the code hits); also **Blender Pro** (long text), **Orbitron**, **Industry**, **Arame Mono** (numbers), a digital readout font | font paths found in mod code on GitHub; fontsinuse confirms Rajdhani | Rajdhani is free (SIL Open Font License) on Google Fonts. Orbitron is already Vigil's logo font. |
| The HUD as optics | red, text heavy, slightly skewed, with chromatic ghosting so it reads as projected on the eye; it glitches when you are hacked | Interface In Game critique (already in LOOK.md) | Our HUD lives on the suit visor: a 1 to 2 px pink/violet split on HUD text edges only (never cyan), and a 0.2 s glitch when the dark hits you. |
| Crosshair and hit marker | the game ships separate crosshair records per gun family | `ui/crosshairs/crosshairs.tweak` | Not mined in depth; a later pass. |

## Look

| What | Value or method | Source | How we rebuild it |
| --- | --- | --- | --- |
| Color grading | the game grades with a **3D LUT** (a real 3D texture, trilinear sampled), input is **ARRI LogC3** encoded HDR in sRGB primaries, tone mapped with the **ACES** RRT and ODT; internal LUT size **48** (Ultra Plus raises it to 64); each weather has its own LUT (for example `base\weather\24h_basic\luts\cp2077_gen_lut_nge_v017.xbm`) | RED wiki "Creating a LUT from scratch" and the archived reverse-engineered pipeline; Ultra Plus `common.ini` `[Rendering/LUT] Size` | We already use `ACESFilmicToneMapping`. Add three's `LUTPass` with our own 3D LUT, made by grading in our palette (pink and violet highlights, violet shadows, no orange or yellow). One LUT for Moon camp, one for Earth night, blended like their weather. |
| Weathers | sunny, fog, pollution, light clouds, cloudy, heavy clouds (plus rain and storm states in the base game) | `24h_weather_*` list in Ultra Plus `variables.lua` | A small weather state machine on the server: each state picks fog density, LUT and wetness. Fog and pollution suit Earth. |
| Rim light on characters | the renderer adds a rim on characters: standard materials specular **1.2**, fresnel **1.3** in vanilla; skin 1.0 / 0.10 / 0.20 | `[Editor/Characters/RimEnhancement/Standard]` defaults noted in Ultra Plus `vanilla.ini` | We already rim the shapes (`MASK_RIM`). This is the proof that Cyberpunk does the same to make bodies read against neon. Keep it, tune strength by distance. |
| Neon signs and screens | emissive brightness is set in EV; modders advise staying **below 4 EV** unless you want to blind people; screens use a parallax layer, scanlines, scroll masks and blink masks | RED wiki "Emissive Material Properties" | Our signs and screens: emissive intensity 2^EV with EV 1 to 3, plus a scanline and slow scroll in the shader. That is the "screen fluff" look for camp terminals. |
| Lights | physically based point, spot and area lights with inverse-square falloff; the world is dense with small lights; without ray tracing only about 10 cast shadows at once | RED wiki "Lights explained"; GDC 2022 session page; LOOK.md | Same budget idea in three.js: many unshadowed point lights (cheap with our fog), 2 or 3 shadowed ones near the player. |
| Wet streets and reflections | ray traced or screen-space reflections, puddles with real reflections; the RT setting also handles reflection probes blending | NVIDIA and CDPR RT articles; Ultra Plus `ReflectionProbeBlend_*` | For us: a roughness map that drops to about 0.1 in puddle masks, plus three's `SSRPass` or a cheap planar reflection on the camp floor only. Expensive; later. |
| Camera optics in the settings | the game offers film grain, chromatic aberration, lens flare, motion blur and depth of field as toggles | the game's graphics menu | We already have grain, edge-only color split and a vignette. Add a lens flare only on the fire and lamps (world light, not UI). |

## Enemies

| What | Value | Record | How we rebuild it |
| --- | --- | --- | --- |
| Hit reactions | damage summed over **0.25 s**: at **15%** of max health the enemy flinches ("impact", **0.2 s**), at **30%** it staggers (**0.4 s**), at **40%** it is knocked down (**2.5 s**); in cover, stagger needs only 25%; at most one reaction per **1.0 s** | `ImpactDamageThreshold` 15, `StaggerDamageThreshold` 30, `KnockdownDamageThreshold` 40 (`characters/npcs/stats/primary_stats.tweak`); the 0.01 x health math, durations and `m_cumulativeDamageUpdateInterval` 0.25 in `hitReactionComponent.script` | Exactly portable to `core/game.js`: track damage per shape in a 0.25 s window; pick flinch, stagger or knockdown; freeze its approach for that long. This is most of why Cyberpunk gunfights feel physical. |
| Toughness classes | Fragile x0.25, Weak x0.5, Regular x1, Tough x1.5, Bulky x2, Unstoppable never reacts | `stat_groups/hitreaction_threshold_modifiers.tweak` | Runner = Weak, walker = Regular, giant = Bulky, watcher = Unstoppable. |
| Wounds and dismemberment | a limb is wounded at **30%** (arms) or **50%** (legs) of health in one hit; any limb or the head comes off at **50%** | `Wound*DamageThreshold`, `Dism*DamageThreshold` | A leg hit over 50% makes the shape limp (speed x0.5); over 50% on the head ends it in a burst of its own dark. No gore assets needed: the shadow body just loses a part. |
| Snipers hit harder in reactions | sniper rounds have `HitReactionFactor` **2** | `Base_Sniper_Rifle_NPC_Stats` | Our sniper doubles the reaction damage it counts. |
| Vision | three stacked cones to **30 m**: a narrow one (1.8 m wide at the far end), a wide one (3.6 m), a very wide one (7.4 m), all at full strength; a lower cone (looking down) at **0.5x**; peripheral **0.4x**: 224 degrees within 2.5 m and 136 degrees within 20 m | `Senses.VisionFar30m*`, `VisionWide30m*`, `VisionVeryWide30m*`, `PeripheralClose`, `PeripheralMedium` (`senses/base_values.tweak`) | Our `SENSE` rules get the same shape: a cone check per shape with these widths and multipliers. |
| Detection speed | default factor **400**, alerted creatures **800**, very fast **4800**; detection drains at factor **20** after a **3 s** cooldown (in combat it drains at **2**, so they barely forget); crouching uses a slower "stealth" curve, sprinting and jumping a faster "attention" curve | `Default`, `AlertedSasquatch`, `VeryFastDetection`, `Combat` presets and the three `DetectionCurve` records | The fill rate itself comes from distance curves we cannot read, so we tune: meter fills at 400 x curve(distance) x cone multiplier x stance; crouch about half, sprint about double. |
| Madness (the cyberpsycho state) | for **20 s** (bosses 30, the worst 60): no cover, no reinforcements, no grenades, no mid or long range; close range only; bosses deal **+25%** (up to +40%) | `Madness`, `BossMadness`, `MandessLevel4*` (`status_effect/cyberpsychosis.tweak`) | A "frenzied" state for our dark: it stops flanking and just charges whoever is closest, hitting 25% harder. Perfect for a night surge in co-op. |

## Build next (ranked: closest to Cyberpunk's feel for the least work)

1. **Field of view to Cyberpunk's.** Slider becomes horizontal degrees, default 80 (51 vertical at 16:9). One line plus a conversion. Today we play at about 111 horizontal, which reads more like a speed shooter than Cyberpunk.
2. **Core movement constants.** Gravity 16, walk 3.5, sprint 7.5, crouch 1.5, aim walk 1.5, linear ground accel 24 / brake 48, air accel 5 / decel 1.3, jump 1.0 m. About ten numbers in `client/main.js`.
3. **Cyberpunk slide.** Enter at 4.3 m/s or more, +3 m/s capped at 13, lose 7.5 m/s per second, at least 0.5 s, exit under 2.5 m/s, camera pitch clamped -15..70. Replaces the fixed 0.8 s burst.
4. **Hit reactions.** 0.25 s damage window; flinch 15% (0.2 s), stagger 30% (0.4 s), knockdown 40% (2.5 s); toughness classes per shape. Lives in `core/game.js`, no new art.
5. **Headshot multipliers by class.** Rifle x2, pistol x2.5, shotgun x1.85, sniper x4. Four numbers in GUNS.
6. **Dodge, air dash and a stamina pool.** Double-tap dodge at 11 m/s for 25 stamina, one air dash at 10 m/s for 33, regen after 1.66 s (3.66 s when empty); shooting costs stamina, running does not. Replaces the AW exo dodge.
7. **Double jump and charged jump.** Second jump (Reinforced Tendons) and hold-to-charge (0.08 / 0.2 / 0.3 s to 1.5 / 2.5 / 3.0 m, up at -40, down at -14). Replaces the AW boost jump; the slam stays as the superhero landing.
8. **Detection eye over each shape.** The 0..100 meter as a pink eye that fills from the bottom, red at full, distance label from 10 m. Uses our existing `SENSE` code plus the cone shapes above.
9. **The tech sniper.** Nekomata numbers: 1.25 s charge, 75% charge pierces one wall at half damage, x4 headshot, 4 rounds, big kick, zero aimed spread. Pairs with the scanner outline.
10. **HUD restyle in Cyberpunk's grammar.** Rajdhani, the 61% / 21.7% panel recipe, our pink and violet swaps, uppercase titles, no glow. Then the scanner wheel-zoom steps (1 to 6.5x) and the solo-only 3% slow-mo.

After those: smart pistol (0.6 s three-beep lock, 9 degree cone, corkscrew rounds), power ricochet, gun blur while aiming, mantle and vault, our own 3D LUT per weather, the Madness surge.

## Sources

CD Projekt's own data (read through the GitHub API, nothing saved into the project):
- Tweak sources, v2.3: https://github.com/CDPR-Modding-Documentation/Cyberpunk-Tweaks
  - movement: `tweaks/base/gameplay/static_data/database/characters/player/player_locomotion.tweak`, `player_locomotion_base.tweak`
  - movement logic: `tweaks/base/gameplay/static_data/player_state_machine/locomotion/statebase_locomotion.tweak`, `statemachine_locomotion.tweak`
  - stamina: `player_state_machine/stamina/statemachine_stamina.tweak`, `static_data/player.tweak` (`staminaCosts`, depth of field sets)
  - camera: `static_data/camera/fppcameraparamsets.tweak`; zoom: `player_state_machine/zoom/statemachine_zoom.tweak`
  - time slow: `static_data/time.tweak`; Sandevistan: `database/items/cyberware/system_replacement/sandevistan_advanced.tweak`
  - legs cyberware: `database/items/cyberware/legs/legs_advanced.tweak`
  - weapons: `database/items/weapons/ranged/bases/base_weapon.tweak`, `base_handgun.tweak`, `base_rifle_assault.tweak`, `base_rifle_sniper.tweak`, `base_shotgun.tweak`, `rifles/nekomata/base_nekomata.tweak`, `rifles/ashura/base_ashura.tweak`, `rifles/ajax/base_ajax.tweak`, `handguns/yukimura/base_yukimura.tweak`, `handguns/kenshin/base_kenshin.tweak`, `database/stats/weapon_stats/weapon_stats.tweak`, `database/items/weapons/smart_gun_config/configs.tweak`
  - enemies: `database/characters/npcs/stats/primary_stats.tweak`, `database/stats/stat_groups/hitreaction_threshold_modifiers.tweak`, `database/senses/base_values.tweak`, `database/status_effect/cyberpsychosis.tweak`
- Script sources: https://github.com/CDPR-Modding-Documentation/Cyberpunk-Scripts (`scripts/cyberpunk/NPC/components/hitReactionComponent.script`, `scripts/cyberpunk/UI/mappins/stealthMappins.script`)

Modding community:
- RED Modding wiki index: https://wiki.redmodding.org/cyberpunk-2077-modding/llms.txt
- Weapon BaseStats (tested in game): https://wiki.redmodding.org/cyberpunk-2077-modding/for-mod-creators-theory/references-lists-and-overviews/cheat-sheet-tweak-ids/weapons/cheat-sheet-weapon-basestats
- Camera (FOV is horizontal on foot): https://wiki.redmodding.org/cyberpunk-2077-modding/for-mod-creators-theory/files-and-what-they-do/camera
- Lights explained: https://wiki.redmodding.org/cyberpunk-2077-modding/for-mod-creators-theory/files-and-what-they-do/lights-explained
- Emissive materials: https://wiki.redmodding.org/cyberpunk-2077-modding/for-mod-creators-theory/materials/configuring-materials/emissive-material-properties
- LUTs: https://wiki.redmodding.org/cyberpunk-2077-modding/modding-guides/textures-and-luts/creating-a-lut-from-scratch and its archived "Advanced: Reverse-Engineered LUT pipeline" page
- Codeware (psiberx), HUD colors and popup recipe: https://github.com/psiberx/cp2077-codeware (`scripts/UI/Styles/ThemeColors.reds`, `scripts/UI/Popups/InGamePopupHeader.reds`)
- Cyberpunk Ultra Plus (sammilucia), renderer settings: https://github.com/sammilucia/cyberpunk-ultra-plus (`config/common.ini`, `config/vanilla.ini`, `helpers/variables.lua`)
- Fandom wiki (2.x stats, read in the browser): https://cyberpunk.fandom.com/wiki/Tsunami_Nekomata , https://cyberpunk.fandom.com/wiki/Tsunami_Rasetsu , https://cyberpunk.fandom.com/wiki/Reinforced_Tendons , https://cyberpunk.fandom.com/wiki/Lynx_Paws , https://cyberpunk.fandom.com/wiki/Focus , https://cyberpunk.fandom.com/wiki/Militech_Apogee , https://cyberpunk.fandom.com/wiki/Dynalar_Sandevistan
- Fonts: https://www.fontsinuse.com/uses/60926/cyberpunk-2077-video-game
- GDC 2022 "Bringing Light to Night City" (session page only, slides gated): https://gdcvault.com/play/1027959/Advanced-Graphics-Summit-Cyberpunk-2077

Other tools named in the ask, and what they are for us: WolvenKit (opens game archives: where curves and LUT textures live), Cyber Engine Tweaks and redscript (run and change logic in the live game), TweakXL (edit records like the ones above), ArchiveXL, RED4ext and Codeware (frameworks). We need none of them installed: the two CDPR source repos already give the values in plain text.
