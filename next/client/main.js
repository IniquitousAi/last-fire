// Last Fire (the new foundation), piece 1: drawing, sound and input around the rules in core/game.js.
// The rules run here as host; nothing in this file decides what happens, only what you see, hear and send in.
import * as THREE from 'three';
import * as C from '../core/game.js?v=84';
import { Ambience } from './ambience.js?v=84';
import { Camp, BOARD } from './camp.js?v=84';
import { Guide } from './guide.js?v=84';
import { buildSites } from './earthsite.js?v=84';
import { Truck } from './truck.js?v=84';
import { Wrist } from './wrist.js?v=84';
import { FireCore } from './firecore.js?v=84';
import { EffectComposer } from '../../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../../vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../vendor/jsm/postprocessing/OutputPass.js';
import { think as friendThink } from './friend.js?v=84';
import { FriendVoice } from './friendvoice.js?v=84';
import { crewFrom } from '../core/habits.js?v=84';
import { HudLook } from './hudlook.js?v=84';
import { Net, roomCode, cleanCode, CODE_LEN, MAX_PLAYERS } from './net.js?v=84';
import { sound, GUNS } from '../../src/combat.js?v=84';
import { FX } from '../../src/fx.js?v=84';
import { GLTFLoader } from '../../vendor/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from '../../vendor/jsm/utils/SkeletonUtils.js';

const $ = id => document.getElementById(id);
const BUILD = 84;   // (this copy's version; ./version.json says the newest)
const SET = Object.assign({ sens: 1, vol: 0.8, name: '' }, (() => { try { return JSON.parse(localStorage.getItem('lastfire2') || '{}'); } catch (e) { return {}; } })());
const save = () => { try { localStorage.setItem('lastfire2', JSON.stringify(SET)); } catch (e) {} };
sound.setVolume(SET.vol);

