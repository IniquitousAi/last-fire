// Last Fire (the new foundation), piece 1: drawing, sound and input around the rules in core/game.js.
// The rules run here as host; nothing in this file decides what happens, only what you see, hear and send in.
import * as THREE from 'three';
import * as C from '../core/game.js?v=164';
import { Ambience } from './ambience.js?v=164';
import { Camp, BOARD } from './camp.js?v=164';
import { Guide } from './guide.js?v=164';
import { buildSites } from './earthsite.js?v=164';
import { Truck } from './truck.js?v=164';
import { ShipView } from './shipview.js?v=164';
import { Crew } from './crew.js?v=164';
import { Hands } from './hands.js?v=164';
import { FpRig } from './fprig.js?v=164';
import { farStep } from './farsound.js?v=164';
import { Wrist } from './wrist.js?v=164';
import { FireCore } from './firecore.js?v=164';
import { EffectComposer } from '../../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../../vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../vendor/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from '../../vendor/jsm/postprocessing/ShaderPass.js';
import { think as friendThink } from './friend.js?v=164';
import { FriendVoice } from './friendvoice.js?v=164';
import { crewFrom } from '../core/habits.js?v=164';
import { HudLook } from './hudlook.js?v=164';
import { Rain } from './rain.js?v=164';
import { VisorRain } from './visor.js?v=164';
import { applyLook } from './looks.js?v=164';
import { Net, roomCode, cleanCode, CODE_LEN, MAX_PLAYERS } from './net.js?v=164';
import { sound, GUNS } from '../../src/combat.js?v=164';
import { FX } from '../../src/fx.js?v=164';
import { GLTFLoader } from '../../vendor/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from '../../vendor/jsm/utils/SkeletonUtils.js';

const $ = id => document.getElementById(id);
const BUILD = 164;   // (this copy's version; ./version.json says the newest)
const DEFAULTS = { sens: 1, vol: 0.8, fov: 78, adsSens: 0.65, aimToggle: true, sprintToggle: false, invertY: false, autoReload: true, cross: true };   // (his quality of life ask, 2026-10-19: aim is a toggle by default, and every one of these is a click in the pause menu)
const SET = Object.assign({ ...DEFAULTS, name: '' }, (() => { try { return JSON.parse(localStorage.getItem('lastfire2') || '{}'); } catch (e) { return {}; } })());
const save = () => { try { localStorage.setItem('lastfire2', JSON.stringify(SET)); } catch (e) {} };
sound.setVolume(SET.vol);

// ---------------------------------------------------------------- renderer and the sky (always the dark: awe overhead, the light is yours)
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, 0.05, 900);
const composer = new EffectComposer(renderer), renderPass = new RenderPass(scene, camera), bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.5, 0.82); composer.addPass(renderPass); composer.addPass(bloom);
// the grade (LOOK.md change 1: Cyberpunk 2077 vibes inside his palette). One pass over the world only (the HUD is page, not picture): warm hues
// rotate to red and pink so orange and yellow cannot appear on any model, shadows lean violet, fine grain lives in the dark, the colors split only
// at the outer edge of the lens, and a light vignette. All math, no texture: three reads a pixel.
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uS: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uT; uniform float uS; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec2 d = vUv - 0.5; float r = length(d) * 1.414, ca = smoothstep(0.7, 1.0, r) * (0.004 + 0.012 * uS);
      vec3 c = vec3(texture2D(tDiffuse, vUv - d * ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + d * ca).b);
      float mx = max(c.r, max(c.g, c.b)), w = clamp((min(c.r, c.g) - c.b) / (mx + 1e-4), 0.0, 1.0) * step(c.g, c.r * 1.15);
      c.g = mix(c.g, c.b, w * 0.8); c.b += w * 0.22 * c.r;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c += vec3(0.010, 0.0, 0.024) * (1.0 - smoothstep(0.0, 0.12, l));
      c += (h(vUv * 917.0 + fract(uT) * 37.0) - 0.5) * 0.018 * (1.0 - smoothstep(0.0, 0.35, l));
      { float sl = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(c, vec3(sl * 0.75, sl * 0.55, sl * 1.25), uS * 0.45); }   /* (slow time: the world drains toward violet, the edges split more) */
      c *= 1.0 - (0.18 + 0.22 * uS) * smoothstep(0.55, 1.15, r); gl_FragColor = vec4(max(c, 0.0), 1.0); }` });
composer.addPass(grade); const visor = new ShaderPass(VisorRain); visor.uniforms.uRes.value.set(innerWidth, innerHeight); composer.addPass(visor); composer.addPass(new OutputPass());   // (rain on the visor, Earth only: world image only, never the HUD)
const softDot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();   // (round, soft points: embers and motes were square specks)
scene.fog = new THREE.FogExp2(0x04060c, 0.016); scene.background = new THREE.Color(0x02030a);
const rain = new Rain(scene); const hemi = new THREE.HemisphereLight(0x5a6fb0, 0x020306, 0.09); scene.add(hemi); const FOG_NIGHT = new THREE.Color(0x04060c), FOG_EARTH_DAY = new THREE.Color(0x30333b);   // (barely any moonlight: the dark is dark, the light is yours)
// the sky's logic, given to everything (his rule: the sky is the reference for pretty). Research: small bright accents read on large dark
// fields, saturation shows in the dark (Hunt 2001), rim light separates a form from a dark background. So objects stay dark and get a thin
// violet edge, taken from the sky's own violet, fading past 60 m; the ground gets rare mineral glints, stars underfoot.
THREE.ShaderChunk.emissivemap_fragment += `
#ifdef USE_RIM
  { float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 6.0), rimD = smoothstep(60.0, 6.0, length(vViewPosition));
    #ifdef RIM_COLOR
    totalEmissiveRadiance += RIM_COLOR * rimF * rimD * 1.3;   /* (a mask's own edge color, stronger: the thing you must read first) */
    #else
    totalEmissiveRadiance += vec3(0.48, 0.30, 1.0) * rimF * rimD * 0.7;
    #endif
    }
