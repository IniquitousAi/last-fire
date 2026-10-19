// Last Fire (the new foundation), piece 1: drawing, sound and input around the rules in core/game.js.
// The rules run here as host; nothing in this file decides what happens, only what you see, hear and send in.
import * as THREE from 'three';
import * as C from '../core/game.js?v=13';
import { Camp } from './camp.js?v=13';
import { Net, roomCode, cleanCode, CODE_LEN, MAX_PLAYERS } from './net.js?v=13';
import { sound, GUNS } from '../../src/combat.js?v=13';
import { FX } from '../../src/fx.js?v=13';
import { GLTFLoader } from '../../vendor/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from '../../vendor/jsm/utils/SkeletonUtils.js';

const $ = id => document.getElementById(id);
const BUILD = 13;   // (this copy's version; ./version.json says the newest)
const SET = Object.assign({ sens: 1, vol: 0.8, name: '' }, (() => { try { return JSON.parse(localStorage.getItem('lastfire2') || '{}'); } catch (e) { return {}; } })());
const save = () => { try { localStorage.setItem('lastfire2', JSON.stringify(SET)); } catch (e) {} };
sound.setVolume(SET.vol);

// ---------------------------------------------------------------- renderer and the sky (always the dark: awe overhead, the light is yours)
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, 0.05, 900);
scene.fog = new THREE.FogExp2(0x04060c, 0.016); scene.background = new THREE.Color(0x02030a);
scene.add(new THREE.HemisphereLight(0x5a6fb0, 0x020306, 0.09));   // (barely any moonlight: the dark is dark, the light is yours)
const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uT: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec3 vD; uniform float uT;
    float h(vec3 p){ p = fract(p * 0.3183 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float n(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
    void main(){
      vec3 d = normalize(vD); float up = clamp(d.y, -0.2, 1.0);
      vec3 col = mix(vec3(0.006, 0.008, 0.02), vec3(0.0, 0.0, 0.004), up);
      float neb = fbm(d * 2.6 + vec3(0.0, uT * 0.004, 0.0)), band = exp(-pow((d.y - 0.25 + 0.3 * d.x) * 2.6, 2.0));
      col += band * (vec3(0.05, 0.03, 0.14) * smoothstep(0.35, 0.8, neb) + vec3(0.0, 0.05, 0.09) * smoothstep(0.5, 0.9, fbm(d * 5.0 + 3.0)) + vec3(0.09, 0.01, 0.06) * smoothstep(0.62, 0.95, fbm(d * 3.3 - 7.0)));
      float st = h(floor(d * 420.0)); col += vec3(0.85, 0.9, 1.0) * step(0.9975, st) * (0.5 + 0.5 * h(floor(d * 420.0) + 7.0)) * smoothstep(-0.05, 0.2, d.y);
      vec3 eye = normalize(vec3(0.6, 0.18, -0.78)); float a = acos(clamp(dot(d, eye), -1.0, 1.0));   // (the thing past the dark: a black disc in a thin ring of light, low in the sky)
      col = mix(col, vec3(0.0), smoothstep(0.105, 0.1, a)); col += vec3(0.45, 0.55, 1.0) * exp(-pow((a - 0.108) * 160.0, 2.0)) * 0.9 + vec3(0.6, 0.2, 0.8) * exp(-pow((a - 0.13) * 40.0, 2.0)) * 0.12;
      gl_FragColor = vec4(col, 1.0);
    }` }));
scene.add(sky);

// ---------------------------------------------------------------- the game (rules) and you
let camp = null, g = null, me = null, mode = 'menu', panel = null, fx = new FX(scene), net = null, myId = 1;
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
    .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 0.7 + gn(vW * 1.7) * 0.35 + gn(vW * 7.0) * 0.18;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float L = 0.0; for (int i = 0; i < ${NODE_MAX}; i++) { vec4 q = uLights[i]; if (q.z <= 0.0) continue; float d = length(vW.xz - q.xy) / q.z; L += q.w * (1.0 - smoothstep(0.0, 1.0, d)) * (1.0 - min(d, 1.0) * 0.4); /* edges in order: a reversed smoothstep is undefined on some cards */ }
      totalEmissiveRadiance += diffuseColor.rgb * vec3(0.75, 0.85, 1.25) * min(L, 1.6) * 1.15;`);
};
function buildTile(tx, tz, res = RES) {
  const geo = new THREE.PlaneGeometry(TILE, TILE, res - 1, res - 1); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + tx * TILE, z = pos.getZ(i) + tz * TILE, y = g.land(x, z); pos.setY(i, y);
    const far = Math.min(1, Math.hypot(x, z) / 1500), slope = Math.min(1, Math.abs(g.land(x + 1, z) - y) + Math.abs(g.land(x, z + 1) - y));
    const base = [0.2 + slope * 0.1, 0.22 + slope * 0.1, 0.27 + slope * 0.08];   // (cold ash and stone; far land drifts toward violet)
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
const ready = Promise.all([load('wraith', 'c/wraith.glb'), load('clawed', 'c/clawed.glb'), load('shard', 'c/shard.glb'), load('pistol', 'm/pistol.glb'), load('ar', 'm/ar.glb'), load('campfire', 'kit/campfire.glb'), load('lantern', 'm/lantern.glb'), load('soldier', 'c/soldier.glb')]);
function darken(root, eyes) {   // (the wraiths are drawn as shadow: near black, pale where their eyes are)
  root.traverse(o => { if (!o.isMesh) return; o.frustumCulled = false; const m = o.material = o.material.clone(); if (/Eye_White|Secondary/.test(m.name)) { m.color.setHex(eyes); m.emissive = new THREE.Color(eyes); m.emissiveIntensity = 2.4; } else { m.color.setHex(0x0b0b14); m.emissive = new THREE.Color(0x10142a); m.emissiveIntensity = 0.35; m.roughness = 0.9; } /* (a faint cold rim so a shape reads against the dark) */ });
}

// ---------------------------------------------------------------- the Hollow as you see them: a pool of animated wraiths, one per Hollow
const seen = new Map();
const LOOK = { walker: ['wraith', 1.6, 0xc8d4ff], runner: ['clawed', 1.0, 0xd8c8ff], giant: ['wraith', 3.4, 0xff5577] };
function drawHollow(dt) {
  const alive = new Set();
  for (const k of g.hollow) {
    alive.add(k.id); let v = seen.get(k.id);
    if (!v) {
      if (k.kind === 'shard') { const src = models.shard; if (!src) continue; const o = src.scene.clone(); const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()); o.scale.setScalar(1.3 / Math.max(s.x, s.y, s.z)); o.traverse(q => { if (q.isMesh) { q.material = q.material.clone(); q.material.emissive = new THREE.Color(0x9fb6ff); q.material.emissiveIntensity = 0.5; } }); v = { o }; }
      else { const [mk, size, eyes] = LOOK[k.kind], src = models[mk]; if (!src) continue; const o = skClone(src.scene); darken(o, eyes); const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()); o.scale.setScalar(size * 1.6 / s.y);
        const mix = new THREE.AnimationMixer(o), A = n => { const c = src.animations.find(a => a.name.endsWith(n)); return c ? mix.clipAction(c) : null; }; v = { o, mix, fly: A('Fast_Flying'), idle: A('Flying_Idle'), hit: A('Punch'), death: A('Death') }; (v.fly || v.idle)?.play(); }
      scene.add(v.o); seen.set(k.id, v);
    }
    const tgt = k.y + (k.kind === 'shard' ? 2.6 : 0.2); v.o.position.set(k.x, tgt, k.z); v.o.rotation.y = k.yaw;   // (no bob: they hold their height; the animation does the moving)
    if (k.kind === 'shard') v.o.rotation.y += performance.now() / 900; if (v.mix) v.mix.update(dt * (k.kind === 'runner' ? 1.6 : 1));
  }
  for (const [id, v] of seen) if (!alive.has(id)) { scene.remove(v.o); seen.delete(id); }
}