// ---------------------------------------------------------------- renderer and the sky (always the dark: awe overhead, the light is yours)
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, 0.05, 900);
const composer = new EffectComposer(renderer), bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.5, 0.82); composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(new OutputPass());
const softDot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();   // (round, soft points: embers and motes were square specks)
scene.fog = new THREE.FogExp2(0x04060c, 0.016); scene.background = new THREE.Color(0x02030a);
scene.add(new THREE.HemisphereLight(0x5a6fb0, 0x020306, 0.09));   // (barely any moonlight: the dark is dark, the light is yours)
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
const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uT: { value: 0 }, uEarth: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec3 vD; uniform float uT; uniform float uEarth;
    float h(vec3 p){ p = fract(p * 0.3183 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float n(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
    void main(){
      vec3 d = normalize(vD); float up = clamp(d.y, -0.2, 1.0);
      vec3 col = mix(vec3(0.006, 0.008, 0.02), vec3(0.0, 0.0, 0.004), up);
      float neb = fbm(d * 2.6 + vec3(0.0, uT * 0.004, 0.0)), band = exp(-pow((d.y - 0.25 + 0.3 * d.x) * 2.6, 2.0));
      col += band * (vec3(0.05, 0.03, 0.14) * smoothstep(0.35, 0.8, neb) + vec3(0.0, 0.05, 0.09) * smoothstep(0.5, 0.9, fbm(d * 5.0 + 3.0)) + vec3(0.09, 0.01, 0.06) * smoothstep(0.62, 0.95, fbm(d * 3.3 - 7.0)));
      float st = h(floor(d * 420.0)); col += vec3(0.85, 0.9, 1.0) * step(0.9975, st) * (0.5 + 0.5 * h(floor(d * 420.0) + 7.0)) * smoothstep(-0.05, 0.2, d.y);
      // Earth, seen from the Moon: blue where it is still itself, black where the dark has taken it, thin violet where the two meet (PLAN-SPACE.md)
      vec3 E = normalize(vec3(0.6, 0.22, -0.78)); float R = 0.13, a = acos(clamp(dot(d, E), -1.0, 1.0));
      vec3 t1 = normalize(cross(E, vec3(0.0, 1.0, 0.0))), t2 = cross(t1, E); vec2 q = vec2(dot(d, t1), dot(d, t2)) / sin(R); float r2 = dot(q, q);
      if (uEarth > 0.5) { float m = acos(clamp(dot(d, E), -1.0, 1.0)); if (m < 0.05) { vec2 mq = vec2(dot(d, t1), dot(d, t2)) / sin(0.05); vec3 MN = normalize(mq.x * t1 + mq.y * t2 - sqrt(max(0.0, 1.0 - dot(mq, mq))) * E); col = vec3(0.55, 0.58, 0.66) * (0.25 + 0.75 * max(dot(MN, normalize(t1 * 0.85 + t2 * 0.25 - E * 0.35)), 0.0)) * (0.7 + 0.3 * fbm(MN * 6.0)); } r2 = 2.0; R = 0.05; }   /* (from Earth: the Moon, small and gray, where home is) */
      if (r2 < 1.0) {
        vec3 N = normalize(q.x * t1 + q.y * t2 - sqrt(1.0 - r2) * E); float sp = uT * 0.008, cs = cos(sp), sn = sin(sp); vec3 P = vec3(N.x * cs - N.z * sn, N.y, N.x * sn + N.z * cs);
        vec3 L = normalize(t1 * 0.85 + t2 * 0.25 - E * 0.35); float lit = max(dot(N, L), 0.0);
        float land = smoothstep(0.5, 0.58, fbm(P * 2.2)), dark = smoothstep(0.43, 0.48, fbm(P * 1.5 + vec3(0.0, uT * 0.003, 0.0)));
        vec3 surf = mix(vec3(0.04, 0.16, 0.48), vec3(0.16, 0.24, 0.3), land) * (0.06 + lit * 1.2) + vec3(0.25, 0.4, 0.6) * pow(lit, 6.0) * (1.0 - land) * 0.4;
        surf += vec3(0.7, 0.85, 1.0) * step(0.986, h(floor(P * 90.0))) * land * (1.0 - smoothstep(0.0, 0.25, lit)) * 0.8;   /* (the last cities, on the night side) */
        float edge = exp(-pow((fbm(P * 1.5 + vec3(0.0, uT * 0.003, 0.0)) - 0.455) * 70.0, 2.0)) * (0.6 + 0.4 * sin(uT * 0.7 + P.x * 30.0));
        col = mix(surf, vec3(0.0), dark) + vec3(0.55, 0.18, 0.85) * edge * 0.55;
      }
      col += vec3(0.3, 0.75, 1.0) * exp(-pow((a - R) * 260.0, 2.0)) * 0.55;   // (a hair of atmosphere at the edge)
      gl_FragColor = vec4(col, 1.0);
    }` }));
scene.add(sky);

// ---------------------------------------------------------------- the game (rules) and you
const amb = new Ambience(() => SET.vol); amb.onCrackle = () => { if (fireObj) fireObj.flare(0.55); };   // (what you hear and what you see agree: each crackle makes the flame jump)
const clickPlay = document.createElement('div'); clickPlay.hidden = true;   // (mouse free: the suit's aim link is on standby; a click links it again. A reason in the world, not a sign on the glass)
clickPlay.innerHTML = '<div style="width:132px;height:132px;margin:0 auto;border:1px solid rgba(255,79,216,.55);border-radius:50%;position:relative"><i style="position:absolute;left:50%;top:-6px;width:1px;height:12px;background:#ff4fd8"></i><i style="position:absolute;left:50%;bottom:-6px;width:1px;height:12px;background:#ff4fd8"></i><i style="position:absolute;top:50%;left:-6px;width:12px;height:1px;background:#ff4fd8"></i><i style="position:absolute;top:50%;right:-6px;width:12px;height:1px;background:#ff4fd8"></i></div><div style="margin-top:12px;font-size:15px;letter-spacing:.24em;color:#ff4fd8">AIM LINK  ·  STANDBY</div><div style="font-size:14px;letter-spacing:.08em;color:#a3a6bb;margin-top:2px">click to link your aim</div>';
Object.assign(clickPlay.style, { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -66px)', textAlign: 'center', font: '400 15px "Barlow Condensed", sans-serif', pointerEvents: 'none', zIndex: 3, textShadow: '0 1px 3px #000' });
document.body.append(clickPlay);
let truck = null, sitesBuilt = false, camp = null, guide = null, g = null, me = null, mode = 'menu', panel = null, fx = new FX(scene), net = null, myId = 1;
const isHost = () => !net || net.host;
const keys = {}, mouse = [false, false, false];
const NODE_MAX = 24;   // (the ground shader lights from up to 24 lights at once: the fire, your glow, the nearest nodes)
const uLights = { value: Array.from({ length: NODE_MAX }, () => new THREE.Vector4(0, 0, 0, 0)) };

// ---------------------------------------------------------------- the land: endless, in 32 m tiles built around you as you walk
const TILE = 32, RES = 33, VIEW = 4, NEAR = 1.6, tiles = new Map();   // (to 128 m: the fog hides everything past about 130 m; tiles past the first ring at a quarter of the detail)
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
groundMat.onBeforeCompile = sh => {   // (light from the network lights the ground: one loop over a small array, no extra lamps)
  sh.uniforms.uLights = uLights;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
    varying vec3 vW; uniform vec4 uLights[${NODE_MAX}];
    float gh(vec3 p){ p = fract(p * 0.3183 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float gn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(gh(i), gh(i + vec3(1,0,0)), f.x), mix(gh(i + vec3(0,1,0)), gh(i + vec3(1,1,0)), f.x), f.y), mix(mix(gh(i + vec3(0,0,1)), gh(i + vec3(1,0,1)), f.x), mix(gh(i + vec3(0,1,1)), gh(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
    .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 0.55 + gn(vW * 0.35) * 0.35 + gn(vW * 1.7) * 0.3 + gn(vW * 7.0) * 0.2;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float L = 0.0; for (int i = 0; i < ${NODE_MAX}; i++) { vec4 q = uLights[i]; if (q.z <= 0.0) continue; float d = length(vW.xz - q.xy) / q.z; L += q.w * (1.0 - smoothstep(0.0, 1.0, d)) * (1.0 - min(d, 1.0) * 0.4); /* edges in order: a reversed smoothstep is undefined on some cards */ }
      totalEmissiveRadiance += diffuseColor.rgb * vec3(0.7, 0.82, 1.25) * min(L, 1.4) * 0.8;
      float far = smoothstep(55.0, 140.0, length(vW.xz - cameraPosition.xz)); float vein = smoothstep(0.82, 0.97, gn(vW * 0.09 + vec3(0.0, 0.0, 0.0))) * smoothstep(0.35, 0.8, gn(vW * 0.031));
      vec3 hue = mix(vec3(0.48, 0.30, 1.0), vec3(0.95, 0.3, 1.0), gn(vW * 0.013)); totalEmissiveRadiance += hue * vein * far * 0.55;   /* (the far dark glows in colors that should not exist) */
      totalEmissiveRadiance += vec3(0.75, 0.7, 1.0) * step(0.9965, gh(floor(vW * 5.0))) * (1.0 - far) * 0.9;   /* (rare mineral glints: the stars, underfoot) */`);
};
function buildTile(tx, tz, res = RES) {
  const geo = new THREE.PlaneGeometry(TILE, TILE, res - 1, res - 1); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + tx * TILE, z = pos.getZ(i) + tz * TILE, y = g.land(x, z); pos.setY(i, y);
    const far = Math.min(1, Math.hypot(x, z) / 1500), slope = Math.min(1, Math.abs(g.land(x + 1, z) - y) + Math.abs(g.land(x, z + 1) - y));
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
const ready = Promise.all([load('wraith', 'c/wraith.glb'), load('clawed', 'c/clawed.glb'), load('shard', 'c/shard.glb'), load('pistol', 'm/pistol.glb'), load('ar', 'm/ar.glb'), load('shotgun', 'm/shotgun.glb'), load('lmg', 'm/lmg.glb'), load('campfire', 'kit/campfire.glb'), load('lantern', 'm/lantern.glb'), load('soldier', 'c/soldier.glb')]);
const MASK_RIM = { walker: 'vec3(0.62, 0.38, 1.0)', runner: 'vec3(1.0, 0.25, 0.65)', watcher: 'vec3(0.85, 0.85, 1.0)', face: 'vec3(1.0, 0.3, 0.85)', giant: 'vec3(1.0, 0.18, 0.25)' };
function darken(root, eyes, kind) {   // (the wraiths are drawn as shadow: near black, pale where their eyes are)
  root.traverse(o => { if (!o.isMesh) return; o.frustumCulled = false; const m = o.material = o.material.clone(); if (/Eye_White|Secondary/.test(m.name)) { m.color.setHex(0x030305); m.emissive = new THREE.Color(0); m.emissiveIntensity = 0; }   /* (no cartoon eyeballs or grins: black, so the face reads as a hollow) */ else if (/Eye_Black/.test(m.name)) { m.color.setHex(eyes); m.emissive = new THREE.Color(eyes); m.emissiveIntensity = 3; }   /* (only the pupils burn: pinpoint eyes, like the stars) */ else { m.color.setHex(0x07070c); m.emissive = new THREE.Color(0x0a0c18); m.emissiveIntensity = 0.3; m.roughness = 0.9; if (MASK_RIM[kind]) { m.userData.rim = 1; m.defines = { ...(m.defines || {}), USE_RIM: '', RIM_COLOR: MASK_RIM[kind] }; m.needsUpdate = true; } } /* (a faint cold rim so a shape reads against the dark) */ });
}

// ---------------------------------------------------------------- the Hollow as you see them: a pool of animated wraiths, one per Hollow
const seen = new Map();
const LOOK = { walker: ['wraith', 1.6, 0xb48cff], runner: ['wraith', 1.1, 0xff4fa0], giant: ['wraith', 3.4, 0xff2b40], watcher: ['wraith', 2.4, 0xffffff], face: ['wraith', 1.3, 0xff4fd8] };   // (no more clawed model: he saw a smiling dog. Until real masks, every mask is the faceless ghost, stretched into its own shape)   // (eye color = the mask's own edge color)
function drawHollow(dt) {
  const alive = new Set();
  for (const k of g.hollow) {
    alive.add(k.id); let v = seen.get(k.id);
    if (!v) {
      if (k.kind === 'shard') { const src = models.shard; if (!src) continue; const o = src.scene.clone(); const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()); o.scale.setScalar(1.3 / Math.max(s.x, s.y, s.z)); o.traverse(q => { if (q.isMesh) { q.material = q.material.clone(); q.material.emissive = new THREE.Color(0x9fb6ff); q.material.emissiveIntensity = 0.5; } }); v = { o }; }
      else { const [mk, size, eyes] = LOOK[k.kind], src = models[mk]; if (!src) continue; if (!src.box) { src.scene.updateMatrixWorld(true); src.box = new THREE.Box3().setFromObject(src.scene); }   /* (measured on the original: a copy of an animated model measures wrong, the camp people's old bug) */
        const o = skClone(src.scene); darken(o, eyes, k.kind); const b = src.box, s = b.getSize(new THREE.Vector3()); o.scale.setScalar(size * 1.6 / s.y);
        if (k.kind === 'runner') { const sc = size * 1.6 / s.y; o.scale.set(sc * 1.35, sc * 0.75, sc * 1.6); }   // (the runner: low and long, built to close distance)
        if (k.kind === 'face') { const sc = size * 1.6 / s.y; o.scale.set(sc * 1.5, sc * 1.2, sc * 0.45); }   // (the face: flat and wide, the way it came out of the wall)
        if (k.kind === 'watcher') { const sc = size * 1.6 / s.y; o.scale.set(sc * 0.6, sc, sc * 0.6);   // (the tall one: stretched thin, a wide-brimmed hat, nothing else you can name)
          const hatM = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 1 }), brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 24), hatM), crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.42, 20), hatM);
          const hat = new THREE.Group(); crown.position.y = 0.22; hat.add(brim, crown); hat.scale.set(1 / (sc * 0.6), 1 / sc, 1 / (sc * 0.6)); hat.position.y = b.max.y - 0.05 * s.y; o.add(hat); }
        const mix = new THREE.AnimationMixer(o), A = n => { const c = src.animations.find(a => a.name.endsWith(n)); return c ? mix.clipAction(c) : null; }; v = { o, mix, fly: A('Fast_Flying'), idle: A('Flying_Idle'), hit: A('Punch'), death: A('Death') }; (v.fly || v.idle)?.play(); }
      if (k.kind === 'face') { const at = new THREE.Vector3(k.x, k.y + 1.2, k.z); fx.burst(at, 28, [0.55, 0.57, 0.66], 5, 0.7); if (sound.shatter) sound.shatter(at); }   // (it tears out of the wall: concrete dust and a crack)
      v.mats = []; v.o.traverse(q => { if (q.isMesh) { q.material.transparent = true; v.mats.push(q.material); } }); v.sol = 0; v.base = v.o.scale.x;
      scene.add(v.o); seen.set(k.id, v);
    }
    { const want = C.solid(g, k) ? 1 : 0; v.sol += (want - v.sol) * Math.min(1, dt * 7);   // (out of the light it is smoke: faint, unsteady, shots pass through; in the light it commits to a shape)
      for (const m of v.mats) { m.opacity = 0.16 + 0.84 * v.sol; m.depthWrite = v.sol > 0.9; }
      const w = (1 - v.sol) * 0.1, t = performance.now() / 1000 + k.id; v.o.scale.set(v.base * (1 + w * Math.sin(t * 11)), v.base * (1 + w * Math.sin(t * 7.3)), v.base * (1 + w * Math.cos(t * 9.1))); }
    const tgt = k.y + (k.kind === 'shard' ? 2.6 : 0.2); v.o.position.set(k.x, tgt, k.z); v.o.rotation.y = k.yaw;   // (no bob: they hold their height; the animation does the moving)
    if (k.kind === 'shard') v.o.rotation.y += performance.now() / 900; if (v.mix && !(k.kind === 'watcher' && C.lookedAt(g, k))) v.mix.update(dt * (k.kind === 'runner' ? 1.6 : 1));   // (seen, it freezes mid-motion)
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
farSeed.forEach((f, i) => farCol.set([[0.3, 0.9, 1], [0.95, 0.35, 1], [0.6, 0.5, 1]][i % 3], i * 3));
const farMesh = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: softDot, size: 9, vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
farMesh.geometry.setAttribute('position', new THREE.BufferAttribute(farPos, 3)); farMesh.geometry.setAttribute('color', new THREE.BufferAttribute(farCol, 3)); farMesh.frustumCulled = false; scene.add(farMesh);
function farLights(dt) { if (!me) return; farSeed.forEach((f, i) => { f.a += f.s * dt; farPos.set([me.x + Math.cos(f.a) * f.r, f.h, me.z + Math.sin(f.a) * f.r], i * 3); }); farMesh.geometry.attributes.position.needsUpdate = true; }
// motes of light: a few hundred points in one draw call; they drift toward you when you walk close
const MOTES = 400, motePos = new Float32Array(MOTES * 3), motes = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: softDot, color: 0xe0c8ff, size: 0.5, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
motes.geometry.setAttribute('position', new THREE.BufferAttribute(motePos, 3)); motes.frustumCulled = false; scene.add(motes);
function drawMotes() { let i = 0; for (const m of g.motes) { if (i >= MOTES) break; motePos.set([m.x, g.land(m.x, m.z) + 0.6, m.z], i * 3); i++; } for (; i < MOTES; i++) motePos[i * 3 + 1] = -999; motes.geometry.attributes.position.needsUpdate = true; }