#endif`;
function rimAll() { scene.traverse(o => { if (!o.isMesh || !o.material || o.material === groundMat) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m.isMeshStandardMaterial && !m.userData.rim) { m.userData.rim = 1; m.defines = { ...(m.defines || {}), USE_RIM: '' }; m.needsUpdate = true; } }); }
setInterval(() => { if (g) rimAll(); }, 2000);   // (new things get their edge within two seconds; a material is changed once)
const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uT: { value: 0 }, uEarth: { value: 0 }, uDay: { value: 0 }, uFog: { value: scene.fog.color } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec3 vD; uniform float uT; uniform float uEarth; uniform float uDay; uniform vec3 uFog;
    float h(vec3 p){ p = fract(p * 0.3183 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float n(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
    void main(){
      vec3 d = normalize(vD); float up = clamp(d.y, -0.2, 1.0);
      vec3 col = mix(vec3(0.006, 0.008, 0.02), vec3(0.0, 0.0, 0.004), up);
      float neb = fbm(d * 2.6 + vec3(0.0, uT * 0.004, 0.0)), band = exp(-pow((d.y - 0.25 + 0.3 * d.x) * 2.6, 2.0));
      float lane = 1.0 - 0.75 * exp(-pow((d.y - 0.25 + 0.3 * d.x) * 9.0, 2.0)) * smoothstep(0.35, 0.7, fbm(d * 7.0 + 3.0));   /* (a dark dust lane through the band, like the Visualizer's galaxy) */
      col += band * lane * (vec3(0.05, 0.03, 0.14) * smoothstep(0.35, 0.8, neb) + vec3(0.02, 0.025, 0.12) * smoothstep(0.5, 0.9, fbm(d * 5.0 + 3.0)) + vec3(0.09, 0.01, 0.06) * smoothstep(0.62, 0.95, fbm(d * 3.3 - 7.0)));
      /* stars the Visualizer's way (his reference, 2026-10-19): round points set off-center in their cells, never whole squares. A dense faint dust
         thicker in the band, mid stars that twinkle, and rare near ones with a thin four-point glint. White, some violet or pink, never cyan. */
      float sky = smoothstep(0.0, 0.45, d.y); vec3 fg = d * 420.0, fid = floor(fg); float fr = h(fid);
      float stars = smoothstep(0.972 - 0.03 * band, 0.985, fr) * smoothstep(0.55, 0.0, length(fract(fg) - 0.5)) * 0.75 * (0.6 + band);
      vec3 mg = d * 170.0, mid = floor(mg); float mr = h(mid); vec3 mo = vec3(h(mid + 3.3), h(mid + 5.7), h(mid + 9.1)) - 0.5;
      float midS = smoothstep(0.982, 0.986, mr) * smoothstep(0.32, 0.0, length(fract(mg) - 0.5 - mo * 0.5)) * (0.6 + 0.4 * sin(uT * (2.0 + mr * 5.0) + mr * 80.0));
      vec3 ng = d * 38.0, nid = floor(ng); float nr = h(nid); vec3 nf = fract(ng) - 0.5;
      float nearS = step(0.988, nr) * (exp(-dot(nf, nf) * 1400.0) + 0.22 * exp(-abs(nf.x) * 110.0 - abs(nf.y) * 12.0) + 0.22 * exp(-abs(nf.y) * 110.0 - abs(nf.x) * 12.0));
      vec3 tint = mix(vec3(1.0, 0.94, 1.0), mix(vec3(0.72, 0.66, 1.0), vec3(1.0, 0.62, 0.86), step(0.5, h(mid + 2.0))), step(0.7, h(mid + 1.0)));
      col += (vec3(0.92, 0.9, 1.0) * stars + tint * midS * 1.6 + vec3(1.0, 0.95, 1.0) * nearS * 1.3) * sky;
      if (uEarth > 0.5 && uDay > 0.0) {   /* Earth's day is overcast: a low dark-gray deck that breaks a little, the stars gone behind it (his picture: dark gray, fog mixed with dark) */
        float cl = fbm(vec3(d.xz / max(d.y + 0.25, 0.08) * 0.9, uT * 0.01)), deck = mix(0.82, 1.18, smoothstep(0.3, 0.75, cl));
        vec3 over = mix(vec3(0.2, 0.205, 0.235), vec3(0.34, 0.345, 0.385), smoothstep(-0.05, 0.7, d.y)) * deck;   /* (look 3 keeps true blacks: under about 0.15 the deck crushed to black) */
        col = mix(col, over, uDay); }
      col = mix(uFog, col, smoothstep(-0.03, 0.24, d.y));   /* (the horizon is the fog's own color, so far ground and sky are one haze: no seam where the stars stop, his note 2026-10-19) */
      // Earth, seen from the Moon: blue where it is still itself, black where the dark has taken it, thin violet where the two meet (PLAN-SPACE.md)
      vec3 E = normalize(vec3(0.6, 0.22, -0.78)); float R = 0.15, a = acos(clamp(dot(d, E), -1.0, 1.0));
      vec3 t1 = normalize(cross(E, vec3(0.0, 1.0, 0.0))), t2 = cross(t1, E); vec2 q = vec2(dot(d, t1), dot(d, t2)) / sin(R); float r2 = dot(q, q);
      if (uEarth > 0.5) { float m = acos(clamp(dot(d, E), -1.0, 1.0)); if (m < 0.05) { vec2 mq = vec2(dot(d, t1), dot(d, t2)) / sin(0.05); vec3 MN = normalize(mq.x * t1 + mq.y * t2 - sqrt(max(0.0, 1.0 - dot(mq, mq))) * E); col = vec3(0.55, 0.58, 0.66) * (0.25 + 0.75 * max(dot(MN, normalize(t1 * 0.85 + t2 * 0.25 - E * 0.35)), 0.0)) * (0.7 + 0.3 * fbm(MN * 6.0)); } r2 = 2.0; R = 0.05; }   /* (from Earth: the Moon, small and gray, where home is) */
      if (r2 < 1.0) {
        vec3 N = normalize(q.x * t1 + q.y * t2 - sqrt(1.0 - r2) * E); float sp = uT * 0.008, cs = cos(sp), sn = sin(sp); vec3 P = vec3(N.x * cs - N.z * sn, N.y, N.x * sn + N.z * cs);
        vec3 L = normalize(t1 * 0.85 + t2 * 0.25 - E * 0.35); float lit = max(dot(N, L), 0.0);
        float land = smoothstep(0.5, 0.58, fbm(P * 2.2)), dark = smoothstep(0.43, 0.48, fbm(P * 1.5 + vec3(0.0, uT * 0.003, 0.0)));
        vec3 surf = mix(vec3(0.03, 0.07, 0.46), vec3(0.13, 0.1, 0.26), land) * (0.06 + lit * 1.15);   /* (deep blue seas, violet land; no shine: matte, like a planet seen from far) */
        float edge = exp(-pow((fbm(P * 1.5 + vec3(0.0, uT * 0.003, 0.0)) - 0.455) * 70.0, 2.0)) * (0.6 + 0.4 * sin(uT * 0.7 + P.x * 30.0));
        col = mix(surf, vec3(0.0), dark) + vec3(0.55, 0.18, 0.85) * edge * 0.55;
      }
      { vec2 qn = normalize(vec2(dot(d, t1), dot(d, t2)) + 1e-5); vec3 NL = qn.x * t1 + qn.y * t2; float sl = uT * 0.008; vec3 PL = vec3(NL.x * cos(sl) - NL.z * sin(sl), NL.y, NL.x * sin(sl) + NL.z * cos(sl));
        float gone = smoothstep(0.43, 0.48, fbm(PL * 1.5 + vec3(0.0, uT * 0.003, 0.0)));   /* (where the dark has eaten the limb, its air is gone too: the rim breaks, and you can see the takeover) */
        col += mix(vec3(0.3, 0.2, 1.0), vec3(0.55, 0.18, 0.85) * 0.5, gone) * (1.0 - 0.85 * gone) * exp(-pow((a - R) * 230.0, 2.0)) * 0.6; }
      gl_FragColor = vec4(col, 1.0);
    }` }));
scene.add(sky);

// ---------------------------------------------------------------- the game (rules) and you
const amb = new Ambience(() => SET.vol); amb.onCrackle = () => { if (fireObj) fireObj.flare(0.55); };   // (what you hear and what you see agree: each crackle makes the flame jump)
const clickPlay = document.createElement('div'); clickPlay.hidden = true;   // (mouse free: the suit's aim link is on standby; a click links it again. A reason in the world, not a sign on the glass)
clickPlay.innerHTML = '<div style="font-size:12px;letter-spacing:.22em;color:#ff4fd8">AIM LINK  ·  STANDBY</div><div style="font-size:12px;letter-spacing:.06em;color:#a3a6bb;margin-top:1px">click to link your aim</div>';   /* (the reticle itself dims on standby: his note, 2026-10-19, a second ring here made a double crosshair) */
Object.assign(clickPlay.style, { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, 22px)', textAlign: 'center', font: '400 15px "Barlow Condensed", sans-serif', pointerEvents: 'none', zIndex: 3, textShadow: '0 1px 3px #000' });
document.body.append(clickPlay);
let truck = null, ship = null, sitesBuilt = false, camp = null, guide = null, g = null, me = null, mode = 'menu', panel = null, fx = new FX(scene), net = null, myId = 1;
const isHost = () => !net || net.host;
const keys = {}, mouse = [false, false, false]; let padOn = false, padMove = { f: 0, s: 0 }, padSprint = false;   // (padOn: a controller is in use, so play runs without the mouse lock)
const NODE_MAX = 24;   // (the ground shader lights from up to 24 lights at once: the fire, your glow, the nearest nodes)
const uLights = { value: Array.from({ length: NODE_MAX }, () => new THREE.Vector4(0, 0, 0, 0)) };
// lamp shadows (his pick, 2026-10-19; INNOVATION.md idea 2): the rule decides where light is blocked (core shadowed: camp pieces taller than a
// person), and the ground shows exactly that. A 192 x 192 map over the camp (25 cm a texel) holds lit-with-shadows over lit-without, built
// 8 rows a frame (about 0.4 s) only when the lights or the pieces change; the ground multiplies the fire's and the nodes' light by it
const SHADE = { N: 192, half: 24, key: '', row: 192, occ: -1 }; SHADE.back = new Uint8Array(SHADE.N * SHADE.N).fill(255);
SHADE.tex = new THREE.DataTexture(new Uint8Array(SHADE.N * SHADE.N).fill(255), SHADE.N, SHADE.N, THREE.RedFormat); SHADE.tex.magFilter = SHADE.tex.minFilter = THREE.LinearFilter; SHADE.tex.needsUpdate = true;
const uShade = { value: SHADE.tex }, uShadeBox = { value: new THREE.Vector3(0, 0, SHADE.half) };
function updateShade() { if (!g || C.onEarth(me)) return;
  if (camp && camp.solids && camp.solids.length !== SHADE.occ) { SHADE.occ = camp.solids.length; C.setOccluders(camp.solids.filter(q => q[6] > 1.8).map(([x, z, hx, hz, cs, sn]) => ({ x, z, w: 2 * hx, d: 2 * hz, ry: Math.atan2(sn, cs) }))); }
  const f = g.fire, key = SHADE.occ + '|' + Math.round(C.fireRadius(f) * 2) + (f.fuel > 0) + '|' + g.nodes.filter(n => n.lit && !C.onEarth(n)).map(n => n.id).join(',');
  if (key !== SHADE.key) { SHADE.key = key; SHADE.row = 0; }
  if (SHADE.row >= SHADE.N) return; const N = SHADE.N, cell = 2 * SHADE.half / N, end = Math.min(N, SHADE.row + 8);
  for (let r = SHADE.row; r < end; r++) { const z = -SHADE.half + (r + 0.5) * cell; for (let c = 0; c < N; c++) { const x = -SHADE.half + (c + 0.5) * cell, lu = C.lightAt(g, x, z, true, true);
    SHADE.back[r * N + c] = lu > 0.002 ? Math.round(255 * Math.min(1, C.lightAt(g, x, z, true) / lu)) : 255; } }
  SHADE.row = end; if (end === N) { SHADE.tex.image.data.set(SHADE.back); SHADE.tex.needsUpdate = true; } }

// ---------------------------------------------------------------- the land: endless, in 32 m tiles built around you as you walk
const TILE = 32, RES = 33, VIEW = 4, NEAR = 1.6, tiles = new Map();   // (to 128 m: the fog hides everything past about 130 m; tiles past the first ring at a quarter of the detail)
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
// the ground's surface (his ask, 2026-10-19: a world that looks decent): Poly Haven's gray_rocks and ambientCG's Rock035, both CC0 photo scans,
// laid in world space and blended by a slow noise, so the land reads as real stone and never repeats in a grid
const rockTex = u => { const t = new THREE.TextureLoader().load('../assets/tex/' + u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const uRock = { value: rockTex('gray_rocks_diff_1k.jpg') }, uDark = { value: rockTex('Rock035_1K-JPG_Color.jpg') };
groundMat.onBeforeCompile = sh => { sh.uniforms.uRock = uRock; sh.uniforms.uDark = uDark;   // (light from the network lights the ground: one loop over a small array, no extra lamps)
  sh.uniforms.uLights = uLights; sh.uniforms.uShade = uShade; sh.uniforms.uShadeBox = uShadeBox;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
    varying vec3 vW; uniform vec4 uLights[${NODE_MAX}]; uniform sampler2D uShade; uniform sampler2D uRock, uDark; uniform vec3 uShadeBox;
    float gh(vec3 p){ p = fract(p * 0.3183 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float gn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(gh(i), gh(i + vec3(1,0,0)), f.x), mix(gh(i + vec3(0,1,0)), gh(i + vec3(1,1,0)), f.x), f.y), mix(mix(gh(i + vec3(0,0,1)), gh(i + vec3(1,0,1)), f.x), mix(gh(i + vec3(0,1,1)), gh(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
    .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 0.55 + gn(vW * 0.35) * 0.35 + gn(vW * 1.7) * 0.3 + gn(vW * 7.0) * 0.2; vec3 rk = mix(texture2D(uRock, vW.xz * 0.22).rgb, texture2D(uDark, vW.xz * 0.15).rgb * 1.3, smoothstep(0.35, 0.65, gn(vW * 0.05))); diffuseColor.rgb *= rk * 1.9;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      vec2 su = (vW.xz - uShadeBox.xy) / (2.0 * uShadeBox.z) + 0.5; float shd = (su.x > 0.0 && su.y > 0.0 && su.x < 1.0 && su.y < 1.0) ? texture2D(uShade, su).r : 1.0;   /* (the rule's shadows: on the fire and the nodes, never on your own glow, the truck's lamps or a flare) */
      float L = 0.0, FLR = 0.0; for (int i = 0; i < ${NODE_MAX}; i++) { vec4 q = uLights[i]; if (q.z <= 0.0) continue; float d = length(vW.xz - q.xy) / q.z; if (i == 3 || i == 4) { FLR += q.w * (1.0 - smoothstep(0.0, 1.0, d)) * (1.0 - smoothstep(0.0, 0.5, d) * 0.5); continue; }   /* (a flare's light is its own red, not the network's white) */ L += (i == 0 || i >= 5 ? shd : 1.0) * q.w * (1.0 - smoothstep(0.0, 1.0, d)) * (1.0 - min(d, 1.0) * 0.4); /* edges in order: a reversed smoothstep is undefined on some cards */ }
      totalEmissiveRadiance += diffuseColor.rgb * vec3(0.7, 0.82, 1.25) * min(L, 1.4) * 0.8; totalEmissiveRadiance += diffuseColor.rgb * vec3(2.2, 0.25, 0.45) * min(FLR, 1.4);
      /* wet ground that doubles every light (LOOK.md change 3): coolant and condensation pool near the camp's lights; in a puddle each light lays a
         streak toward your eye, the way a wet street doubles a neon sign. No reflection pass: one more loop over the same few lights */
      float wet = smoothstep(0.44, 0.6, gn(vW * 0.21)) * smoothstep(0.04, 0.25, L), st = 0.0;
      if (wet > 0.001) for (int i = 0; i < ${NODE_MAX}; i++) { vec4 q = uLights[i]; if (q.z <= 0.0) continue; vec2 cl = q.xy - cameraPosition.xz; float D = length(cl); if (D < 0.6) continue;
        vec2 dir = cl / D, rp = vW.xz - cameraPosition.xz; float along = dot(rp, dir), lat = abs(rp.x * dir.y - rp.y * dir.x), w = 0.4 + along * 0.07;
        st += q.w * smoothstep(0.0, D * 0.3, along) * (1.0 - smoothstep(D * 0.8, D * 1.03, along)) * exp(-(lat * lat) / (w * w)); }
      totalEmissiveRadiance += vec3(0.85, 0.42, 1.0) * wet * min(st, 1.4) * 0.55 + vec3(0.06, 0.05, 0.1) * wet * min(L, 1.0);
      float far = smoothstep(55.0, 140.0, length(vW.xz - cameraPosition.xz)); float vein = smoothstep(0.82, 0.97, gn(vW * 0.09 + vec3(0.0, 0.0, 0.0))) * smoothstep(0.35, 0.8, gn(vW * 0.031));
      vec3 hue = mix(vec3(0.48, 0.30, 1.0), vec3(0.95, 0.3, 1.0), gn(vW * 0.013)); totalEmissiveRadiance += hue * vein * far * 0.55;   /* (the far dark glows in colors that should not exist) */
      totalEmissiveRadiance += vec3(0.75, 0.7, 1.0) * step(0.9965, gh(floor(vW * 5.0))) * (1.0 - far) * 0.0;   /* (rare mineral glints: the stars, underfoot) */`);
};
// the look: dev light by default (his pick, 2026-10-19 10:27: plain readable light first); ?look=3 is the cinematic night, ?look=0 the old look
C.DARK.off = !/[?&]enemies(&|=|$)/.test(location.search);   // (enemies out until rebuilt as real models, his call 2026-10-19; ?enemies brings the old ones back)
const lookFx = applyLook(+(new URLSearchParams(location.search).get('look') ?? 4), { THREE, renderer, scene, camera, composer, renderPass, bloom, grade, groundMat });
function buildTile(tx, tz, res = RES) {
  const geo = new THREE.PlaneGeometry(TILE, TILE, res - 1, res - 1); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + tx * TILE, z = pos.getZ(i) + tz * TILE, y = g.land(x, z); pos.setY(i, y);
    const far = Math.min(1, Math.min(Math.hypot(x, z), Math.hypot(x - C.EARTH.x, z - C.EARTH.z)) / 1500)   /* (from the nearest home: Earth sits 6 km out, so it had gone all violet, his 'everything purple' 2026-10-19) */, slope = Math.min(1, Math.abs(g.land(x + 1, z) - y) + Math.abs(g.land(x, z + 1) - y));
    const base = [0.12 + slope * 0.07, 0.135 + slope * 0.07, 0.17 + slope * 0.06];   // (cold ash and stone; far land drifts toward violet)
    col.set([base[0] + far * 0.08, base[1] - far * 0.03, base[2] + far * 0.12], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, groundMat); m.position.set(tx * TILE, 0, tz * TILE); m.matrixAutoUpdate = false; m.updateMatrix(); scene.add(m); return m;
}
function updateTiles() {   // (two tiles a frame at most, nearest first; tiles past the view are dropped)
  const cx = Math.round(me.x / TILE), cz = Math.round(me.z / TILE), want = [];
  for (let dz = -VIEW; dz <= VIEW; dz++) for (let dx = -VIEW; dx <= VIEW; dx++) if (dx * dx + dz * dz <= VIEW * VIEW) { const k = (cx + dx) + ',' + (cz + dz), res = dx * dx + dz * dz <= NEAR * NEAR ? RES : 17, t = tiles.get(k); if (!t || t.res !== res) want.push([dx * dx + dz * dz, cx + dx, cz + dz, k, res]); }
  want.sort((a, b) => a[0] - b[0]); for (const [, x, z, k, res] of want.slice(0, 2)) { const old = tiles.get(k); if (old) { scene.remove(old.m); old.m.geometry.dispose(); } tiles.set(k, { m: buildTile(x, z, res), res }); }
  for (const [k, t] of tiles) { const [x, z] = k.split(',').map(Number); if ((x - cx) ** 2 + (z - cz) ** 2 > (VIEW + 1.5) ** 2) { scene.remove(t.m); t.m.geometry.dispose(); tiles.delete(k); } }
  return want.length;
}

// ---------------------------------------------------------------- models (every one CC0: assets/CREDITS.txt)
const loader = new GLTFLoader(), models = {};
const load = (k, url) => loader.loadAsync('../assets/' + url).then(r => { models[k] = r; }).catch(e => console.warn('model', k, e));
const ready = Promise.all([load('wraith', 'c/wraith.glb'), load('mutant', 'zombie/mutant.glb'), load('clawed', 'c/clawed.glb'), load('shard', 'c/shard.glb'), load('pistol', 'm/pistol.glb'), load('ar', 'm/ar.glb'), ...(/[?&]nofp(&|$)/.test(location.search) ? [] : [load('fp_rifle', 'fp/rifle_fp.glb')]),   /* (the Blender rifle and arms are the default since v155, his rule: the newest rig is never behind a switch) */ load('fp_rail', 'fp/sniper_fp.glb'), load('shotgun', 'm/shotgun.glb'), load('lmg', 'm/lmg.glb'), load('campfire', 'kit/campfire.glb'), load('lantern', 'm/lantern.glb'), load('soldier', 'c/soldier.glb')]);
const MASK_RIM = { walker: 'vec3(0.62, 0.38, 1.0)', runner: 'vec3(1.0, 0.25, 0.65)', watcher: 'vec3(0.85, 0.85, 1.0)', face: 'vec3(1.0, 0.3, 0.85)', giant: 'vec3(1.0, 0.18, 0.25)' };
function darken(root, eyes, kind) {   // (the wraiths are drawn as shadow: near black, pale where their eyes are)
  root.traverse(o => { if (!o.isMesh) return; o.frustumCulled = false; const m = o.material = o.material.clone(); if (/Eye_White|Secondary/.test(m.name)) { m.color.setHex(0x030305); m.emissive = new THREE.Color(0); m.emissiveIntensity = 0; }   /* (no cartoon eyeballs or grins: black, so the face reads as a hollow) */ else if (/Eye_Black/.test(m.name)) { m.color.setHex(eyes); m.emissive = new THREE.Color(eyes); m.emissiveIntensity = 3; }   /* (only the pupils burn: pinpoint eyes, like the stars) */ else { m.color.setHex(0x07070c); m.emissive = new THREE.Color(0x0a0c18); m.emissiveIntensity = 0.3; m.roughness = 0.9; if (MASK_RIM[kind]) { m.userData.rim = 1; m.defines = { ...(m.defines || {}), USE_RIM: '', RIM_COLOR: MASK_RIM[kind] }; m.needsUpdate = true; } } /* (a faint cold rim so a shape reads against the dark) */ });
}

// ---------------------------------------------------------------- the Hollow as you see them: a pool of animated wraiths, one per Hollow
const seen = new Map();
// the Kiroshi scan (Cyberpunk 2077, his north star, 2026-10-19): middle mouse or Z pings the dark; every shape within 30 m shows as a violet outline
// for 2 s, 8 s between scans. Seeing is not hitting: out of the light they stay smoke
const SCAN = { r: 30, t: 2, cd: 8, color: 0x8a5cff }; let scanCd = 0;
function scan() { if (!g || !me || me.ember || scanCd > 0) return; scanCd = SCAN.cd; let n = 0; for (const k of g.hollow) { if (Math.hypot(k.x - me.x, k.z - me.z) > SCAN.r) continue; const v = seen.get(k.id); if (v) { v.scan = SCAN.t; v.tag = SMART.tag; n++; } }
  say(n ? `Scan: ${n} shape${n > 1 ? 's' : ''} within ${SCAN.r} m.` : `Scan: nothing within ${SCAN.r} m. For now.`, 2); }
addEventListener('keydown', e => { if (e.code === 'KeyZ' && !e.repeat && mode === 'play' && !panel) scan(); if (e.code === 'KeyT' && !e.repeat && mode === 'play' && !panel) sandy(); });
// Slow time (Cyberpunk's Sandevistan, his north star): T or the mouse's back side button. The world runs at a quarter speed for 6 s while you move,
// aim and fire at full speed; 30 s to recharge. Alone only: with friends, one person's slow time would be everyone's, so it stays off.
const SANDY = { scale: 0.25, t: 6, cd: 30 }; let sandyT = 0, sandyCd = 0, tScale = 1;
// The smart pistol (Cyberpunk's smart guns: a 0.6 s lock in three beeps inside a 9 degree cone, rounds that corkscrew onto the target). Ours locks
// only onto what you scanned in the last 8 s: the scan is how the suit learns a shape. Locked, its outline turns hot pink and pistol rounds curve onto it.
const SMART = { tag: 8, lock: 0.6, cone: Math.cos(9 * Math.PI / 180), r: 40, color: 0xff2a8d }; let smart = { id: 0, t: 0 };
function smartStep(dt) { if (gunKey !== 'pistol' || !g || !me || me.ember) { smart.t = 0; smart.id = 0; return; } const d = look(), ey = me.y + eyeH; let best = null, bc = SMART.cone;
  for (const k of g.hollow) { const v = seen.get(k.id); if (!v || !(v.tag > 0) || k.dead) continue; const hy = C.KINDS[k.kind].hits.find(h => h[3] === 1)[0], dx = k.x - me.x, dy = k.y + hy - ey, dz = k.z - me.z, L = Math.hypot(dx, dy, dz); if (L > SMART.r) continue; const c = (dx * d.x + dy * d.y + dz * d.z) / L; if (c > bc) { bc = c; best = k; } }
  if (!best) { smart.t = 0; smart.id = 0; return; } if (best.id !== smart.id) { smart.id = best.id; smart.t = 0; } const t0 = smart.t; smart.t += dt;
  for (const b of [0.2, 0.4, 0.6]) if (t0 < b && smart.t >= b) sound.click(); }   /* (three beeps, the third is the lock) */
const smartTarget = () => smart.t >= SMART.lock ? g.hollow.find(k => k.id === smart.id && !k.dead) : null;
addEventListener('mouseup', e => { if (e.button === 3 || e.button === 4) e.preventDefault(); });   // (the back side button must not take the browser back a page)
function sandy() { if (!g || !me || me.ember) return; if (net) return say('Slow time works alone only: with friends the world is shared.', 3); if (sandyCd > 0) return say(`Slow time recharging: ${Math.ceil(sandyCd)} s.`, 2);
  sandyT = SANDY.t; sandyCd = SANDY.cd + SANDY.t; kick = Math.min(1, kick + 0.3); say('Slow time: 6 s.', 2); }
const LOOK = { walker: ['mutant', 1.75, 0xb48cff], runner: ['mutant', 1.55, 0xff4fa0], giant: ['mutant', 3.0, 0xff2b40],   /* (the baseline zombie, his ask 2026-10-19: Mixamo's Mutant via mohsenheydari/three-fps, drawn as shadow like the rest) */
  watcher: ['wraith', 2.4, 0xffffff], face: ['wraith', 1.3, 0xff4fd8] };   // (no more clawed model: he saw a smiling dog. Until real masks, every mask is the faceless ghost, stretched into its own shape)   // (eye color = the mask's own edge color)
function drawHollow(dt) {
  const alive = new Set();
  for (const k of g.hollow) {
    alive.add(k.id); let v = seen.get(k.id);
    if (!v) {
      if (k.kind === 'shard') { const src = models.shard; if (!src) continue; const o = src.scene.clone(); const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()); o.scale.setScalar(1.3 / Math.max(s.x, s.y, s.z)); o.traverse(q => { if (q.isMesh) { q.material = q.material.clone(); q.material.map = null; q.material.color.setHex(0x120c1e); q.material.emissive = new THREE.Color(0x8a5cff); q.material.emissiveIntensity = 0.3;   /* (violet: it read as a cyan orb in the sky, his banned color, 2026-10-19) */ } }); v = { o }; }
      else { const [mk, size, eyes] = LOOK[k.kind], src = models[mk]; if (!src) continue; if (!src.box) { src.scene.updateMatrixWorld(true); src.box = new THREE.Box3().setFromObject(src.scene); }   /* (measured on the original: a copy of an animated model measures wrong, the camp people's old bug) */
        const o = skClone(src.scene); darken(o, eyes, k.kind); const b = src.box, s = b.getSize(new THREE.Vector3()); o.scale.setScalar(size * 1.6 / s.y);
        if (k.kind === 'runner' && mk !== 'mutant') { const sc = size * 1.6 / s.y; o.scale.set(sc * 1.35, sc * 0.75, sc * 1.6); }   // (the runner: low and long, built to close distance)
        if (k.kind === 'face') { const sc = size * 1.6 / s.y; o.scale.set(sc * 1.5, sc * 1.2, sc * 0.45); }   // (the face: flat and wide, the way it came out of the wall)
        if (k.kind === 'watcher') { const sc = size * 1.6 / s.y; o.scale.set(sc * 0.6, sc, sc * 0.6);   // (the tall one: stretched thin, a wide-brimmed hat, nothing else you can name)
          const hatM = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 1 }), brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 24), hatM), crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.42, 20), hatM);
          const hat = new THREE.Group(); crown.position.y = 0.22; hat.add(brim, crown); hat.scale.set(1 / (sc * 0.6), 1 / sc, 1 / (sc * 0.6)); hat.position.y = b.max.y - 0.05 * s.y; o.add(hat); }
        const mix = new THREE.AnimationMixer(o), A = n => { const c = src.animations.find(a => a.name.endsWith(n)); return c ? mix.clipAction(c) : null; }; const Z = mk === 'mutant'; v = { o, mix, fly: A(Z ? (k.kind === 'runner' ? 'run' : 'walk') : 'Fast_Flying'), idle: A(Z ? 'idle' : 'Flying_Idle'), hit: A(Z ? 'punch' : 'Punch'), death: A(Z ? 'die' : 'Death') }; (v.fly || v.idle)?.play(); }
      if (k.kind === 'face') { const at = new THREE.Vector3(k.x, k.y + 1.2, k.z); fx.burst(at, 28, [0.55, 0.57, 0.66], 5, 0.7); if (sound.shatter) sound.shatter(at); }   // (it tears out of the wall: concrete dust and a crack)
      v.mats = []; v.eyes = []; v.o.traverse(q => { if (q.isMesh) { q.material.transparent = true; v.mats.push(q.material); if (/Eye_Black/.test(q.material.name)) v.eyes.push(q.material); } }); v.sol = 0; v.base = v.o.scale.x;
      scene.add(v.o); seen.set(k.id, v);
    }
    { const want = C.solid(g, k) ? 1 : 0, was = v.sol; v.sol += (want - v.sol) * Math.min(1, dt * 7); if (was < 0.5 && v.sol >= 0.5) fx.burst(new THREE.Vector3(k.x, k.y + 1.3, k.z), 14, [0.85, 0.72, 1.0], 3.2, 0.35);   /* (a crack of light the moment the smoke is forced into a shape) */   // (out of the light it is smoke: faint, unsteady, shots pass through; in the light it commits to a shape)
      for (const m of v.mats) { m.opacity = 0.88 + 0.12 * v.sol; m.depthWrite = true; }   /* (in the dark a solid black silhouette, in light fully there; at 16% only the rim showed, read as see-through glitter, and the edge of the light made it flash: his eyes 2026-10-19, taste rule 102. Shots still pass through it in the dark: the rule is unchanged) */
      if (v.tag > 0) v.tag -= dt; if (smart.id === k.id && smart.t >= SMART.lock) v.scan = Math.max(v.scan || 0, 0.45);   /* (a locked shape keeps its outline, in pink) */
      if (v.scan > 0 || v.scanned) { v.scan = Math.max(0, (v.scan || 0) - dt); const a = Math.min(1, v.scan / 0.4);   /* (the scan outline: a violet edge that fades out over its last 0.4 s) */
        for (const m of v.mats) { if (m.userData.e0 === undefined) { m.userData.e0 = m.emissive.getHex(); m.userData.i0 = m.emissiveIntensity; } if (v.scan > 0) { m.emissive.setHex(smart.id === k.id && smart.t >= SMART.lock ? SMART.color : SCAN.color); m.emissiveIntensity = 0.9 * a; m.opacity = Math.max(m.opacity, 0.35 + 0.5 * a); } else { m.emissive.setHex(m.userData.e0); m.emissiveIntensity = m.userData.i0; } }
        v.scanned = v.scan > 0; }
      const w = (1 - v.sol) * 0.035, t = performance.now() / 1000 + k.id, br = 1 + w * Math.sin(t * 1.3); v.o.scale.set(v.base * br, v.base * br, v.base * br); }   /* (smoke breathes slowly; it used to shake on three axes at once, which read as a glitch, his note 2026-10-19) */
    if (v.eyes.length) {   /* (the masks show intent, never in words, GAMEDEV-TRICKS.md 13: the pinpoint eyes flare as it closes to striking range, and the watcher's brighten while nobody looks at it, because that is when it moves) */
      const K = C.KINDS[k.kind], reach = (K && K.reach) || 1.2; let d = 1e9; for (const p of g.players) if (!p.ember) d = Math.min(d, Math.hypot(p.x - k.x, p.z - k.z));
      const tell = Math.max(0, Math.min(1, 1 - (d - reach) / (reach * 1.6))) + (k.kind === 'watcher' && !C.lookedAt(g, k) && d < 30 ? 0.5 : 0); v.tell = (v.tell || 0) + (tell - (v.tell || 0)) * Math.min(1, dt * 8);
      for (const m of v.eyes) m.emissiveIntensity = 3 + 4 * v.tell; }
    const tgt = k.y + (k.kind === 'shard' ? 2.6 : 0.2); v.o.position.set(k.x, tgt, k.z); v.o.rotation.y = k.yaw;
    { const want = k.rt > 0 ? [0, 0.18, 0.4, 1.35][k.r || 0] : 0; v.lean = (v.lean || 0) + (want - (v.lean || 0)) * Math.min(1, dt * (want > (v.lean || 0) ? 30 : 5)); v.o.rotation.order = 'YXZ'; v.o.rotation.x = -v.lean; if (k.r === 3 && k.rt > 0) v.o.position.y -= v.lean * 0.35; }   /* (the hit reaction you see: a snap back, a reel, or down on its back; it rises slowly) */   // (no bob: they hold their height; the animation does the moving)
    if (k.kind === 'shard') v.o.rotation.y += performance.now() / 900; if (v.mix && hitStop <= 0 && !(k.kind === 'watcher' && C.lookedAt(g, k))) v.mix.update(dt * (k.kind === 'runner' ? 1.6 : 1));   // (seen, it freezes mid-motion)
  }
  for (const [id, v] of seen) if (!alive.has(id)) { scene.remove(v.o); seen.delete(id); }
}

// ---------------------------------------------------------------- the fire and the network's nodes
const fireLight = new THREE.PointLight(0x9fc0ff, 0, 30, 1.6); scene.add(fireLight);
let fireObj = null; const nodeObjs = new Map(), linkLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x9fb8ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(linkLines);
function drawNetwork(t) {
  const f = g.fire;
  if (!fireObj) { fireObj = new FireCore(scene); fireObj.place(f.x, g.land(f.x, f.z), f.z); }   // (the Last Fire: a plasma core, client/firecore.js)
  const lit = f.fuel > 0, pulse = fireObj.update(t, 1 / 60, f.level, Math.min(1, f.fuel / 300), Math.hypot(camera.position.x - f.x, camera.position.z - f.z));
  fireLight.position.set(f.x, g.land(f.x, f.z) + 1.8 + f.level * 0.5, f.z); fireLight.color.setHex(0xd7a0ff); fireLight.intensity = lit ? 26 * (0.9 + Math.sin(t * 11) * 0.03 + Math.sin(t * 4.3) * 0.03 + pulse * 0.25) : 2; fireLight.distance = C.fireRadius(f) * 2.2;   // (the light breathes with the flame and jumps with each crackle)
  const live = new Set(), pts = [];
  for (const n of g.nodes) {
    live.add(n.id); let o = nodeObjs.get(n.id);
    if (!o && models.lantern) { o = new THREE.Group(); const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, n.kind === 'lamp' ? 2.4 : 1.6, 0.1), new THREE.MeshStandardMaterial({ color: 0x3a3e48, metalness: 0.4, roughness: 0.5 })); post.position.y = n.kind === 'lamp' ? 1.2 : 0.8;
      const l = models.lantern.scene.clone(); const b = new THREE.Box3().setFromObject(l); l.scale.setScalar((n.kind === 'lamp' ? 0.7 : 0.45) / b.getSize(new THREE.Vector3()).y); l.position.y = n.kind === 'lamp' ? 2.4 : 1.6; o.add(post, l); o.userData.l = l; o.position.set(n.x, g.land(n.x, n.z), n.z); scene.add(o); nodeObjs.set(n.id, o); }
    if (o) o.userData.l.traverse(q => { if (q.material) { q.material.emissive = q.material.emissive || new THREE.Color(); q.material.emissive.setHex(n.lit && lit ? 0x9fb8ff : 0x000000); q.material.emissiveIntensity = 0.9; } });
  }
  for (const [id, o] of nodeObjs) if (!live.has(id)) { scene.remove(o); nodeObjs.delete(id); }
  // faint lines show which nodes carry light to which (only lit links; a broken chain goes dark)
  const reachOf = n => C.NODE[n.kind].reach, src = [{ x: f.x, z: f.z, reach: 24 }, ...g.nodes.filter(n => n.lit && reachOf(n))];
  for (const n of g.nodes) if (n.lit) { const a = src.filter(s => s !== n && Math.hypot(s.x - n.x, s.z - n.z) <= s.reach).sort((p, q) => Math.hypot(p.x - n.x, p.z - n.z) - Math.hypot(q.x - n.x, q.z - n.z))[0]; if (a) pts.push(a.x, g.land(a.x, a.z) + 1.6, a.z, n.x, g.land(n.x, n.z) + 1.6, n.z); }
  linkLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  // the ground shader's lights: the fire, your glow, and the 22 nearest lit nodes
  const arr = uLights.value; arr[0].set(f.x, f.z, lit ? C.fireRadius(f) : 3, lit ? 1 : 0.3); arr[1].set(me.x, me.z, C.glowOf(g, me), 0.55); if (g.car) arr[2].set(g.car.x - Math.sin(g.car.yaw) * 7, g.car.z - Math.cos(g.car.yaw) * 7, 8, 0.9); else arr[2].set(0, 0, 0, 0); for (let i = 0; i < 2; i++) { const fl = (g.flares || [])[i]; if (fl) arr[3 + i].set(fl.x, fl.z, C.FLARE.r, Math.min(1, fl.t / 2) * 1.2); else arr[3 + i].set(0, 0, 0, 0); }   // (a flare lights the ground it lands on)
  const near = g.nodes.filter(n => n.lit && lit).sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z));
  for (let i = 5; i < NODE_MAX; i++) { const n = near[i - 5]; if (n) arr[i].set(n.x, n.z, C.NODE[n.kind].r, 0.9); else arr[i].set(0, 0, 0, 0); }   // (slots 0 to 4: the fire, you, the truck's lamps, two flares; relays after: they used to overwrite the truck's)
}
// marks: what the world remembers, drawn as scars on the ground (one draw call)
const MARKS = 600, markMesh = new THREE.InstancedMesh(new THREE.RingGeometry(0.35, 0.75, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }), MARKS);
markMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MARKS * 3), 3); markMesh.count = 0; markMesh.frustumCulled = false; scene.add(markMesh);
let marksDrawn = -1; const _m = new THREE.Matrix4(), _c = new THREE.Color();
function drawMarks() { if (g.marks.length === marksDrawn) return; marksDrawn = g.marks.length; markMesh.count = Math.min(MARKS, g.marks.length);
  g.marks.slice(-MARKS).forEach((m, i) => { _m.makeTranslation(m.x, g.land(m.x, m.z) + 0.04, m.z); markMesh.setMatrixAt(i, _m); markMesh.setColorAt(i, _c.setHex(m.k === 'fall' ? 0xb9a8ff : 0x39407a)); });
  markMesh.instanceMatrix.needsUpdate = true; markMesh.instanceColor.needsUpdate = true; }