// ---------------------------------------------------------------- the fire and the network's nodes
const fireLight = new THREE.PointLight(0x9fc0ff, 0, 30, 1.6); scene.add(fireLight);
let fireObj = null; const nodeObjs = new Map(), linkLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x9fb8ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(linkLines);
function drawNetwork(t) {
  const f = g.fire;
  if (!fireObj && models.campfire) { fireObj = models.campfire.scene.clone(); const b = new THREE.Box3().setFromObject(fireObj); fireObj.scale.setScalar(1.6 / b.getSize(new THREE.Vector3()).x); fireObj.position.set(f.x, g.land(f.x, f.z), f.z); scene.add(fireObj);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 10), new THREE.MeshBasicMaterial({ color: 0xa8ccff })); flame.position.set(f.x, g.land(f.x, f.z) + 0.6, f.z); scene.add(flame); fireObj.userData.flame = flame; }
  const lit = f.fuel > 0; fireLight.position.set(f.x, g.land(f.x, f.z) + 1.5, f.z); fireLight.intensity = lit ? 26 * (0.94 + Math.sin(t * 11) * 0.04) : 2; fireLight.distance = C.fireRadius(f) * 2.2;
  if (fireObj) fireObj.userData.flame.scale.setScalar(lit ? 0.8 + f.level * 0.15 : 0.3);
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
  const arr = uLights.value; arr[0].set(f.x, f.z, lit ? C.fireRadius(f) : 3, lit ? 1 : 0.3); arr[1].set(me.x, me.z, C.glowOf(g, me), 0.55);
  const near = g.nodes.filter(n => n.lit && lit).sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z));
  for (let i = 2; i < NODE_MAX; i++) { const n = near[i - 2]; if (n) arr[i].set(n.x, n.z, C.NODE[n.kind].r, 0.9); else arr[i].set(0, 0, 0, 0); }
}
// marks: what the world remembers, drawn as scars on the ground (one draw call)
const MARKS = 600, markMesh = new THREE.InstancedMesh(new THREE.RingGeometry(0.35, 0.75, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }), MARKS);
markMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MARKS * 3), 3); markMesh.count = 0; markMesh.frustumCulled = false; scene.add(markMesh);
let marksDrawn = -1; const _m = new THREE.Matrix4(), _c = new THREE.Color();
function drawMarks() { if (g.marks.length === marksDrawn) return; marksDrawn = g.marks.length; markMesh.count = Math.min(MARKS, g.marks.length);
  g.marks.slice(-MARKS).forEach((m, i) => { _m.makeTranslation(m.x, g.land(m.x, m.z) + 0.04, m.z); markMesh.setMatrixAt(i, _m); markMesh.setColorAt(i, _c.setHex(m.k === 'fall' ? 0xb9a8ff : 0x39407a)); });
  markMesh.instanceMatrix.needsUpdate = true; markMesh.instanceColor.needsUpdate = true; }