// ---------------------------------------------------------------- what you hold: the gun in its own pass (never through a wall)
const vscene = new THREE.Scene(), vcam = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.01, 10), view = new THREE.Group(); vcam.add(view); vscene.add(vcam);
const vhemi = new THREE.HemisphereLight(0xc8d4f0, 0x1a1c26, 1); vscene.add(vhemi); const vsun = new THREE.DirectionalLight(0xffffff, 0.8); vsun.position.set(0.6, 1, 0.8); vscene.add(vsun);
const held = {}; let gunKey = 'pistol', ammo = { pistol: { mag: 8, res: 72 }, ar: { mag: 30, res: 210 }, shotgun: { mag: 2, res: 40 }, lmg: { mag: 45, res: 270 } }, reloadT = 0, shotCd = 0, kick = 0, ads = 0;
function prepGun(k) { const src = models[k]; if (!src) return; const inner = src.scene.clone(), holder = new THREE.Group(); inner.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); if (/Wood/.test(o.material.name)) o.material.color.setHex(0x1d1f25); if (/Metal/.test(o.material.name)) { o.material.metalness = 0.25; o.material.color.multiplyScalar(1.35); } } });
  inner.rotation.y = Math.PI / 2; holder.add(inner); let b = new THREE.Box3().setFromObject(holder), s = b.getSize(new THREE.Vector3()); inner.scale.multiplyScalar(({ pistol: 0.24, ar: 0.82, shotgun: 0.86, lmg: 0.86 })[k] / s.z); b = new THREE.Box3().setFromObject(holder); const c = b.getCenter(new THREE.Vector3()); inner.position.sub(c);
  b = new THREE.Box3().setFromObject(holder); holder.userData = { len: b.max.z - b.min.z, top: b.max.y, muzzle: new THREE.Vector3(0, b.max.y * 0.35, b.min.z) }; holder.visible = false; view.add(holder); held[k] = holder; }

// ---------------------------------------------------------------- input: click to take the mouse; Esc for the menu
const locked = () => document.pointerLockElement === renderer.domElement;
let buildPick = null;
addEventListener('keydown', e => { if (e.code === 'Tab' && mode === 'play' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); toggleTab(); return; } if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; keys[e.code] = true; if (mode !== 'play' || panel) return;
  if (e.code === 'Digit1') switchGun('pistol'); if (e.code === 'Digit2') switchGun('ar'); if (e.code === 'Digit3') switchGun('shotgun'); if (e.code === 'KeyG') throwFlare(); if (e.code === 'KeyX') nextSeat(); if (e.code === 'Digit4') switchGun('lmg'); if (e.code === 'KeyR') reload(); if (e.code === 'KeyQ') pickBuild(buildPick === 'relay' ? null : 'relay'); if (e.code === 'KeyE') pickBuild(buildPick === 'lamp' ? null : 'lamp'); if (e.code === 'KeyF') act(); });
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { if (document.pointerLockElement) document.exitPointerLock(); for (const k in keys) keys[k] = false; mouse.fill(false); });
renderer.domElement.addEventListener('click', () => { amb.start(); if (mode === 'play' && !panel && !locked()) renderer.domElement.requestPointerLock(); });
addEventListener('mousemove', e => { if (!locked()) return; const k = 0.0022 * SET.sens * (1 - ads * 0.35); me.yaw -= e.movementX * k; me.pitch = Math.max(-1.55, Math.min(1.55, me.pitch - e.movementY * k)); });
addEventListener('mousedown', e => { if (!locked()) return; mouse[e.button] = true; if (e.button === 0 && buildPick) { tryBuild(); mouse[0] = false; } if (e.button === 2 && buildPick) pickBuild(null); });
addEventListener('mouseup', e => mouse[e.button] = false);
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => { if (mode === 'play' && !locked() && !panel) { panel = 'pause'; $('paused').hidden = false; drawPause(); } });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); bloom.resolution.set(innerWidth, innerHeight); camera.aspect = vcam.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); vcam.updateProjectionMatrix(); });
function drawPause() {
  $('room').innerHTML = net ? `<div class="code">ROOM <b>${net.code}</b></div><button class="key" id="copyInvite">COPY INVITE<small>(a link with the code in it: paste it in Discord)</small></button>${net.host ? `<button class="key" id="lockRoom">${net.locked ? 'UNLOCK THE ROOM' : 'LOCK THE ROOM'}<small>(${net.locked ? 'let new friends in again' : 'nobody new can join, even with the code'})</small></button>` : ''}` : ''; $('sSens').value = SET.sens; $('vSens').textContent = SET.sens.toFixed(2); $('sVol').value = SET.vol; $('vVol').textContent = Math.round(SET.vol * 100); }
$('sSens').oninput = e => { SET.sens = +e.target.value; $('vSens').textContent = SET.sens.toFixed(2); save(); };
$('sVol').oninput = e => { SET.vol = +e.target.value; sound.setVolume(SET.vol); $('vVol').textContent = Math.round(SET.vol * 100); save(); };
$('resume').onclick = () => { panel = null; $('paused').hidden = true; renderer.domElement.requestPointerLock(); };
$('leave').onclick = () => { saveNow(); location.href = location.pathname; };
$('room').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'copyInvite') { const url = `${location.origin}${location.pathname}#join=${net.code}`; navigator.clipboard?.writeText(url).then(() => { b.firstChild.textContent = 'COPIED'; setTimeout(() => b.firstChild.textContent = 'COPY INVITE', 1500); }, () => { b.querySelector('small').textContent = url; }); }
  if (b.id === 'lockRoom') { net.lock(!net.locked); drawPause(); } });

// ---------------------------------------------------------------- actions
let lastFall = '', msgT = 0, duskSnap = null, god = false; const wrist = new Wrist(vcam); function say(t, s = 3) { wrist.say(t, s); }   // (messages come from the wrist screen, never as text on the glass: his UI rule)
const look = () => new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(me.pitch, me.yaw, 0, 'YXZ'));
function switchGun(k) { if (k === gunKey) return; gunKey = k; reloadT = 0; }
// practice (INNOVATION.md idea 8): each gun's reload gets faster the more you do it, on a curve that flattens (the power law of practice);
// up to 35% faster, never reset, kept in this browser. A real skill curve, not a level.
const practiced = k => (SET.practice && SET.practice[k]) || 0, reloadSpeed = k => 0.65 + 0.35 * Math.pow(1 + practiced(k) / 8, -0.5);
function practice(k) { SET.practice = SET.practice || {}; const n = SET.practice[k] = practiced(k) + 1; save();
  if ([10, 25, 50, 100, 200, 400].includes(n)) say(`Your hands know the ${GUNS[k].name} now: reloads ${Math.round((1 - reloadSpeed(k)) * 100)}% faster than your first (${n} reloads).`, 5); }
function reload() { const G = GUNS[gunKey], a = ammo[gunKey]; if (reloadT > 0 || a.mag >= G.mag || a.res <= 0) return; reloadT = G.reload * reloadSpeed(gunKey); practice(gunKey); sound.magOut(); setTimeout(() => sound.magIn(), G.reload * reloadSpeed(gunKey) * 700); }
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
  const mount = mounted(), G = mount ? MOUNT : GUNS[gunKey], a = ammo[gunKey]; if (shotCd > 0 || (!mount && reloadT > 0) || me.ember) return;
  if (mount) { if (overheat) { if (!shoot.hot) { sound.click(); shoot.hot = true; } return; } shoot.hot = false; heat = Math.min(1, heat + 0.045); if (heat >= 1) { overheat = true; say('The mount is red hot. Let it cool.', 2); } }
  else { if (a.mag <= 0) { sound.click(); reload(); shotCd = 0.3; return; } a.mag--; }
  shotCd = 60 / G.rpm; sound.shot(mount ? 'lmg' : gunKey); kick = Math.min(1, kick + 0.5 + G.recoil * 6);
  const o = new THREE.Vector3(me.x, me.y + 1.62, me.z), sp = G.spread * (ads > 0.5 ? 0.3 : 1), ds = [], gm = held[gunKey]; let end = null;
  if (gm) { vcam.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
  const muzzle = gm ? camera.localToWorld(gm.localToWorld(gm.userData.muzzle.clone())) : o.clone();
  for (let n = 0; n < (G.pellets || 1); n++) {   // (a shotgun throws a handful of pellets: each is its own line through the air)
    const d = look(); d.x += (Math.random() - 0.5) * sp * 2; d.y += (Math.random() - 0.5) * sp * 2; d.z += (Math.random() - 0.5) * sp * 2; d.normalize(); ds.push([+d.x.toFixed(4), +d.y.toFixed(4), +d.z.toFixed(4)]);
    const lit = n === 0 && (isHost() ? C.fired(g, me, o.x, o.z, d.x, d.z) : ((me.shots = (me.shots || 0) + 1) % C.TRACER.every === 0));   // (every fourth round is a tracer: it lights its path)
    const h = C.hitRay(g, o.x, o.y, o.z, d.x, d.y, d.z, 80), e = o.clone().addScaledVector(d, h ? h.t : 60); if (!end) end = e;
    fx.tracer(muzzle, e); if (lit) burn(muzzle, o.clone().addScaledVector(d, h ? h.t : C.TRACER.len));
    if (h) { if ((h.part ? h.k.sb : h.k.sh) > 0) fx.spark(e); else fx.ichor(e, h.mult > 1); if (isHost()) showHit(C.damage(g, h.k, h.part, G.dmg * (h.mult > 1 ? G.head : 1), G.ap, me.id), h.mult > 1); }
  }
  if (!isHost()) net.send({ t: 'shot', g: mount ? 'lmg' : gunKey, o: [o.x, o.y, o.z], d: ds[0], ds });
  if (net) net.send({ t: 'bang', g: gunKey, x: +me.x.toFixed(2), y: +(me.y + 1.5).toFixed(2), z: +me.z.toFixed(2), e: [+end.x.toFixed(2), +end.y.toFixed(2), +end.z.toFixed(2)] });
  me.pitch = Math.min(1.55, me.pitch + G.recoil * 0.4); me.yaw += (Math.random() - 0.5) * G.recoil * 0.3;
}
let hitT = 0;
function showHit(r, head) { $('hit').className = r.kill ? 'kill' : r.shell ? 'shell' : 'on'; hitT = r.kill ? 0.25 : 0.12; r.kill ? sound.kill() : r.broke ? sound.shatter() : r.shell ? sound.plate() : sound.hit(head); }
function tryGrow() {   // (growing the fire: your choice, and tonight the dark answers with what the new level wakes)
  if (!C.canGrow(g)) return; if (Math.hypot(me.x - g.fire.x, me.z - g.fire.z) > C.fireRadius(g.fire)) return say('Stand at the fire to grow it.');
  if (isHost()) C.grow(g, me); else net.send({ t: 'build', k: 'grow', x: 0, z: 0 }); }