// embers off the fire: a few dozen sparks rising and fading (one draw call)
const EMB = 60, embPos = new Float32Array(EMB * 3), embVel = new Float32Array(EMB * 3), embLife = new Float32Array(EMB), embMesh = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: softDot, alphaTest: 0.01, color: 0xffc8f2, size: 0.09, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
embMesh.geometry.setAttribute('position', new THREE.BufferAttribute(embPos, 3)); embMesh.frustumCulled = false; scene.add(embMesh);
function embers(dt) { if (!g) return; const f = g.fire, y0 = g.land(f.x, f.z) + 0.5, on = f.fuel > 0;
  for (let i = 0; i < EMB; i++) { if ((embLife[i] -= dt) <= 0) { if (!on) { embPos[i * 3 + 1] = -999; continue; } embLife[i] = 1.2 + Math.random() * 2.2; embPos.set([f.x + (Math.random() - 0.5) * 0.6, y0, f.z + (Math.random() - 0.5) * 0.6], i * 3); embVel.set([(Math.random() - 0.5) * 0.4, 0.9 + Math.random() * 1.4, (Math.random() - 0.5) * 0.4], i * 3); }
    embVel[i * 3] += (Math.random() - 0.5) * dt * 1.5; embVel[i * 3 + 2] += (Math.random() - 0.5) * dt * 1.5; for (let k = 0; k < 3; k++) embPos[i * 3 + k] += embVel[i * 3 + k] * dt; }
  embMesh.geometry.attributes.position.needsUpdate = true; }
// far lights: a few slow drifting lights out where nobody has been (awe far; one draw call)
const FAR = 9, farPos = new Float32Array(FAR * 3), farCol = new Float32Array(FAR * 3), farSeed = Array.from({ length: FAR }, (_, i) => ({ a: i / FAR * Math.PI * 2 + Math.random(), r: 150 + Math.random() * 90, h: 18 + Math.random() * 40, s: (Math.random() - 0.5) * 0.02 }));
farSeed.forEach((f, i) => farCol.set([[0.35, 0.42, 1], [0.95, 0.35, 1], [0.6, 0.5, 1]][i % 3], i * 3));
const farMesh = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: softDot, size: 9, vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
farMesh.geometry.setAttribute('position', new THREE.BufferAttribute(farPos, 3)); farMesh.geometry.setAttribute('color', new THREE.BufferAttribute(farCol, 3)); farMesh.frustumCulled = false; scene.add(farMesh);
function farLights(dt) { if (!me) return; farSeed.forEach((f, i) => { f.a += f.s * dt; farPos.set([me.x + Math.cos(f.a) * f.r, f.h, me.z + Math.sin(f.a) * f.r], i * 3); }); farMesh.geometry.attributes.position.needsUpdate = true; }
// motes of light: a few hundred points in one draw call; they drift toward you when you walk close
const MOTES = 400, motePos = new Float32Array(MOTES * 3), motes = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: softDot, color: 0xff9ae6, size: 0.13, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));   /* (the light you gather: small sharp sparks near the ground, never big glowing balls, his note 2026-10-19) */
motes.geometry.setAttribute('position', new THREE.BufferAttribute(motePos, 3)); motes.frustumCulled = false; scene.add(motes);
function drawMotes() { let i = 0; for (const m of g.motes) { if (i >= MOTES) break; motePos.set([m.x, g.land(m.x, m.z) + 0.25, m.z], i * 3); i++; } for (; i < MOTES; i++) motePos[i * 3 + 1] = -999; motes.geometry.attributes.position.needsUpdate = true; }

// ---------------------------------------------------------------- what you hold: the gun in its own pass (never through a wall)
const vscene = new THREE.Scene(), vcam = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.01, 10), view = new THREE.Group(); vcam.add(view); vscene.add(vcam); const hands = new Hands(THREE, vcam);
const vhemi = new THREE.HemisphereLight(0xc8d4f0, 0x1a1c26, 1); vscene.add(vhemi); const vsun = new THREE.DirectionalLight(0xffffff, 0.8); vsun.position.set(0.6, 1, 0.8); vscene.add(vsun);
let fpRig = null, railRig = null, railC = 0; const held = {}; let gunKey = 'ar', ammo = { pistol: { mag: 8, res: 72 }, ar: { mag: 30, res: 210 }, shotgun: { mag: 2, res: 40 }, lmg: { mag: 45, res: 270 }, rail: { mag: 4, res: 24 } }, reloadT = 0, shotCd = 0, kick = 0, ads = 0;
function prepGun(k) { const src = models[k]; if (!src) return; const inner = src.scene.clone(), holder = new THREE.Group(); inner.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); if (/Wood/.test(o.material.name)) o.material.color.setHex(0x1d1f25); if (/Metal/.test(o.material.name)) { o.material.metalness = 0.25; o.material.color.multiplyScalar(1.35); } } });
  inner.rotation.y = Math.PI / 2; holder.add(inner); let b = new THREE.Box3().setFromObject(holder), s = b.getSize(new THREE.Vector3()); inner.scale.multiplyScalar(({ pistol: 0.24, ar: 0.82, shotgun: 0.86, lmg: 0.86 })[k] / s.z); b = new THREE.Box3().setFromObject(holder); const c = b.getCenter(new THREE.Vector3()); inner.position.sub(c);
  b = new THREE.Box3().setFromObject(holder); holder.userData = { len: b.max.z - b.min.z, top: b.max.y, muzzle: new THREE.Vector3(0, b.max.y * 0.35, b.min.z) }; holder.visible = false; view.add(holder); held[k] = holder; }

// ---------------------------------------------------------------- input: click to take the mouse; Esc for the menu
const TEST = /[?&]test(&|$)/.test(location.search), DEMO = /[?&]demo(&|$)/.test(location.search), locked = () => DEMO || padOn || document.pointerLockElement === renderer.domElement;   // (?demo: a 45 s test run that plays itself, so a run can be recorded with no mouse lock; never on for players)
if (DEMO || /[?&]shot(&|$)/.test(location.search)) window.__lf = { get g() { return g; }, get me() { return me; }, scene, renderer, composer, info: () => lookFx && lookFx.info ? lookFx.info() : null };   // (a test hook for still screenshots: read and aim only)
// the cold is in your hands (INNOVATION.md idea 6, one rule with idea 9's sound: light makes you sharp, the dark makes you soft). No meter:
// out of light your hands chill over about 25 s and your aim drifts, slow and smooth (never a jitter), less in the sights; the fire, a lamp,
// a relay or the truck's cab warm them back in about 3 s. The drift moves your real aim, so where the sight sits is where the round goes.
let cold = 0, coldSaid = -1; const drift = t => [Math.sin(t * 0.83) + 0.6 * Math.sin(t * 1.91 + 1.3), Math.sin(t * 0.67 + 2.1) + 0.5 * Math.sin(t * 1.57)];
function coldHands(dt) { if (!g || !me || me.ember) return; const warm = C.lightAt(g, me.x, me.z, true) > 0.12 || (g.car && C.seatOf(g, me.id) >= 0) || (ship && ship.on);
  cold = Math.max(0, Math.min(1, cold + (warm ? -dt / 3 : dt / 25))); const t = performance.now() / 1000, amp = cold * cold * (0.0045 - 0.002 * ads), [a0, b0] = drift(t - dt), [a1, b1] = drift(t);
  me.yaw += (a1 - a0) * amp; me.pitch += (b1 - b0) * amp * 0.7;
  if (cold > 0.6 && coldSaid !== g.night) { coldSaid = g.night; say('Your hands are going cold out here. Light steadies them.', 4); } }
// ?autoplay: the robot player (sim/autoplay.cjs) drives the pad from outside and sees only what is on the screen: where the guide's line of
// light stands in the frame, and the shapes and motes inside the frame (screen x and y from -1 to 1, and how far). Never on for players.
const AUTO = /[?&]autoplay(&|$)/.test(location.search), eyeV = new THREE.Vector3();
function eyes() { if (!me || !g) return null; const scr = (x, y, z) => { eyeV.set(x, y, z).project(camera); return eyeV.z < 1 && Math.abs(eyeV.x) < 1 && Math.abs(eyeV.y) < 1 ? [+eyeV.x.toFixed(3), +eyeV.y.toFixed(3)] : null; }, far = p => +Math.hypot(p.x - me.x, p.z - me.z).toFixed(1);
  const see = (list, h) => list.filter(k => !k.dead && far(k) < 80).map(k => { const s = scr(k.x, (k.y ?? g.land(k.x, k.z)) + h, k.z); return s && { s, d: far(k), solid: !!k.solid }; }).filter(Boolean);
  const tg = guide && guide.i >= 0 && guide.beam.visible ? guide.beam.position : null;
  return { beam: tg ? scr(tg.x, tg.y - 13, tg.z) : null, shapes: see(g.hollow, 1.2), motes: see(g.motes, 0.25), pitch: +me.pitch.toFixed(3), lost: g.stats.lostNights || 0, hp: me.hp, carried: me.carried || 0, phase: C.phase(g.clock), earth: C.onEarth(me), ember: !!me.ember }; }
// the demo run's script: [start s, what]. Each gun: hip fire, spam the sights, fire aimed, empty it and reload; then move while aiming
const DEMO_RUN = [[0, 'look'], [4, 'gun ar'], [5, 'ads spam'], [11, 'fire hip'], [14, 'ads fire'], [18, 'reload'], [22, 'gun pistol'], [23, 'ads spam'], [27, 'reload'], [30, 'gun shotgun'], [31, 'fire hip'], [33, 'reload'], [37, 'gun lmg'], [38, 'move ads'], [42, 'reload'], [44, 'gun rail'], [45, 'ads spam'], [48, 'rail fire'], [52, 'end']];
// ?demo&night: a 45 s night run for recordings. It starts at the end of dusk, eases its aim onto the nearest shape (a camera operator, not a player
// skill: test only), and uses every move: hip fire, aiming, boost jump and slam, dodges, sprint and slide, reloads, three guns
const NIGHT_RUN = [[0, 'look'], [2, 'gun pistol'], [2.2, 'scan'], [3, 'ads fire'], [5, 'gun ar'], [6, 'ads fire'], [11, 'boost'], [11.3, 'boost2'], [12.1, 'slam'], [13, 'sandy'], [14, 'fire hip'], [18, 'reload'], [21, 'dodge L'], [22.2, 'dodge R'], [23.5, 'sprint'], [25.2, 'slide'], [26.5, 'ads fire'],
  [31, 'gun shotgun'], [32, 'fire hip'], [35, 'reload'], [37.5, 'gun lmg'], [38, 'boost'], [38.3, 'boost2'], [39.1, 'slam'], [40.5, 'ads fire'], [46, 'end']];
const press = code => { dispatchEvent(new KeyboardEvent('keydown', { code })); dispatchEvent(new KeyboardEvent('keyup', { code })); };   // (down and up: a held key would keep jumping)
function demoAim(dt) { let best = null, bd = 45; for (const k of g.hollow) { if (k.dead || C.onEarth(k)) continue; const d = Math.hypot(k.x - me.x, k.z - me.z); if (d < bd) { bd = d; best = k; } } if (!best) return false;
  const want = Math.atan2(-(best.x - me.x), -(best.z - me.z)), dy = (best.y + 1.3) - (me.y + eyeH), dyaw = Math.atan2(Math.sin(want - me.yaw), Math.cos(want - me.yaw));
  me.yaw += dyaw * Math.min(1, dt * 5); me.pitch += (Math.atan2(dy, bd) - me.pitch) * Math.min(1, dt * 5); return Math.abs(dyaw) < 0.08; }
function demoNight(dt) { const d = demoNight; if (!d.t) g.clock = Math.max(g.clock, C.NIGHT_AT - 0.02); d.t = (d.t || 0) + dt; const t = d.t, cur = NIGHT_RUN.filter(r => r[0] <= t).pop(), [, what] = cur, fresh = d.on !== cur; d.on = cur;
  mouse[0] = false; keys.KeyW = keys.KeyA = keys.KeyD = keys.ShiftLeft = false; const on = what === 'look' ? (me.yaw += 0.5 * dt, false) : demoAim(dt);
  if (what.startsWith('gun') && fresh) switchGun(what.split(' ')[1]);
  if (what === 'ads fire') { aimOn = t - cur[0] > 0.4; mouse[0] = aimOn && on && t % 0.5 < 0.32; }
  if (what === 'fire hip') { aimOn = false; mouse[0] = on && t % 0.45 < 0.3; }
  if (what === 'reload' && fresh) { aimOn = false; ammo[gunKey].mag = Math.min(ammo[gunKey].mag, 2); reload(); }
  if (what === 'boost' && fresh) { aimOn = false; jumpBuf = 0.15; } if (what === 'boost2' && fresh) press('Space'); if (what === 'slam' && fresh) press('KeyC'); if (what === 'sandy' && fresh) press('KeyT'); if (what === 'scan' && fresh) { press('KeyZ'); if (DEMO) { window.__smart = smart; window.__dbg = { me, g, seen, look, switchGun }; window.__me = () => ({ ember: !!me.ember, hp: me.hp, n: g.hollow.length, near: g.hollow.filter(k => Math.hypot(k.x - me.x, k.z - me.z) < 30).length, tagged: [...seen.values()].filter(v => v.tag > 0).length }); } }
  if (what === 'dodge L' && fresh) { keys.KeyA = true; press('ShiftLeft'); keys.KeyA = false; } if (what === 'dodge R' && fresh) { keys.KeyD = true; press('ShiftLeft'); keys.KeyD = false; }
  if (what === 'sprint') { aimOn = false; keys.KeyW = true; keys.ShiftLeft = true; } if (what === 'slide') { keys.KeyW = true; if (fresh) { keys.ShiftLeft = true; press('KeyC'); } }
  if (what === 'end' && fresh) { aimOn = false; say('Night run over.', 3); } }
function demoStep(dt) { const d = demoStep; d.t = (d.t || 0) + dt; const t = d.t, cur = DEMO_RUN.filter(r => r[0] <= t).pop(), [, what] = cur, fresh = d.on !== cur; d.on = cur;
  me.yaw += Math.sin(t * 0.6) * 0.25 * dt * (what === 'look' ? 3 : 1); me.pitch = Math.sin(t * 0.37) * 0.06;   // (a slow, smooth sweep: never a jerk)
  mouse[0] = false; keys.KeyW = keys.KeyA = false;
  if (what.startsWith('gun') && fresh) switchGun(what.split(' ')[1]);
  if (what === 'ads spam') aimOn = Math.floor(t / 0.55) % 2 === 0;
  if (what === 'rail fire') { aimOn = true; mouse[0] = (t - cur[0]) % 1.8 < 0.6; }   // (hold 0.6 s to charge, let go: the rail fires on release)
  if (what === 'fire hip') { aimOn = false; mouse[0] = t % 0.5 < 0.25; }
  if (what === 'ads fire') { aimOn = t - cur[0] > 0.5; mouse[0] = aimOn && t % 0.6 < 0.3; }
  if (what === 'reload' && fresh) { aimOn = false; ammo[gunKey].mag = Math.min(ammo[gunKey].mag, 1); reload(); }
  if (what === 'move ads') { aimOn = true; keys.KeyW = true; keys.KeyA = t % 2 < 1; mouse[0] = t % 0.7 < 0.2; }
  if (what === 'end' && fresh) { aimOn = false; say('Demo run over.', 3); } }
let buildPick = null;
addEventListener('keydown', e => { if (e.code === 'Tab' && mode === 'play' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); toggleTab(); return; } if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; keys[e.code] = true; if (mode !== 'play' || panel) return;
  if (e.code === 'Space' && !e.repeat) jumpBuf = 0.15; if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat && SET.sprintToggle) sprintOn = !sprintOn; if (e.code === 'Digit1') switchGun('pistol'); if (e.code === 'Digit2') switchGun('ar'); if (e.code === 'Digit3') switchGun('shotgun'); if (e.code === 'KeyG') throwFlare(); if (e.code === 'KeyX') nextSeat(); if (e.code === 'Digit4') switchGun('lmg'); if (e.code === 'Digit5') switchGun('rail'); if (e.code === 'KeyR') reload(); if (e.code === 'KeyQ') pickBuild(buildPick === 'relay' ? null : 'relay'); if (e.code === 'KeyE') pickBuild(buildPick === 'lamp' ? null : 'lamp'); if (e.code === 'KeyF') act(); });
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { if (document.pointerLockElement) document.exitPointerLock(); for (const k in keys) keys[k] = false; mouse.fill(false); });
renderer.domElement.addEventListener('click', () => { amb.start(); if (mode === 'play' && !panel && !locked()) lockMouse(); });
addEventListener('mousemove', e => { if (!locked() || !me) return; const k = 0.0022 * SET.sens * (1 - ads * (1 - SET.adsSens)); me.yaw -= e.movementX * k; me.pitch = Math.max(-1.55, Math.min(1.55, me.pitch - e.movementY * k * (SET.invertY ? -1 : 1))); });
addEventListener('mousedown', e => { if (padOn && mode === 'play') { padOn = false; mouse[0] = false; if (!document.pointerLockElement && !panel) renderer.domElement.requestPointerLock(); }   /* (any mouse press takes play back from the pad at once: before, an idle pad kept the fire button and holding left click did nothing; found by the basics gate) */
  if (!locked()) return; mouse[e.button] = true; if (e.button === 1) scan(); if (e.button === 3) sandy(); if (e.button === 0 && buildPick) { tryBuild(); mouse[0] = false; } if (e.button === 2 && buildPick) pickBuild(null); else if (e.button === 2 && SET.aimToggle) aimOn = !aimOn; });
addEventListener('mouseup', e => mouse[e.button] = false);
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => { if (e.code === 'Escape' && mode === 'play' && !panel) { panel = 'pause'; $('paused').hidden = false; drawPause(); if (document.pointerLockElement) document.exitPointerLock(); } });   // (Esc pauses even when the mouse is free, as after playing on the pad)
document.addEventListener('pointerlockchange', () => { if (mode === 'play' && !locked() && !panel) { panel = 'pause'; $('paused').hidden = false; drawPause(); } });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); bloom.resolution.set(innerWidth, innerHeight); camera.aspect = vcam.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); vcam.updateProjectionMatrix(); });
function drawPause() {
  $('room').innerHTML = net ? `<div class="code">ROOM <b>${net.code}</b></div><button class="key" id="copyInvite">COPY INVITE<small>(a link with the code in it: paste it in Discord)</small></button>${net.host ? `<button class="key" id="lockRoom">${net.locked ? 'UNLOCK THE ROOM' : 'LOCK THE ROOM'}<small>(${net.locked ? 'let new friends in again' : 'nobody new can join, even with the code'})</small></button>` : ''}` : ''; $('sSens').value = SET.sens; $('vSens').textContent = SET.sens.toFixed(2); $('sVol').value = SET.vol; $('vVol').textContent = Math.round(SET.vol * 100); }
$('sSens').oninput = e => { SET.sens = +e.target.value; $('vSens').textContent = SET.sens.toFixed(2); save(); };
$('sFov').oninput = e => { SET.fov = +e.target.value; $('vFov').textContent = SET.fov; save(); };
$('sAds').oninput = e => { SET.adsSens = +e.target.value; $('vAds').textContent = Math.round(SET.adsSens * 100) + '%'; save(); };
const OPTS = [['aimToggle', 'AIM', 'TOGGLE', 'HOLD'], ['sprintToggle', 'SPRINT', 'TOGGLE', 'HOLD'], ['invertY', 'LOOK', 'INVERTED', 'NORMAL'], ['autoReload', 'AUTO RELOAD', 'ON', 'OFF'], ['cross', 'CROSSHAIR', 'ON', 'OFF']];
function drawOpts() { $('opts').innerHTML = OPTS.map(([k, n, on, off]) => `<button class="key" data-o="${k}">${n} <b>${SET[k] ? on : off}</b></button>`).join('') + '<button class="key" data-o="reset">RESET <b>ALL</b></button>'; $('cross').style.display = SET.cross ? '' : 'none';
  $('sFov').value = SET.fov; $('vFov').textContent = SET.fov; $('sAds').value = SET.adsSens; $('vAds').textContent = Math.round(SET.adsSens * 100) + '%'; }
$('opts').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.o === 'reset') { Object.assign(SET, DEFAULTS); sound.setVolume(SET.vol); $('sSens').value = SET.sens; $('vSens').textContent = SET.sens.toFixed(2); $('sVol').value = SET.vol; $('vVol').textContent = Math.round(SET.vol * 100); } else SET[b.dataset.o] = !SET[b.dataset.o]; aimOn = sprintOn = false; save(); drawOpts(); });
drawOpts();
$('sVol').oninput = e => { SET.vol = +e.target.value; sound.setVolume(SET.vol); $('vVol').textContent = Math.round(SET.vol * 100); save(); };
$('resume').onclick = () => { panel = null; $('paused').hidden = true; if (!padOn) lockMouse(); };
// The controller (he plays on one, to relax). Standard layout, Call of Duty style: left stick moves, right stick looks, LT aims (hold), RT fires,
// A jump (again in the air: boost), B crouch and slide (in the air: slam), X reload, Y next gun, LB scan, RB flare, L3 sprint, R3 slow time,
// D-pad up flashlight, right use, left relay, down lamp, Start pause. Aim assist as on console: the look slows near a shape (friction).
const PAD = { dead: 0.14, look: 3.4, curve: 2, assist: 0.45, cone: Math.cos(5 * Math.PI / 180) }, padPrev = []; const GUN_CYCLE = ['pistol', 'ar', 'shotgun', 'lmg', 'rail'];
const padKey = (code, down) => dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
function padStep(dt) { const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(x => x && x.connected); if (!gp) { padMove.f = padMove.s = 0; return; }
  const ax = i => { const v = gp.axes[i] || 0, a = Math.abs(v); return a < PAD.dead ? 0 : Math.sign(v) * ((a - PAD.dead) / (1 - PAD.dead)); }, bt = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
  const now = gp.buttons.map((_, i) => bt(i)), edge = i => now[i] && !padPrev[i], up = i => !now[i] && padPrev[i];
  if (!padOn && (now.some(Boolean) || Math.abs(ax(0)) + Math.abs(ax(1)) + Math.abs(ax(2)) + Math.abs(ax(3)) > 0)) { padOn = true; if (document.pointerLockElement) document.exitPointerLock(); }
  if (edge(9) && mode === 'play') { if (panel === 'pause') $('resume').click(); else if (!panel) { panel = 'pause'; $('paused').hidden = false; drawPause(); } }
  if (mode === 'play' && !panel && me) { padMove.f = -ax(1); padMove.s = ax(0);
    let lx = ax(2), ly = ax(3); const m = Math.hypot(lx, ly); if (m > 0) { const c = Math.pow(Math.min(1, m), PAD.curve) / m; lx *= c; ly *= c; }   /* (a curved stick: fine aim near the middle, fast turns at the edge) */
    let k = PAD.look * SET.sens * dt * (1 - ads * (1 - SET.adsSens)); { const d = look(), ey = me.y + eyeH; for (const h of g.hollow) { if (h.dead) continue; const dx = h.x - me.x, dy = h.y + 1.2 - ey, dz = h.z - me.z, L = Math.hypot(dx, dy, dz); if (L < 60 && (dx * d.x + dy * d.y + dz * d.z) / L > PAD.cone) { k *= 1 - PAD.assist; break; } } }   /* (aim assist: slower across a shape) */
    me.yaw -= lx * k; me.pitch = Math.max(-1.55, Math.min(1.55, me.pitch - ly * k * (SET.invertY ? -1 : 1)));
    if (padOn) { mouse[0] = (gp.buttons[7] ? gp.buttons[7].value : 0) > 0.3; aimOn = (gp.buttons[6] ? gp.buttons[6].value : 0) > 0.3; }
    if (edge(10)) padSprint = !padSprint; const map = { 0: 'Space', 1: 'KeyC', 2: 'KeyR', 4: 'KeyZ', 5: 'KeyG', 11: 'KeyT', 12: 'KeyV', 13: 'KeyE', 14: 'KeyQ', 15: 'KeyF' };
    const dodge = Math.abs(padMove.s) > 0.5 || padMove.f < -0.5; for (const i in map) { if (+i === 1 && dodge && onGround) continue; if (edge(+i)) padKey(map[i], true); if (up(+i)) padKey(map[i], false); }
    if (edge(1) && dodge && onGround) { const k = padMove.s > 0.5 ? 'KeyD' : padMove.s < -0.5 ? 'KeyA' : 'KeyS', was = keys[k]; keys[k] = true; padKey('ShiftLeft', true); padKey('ShiftLeft', false); keys[k] = was; }   /* (B while moving sideways: the dodge, as Shift plus a direction does) */
    if (edge(3)) { const i = GUN_CYCLE.indexOf(gunKey); switchGun(GUN_CYCLE[(i + 1) % GUN_CYCLE.length]); } }
  else { padMove.f = padMove.s = 0; if (padOn) mouse[0] = false; padMenu(edge, ax); }
  now.forEach((v, i) => padPrev[i] = v); }