// motes of light: a few hundred points in one draw call; they drift toward you when you walk close
const MOTES = 400, motePos = new Float32Array(MOTES * 3), motes = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xbfe0ff, size: 0.35, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
motes.geometry.setAttribute('position', new THREE.BufferAttribute(motePos, 3)); motes.frustumCulled = false; scene.add(motes);
function drawMotes() { let i = 0; for (const m of g.motes) { if (i >= MOTES) break; motePos.set([m.x, g.land(m.x, m.z) + 0.6, m.z], i * 3); i++; } for (; i < MOTES; i++) motePos[i * 3 + 1] = -999; motes.geometry.attributes.position.needsUpdate = true; }

// ---------------------------------------------------------------- what you hold: the gun in its own pass (never through a wall)
const vscene = new THREE.Scene(), vcam = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.01, 10), view = new THREE.Group(); vcam.add(view); vscene.add(vcam);
const vhemi = new THREE.HemisphereLight(0xc8d4f0, 0x1a1c26, 1); vscene.add(vhemi); const vsun = new THREE.DirectionalLight(0xffffff, 0.8); vsun.position.set(0.6, 1, 0.8); vscene.add(vsun);
const held = {}; let gunKey = 'pistol', ammo = { pistol: { mag: 8, res: 72 }, ar: { mag: 30, res: 210 } }, reloadT = 0, shotCd = 0, kick = 0, ads = 0;
function prepGun(k) { const src = models[k]; if (!src) return; const inner = src.scene.clone(), holder = new THREE.Group(); inner.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); if (/Wood/.test(o.material.name)) o.material.color.setHex(0x1d1f25); if (/Metal/.test(o.material.name)) { o.material.metalness = 0.25; o.material.color.multiplyScalar(1.35); } } });
  inner.rotation.y = Math.PI / 2; holder.add(inner); let b = new THREE.Box3().setFromObject(holder), s = b.getSize(new THREE.Vector3()); inner.scale.multiplyScalar(({ pistol: 0.24, ar: 0.82 })[k] / s.z); b = new THREE.Box3().setFromObject(holder); const c = b.getCenter(new THREE.Vector3()); inner.position.sub(c);
  b = new THREE.Box3().setFromObject(holder); holder.userData = { len: b.max.z - b.min.z, top: b.max.y, muzzle: new THREE.Vector3(0, b.max.y * 0.35, b.min.z) }; holder.visible = false; view.add(holder); held[k] = holder; }