function trip(k) { sound.buy(); const site = SET.site || 'city'; if (isHost()) { if (k === 'drop') C.drop(g, me, site); else C.rise(g, me); } else net.send({ t: 'build', k, x: 0, z: 0, s: site }); }
function siteRow() {   // (pick the site by its odds: what your own record says each district holds; a guess until 3 trips, checked after 10)
  return `<span style="display:block;margin-top:5px;font-size:14px;color:#b9a8ff">land at (click one):${Object.entries(C.SITES).map(([k, S]) => { const o = C.siteOdds(g, k), on = (SET.site || 'city') === k;
    return `<span style="display:block"><b class="site" data-s="${k}" style="cursor:pointer;font-weight:500;color:${on ? '#ff4fd8' : '#eef0f8'}">${on ? '> ' : ''}${S.name}</b>  <small style="color:#a3a6bb">${o.parts.toFixed(1)} parts, ${o.cells.toFixed(1)} cells (${o.label}${o.trips ? ', ' + o.trips + ' trips' : ''})</small></span>`; }).join('')}</span>`; }
const atPad = () => !C.onEarth(me) && Math.hypot(me.x - C.PAD.x, me.z - C.PAD.z) < 4, atSite = () => C.onEarth(me) && Math.hypot(me.x - C.EARTH.x, me.z - C.EARTH.z) < 4;
const STORE = { x: 15.8, z: -2.5 }, atStore = () => !C.onEarth(me) && Math.hypot(me.x - STORE.x, me.z - STORE.z) < 4;   // (the camp's store, behind the metal walls: the ammo lives there)
const shortAmmo = () => Object.keys(ammo).some(k => ammo[k].res < GUNS[k].reserve);
function resupply() { for (const k in ammo) ammo[k].res = GUNS[k].reserve; sound.magIn(); say('Topped up from the camp store. Every gun full.', 3); }
const atBay = () => !C.onEarth(me) && Math.hypot(me.x - C.BAY.x, me.z - C.BAY.z) < 5;
function fitPart() { if (isHost()) { const k = C.fit(g, me); if (k) { sound.buy(); say(`The ${k} is on. ${C.truckDone(g) ? 'The truck is whole.' : ''}`, 3); } } else net.send({ t: 'build', k: 'fit', x: 0, z: 0 }); }
function bayLine() { const k = C.PART_ORDER.find(k => C.canFit(g, k)); if (k) return `F  ·  FIT THE ${k.toUpperCase()} (${g.stash[k]} in the stash)`; if (C.truckDone(g)) return 'The truck is whole. (driving it comes next)';
  const need = C.PART_ORDER.find(k => C.fitted(g, k) < C.PARTS[k].n); const blocked = C.PARTS[need].after.find(a => C.fitted(g, a) < C.PARTS[a].n); return `THE TRUCK: needs ${blocked ? `the ${blocked} before the ${need}` : `a ${need}`} (find parts on Earth)`; }
const nearCar = () => g.car && (C.seatOf(g, me.id) >= 0 || Math.hypot(me.x - g.car.x, me.z - g.car.z) < 3.8);
function carLine() { const c = g.car, kg = C.storeKg(c); const mySeat = C.seatOf(g, me.id); if (mySeat >= 0) return `F  ·  GET OUT   ·   ${['DRIVING', 'ROOF LAMP', 'MOUNTED GUN', 'MOUNTED GUN'][mySeat]}   ·   ${Math.round(Math.abs(c.v) * 3.6)} km/h   ·   load ${kg} of ${C.CAR.store} kg<span style="display:block;margin-top:4px;font-size:14px"><b class="seatnext" style="cursor:pointer;color:#ff4fd8;font-weight:500">X  ·  NEXT SEAT</b></span>`;
  return (me.pack || []).length ? `F  ·  LOAD YOUR PACK INTO THE TRUCK (${kg} of ${C.CAR.store} kg)` : !c.seats.includes(null) ? 'The truck is full.' : `F  ·  GET IN${c.seats[0] === null ? ' AND DRIVE (W, S, A, D)' : ''}`; }
function useCar() { if (isHost()) { const r = C.useCar(g, me); if (r === 'stowed') { sound.drop(); say('Loaded into the truck.', 2); } else if (r === 'full') say('The truck is full.', 2); } else net.send({ t: 'build', k: 'car', x: 0, z: 0 }); }
function friendSign() {   // (the world keeps your friends: walk past what someone else built, or where they fell, and it says so)
  const mine = n => !n || n === SET.name, node = g.nodes.find(n => !mine(n.who) && Math.hypot(me.x - n.x, me.z - n.z) < 2.2);
  if (node) return `${node.who}'s ${node.kind}  ·  built night ${node.n || '?'}${node.lit ? ', still carrying light' : ', dark now'}`;
  const m = g.marks.find(m => m.k === 'fall' && !mine(m.who) && Math.hypot(me.x - m.x, me.z - m.z) < 1.6); return m ? `${m.who} fell here  ·  night ${m.n}` : '';
}
function act() { if (me.ember) return; if (nearCar()) return useCar(); if (atPad()) return trip('drop'); if (atSite()) return trip('rise'); if (atBay() && C.PART_ORDER.some(k => C.canFit(g, k))) return fitPart(); if (atStore() && shortAmmo()) return resupply(); tryGrow(); }   // (F, or a click on the prompt: whatever is in front of you)
$('prompt').addEventListener('click', e => { if (e.target.closest('.seatnext')) return nextSeat(); const st = e.target.closest('.site'); if (st) { SET.site = st.dataset.s; save(); return; } const b = e.target.closest('.bet'); if (b && atPad()) { stake = +b.dataset.p / 100; say(`Staked: you said ${b.dataset.p}% you come back. The board keeps score.`, 4); trip('drop'); return; } act(); });
// staking your own odds (INNOVATION.md idea 4): a guess before a trip, scored by what happened; the board shows how true your guesses run
let stake = null; function settleStake(back) { if (stake === null) return; SET.stakes = [...(SET.stakes || []), [stake, back ? 1 : 0]].slice(-200); save(); stake = null; }
const stakeScore = () => { const st = SET.stakes || []; return st.length ? { n: st.length, brier: st.reduce((a, [p, o]) => a + (p - o) ** 2, 0) / st.length, back: st.filter(x => x[1]).length } : null; }; $('prompt').style.pointerEvents = 'auto'; $('prompt').style.cursor = 'pointer';
function pickBuild(k) { buildPick = k; drawBuild(); }
function buildSpot() { const o = new THREE.Vector3(me.x, me.y + 1.62, me.z), d = look(); for (let t = 1; t < 9; t += 0.25) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y <= g.land(x, z)) return { x, z }; } return { x: o.x + d.x * 5, z: o.z + d.z * 5 }; }
const ghost = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.8, depthTest: false })); ghost.visible = false; scene.add(ghost);
function build(p, kind, x, z) {   // (host only: the player must carry the light, and stand within 9 m of where it goes)
  const K = C.NODE[kind]; if (!K || !Number.isFinite(x) || !Number.isFinite(z) || p.ember || p.carried < K.cost || Math.hypot(p.x - x, p.z - z) > 9) return null;
  p.carried -= K.cost; return C.placeNode(g, kind, x, z, p.id);
}
function tryBuild() { const K = C.NODE[buildPick]; if (me.carried < K.cost) return say(`A ${buildPick} costs ${K.cost} light. You carry ${Math.floor(me.carried)}.`); const s = buildSpot(); sound.buy();
  if (isHost()) { const n = build(me, buildPick, s.x, s.z); if (n) say(n.lit ? `The ${buildPick} takes the light.` : `Too far from the light: the ${buildPick} stays dark. Place it within reach of a lit relay.`, 3); } else net.send({ t: 'build', k: buildPick, x: +s.x.toFixed(2), z: +s.z.toFixed(2) }); }