// menus on the pad (found by the robot player: SOLO needed a mouse): the D-pad or left stick walks the visible keys in reading order, A presses
// the selected one. The selected key gets the same thin pink edge as a mouse hover; nothing glows.
function padMenu(edge, ax) { const keys = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled && getComputedStyle(b).visibility !== 'hidden'); if (!keys.length) return;
  const st = padMenu.st = padMenu.st || { t: 0 }, y = ax(1), x = ax(0), t = performance.now(); let step = edge(13) || edge(15) ? 1 : edge(12) || edge(14) ? -1 : 0;
  if (!step && Math.max(Math.abs(x), Math.abs(y)) > 0.6 && t - st.t > 220) step = (Math.abs(y) > Math.abs(x) ? y : x) > 0 ? 1 : -1; if (step) st.t = t;
  const cur = keys.indexOf(document.activeElement);
  if (step) { const n = cur < 0 ? 0 : (cur + step + keys.length) % keys.length; keys[n].focus({ focusVisible: true }); }
  else if (edge(0)) { if (cur >= 0) keys[cur].click(); else keys[0].focus({ focusVisible: true }); } }
addEventListener('wheel', e => { if (mode !== 'play' || panel || buildPick || !locked()) return; const t = performance.now(); if (t - (addEventListener.wt || 0) < 90) return; addEventListener.wt = t;   // (the wheel walks the guns, down = next, his ask 2026-10-19; a fast spin steps once per 90 ms)
  const own = GUN_CYCLE.filter(k => held[k]), i = own.indexOf(gunKey); if (own.length) switchGun(own[(i + (e.deltaY > 0 ? 1 : -1) + own.length) % own.length]); }, { passive: true });
addEventListener('mousemove', e => { if (padOn && (Math.abs(e.movementX) + Math.abs(e.movementY) > 6)) padOn = false; });   // (move the mouse and play is back on the mouse)
$('leave').onclick = () => { saveNow(); location.href = location.pathname; };
$('room').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'copyInvite') { const url = `${location.origin}${location.pathname}#join=${net.code}`; navigator.clipboard?.writeText(url).then(() => { b.firstChild.textContent = 'COPIED'; setTimeout(() => b.firstChild.textContent = 'COPY INVITE', 1500); }, () => { b.querySelector('small').textContent = url; }); }
  if (b.id === 'lockRoom') { net.lock(!net.locked); drawPause(); } });

// ---------------------------------------------------------------- actions
let lastFall = '', msgT = 0, duskSnap = null, god = false; const wrist = new Wrist(vcam); function say(t, s = 3) { wrist.say(t, s); }   // (messages come from the wrist screen, never as text on the glass: his UI rule)
const look = () => new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(me.pitch, me.yaw, 0, 'YXZ'));
function switchGun(k) { if (k === gunKey || !held[k]) return; gunKey = k; reloadT = 0; aimOn = false; railC = 0; hands.attach(k === 'rail' ? null : held[k], k); }
// practice (INNOVATION.md idea 8): each gun's reload gets faster the more you do it, on a curve that flattens (the power law of practice);
// up to 35% faster, never reset, kept in this browser. A real skill curve, not a level.
const practiced = k => (SET.practice && SET.practice[k]) || 0, reloadSpeed = k => 0.65 + 0.35 * Math.pow(1 + practiced(k) / 8, -0.5);
function practice(k) { SET.practice = SET.practice || {}; const n = SET.practice[k] = practiced(k) + 1; save();
  if ([10, 25, 50, 100, 200, 400].includes(n)) say(`Your hands know the ${GUNS[k].name} now: reloads ${Math.round((1 - reloadSpeed(k)) * 100)}% faster than your first (${n} reloads).`, 5); }
function reload() { const G = GUNS[gunKey], a = ammo[gunKey]; if (reloadT > 0 || a.mag >= G.mag || a.res <= 0) return; aimOn = false; reloadT = G.reload * reloadSpeed(gunKey); if (fpRig && gunKey === 'ar') fpRig.reload(a.mag === 0, reloadT); if (railRig && gunKey === 'rail') { railRig.reload(true, reloadT); railC = 0; } practice(gunKey); sound.magOut(); setTimeout(() => sound.magIn(), G.reload * reloadSpeed(gunKey) * 700); }
// a tracer's burn: the whole line it flew stays lit in the air for a third of a second, fading (the light that made the smoke solid)
const BURN = 8, burnGeo = new THREE.BufferGeometry(), burnPos = new Float32Array(BURN * 6), burnCol = new Float32Array(BURN * 6), burnLife = new Float32Array(BURN); let burnI = 0;
burnGeo.setAttribute('position', new THREE.BufferAttribute(burnPos, 3)); burnGeo.setAttribute('color', new THREE.BufferAttribute(burnCol, 3));
const burnLines = new THREE.LineSegments(burnGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); burnLines.frustumCulled = false; scene.add(burnLines);
function burn(a, b) { const i = burnI++ % BURN; burnPos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); burnLife[i] = C.TRACER.life; }
function drawBurns(dt) { for (let i = 0; i < BURN; i++) { burnLife[i] = Math.max(0, burnLife[i] - dt); const k = burnLife[i] / C.TRACER.life; burnCol.set([0.75 * k, 0.95 * k, 1.0 * k, 0.1 * k, 0.15 * k, 0.2 * k], i * 6); } burnGeo.attributes.position.needsUpdate = true; burnGeo.attributes.color.needsUpdate = true; }
// seats are jobs, part 2 (INNOVATION.md): the back seats work a mounted gun: endless rounds, but it heats; past red it locks until it cools
const MOUNT = { ...GUNS.lmg, name: 'MOUNTED GUN', spread: 0.02, auto: true }; let heat = 0, overheat = false;
const mounted = () => g && g.car && C.seatOf(g, me.id) >= 2;
function shoot() {
  const mount = mounted(), G = mount ? MOUNT : GUNS[gunKey], a = ammo[gunKey]; if (shotCd > 0 || (!mount && (reloadT > 0 || mvSprint || readyT > 0)) || me.ember) return;   /* (sprinting, the gun is down; it comes up in the sprint-to-fire time) */
  if (mount) { if (overheat) { if (!shoot.hot) { sound.click(); shoot.hot = true; } return; } shoot.hot = false; heat = Math.min(1, heat + 0.045); if (heat >= 1) { overheat = true; say('The mount is red hot. Let it cool.', 2); } }
  else { if (a.mag <= 0) { sound.click(); reload(); shotCd = 0.3; return; } a.mag--; if (!a.mag && SET.autoReload) setTimeout(() => { if (!ammo[gunKey].mag) reload(); }, 250); }
  shotCd = 60 / G.rpm; sound.shot(mount ? 'lmg' : gunKey); if (fpRig && !mount && gunKey === 'ar') fpRig.fire(); if (railRig && !mount && gunKey === 'rail') railRig.fire(); kick = Math.min(1, kick + 0.5 + G.recoil * 6 * (crouch ? 0.85 : 1));
  const o = new THREE.Vector3(me.x, me.y + eyeH, me.z), sp = G.spread * (ads > 0.5 ? 0.3 : 1) * (onGround ? 1 : 3) * (crouch || slideT > 0 ? 0.8 : 1), ds = [], gm = held[gunKey]; let end = null;
  if (gm) { vcam.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
  const muzzle = gm ? camera.localToWorld(gm.localToWorld(gm.userData.muzzle.clone())) : o.clone();
  for (let n = 0; n < (G.pellets || 1); n++) {   // (a shotgun throws a handful of pellets: each is its own line through the air)
    const d = look(); d.x += (Math.random() - 0.5) * sp * 2; d.y += (Math.random() - 0.5) * sp * 2; d.z += (Math.random() - 0.5) * sp * 2; d.normalize(); if (n === 0) { const st = !mount && gunKey === 'pistol' && smartTarget(); if (st) { const hy = C.KINDS[st.kind].hits.find(h => h[3] === 1)[0], a = Math.random() * 6.28; d.set(st.x - o.x + Math.cos(a) * 0.12, st.y + hy - o.y + Math.sin(a) * 0.12, st.z - o.z).normalize(); } else { const q = C.aimPull(g, o.x, o.y, o.z, d.x, d.y, d.z); d.set(q[0], q[1], q[2]); } }   /* (smart lock: the round goes for the locked shape, in a small spiral) */ ds.push([+d.x.toFixed(4), +d.y.toFixed(4), +d.z.toFixed(4)]);
    const lit = n === 0 && (isHost() ? C.fired(g, me, o.x, o.z, d.x, d.z, mount ? 'mount' : gunKey) : ((me.shots = (me.shots || 0) + 1) % C.TRACER.every === 0));   // (every fourth round is a tracer: it lights its path)
    const rc = G.charge ? shoot.c || 0 : 1, all = G.charge && rc >= 0.75 ? C.hitAll(g, o.x, o.y, o.z, d.x, d.y, d.z, 120) : null, h = all ? all[0] : C.hitRay(g, o.x, o.y, o.z, d.x, d.y, d.z, 80), e = o.clone().addScaledVector(d, all && all.length ? all[all.length - 1].t + 30 : h ? h.t : 60); if (!end) end = e;
    fx.tracer(muzzle, e); if (lit || G.charge) burn(muzzle, o.clone().addScaledVector(d, h && !all ? h.t : C.TRACER.len));
    for (const q of all || (h ? [h] : [])) { const qe = o.clone().addScaledVector(d, q.t); if ((q.part ? q.k.sb : q.k.sh) > 0) fx.spark(qe); else fx.ichor(qe, q.mult > 1); if (isHost()) showHit(C.damage(g, q.k, q.part, G.dmg * (0.5 + 0.5 * rc) * (q.mult > 1 ? G.head : 1), G.ap, me.id), q.mult > 1); }   /* (the rail: half damage uncharged; from 75% charge it goes through every shape in line, Cyberpunk's own bar) */
  }
  if (!isHost()) net.send({ t: 'shot', g: mount ? 'lmg' : gunKey, o: [o.x, o.y, o.z], d: ds[0], ds, c: G.charge ? +(shoot.c || 0).toFixed(2) : 1 });
  if (net) net.send({ t: 'bang', p: me.id, g: gunKey, x: +me.x.toFixed(2), y: +(me.y + 1.5).toFixed(2), z: +me.z.toFixed(2), e: [+end.x.toFixed(2), +end.y.toFixed(2), +end.z.toFixed(2)] });
  me.pitch = Math.min(1.55, me.pitch + G.recoil * 0.4); me.yaw += (Math.random() - 0.5) * G.recoil * 0.3;
}
let hitT = 0;
let hitStop = 0;   // (hit stop, INNOVATION.md combat: the dark's own motion freezes for a few hundredths of a second when a hit lands; the world keeps running)
function showHit(r, head) { hitStop = Math.max(hitStop, r.kill ? 0.075 : 0.035); kick = Math.min(1, kick + (r.kill ? 0.25 : 0.1)); $('hit').className = r.kill ? 'kill' : r.shell ? 'shell' : 'on'; hitT = r.kill ? 0.25 : 0.12; r.kill ? sound.kill() : r.broke ? sound.shatter() : r.shell ? sound.plate() : sound.hit(head); }
function tryGrow() {   // (growing the fire: your choice, and tonight the dark answers with what the new level wakes)
  if (!C.canGrow(g)) return; if (Math.hypot(me.x - g.fire.x, me.z - g.fire.z) > C.fireRadius(g.fire)) return say('Stand at the fire to grow it.');
  if (isHost()) C.grow(g, me); else net.send({ t: 'build', k: 'grow', x: 0, z: 0 }); }
function trip(k) { sound.buy(); const site = SET.site || 'city'; if (isHost()) { if (k === 'drop') C.drop(g, me, site); else C.rise(g, me); } else net.send({ t: 'build', k, x: 0, z: 0, s: site }); }
function siteRow() {   // (pick the site by its odds: what your own record says each district holds; a guess until 3 trips, checked after 10)
  return `<span style="display:block;margin-top:5px;font-size:14px;color:#b9a8ff">land at (click one):${Object.entries(C.SITES).map(([k, S]) => { const o = C.siteOdds(g, k), on = (SET.site || 'city') === k;
    return `<span style="display:block"><b class="site" data-s="${k}" style="cursor:pointer;font-weight:500;color:${on ? '#ff4fd8' : '#eef0f8'}">${on ? '> ' : ''}${S.name}</b>  <small style="color:#a3a6bb">${o.parts.toFixed(1)} parts, ${o.cells.toFixed(1)} cells (${o.label}${o.trips ? ', ' + o.trips + ' trips' : ''})</small>${o.lost && (o.lost.falls || o.lost.left) ? `<small style="display:block;color:#ff6fb1">after what it cost: ${o.lost.falls.toFixed(1)} falls a trip${o.lost.left ? ', ' + o.lost.left.toFixed(1) + ' left behind' : ''}, ${o.lost.cells.toFixed(1)} cells and ${o.lost.parts.toFixed(1)} parts gone</small>` : ''}</span>`; }).join('')}</span>`; }
const atPad = () => !C.onEarth(me) && Math.hypot(me.x - C.PAD.x, me.z - C.PAD.z) < 4, atSite = () => C.onEarth(me) && Math.hypot(me.x - C.EARTH.x, me.z - C.EARTH.z) < 4;
const STORE = { x: 15.8, z: -2.5 }, atStore = () => !C.onEarth(me) && Math.hypot(me.x - STORE.x, me.z - STORE.z) < 4;   // (the camp's store, behind the metal walls: the ammo lives there)
const shortAmmo = () => Object.keys(ammo).some(k => ammo[k].res < GUNS[k].reserve);
function resupply() { for (const k in ammo) ammo[k].res = GUNS[k].reserve; sound.magIn(); say('Topped up from the camp store. Every gun full.', 3); }
const nearWreck = () => C.onEarth(me) && g.earth && (g.earth.wrecks || []).find(w => w.left > 0 && Math.hypot(me.x - w.x, me.z - w.z) < 3.2);
function stripWreck() { if (isHost()) { const k = C.strip(g, me); if (k) { sound.magOut(); say(`You strip ${/^[aeiou]/.test(k) ? 'an' : 'a'} ${k} from the wreck. Now you know how it sits: its place in the fit order is checked.`, 4); } } else net.send({ t: 'build', k: 'strip', x: 0, z: 0 }); }
const atBay = () => !C.onEarth(me) && Math.hypot(me.x - C.BAY.x, me.z - C.BAY.z) < 5;
function fitPart() { if (isHost()) { const k = C.fit(g, me); if (k) { sound.buy(); say(`The ${k} is on. ${C.truckDone(g) ? 'The truck is whole.' : ''}`, 3); } } else net.send({ t: 'build', k: 'fit', x: 0, z: 0 }); }
function bayLine() { const k = C.PART_ORDER.find(k => C.canFit(g, k)); if (k) return `F  ·  FIT THE ${k.toUpperCase()} (${g.stash[k]} in the stash; how it sits: ${(g.learned || {})[k] ? 'checked, you took one apart' : 'reasoned'})`; if (C.truckDone(g)) return 'The truck is whole. (driving it comes next)';
  const need = C.PART_ORDER.find(k => C.fitted(g, k) < C.PARTS[k].n); const blocked = C.PARTS[need].after.find(a => C.fitted(g, a) < C.PARTS[a].n); return `THE TRUCK: needs ${blocked ? `the ${blocked} before the ${need}` : `a ${need}`} (find parts on Earth)`; }
const nearCar = () => g.car && (C.seatOf(g, me.id) >= 0 || Math.hypot(me.x - g.car.x, me.z - g.car.z) < 3.8);
function carLine() { const c = g.car, kg = C.storeKg(c); const mySeat = C.seatOf(g, me.id); if (mySeat >= 0) return `F  ·  GET OUT   ·   ${['DRIVING', 'ROOF LAMP', 'MOUNTED GUN', 'MOUNTED GUN'][mySeat]}   ·   ${Math.round(Math.abs(c.v) * 3.6)} km/h   ·   load ${kg} of ${C.CAR.store} kg<span style="display:block;margin-top:4px;font-size:14px"><b class="seatnext" style="cursor:pointer;color:#ff4fd8;font-weight:500">X  ·  NEXT SEAT</b></span>`;
  return (me.pack || []).length ? `F  ·  LOAD YOUR PACK INTO THE TRUCK (${kg} of ${C.CAR.store} kg)` : !c.seats.includes(null) ? 'The truck is full.' : `F  ·  GET IN${c.seats[0] === null ? ' AND DRIVE (W, S, A, D)' : ''}`; }
function useShip() { if (isHost()) C.useShip(g, me); else net.send({ t: 'build', k: 'ship' }); }   // (the host seats the pilot: two people can never fly one ship)
function useCar() { if (isHost()) { const r = C.useCar(g, me); if (r === 'stowed') { sound.drop(); say('Loaded into the truck.', 2); } else if (r === 'full') say('The truck is full.', 2); } else net.send({ t: 'build', k: 'car', x: 0, z: 0 }); }
function friendSign() {   // (the world keeps your friends: walk past what someone else built, or where they fell, and it says so)
  const hon = g.nodes.find(n => n.honor && Math.hypot(me.x - n.x, me.z - n.z) < 2.2); if (hon) return `The camp raised this lamp for ${hon.honor === SET.name ? 'you' : hon.honor}  ·  for pulling more than their weight`;
  const mine = n => !n || n === SET.name, node = g.nodes.find(n => !mine(n.who) && Math.hypot(me.x - n.x, me.z - n.z) < 2.2);
  if (node) return `${node.who}'s ${node.kind}  ·  built night ${node.n || '?'}${node.lit ? ', still carrying light' : ', dark now'}`;
  const m = g.marks.find(m => m.k === 'fall' && !mine(m.who) && Math.hypot(me.x - m.x, me.z - m.z) < 1.6); return m ? `${m.who} fell here  ·  night ${m.n}` : '';
}
function act() { if (me.ember) return; if (ship && (ship.on || ship.near(me, g))) return useShip(); if (nearCar()) return useCar(); if (nearWreck()) return stripWreck(); if (atPad()) return trip('drop'); if (atSite()) return trip('rise'); if (atBay() && C.PART_ORDER.some(k => C.canFit(g, k))) return fitPart(); if (atStore() && shortAmmo()) return resupply(); if (camp && camp.near) return camp.check(); tryGrow(); }   // (F, or a click on the prompt: whatever is in front of you)
$('prompt').addEventListener('click', e => { if (e.target.closest('.seatnext')) return nextSeat(); const st = e.target.closest('.site'); if (st) { SET.site = st.dataset.s; save(); return; } const b = e.target.closest('.bet'); if (b && atPad()) { stake = +b.dataset.p / 100; say(`Staked: you said ${b.dataset.p}% you come back. The board keeps score.`, 4); trip('drop'); return; } act(); });
// staking your own odds (INNOVATION.md idea 4): a guess before a trip, scored by what happened; the board shows how true your guesses run
let stake = null; function settleStake(back) { if (stake === null) return; SET.stakes = [...(SET.stakes || []), [stake, back ? 1 : 0]].slice(-200); save(); stake = null; }
const stakeScore = () => { const st = SET.stakes || []; return st.length ? { n: st.length, brier: st.reduce((a, [p, o]) => a + (p - o) ** 2, 0) / st.length, back: st.filter(x => x[1]).length } : null; }; $('prompt').style.pointerEvents = 'auto'; $('prompt').style.cursor = 'pointer';
function pickBuild(k) { buildPick = k; drawBuild(); }
function buildSpot() { const o = new THREE.Vector3(me.x, me.y + eyeH, me.z), d = look(); for (let t = 1; t < 9; t += 0.25) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y <= g.land(x, z)) return { x, z }; } return { x: o.x + d.x * 5, z: o.z + d.z * 5 }; }
const ghost = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.8, depthTest: false })); ghost.visible = false; scene.add(ghost);
function build(p, kind, x, z) {   // (host only: the player must carry the light, and stand within 9 m of where it goes)
  const K = C.NODE[kind]; if (!K || !Number.isFinite(x) || !Number.isFinite(z) || p.ember || p.carried < K.cost || Math.hypot(p.x - x, p.z - z) > 9) return null;
  p.carried -= K.cost; return C.placeNode(g, kind, x, z, p.id);
}
function tryBuild() { if (buildPick === 'lamp' && SET.name && g.econ && !C.econ.lamps(g, SET.name)) return say(`You are ${C.econ.behind(g, SET.name).toFixed(1)} days behind on dues. The camp hands out no lamps until you catch up: bank light into the fire.`, 5); const K = C.NODE[buildPick]; if (me.carried < K.cost) return say(`A ${buildPick} costs ${K.cost} light. You carry ${Math.floor(me.carried)}.`); const s = buildSpot(); sound.buy();
  if (isHost()) { const n = build(me, buildPick, s.x, s.z); if (n) say(n.lit ? `The ${buildPick} takes the light.` : `Too far from the light: the ${buildPick} stays dark. Place it within reach of a lit relay.`, 3); } else net.send({ t: 'build', k: buildPick, x: +s.x.toFixed(2), z: +s.z.toFixed(2) }); }
