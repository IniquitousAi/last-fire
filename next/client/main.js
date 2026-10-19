// Last Fire (the new foundation), piece 1: drawing, sound and input around the rules in core/game.js.
// The rules run here as host; nothing in this file decides what happens, only what you see, hear and send in.
import * as THREE from 'three';
import * as C from '../core/game.js?v=1';
import { sound, GUNS } from '../../src/combat.js?v=11';
import { FX } from '../../src/fx.js?v=11';
import { GLTFLoader } from '../../vendor/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from '../../vendor/jsm/utils/SkeletonUtils.js';

const $ = id => document.getElementById(id);
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
let g = null, me = null, mode = 'menu', panel = null, fx = new FX(scene);
const keys = {}, mouse = [false, false, false];
const NODE_MAX = 24;   // (the ground shader lights from up to 24 lights at once: the fire, your glow, the nearest nodes)
const uLights = { value: Array.from({ length: NODE_MAX }, () => new THREE.Vector4(0, 0, 0, 0)) };

// ---------------------------------------------------------------- the land: endless, in 32 m tiles built around you as you walk
const TILE = 32, RES = 33, VIEW = 6, tiles = new Map();
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
function buildTile(tx, tz) {
  const geo = new THREE.PlaneGeometry(TILE, TILE, RES - 1, RES - 1); geo.rotateX(-Math.PI / 2);
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
  for (let dz = -VIEW; dz <= VIEW; dz++) for (let dx = -VIEW; dx <= VIEW; dx++) if (dx * dx + dz * dz <= VIEW * VIEW) { const k = (cx + dx) + ',' + (cz + dz); if (!tiles.has(k)) want.push([dx * dx + dz * dz, cx + dx, cz + dz, k]); }
  want.sort((a, b) => a[0] - b[0]); for (const [, x, z, k] of want.slice(0, 2)) tiles.set(k, buildTile(x, z));
  for (const [k, m] of tiles) { const [x, z] = k.split(',').map(Number); if ((x - cx) ** 2 + (z - cz) ** 2 > (VIEW + 1.5) ** 2) { scene.remove(m); m.geometry.dispose(); tiles.delete(k); } }
  return want.length;
}

// ---------------------------------------------------------------- models (every one CC0: assets/CREDITS.txt)
const loader = new GLTFLoader(), models = {};
const load = (k, url) => loader.loadAsync('../assets/' + url).then(r => { models[k] = r; }).catch(e => console.warn('model', k, e));
const ready = Promise.all([load('wraith', 'c/wraith.glb'), load('clawed', 'c/clawed.glb'), load('shard', 'c/shard.glb'), load('pistol', 'm/pistol.glb'), load('ar', 'm/ar.glb'), load('campfire', 'kit/campfire.glb'), load('lantern', 'm/lantern.glb')]);
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
addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; keys[e.code] = true; if (mode !== 'play' || panel) return;
  if (e.code === 'Digit1') switchGun('pistol'); if (e.code === 'Digit2') switchGun('ar'); if (e.code === 'KeyR') reload(); if (e.code === 'KeyQ') pickBuild(buildPick === 'relay' ? null : 'relay'); if (e.code === 'KeyE') pickBuild(buildPick === 'lamp' ? null : 'lamp'); });
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.fill(false); });
renderer.domElement.addEventListener('click', () => { if (mode === 'play' && !panel && !locked()) renderer.domElement.requestPointerLock(); });
addEventListener('mousemove', e => { if (!locked()) return; const k = 0.0022 * SET.sens * (1 - ads * 0.35); me.yaw -= e.movementX * k; me.pitch = Math.max(-1.55, Math.min(1.55, me.pitch - e.movementY * k)); });
addEventListener('mousedown', e => { if (!locked()) return; mouse[e.button] = true; if (e.button === 0 && buildPick) { tryBuild(); mouse[0] = false; } if (e.button === 2 && buildPick) pickBuild(null); });
addEventListener('mouseup', e => mouse[e.button] = false);
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => { if (mode === 'play' && !locked()) { panel = 'pause'; $('paused').hidden = false; drawPause(); } });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = vcam.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); vcam.updateProjectionMatrix(); });
function drawPause() { $('sSens').value = SET.sens; $('vSens').textContent = SET.sens.toFixed(2); $('sVol').value = SET.vol; $('vVol').textContent = Math.round(SET.vol * 100); }
$('sSens').oninput = e => { SET.sens = +e.target.value; $('vSens').textContent = SET.sens.toFixed(2); save(); };
$('sVol').oninput = e => { SET.vol = +e.target.value; sound.setVolume(SET.vol); $('vVol').textContent = Math.round(SET.vol * 100); save(); };
$('resume').onclick = () => { panel = null; $('paused').hidden = true; renderer.domElement.requestPointerLock(); };
$('leave').onclick = () => location.reload();