function drawBuild() { $('build').innerHTML = Object.entries(C.NODE).map(([k, K]) => `<button class="bk${buildPick === k ? ' on' : ''}${me && me.carried < K.cost ? ' off' : ''}" data-k="${k}">${k === 'relay' ? 'RELAY (Q)' : 'LAMP (E)'}<small>${K.cost} light: ${k === 'relay' ? 'carries light on, ' + K.reach + ' m' : 'shines wide, carries nothing'}</small></button>`).join('') + `<button class="bk${me && me.carried < C.FLARE.cost ? ' off' : ''}" data-k="flare">FLARE (G)<small>${C.FLARE.cost} light: pulls the hunt and burns it, ${C.FLARE.life} s</small></button>`; }
$('build').addEventListener('click', e => { const b = e.target.closest('.bk'); if (!b) return; if (b.dataset.k === 'flare') return throwFlare(); pickBuild(buildPick === b.dataset.k ? null : b.dataset.k); });
function flareSpot() { const o = new THREE.Vector3(me.x, me.y + 1.62, me.z), d = look(); for (let t = 1; t <= C.FLARE.reach; t += 0.25) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y <= g.land(x, z) + 0.1) return [x, z]; } return [o.x + d.x * 12, o.z + d.z * 12]; }   // (where you aim, on the ground, up to 16 m)
function nextSeat() { if (C.seatOf(g, me.id) < 0) return; if (isHost()) { const j = C.nextSeat(g, me); if (j >= 0) say(['You take the wheel.', 'You take the roof lamp. Look where it should shine.', 'You take the mounted gun.', 'You take the mounted gun.'][j], 2); } else net.send({ t: 'build', k: 'seat', x: 0, z: 0 }); }
function throwFlare() { if (me.ember) return; if (me.carried < C.FLARE.cost) return say(`A flare costs ${C.FLARE.cost} light. You carry ${Math.floor(me.carried)}.`, 2); const [x, z] = flareSpot(); sound.buy(); if (isHost()) C.throwFlare(g, me, x, z); else net.send({ t: 'build', k: 'flare', x: +x.toFixed(2), z: +z.toFixed(2) }); }

// ---------------------------------------------------------------- moving: grounded but sharp (fast to start and stop, real weight on slopes)
const vel = new THREE.Vector2(); let vy = 0, onGround = true;
function move(dt) {
  if (me.ember) return;
  const seat = C.seatOf(g, me.id); if (seat >= 0 && g.car) {   // (in the truck: you ride; the driver's W/S and A/D are throttle and steering)
    me.drive = seat === 0 ? { th: (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), st: (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) } : null;
    [me.x, me.z] = C.seatPos(g.car, seat); me.y = g.land(me.x, me.z) + 0.9; vel.x = vel.y = 0; vy = 0; onGround = true; return; }
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), sprint = (keys.ShiftLeft || keys.ShiftRight) && f > 0 && ads < 0.5;
  const sinY = Math.sin(me.yaw), cosY = Math.cos(me.yaw); let wx = -sinY * f + cosY * s, wz = -cosY * f - sinY * s; const len = Math.hypot(wx, wz) || 1; wx /= len; wz /= len;
  const top = (sprint ? 7.4 : 4.6) * C.speedOf(me) * (1 - ads * 0.35) * (f || s ? 1 : 0), acc = onGround ? 14 : 3;   // (about a third of a second to full speed, less to stop)
  vel.x += (wx * top - vel.x) * Math.min(1, acc * dt); vel.y += (wz * top - vel.y) * Math.min(1, acc * dt);
  const nx = me.x + vel.x * dt, nz = me.z + vel.y * dt, rise = g.land(nx, nz) - g.land(me.x, me.z);
  if (rise / Math.max(0.001, Math.hypot(vel.x, vel.y) * dt) < 1.4 || !onGround) { me.x = nx; me.z = nz; }   // (slopes steeper than about 55 degrees stop you)
  [me.x, me.z] = C.pushOut(me.x, me.z);   /* (Earth's towers are solid) */
  { const r = Math.hypot(me.x, me.z), a = Math.atan2(me.z, me.x), gate = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.1;   /* (the camp wall at 21 m: solid except the gate) */
    if (!gate && Math.abs(r - 21) < 0.7) { const to = r < 21 ? 20.3 : 21.7; me.x *= to / r; me.z *= to / r; } }
  if (keys.Space && onGround) { vy = 6.2; onGround = false; }
  vy -= 20 * dt; me.y += vy * dt; const ground = g.land(me.x, me.z);
  if (me.y <= ground) { if (!onGround && vy < -7) sound.land(-vy); me.y = ground; vy = 0; onGround = true; } else if (me.y > ground + 0.05) onGround = false;
}