function drawBuild() { $('build').innerHTML = Object.entries(C.NODE).map(([k, K]) => `<button class="bk${buildPick === k ? ' on' : ''}${me && me.carried < K.cost ? ' off' : ''}" data-k="${k}">${k === 'relay' ? 'RELAY (Q)' : 'LAMP (E)'}<small>${K.cost} light: ${k === 'relay' ? 'carries light on, ' + K.reach + ' m' : 'shines wide, carries nothing'}</small></button>`).join('') + `<button class="bk${me && me.carried < C.FLARE.cost ? ' off' : ''}" data-k="flare">FLARE (G)<small>${C.FLARE.cost} light: lights the ground for ${C.FLARE.life} s${C.DARK.off ? '' : ', draws the dark in and burns it'}</small></button>`; }
$('build').addEventListener('click', e => { const b = e.target.closest('.bk'); if (!b) return; if (b.dataset.k === 'flare') return throwFlare(); pickBuild(buildPick === b.dataset.k ? null : b.dataset.k); });
function flareSpot() { const o = new THREE.Vector3(me.x, me.y + eyeH, me.z), d = look(); for (let t = 1; t <= C.FLARE.reach; t += 0.25) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y <= g.land(x, z) + 0.1) return [x, z]; } return [o.x + d.x * 12, o.z + d.z * 12]; }   // (where you aim, on the ground, up to 16 m)
function nextSeat() { if (C.seatOf(g, me.id) < 0) return; if (isHost()) { const j = C.nextSeat(g, me); if (j >= 0) say(['You take the wheel.', 'You take the roof lamp. Look where it should shine.', 'You take the mounted gun.', 'You take the mounted gun.'][j], 2); } else net.send({ t: 'build', k: 'seat', x: 0, z: 0 }); }
function throwFlare() { if (me.ember) return; const cost = C.flareCost(g, me); if (me.carried < cost) return say(`A flare costs ${cost} light${cost > C.FLARE.cost ? ' (more, while you are behind on dues)' : ''}. You carry ${Math.floor(me.carried)}.`, 3); const [x, z] = flareSpot(); sound.buy(); if (isHost()) C.throwFlare(g, me, x, z); else net.send({ t: 'build', k: 'flare', x: +x.toFixed(2), z: +z.toFixed(2) }); }

// ---------------------------------------------------------------- moving: grounded but sharp (fast to start and stop, real weight on slopes)
let aimOn = false, sprintOn = false;
// Modern Warfare (2019)'s movement and aim as the baseline (his pick, 2026-10-19; taste rule 101). Mechanics from Activision's own movement guide
// (blog.activision.com, 2019-10): tactical sprint (double-tap sprint, once a life, gun raised so slower to fire after), crouch (steadier, slower),
// slide (crouch while sprinting: a burst, then low and steady), repeated jumps get shorter, firing mid-air is far less accurate; sprint and fire never
// mix. Numbers: ADS by class from published averages (rifle 0.25 s, machine gun 0.45 s; pistol 'nearly instant'), sprint-to-fire 0.21 s from Modern
// Warfare II on the same engine. Marked 'ours' where no number was published and it is our tuning.
const MW = { adsT: { pistol: 0.15, ar: 0.25, shotgun: 0.3, lmg: 0.45 }, toFire: 0.21, tacToFire: 0.35 /* ours */, tacMul: 1.25 /* ours */, tacTime: 3 /* ours */,
  crouchMul: 0.55 /* ours */, slideV: 9 /* ours */, slideT: 0.8 /* ours */, jumpFade: 0.82 /* ours */, eye: [1.62, 1.1, 0.85] };
// Advanced Warfare's exo moves on top (his ask: a for-fun throwaway, copy it). Numbers are AW's own settings, read from GitHub (InfinityLoader/IL-GSC,
// AW's decompiled scripts; bradstv/exo-movement-mod, which ports them), inches to meters (x 0.0254): boost jump = jump again in the air, four
// pushes of 150 in/s 0.05 s apart (high_jump_height); boost dodge = sprint key plus a direction that is not straight forward (or any, in the air),
// 400 in/s with a 150 in/s hop (dodge_vel_multiplier, dodge_vel_z_offset), two per 2.5 s, 0.2 s apart, never while aiming; boost slam = crouch in
// the air at 120 in (3 m) up or more: 150 in/s more downward each 0.05 s, then a ring of damage (core SLAM)
const IN = 0.0254, EXO = { push: 150 * IN, pushes: 4, dodge: 400 * IN, hop: 150 * IN, steer: 250 * IN, dodges: 2, window: 2.5, gap: 0.2, slamH: 120 * IN, slamV: 150 * IN };
let exo = { left: 0, pt: 0, used: false, n: 0, reset: 0, cd: 0, burst: 0, slam: false, st: 0 };
// the flashlight: V turns it on and off. A real spot light on your view, and in the rules a beam of light (core TORCH)
const torch = new THREE.SpotLight(0xe8ebff, 0, 22, 0.3, 0.45, 1.6); torch.position.set(0.15, -0.1, 0); torch.target.position.set(0, -0.05, -1); camera.add(torch, torch.target); if (!camera.parent) scene.add(camera); let torchSaid = false;
addEventListener('keydown', e => { if (e.code !== 'KeyV' || e.repeat || mode !== 'play' || !me || panel) return; me.torch = !me.torch; torch.intensity = me.torch ? 40 : 0; sound.click && sound.click();
  if (me.torch && !torchSaid) { torchSaid = true; say('Flashlight on. What it touches, you can shoot. They can see it too.', 4); } });
let tac = 0, tacLeft = 1, lastShift = -9, crouch = false, slideT = 0, slideDir = [0, 0], readyT = 0, eyeH = 1.62, jumps = 0, groundT = 0, mvSprint = false;
addEventListener('keydown', e => { if (e.repeat || mode !== 'play' || !me || panel || me.ember) return;
  if (e.code === 'Space' && !onGround && coyote <= 0 && !exo.used && !exo.slam) { exo.used = true; exo.left = EXO.pushes; exo.pt = 0; kick = Math.min(1, kick + 0.25); }   /* (the boost jump) */
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { const sd = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), fd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    if ((sd || fd < 0 || (!onGround && fd)) && ads < 0.5 && exo.cd <= 0 && exo.n < EXO.dodges) { const sinY = Math.sin(me.yaw), cosY = Math.cos(me.yaw); let wx = -sinY * fd + cosY * sd, wz = -cosY * fd - sinY * sd; const L = Math.hypot(wx, wz) || 1;
      let mx = vel.x + wx / L * EXO.steer, mz = vel.y + wz / L * EXO.steer; const M = Math.hypot(mx, mz) || 1; vel.x = mx / M * EXO.dodge; vel.y = mz / M * EXO.dodge; vy = (Math.max(0, vy) + EXO.hop) * 0.7; onGround = false;
      exo.n++; exo.reset = EXO.window; exo.cd = EXO.gap; exo.burst = 0.35; kick = Math.min(1, kick + 0.2); return; }   /* (the boost dodge: a hard shove sideways or back, a small hop) */
    const t = performance.now() / 1000; if (t - lastShift < 0.3 && tacLeft > 0 && keys.KeyW && onGround) { tac = MW.tacTime; tacLeft--; crouch = false; } lastShift = t; }
  if ((e.code === 'KeyC' || e.code === 'ControlLeft') && !onGround) { if (me.y - g.land(me.x, me.z) >= EXO.slamH && !exo.slam) { exo.slam = true; exo.st = 0; } return; }   /* (the boost slam, from 3 m up) */
  if (e.code === 'KeyC' || e.code === 'ControlLeft') { if (mvSprint && onGround) { const L = Math.hypot(vel.x, vel.y) || 1; slideT = MW.slideT; slideDir = [vel.x / L, vel.y / L]; crouch = true; tac = 0; } else crouch = !crouch; } });   /* (aim and sprint as toggles, when he picks that in the pause menu) */
const vel = new THREE.Vector2(); let vy = 0, onGround = true, coyote = 0, jumpBuf = 0;   /* (GAMEDEV-TRICKS.md 22: a jump still works 0.15 s after a ledge, and a press 0.15 s before landing counts) */
function move(dt) {
  if (me.ember) { tacLeft = 1; crouch = false; slideT = 0; return; } if (ship && ship.on) { vel.x = vel.y = 0; vy = 0; onGround = true; return; }   /* (flying: the ship moves you) */
  const seat = C.seatOf(g, me.id); if (seat >= 0 && g.car) {   // (in the truck: you ride; the driver's W/S and A/D are throttle and steering)
    me.drive = seat === 0 ? { th: (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), st: (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) } : null;
    [me.x, me.z] = C.seatPos(g.car, seat); me.y = g.land(me.x, me.z) + 0.9; vel.x = vel.y = 0; vy = 0; onGround = true; return; }
  const f = Math.max(-1, Math.min(1, (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) + padMove.f)), s = Math.max(-1, Math.min(1, (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + padMove.s)), wantAds = (SET.aimToggle ? aimOn : mouse[2]) && !buildPick && reloadT <= 0, sprintKey = ((SET.sprintToggle ? sprintOn : (keys.ShiftLeft || keys.ShiftRight)) || padSprint) && f > 0, sprint = sprintKey && !wantAds && !mouse[0] && slideT <= 0;   /* (aiming or firing ends a sprint, as in Modern Warfare) */
  if (sprint && crouch) crouch = false; mvSprint = sprint; if (!sprint) tac = 0; else if (tac > 0) tac -= dt; readyT = sprint ? (tac > 0 ? MW.tacToFire : MW.toFire) : Math.max(0, readyT - dt); if (f <= 0) sprintOn = padSprint = false;
  const sinY = Math.sin(me.yaw), cosY = Math.cos(me.yaw); let wx = -sinY * f + cosY * s, wz = -cosY * f - sinY * s; const len = Math.hypot(wx, wz) || 1; wx /= len; wz /= len;
  const top = (sprint ? 7.4 * (tac > 0 ? MW.tacMul : 1) : 4.6) * C.speedOf(me) * (1 - ads * 0.35) * (f || s ? 1 : 0) * (crouch && !sprint ? MW.crouchMul : 1), acc = onGround ? 14 : 3;   // (about a third of a second to full speed, less to stop)
  if (slideT > 0 && onGround) { slideT -= dt; const k = Math.max(0, slideT / MW.slideT), v = MW.slideV * k + 4.6 * MW.crouchMul * (1 - k); vel.x = slideDir[0] * v; vel.y = slideDir[1] * v; }   /* (the slide: a burst along where you were running, easing down to a crouch) */
  else { const a2 = exo.burst > 0 ? 2 : acc; vel.x += (wx * top - vel.x) * Math.min(1, a2 * dt); vel.y += (wz * top - vel.y) * Math.min(1, a2 * dt); }   /* (a dodge carries before your feet take over again) */
  exo.burst -= dt; exo.cd -= dt; if ((exo.reset -= dt) <= 0) exo.n = 0;
  if (exo.left > 0 && (exo.pt -= dt) <= 0) { vy = exo.left === EXO.pushes ? EXO.push : vy + EXO.push; exo.left--; exo.pt = 0.05; }
  if (exo.slam && (exo.st -= dt) <= 0) { exo.st = 0.05; vy -= EXO.slamV; const fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw); vel.x = vel.x * 0.5 + fx * EXO.slamV; vel.y = vel.y * 0.5 + fz * EXO.slamV; }
  const nx = me.x + vel.x * dt, nz = me.z + vel.y * dt, rise = g.land(nx, nz) - g.land(me.x, me.z);
  if (rise / Math.max(0.001, Math.hypot(vel.x, vel.y) * dt) < 1.4 || !onGround) { me.x = nx; me.z = nz; }   // (slopes steeper than about 55 degrees stop you)
  [me.x, me.z] = C.pushOut(me.x, me.z); if (camp) [me.x, me.z] = camp.pushOut(me.x, me.z);   /* (Earth's towers are solid) */
  { const r = Math.hypot(me.x, me.z), a = Math.atan2(me.z, me.x), gate = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.1;   /* (the camp wall at 21 m: solid except the gate) */
    if (!gate && Math.abs(r - 21) < 0.7) { const to = r < 21 ? 20.3 : 21.7; me.x *= to / r; me.z *= to / r; } }
  coyote = onGround ? 0.15 : coyote - dt; jumpBuf -= dt;
  groundT = onGround ? groundT + dt : 0;
  if ((keys.Space || jumpBuf > 0) && (onGround || coyote > 0)) { jumps = groundT < 1 ? jumps + 1 : 0; vy = 6.2 * Math.pow(MW.jumpFade, Math.min(jumps, 4)); onGround = false; coyote = 0; jumpBuf = 0; slideT = 0; crouch = false; }   /* (jump again quickly and each jump is shorter) */
  eyeH += ((slideT > 0 ? MW.eye[2] : crouch ? MW.eye[1] : MW.eye[0]) - eyeH) * Math.min(1, dt * 12);
  vy -= 20 * dt; me.y += vy * dt; const ground = g.land(me.x, me.z);
  if (me.y <= ground) { if (!onGround && vy < -7) sound.land(-vy); if (exo.slam) { exo.slam = false; vel.x = vel.y = 0; kick = 1; fx.burst(new THREE.Vector3(me.x, ground + 0.2, me.z), 30, [0.7, 0.55, 1], 6, 0.5); if (isHost()) C.slam(g, me, me.x, me.z); else net.send({ t: 'build', k: 'slam', x: 0, z: 0 }); } exo.used = false; me.y = ground; vy = 0; onGround = true; } else if (me.y > ground + 0.05) onGround = false;
}

// ---------------------------------------------------------------- the HUD (rewritten only when what it shows changes)
const was = {}; const txt = (id, v, html = false) => { if (was[id] !== v) { was[id] = v; html ? $(id).innerHTML = v : $(id).textContent = v; } };
const PHASE = { day: ['THE LULL', 'the dark holds back'], dusk: ['IT STIRS', 'the dark is rolling in'], night: ['THE SURGE', 'hold the light'], dawn: ['IT EBBS', 'the dark draws back'] };
function hud() {
  const f = g.fire, next = C.FIRE_COST[f.level + 1];
  txt('fireHud', `<b>FIRE ${f.level}</b><small>${next ? `${Math.min(next, Math.floor(f.light))} of ${next} light to grow it` : 'as big as it gets'}  ·  fuel ${Math.ceil(f.fuel)} s</small>`, true);
  const [a, b] = PHASE[C.phase(g.clock)]; if (C.onEarth(me) && g.earth) { const t = Math.max(0, Math.ceil(g.earth.t)); txt('phase', `<b>EARTH</b><small>the lander leaves in ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</small>`, true); } else txt('phase', `<b>${a}</b><small>${b}  ·  night ${g.night}</small>`, true);
  { const kg = C.loadOf(me); txt('light', `<b>${Math.floor(me.carried)}</b><span>LIGHT CARRIED (bring it to the fire, or build with it)</span>${kg ? `<span style="display:block;color:#b9a8ff">PACK ${kg} kg: ${(me.pack || []).join(', ')} (${Math.round(C.speedOf(me) * 100)}% speed; drop it at the truck bay)</span>` : ''}`, true); }
  $('hpBar').style.width = Math.max(0, me.hp) + '%'; $('hpBar').style.opacity = (0.35 + 0.65 * Math.max(0, me.hp) / 100).toFixed(2);
  const am = ammo[gunKey]; if (mounted()) txt('ammo', `<b>${Math.round(heat * 100)}%</b><span>heat</span><small>${overheat ? 'TOO HOT, COOLING' : 'MOUNTED GUN, endless rounds'}</small>`, true); else txt('ammo', `<b>${am.mag}</b><span>/ ${am.res}</span><small>${GUNS[gunKey].name}${reloadT > 0 ? '  reloading' : ''}</small>`, true);
  const nearFire = Math.hypot(me.x - f.x, me.z - f.z) < C.fireRadius(f), wakes = C.WAKES[Math.min(f.level + 1, C.WAKES.length - 1)];
  txt('prompt', ship && ship.near(me, g) && !me.ember ? 'F  ·  BOARD THE SHIP' : me.ember ? (C.onEarth(me) ? 'You fell. A friend can carry your Ember to the lander.' : 'You fell. A friend can carry your Ember to the fire.') : nearCar() ? carLine() : nearWreck() ? `F  ·  STRIP THE WRECK (${nearWreck().left} part${nearWreck().left > 1 ? 's' : ''} left in it)` : atPad() ? `F  ·  DROP TO EARTH${g.earth ? ` (the lander waits ${Math.ceil(g.earth.t)} s)` : ' (150 s down there)'}${g.earth ? '' : siteRow()}<span style="display:block;margin-top:5px;font-size:14px;color:#b9a8ff">or stake your odds of coming back, then drop: ${[90, 70, 50, 30].map(n => `<b class="bet" data-p="${n}" style="cursor:pointer;color:#ff4fd8;margin:0 6px;font-weight:500">${n}%</b>`).join('')}</span>` : atSite() ? 'F  ·  RIDE UP (bring what you carry home)' : atBay() ? bayLine() : atStore() ? (shortAmmo() ? 'F  ·  RESUPPLY FROM THE CAMP STORE' : 'The store: your guns are full.') : camp && camp.near ? 'F  ·  CHECK THE REAL ODDS (free)' : camp && camp.bunkNear(me) ? (b => `${b.name}'s bunk  ·  fed the fire ${b.dues} light`)(camp.bunkNear(me)) : friendSign() ? friendSign() : buildPick ? 'Left click to place, right click to cancel' : nearFire && C.canGrow(g) ? `F  ·  GROW THE FIRE to level ${f.level + 1}${wakes.length ? '. Tonight the dark answers' : ''}` : '', true);
  { const at = me.ember ? null : nearCar() ? [g.car.x, g.land(g.car.x, g.car.z) + 2.6, g.car.z] : atPad() ? [C.PAD.x, g.land(C.PAD.x, C.PAD.z) + 4.6, C.PAD.z - 1.6] : atSite() ? [C.EARTH.x, g.land(C.EARTH.x, C.EARTH.z) + 4.6, C.EARTH.z - 1.6] : atBay() ? [C.BAY.x, g.land(C.BAY.x, C.BAY.z) + 2.4, C.BAY.z] : atStore() ? [STORE.x, g.land(STORE.x, STORE.z) + 2.6, STORE.z] : nearFire ? [f.x, g.land(f.x, f.z) + 2.4, f.z] : null;
    let tx = innerWidth / 2, ty = innerHeight * 0.6;   // (the tag hangs over the thing it belongs to; off screen, it waits low in the middle)
    if (at) { _v.set(...at).project(camera); if (_v.z < 1 && Math.abs(_v.x) < 0.95 && Math.abs(_v.y) < 0.95) { tx = (_v.x * 0.5 + 0.5) * innerWidth; ty = (-_v.y * 0.5 + 0.5) * innerHeight; } }
    { const el = $('prompt'), h = el.offsetHeight || 40, w = el.offsetWidth || 200; ty = Math.max(h + 96, Math.min(innerHeight - 190, ty)); tx = Math.max(w / 2 + 24, Math.min(innerWidth - w / 2 - 24, tx)); }   /* (never over the visor's corners or the bottom bar: nothing overlaps) */
    const tf = `translate(${tx.toFixed(0)}px, ${ty.toFixed(0)}px) translate(-50%, -100%)`; if ($('prompt').style.transform !== tf) $('prompt').style.transform = tf; }
  if ((msgT -= 1 / 60) <= 0) txt('msg', '');
  if (was.carry !== Math.floor(me.carried / 5)) { was.carry = Math.floor(me.carried / 5); drawBuild(); }
}