// ---------------------------------------------------------------- input: click to take the mouse; Esc for the menu
const locked = () => document.pointerLockElement === renderer.domElement;
let buildPick = null;
addEventListener('keydown', e => { if (e.code === 'Tab' && mode === 'play' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); toggleTab(); return; } if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; keys[e.code] = true; if (mode !== 'play' || panel) return;
  if (e.code === 'Digit1') switchGun('pistol'); if (e.code === 'Digit2') switchGun('ar'); if (e.code === 'KeyR') reload(); if (e.code === 'KeyQ') pickBuild(buildPick === 'relay' ? null : 'relay'); if (e.code === 'KeyE') pickBuild(buildPick === 'lamp' ? null : 'lamp'); if (e.code === 'KeyF') tryGrow(); });
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.fill(false); });
renderer.domElement.addEventListener('click', () => { if (mode === 'play' && !panel && !locked()) renderer.domElement.requestPointerLock(); });
addEventListener('mousemove', e => { if (!locked()) return; const k = 0.0022 * SET.sens * (1 - ads * 0.35); me.yaw -= e.movementX * k; me.pitch = Math.max(-1.55, Math.min(1.55, me.pitch - e.movementY * k)); });
addEventListener('mousedown', e => { if (!locked()) return; mouse[e.button] = true; if (e.button === 0 && buildPick) { tryBuild(); mouse[0] = false; } if (e.button === 2 && buildPick) pickBuild(null); });
addEventListener('mouseup', e => mouse[e.button] = false);
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => { if (mode === 'play' && !locked() && !panel) { panel = 'pause'; $('paused').hidden = false; drawPause(); } });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = vcam.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); vcam.updateProjectionMatrix(); });
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
let msgT = 0, duskSnap = null, god = false; function say(t, s = 3) { $('msg').textContent = t; msgT = s; }
const look = () => new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(me.pitch, me.yaw, 0, 'YXZ'));
function switchGun(k) { if (k === gunKey) return; gunKey = k; reloadT = 0; }
function reload() { const G = GUNS[gunKey], a = ammo[gunKey]; if (reloadT > 0 || a.mag >= G.mag || a.res <= 0) return; reloadT = G.reload; sound.magOut(); setTimeout(() => sound.magIn(), G.reload * 700); }
function shoot() {
  const G = GUNS[gunKey], a = ammo[gunKey]; if (shotCd > 0 || reloadT > 0 || me.ember) return;
  if (a.mag <= 0) { sound.click(); reload(); shotCd = 0.3; return; }
  a.mag--; shotCd = 60 / G.rpm; sound.shot(gunKey); kick = Math.min(1, kick + 0.5 + G.recoil * 6);
  const o = new THREE.Vector3(me.x, me.y + 1.62, me.z), d = look(), sp = G.spread * (ads > 0.5 ? 0.3 : 1); d.x += (Math.random() - 0.5) * sp * 2; d.y += (Math.random() - 0.5) * sp * 2; d.z += (Math.random() - 0.5) * sp * 2; d.normalize();
  const h = C.hitRay(g, o.x, o.y, o.z, d.x, d.y, d.z, 80), end = o.clone().addScaledVector(d, h ? h.t : 60), gm = held[gunKey];
  if (gm) { vcam.updateMatrixWorld(true); camera.updateMatrixWorld(true); fx.tracer(camera.localToWorld(gm.localToWorld(gm.userData.muzzle.clone())), end); }
  if (h) { if ((h.part ? h.k.sb : h.k.sh) > 0) fx.spark(end); else fx.ichor(end, h.mult > 1); }
  if (isHost()) { if (h) showHit(C.damage(g, h.k, h.part, G.dmg * (h.mult > 1 ? G.head : 1), G.ap, me.id), h.mult > 1); } else net.send({ t: 'shot', g: gunKey, o: [o.x, o.y, o.z], d: [d.x, d.y, d.z] });
  if (net) net.send({ t: 'bang', g: gunKey, x: +me.x.toFixed(2), y: +(me.y + 1.5).toFixed(2), z: +me.z.toFixed(2), e: [+end.x.toFixed(2), +end.y.toFixed(2), +end.z.toFixed(2)] });
  me.pitch = Math.min(1.55, me.pitch + G.recoil * 0.4); me.yaw += (Math.random() - 0.5) * G.recoil * 0.3;
}
let hitT = 0;
function showHit(r, head) { $('hit').className = r.kill ? 'kill' : r.shell ? 'shell' : 'on'; hitT = r.kill ? 0.25 : 0.12; r.kill ? sound.kill() : r.broke ? sound.shatter() : r.shell ? sound.plate() : sound.hit(head); }
function tryGrow() {   // (growing the fire: your choice, and tonight the dark answers with what the new level wakes)
  if (!C.canGrow(g)) return; if (Math.hypot(me.x - g.fire.x, me.z - g.fire.z) > C.fireRadius(g.fire)) return say('Stand at the fire to grow it.');
  if (isHost()) C.grow(g, me); else net.send({ t: 'build', k: 'grow', x: 0, z: 0 }); }