// ---------------------------------------------------------------- the HUD (rewritten only when what it shows changes)
const was = {}; const txt = (id, v, html = false) => { if (was[id] !== v) { was[id] = v; html ? $(id).innerHTML = v : $(id).textContent = v; } };
const PHASE = { day: ['THE LULL', 'the dark holds back'], dusk: ['IT STIRS', 'the dark is rolling in'], night: ['THE SURGE', 'hold the light'], dawn: ['IT EBBS', 'the dark draws back'] };
function hud() {
  const f = g.fire, next = C.FIRE_COST[f.level + 1];
  txt('fireHud', `<b>FIRE ${f.level}</b><small>${next ? `${Math.floor(f.light)} of ${next} light to grow it` : 'as big as it gets'}  ·  fuel ${Math.ceil(f.fuel)} s</small>`, true);
  const [a, b] = PHASE[C.phase(g.clock)]; if (C.onEarth(me) && g.earth) { const t = Math.max(0, Math.ceil(g.earth.t)); txt('phase', `<b>EARTH</b><small>the lander leaves in ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</small>`, true); } else txt('phase', `<b>${a}</b><small>${b}  ·  night ${g.night}</small>`, true);
  { const kg = C.loadOf(me); txt('light', `<b>${Math.floor(me.carried)}</b><span>LIGHT CARRIED (bring it to the fire, or build with it)</span>${kg ? `<span style="display:block;color:#b9a8ff">PACK ${kg} kg: ${(me.pack || []).join(', ')} (${Math.round(C.speedOf(me) * 100)}% speed; drop it at the truck bay)</span>` : ''}`, true); }
  $('hpBar').style.width = Math.max(0, me.hp) + '%'; $('hpBar').style.opacity = (0.35 + 0.65 * Math.max(0, me.hp) / 100).toFixed(2);
  const am = ammo[gunKey]; if (mounted()) txt('ammo', `<b>${Math.round(heat * 100)}%</b><span>heat</span><small>${overheat ? 'TOO HOT, COOLING' : 'MOUNTED GUN, endless rounds'}</small>`, true); else txt('ammo', `<b>${am.mag}</b><span>/ ${am.res}</span><small>${GUNS[gunKey].name}${reloadT > 0 ? '  reloading' : ''}</small>`, true);
  const nearFire = Math.hypot(me.x - f.x, me.z - f.z) < C.fireRadius(f), wakes = C.WAKES[Math.min(f.level + 1, C.WAKES.length - 1)];
  txt('prompt', me.ember ? (C.onEarth(me) ? 'You fell. A friend can carry your Ember to the lander.' : 'You fell. A friend can carry your Ember to the fire.') : nearCar() ? carLine() : atPad() ? `F  ·  DROP TO EARTH${g.earth ? ` (the lander waits ${Math.ceil(g.earth.t)} s)` : ' (150 s down there)'}${g.earth ? '' : siteRow()}<span style="display:block;margin-top:5px;font-size:14px;color:#b9a8ff">or stake your odds of coming back, then drop: ${[90, 70, 50, 30].map(n => `<b class="bet" data-p="${n}" style="cursor:pointer;color:#ff4fd8;margin:0 6px;font-weight:500">${n}%</b>`).join('')}</span>` : atSite() ? 'F  ·  RIDE UP (bring what you carry home)' : atBay() ? bayLine() : atStore() ? (shortAmmo() ? 'F  ·  RESUPPLY FROM THE CAMP STORE' : 'The store: your guns are full.') : camp && camp.bunkNear(me) ? (b => `${b.name}'s bunk  ·  fed the fire ${b.dues} light`)(camp.bunkNear(me)) : friendSign() ? friendSign() : buildPick ? 'Left click to place, right click to cancel' : nearFire && C.canGrow(g) ? `F  ·  GROW THE FIRE to level ${f.level + 1}${wakes.length ? '. Tonight the dark answers' : ''}` : '', true);
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
  requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (mode !== 'play') { const t = now / 1000; camera.position.set(0, 8, 0); camera.rotation.set(0.17 + Math.sin(t * 0.07) * 0.02, Math.atan2(-0.6, 0.78) + Math.sin(t * 0.05) * 0.12, 0, 'YXZ'); sky.material.uniforms.uT.value = t; renderer.render(scene, camera); return; }   // (the home screen looks at Earth, drifting slowly)
  const left = updateTiles(); if (!g.ready) { if (left > 0) { $('loading').textContent = `Lighting the fire: ${left} tiles left`; camera.position.set(me.x, me.y + 1.6, me.z); renderer.render(scene, camera); return; } g.ready = true; $('loading').hidden = true; say('The dark has no edge. Gather its light and push it back.', 5); }
  if (!panel) move(dt);
  shotCd = Math.max(0, shotCd - dt); if (reloadT > 0 && (reloadT -= dt) <= 0) { reloadT = 0; const G = GUNS[gunKey], a = ammo[gunKey], n = Math.min(G.mag - a.mag, a.res); a.mag += n; a.res -= n; }
  heat = Math.max(0, heat - dt * 0.32); if (overheat && heat < 0.35) overheat = false;   /* (the mount cools about a third of its heat a second) */
  if (locked() && mouse[0] && !panel && !buildPick && (mounted() || GUNS[gunKey].auto || !shoot.held)) { shoot(); shoot.held = true; } if (!mouse[0]) shoot.held = false;
  ads += ((mouse[2] && !buildPick && reloadT <= 0 ? 1 : 0) - ads) * Math.min(1, dt * 14);
  if (god) me.hp = 100; const hp0 = me.hp; if (isHost()) { runFriends(dt); C.step(g, dt); } else { g.t += dt; g.clock += dt / C.DAY; } if (me.hp < hp0) { $('hurt').style.opacity = Math.min(0.6, (hp0 - me.hp) / 25); setTimeout(() => $('hurt').style.opacity = 0, 160); sound.hurt(); }
  const evs = g.log.splice(0); if (net && net.host && evs.length) net.send({ t: 'ev', e: evs.slice(0, 20) });
  for (const e of [...evs, ...inbox.splice(0)]) { friendHeard(e); if (e[1] === 'fall' && e[2] === me.id) { const t = (g.traces || []).filter(t => t.of === me.id).pop(); say(lastFall = `You fell to ${e[3] ? 'a ' + e[3] : 'the dark'}${t && Math.hypot(t.fx - t.x, t.fz - t.z) > 0.5 ? `, from the ${dirName(t.fx - t.x, t.fz - t.z)}` : ''}. Your last ten seconds are drawn in red where you fell.`, 6); } else if (e[1] !== 'allfell') lastFall = '';
    if (e[1] === 'goes' || e[1] === 'returned' || e[1] === 'lost') { const who = String(e[2] || ''), Who = who[0] ? who[0].toUpperCase() + who.slice(1) : who;   // (the Clerk's paperwork on people who go out: dry, true, filed)
      say(e[1] === 'goes' ? `${Who} went out this morning. Form 7-B filed. Expected back tomorrow, per the form.` : e[1] === 'returned' ? `${Who} is back. The form was right, for once.` : `${Who} did not come back. Form 9-C, in triplicate. The council calls it a reassignment.`, 7); } if (e[2] === me.id && (e[1] === 'rise' || e[1] === 'stranded' || (e[1] === 'fall' && C.onEarth(me)))) settleStake(e[1] === 'rise'); if (e[1] === 'flood' && Number.isFinite(e[2])) { const x = Math.cos(e[2]), z = Math.sin(e[2]), h = ((Math.atan2(-x, -z) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2), dir = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(h * 8) % 8]; say(`The dark is pooling to the ${dir}, where your light is thinnest. It will pour in there.`, 5); } if (e[1] === 'bank') { sound.drop(); say(`+${Math.floor(e[3])} light to the fire.`, 2); } if (e[1] === 'level') { sound.roundEnd(); say(`The fire grows to level ${e[2]}. Tonight the dark will answer.`, 5); } if (e[1] === 'dusk' && isHost()) duskSnap = JSON.stringify(C.saveWorld(g)); if (e[1] === 'dusk') { sound.round(); say(e[3] ? 'It stirs. The fire\'s growth woke something.' : 'It stirs.', 4); } if (e[1] === 'broke') say(`A ${e[2]} was torn down. The light past it went dark.`, 4); if (e[1] === 'allfell') say(`${lastFall ? lastFall + ' ' : ''}Everyone fell. The fire took you back; the light you carried is out there where you dropped it.`, 7); }
  drawHollow(dt); drawBurns(dt); drawTraces(); drawFlares(); drawNetwork(now / 1000); drawMotes(); drawMarks(); fx.update(dt); sky.material.uniforms.uT.value = now / 1000; { const e = C.onEarth(me) ? 1 : 0; sky.material.uniforms.uEarth.value = e; scene.fog.density = e ? 0.024 : 0.016; }
  if (buildPick) { const s = buildSpot(); ghost.visible = true; ghost.position.set(s.x, g.land(s.x, s.z) + 0.05, s.z); } else ghost.visible = false;
  kick += -kick * Math.min(1, dt * 10); if ((hitT -= dt) <= 0) $('hit').className = '';
  camera.position.set(me.x, me.y + 1.62, me.z); camera.rotation.set(me.pitch + kick * 0.035, me.yaw, 0, 'YXZ'); camera.fov = 78 - 22 * ads; camera.updateProjectionMatrix();
  const driving = g.car && C.seatOf(g, me.id) === 0;   // (the driver sees the truck from behind; the mouse swings the view around it)
  if (driving) { const c = g.car, cy = g.land(c.x, c.z), back = 8.5, up = 3.2 - Math.max(-0.6, Math.min(0.8, me.pitch)) * 3;
    camera.position.set(c.x + Math.sin(me.yaw) * back, cy + up, c.z + Math.cos(me.yaw) * back); camera.lookAt(c.x, cy + 1.6, c.z); }
  sound.listen(me.x, me.y + 1.62, me.z, -Math.sin(me.yaw), 0, -Math.cos(me.yaw));
  for (const k in held) held[k].visible = false; const gm = held[gunKey];
  if (gm && !me.ember) { gm.visible = true; const u = gm.userData, a = ads * ads * (3 - 2 * ads), r = reloadT > 0 ? Math.sin(Math.PI * Math.min(1, 1 - reloadT / (GUNS[gunKey].reload * reloadSpeed(gunKey)))) : 0;
    gm.position.set(0.15 * (1 - a), -0.15 + (-u.top - 0.006 + 0.15) * a - r * 0.1, (-0.16 - u.len * 0.42) * (1 - a) + (-0.3 - u.len * 0.5) * a + kick * 0.035 * (1 - a * 0.6)); gm.rotation.set(-r * 0.3 + kick * 0.05 * (1 - a * 0.7), 0.04 * (1 - a), r * 0.45); }
  drawFriends(dt); sync(dt); if (camp) camp.update(dt); wrist.update(dt); { const k = Math.max(0, 1 - C.lightAt(g, me.x, me.z, true) * 3) * 0.85; if (Math.abs(k - (frame.muf ?? -1)) > 0.03) { frame.muf = k; sound.muffle(k); } }   /* (sound is sharp only in light: out in the dark the world goes muffled. INNOVATION.md idea 9) */ if (guide) guide.update(dt); if (truck) truck.update(g); hudLook.update(dt, me, g, C, () => { const am = ammo[gunKey]; return am.mag + '/' + am.res + gunKey + (reloadT > 0); });
  const free = !locked() && !panel; if (clickPlay.hidden === free) clickPlay.hidden = !free;
  amb.update(dt, camera, { x: g.fire.x, y: g.land(g.fire.x, g.fire.z), z: g.fire.z }, C.lightAt(g, me.x, me.z), g.fire.fuel > 0); embers(dt); farLights(dt);
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
  const p = C.addPlayer(g, id, `${style.name}, learned`); p.bot = true; p.style = style; p.r = C.stream(g.seed, 'friend-' + id); const a = n * 2.4 + 1; p.homeX = g.fire.x + Math.cos(a) * Math.min(6, style.roam); p.homeZ = g.fire.z + Math.sin(a) * Math.min(6, style.roam);
  return pick ? `${style.name}, learned from ${(g.history || []).length} recorded nights, is at your fire.` : 'No nights recorded yet, so this one plays like a careful newcomer. After a few nights it plays like you.';
}
const fvoice = new FriendVoice((who, line) => wrist.say(line, Math.min(8, 3 + line.length / 18), 'heard  ·  ' + who));
function friendHeard(e) {   // (what a learned friend says, from what really happened)
  const bots = g.players.filter(p => p.bot && !p.ember); if (!bots.length) return; const by = id => bots.find(p => p.id === id);
  if (e[1] === 'kill' && by(e[3])) fvoice.speak(by(e[3]), 'kill'); else if (e[1] === 'bank' && by(e[2])) fvoice.speak(by(e[2]), 'bank');
  else if (e[1] === 'dusk') fvoice.speak(bots[0], 'dusk'); else if (e[1] === 'fall' && e[2] === me.id) fvoice.speak(bots[0], 'youFell');
}
function runFriends(dt) { fvoice.update(g.players, dt); for (const p of g.players) if (p.bot && !p.ember && p.hp < (p.hp0 ?? 100) - 8) fvoice.speak(p, 'hurt'); for (const p of g.players) if (p.bot) p.hp0 = p.hp; for (const p of g.players) if (p.bot && !p.ember) { const shot = friendThink(g, p, p.r, dt); if (shot) { const from = new THREE.Vector3(p.x, p.y + 1.5, p.z); sound.shot('pistol', from); fx.tracer(from, new THREE.Vector3(shot.x, shot.y, shot.z)); } } }
const DEV = [
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
$('devBody').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || !isHost()) return; const msg = DEV[+b.dataset.i][2](); $('dev').hidden = true; panel = null; $('paused').hidden = true; renderer.domElement.requestPointerLock(); say(msg, 3); });
$('openDev').onclick = () => { $('paused').hidden = true; $('dev').hidden = false; panel = 'dev'; drawDev(); };
$('devBack').onclick = () => { $('dev').hidden = true; $('paused').hidden = false; panel = 'pause'; };
$('openList').onclick = async () => { $('paused').hidden = true; $('list').hidden = false; panel = 'list';
  try { const d = await (await fetch('./checklist.json?t=' + Date.now())).json(), label = { done: 'DONE', in: 'IN', next: 'NEXT', later: 'LATER', talk: 'TALK' };
    const order = ['next', 'in', 'talk', 'later', 'done'];
    $('listBody').innerHTML = `<p class="note" style="margin:0 0 10px">${d.about.replace(/[<&>]/g, '')}</p>` + d.items.slice().sort((a, b) => order.indexOf(a.s) - order.indexOf(b.s)).map(it => `<div class="ck"><b class="${it.s}">${label[it.s] || it.s}</b><span>${String(it.idea).replace(/[<&>]/g, '')}<small>${String(it.where || '').replace(/[<&>]/g, '')}</small></span></div>`).join(''); }
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
async function checkUpdate() { try { const v = await (await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' })).json(); if (v && v.v > BUILD && v.v !== updSeen) { updSeen = v.v; $('updNote').textContent = String(v.notes || '').slice(0, 200); $('upd').hidden = false; } } catch (e) {} }
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
      if (C.seatOf(g, p.id) >= 0) { p.drive = fin(m.th) && fin(m.st) ? { th: Math.max(-1, Math.min(1, m.th)), st: Math.max(-1, Math.min(1, m.st)) } : null; p.yaw = m.yaw; p.pitch = Math.max(-1.6, Math.min(1.6, m.pi)); return; }   /* (riding: the truck moves them; only their keys count) */
      if (!p.ember && Math.hypot(m.x - p.x, m.z - p.z) < Math.max(1.5, 11 * dt)) { p.x = m.x; p.z = m.z; p.y = m.y; } else if (!p.ember) p.tp = (p.tp || 0) + 1;   /* (too far, too fast: snap them back to the last good spot, so a lag spike can never strand anyone) */ p.yaw = m.yaw; p.pitch = Math.max(-1.6, Math.min(1.6, m.pi)); p.gun = GUNS[m.g] ? m.g : 'pistol'; const nm = String(m.n || '').replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) || 'Friend'; if (p.name !== nm) { p.name = nm; if (!p.kept && g.keep[nm] > 0) { p.carried += g.keep[nm]; p.kept = true; } } return;
    }
    if (m.t === 'shot') {   // (the host traces it in its own world with the gun's own damage, no faster than the gun fires)
      const G = GUNS[m.g]; if (!G || p.ember || !Array.isArray(m.o) || !Array.isArray(m.d) || ![...m.o, ...m.d].every(fin) || Math.hypot(m.o[0] - p.x, m.o[2] - p.z) > 3 || !bucket(p, 'shots', G.rpm / 60 + 1, 4)) return;
      const dirs = (Array.isArray(m.ds) ? m.ds : [m.d]).slice(0, G.pellets || 1).filter(d => Array.isArray(d) && d.length === 3 && d.every(fin));
      dirs.forEach((d, n) => { const L = Math.hypot(d[0], d[1], d[2]); if (L < 0.5) return; if (n === 0) C.fired(g, p, m.o[0], m.o[2], d[0] / L, d[2] / L); const h = C.hitRay(g, m.o[0], m.o[1], m.o[2], d[0] / L, d[1] / L, d[2] / L, 80);
        if (h) { const r = C.damage(g, h.k, h.part, G.dmg * (h.mult > 1 ? G.head : 1), G.ap, p.id); net.sendTo(from, { t: 'hit', r: { kill: !!r.kill, shell: !!r.shell, broke: !!r.broke, head: h.mult > 1 } }); } }); return;
    }
    if (m.t === 'build') { if (!bucket(p, 'builds', 1, 3)) return; if (m.k === 'grow') C.grow(g, p); else if (m.k === 'drop') C.drop(g, p, C.SITES[m.s] ? m.s : 'city'); else if (m.k === 'rise') C.rise(g, p); else if (m.k === 'fit') C.fit(g, p); else if (m.k === 'car') C.useCar(g, p); else if (m.k === 'seat') C.nextSeat(g, p); else if (m.k === 'flare' && fin(m.x) && fin(m.z)) C.throwFlare(g, p, m.x, m.z); else build(p, m.k, m.x, m.z); return; }
    if (m.t === 'bang') { if (!GUNS[m.g] || ![m.x, m.y, m.z].every(fin) || Math.hypot(m.x - p.x, m.z - p.z) > 4 || !bucket(p, 'bangs', 14, 20)) return; heardShot(m); net.relay(m, from); return; }
    return;
  }
  // a friend's side: only the host's word counts
  if (from !== 0) { if (m.t === 'bang' && GUNS[m.g] && [m.x, m.y, m.z].every(fin)) heardShot(m); return; }
  if (m.t === 'hello') { if (!fin(m.seed)) return; net.me = m.you; SET.lastJoin = net.code; save(); begin(m.seed, m.you).then(() => {}); for (const n of m.nodes || []) if (Array.isArray(n) && C.NODE[n[1]]) g.nodes.push({ id: n[0], kind: n[1], x: n[2], z: n[3], hp: n[4], lit: false }); C.linkNetwork(g); if (Array.isArray(m.fire)) [g.fire.level, g.fire.light, g.fire.fuel] = m.fire; g.clock = m.clock; g.night = m.night; return; }
  if (!g) return;
  if (m.t === 's') applyState(m);
  if (m.t === 'ev' && Array.isArray(m.e)) for (const e of m.e.slice(0, 20)) if (Array.isArray(e)) inbox.push(e);
  if (m.t === 'hit' && m.r) showHit(m.r, !!m.r.head);
  if (m.t === 'bang' && GUNS[m.g] && [m.x, m.y, m.z].every(fin)) heardShot(m);
  if (m.t === 'bye' && m.why === 'update') { try { sessionStorage.setItem('lastfire2-resume', JSON.stringify({ join: true, code: net.code, name: SET.name, at: Date.now() })); } catch (e) {} say('The host is updating. You will be right back.', 4); setTimeout(() => location.reload(), 1200); return; }
  if (m.t === 'bye') say({ full: `That room is full (${MAX_PLAYERS} players).`, locked: 'The host locked that room.', kicked: 'The host removed you.' }[m.why] || 'The host closed the game.', 8);
  if (m.t === 'left' && from === 0) say('The host left: the world went with them.', 8);
}
function heardShot(m) { const o = new THREE.Vector3(m.x, m.y, m.z); sound.shot(m.g, o); if (Array.isArray(m.e) && m.e.length === 3 && m.e.every(fin)) { const e = new THREE.Vector3(...m.e); fx.tracer(o, e); fx.spark(e); } }
let sendT = 0, stateT = 0, sentMarks = -1;
function sync(dt) {
  if (!net || !net.live) return; sendT += dt; stateT += dt;
  if (!net.host && sendT >= 1 / 15) { sendT = 0; net.send({ t: 'in', x: +me.x.toFixed(2), y: +me.y.toFixed(2), z: +me.z.toFixed(2), yaw: +me.yaw.toFixed(3), pi: +me.pitch.toFixed(2), g: gunKey, n: SET.name, ...(me.drive ? { th: me.drive.th, st: me.drive.st } : {}) }); }
  if (net.host) me.gun = gunKey;
  if (net.host && stateT >= 1 / 12) { stateT = 0; net.send({ t: 's', c: +g.clock.toFixed(5), n: g.night,
    f: [g.fire.level, Math.floor(g.fire.light), Math.round(g.fire.fuel)],
    p: g.players.map(p => [p.id, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(2), +(p.pitch || 0).toFixed(2), Math.round(p.hp), Math.floor(p.carried), p.ember ? 1 : 0, p.gun || 'pistol', p.tp || 0, p.name]),
    h: g.hollow.flatMap(k => [k.id, KIND_I.indexOf(k.kind), +k.x.toFixed(2), +k.y.toFixed(2), +k.z.toFixed(2), +k.yaw.toFixed(2)]),
    m: g.motes.slice(0, 300).flatMap(q => [+q.x.toFixed(1), +q.z.toFixed(1)]),
    nd: g.nodes.map(n => [n.id, n.kind, +n.x.toFixed(2), +n.z.toFixed(2), Math.round(n.hp), n.lit ? 1 : 0, n.who || '', n.n || 0]),
    em: g.embers.map(e => [e.id, e.of, +e.x.toFixed(1), +e.z.toFixed(1), e.held || 0]), e: g.earth ? +g.earth.t.toFixed(1) : -1, pt: g.parts.map(q => [q.id, q.kind, +q.x.toFixed(1), +q.z.toFixed(1)]), st: g.stash, tr: g.truck, pk: g.players.map(p => [p.id, p.pack || []]), fl: (g.flares || []).map(f => [+f.x.toFixed(2), +f.z.toFixed(2), +f.t.toFixed(1), f.earth ? 1 : 0]), th: g.theories || null, du: g.dues || {}, cl: [g.lost || [], g.out ? g.out.who : ''], car: g.car ? [+g.car.x.toFixed(2), +g.car.z.toFixed(2), +g.car.yaw.toFixed(3), +g.car.v.toFixed(2), g.car.seats, g.car.store] : 0, ...(g.marks.length !== sentMarks ? { mk: g.marks.slice(-MARKS).map(m => [m.k === 'fall' ? 1 : 0, m.x, m.z, m.who || '', m.n || 0]) } : {}) }); sentMarks = g.marks.length; }
}
function applyState(m) {   // (a friend's copy of the world, from the host; their own position stays their own unless the host moved them)
  if (fin(m.c)) g.clock = m.c; if (Number.isInteger(m.n)) g.night = m.n; if (Array.isArray(m.f) && m.f.every(fin)) [g.fire.level, g.fire.light, g.fire.fuel] = m.f;
  if (Array.isArray(m.p)) { const ps = []; for (const a of m.p.slice(0, MAX_PLAYERS)) { if (!Array.isArray(a) || !a.slice(0, 9).every(fin)) continue; const [id, x, y, z, yaw, pitch, hp, carried, ember, gun, tp, name] = a;
      let q = g.players.find(o => o.id === id) || { id, isPlayer: true }; if (id === myId) { q = me; if ((q.tp || 0) !== tp) { q.x = x; q.y = y; q.z = z; q.tp = tp; } } else Object.assign(q, { tx: x, ty: y, tz: z, yaw, pitch, gun: GUNS[gun] ? gun : 'pistol', name: String(name || 'Friend').replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) });
      if (q.x === undefined) { q.x = x; q.y = y; q.z = z; } q.hp = hp; q.carried = carried; q.ember = !!ember; ps.push(q); } g.players = ps; }
  if (Array.isArray(m.h) && m.h.length <= C.MAX_HOLLOW * 6) { const old = new Map(g.hollow.map(k => [k.id, k])), hs = []; for (let i = 0; i + 5 < m.h.length; i += 6) { const [id, ki, x, y, z, yaw] = m.h.slice(i, i + 6); if (![id, ki, x, y, z, yaw].every(fin) || !KIND_I[ki]) continue; const k = old.get(id) || { id, kind: KIND_I[ki], x, y, z, yaw, sh: 0, sb: 0 }; Object.assign(k, { tx: x, ty: y, tz: z, tyaw: yaw }); hs.push(k); } g.hollow = hs; }
  if (Array.isArray(m.m)) { g.motes = []; for (let i = 0; i + 1 < m.m.length && i < 600; i += 2) if (fin(m.m[i]) && fin(m.m[i + 1])) g.motes.push({ x: m.m[i], z: m.m[i + 1] }); }
  if (Array.isArray(m.nd)) g.nodes = m.nd.filter(a => Array.isArray(a) && C.NODE[a[1]]).slice(0, 400).map(a => ({ id: a[0], kind: a[1], x: a[2], z: a[3], hp: a[4], lit: !!a[5], who: typeof a[6] === 'string' ? a[6].replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) : '', n: a[7] | 0 }));
  if (Array.isArray(m.mk)) g.marks = m.mk.filter(a => Array.isArray(a) && [a[0], a[1], a[2]].every(fin)).slice(-MARKS).map(a => ({ k: a[0] ? 'fall' : 'wreck', x: a[1], z: a[2], who: typeof a[3] === 'string' ? a[3].replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) : '', n: a[4] | 0 }));
  if (fin(m.e)) g.earth = m.e >= 0 ? { t: m.e } : null;
  if (Array.isArray(m.fl)) g.flares = m.fl.filter(a => Array.isArray(a) && a.every(fin)).slice(0, 12).map(a => ({ x: a[0], z: a[1], t: a[2], earth: !!a[3] }));
  if (m.th && typeof m.th === 'object' && Object.keys(C.THEORIES).every(k => fin(m.th[k]))) { g.theories = {}; for (const k of Object.keys(C.THEORIES)) g.theories[k] = Math.max(0, Math.min(0.85, m.th[k])); }
  if (m.du && typeof m.du === 'object') { const d = {}; for (const [k, v] of Object.entries(m.du).slice(0, 32)) if (k.length <= 24 && fin(v)) d[k] = v; g.dues = d; }
  if (Array.isArray(m.cl) && Array.isArray(m.cl[0])) { g.lost = m.cl[0].filter(w => C.CAMP_OUT.includes(w)); g.out = C.CAMP_OUT.includes(m.cl[1]) ? { who: m.cl[1] } : null; }
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
const flareViews = new Map(), flareMat = new THREE.MeshBasicMaterial({ color: 0xffd8f6 });
function drawFlares() { const live = new Set(); (g.flares || []).forEach((f, i) => { const key = f.x.toFixed(1) + ',' + f.z.toFixed(1); live.add(key); let o = flareViews.get(key); if (!o) { o = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), flareMat); o.position.set(f.x, g.land(f.x, f.z) + 0.16, f.z); scene.add(o); flareViews.set(key, o); } o.scale.setScalar(0.8 + Math.random() * 0.5); });   // (it sputters)
  for (const [k, o] of flareViews) if (!live.has(k)) { scene.remove(o); flareViews.delete(k); } }