// ---------------------------------------------------------------- the frame
let last = performance.now(), fpsN = 0, fpsT = 0;
function frame(now) {
  if (AUTO && now - last < 24) return requestAnimationFrame(frame);   // (the robot player's runs draw at most about 40 frames a second: headless has no screen to wait for, and the card ran at 97%)
  requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; sandyCd = Math.max(0, sandyCd - dt); sandyT = Math.max(0, sandyT - dt); tScale += ((sandyT > 0 ? SANDY.scale : 1) - tScale) * Math.min(1, dt * 8); const wdt = dt * tScale; grade.uniforms.uS.value = (1 - tScale) / (1 - SANDY.scale);   /* (wdt: the world's time; dt stays yours) */
  if (mode !== 'play') { padStep(dt); const t = now / 1000; camera.position.set(0, 90, 0); camera.rotation.set(0.38 + Math.sin(t * 0.07) * 0.015, Math.atan2(-0.6, 0.78) + 0.2 + Math.sin(t * 0.05) * 0.035, 0, 'YXZ');   /* (Earth sits right of the menu and never drifts behind it) */ sky.material.uniforms.uT.value = t; renderer.render(scene, camera); return; }   // (the home screen looks at Earth, drifting slowly)
  const left = updateTiles(); if (!g.ready) { if (left > 0) { $('loading').textContent = `Lighting the fire: ${left} tiles left`; camera.position.set(me.x, me.y + 1.6, me.z); renderer.render(scene, camera); return; } g.ready = true; $('loading').hidden = true; say('The dark has no edge. Gather its light and push it back.', 5); }
  if (AUTO) window.__eyes = eyes(); if (DEMO && !panel) (/night/.test(location.search) ? demoNight : demoStep)(dt); if (!panel) move(dt);
  padStep(dt); smartStep(dt); shotCd = Math.max(0, shotCd - dt); if (reloadT > 0 && (reloadT -= dt) <= 0) { reloadT = 0; const G = GUNS[gunKey], a = ammo[gunKey], n = Math.min(G.mag - a.mag, a.res); a.mag += n; a.res -= n; }
  heat = Math.max(0, heat - dt * 0.32); if (overheat && heat < 0.35) overheat = false;   /* (the mount cools about a third of its heat a second) */
  if (GUNS[gunKey].charge && !mounted()) { const can = locked() && !panel && !buildPick && reloadT <= 0 && ammo[gunKey].mag > 0 && shotCd <= 0 && !mvSprint;   /* (the rail: hold to charge, let go to fire) */
    if (mouse[0] && can) { if (railC === 0) { if (railRig) railRig.charge(); sound.click(); } railC = Math.min(1, railC + dt / GUNS[gunKey].charge); } else if (railC > 0) { shoot.c = railC; railC = 0; shoot(); } else if (mouse[0] && !can && ammo[gunKey].mag <= 0 && !shoot.held) { shoot(); shoot.held = true; } if (!mouse[0]) shoot.held = false; }
  else { if (locked() && mouse[0] && !panel && !buildPick && (mounted() || GUNS[gunKey].auto || !shoot.held)) { shoot(); shoot.held = true; } if (!mouse[0]) shoot.held = false; }
  if (me.ember || (ship && ship.on)) aimOn = false; { const want = (SET.aimToggle ? aimOn : mouse[2]) && !buildPick && reloadT <= 0 && !mvSprint && readyT <= 0, T = MW.adsT[gunKey] || 0.25; ads = want ? Math.min(1, ads + dt / T) : Math.max(0, ads - dt / (T * 0.8)); }   /* (each gun reaches its sights in its own time, a straight line in, as in Modern Warfare) */
  if (god) me.hp = 100; const hp0 = me.hp; if (isHost()) { if (!(panel && !net)) { runFriends(wdt); C.step(g, wdt); } }   /* (alone, a menu pauses the world: the fire stops burning while you read) */ else { g.t += dt; g.clock += dt / C.DAY; } if (me.hp < hp0) { $('hurt').style.opacity = Math.min(0.6, (hp0 - me.hp) / 25); setTimeout(() => $('hurt').style.opacity = 0, 160); sound.hurt(); }
  const evs = g.log.splice(0); if (net && net.host && evs.length) net.send({ t: 'ev', e: evs.slice(0, 20) });
  for (const e of [...evs, ...inbox.splice(0)]) { friendHeard(e); if (e[1] === 'honor') say(`${e[2] === SET.name ? 'The camp raised a lamp in the yard with your name on it' : `The camp raised a lamp for ${e[2]}`}: ${e[3]} so far, one for every 300 light of credit.`, 6); if (e[1] === 'pool') say(`The camp's pool goes into the fire: ${e[2]} light, gathered while friends were away. Everyone shares it now.`, 6); if (e[1] === 'fall' && e[2] === me.id) { const t = (g.traces || []).filter(t => t.of === me.id).pop(); say(lastFall = `You fell to ${e[3] ? 'a ' + e[3] : 'the dark'}${t && Math.hypot(t.fx - t.x, t.fz - t.z) > 0.5 ? `, from the ${dirName(t.fx - t.x, t.fz - t.z)}` : ''}. Your last ten seconds are drawn in red where you fell.`, 6); } else if (e[1] !== 'allfell') lastFall = '';
    if (e[1] === 'goes' || e[1] === 'returned' || e[1] === 'lost') { const who = String(e[2] || ''), Who = who[0] ? who[0].toUpperCase() + who.slice(1) : who;   // (the Clerk's paperwork on people who go out: dry, true, filed)
      say(e[1] === 'goes' ? `${Who} went out this morning. Form 7-B filed. Expected back tomorrow, per the form.` : e[1] === 'returned' ? `${Who} is back. The form was right, for once.` : `${Who} did not come back. Form 9-C, in triplicate. The council calls it a reassignment.`, 7); } if (e[2] === me.id && (e[1] === 'rise' || e[1] === 'stranded' || (e[1] === 'fall' && C.onEarth(me)))) settleStake(e[1] === 'rise'); if (e[1] === 'flood' && Number.isFinite(e[2])) { const x = Math.cos(e[2]), z = Math.sin(e[2]), h = ((Math.atan2(-x, -z) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2), dir = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(h * 8) % 8]; say(`The dark is pooling to the ${dir}, where your light is thinnest. It will pour in there.`, 5); } if (e[1] === 'bank') { sound.drop(); say(`+${Math.floor(e[3])} light to the fire.`, 2); } if (e[1] === 'level') { growFire(); sound.roundEnd(); say(`The fire grows to level ${e[2]}. Tonight the dark will answer.`, 5); } if (e[1] === 'dusk' && isHost()) duskSnap = JSON.stringify(C.saveWorld(g)); if (e[1] === 'dusk') { sound.round(); say(e[3] ? 'It stirs. The fire\'s growth woke something.' : 'It stirs.', 4); } if (e[1] === 'broke') say(`A ${e[2]} was torn down. The light past it went dark.`, 4); if (e[1] === 'allfell') say(`${lastFall ? lastFall + ' ' : ''}Everyone fell. The fire took you back; the light you carried is out there where you dropped it.`, 7); }
  drawHollow(wdt); drawGrowRing(dt); drawBreach(dt); hitStop = Math.max(0, hitStop - dt); drawBurns(dt); drawTraces(); drawFlares(); drawNetwork(now / 1000); drawMotes(); drawMarks(); fx.update(wdt); sky.material.uniforms.uT.value = now / 1000; grade.uniforms.uT.value = now / 1000; { const e = C.onEarth(me) ? 1 : 0, c = g.clock, day = e ? (c < C.DUSK_AT ? 1 : c < C.NIGHT_AT ? 1 - (c - C.DUSK_AT) / (C.NIGHT_AT - C.DUSK_AT) : c < C.DAWN_AT ? 0 : (c - C.DAWN_AT) / (1 - C.DAWN_AT)) : 0;   /* (Earth has a real day and night, his ask 2026-10-19: overcast gray by day, the stars by night; the Moon has no air, so its sky stays black) */
    sky.position.copy(camera.position); { const r = e ? 0.6 + 0.4 * Math.sin(now / 47000) : 0; rain.update(now / 1000, camera, r); visor.uniforms.uT.value = now / 1000; visor.uniforms.uAmt.value += (r - visor.uniforms.uAmt.value) * Math.min(1, dt * 0.5); visor.uniforms.uWipe.value = Math.max(0, visor.uniforms.uWipe.value - dt * 0.35); } sky.material.uniforms.uEarth.value = e; sky.material.uniforms.uDay.value = day;   /* (the dome follows you: it sat at the Moon camp, so on Earth, 6 km away, there was no sky at all, only black) */ scene.fog.color.copy(FOG_NIGHT).lerp(FOG_EARTH_DAY, day); if (lookFx && lookFx.dev) { hemi.intensity = 0.7 + 0.5 * day; hemi.color.setHex(0xb4bcd4); hemi.groundColor.setHex(0x22242c); } else { hemi.intensity = 0.09 + 0.9 * day; hemi.color.setHex(day > 0.5 ? 0x8890a8 : 0x5a6fb0); } scene.fog.density = (e ? 0.024 : 0.016) * (lookFx ? lookFx.fogK : 1); }
  if (buildPick) { const s = buildSpot(); ghost.visible = true; ghost.position.set(s.x, g.land(s.x, s.z) + 0.05, s.z); } else ghost.visible = false;
  kick += -kick * Math.min(1, dt * 10); if ((hitT -= dt) <= 0) $('hit').className = '';
  coldHands(dt); updateShade(); scanCd = Math.max(0, scanCd - dt); me.crouch = crouch || slideT > 0;
  { const dx = me.x - (frame.px ?? me.x), dz = me.z - (frame.pz ?? me.z), d = Math.hypot(dx, dz); frame.px = me.x; frame.pz = me.z;   // (your own footsteps, IMMERSION.md item 1: one every 1.75 m walking, 2.5 m sprinting; the view dips with each)
    if (onGround && !me.ember && !(ship && ship.on) && C.seatOf(g, me.id) < 0 && d < 1) { const L = mvSprint ? 2.5 : 1.75; frame.sd = (frame.sd || 0) + d; if (TEST) window.__dist = (window.__dist || 0) + d / L; if (frame.sd >= L) { frame.sd -= L; sound.step(mvSprint, C.onEarth(me) ? 2 : Math.hypot(me.x - g.fire.x, me.z - g.fire.z) < 22 ? 1 : 0, Math.min(1, (me.carried || 0) / 60)); frame.steps = (frame.steps || 0) + 1; if (TEST) window.__steps = frame.steps; } frame.bob = Math.sin(frame.sd / L * Math.PI) * (mvSprint ? 0.022 : 0.012) * (1 - ads); } else frame.bob = (frame.bob || 0) * 0.85; }
  camera.position.set(me.x, me.y + eyeH, me.z);   // (no step bob on the camera: his rule, nothing bobs; the footsteps stay as sound)
  { const live = !me.ember && !(ship && ship.on);   // (IMMERSION.md item 2: your breath after a sprint, 14 to 40 a minute; a heartbeat only when badly hurt or the dark is close, 70 + 70 x a minute)
    frame.puff = Math.max(0, Math.min(1, (frame.puff || 0) + (mvSprint ? dt / 6 : -dt / 10)));
    if (live && frame.puff > 0.15 && (frame.bt = (frame.bt ?? 0) - dt) <= 0) { const per = 60 / (14 + 26 * frame.puff); frame.bt = per / 2; frame.inh = !frame.inh; sound.breath(0.03 + 0.11 * frame.puff, frame.inh); }
    let near = 99; for (const k of g.hollow) if (!k.dead && !!k.earth === C.onEarth(me)) near = Math.min(near, Math.hypot(k.x - me.x, k.z - me.z));
    const x = Math.max(1 - me.hp / 100, near < 10 ? 1 - near / 10 : 0); if (TEST) window.__heart = x >= 0.5 ? 70 + 70 * x : 0;
    if (live && x >= 0.5 && (frame.ht = (frame.ht ?? 0) - dt) <= 0) { frame.ht = 60 / (70 + 70 * x); sound.heart(0.1 + 0.2 * (x - 0.5)); } } camera.rotation.set(me.pitch + kick * 0.035, me.yaw, 0, 'YXZ'); camera.fov = SET.fov - (gunKey === 'rail' ? 56 : 22) * ads; camera.updateProjectionMatrix();
  const driving = g.car && C.seatOf(g, me.id) === 0;   // (the driver sees the truck from behind; the mouse swings the view around it)
  if (driving) { const c = g.car, cy = g.land(c.x, c.z), back = 8.5, up = 3.2 - Math.max(-0.6, Math.min(0.8, me.pitch)) * 3;
    camera.position.set(c.x + Math.sin(me.yaw) * back, cy + up, c.z + Math.cos(me.yaw) * back); camera.lookAt(c.x, cy + 1.6, c.z); }
  if (ship && ship.on) { ship.camera(camera, me); ship.hud(me.yaw); }
  sound.listen(me.x, me.y + eyeH, me.z, -Math.sin(me.yaw), 0, -Math.cos(me.yaw));
  for (const k in held) held[k].visible = false; const gm = held[gunKey];
  if (gm && !me.ember && !(ship && ship.on)) { gm.visible = true; const u = gm.userData, a = ads * ads * (3 - 2 * ads);
    gm.position.set(0.15 * (1 - a), -0.15 + (-u.top - 0.006 + 0.15) * a, (-0.16 - u.len * 0.42) * (1 - a) + (-0.3 - u.len * 0.5) * a + kick * 0.035 * (1 - a * 0.6)); gm.rotation.set(kick * 0.05 * (1 - a * 0.7), 0.04 * (1 - a), 0); }
  if (models.fp_rifle && !fpRig) { fpRig = new FpRig(THREE, vcam, models.fp_rifle); if (DEMO) window.__fp = fpRig; } if (fpRig) { const on = !!(gm && gm.visible && gunKey === 'ar'); if (on) gm.visible = false; fpRig.update(dt, on, ads, kick); }
  if (models.fp_rail && !railRig) railRig = new FpRig(THREE, vcam, models.fp_rail); if (railRig) { const on = !!(gm && gm.visible && gunKey === 'rail'); if (on) gm.visible = false; railRig.update(dt, on, ads, kick, railC); }   /* (the rail sniper is only ever the Blender rig) */   /* (?fp: the Blender rifle stands in for the M4 and its arms) */
  hands.update(dt, { reloading: reloadT > 0 ? 1 - reloadT / (GUNS[gunKey].reload * reloadSpeed(gunKey)) : -1, ads, kick, moving: onGround ? Math.min(1, vel.length() / 4.6) : 0, gun: gunKey });   /* (the arms: hands.js, the reload as a real hand motion; it hides itself when the gun is hidden) */
  drawFriends(dt); sync(dt); if (camp) camp.update(dt); if (ship) { if (ship.on && padOn) { const gp = [...navigator.getGamepads()].find(x => x && x.connected), tv = i => gp && gp.buttons[i] ? gp.buttons[i].value : 0; Object.assign(keys, { KeyW: padMove.f > 0.3, KeyS: padMove.f < -0.3, KeyA: padMove.s < -0.3, KeyD: padMove.s > 0.3, Space: tv(7) > 0.3, ShiftLeft: tv(6) > 0.3 }); frame.padShip = true; } else if (frame.padShip) { frame.padShip = false; for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'ShiftLeft']) keys[k] = false; } ship.update(dt, keys, me, g, isHost()); }   /* (flying on the pad: left stick flies and turns, RT climbs, LT descends) */ wrist.update(dt); { const k = Math.max(Math.max(0, 1 - C.lightAt(g, me.x, me.z, true) * 3) * 0.85, 0.75 * grade.uniforms.uS.value); if (Math.abs(k - (frame.muf ?? -1)) > 0.03) { frame.muf = k; sound.muffle(k); } }   /* (sound is sharp only in light: out in the dark the world goes muffled. INNOVATION.md idea 9) */ if (guide) guide.update(dt); if (truck) truck.update(g); hudLook.update(dt, me, g, C, () => { const am = ammo[gunKey]; return am.mag + '/' + am.res + gunKey + (reloadT > 0); });
  const free = !locked() && !panel; if (clickPlay.hidden === free) clickPlay.hidden = !free; { const o = free ? 0.4 : Math.max(0, 1 - ads * 2.5); if (Math.abs(o - (frame.xo ?? -1)) > 0.02) { frame.xo = o; $('cross').style.opacity = o.toFixed(2); } }   /* (one reticle: dim on standby, gone by 40% into the sights, where the gun's own sight takes over) */
  { const ph = C.phase(g.clock), nt = ph === 'night' ? 1 : ph === 'dusk' || ph === 'dawn' ? 0.5 : 0, onE = C.onEarth(me);   // (far sounds: each from a real shape, wreck or part out there)
    const causes = [...g.hollow.filter(k => !k.dead && !!k.earth === onE).map(k => ({ x: k.x, z: k.z, dark: true })), ...(onE ? [...((g.earth && g.earth.wrecks) || []), ...(g.parts || [])].map(w => ({ x: w.x, z: w.z })) : [])];
    const e = !me.ember && farStep(frame.far = frame.far || {}, dt, me, nt, causes); if (e) { amb.far(e.voice, e.x, g.land(e.x, e.z) + 1, e.z, frame.muf || 0); if (TEST) (window.__far = window.__far || []).push(e.voice); } }
  amb.update(dt, camera, { x: g.fire.x, y: g.land(g.fire.x, g.fire.z), z: g.fire.z, level: g.fire.level }, C.lightAt(g, me.x, me.z), g.fire.fuel > 0); embers(dt); farLights(dt);
  hud();
  composer.render();   // (the world through bloom: only the brightest light bleeds, the fire, lamps, tracers; the HUD is never touched)
  const here = C.lightAt(g, me.x, me.z); vhemi.intensity = 0.35 + 2 * here; vsun.intensity = 0.25 + here; vcam.fov = 54 - 8 * ads; vcam.updateProjectionMatrix();
  if (!driving) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(vscene, vcam); renderer.autoClear = true; }
  fpsN++; fpsT += dt; if (fpsT > 0.5) { $('fps').textContent = `${Math.round(fpsN / fpsT)} fps`; fpsN = 0; fpsT = 0; }
}
// ---------------------------------------------------------------- DEV: dive in, test one thing, get back to playing (host or alone only: it changes the world)
function learnedFriend() {   // (a teammate who plays like someone from your recorded nights: a friend if any, else you)
  const crew = crewFrom(g.history || []), pick = crew.find(c => c.name !== SET.name) || crew[0], n = g.players.filter(p => p.bot).length; if (n >= 2) return 'Two learned friends is the most for now.';
  const style = pick ? { ...pick } : { name: SET.name || 'You', roam: 10, greed: 8, bankAt: 12, aim: 0.6, together: 0.6, blind: -1 }, id = 90 + n;
  const p = C.addPlayer(g, id, `${style.name}, learned`); p.bot = true; p.style = style; p.r = C.stream(g.seed, 'friend-' + id); const a = n * 2.4 + 1; p.homeX = g.fire.x + Math.cos(a) * Math.min(style.roam, 30); p.homeZ = g.fire.z + Math.sin(a) * Math.min(style.roam, 30);   /* (the same home the tested robot uses: sim/certify.mjs play) */
  return pick ? `${style.name}, learned from ${(g.history || []).length} recorded nights, is at your fire.` : 'No nights recorded yet, so this one plays like a careful newcomer. After a few nights it plays like you.';
}
// your words (queue 43: 'says some of the same things that he says'): lines a player typed themselves, kept by the host for their learned copy
const cleanLines = a => (Array.isArray(a) ? a : []).map(l => String(l).replace(/[<>&]/g, '').replace(/\s+/g, ' ').trim().slice(0, 70)).filter(l => l.length >= 2).slice(0, 12);
$('myLines').value = (SET.myLines || []).join(String.fromCharCode(10)); $('myLines').addEventListener('change', () => { SET.myLines = cleanLines($('myLines').value.split(String.fromCharCode(10))); save(); if (g && me) shareLines(); });
function shareLines() { if (isHost()) { (g.voice = g.voice || {})[SET.name] = SET.myLines || []; } else if (net) net.send({ t: 'lines', l: SET.myLines || [] }); }
const fvoice = new FriendVoice((who, line) => wrist.say(line, Math.min(8, 3 + line.length / 18), 'heard  ·  ' + who), (p, ev) => ownLine(p, ev));
const MOMENTS = { kill: 'kill', dusk: 'dusk', hurt: 'hurt', bank: 'bank', fell: 'youFell' };   // (a line may start with a moment word and a colon: 'kill: that one had it coming')
function ownLine(p, event) { const src = (p.style && p.style.name) || '', own = (g.voice || {})[src] || [];
  const fit = own.map(l => { const m = l.match(/^(\w+):\s*(.+)$/); return m && MOMENTS[m[1].toLowerCase()] ? { at: MOMENTS[m[1].toLowerCase()], line: m[2] } : { at: null, line: l }; }).filter(x => !x.at || x.at === event);
  const tagged = fit.filter(x => x.at); if (tagged.length && Math.random() < 0.8) return tagged[Math.floor(Math.random() * tagged.length)].line;   // (a line made for this moment wins most of the time)
  const loose = fit.filter(x => !x.at); return loose.length && Math.random() < 0.5 ? loose[Math.floor(Math.random() * loose.length)].line : null; }
function friendHeard(e) {   // (what a learned friend says, from what really happened)
  const bots = g.players.filter(p => p.bot && !p.ember); if (!bots.length) return; const by = id => bots.find(p => p.id === id);
  if (e[1] === 'kill' && by(e[3])) fvoice.speak(by(e[3]), 'kill'); else if (e[1] === 'bank' && by(e[2])) fvoice.speak(by(e[2]), 'bank');
  else if (e[1] === 'dusk') fvoice.speak(bots[0], 'dusk'); else if (e[1] === 'fall' && e[2] === me.id) fvoice.speak(bots[0], 'youFell');
}
function runFriends(dt) { fvoice.update(g.players, dt); for (const p of g.players) if (p.bot && !p.ember && p.hp < (p.hp0 ?? 100) - 8) fvoice.speak(p, 'hurt'); for (const p of g.players) if (p.bot) p.hp0 = p.hp; for (const p of g.players) if (p.bot && !p.ember) { const shot = friendThink(g, p, p.r, dt); if (shot) { const from = new THREE.Vector3(p.x, p.y + 1.5, p.z); sound.shot('pistol', from); fx.tracer(from, new THREE.Vector3(shot.x, shot.y, shot.z)); } } }
const DEV = [
  ['THE SIMULATOR', 'watch the robots test the game (opens a new tab)', () => { window.open('./sim.html', '_blank', 'noopener'); return 'The Simulator opened in a new tab.'; }],
  ['A LEARNED FRIEND JOINS', 'a teammate who plays like your recorded nights; keeps the camp', () => learnedFriend()],
  ['RESTART THE NIGHT', 'back to this dusk, as it was', () => { if (!duskSnap) return 'No dusk yet tonight. SKIP TO DUSK first.'; reloadWorld(JSON.parse(duskSnap)); return 'Back to dusk.'; }],
  ['SKIP TO DUSK', 'the dark starts rolling in', () => { g.clock = C.DUSK_AT - 0.002; return 'Dusk in a moment.'; }],
  ['SKIP TO DAWN', 'end the night now', () => { g.clock = 0.969; return 'Dawn in a moment.'; }],
  ['+100 LIGHT', 'in your hands, to build or bank', () => { me.carried += 100; return '+100 light carried.'; }],
  ['WAKE A GIANT', 'one walks out of the dark, 25 m away', () => { if (C.phase(g.clock) === 'day' || C.phase(g.clock) === 'dawn') g.clock = C.NIGHT_AT + 0.01; const K = C.KINDS.giant, x = me.x + Math.sin(me.yaw) * -25, z = me.z + Math.cos(me.yaw) * -25; g.hollow.push({ id: g.nextId++, kind: 'giant', x, z, y: g.land(x, z), yaw: 0, hp: K.hp, max: K.hp, sh: K.shell[0], sb: K.shell[1], cd: 0, dead: false, speed: K.speed }); return 'A giant is coming. Back away and keep shooting.'; }],
  ['GOD MODE', 'nothing hurts you (again to turn off)', () => { god = !god; return god ? 'God mode ON.' : 'God mode OFF.'; }],
  ['NEW WORLD', 'a fresh world; this one stays saved', () => { saveNow(); startWorld(null); return 'A new world.'; }],
  ['CLEAR THE DARK', 'every Hollow gone, right now', () => { g.hollow = []; return 'The dark is empty, for now.'; }],
];
function drawDev() { $('devBody').innerHTML = DEV.map(([n, d], i) => `<button class="key" data-i="${i}">${n}<small>(${d})</small></button>`).join(''); $('devNote').textContent = isHost() ? 'Each one closes this and puts you straight back in.' : 'Only the host can use DEV: it changes the whole world.'; }
$('devBody').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || !isHost()) return; const msg = DEV[+b.dataset.i][2](); $('dev').hidden = true; panel = null; $('paused').hidden = true; lockMouse(); say(msg, 3); });
$('openDev').onclick = () => { $('paused').hidden = true; $('dev').hidden = false; panel = 'dev'; drawDev(); };
$('devBack').onclick = () => { $('dev').hidden = true; $('paused').hidden = false; panel = 'pause'; };
$('openList').onclick = async () => { $('paused').hidden = true; $('list').hidden = false; panel = 'list';
  try { const d = await (await fetch('./checklist.json?t=' + Date.now())).json(), K = [['built', 'BUILT'], ['tested', 'TESTED'], ['seen', 'SEEN'], ['pad', 'PAD'], ['played', 'PLAYED']], esc = x => String(x || '').replace(/[<&>]/g, '');
    const n = it => K.filter(([k]) => it.checks[k]).length, done = d.items.filter(it => n(it) === 5).length;   // (five proven marks per item, his rule 2026-10-19; sim/checklist_verify.mjs erases any mark without its proof)
    $('listBody').innerHTML = `<p class="note" style="margin:0 0 10px">${done} of ${d.items.length} done. Each idea has a task and five marks; a mark only counts with its proof.</p>` + d.items.slice().sort((a, b) => n(b) - n(a)).map(it => `<div class="ck"><b class="${n(it) === 5 ? 'done' : n(it) ? 'in' : 'later'}">${n(it)} / 5</b><span>${esc(it.task)}<small>${esc(it.idea)}</small><small>${K.map(([k, w]) => `<i style="font-style:normal;margin-right:10px;color:${it.checks[k] ? '#ff4fd8' : '#5a5d72'}">${it.checks[k] ? '&#10003;' : '&#9675;'} ${w}</i>`).join('')}</small></span></div>`).join(''); }
  catch (e) { $('listBody').textContent = 'The checklist could not load.'; } };