$('prompt').addEventListener('click', () => tryGrow()); $('prompt').style.pointerEvents = 'auto'; $('prompt').style.cursor = 'pointer';
function pickBuild(k) { buildPick = k; drawBuild(); }
function buildSpot() { const o = new THREE.Vector3(me.x, me.y + 1.62, me.z), d = look(); for (let t = 1; t < 9; t += 0.25) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y <= g.land(x, z)) return { x, z }; } return { x: o.x + d.x * 5, z: o.z + d.z * 5 }; }
const ghost = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x39e6ff, transparent: true, opacity: 0.8, depthTest: false })); ghost.visible = false; scene.add(ghost);
function build(p, kind, x, z) {   // (host only: the player must carry the light, and stand within 9 m of where it goes)
  const K = C.NODE[kind]; if (!K || !Number.isFinite(x) || !Number.isFinite(z) || p.ember || p.carried < K.cost || Math.hypot(p.x - x, p.z - z) > 9) return null;
  p.carried -= K.cost; return C.placeNode(g, kind, x, z, p.id);
}
function tryBuild() { const K = C.NODE[buildPick]; if (me.carried < K.cost) return say(`A ${buildPick} costs ${K.cost} light. You carry ${Math.floor(me.carried)}.`); const s = buildSpot(); sound.buy();
  if (isHost()) { const n = build(me, buildPick, s.x, s.z); if (n) say(n.lit ? `The ${buildPick} takes the light.` : `Too far from the light: the ${buildPick} stays dark. Place it within reach of a lit relay.`, 3); } else net.send({ t: 'build', k: buildPick, x: +s.x.toFixed(2), z: +s.z.toFixed(2) }); }
function drawBuild() { $('build').innerHTML = Object.entries(C.NODE).map(([k, K]) => `<button class="bk${buildPick === k ? ' on' : ''}${me && me.carried < K.cost ? ' off' : ''}" data-k="${k}">${k === 'relay' ? 'RELAY (Q)' : 'LAMP (E)'}<small>${K.cost} light: ${k === 'relay' ? 'carries light on, ' + K.reach + ' m' : 'shines wide, carries nothing'}</small></button>`).join(''); }
$('build').addEventListener('click', e => { const b = e.target.closest('.bk'); if (b) pickBuild(buildPick === b.dataset.k ? null : b.dataset.k); });

// ---------------------------------------------------------------- moving: grounded but sharp (fast to start and stop, real weight on slopes)
const vel = new THREE.Vector2(); let vy = 0, onGround = true;
function move(dt) {
  if (me.ember) return;
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), sprint = (keys.ShiftLeft || keys.ShiftRight) && f > 0 && ads < 0.5;
  const sinY = Math.sin(me.yaw), cosY = Math.cos(me.yaw); let wx = -sinY * f + cosY * s, wz = -cosY * f - sinY * s; const len = Math.hypot(wx, wz) || 1; wx /= len; wz /= len;
  const top = (sprint ? 7.4 : 4.6) * (1 - ads * 0.35) * (f || s ? 1 : 0), acc = onGround ? 14 : 3;   // (about a third of a second to full speed, less to stop)
  vel.x += (wx * top - vel.x) * Math.min(1, acc * dt); vel.y += (wz * top - vel.y) * Math.min(1, acc * dt);
  const nx = me.x + vel.x * dt, nz = me.z + vel.y * dt, rise = g.land(nx, nz) - g.land(me.x, me.z);
  if (rise / Math.max(0.001, Math.hypot(vel.x, vel.y) * dt) < 1.4 || !onGround) { me.x = nx; me.z = nz; }   // (slopes steeper than about 55 degrees stop you)
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
  const [a, b] = PHASE[C.phase(g.clock)]; txt('phase', `<b>${a}</b><small>${b}  ·  night ${g.night}</small>`, true);
  txt('light', `<b>${Math.floor(me.carried)}</b><span>LIGHT CARRIED (bring it to the fire, or build with it)</span>`, true);
  $('hpBar').style.width = Math.max(0, me.hp) + '%';
  const am = ammo[gunKey]; txt('ammo', `<b>${am.mag}</b><span>/ ${am.res}</span><small>${GUNS[gunKey].name}${reloadT > 0 ? '  reloading' : ''}</small>`, true);
  const nearFire = Math.hypot(me.x - f.x, me.z - f.z) < C.fireRadius(f), wakes = C.WAKES[Math.min(f.level + 1, C.WAKES.length - 1)];
  txt('prompt', me.ember ? 'You fell. A friend can carry your Ember to the fire.' : buildPick ? 'Left click to place, right click to cancel' : nearFire && C.canGrow(g) ? `F (or click here): GROW THE FIRE to level ${f.level + 1}${wakes.length ? '. Tonight the dark answers' : ''}` : '');
  if ((msgT -= 1 / 60) <= 0) txt('msg', '');
  if (was.carry !== Math.floor(me.carried / 5)) { was.carry = Math.floor(me.carried / 5); drawBuild(); }
}