function drawTraces() { const ts = g.traces || [], key = ts.map(t => t.of + ':' + t.x + ':' + Math.ceil(t.t / 10)).join('|'); if (key === traceKey) return; traceKey = key; const v = [];
  for (const t of ts) { const y = (x, z) => g.land(x, z) + 0.08; for (let i = 1; i < t.pts.length; i++) v.push(t.pts[i - 1][0], y(t.pts[i - 1][0], t.pts[i - 1][1]), t.pts[i - 1][1], t.pts[i][0], y(t.pts[i][0], t.pts[i][1]), t.pts[i][1]); v.push(t.fx, y(t.fx, t.fz) + 1.2, t.fz, t.x, y(t.x, t.z) + 0.3, t.z); }
  traceGeo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); }
const dirName = (dx, dz) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round((((Math.atan2(-dx, -dz) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * 8) % 8];
const emberMat = new THREE.MeshBasicMaterial({ color: 0xbfe0ff }), emberGeo = new THREE.OctahedronGeometry(0.25), emberViews = new Map();
function drawFriends(dt) {
  const live = new Set(), f = Math.min(1, dt * 12);
  if (!isHost()) for (const k of g.hollow) if (k.tx !== undefined) { k.x += (k.tx - k.x) * f; k.y += (k.ty - k.y) * f; k.z += (k.tz - k.z) * f; let d = k.tyaw - k.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); k.yaw += d * f; }
  for (const p of g.players) {
    if (p === me) continue; live.add(p.id); let v = friendViews.get(p.id);
    if (!v && models.soldier) { models.soldier.scene.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(models.soldier.scene), o = skClone(models.soldier.scene); o.scale.setScalar(1.8 / b.getSize(new THREE.Vector3()).y); const mix = new THREE.AnimationMixer(o), A = n => { const c = models.soldier.animations.find(a => a.name.endsWith('|' + n) || a.name === n); return c ? mix.clipAction(c) : null; };
      v = { o, mix, run: A('Run'), idle: A('Idle_Gun'), mark: Object.assign(document.createElement('div'), { className: 'mark' }), px: p.x, pz: p.z }; v.idle?.play(); scene.add(o); $('hud').append(v.mark); friendViews.set(p.id, v); }
    if (!v) continue;
    if (p.tx !== undefined) { p.x += (p.tx - p.x) * f; p.y += (p.ty - p.y) * f; p.z += (p.tz - p.z) * f; }
    const speed = Math.hypot(p.x - v.px, p.z - v.pz) / Math.max(dt, 0.001); v.px = p.x; v.pz = p.z;
    const running = speed > 1.2; if (running !== v.running) { v.running = running; const a = running ? v.run : v.idle, b = running ? v.idle : v.run; if (a) { a.reset().fadeIn(0.15).play(); } if (b) b.fadeOut(0.15); }
    v.mix.update(dt); v.o.visible = !p.ember; v.o.position.set(p.x, p.y, p.z); v.o.rotation.y = (p.yaw || 0) + Math.PI;
    _v.set(p.x, p.y + 2.2, p.z).project(camera); const vis = _v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1;
    v.mark.hidden = !vis; if (vis) { v.mark.style.transform = `translate(${(_v.x * 0.5 + 0.5) * innerWidth}px, ${(-_v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`; const t = `${p.name || 'Friend'}  ${Math.round(Math.hypot(p.x - me.x, p.z - me.z))} m${p.ember ? '  EMBER: carry it to the fire' : ''}`; if (v.mark.textContent !== t) v.mark.textContent = t; v.mark.classList.toggle('down', !!p.ember); }
  }
  for (const [id, v] of friendViews) if (!live.has(id)) { scene.remove(v.o); v.mark.remove(); friendViews.delete(id); }
  const el = new Set(); for (const e of g.embers) { el.add(e.id); let o = emberViews.get(e.id); if (!o) { o = new THREE.Mesh(emberGeo, emberMat); scene.add(o); emberViews.set(e.id, o); } o.position.set(e.x, g.land(e.x, e.z) + (e.held ? 1.3 : 0.4), e.z); o.rotation.y = performance.now() / 500; }
  for (const [id, o] of emberViews) if (!el.has(id)) { scene.remove(o); emberViews.delete(id); }
}
// ---------------------------------------------------------------- start
$('name').value = SET.name || '';
function myName() { SET.name = ($('name').value || 'Player').replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) || 'Player'; save(); return SET.name; }
async function begin(seed, id, saved = null) {
  g = saved || C.newGame(seed); if (!saved) g.clock = 0.3; me = C.addPlayer(g, id, SET.name); if (saved && g.startAt) { me.x = g.startAt[0]; me.z = g.startAt[1]; } me.y = g.land(me.x, me.z); myId = id;
  if (!saved && id === 1) { Camp.startAt(me, g.land); setTimeout(() => say('Your old desk. The form you signed, and the number you cannot unsee.', 7), 2500); }   // (a new world opens at your desk: LORE.md, the first minute)
  if (!camp) camp = new Camp(scene, { theories: C.THEORIES, stakes: () => stakeScore(), g: () => g, me: () => me, land: (x, z) => g.land(x, z), say, hear: (who, line) => wrist.say(line, Math.min(9, 3 + line.length / 18), 'heard  ·  ' + who), name: () => SET.name, camera: () => camera });
  if (!sitesBuilt) { sitesBuilt = true; buildSites(scene, (x, z) => g.land(x, z)); truck = new Truck(scene, (x, z) => g.land(x, z)); }
  if (!guide) guide = new Guide(scene, { g: () => g, me: () => me, land: (x, z) => g.land(x, z), board: () => BOARD, checked: () => camp.checkedNight === g.night, phase: () => C.phase(g.clock), fireRadius: () => C.fireRadius(g.fire), isHost,
    speak: (r, l, s) => camp.speak(r, l, s), bringDusk: () => { if (isHost() && C.phase(g.clock) === 'day') g.clock = C.DUSK_AT - 0.002; }, done: () => !!SET.guided, setDone: () => { SET.guided = 1; save(); },
    stage: () => { if (!isHost()) return; const f = g.fire, a = Math.atan2(me.z - f.z, me.x - f.x) + 0.35, r = C.fireRadius(f) + 7, x = f.x + Math.cos(a) * r, z = f.z + Math.sin(a) * r, K = C.KINDS.walker;
      g.hollow.push({ id: g.nextId++, kind: 'walker', x, z, y: g.land(x, z), yaw: 0, hp: K.hp, max: K.hp, sh: 0, sb: 0, cd: 0, dead: false, speed: 1.1, staged: true }); } });
  setTimeout(() => guide.start(), 1200);
  mode = 'play'; $('menu').hidden = true; $('bootLog').hidden = true; $('hud').hidden = false; drawBuild();
  await ready; prepGun('pistol'); prepGun('ar'); prepGun('shotgun'); prepGun('lmg');
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

document.body.classList.add('menu-A'); bootLog();   // (BOOT: his pick of three home screens, 2026-10-19)
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
window.lastfire2 = { get camp() { return camp; }, get g() { return g; }, get me() { return me; }, get net() { return net; }, shoot, renderer };   // (a handle for the automated test)