$('listBack').onclick = () => { $('list').hidden = true; $('paused').hidden = false; panel = 'pause'; };
function reloadWorld(d) {   // (the world as it was at dusk; everyone here now stays, back at the fire)
  const keepers = g.players.map(p => ({ id: p.id, name: p.name, gun: p.gun })), w = C.loadWorld(d); if (!w) return;
  g = w; g.ready = true; for (const k of keepers) { const p = C.addPlayer(g, k.id, k.name); p.gun = k.gun; if (k.id === myId) me = p; }
  for (const [, v] of seen) scene.remove(v.o); seen.clear(); for (const [, o] of nodeObjs) scene.remove(o); nodeObjs.clear(); marksDrawn = -1;
  for (const p of g.players) p.tp = (p.tp || 0) + 1;   // (friends snap back to the fire too)
}
// ---------------------------------------------------------------- feedback while you play (Tab): words or voice, a picture of the moment, straight to Claude
const FB_URL = 'http://127.0.0.1:8050/game/feedback', FB_Q = 'lastfire2-feedback-queue';
function toggleTab() { if (panel === 'tab') { closeTab(); return; } if (panel) return; panel = 'tab'; for (const k in keys) keys[k] = false; mouse.fill(false); $('tabmenu').hidden = false; if (document.pointerLockElement) document.exitPointerLock(); $('fbNote').textContent = ''; setTimeout(() => $('fbText').focus(), 30); }
function lockMouse() { try { const r = renderer.domElement.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }   /* (a refused lock never throws: some browsers and frames say no) */
function closeTab() { stopMic(); $('tabmenu').hidden = true; panel = null; }   /* (the mouse stays yours until you click the game: his stuck-cursor report, 2026-10-19) */
$('tabBack').onclick = closeTab;
let rec = null, recOn = false;
function stopMic() { recOn = false; try { rec && rec.stop(); } catch (e) {} $('fbMic').firstChild.textContent = 'TALK'; }
$('fbMic').onclick = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) { $('fbMicNote').textContent = '(this browser has no speech-to-text: type it below)'; return; }
  if (recOn) return stopMic();
  rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'; const base = $('fbText').value ? $('fbText').value.trim() + ' ' : '';
  rec.onresult = e => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; $('fbText').value = base + t; };
  rec.onend = () => { if (recOn) { try { rec.start(); } catch (e) {} } };   // (keeps listening through pauses until you click again)
  rec.onerror = e => { if (e.error === 'not-allowed') { $('fbMicNote').textContent = '(the browser said no to the mic: allow it in the address bar, or type)'; stopMic(); } };
  recOn = true; rec.start(); $('fbMic').firstChild.textContent = 'LISTENING... (click to stop)';
};
function snapshot() { try { renderer.render(scene, camera); const c = document.createElement('canvas'), w = 640, src = renderer.domElement; c.width = w; c.height = Math.round(src.height / src.width * w); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.6); } catch (e) { return null; } }
async function postFeedback(item) { const r = await fetch(FB_URL, { method: 'POST', body: JSON.stringify(item) }); if (!r.ok) throw new Error(r.status); }
function queued() { try { return JSON.parse(localStorage.getItem(FB_Q) || '[]'); } catch (e) { return []; } }
async function flushQueue() { const q = queued(); if (!q.length) return; const left = []; for (const it of q) { try { await postFeedback(it); } catch (e) { left.push(it); } } try { localStorage.setItem(FB_Q, JSON.stringify(left)); } catch (e) {} if (left.length < q.length) say(`${q.length - left.length} saved note${q.length - left.length > 1 ? 's' : ''} reached Claude.`, 3); }
setInterval(flushQueue, 60000);
$('fbSend').onclick = async () => {
  const text = $('fbText').value.trim(); if (!text) { $('fbNote').textContent = 'Say or type something first.'; return; } stopMic();
  const item = { text, name: SET.name, version: 'next-' + BUILD, shot: snapshot(), ctx: { night: g ? g.night : 0, phase: g ? C.phase(g.clock) : '', fire: g ? g.fire.level : 0, x: me ? Math.round(me.x) : 0, z: me ? Math.round(me.z) : 0, hollow: g ? g.hollow.length : 0, players: g ? g.players.length : 0, fps: $('fps').textContent, host: isHost(), room: net ? net.code : '' } };
  $('fbText').value = ''; closeTab();
  try { await postFeedback(item); say('Sent to Claude. Keep playing.', 3); }
  catch (e) { const q = queued(); q.push({ ...item, shot: null }); try { localStorage.setItem(FB_Q, JSON.stringify(q.slice(-30))); } catch (er) {} say('Saved. It reaches Claude as soon as Vigil is running on your PC.', 4); }
};
// ---------------------------------------------------------------- updates: a pop-up when a newer version is out; yes puts you right back where you were
let updSeen = 0;
async function checkUpdate() { try { const v = await (await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' })).json(); if (v && v.v > BUILD && v.v !== updSeen) { updSeen = v.v; $('updNote').textContent = String(v.notes || ''); $('upd').hidden = false; } } catch (e) {} }
setInterval(checkUpdate, 60000); setTimeout(checkUpdate, 8000);
(async () => {   // (the menu says which version this is; an old copy from the browser's cache swaps itself for the new one)
  $('ver').innerHTML = `<b>VERSION ${BUILD}</b>`;
  try { const v = await (await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' })).json();
    if (v.v > BUILD && mode === 'menu' && sessionStorage.getItem('lastfire2-fresh') !== String(v.v)) { sessionStorage.setItem('lastfire2-fresh', String(v.v)); location.replace(location.pathname + '?v=' + v.v + location.hash); return; }
    if (v.v === BUILD) $('ver').innerHTML = `<b>VERSION ${BUILD}</b>: ${String(v.notes || '').replace(/[<>&]/g, '')}`; } catch (e) {}
})();
$('updNo').onclick = () => { $('upd').hidden = true; };
$('updYes').onclick = () => {
  try { saveNow(); sessionStorage.setItem('lastfire2-resume', JSON.stringify({ world: worldId, host: !!(net && net.host), code: net ? net.code : '', join: !!(net && !net.host), name: SET.name, at: Date.now() })); } catch (e) {}
  if (net && net.host) net.send({ t: 'bye', why: 'update' });
  setTimeout(() => location.reload(), 150);
};
function resume() {   // (after an update: straight back in, same world, same room, no menu)
  let r = null; try { r = JSON.parse(sessionStorage.getItem('lastfire2-resume') || 'null'); sessionStorage.removeItem('lastfire2-resume'); } catch (e) {}
  if (!r || Date.now() - r.at > 120000) return false; $('name').value = r.name || ''; myName(); sound.wake();
  if (r.join && r.code) { net = new Net(onNet, t => { $('menuNote').textContent = t; }); const tryJoin = (n) => { net.joinGame(r.code); setTimeout(() => { if (!g && n > 0) { net = new Net(onNet, t => { $('menuNote').textContent = t; }); tryJoin(n - 1); } }, 4000); }; tryJoin(8); $('menuNote').textContent = 'Updated. Rejoining your friend...'; return true; }
  if (r.host && r.code) { net = new Net(onNet, t => { if (/taken/.test(t)) setTimeout(() => net.hostGame(r.code), 3000); else say(t, 5); }); net.hostGame(r.code); }
  startWorld(r.world || null); setTimeout(() => say(`Updated to version ${BUILD}.`, 3), 1500); return true;
}
// ---------------------------------------------------------------- together: the host runs the rules and sends the world; friends send where they are
const inbox = [], fin = v => typeof v === 'number' && Number.isFinite(v), KIND_I = Object.keys(C.KINDS);
function bucket(o, key, perSec, cap, cost = 1) { const now = performance.now() / 1000; o[key] = Math.min(cap, (o[key] ?? cap) + (now - (o[key + 'T'] || now)) * perSec); o[key + 'T'] = now; if (o[key] < cost) return false; o[key] -= cost; return true; }
function onNet(m, from) {
  if (net.host) {
    const p = g && g.players.find(q => q.id === from + 1);
    if (m.t === 'joined') { const q = C.addPlayer(g, from + 1, 'Friend'); q.gun = 'pistol'; net.sendTo(from, { t: 'hello', you: from + 1, seed: g.seed, nodes: g.nodes.map(n => [n.id, n.kind, n.x, n.z, n.hp]), fire: [g.fire.level, g.fire.light, g.fire.fuel], clock: g.clock, night: g.night }); say(`A friend joined: ${g.players.length} of ${MAX_PLAYERS} here.`, 4); return; }
    if (m.t === 'left') { g.players = g.players.filter(q => q.id !== from + 1); g.embers = g.embers.filter(e => e.of !== from + 1); say('A friend left.', 4); return; }
    if (!p) return;
    if (m.t === 'in') {   // (a friend's own move: checked against how fast a person can go; the host keeps their health, light and Ember)
      if (![m.x, m.y, m.z, m.yaw, m.pi].every(fin)) return; const dt = Math.max(0.02, (performance.now() - (p.inT || 0)) / 1000); p.inT = performance.now();
      if (g.ship && g.ship.pilot === p.id) { const S = g.ship; if (Array.isArray(m.sh) && m.sh.length === 9 && m.sh.every(fin) && Math.hypot(m.sh[0] - S.x, m.sh[2] - S.z) <= C.SHIP.top * dt * 1.5 + 4) { const [x, y, z, yaw, roll, pitch, vx, vz, vy] = m.sh; Object.assign(S, { x, y, z, yaw, roll, pitch, vx, vz, vy }); C.shipBounds(S); } p.x = S.x; p.z = S.z; p.y = S.y; p.yaw = m.yaw; p.pitch = Math.max(-1.6, Math.min(1.6, m.pi)); return; }   /* (the pilot flies their own copy; the host only accepts moves the ship could really make) */
      if (C.seatOf(g, p.id) >= 0) { p.drive = fin(m.th) && fin(m.st) ? { th: Math.max(-1, Math.min(1, m.th)), st: Math.max(-1, Math.min(1, m.st)) } : null; p.yaw = m.yaw; p.pitch = Math.max(-1.6, Math.min(1.6, m.pi)); return; }   /* (riding: the truck moves them; only their keys count) */
      if (!p.ember && Math.hypot(m.x - p.x, m.z - p.z) < Math.max(1.5, 11 * dt)) { p.x = m.x; p.z = m.z; p.y = m.y; } else if (!p.ember) p.tp = (p.tp || 0) + 1;   /* (too far, too fast: snap them back to the last good spot, so a lag spike can never strand anyone) */ p.yaw = m.yaw; p.pitch = Math.max(-1.6, Math.min(1.6, m.pi)); p.gun = GUNS[m.g] ? m.g : 'pistol'; p.torch = m.tl === 1; const nm = String(m.n || '').replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) || 'Friend'; if (p.name !== nm) { p.name = nm; if (!p.kept && g.keep[nm] > 0) { p.carried += g.keep[nm]; p.kept = true; } } return;
    }
    if (m.t === 'shot') {   // (the host traces it in its own world with the gun's own damage, no faster than the gun fires)
      const G = GUNS[m.g]; if (!G || p.ember || !Array.isArray(m.o) || !Array.isArray(m.d) || ![...m.o, ...m.d].every(fin) || Math.hypot(m.o[0] - p.x, m.o[2] - p.z) > 3 || !bucket(p, 'shots', G.rpm / 60 + 1, 4)) return;
      const dirs = (Array.isArray(m.ds) ? m.ds : [m.d]).slice(0, G.pellets || 1).filter(d => Array.isArray(d) && d.length === 3 && d.every(fin));
      dirs.forEach((d, n) => { const L = Math.hypot(d[0], d[1], d[2]); if (L < 0.5) return; if (n === 0) C.fired(g, p, m.o[0], m.o[2], d[0] / L, d[2] / L, m.g); const rc = G.charge ? Math.max(0, Math.min(1, fin(m.c) ? m.c : 0)) : 1, hs = G.charge && rc >= 0.75 ? C.hitAll(g, m.o[0], m.o[1], m.o[2], d[0] / L, d[1] / L, d[2] / L, 120) : [C.hitRay(g, m.o[0], m.o[1], m.o[2], d[0] / L, d[1] / L, d[2] / L, 80)].filter(Boolean);   /* (a friend's rail: the same charge rule, its number clamped) */
        for (const h of hs) { const r = C.damage(g, h.k, h.part, G.dmg * (0.5 + 0.5 * rc) * (h.mult > 1 ? G.head : 1), G.ap, p.id); net.sendTo(from, { t: 'hit', r: { kill: !!r.kill, shell: !!r.shell, broke: !!r.broke, head: h.mult > 1 } }); } }); return;
    }
    if (m.t === 'lines') { if (!bucket(p, 'lines', 0.2, 2)) return; (g.voice = g.voice || {})[p.name] = cleanLines(m.l); return; }
    if (m.t === 'build') { if (!bucket(p, 'builds', 1, 3)) return; if (m.k === 'slam') C.slam(g, p, p.x, p.z); else if (m.k === 'grow') C.grow(g, p); else if (m.k === 'ship') C.useShip(g, p); else if (m.k === 'drop') C.drop(g, p, C.SITES[m.s] ? m.s : 'city'); else if (m.k === 'rise') C.rise(g, p); else if (m.k === 'fit') C.fit(g, p); else if (m.k === 'car') C.useCar(g, p); else if (m.k === 'strip') C.strip(g, p); else if (m.k === 'seat') C.nextSeat(g, p); else if (m.k === 'flare' && fin(m.x) && fin(m.z)) C.throwFlare(g, p, m.x, m.z); else build(p, m.k, m.x, m.z); return; }
    if (m.t === 'bang') { if (!GUNS[m.g] || ![m.x, m.y, m.z].every(fin) || Math.hypot(m.x - p.x, m.z - p.z) > 4 || !bucket(p, 'bangs', 14, 20)) return; m.p = p.id; heardShot(m); net.relay(m, from); return; }
    return;
  }
  // a friend's side: only the host's word counts
  if (from !== 0) { if (m.t === 'bang' && GUNS[m.g] && [m.x, m.y, m.z].every(fin)) heardShot(m); return; }
  if (m.t === 'hello') { if (!fin(m.seed)) return; net.me = m.you; document.body.classList.add('friend'); SET.lastJoin = net.code; save(); begin(m.seed, m.you).then(() => {}); for (const n of m.nodes || []) if (Array.isArray(n) && C.NODE[n[1]]) g.nodes.push({ id: n[0], kind: n[1], x: n[2], z: n[3], hp: n[4], lit: false }); C.linkNetwork(g); if (Array.isArray(m.fire)) [g.fire.level, g.fire.light, g.fire.fuel] = m.fire; g.clock = m.clock; g.night = m.night; return; }
  if (!g) return;
  if (m.t === 's') applyState(m);
  if (m.t === 'ev' && Array.isArray(m.e)) for (const e of m.e.slice(0, 20)) if (Array.isArray(e)) inbox.push(e);
  if (m.t === 'hit' && m.r) showHit(m.r, !!m.r.head);
  if (m.t === 'bang' && GUNS[m.g] && [m.x, m.y, m.z].every(fin)) heardShot(m);
  if (m.t === 'bye' && m.why === 'update') { try { sessionStorage.setItem('lastfire2-resume', JSON.stringify({ join: true, code: net.code, name: SET.name, at: Date.now() })); } catch (e) {} say('The host is updating. You will be right back.', 4); setTimeout(() => location.reload(), 1200); return; }
  if (m.t === 'bye') say({ full: `That room is full (${MAX_PLAYERS} players).`, locked: 'The host locked that room.', kicked: 'The host removed you.' }[m.why] || 'The host closed the game.', 8);
  if (m.t === 'left' && from === 0) say('The host left: the world went with them.', 8);
}
function heardShot(m) { const o = new THREE.Vector3(m.x, m.y, m.z); sound.shot(m.g, o); if (crew && fin(m.p) && (!me || m.p !== me.id)) crew.shot(m.p); if (Array.isArray(m.e) && m.e.length === 3 && m.e.every(fin)) { const e = new THREE.Vector3(...m.e); fx.tracer(o, e); fx.spark(e); } }
let sendT = 0, stateT = 0, sentMarks = -1;
function sync(dt) {
  if (!net || !net.live) return; sendT += dt; stateT += dt;
  if (!net.host && sendT >= 1 / 15) { sendT = 0; net.send({ t: 'in', x: +me.x.toFixed(2), y: +me.y.toFixed(2), z: +me.z.toFixed(2), yaw: +me.yaw.toFixed(3), pi: +me.pitch.toFixed(2), g: gunKey, tl: me.torch ? 1 : 0, n: SET.name, ...(me.drive ? { th: me.drive.th, st: me.drive.st } : {}), ...(ship && ship.on ? { sh: ship.sent() } : {}) }); }
  if (net.host) me.gun = gunKey;
  if (net.host && stateT >= 1 / 12) { stateT = 0; net.send({ t: 's', c: +g.clock.toFixed(5), n: g.night,
    f: [g.fire.level, Math.floor(g.fire.light), Math.round(g.fire.fuel)],
    p: g.players.map(p => [p.id, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(2), +(p.pitch || 0).toFixed(2), Math.round(p.hp), Math.floor(p.carried), p.ember ? 1 : 0, p.gun || 'pistol', p.tp || 0, p.name]),
    h: g.hollow.flatMap(k => [k.id, KIND_I.indexOf(k.kind) + 16 * (k.rt > 0 ? k.r || 0 : 0), +k.x.toFixed(2), +k.y.toFixed(2), +k.z.toFixed(2), +k.yaw.toFixed(2)]),
    m: g.motes.slice(0, 300).flatMap(q => [+q.x.toFixed(1), +q.z.toFixed(1)]),
    nd: g.nodes.map(n => [n.id, n.kind, +n.x.toFixed(2), +n.z.toFixed(2), Math.round(n.hp), n.lit ? 1 : 0, n.who || '', n.n || 0, n.honor || '']),
    em: g.embers.map(e => [e.id, e.of, +e.x.toFixed(1), +e.z.toFixed(1), e.held || 0]), e: g.earth ? +g.earth.t.toFixed(1) : -1, pt: g.parts.map(q => [q.id, q.kind, +q.x.toFixed(1), +q.z.toFixed(1)]), st: g.stash, tr: g.truck, pk: g.players.map(p => [p.id, p.pack || []]), ec: g.econ ? { day: g.econ.day, pool: Math.round(g.econ.pool), people: g.econ.people } : 0, wr: g.earth && g.earth.wrecks ? g.earth.wrecks.map(w => [w.id, +w.x.toFixed(1), +w.z.toFixed(1), +(w.ry || 0).toFixed(2), w.left]) : 0, ln: g.learned || {}, fl: (g.flares || []).map(f => [+f.x.toFixed(2), +f.z.toFixed(2), +f.t.toFixed(1), f.earth ? 1 : 0]), th: g.theories || null, du: g.dues || {}, cl: [g.lost || [], g.out ? g.out.who : ''], fw: g.gapNext !== undefined ? [+g.gapNext.toFixed(3), +(g.gapAt - g.t).toFixed(2)] : 0, sh: g.ship ? [g.ship.x, g.ship.y, g.ship.z, g.ship.yaw, g.ship.roll, g.ship.pitch, g.ship.vx, g.ship.vz, g.ship.vy].map(v => +v.toFixed(3)).concat(g.ship.pilot || 0) : 0, car: g.car ? [+g.car.x.toFixed(2), +g.car.z.toFixed(2), +g.car.yaw.toFixed(3), +g.car.v.toFixed(2), g.car.seats, g.car.store] : 0, ...(g.marks.length !== sentMarks ? { mk: g.marks.slice(-MARKS).map(m => [m.k === 'fall' ? 1 : 0, m.x, m.z, m.who || '', m.n || 0]) } : {}) }); sentMarks = g.marks.length; }
}
function applyState(m) {   // (a friend's copy of the world, from the host; their own position stays their own unless the host moved them)
  if (fin(m.c)) g.clock = m.c; if (Number.isInteger(m.n)) g.night = m.n; if (Array.isArray(m.f) && m.f.every(fin)) [g.fire.level, g.fire.light, g.fire.fuel] = m.f;
  if (Array.isArray(m.p)) { const ps = []; for (const a of m.p.slice(0, MAX_PLAYERS)) { if (!Array.isArray(a) || !a.slice(0, 9).every(fin)) continue; const [id, x, y, z, yaw, pitch, hp, carried, ember, gun, tp, name] = a;
      let q = g.players.find(o => o.id === id) || { id, isPlayer: true }; if (id === myId) { q = me; if ((q.tp || 0) !== tp) { q.x = x; q.y = y; q.z = z; q.tp = tp; } } else Object.assign(q, { tx: x, ty: y, tz: z, yaw, pitch, gun: GUNS[gun] ? gun : 'pistol', name: String(name || 'Friend').replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) });
      if (q.x === undefined) { q.x = x; q.y = y; q.z = z; } q.hp = hp; q.carried = carried; q.ember = !!ember; ps.push(q); } g.players = ps; }
  if (Array.isArray(m.h) && m.h.length <= C.MAX_HOLLOW * 6) { const old = new Map(g.hollow.map(k => [k.id, k])), hs = []; for (let i = 0; i + 5 < m.h.length; i += 6) { const [id, kr, x, y, z, yaw] = m.h.slice(i, i + 6), ki = kr % 16; if (![id, kr, x, y, z, yaw].every(fin) || !KIND_I[ki]) continue; const k = old.get(id) || { id, kind: KIND_I[ki], x, y, z, yaw, sh: 0, sb: 0 }; Object.assign(k, { r: kr >> 4, rt: kr >> 4 ? 1 : 0, tx: x, ty: y, tz: z, tyaw: yaw }); hs.push(k); } g.hollow = hs; }
  if (Array.isArray(m.m)) { g.motes = []; for (let i = 0; i + 1 < m.m.length && i < 600; i += 2) if (fin(m.m[i]) && fin(m.m[i + 1])) g.motes.push({ x: m.m[i], z: m.m[i + 1] }); }
  if (Array.isArray(m.nd)) g.nodes = m.nd.filter(a => Array.isArray(a) && C.NODE[a[1]]).slice(0, 400).map(a => ({ id: a[0], kind: a[1], x: a[2], z: a[3], hp: a[4], lit: !!a[5], who: typeof a[6] === 'string' ? a[6].replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) : '', n: a[7] | 0, ...(typeof a[8] === 'string' && a[8] ? { honor: a[8].replace(/[^A-Za-z0-9 _,-]/g, '').slice(0, 24) } : {}) }));
  if (Array.isArray(m.mk)) g.marks = m.mk.filter(a => Array.isArray(a) && [a[0], a[1], a[2]].every(fin)).slice(-MARKS).map(a => ({ k: a[0] ? 'fall' : 'wreck', x: a[1], z: a[2], who: typeof a[3] === 'string' ? a[3].replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) : '', n: a[4] | 0 }));
  if (m.ec && typeof m.ec === 'object' && m.ec.people && typeof m.ec.people === 'object') { const c = C.campOf(g); c.day = m.ec.day | 0; c.pool = fin(m.ec.pool) ? m.ec.pool : 0; for (const [n, v] of Object.entries(m.ec.people).slice(0, 32)) if (v && fin(v.paid) && fin(v.owed)) c.people[n] = { ...C.person(g, n), paid: v.paid, owed: v.owed }; }
  if (fin(m.e)) g.earth = m.e >= 0 ? { ...(g.earth || {}), t: m.e } : null;
  if (g.earth && Array.isArray(m.wr)) g.earth.wrecks = m.wr.filter(a => Array.isArray(a) && a.every(fin)).slice(0, 6).map(a => ({ id: a[0], x: a[1], z: a[2], ry: a[3], left: a[4] }));
  if (m.ln && typeof m.ln === 'object') { g.learned = {}; for (const k of C.PART_ORDER) if (m.ln[k]) g.learned[k] = 1; }
  if (Array.isArray(m.fl)) g.flares = m.fl.filter(a => Array.isArray(a) && a.every(fin)).slice(0, 12).map(a => ({ x: a[0], z: a[1], t: a[2], earth: !!a[3] }));
  if (m.th && typeof m.th === 'object' && Object.keys(C.THEORIES).every(k => fin(m.th[k]))) { g.theories = {}; for (const k of Object.keys(C.THEORIES)) g.theories[k] = Math.max(0, Math.min(0.85, m.th[k])); }
  if (m.du && typeof m.du === 'object') { const d = {}; for (const [k, v] of Object.entries(m.du).slice(0, 32)) if (k.length <= 24 && fin(v)) d[k] = v; g.dues = d; }
  if (Array.isArray(m.cl) && Array.isArray(m.cl[0])) { g.lost = m.cl[0].filter(w => C.CAMP_OUT.includes(w)); g.out = C.CAMP_OUT.includes(m.cl[1]) ? { who: m.cl[1] } : null; }
  if (Array.isArray(m.sh) && m.sh.length === 10 && m.sh.every(fin)) { const [x, y, z, yaw, roll, pitch, vx, vz, vy, pilot] = m.sh; g.ship = Object.assign(g.ship || {}, { x, y, z, yaw, roll, pitch, vx, vz, vy, pilot: pilot || null }); }
  if (Array.isArray(m.fw) && m.fw.every(fin)) { g.gapNext = m.fw[0]; g.gapAt = g.t + m.fw[1]; } else if (m.fw === 0) g.gapNext = undefined;   /* (the breach warning reaches friends too) */
  if (m.car === 0) g.car = null; else if (Array.isArray(m.car) && m.car.slice(0, 4).every(fin) && Array.isArray(m.car[4]) && Array.isArray(m.car[5])) { const [x, z, yaw, v, seats, store] = m.car; g.car = { x, z, yaw, v, seats: [0, 1, 2, 3].map(i => fin(seats[i]) ? seats[i] : null), store: store.filter(k => C.PARTS[k]).slice(0, 40) }; }
  if (Array.isArray(m.pt)) g.parts = m.pt.filter(a => Array.isArray(a) && C.PARTS[a[1]] && fin(a[0]) && fin(a[2]) && fin(a[3])).slice(0, 60).map(a => ({ id: a[0], kind: a[1], x: a[2], z: a[3] }));
  const cnt = o => { const r = {}; if (o && typeof o === 'object') for (const k of C.PART_ORDER) if (Number.isInteger(o[k]) && o[k] >= 0 && o[k] <= 99) r[k] = o[k]; return r; }; if (m.st) g.stash = cnt(m.st); if (m.tr) g.truck = cnt(m.tr);
  if (Array.isArray(m.pk)) for (const a of m.pk) if (Array.isArray(a) && a[0] === myId && Array.isArray(a[1])) me.pack = a[1].filter(k => C.PARTS[k]).slice(0, 12);
  if (Array.isArray(m.em)) g.embers = m.em.filter(a => Array.isArray(a) && a.every(fin)).map(a => ({ id: a[0], of: a[1], x: a[2], z: a[3], held: a[4] || null }));
}
// friends as you see them: the CC0 soldier, running or standing, their gun in hand, their name over them; an Ember is a small light on the ground
const friendViews = new Map(), _v = new THREE.Vector3();
// fall traces: the last ten seconds before a fall, in red on the ground, and a line from where it came (one draw call)
const traceGeo = new THREE.BufferGeometry(), traceLines = new THREE.LineSegments(traceGeo, new THREE.LineBasicMaterial({ color: 0xff3b5c, transparent: true, opacity: 0.8, depthWrite: false })); traceLines.frustumCulled = false; scene.add(traceLines); let traceKey = '';
// a flare is a real road flare (his eyes, 2026-10-19: "a floating, glowing moat"): a red paper stick lying on the ground, a crimson flame
// spitting from its tip, sparks that arc and fall, a thread of smoke. Its light on the ground comes from the light network's slots, so no new lamps
const FL = { stick: new THREE.CylinderGeometry(0.022, 0.022, 0.3, 10), cap: new THREE.CylinderGeometry(0.024, 0.024, 0.04, 10), red: new THREE.MeshStandardMaterial({ color: 0x7a0f1c, roughness: 0.7 }), ash: new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 1 }),
  flame: new THREE.MeshBasicMaterial({ color: 0xff2a4a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), core: new THREE.MeshBasicMaterial({ color: 0xffd0dc, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
  cone: new THREE.ConeGeometry(0.05, 0.22, 10, 1, true), N: 28 };
FL.spark = new THREE.PointsMaterial({ color: 0xff5a78, size: 0.035, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
FL.smoke = new THREE.PointsMaterial({ map: softDot, color: 0x4a3a48, size: 0.9, transparent: true, opacity: 0.35, depthWrite: false });
const flareViews = new Map();
function makeFlare(f) { const o = new THREE.Group(), y = g.land(f.x, f.z), r = (f.x * 7.13 + f.z * 3.7) % 6.28;
  const body = new THREE.Group(); body.add(new THREE.Mesh(FL.stick, FL.red)); const cap = new THREE.Mesh(FL.cap, FL.ash); cap.position.y = 0.16; body.add(cap); body.rotation.z = Math.PI / 2 - 0.18; body.position.y = 0.03;   /* (lying on the ground, the burning end tipped up a little) */
  const tip = new THREE.Group(); tip.position.set(-0.15, 0.07, 0); const fl = new THREE.Mesh(FL.cone, FL.flame), co = new THREE.Mesh(FL.cone, FL.core); fl.position.y = 0.1; co.scale.setScalar(0.5); co.position.y = 0.06; tip.add(fl, co);
  const sp = new THREE.BufferGeometry(); sp.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FL.N * 3), 3)); const sparks = new THREE.Points(sp, FL.spark); sparks.frustumCulled = false;
  const sm = new THREE.BufferGeometry(); sm.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3)); const smoke = new THREE.Points(sm, FL.smoke); smoke.frustumCulled = false;
  o.add(body, tip); o.scale.setScalar(1.5); o.position.set(f.x, y, f.z); o.rotation.y = r; scene.add(o, sparks, smoke);
  const seeds = Array.from({ length: FL.N }, (_, i) => [((i * 0.618) % 1), 0.6 + ((i * 0.37) % 1) * 0.9, (i * 2.399) % 6.28]);
  const tw = new THREE.Vector3(); tip.updateWorldMatrix(true, false); tip.getWorldPosition(tw);
  return { o, tip, fl, co, sparks, smoke, seeds, tw }; }