// ---------------------------------------------------------------- the frame
let last = performance.now(), fpsN = 0, fpsT = 0;
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (mode !== 'play') { renderer.render(scene, camera); return; }
  const left = updateTiles(); if (!g.ready) { if (left > 0) { $('loading').textContent = `Lighting the fire: ${left} tiles left`; camera.position.set(me.x, me.y + 1.6, me.z); renderer.render(scene, camera); return; } g.ready = true; $('loading').hidden = true; say('The dark has no edge. Gather its light and push it back.', 5); }
  if (!panel) move(dt);
  shotCd = Math.max(0, shotCd - dt); if (reloadT > 0 && (reloadT -= dt) <= 0) { reloadT = 0; const G = GUNS[gunKey], a = ammo[gunKey], n = Math.min(G.mag - a.mag, a.res); a.mag += n; a.res -= n; }
  if (locked() && mouse[0] && !panel && !buildPick && (GUNS[gunKey].auto || !shoot.held)) { shoot(); shoot.held = true; } if (!mouse[0]) shoot.held = false;
  ads += ((mouse[2] && !buildPick && reloadT <= 0 ? 1 : 0) - ads) * Math.min(1, dt * 14);
  if (god) me.hp = 100; const hp0 = me.hp; if (isHost()) C.step(g, dt); else { g.t += dt; g.clock += dt / C.DAY; } if (me.hp < hp0) { $('hurt').style.opacity = Math.min(0.6, (hp0 - me.hp) / 25); setTimeout(() => $('hurt').style.opacity = 0, 160); sound.hurt(); }
  const evs = g.log.splice(0); if (net && net.host && evs.length) net.send({ t: 'ev', e: evs.slice(0, 20) });
  for (const e of [...evs, ...inbox.splice(0)]) { if (e[1] === 'bank') { sound.drop(); say(`+${Math.floor(e[3])} light to the fire.`, 2); } if (e[1] === 'level') { sound.roundEnd(); say(`The fire grows to level ${e[2]}. Tonight the dark will answer.`, 5); } if (e[1] === 'dusk' && isHost()) duskSnap = JSON.stringify(C.saveWorld(g)); if (e[1] === 'dusk') { sound.round(); say(e[3] ? 'It stirs. The fire\'s growth woke something.' : 'It stirs.', 4); } if (e[1] === 'broke') say(`A ${e[2]} was torn down. The light past it went dark.`, 4); if (e[1] === 'allfell') say('Everyone fell. The fire took you back; the light you carried is out there where you dropped it.', 6); }
  drawHollow(dt); drawNetwork(now / 1000); drawMotes(); drawMarks(); fx.update(dt); sky.material.uniforms.uT.value = now / 1000;
  if (buildPick) { const s = buildSpot(); ghost.visible = true; ghost.position.set(s.x, g.land(s.x, s.z) + 0.05, s.z); } else ghost.visible = false;
  kick += -kick * Math.min(1, dt * 10); if ((hitT -= dt) <= 0) $('hit').className = '';
  camera.position.set(me.x, me.y + 1.62, me.z); camera.rotation.set(me.pitch + kick * 0.035, me.yaw, 0, 'YXZ'); camera.fov = 78 - 22 * ads; camera.updateProjectionMatrix();
  sound.listen(me.x, me.y + 1.62, me.z, -Math.sin(me.yaw), 0, -Math.cos(me.yaw));
  for (const k in held) held[k].visible = false; const gm = held[gunKey];
  if (gm && !me.ember) { gm.visible = true; const u = gm.userData, a = ads * ads * (3 - 2 * ads), r = reloadT > 0 ? Math.sin(Math.PI * Math.min(1, 1 - reloadT / GUNS[gunKey].reload)) : 0;
    gm.position.set(0.15 * (1 - a), -0.15 + (-u.top - 0.006 + 0.15) * a - r * 0.1, (-0.16 - u.len * 0.42) * (1 - a) + (-0.3 - u.len * 0.5) * a + kick * 0.035 * (1 - a * 0.6)); gm.rotation.set(-r * 0.3 + kick * 0.05 * (1 - a * 0.7), 0.04 * (1 - a), r * 0.45); }
  drawFriends(dt); sync(dt); if (camp) camp.update(dt);
  hud();
  renderer.render(scene, camera);
  const here = C.lightAt(g, me.x, me.z); vhemi.intensity = 0.35 + 2 * here; vsun.intensity = 0.25 + here; vcam.fov = 54 - 8 * ads; vcam.updateProjectionMatrix();
  renderer.autoClear = false; renderer.clearDepth(); renderer.render(vscene, vcam); renderer.autoClear = true;
  fpsN++; fpsT += dt; if (fpsT > 0.5) { $('fps').textContent = `${Math.round(fpsN / fpsT)} fps`; fpsN = 0; fpsT = 0; }
}
// ---------------------------------------------------------------- DEV: dive in, test one thing, get back to playing (host or alone only: it changes the world)
const DEV = [
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
function closeTab() { stopMic(); $('tabmenu').hidden = true; panel = null; renderer.domElement.requestPointerLock(); }
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
      if (!p.ember && Math.hypot(m.x - p.x, m.z - p.z) < Math.max(1.5, 11 * dt)) { p.x = m.x; p.z = m.z; p.y = m.y; } else if (!p.ember) p.tp = (p.tp || 0) + 1;   /* (too far, too fast: snap them back to the last good spot, so a lag spike can never strand anyone) */ p.yaw = m.yaw; p.pitch = Math.max(-1.6, Math.min(1.6, m.pi)); p.gun = GUNS[m.g] ? m.g : 'pistol'; const nm = String(m.n || '').replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) || 'Friend'; if (p.name !== nm) { p.name = nm; if (!p.kept && g.keep[nm] > 0) { p.carried += g.keep[nm]; p.kept = true; } } return;
    }
    if (m.t === 'shot') {   // (the host traces it in its own world with the gun's own damage, no faster than the gun fires)
      const G = GUNS[m.g]; if (!G || p.ember || !Array.isArray(m.o) || !Array.isArray(m.d) || ![...m.o, ...m.d].every(fin) || Math.hypot(m.o[0] - p.x, m.o[2] - p.z) > 3 || !bucket(p, 'shots', G.rpm / 60 + 1, 4)) return;
      const L = Math.hypot(m.d[0], m.d[1], m.d[2]); if (L < 0.5) return; const h = C.hitRay(g, m.o[0], m.o[1], m.o[2], m.d[0] / L, m.d[1] / L, m.d[2] / L, 80);
      if (h) { const r = C.damage(g, h.k, h.part, G.dmg * (h.mult > 1 ? G.head : 1), G.ap, p.id); net.sendTo(from, { t: 'hit', r: { kill: !!r.kill, shell: !!r.shell, broke: !!r.broke, head: h.mult > 1 } }); } return;
    }
    if (m.t === 'build') { if (!bucket(p, 'builds', 1, 3)) return; if (m.k === 'grow') C.grow(g, p); else build(p, m.k, m.x, m.z); return; }
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
  if (!net.host && sendT >= 1 / 15) { sendT = 0; net.send({ t: 'in', x: +me.x.toFixed(2), y: +me.y.toFixed(2), z: +me.z.toFixed(2), yaw: +me.yaw.toFixed(3), pi: +me.pitch.toFixed(2), g: gunKey, n: SET.name }); }
  if (net.host) me.gun = gunKey;
  if (net.host && stateT >= 1 / 12) { stateT = 0; net.send({ t: 's', c: +g.clock.toFixed(5), n: g.night,
    f: [g.fire.level, Math.floor(g.fire.light), Math.round(g.fire.fuel)],
    p: g.players.map(p => [p.id, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(2), +(p.pitch || 0).toFixed(2), Math.round(p.hp), Math.floor(p.carried), p.ember ? 1 : 0, p.gun || 'pistol', p.tp || 0, p.name]),
    h: g.hollow.flatMap(k => [k.id, KIND_I.indexOf(k.kind), +k.x.toFixed(2), +k.y.toFixed(2), +k.z.toFixed(2), +k.yaw.toFixed(2)]),
    m: g.motes.slice(0, 300).flatMap(q => [+q.x.toFixed(1), +q.z.toFixed(1)]),
    nd: g.nodes.map(n => [n.id, n.kind, +n.x.toFixed(2), +n.z.toFixed(2), Math.round(n.hp), n.lit ? 1 : 0]),
    em: g.embers.map(e => [e.id, e.of, +e.x.toFixed(1), +e.z.toFixed(1), e.held || 0]), ...(g.marks.length !== sentMarks ? { mk: g.marks.slice(-MARKS).map(m => [m.k === 'fall' ? 1 : 0, m.x, m.z]) } : {}) }); sentMarks = g.marks.length; }
}
function applyState(m) {   // (a friend's copy of the world, from the host; their own position stays their own unless the host moved them)
  if (fin(m.c)) g.clock = m.c; if (Number.isInteger(m.n)) g.night = m.n; if (Array.isArray(m.f) && m.f.every(fin)) [g.fire.level, g.fire.light, g.fire.fuel] = m.f;
  if (Array.isArray(m.p)) { const ps = []; for (const a of m.p.slice(0, MAX_PLAYERS)) { if (!Array.isArray(a) || !a.slice(0, 9).every(fin)) continue; const [id, x, y, z, yaw, pitch, hp, carried, ember, gun, tp, name] = a;
      let q = g.players.find(o => o.id === id) || { id, isPlayer: true }; if (id === myId) { q = me; if ((q.tp || 0) !== tp) { q.x = x; q.y = y; q.z = z; q.tp = tp; } } else Object.assign(q, { tx: x, ty: y, tz: z, yaw, pitch, gun: GUNS[gun] ? gun : 'pistol', name: String(name || 'Friend').replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) });
      if (q.x === undefined) { q.x = x; q.y = y; q.z = z; } q.hp = hp; q.carried = carried; q.ember = !!ember; ps.push(q); } g.players = ps; }
  if (Array.isArray(m.h) && m.h.length <= C.MAX_HOLLOW * 6) { const old = new Map(g.hollow.map(k => [k.id, k])), hs = []; for (let i = 0; i + 5 < m.h.length; i += 6) { const [id, ki, x, y, z, yaw] = m.h.slice(i, i + 6); if (![id, ki, x, y, z, yaw].every(fin) || !KIND_I[ki]) continue; const k = old.get(id) || { id, kind: KIND_I[ki], x, y, z, yaw, sh: 0, sb: 0 }; Object.assign(k, { tx: x, ty: y, tz: z, tyaw: yaw }); hs.push(k); } g.hollow = hs; }
  if (Array.isArray(m.m)) { g.motes = []; for (let i = 0; i + 1 < m.m.length && i < 600; i += 2) if (fin(m.m[i]) && fin(m.m[i + 1])) g.motes.push({ x: m.m[i], z: m.m[i + 1] }); }
  if (Array.isArray(m.nd)) g.nodes = m.nd.filter(a => Array.isArray(a) && C.NODE[a[1]]).slice(0, 400).map(a => ({ id: a[0], kind: a[1], x: a[2], z: a[3], hp: a[4], lit: !!a[5] }));
  if (Array.isArray(m.mk)) g.marks = m.mk.filter(a => Array.isArray(a) && a.every(fin)).slice(-MARKS).map(a => ({ k: a[0] ? 'fall' : 'wreck', x: a[1], z: a[2] }));
  if (Array.isArray(m.em)) g.embers = m.em.filter(a => Array.isArray(a) && a.every(fin)).map(a => ({ id: a[0], of: a[1], x: a[2], z: a[3], held: a[4] || null }));
}
// friends as you see them: the CC0 soldier, running or standing, their gun in hand, their name over them; an Ember is a small light on the ground
const friendViews = new Map(), _v = new THREE.Vector3();
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
  if (!camp) camp = new Camp(scene, { g: () => g, me: () => me, land: (x, z) => g.land(x, z), say, name: () => SET.name, camera: () => camera });
  mode = 'play'; $('menu').hidden = true; $('hud').hidden = false; drawBuild(); renderer.domElement.requestPointerLock();
  await ready; prepGun('pistol'); prepGun('ar');
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
  $('worlds').innerHTML = list.map(w => `<button class="key" data-w="${w.id}">CONTINUE<small>(night ${w.night}, fire ${w.level}, ${w.nodes} lights built, saved ${ago(w.at)}: ${net === null ? 'alone, or HOST it below' : ''})</small></button>`).join('');
}
$('worlds').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; myName(); sound.wake(); pendingWorld = b.dataset.w; if ($('asHost').checked) { openRoom(); startWorld(pendingWorld); say(`Your crew's room ${crewCode()} is open.`, 6); } else startWorld(pendingWorld); });
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