// ---------------------------------------------------------------- actions
let msgT = 0; function say(t, s = 3) { $('msg').textContent = t; msgT = s; }
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
  if (h) { const head = h.mult > 1, r = C.damage(g, h.k, h.part, G.dmg * (head ? G.head : 1), G.ap, me.id); if (r.shell) fx.spark(end); else fx.ichor(end, head);
    $('hit').className = r.kill ? 'kill' : r.shell ? 'shell' : 'on'; hitT = r.kill ? 0.25 : 0.12; r.kill ? sound.kill() : r.broke ? sound.shatter() : r.shell ? sound.plate() : sound.hit(head); }
  me.pitch = Math.min(1.55, me.pitch + G.recoil * 0.4); me.yaw += (Math.random() - 0.5) * G.recoil * 0.3;
}
let hitT = 0;
function pickBuild(k) { buildPick = k; drawBuild(); }
function buildSpot() { const o = new THREE.Vector3(me.x, me.y + 1.62, me.z), d = look(); for (let t = 1; t < 9; t += 0.25) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y <= g.land(x, z)) return { x, z }; } return { x: o.x + d.x * 5, z: o.z + d.z * 5 }; }
const ghost = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x39e6ff, transparent: true, opacity: 0.8, depthTest: false })); ghost.visible = false; scene.add(ghost);
function tryBuild() { const K = C.NODE[buildPick]; if (me.carried < K.cost) return say(`A ${buildPick} costs ${K.cost} light. You carry ${Math.floor(me.carried)}.`); const s = buildSpot(); me.carried -= K.cost; const n = C.placeNode(g, buildPick, s.x, s.z, me.id); sound.buy(); say(n.lit ? `The ${buildPick} takes the light.` : `Too far from the light: the ${buildPick} stays dark. Place it within reach of a lit relay.`, 3); }
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
  const nearFire = Math.hypot(me.x - f.x, me.z - f.z) < C.fireRadius(f); txt('prompt', me.ember ? 'You fell. The fire will take you back.' : nearFire && me.carried > 0 ? '' : buildPick ? 'Left click to place, right click to cancel' : '');
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
  const hp0 = me.hp; C.step(g, dt); if (me.hp < hp0) { $('hurt').style.opacity = Math.min(0.6, (hp0 - me.hp) / 25); setTimeout(() => $('hurt').style.opacity = 0, 160); sound.hurt(); }
  for (const e of g.log.splice(0)) { if (e[1] === 'bank') { sound.drop(); say(`+${Math.floor(e[3])} light to the fire.`, 2); } if (e[1] === 'level') { sound.roundEnd(); say(`The fire grows to level ${e[2]}. Tonight the dark will answer.`, 5); } if (e[1] === 'dusk') { sound.round(); say(e[3] ? 'It stirs. The fire\'s growth woke something.' : 'It stirs.', 4); } if (e[1] === 'broke') say(`A ${e[2]} was torn down. The light past it went dark.`, 4); if (e[1] === 'allfell') say('Everyone fell. The fire took you back; the light you carried is out there where you dropped it.', 6); }
  drawHollow(dt); drawNetwork(now / 1000); drawMotes(); fx.update(dt); sky.material.uniforms.uT.value = now / 1000;
  if (buildPick) { const s = buildSpot(); ghost.visible = true; ghost.position.set(s.x, g.land(s.x, s.z) + 0.05, s.z); } else ghost.visible = false;
  kick += -kick * Math.min(1, dt * 10); if ((hitT -= dt) <= 0) $('hit').className = '';
  camera.position.set(me.x, me.y + 1.62, me.z); camera.rotation.set(me.pitch + kick * 0.035, me.yaw, 0, 'YXZ'); camera.fov = 78 - 22 * ads; camera.updateProjectionMatrix();
  sound.listen(me.x, me.y + 1.62, me.z, -Math.sin(me.yaw), 0, -Math.cos(me.yaw));
  for (const k in held) held[k].visible = false; const gm = held[gunKey];
  if (gm && !me.ember) { gm.visible = true; const u = gm.userData, a = ads * ads * (3 - 2 * ads), r = reloadT > 0 ? Math.sin(Math.PI * Math.min(1, 1 - reloadT / GUNS[gunKey].reload)) : 0;
    gm.position.set(0.15 * (1 - a), -0.15 + (-u.top - 0.006 + 0.15) * a - r * 0.1, (-0.16 - u.len * 0.42) * (1 - a) + (-0.3 - u.len * 0.5) * a + kick * 0.035 * (1 - a * 0.6)); gm.rotation.set(-r * 0.3 + kick * 0.05 * (1 - a * 0.7), 0.04 * (1 - a), r * 0.45); }
  hud();
  renderer.render(scene, camera);
  const here = C.lightAt(g, me.x, me.z); vhemi.intensity = 0.35 + 2 * here; vsun.intensity = 0.25 + here; vcam.fov = 54 - 8 * ads; vcam.updateProjectionMatrix();
  renderer.autoClear = false; renderer.clearDepth(); renderer.render(vscene, vcam); renderer.autoClear = true;
  fpsN++; fpsT += dt; if (fpsT > 0.5) { $('fps').textContent = `${Math.round(fpsN / fpsT)} fps`; fpsN = 0; fpsT = 0; }
}
// ---------------------------------------------------------------- start
$('name').value = SET.name || '';
$('solo').onclick = async () => {
  SET.name = ($('name').value || 'Player').replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12); save(); sound.wake();
  g = C.newGame(Math.floor(Math.random() * 1e9)); me = C.addPlayer(g, 1, SET.name); me.y = g.land(me.x, me.z); g.clock = 0.3;
  mode = 'play'; $('menu').hidden = true; $('hud').hidden = false; drawBuild(); renderer.domElement.requestPointerLock();
  await ready; prepGun('pistol'); prepGun('ar');
};
requestAnimationFrame(frame);
window.lastfire2 = { get g() { return g; }, get me() { return me; }, shoot, renderer };   // (a handle for the automated test)