function drawFlares() { const live = new Set(), now = performance.now() / 1000; (g.flares || []).forEach(f => { const key = f.x.toFixed(1) + ',' + f.z.toFixed(1); live.add(key); let v = flareViews.get(key); if (!v) { v = makeFlare(f); flareViews.set(key, v); }
    const k = Math.min(1, f.t / 2), fk = k * (0.85 + 0.3 * Math.sin(now * 37 + v.seeds[0][2]) * Math.sin(now * 23));   /* (it sputters, then dies down over its last two seconds) */
    v.fl.scale.set(fk, fk * (1 + 0.25 * Math.sin(now * 51)), fk); v.co.scale.setScalar(0.5 * fk); v.tip.visible = k > 0.02;
    const sp = v.sparks.geometry.attributes.position, a = sp.array, T = v.tw;
    for (let i = 0; i < FL.N; i++) { const [ph, sp0, ang] = v.seeds[i], t = (now * sp0 + ph) % 1, life = t * 0.7, h = Math.cos(ang) * 0.6, w = Math.sin(ang) * 0.6;   /* (each spark leaves the tip, arcs and falls under gravity) */
      a[i * 3] = T.x + h * life * k; a[i * 3 + 1] = T.y + (1.6 * life - 4.9 * life * life) * k + 0.05; a[i * 3 + 2] = T.z + w * life * k; if (a[i * 3 + 1] < g.land(f.x, f.z)) a[i * 3 + 1] = -999; }
    sp.needsUpdate = true; const sm = v.smoke.geometry.attributes.position.array;
    for (let i = 0; i < 8; i++) { const t = (now * 0.35 + i / 8) % 1; sm[i * 3] = T.x + Math.sin(now * 0.7 + i) * 0.15 * t; sm[i * 3 + 1] = T.y + 0.2 + t * 2.2; sm[i * 3 + 2] = T.z + Math.cos(now * 0.5 + i) * 0.15 * t; } v.smoke.geometry.attributes.position.needsUpdate = true; v.smoke.material.opacity = 0.35 * k; });
  for (const [key, v] of flareViews) if (!live.has(key)) { scene.remove(v.o, v.sparks, v.smoke); v.sparks.geometry.dispose(); v.smoke.geometry.dispose(); flareViews.delete(key); } }
// the fire grows: a ring of light rolls out from the core across the yard to the new edge of its circle (one mesh, reused)
const growRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); growRing.visible = false; scene.add(growRing); let growT = -1;
// the breach shows before it pours (queue 68, sim/breach.mjs): violet smoke bulges up at the gap the dark has picked, until it comes through
let breachT = 0;
function drawBreach(dt) { if (g.gapNext === undefined || g.t >= g.gapAt || (breachT -= dt) > 0) return; breachT = 0.18; const R = C.tideRadius(g) + 2, a = g.gapNext + (Math.random() - 0.5) * 0.35, x = g.fire.x + Math.cos(a) * R, z = g.fire.z + Math.sin(a) * R; fx.burst(new THREE.Vector3(x, g.land(x, z) + 0.6, z), 10, [0.42, 0.1, 0.62], 2.2, 0.9); }
function growFire() { growT = 0; growRing.visible = true; if (fireObj) fireObj.flare(1.5); }
function drawGrowRing(dt) { if (growT < 0) return; growT += dt; const k = Math.min(1, growT / 1.8), r = 1 + (C.fireRadius(g.fire) - 1) * (1 - Math.pow(1 - k, 3)); growRing.scale.set(r, 1, r); growRing.position.set(g.fire.x, g.land(g.fire.x, g.fire.z) + 0.12, g.fire.z); growRing.material.opacity = 0.85 * (1 - k); if (k >= 1) { growT = -1; growRing.visible = false; } }
function drawTraces() { const ts = g.traces || [], key = ts.map(t => t.of + ':' + t.x + ':' + Math.ceil(t.t / 10)).join('|'); if (key === traceKey) return; traceKey = key; const v = [];
  for (const t of ts) { const y = (x, z) => g.land(x, z) + 0.08; for (let i = 1; i < t.pts.length; i++) v.push(t.pts[i - 1][0], y(t.pts[i - 1][0], t.pts[i - 1][1]), t.pts[i - 1][1], t.pts[i][0], y(t.pts[i][0], t.pts[i][1]), t.pts[i][1]); v.push(t.fx, y(t.fx, t.fz) + 1.2, t.fz, t.x, y(t.x, t.z) + 0.3, t.z); }
  traceGeo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); }
const dirName = (dx, dz) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round((((Math.atan2(-dx, -dz) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * 8) % 8];
const emberMat = new THREE.MeshBasicMaterial({ color: 0xbfe0ff }), emberGeo = new THREE.OctahedronGeometry(0.25), emberViews = new Map();
let crew = null; const crewList = [];   // (friends drawn as the crew suit: crew.js, the free soldier made into his black nanite suit, 2026-10-19)
function drawFriends(dt) {
  const live = new Set(), f = Math.min(1, dt * 12); crewList.length = 0; if (!crew && models.soldier) crew = new Crew(scene, models.soldier, { gun: models.ar });
  if (!isHost()) for (const k of g.hollow) if (k.tx !== undefined) { k.x += (k.tx - k.x) * f; k.y += (k.ty - k.y) * f; k.z += (k.tz - k.z) * f; let d = k.tyaw - k.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); k.yaw += d * f; }
  for (const p of g.players) {
    if (p === me) continue; live.add(p.id); let v = friendViews.get(p.id);
    if (!v && crew) { v = { mark: Object.assign(document.createElement('div'), { className: 'mark' }) }; $('hud').append(v.mark); friendViews.set(p.id, v); }
    if (!v) continue;
    if (p.tx !== undefined) { p.x += (p.tx - p.x) * f; p.y += (p.ty - p.y) * f; p.z += (p.tz - p.z) * f; }
    crewList.push({ id: p.id, x: p.x, y: p.y, z: p.z, yaw: p.yaw || 0, pitch: p.pitch || 0, hp: p.hp, fallen: !!p.ember, seat: g.ship && g.ship.pilot === p.id ? 'fly' : C.seatOf(g, p.id) >= 0 ? 'drive' : undefined });
    _v.set(p.x, p.y + 2.2, p.z).project(camera); const vis = _v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1;
    v.mark.hidden = !vis; if (vis) { v.mark.style.transform = `translate(${(_v.x * 0.5 + 0.5) * innerWidth}px, ${(-_v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`; const t = `${p.name || 'Friend'}  ${Math.round(Math.hypot(p.x - me.x, p.z - me.z))} m${p.ember ? '  EMBER: carry it to the fire' : ''}`; if (v.mark.textContent !== t) v.mark.textContent = t; v.mark.classList.toggle('down', !!p.ember); }
  }
  if (crew) crew.update(dt, crewList);
  for (const [id, v] of friendViews) if (!live.has(id)) { v.mark.remove(); friendViews.delete(id); }
  const el = new Set(); for (const e of g.embers) { el.add(e.id); let o = emberViews.get(e.id); if (!o) { o = new THREE.Mesh(emberGeo, emberMat); scene.add(o); emberViews.set(e.id, o); } o.position.set(e.x, g.land(e.x, e.z) + (e.held ? 1.3 : 0.4), e.z); o.rotation.y = performance.now() / 500; }
  for (const [id, o] of emberViews) if (!el.has(id)) { scene.remove(o); emberViews.delete(id); }
}
// ---------------------------------------------------------------- start
$('name').value = SET.name || '';
function myName() { SET.name = ($('name').value || 'Player').replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) || 'Player'; save(); return SET.name; }
async function begin(seed, id, saved = null) {
  g = saved || C.newGame(seed); if (!saved) g.clock = 0.3; me = C.addPlayer(g, id, SET.name); if (saved && g.startAt) { me.x = g.startAt[0]; me.z = g.startAt[1]; } me.y = g.land(me.x, me.z); myId = id;
  if (!saved && id === 1) { Camp.startAt(me, g.land); setTimeout(() => say('Your old desk. The form you signed, and the number you cannot unsee.', 7), 2500); }   // (a new world opens at your desk: LORE.md, the first minute)
  if (!camp) camp = new Camp(scene, { econ: () => SET.name && g.econ ? (e => ({ ...e, key: e.standing + ':' + e.morale + ':' + e.pool }))({ burn: C.econ.burn, standing: Math.round(C.econ.standing(g, SET.name)), morale: Math.round(C.econ.morale(g) * 100), pool: Math.round(g.econ.pool || 0) }) : null, theories: C.THEORIES, stakes: () => stakeScore(), g: () => g, me: () => me, land: (x, z) => g.land(x, z), say, hear: (who, line) => wrist.say(line, Math.min(9, 3 + line.length / 18), 'heard  ·  ' + who), name: () => SET.name, camera: () => camera });
  if (!sitesBuilt) { sitesBuilt = true; buildSites(scene, (x, z) => g.land(x, z)); truck = new Truck(scene, (x, z) => g.land(x, z)); ship = new ShipView(scene, (x, z) => g.land(x, z)); }
  if (!guide) guide = new Guide(scene, { g: () => g, me: () => me, land: (x, z) => g.land(x, z), board: () => BOARD, pad: () => C.PAD, checked: () => camp.checkedNight === g.night, phase: () => C.phase(g.clock), fireRadius: () => C.fireRadius(g.fire), isHost,
    speak: (r, l, s) => camp.speak(r, l, s), bringDusk: () => { if (isHost() && C.phase(g.clock) === 'day') g.clock = C.DUSK_AT - 0.002; }, nearDusk: () => { if (isHost() && g.clock < C.DUSK_AT - 20 / C.DAY) g.clock = C.DUSK_AT - 20 / C.DAY; }, done: () => !!SET.guided, setDone: () => { SET.guided = 1; save(); },
    stage: () => { if (!isHost()) return; const f = g.fire, a = Math.atan2(me.z - f.z, me.x - f.x) + 0.35, r = C.fireRadius(f) + 7, x = f.x + Math.cos(a) * r, z = f.z + Math.sin(a) * r, K = C.KINDS.walker;
      g.hollow.push({ id: g.nextId++, kind: 'walker', x, z, y: g.land(x, z), yaw: 0, hp: K.hp, max: K.hp, sh: 0, sb: 0, cd: 0, dead: false, speed: 1.1, staged: true }); } });
  setTimeout(() => guide.start(), 1200); setTimeout(shareLines, 1500);   // (your own words go to whoever hosts, for your learned copy)
  mode = 'play'; $('menu').hidden = true; $('bootLog').hidden = true; $('hud').hidden = false; drawBuild();
  await ready; prepGun('pistol'); prepGun('ar'); prepGun('shotgun'); prepGun('lmg'); { const r = new THREE.Group(); r.userData = { len: 1, top: 0, muzzle: new THREE.Vector3(0.03, -0.04, -0.9) }; r.visible = false; view.add(r); held.rail = r; }   /* (the rail's slot: its look is the Blender rig, drawn by railRig) */ hands.attach(held[gunKey], gunKey);
}
// ---------------------------------------------------------------- your worlds: saved in this browser, every 20 seconds and when you leave
const WKEY = 'lastfire2-worlds'; let worldId = null;
const worlds = () => { try { return JSON.parse(localStorage.getItem(WKEY) || '[]'); } catch (e) { return []; } };
function saveNow() {
  if (!g || !isHost() || !g.ready) return; try {
    const d = C.saveWorld(g), list = worlds().filter(w => w.id !== worldId); localStorage.setItem('lastfire2-w-' + worldId, JSON.stringify(d));
    list.unshift({ id: worldId, name: SET.name + "'s world", night: g.night, level: g.fire.level, nodes: g.nodes.length, at: Date.now() }); localStorage.setItem(WKEY, JSON.stringify(list.slice(0, 6)));
    for (const w of worlds().slice(6)) localStorage.removeItem('lastfire2-w-' + w.id);
  } catch (e) { say('This browser would not save the world (storage full or blocked).', 5); } }
setInterval(saveNow, 20000); addEventListener('pagehide', saveNow); document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
function loadSaved(id) { try { return C.loadWorld(JSON.parse(localStorage.getItem('lastfire2-w-' + id) || 'null')); } catch (e) { return null; } }
function startWorld(id) { worldId = id || ('w' + Date.now().toString(36)); const saved = id ? loadSaved(id) : null; begin(saved ? saved.seed : Math.floor(Math.random() * 1e9), 1, saved); if (saved) say(`Back in your world: night ${saved.night}, fire ${saved.fire.level}. The light you left is where you left it.`, 6); }
function drawWorlds() {
  const list = worlds(); if (!list.length) { $('worlds').innerHTML = ''; return; }
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
  const key = w => `<button class="key" data-w="${w.id}">CONTINUE<small>(night ${w.night}, fire ${w.level}, ${w.nodes} lights built, saved ${ago(w.at)}: ${net === null ? 'alone, or HOST it below' : ''})</small></button>`;
  $('worlds').innerHTML = key(list[0]) + (list.length > 1 ? `<button class="key" id="older">OLDER WORLDS (${list.length - 1})<small>(show the rest)</small></button><div id="olderList" hidden>${list.slice(1).map(key).join('')}</div>` : '');   // (the newest first; the rest one click away)
}
$('worlds').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'older') { $('olderList').hidden = !$('olderList').hidden; return; } myName(); sound.wake(); pendingWorld = b.dataset.w; if ($('asHost').checked) { openRoom(); startWorld(pendingWorld); say(`Your crew's room ${crewCode()} is open.`, 6); } else startWorld(pendingWorld); });
const hudLook = new HudLook(() => 'visor', () => {});   // (he kept VISOR, 2026-10-19; QUIET and GLASS stay in hudlook.js as variants, not on screen)

document.body.classList.add('menu-A'); bootLog();   // (BOOT: his pick of three home screens, 2026-10-19; THE SUIT menu (v120) was taken back at his word: it copied the Reactor's layout)
if (new URLSearchParams(location.search).has('sky')) { document.body.classList.add('sky-only'); document.head.append(Object.assign(document.createElement('style'), { textContent: 'body.sky-only #menu, body.sky-only #bootLog, body.sky-only #ver { display: none !important; }' })); }   /* (?sky: just the live sky and Earth, for UI mockups to sit on) */
function bootLog() {   // (A: the visor's boot, typed once: real numbers from this browser where there are any)
  const lines = ['SUIT 07  ·  VISOR ONLINE', `WORLDS ON THIS SUIT  ·  ${worlds().length}`, 'MOON CAMP LINK  ·  OK', 'EARTH  ·  SIGNAL LOST', 'THE DARK  ·  NO SHAPE ON RECORD', `BUILD  ·  ${BUILD}`]; let i = 0, out = '';
  clearInterval(bootLog.t); bootLog.t = setInterval(() => { if (i >= lines.length) return clearInterval(bootLog.t); out += lines[i++] + String.fromCharCode(10); $('bootLog').textContent = out; }, 260);
}
let pendingWorld = null; drawWorlds(); setTimeout(() => { if (mode === 'menu') resume(); }, 50); setTimeout(flushQueue, 5000);
$('solo').onclick = () => { myName(); sound.wake(); startWorld(null); };
function crewCode() { if (!SET.crew) { SET.crew = roomCode(); save(); } return SET.crew; }   // (made once, kept forever in this browser: the link never changes)
function openRoom(t0 = 0) { const code = crewCode(); net = new Net(onNet, t => { if (/taken/.test(t) && t0 < 8) { setTimeout(() => { try { net.peer.destroy(); } catch (e) {} openRoom(t0 + 1); }, 3000); return; } say(t, 5); }); net.hostGame(code); }   // (just after a reload the old room can linger a few seconds: try again)
$('host').onclick = () => { myName(); sound.wake(); openRoom(); startWorld(worlds()[0] ? worlds()[0].id : null); say(`Your crew's room ${crewCode()} is open. Your link never changes: Esc, then COPY INVITE once and pin it.`, 10); };
$('join').onclick = () => { myName(); sound.wake(); const code = cleanCode($('code').value); if (code.length !== CODE_LEN) { $('menuNote').textContent = `Room codes are ${CODE_LEN} letters.`; return; } net = new Net(onNet, t => { $('menuNote').textContent = t; if (mode === 'play') say(t, 5); }); net.joinGame(code); $('menuNote').textContent = `Joining room ${code}...`; };
function drawJoinAgain() { const c = SET.lastJoin; if (c && c.length === CODE_LEN && !$('code').value) { $('code').value = c; $('menuNote').textContent = 'Your crew room is filled in: click JOIN.'; } }
function readInvite() { const c = cleanCode((location.hash.match(/join=([A-Za-z]+)/) || [])[1]); if (c.length === CODE_LEN && mode === 'menu') { $('code').value = c; $('menuNote').textContent = `Your friend's room ${c} is filled in: type your name, then click JOIN.`; } }
readInvite(); drawJoinAgain(); addEventListener('hashchange', readInvite);
requestAnimationFrame(frame);
window.lastfire2 = { get camp() { return camp; }, get ship() { return ship; }, grade, get g() { return g; }, get me() { return me; }, get net() { return net; }, shoot, renderer };   // (a handle for the automated test)
