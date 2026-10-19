// Last Fire: the game. Up to four players, light, day and night (each night a round), building, crafting, the Hollow, guns and drops.
import * as THREE from 'three';
import { World, B, HARD, DROP, SIZE } from './world.js?v=11';
import { Hollow, KINDS } from './hollow.js?v=11';
import { Net, roomCode, cleanCode, CODE_LEN, MAX_PLAYERS } from './net.js?v=11';
import { GUNS, PERKS, POINTS, DROPS, sound, makeStation } from './combat.js?v=11';
import { FX } from './fx.js?v=11';
import { modelsReady, model, gunModel } from './models.js?v=11';

const $ = id => document.getElementById(id);
const DAY = 360, NIGHT_AT = 0.62, LONG_EVERY = 7;   // (a day is 6 minutes; night starts 62% in; every 7th night is the Long Night)
const DROP_KEYS = Object.keys(DROPS);
const fin = v => typeof v === 'number' && Number.isFinite(v);
const cleanName = n => String(n || '').replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 12);

// ---------------------------------------------------------------- settings (kept in this browser only)
const SET = Object.assign({ sens: 1, fov: 78, vol: 0.8, fps: true, sharp: 1, name: '' }, (() => { try { return JSON.parse(localStorage.getItem('lastfire-settings') || '{}'); } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem('lastfire-settings', JSON.stringify(SET)); } catch (e) {} }
sound.setVolume(SET.vol);

// ---------------------------------------------------------------- renderer, scene, light
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
const sizeRenderer = () => { renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5) * SET.sharp); renderer.setSize(innerWidth, innerHeight); };
sizeRenderer(); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(SET.fov, innerWidth / innerHeight, 0.03, 280);
scene.fog = new THREE.FogExp2(0x7d8ea8, 0.014);
const hemi = new THREE.HemisphereLight(0xbfd0ee, 0x1a1c24, 0.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xe8eeff, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 220 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const stars = (() => { const n = 1400, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 0.9 + 0.1), r = 250; p.set([Math.cos(a) * Math.sin(b) * r, Math.cos(b) * r, Math.sin(a) * Math.sin(b) * r], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false })); scene.add(m); return m; })();
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 12), new THREE.MeshBasicMaterial({ color: 0xeef2ff, fog: false })); scene.add(sunDisc);
const moonDisc = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xc9d4ff, fog: false })); scene.add(moonDisc);
// the ground's grit: soft noise at three sizes laid over each block's color, so faces read as rock and concrete, not flat toy plastic
const worldMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0 });
worldMat.onBeforeCompile = sh => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWp;
float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
    .replace('#include <color_fragment>', '#include <color_fragment>\nfloat gr = vn(vWp * 3.3) * 0.5 + vn(vWp * 12.0) * 0.28 + vn(vWp * 0.55) * 0.4; diffuseColor.rgb *= 0.66 + gr * 0.52;');
};

// ---------------------------------------------------------------- state
let world = null, hollow = new Hollow(scene), fx = new FX(scene), net = null, mode = 'menu', seed = 0, panel = null;
const me = { pid: 0, name: '', x: 80, y: 30, z: 80, vy: 0, yaw: 0, pitch: 0, hp: 100, stamina: 100, hunger: 100, dead: false, down: false, isPlayer: true, onGround: false, points: 500, perks: new Set(), guns: ['pistol', null], ammo: { pistol: { mag: 8, res: 64 } }, kills: 0, heads: 0, forged: new Set() };
const others = new Map();   // (player number -> what we know of that friend)
const inv = { pickaxe: 1, torch: 1, planks: 6, cobble: 0, dirt: 0, sand: 0, berries: 3, campfire: 1, lantern: 0, turret: 0 };
const SLOTS = ['gun1', 'gun2', 'pickaxe', 'torch', 'planks', 'cobble', 'campfire', 'lantern', 'turret', 'berries'];   // (keys 1 to 9, then 0)
const SLOT_NAME = { turret: 'Sentry', pickaxe: 'Pickaxe', torch: 'Flashlight', planks: 'Planks', cobble: 'Stone', campfire: 'Campfire', lantern: 'Lantern', berries: 'Berries' };
const SAYS = { pickaxe: 'Breaks blocks twice as fast. Hold left click on a block.', torch: 'A beam that burns them: anything you shine it on slows down and smolders. The Hollow keep off its glow.', turret: 'A sentry: place it (right click) and it shoots the Hollow on its own, 300 rounds. Buy them at the base.', planks: 'Build walls (right click), or feed a fire (right click the fire).', cobble: 'Build stronger walls (right click).', campfire: 'A big light. Burns 4 minutes, feed it planks. A big fire calls them from far off.', lantern: 'A small light that burns 10 minutes and never calls them.', berries: 'Eat (right click or E): food back, a little health.' };
const gunIn = s => s === 'gun1' ? me.guns[0] : s === 'gun2' ? me.guns[1] : null;   // (two guns at a time, CoD's rule)
let stations = [], reloadT = 0, ads = 0, hitT = 0, prompt = null, reviveT = 0, roundShown = 0, roundEndShown = 0, shotReady = true, switchT = 0, lastSlot = -1, sprintB = 0;
let slot = 0, clock = 0.25, day = 1, fires = [], lastSpawn = 0, mining = null, shotCd = 0, msgT = 0, mouseDown = [false, false, false], stepD = 0, kick = 0, flinch = 0, swayX = 0, swayY = 0, dmgT = 0, groanT = 0, frameN = 0;
const buffs = { double: 0, oneshot: 0 }, drops = []; let dropId = 1;
const keys = {};
const firePool = Array.from({ length: 6 }, () => { const l = new THREE.PointLight(0x8fb4ff, 0, 14, 1.6); scene.add(l); return l; });   // (six real fire lights at most: the nearest six)
const fireMeshes = new THREE.Group(); scene.add(fireMeshes);
const torchLight = new THREE.PointLight(0xa6c4ff, 0, 7, 1.8); scene.add(torchLight);
const beam = new THREE.SpotLight(0xe4ecff, 0, 34, 0.38, 0.5, 1.4); camera.add(beam); beam.position.set(0.12, -0.1, 0); beam.target.position.set(0, 0, -1); camera.add(beam.target);   // (the flashlight: always in the scene, off until held)
const muzzleLight = new THREE.PointLight(0xdfe6ff, 0, 6, 2); scene.add(muzzleLight);   // (one light for every muzzle flash: always in the scene, so nothing recompiles)
scene.add(camera);
// what you hold is drawn in its own pass after the world (a gun never pokes into a wall), lit to match where you stand
const vscene = new THREE.Scene(), vhemi = new THREE.HemisphereLight(0xc8d4f0, 0x1a1c26, 1), vsun = new THREE.DirectionalLight(0xffffff, 0.7); vsun.position.set(0.6, 1, 0.8); vscene.add(vhemi, vsun);
const vmuzzle = new THREE.PointLight(0xdfe6ff, 0, 2, 2); vmuzzle.position.set(0.1, -0.05, -0.6); vscene.add(vmuzzle);
const vcam = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.01, 10), view = new THREE.Group(); vcam.add(view); vscene.add(vcam);
const held = {}; let mastLamp = null, modelsOk = false;
const flashTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, '#ffffff'); r.addColorStop(0.25, '#dfe8ff'); r.addColorStop(1, 'rgba(120,150,255,0)'); g.fillStyle = r;
  g.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, rr = i % 2 ? 9 : 32; g.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr); } g.fill(); return new THREE.CanvasTexture(c); })();
const flashMat = new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true });
const HAND = { campfire: 0.3, turret: 0.28, lantern: 0.6, planks: 0.8, cobble: 0.8, berries: 0.95, pickaxe: 0.62, torch: 1.7, knife: 1 };   // (how big each item sits in the hand)
modelsReady.then(() => { modelsOk = true;
  for (const k of [...Object.keys(GUNS), ...Object.keys(HAND)]) { if (held[k]) continue; const m = model(k === 'torch' ? 'flashlight' : k); if (!m) continue; m.visible = false;
    if (GUNS[k] && !GUNS[k].melee) { const f = new THREE.Sprite(flashMat); f.scale.setScalar({ pistol: 0.045, smg: 0.055, ar: 0.06, minigun: 0.08, shotgun: 0.075 }[k] || 0.065);   // (a star at the barrel's end, not a screen of light: his v6 report) f.position.copy(m.userData.muzzle); f.visible = false; m.add(f); m.userData.flash = f; }
    else m.scale.setScalar(HAND[k] || 1); view.add(m); held[k] = m; } });

const coneGeo = new THREE.ConeGeometry(1.9, 9, 20, 1, true).translate(0, -4.5, 0).rotateX(-Math.PI / 2), coneMat = new THREE.MeshBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
function figure() {   // a friend: dark gear, a cyan visor line so you can tell them from the Hollow, and their gun in hand
  const g = new THREE.Group(), cloth = new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: 0.85 }), gear = new THREE.MeshStandardMaterial({ color: 0x15171d, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.95, 4, 8), cloth); body.position.y = 0.88; body.castShadow = true;
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.38), gear); vest.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), gear); head.position.y = 1.62; head.castShadow = true;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0x39e6ff })); visor.position.set(0, 1.64, -0.2);
  const hands = new THREE.Group(); hands.position.set(0.18, 1.3, -0.25); const cone = new THREE.Mesh(coneGeo, coneMat); cone.position.set(0, 0.2, -0.1); cone.visible = false; hands.add(cone);
  g.add(body, vest, head, visor, hands); g.userData.hands = hands; g.userData.cone = cone; return g;
}

// ---------------------------------------------------------------- input (the game takes the mouse once you click in; Tab opens the bag, Esc the menu)
const locked = () => document.pointerLockElement === renderer.domElement;
const lockMouse = () => { try { const r = renderer.domElement.requestPointerLock({ unadjustedMovement: true }); if (r && r.catch) r.catch(() => renderer.domElement.requestPointerLock()); } catch (e) { renderer.domElement.requestPointerLock(); } };
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code === 'Tab') { e.preventDefault(); if (mode === 'play' && world && world.ready) togglePanel('inv'); return; }
  keys[e.code] = true;
  if (mode !== 'play' || panel) return;
  const n = parseInt(e.key); if (n >= 0 && n <= 9) { const i = n === 0 ? 9 : n - 1; if (hasItem(i)) slot = i; else say(`Slot ${n} is empty.`, 1.2); }
  if (e.code === 'KeyV') melee();
  if (e.code === 'KeyQ') { const g = SLOTS[slot] === 'gun1' ? 1 : 0; if (me.guns[g]) slot = g; }   // (Q swaps guns)
  if (e.code === 'KeyC') craft('campfire');
  if (e.code === 'KeyE') eat();
  if (e.code === 'KeyR') reload();
  if (e.code === 'KeyF') interact();
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown.fill(false); });   // (alt-tab never leaves you running)
addEventListener('wheel', e => { if (mode !== 'play' || panel) return; const d = e.deltaY > 0 ? 1 : -1; for (let k = 1; k <= SLOTS.length; k++) { const i = (slot + d * k + SLOTS.length * 2) % SLOTS.length; if (hasItem(i)) { slot = i; break; } } });   // (the wheel skips empty slots)
function hasItem(i) { const s = SLOTS[i]; if (s.startsWith('gun')) return !!gunIn(s); return s === 'pickaxe' || s === 'torch' || inv[s] > 0; }
renderer.domElement.addEventListener('click', () => { if (mode === 'play' && !panel && !locked()) lockMouse(); });
addEventListener('mousemove', e => { if (!locked()) return; const k = 0.0022 * SET.sens * (1 - ads * 0.35); me.yaw -= e.movementX * k; me.pitch = Math.max(-1.55, Math.min(1.55, me.pitch - e.movementY * k)); swayX += e.movementX * 0.00006; swayY += e.movementY * 0.00006; });
addEventListener('mousedown', e => { if (locked()) { mouseDown[e.button] = true; if (e.button === 2 && !gunIn(SLOTS[slot])) use(); if (e.button === 0) shotReady = true; if (e.button === 1) { e.preventDefault(); melee(); } } });
addEventListener('mouseup', e => { mouseDown[e.button] = false; if (e.button === 0) mining = null; });
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => { if (mode === 'play' && !locked() && !panel) togglePanel('pause'); });
addEventListener('resize', () => { sizeRenderer(); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ---------------------------------------------------------------- actions
function say(t, s = 3) { $('msg').textContent = t; msgT = s; }
function lookDir() { return new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(me.pitch, me.yaw, 0, 'YXZ')); }
function eye() { return new THREE.Vector3(me.x, me.y + 1.62, me.z); }
function nameOf(pid) { return pid === me.pid ? 'You' : (others.get(pid)?.name || 'Friend'); }
const RECIPES = { campfire: { needs: { planks: 4 }, says: 'Campfire: 4 planks' }, lantern: { needs: { planks: 2, cobble: 2 }, says: 'Lantern: 2 planks, 2 stone' } };
function craft(k) { const R = RECIPES[k]; if (Object.entries(R.needs).every(([i, n]) => inv[i] >= n)) { for (const [i, n] of Object.entries(R.needs)) inv[i] -= n; inv[k]++; sound.buy(); say(`Crafted a ${k}.`); } else say(`A ${k} needs ${R.says.split(': ')[1]}.`); }
function eat() { if (inv.berries > 0 && me.hunger < 100) { inv.berries--; me.hunger = Math.min(100, me.hunger + 25); me.hp = Math.min(100, me.hp + 5); say('Ate berries.'); } }
const PLACE = { planks: 'block', cobble: 'block', campfire: 'flat', lantern: 'flat', turret: 'flat' };
function placeTarget() {   // where the thing in your hand would go: the empty cell you look at (things that stand settle onto the block below)
  const it = SLOTS[slot]; if (!PLACE[it] || !(inv[it] > 0)) return null;
  const hit = world.ray(eye(), lookDir(), 6); if (!hit || !hit.place) return null;
  let [x, y, z] = hit.place;
  if (PLACE[it] === 'flat') { let k = 0; while (y > 1 && !world.solid(x + 0.5, y - 0.5, z + 0.5) && k++ < 6) y--; if (!world.solid(x + 0.5, y - 0.5, z + 0.5)) return null; }
  const inMe = Math.abs(x + 0.5 - me.x) < 0.8 && Math.abs(z + 0.5 - me.z) < 0.8 && y + 1 > me.y && y < me.y + 1.8;
  const taken = fires.some(f => Math.floor(f.x) === x && Math.floor(f.z) === z && Math.abs(f.y - y) < 1) || turrets.some(T => Math.floor(T.x) === x && Math.floor(T.z) === z && Math.abs(T.y - y) < 1);
  return { x, y, z, it, ok: !inMe && !taken && !world.solid(x + 0.5, y + 0.5, z + 0.5) };
}
const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)), new THREE.LineBasicMaterial({ color: 0x39e6ff, transparent: true, opacity: 0.85, depthTest: true }));
ghost.visible = false; scene.add(ghost);
function drawGhost() { const T = mode === 'play' && !panel && !me.dead && world && world.ready ? placeTarget() : null; ghost.visible = !!T; if (!T) return; const flat = PLACE[T.it] === 'flat';
  ghost.scale.set(1, flat ? 0.15 : 1, 1); ghost.position.set(T.x + 0.5, T.y + (flat ? 0.075 : 0.5), T.z + 0.5); ghost.material.color.setHex(T.ok ? 0x39e6ff : 0xff5577); }
function use() {   // right click: place what you hold (where the outline shows), feed a fire, or eat
  const it = SLOTS[slot]; if (gunIn(it)) return;
  if (it === 'berries') return eat();
  const hit = world.ray(eye(), lookDir(), 6), near = fires.findIndex(f => !f.small && Math.hypot(f.x - me.x, f.z - me.z) < 3.5 && hit && Math.floor(f.x) === hit.x && Math.floor(f.z) === hit.z);
  if (it === 'planks' && near >= 0) { if (inv.planks > 0) { inv.planks--; addFuel(near, 90); say('Fed the fire: +90 seconds.'); } return; }
  const T = placeTarget(); if (!T) return; if (!T.ok) return say('Something is in the way.', 1.2);
  const { x, y, z } = T;
  if (it === 'campfire') { inv.campfire--; placeFire(x + 0.5, y, z + 0.5, 240, true, false); }
  else if (it === 'lantern') { inv.lantern--; placeFire(x + 0.5, y, z + 0.5, 600, true, true); }
  else if (it === 'turret') { inv.turret--; if (!net || net.host) addTurret(x + 0.5, y, z + 0.5, me.pid); else net.send({ t: 'turret', p: [x + 0.5, y, z + 0.5] }); say('Sentry placed: 300 rounds, it picks its own targets.'); }
  else { inv[it]--; editBlock(x, y, z, it === 'planks' ? B.PLANKS : B.COBBLE); }
  if (!hasItem(slot)) slot = me.guns[0] ? 0 : 2;   // (the last one placed: back to the gun)
}
function editBlock(x, y, z, b) { world.set(x, y, z, b); }   // (sent on by world.listen, set at start)
function quietSet(x, y, z, b) { world.quiet = true; world.set(x, y, z, b); world.quiet = false; }   // (a change that came over the network is not sent back out)
function placeFire(x, y, z, fuel, send, small = false) { const f = { x, y, z, fuel, r: small ? 5 : 8, big: false, small: !!small }; fires.push(f); if (!small && !stations.length) placeStations(f); if (send && net) net.send({ t: 'fire', f: [x, y, z, fuel, small ? 1 : 0] }); }
function addFuel(i, s, send = true) { fires[i].fuel = Math.min(900, fires[i].fuel + s); if (send && net) net.send({ t: 'feed', i, s }); }
function muzzleWorld() { const g = held[gunIn(SLOTS[slot])]; if (!g) return eye(); vcam.updateMatrixWorld(true); camera.updateMatrixWorld(true); return camera.localToWorld(g.localToWorld(g.userData.muzzle.clone())); }
function shoot() {
  const key = gunIn(SLOTS[slot]); if (!key || shotCd > 0 || reloadT > 0 || switchT > 0 || meleeT > 0 || (me.down && GUNS[key].spin)) return;   // (down, you can still fire anything but the minigun: CoD's last stand)
  const G = GUNS[key], am = me.ammo[key];
  if (G.spin && spin < G.spin) return;   // (the minigun's barrels have to come up to speed)
  if (!G.auto && !shotReady) return; shotReady = false;
  if (am.mag <= 0) { sound.click(); if (am.res > 0) reload(); shotCd = 0.25; return; }
  am.mag--; shotCd = 60 / G.rpm; sound.shot(key);
  vmuzzle.intensity = 0.8; setTimeout(() => vmuzzle.intensity = 0, 45);
  const gm = held[key]; if (gm && gm.userData.flash) { gm.userData.flash.visible = true; gm.userData.flash.material.rotation = Math.random() * 6; setTimeout(() => gm.userData.flash.visible = false, 40); }
  const o = eye(), m0 = muzzleWorld(); muzzleLight.position.copy(m0); muzzleLight.intensity = 1.6; setTimeout(() => muzzleLight.intensity = 0, 50);
  const spread = G.spread * (ads > 0.5 ? 0.3 : 1) * (me.onGround ? 1 : 2), pellets = [], ends = [];
  for (let i = 0; i < (G.pellets || 1); i++) {
    const d = lookDir(); d.x += (Math.random() - 0.5) * spread * 2; d.y += (Math.random() - 0.5) * spread * 2; d.z += (Math.random() - 0.5) * spread * 2; d.normalize();
    const wall = world.ray(o, d, 80), max = wall ? wall.dist : 80, h = hollow.hit(o, d, max), end = o.clone().addScaledVector(d, h ? h.t : max);
    fx.tracer(m0, end); if (h) { if ((h.part ? h.k.ab : h.k.ah) > 0) fx.spark(end); else fx.ichor(end, h.mult > 1); } else if (wall) fx.spark(end);   // (armor throws sparks; flesh comes apart as light)
    if (!net || net.host) { const r = applyShot(o, d, max, key, me.pid, me.forged.has(key)); if (r) award(r); }
    else pellets.push([+d.x.toFixed(4), +d.y.toFixed(4), +d.z.toFixed(4)]);
    if (ends.length < 8) ends.push([+end.x.toFixed(2), +end.y.toFixed(2), +end.z.toFixed(2)]);
  }
  if (net && !net.host) net.send({ t: 'shot', g: key, u: me.forged.has(key), o: [o.x, o.y, o.z], p: pellets });
  if (net) net.send({ t: 'bang', g: key, m: [+m0.x.toFixed(2), +m0.y.toFixed(2), +m0.z.toFixed(2)], e: ends });
  kick = Math.min(1, kick + 0.5 + G.recoil * 6);
  me.pitch = Math.min(1.55, me.pitch + G.recoil * 0.4 * (ads > 0.5 ? 0.6 : 1)); me.yaw += (Math.random() - 0.5) * G.recoil * 0.3;   // (some of the kick stays: you pull the gun down, like the real thing)
  if (am.mag > 0 && am.mag <= Math.ceil(G.mag * 0.25)) sound.low();
}
// melee: V or the middle mouse button. A knife lunge that lands a third of the way in; it finds plate gaps (half armor piercing)
const MELEE = 0.42; let meleeT = 0, meleeHit = false, spin = 0, testAim = false;   // (testAim: the automated test's right mouse button)
function melee() {
  if (meleeT > 0 || me.down || me.dead || panel) return; meleeT = MELEE; meleeHit = false; reloadT = 0; sound.swing();
}
function meleeStrike() {
  const o = eye(); let best = null;
  for (const yo of [0, 0.12, -0.12]) { const d = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(me.pitch, me.yaw + yo, 0, 'YXZ')), w = world.ray(o, d, 2.6), max = w ? w.dist : 2.6, h = hollow.hit(o, d, max); if (h && (!best || h.t < best.h.t)) best = { h, d, max }; }
  if (!best) { const w = world.ray(o, lookDir(), 2.4); if (w) { fx.spark(o.clone().addScaledVector(lookDir(), w.dist)); sound.thud(); } return; }
  const end = o.clone().addScaledVector(best.d, best.h.t); fx.ichor(end, false); sound.stab();
  if (!net || net.host) { const r = applyShot(o, best.d, best.max, 'knife', me.pid); if (r) award(r); }
  else net.send({ t: 'shot', g: 'knife', o: [o.x, o.y, o.z], p: [[+best.d.x.toFixed(4), +best.d.y.toFixed(4), +best.d.z.toFixed(4)]] });
}
// sentries: the host aims and fires them; everyone sees them turn and hears them from where they stand
const turrets = [], turretMeshes = new Map(); let turretId = 1;
function addTurret(x, y, z, owner) { if (turrets.length >= 8) return; turrets.push({ id: turretId++, x, y, z, yaw: 0, ammo: 300, cd: 0, look: 0, target: null, owner }); }
function stepTurrets(dt) {   // (host only)
  for (const T of turrets) {
    if (T.ammo <= 0) continue; T.cd -= dt; T.look -= dt;
    if (T.look <= 0) { T.look = 0.25; T.target = null; let bd = 20 * 20;   // (a new target four times a second: the nearest Hollow it can see within 20 m)
      for (const k of hollow.z) { const dx = k.x - T.x, dz = k.z - T.z, d2 = dx * dx + dz * dz; if (d2 > bd) continue; const o = _o.set(T.x, T.y + 0.9, T.z), dir = _d.set(dx, k.y + 1.3 - (T.y + 0.9), dz).normalize(), w = world.ray(o, dir, Math.sqrt(d2)); if (w) continue; bd = d2; T.target = k; } }
    const k = T.target; if (!k || !hollow.z.includes(k)) continue;
    const want = Math.atan2(k.x - T.x, k.z - T.z); let dy = want - T.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); T.yaw += Math.max(-dt * 5, Math.min(dt * 5, dy));
    if (Math.abs(dy) < 0.2 && T.cd <= 0) {
      T.cd = 0.12; T.ammo--; const o = new THREE.Vector3(T.x, T.y + 0.9, T.z), aim = new THREE.Vector3(k.x, k.y + 1.3, k.z), d = aim.clone().sub(o).normalize(); d.x += (Math.random() - 0.5) * 0.04; d.y += (Math.random() - 0.5) * 0.04; d.normalize();
      const r = applyShot(o, d, o.distanceTo(aim) + 1, 'sentry', T.owner); const end = o.clone().addScaledVector(d, o.distanceTo(aim));
      fx.tracer(o, end); if (r) fx.ichor(end, false); sound.shot('sentry', o);
      if (net) net.send({ t: 'tb', i: T.id, e: [+end.x.toFixed(2), +end.y.toFixed(2), +end.z.toFixed(2)] });
      if (r && r.kill) { if (T.owner === me.pid) award({ ...r, tur: true }); else if (net) net.sendTo(T.owner, { t: 'pts', r: [{ ...r, tur: true }] }); }
      if (T.ammo === 0) { if (T.owner === me.pid) say('Your sentry is out of rounds.'); else if (net) net.sendTo(T.owner, { t: 'boon', k: 'empty', by: T.owner }); }
    }
  }
  for (let i = turrets.length - 1; i >= 0; i--) if (turrets[i].ammo <= 0 && (turrets[i].gone = (turrets[i].gone || 0) + dt) > 8) turrets.splice(i, 1);   // (an empty sentry stands 8 seconds, then is gone)
}
const _o = new THREE.Vector3(), _d = new THREE.Vector3();
function drawTurrets() {
  if (!modelsOk) return; const seen = new Set();
  for (const T of turrets) { seen.add(T.id); let m = turretMeshes.get(T.id); if (!m) { m = model('turret'); if (!m) return; m.traverse(o => { if (/Top/.test(o.name)) m.userData.top = o; }); scene.add(m); turretMeshes.set(T.id, m); }
    m.position.set(T.x, T.y, T.z); if (m.userData.top) m.userData.top.rotation.y = T.yaw; else m.rotation.y = T.yaw; }
  for (const [id, m] of turretMeshes) if (!seen.has(id)) { scene.remove(m); turretMeshes.delete(id); }
}
function reload() {
  const key = gunIn(SLOTS[slot]); if (!key || reloadT > 0) return; const G = GUNS[key], am = me.ammo[key];
  if (am.mag >= magOf(key) || am.res <= 0) return; reloadT = G.reload * (me.perks.has('quick') ? 0.5 : 1); me.reloadOf = reloadT; sound.magOut(); setTimeout(() => sound.magIn(), reloadT * 700);
}
function finishReload() { const key = gunIn(SLOTS[slot]); if (!key) return; const am = me.ammo[key], n = Math.min(magOf(key) - am.mag, am.res); am.mag += n; am.res -= n; }
const SPECIAL = { sentry: { dmg: 26, head: 1.5, ap: 0.35 } };   // (the sentry's rounds: not a gun anyone holds)
function applyShot(o, d, max, key, shooter, forged = false) {   // the host's word on a shot: what it hit, whether it killed; a kill may leave a drop
  const h = hollow.hit(o, d, max); if (!h) return null;
  const head = h.mult > 1, G = GUNS[key] || SPECIAL[key], hr = buffs.oneshot > 0 ? (h.k.hp = 0, { armor: false, broke: false }) : hollow.damage(h.k, h.part, G.dmg * (head ? G.head : 1) * (forged ? 2 : 1), Math.min(0.95, G.ap + (forged ? 0.25 : 0))); h.k.x += d.x * 0.25; h.k.z += d.z * 0.25;
  const kill = h.k.hp <= 0;
  if (kill) { if (Math.random() < 1 / 40 && drops.length < 3) spawnDrop(h.k.x, h.k.y, h.k.z); killFeed(shooter, head, h.k.kind); if (net) net.send({ t: 'kf', w: shooter, h: head, k: h.k.kind }); }
  return { head, kill, armor: hr.armor, broke: hr.broke };
}
function award(r) {   // points the CoD way, a hit marker and its tick
  if (r.tur) { const n = (r.head ? 50 : 30) * (buffs.double > 0 ? 2 : 1); me.points += n; me.kills++; floatPoints('+' + n + ' sentry'); return; }   // (a sentry kill pays half: it did the aiming)
  const n = (POINTS.hit + (r.broke ? 20 : 0) + (r.kill ? (r.head ? POINTS.head : POINTS.kill) : 0)) * (buffs.double > 0 ? 2 : 1);   // (breaking a plate pays 20: progress you can see and hear)
  me.points += n; hitT = r.kill ? 0.25 : 0.12; $('hit').className = r.kill ? (r.head ? 'head' : 'kill') : r.armor ? 'armor' : 'on'; r.kill ? sound.kill() : r.broke ? sound.shatter() : r.armor ? sound.plate() : sound.hit(r.head);
  if (r.kill) { me.kills++; if (r.head) me.heads++; }
  floatPoints('+' + n);
}
function floatPoints(t) { const e = document.createElement('div'); e.className = 'pts'; e.textContent = t; e.style.right = (150 + Math.random() * 40) + 'px'; $('hud').append(e); setTimeout(() => e.remove(), 900); }
function killFeed(pid, head, kind) {
  const e = document.createElement('div'); e.className = 'kf'; const who = document.createElement('b'); who.textContent = nameOf(pid); if (pid === me.pid) who.className = 'me';
  e.append(who, document.createTextNode(head ? '  headshot  ' : '  killed  '), Object.assign(document.createElement('i'), { textContent: { hollow: 'a Hollow', shade: 'a Runner', warden: 'a Giant', snuffer: 'a Shard' }[kind] || 'a Hollow' }));
  const f = $('feed'); f.prepend(e); while (f.children.length > 5) f.lastChild.remove(); setTimeout(() => e.remove(), 4500);
}
function magOf(g) { return Math.round(GUNS[g].mag * (me.forged.has(g) ? 1.5 : 1)); }
function giveGun(k) { const have = me.guns.indexOf(k); const at = have >= 0 ? have : me.guns[1] === null ? 1 : (SLOTS[slot] === 'gun2' ? 1 : 0); me.guns[at] = k; me.ammo[k] = { mag: magOf(k), res: Math.round(GUNS[k].reserve * (me.forged.has(k) ? 1.5 : 1)) }; slot = at; sound.buy(); }   // (a new gun takes the empty hand, or the one you hold)
let boxT = 0;
function interact() {   // F: buy what you look at
  if (!prompt || !prompt.station) return; const st = prompt.station.userData;
  if (st.kind === 'forge') {   // (the Forge: 5000 makes the gun in your hands a Mark II: double damage, half again the rounds, pierces armor better)
    const g = gunIn(SLOTS[slot]); if (!g) return say('Hold the gun you want forged.'); if (me.forged.has(g)) return say(`Your ${GUNS[g].name} is already a Mark II.`);
    if (me.points < 5000) return say('Not enough points.'); me.points -= 5000; me.forged.add(g); me.ammo[g] = { mag: magOf(g), res: Math.round(GUNS[g].reserve * 1.5) }; sound.drop(); say(`${GUNS[g].name} MARK II: double damage, more rounds, cuts through armor.`, 4); return;
  }
  if (st.kind === 'box') {   // (the mystery box: 950 for a random gun after a short roll; the minigun is the rare one)
    if (boxT > 0) return; if (me.points < 950) return say('Not enough points.'); me.points -= 950; boxT = 2.4; sound.buy();
    const roll = Math.random(), pool = ['smg', 'shotgun', 'ar', 'rifle', 'lmg'], got = roll < 0.08 ? 'minigun' : pool[Math.floor(Math.random() * pool.length)];
    const tick = setInterval(() => { if (boxT <= 0) return clearInterval(tick); sound.click(); say('The box: ' + GUNS[pool[Math.floor(Math.random() * pool.length)]].name + '...', 0.3); }, 160);
    setTimeout(() => { clearInterval(tick); giveGun(got); say(got === 'minigun' ? 'THE BOX GAVE YOU THE MINIGUN.' : `The box gave you the ${GUNS[got].name}.`, 3); }, 2400); return;
  }
  if (st.kind === 'kit') { if (inv.turret >= 2) return say('You can carry 2 sentries.'); if (me.points < st.price) return say('Not enough points.'); me.points -= st.price; inv.turret++; slot = SLOTS.indexOf('turret'); sound.buy(); return say('Bought a sentry. Right click to place it.'); }
  if (st.kind === 'gun') {
    const owned = me.guns.indexOf(st.key);
    if (owned >= 0) { const cost = Math.floor(st.price / 2); if (me.points < cost) return say('Not enough points.'); me.points -= cost; me.ammo[st.key].res = GUNS[st.key].reserve; sound.buy(); say(`Ammo for the ${GUNS[st.key].name}.`); return; }
    if (me.points < st.price) return say('Not enough points.');
    me.points -= st.price; giveGun(st.key); say(`Bought the ${GUNS[st.key].name}.`);
  } else {
    if (me.perks.has(st.key)) return say('You already have it.'); if (me.perks.size >= 3) return say('Three perks at most.');
    if (me.points < st.price) return say('Not enough points.'); me.points -= st.price; me.perks.add(st.key); sound.buy(); say(`${PERKS[st.key].name}: ${PERKS[st.key].says}.`);
  }
}
function placeStations(f) {   // the base: wall-buys and perk machines in a ring round the first fire (the same for every player: built from the fire)
  if (stations.length || !world) return;
  const ring = [['gun', 'smg'], ['gun', 'shotgun'], ['gun', 'ar'], ['perk', 'iron'], ['gun', 'rifle'], ['kit', 'turret'], ['gun', 'lmg'], ['perk', 'quick'], ['gun', 'minigun'], ['perk', 'fleet'], ['box', 'box'], ['forge', 'forge']];
  ring.forEach(([kind, key], i) => { const a = i / ring.length * Math.PI * 2, x = f.x + Math.cos(a) * 6, z = f.z + Math.sin(a) * 6, y = world.height(Math.floor(x), Math.floor(z));
    const st = makeStation(kind, key, x, y, z, Math.atan2(f.x - x, f.z - z)); scene.add(st); stations.push(st); });
}
function mine(dt) {
  const hit = world.ray(eye(), lookDir(), 5);
  if (!hit) { mining = null; return; }
  if (!mining || mining.x !== hit.x || mining.y !== hit.y || mining.z !== hit.z) mining = { x: hit.x, y: hit.y, z: hit.z, t: 0 };
  if (!Number.isFinite(HARD[hit.b])) { if (!msgT) say('Steel: nothing breaks it.'); return; }
  mining.t += dt * (SLOTS[slot] === 'pickaxe' ? 2.2 : 1);
  if (mining.t >= (HARD[hit.b] || 1)) {
    const drop = DROP[hit.b]; editBlock(hit.x, hit.y, hit.z, B.AIR); mining = null;
    const into = { [B.PLANKS]: 'planks', [B.COBBLE]: 'cobble', [B.DIRT]: 'dirt', [B.SAND]: 'sand' }[drop];
    if (hit.b === B.LOG) inv.planks += 3; else if (into) inv[into]++;
    if (hit.b === B.LEAVES && Math.random() < 0.35) { inv.berries++; say('Found berries.'); }
  }
}

// ---------------------------------------------------------------- drops: the host makes them; whoever walks over one sets it off for everyone
const dropMeshes = new Map();
function showDrop(d) {
  const g = new THREE.Group(), c = DROPS[d.k].color;
  g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.32), new THREE.MeshBasicMaterial({ color: c, wireframe: true })), new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshBasicMaterial({ color: c })));
  g.position.set(d.x, d.y + 0.9, d.z); scene.add(g); dropMeshes.set(d.id, g);
}
function spawnDrop(x, y, z) { const d = { id: dropId++, k: DROP_KEYS[Math.floor(Math.random() * DROP_KEYS.length)], x, y: world.height(Math.floor(x), Math.floor(z)), z, t: 30 }; drops.push(d); showDrop(d); if (net) net.send({ t: 'drop', d: [d.id, DROP_KEYS.indexOf(d.k), d.x, d.y, d.z] }); }
function removeDrop(id) { const i = drops.findIndex(d => d.id === id); if (i >= 0) drops.splice(i, 1); const g = dropMeshes.get(id); if (g) { scene.remove(g); dropMeshes.delete(id); } }
function takeDrop(id, pid) {   // (host only: checks the player really stands on it)
  const d = drops.find(q => q.id === id); if (!d) return; const p = pid === me.pid ? me : others.get(pid); if (!p || Math.hypot(p.x - d.x, p.z - d.z) > 3) return;
  removeDrop(id); if (net) net.send({ t: 'gone', id }); boon(d.k, pid); if (net) net.send({ t: 'boon', k: d.k, by: pid });
}
function boon(k, by) {
  if (k === 'empty') return say('Your sentry is out of rounds.');
  if (!DROPS[k]) return; sound.drop(); say(`${nameOf(by) === 'You' ? 'You' : nameOf(by)} got ${DROPS[k].name}: ${DROPS[k].says}.`, 4);
  if (k === 'resupply') for (const g of me.guns) if (g) me.ammo[g] = { mag: magOf(g), res: Math.round(GUNS[g].reserve * (me.forged.has(g) ? 1.5 : 1)) };
  if (k === 'double') buffs.double = 30;
  if (k === 'oneshot') buffs.oneshot = 30;
  if (k === 'flare') { me.points += 400; floatPoints('+400'); if (!net || net.host) for (const z of hollow.z) z.hp = 0; }
  if (k === 'kindling' && (!net || net.host)) for (const f of fires) if (f.fuel > 0) f.fuel = Math.min(900, f.fuel + 180);
}

// ---------------------------------------------------------------- the clock: day, night, the Long Night
function daylightAt(c) { return Math.max(0, Math.min(1, Math.sin(c * Math.PI * 2 / (NIGHT_AT * 2)) * 1.6)) * (c < NIGHT_AT ? 1 : 0); }
function isLong(d) { return d % LONG_EVERY === 0; }
const nightCol = new THREE.Color(0x04060c), longCol = new THREE.Color(0x070209), dayCol = new THREE.Color(0x7d8ea8), dusk = new THREE.Color(0x8a6aa0), skyC = new THREE.Color();
function sky(dt) {
  clock += dt / (DAY * (isLong(day) && clock > NIGHT_AT ? 1.6 : 1));   // (the Long Night lasts 60% longer)
  if (clock >= 1) { clock -= 1; day++; say(isLong(day) ? `Day ${day}. Tonight is the Long Night.` : `Day ${day}.`, 5); }
  const L = daylightAt(clock), a = clock / NIGHT_AT * Math.PI;   // (the sun crosses the sky by day; the moon by night)
  sun.position.set(me.x + Math.cos(a) * 160, Math.sin(a) * 140, me.z + 40); sun.target.position.set(me.x, 0, me.z); sun.intensity = 2.2 * L;
  sunDisc.position.copy(sun.position); sunDisc.visible = L > 0.02;
  const ma = (clock - NIGHT_AT) / (1 - NIGHT_AT) * Math.PI; moonDisc.position.set(me.x + Math.cos(ma) * 160, Math.sin(ma) * 120, me.z - 60); moonDisc.visible = clock > NIGHT_AT;
  skyC.copy(isLong(day) ? longCol : nightCol).lerp(dayCol, L); if (L > 0 && L < 0.5) skyC.lerp(dusk, (0.5 - L) * 0.6);
  scene.background = skyC; scene.fog.color.copy(skyC); scene.fog.density = 0.014 + (1 - L) * 0.03;
  hemi.intensity = 0.16 + 0.5 * L; hemi.color.setHex(L > 0.2 ? 0xbfd0ee : 0x6f86c9);   // (a faint blue moonlight at night: dark, never pitch black)
  stars.material.opacity = 1 - L; renderer.toneMappingExposure = 0.9 + (1 - L) * 0.5;
  return L;
}

// ---------------------------------------------------------------- the player
function move(dt) {
  if (me.dead) return;
  if (me.down) { me.bleed -= dt; if (me.bleed <= 0) { me.down = false; me.hp = 1; hurt(me, 999); } }
  const fleet = me.perks.has('fleet'), f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const sprint = (keys.ShiftLeft || keys.ShiftRight) && f > 0 && me.stamina > 1 && me.onGround && !me.down && ads < 0.5 && reloadT <= 0;
  const speed = me.down ? 0.8 : (sprint ? (fleet ? 8.4 : 7.2) : (fleet ? 5 : 4.4)) * (1 - ads * 0.35) * (gunIn(SLOTS[slot]) === 'minigun' ? 0.72 : 1);   // (the minigun is heavy)
  const sinY = Math.sin(me.yaw), cosY = Math.cos(me.yaw);
  let vx = (-sinY * f + cosY * s), vz = (-cosY * f - sinY * s); const len = Math.hypot(vx, vz) || 1; vx = vx / len * speed * dt; vz = vz / len * speed * dt;
  if (sprint) me.stamina = Math.max(0, me.stamina - (fleet ? 7 : 14) * dt); else me.stamina = Math.min(100, me.stamina + 9 * dt);
  sprintB += ((sprint && (f || s) ? 1 : 0) - sprintB) * Math.min(1, dt * 8);
  const free = (x, y, z) => !world.solid(x - 0.3, y, z - 0.3) && !world.solid(x + 0.3, y, z - 0.3) && !world.solid(x - 0.3, y, z + 0.3) && !world.solid(x + 0.3, y, z + 0.3);
  const fits = (x, y, z) => free(x, y + 0.05, z) && free(x, y + 0.9, z) && free(x, y + 1.75, z);
  const x0 = me.x, z0 = me.z;
  const stepTo = (nx, nz) => { if (fits(nx, me.y, nz)) { me.x = nx; me.z = nz; return; } if (me.onGround && fits(nx, me.y + 1.02, nz) && fits(me.x, me.y + 1.02, me.z)) { me.x = nx; me.z = nz; me.y = Math.floor(me.y + 1.02); } };
  stepTo(me.x + vx, me.z); stepTo(me.x, me.z + vz);
  if (keys.Space && me.onGround && !me.down) { me.vy = 7.6; me.onGround = false; }
  me.vy -= 24 * dt; const ny = me.y + me.vy * dt;
  if (me.vy <= 0 && !free(me.x, ny - 0.001, me.z)) { if (!me.onGround && me.vy < -7) sound.land(-me.vy); if (me.vy < -14) hurt(me, (-me.vy - 14) * 4); me.y = Math.floor(ny - 0.001) + 1; me.vy = 0; me.onGround = true; }
  else if (me.vy > 0 && !free(me.x, ny + 1.8, me.z)) me.vy = 0;
  else { me.y = ny; me.onGround = false; }
  me.x = Math.max(1, Math.min(SIZE - 1, me.x)); me.z = Math.max(1, Math.min(SIZE - 1, me.z));
  if (me.onGround) { stepD += Math.hypot(me.x - x0, me.z - z0); if (stepD > (sprint ? 2.5 : 1.9)) { stepD = 0; sound.step(sprint); } }   // (footsteps: you hear yourself move)
  me.hunger = Math.max(0, me.hunger - dt * 0.18); if (me.hunger <= 0) hurt(me, dt * 2);
  else if (me.hunger > 60 && me.hp < 100) me.hp = Math.min(100, me.hp + dt * 0.8);
}
function teammatesUp() { for (const p of others.values()) if (!p.dead && !p.down) return true; return false; }
function hurt(p, n, src) {
  if (p === me) {
    if (me.dead || me.down) return; me.hp -= n / (me.perks.has('iron') ? 2.5 : 1); $('hurt').style.opacity = Math.min(0.6, n / 25); setTimeout(() => $('hurt').style.opacity = 0, 160);
    if (n >= 5) { sound.hurt(); flinch = Math.min(1, flinch + n / 30); }
    if (src && fin(src.x) && fin(src.z)) { const rel = Math.atan2(-(src.x - me.x), -(src.z - me.z)) - me.yaw; $('dmg').style.transform = `rotate(${-rel}rad)`; dmgT = 1; }
    if (me.hp <= 0) { if (net && teammatesUp()) { me.down = true; me.hp = 0; me.bleed = 30; if (!gunIn(SLOTS[slot])) slot = 0; say('You are down: keep shooting. A friend can revive you (hold F next to you): 30 seconds.', 6); }
      else { me.dead = true; me.points = Math.floor(me.points * 0.9); say('You fell. Back up by the fire in 8 seconds (lost 10% of your points).', 8); setTimeout(respawn, 8000); } }
  } else if (p.pid !== undefined && net && net.host) net.sendTo(p.pid, { t: 'hurt', n, a: src ? [src.x, src.z] : null });
}
function respawn() { me.down = false; const f = fires.find(q => q.fuel > 0 && !q.small) || fires[0]; me.x = f ? f.x + 1.5 : 80; me.z = f ? f.z : 80; me.y = world.height(Math.floor(me.x), Math.floor(me.z)) + 0.5; me.hp = 60; me.dead = false; me.vy = 0; }

// ---------------------------------------------------------------- fires and lanterns: fuel burns down; the six nearest get real light
const flameGeo = new THREE.ConeGeometry(0.28, 0.7, 8), logGeo = new THREE.BoxGeometry(0.7, 0.14, 0.14), flameMat = new THREE.MeshBasicMaterial({ color: 0x9fd8ff }), logMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 1 });
const postGeo = new THREE.BoxGeometry(0.08, 0.7, 0.08), lampGeo = new THREE.BoxGeometry(0.2, 0.24, 0.2), lampMat = new THREE.MeshBasicMaterial({ color: 0xa8c8ff }), postMat = new THREE.MeshStandardMaterial({ color: 0x3a3e48, metalness: 0.6, roughness: 0.5 });
function drawFires(t, dt) {
  while (modelsOk && fireMeshes.children.length < fires.length) {   // (each fire a stone pit with a flame; each lantern the real lantern on a steel post)
    const f = fires[fireMeshes.children.length], g = new THREE.Group();
    if (f.small) { const p = new THREE.Mesh(postGeo, postMat); p.position.y = 0.35; const l = model('lantern') || new THREE.Mesh(lampGeo, lampMat); l.position.y = 0.62; g.add(p, l); }
    else { const pit = model('campfire') || new THREE.Group(); const fl = new THREE.Mesh(flameGeo, flameMat); fl.position.y = 0.4; g.add(pit, fl); }
    fireMeshes.add(g);
  }
  for (const f of fires) { f.fuel = Math.max(0, f.fuel - dt); f.r = f.fuel > 0 ? (f.small ? 5 : 8 + Math.min(4, f.fuel / 120)) : 0; f.big = !f.small && f.fuel > 300; }
  fires.forEach((f, i) => { const g = fireMeshes.children[i]; if (!g) return; g.position.set(f.x, f.y + 0.07, f.z); const fl = g.children[1]; if (f.small) { fl.traverse(o => { if (o.material && o.material.emissive) o.material.emissiveIntensity = f.fuel > 0 ? 0.6 : 0; }); } else fl.visible = f.fuel > 0; if (!f.small) fl.scale.setScalar((0.8 + Math.sin(t * 13 + i) * 0.08) * Math.min(1.4, 0.6 + f.fuel / 300)); });
  const near = fires.map((f, i) => [i, (f.x - me.x) ** 2 + (f.z - me.z) ** 2]).filter(([i]) => fires[i].fuel > 0).sort((a, b) => a[1] - b[1]).slice(0, firePool.length);
  firePool.forEach((l, j) => { const n = near[j]; if (!n) { l.intensity = 0; return; } const f = fires[n[0]]; l.position.set(f.x, f.y + 0.8, f.z); l.distance = f.r * 1.7; l.intensity = (f.small ? 4 : 9) * (0.9 + Math.sin(t * 11 + j) * 0.07 + Math.sin(t * 23 + j) * 0.04); });
}
function beams(dt) {   // (host: a held flashlight's cone, 14 m and about 20 degrees either side, burns 7 a second and halves their speed; the Giant does not care)
  const holders = [...(SLOTS[slot] === 'torch' && !me.dead ? [me] : []), ...[...others.values()].filter(p => p.torch && !p.dead)];
  for (const k of hollow.z) k.slow = 0;
  for (const p of holders) { const fx2 = -Math.sin(p.yaw) * Math.cos(p.pitch), fy = Math.sin(p.pitch), fz = -Math.cos(p.yaw) * Math.cos(p.pitch);
    for (const k of hollow.z) { if (k.kind === 'warden') continue; const dx = k.x - p.x, dy = k.y + 1.2 - (p.y + 1.6), dz = k.z - p.z, d = Math.hypot(dx, dy, dz); if (d > 14 || d < 0.1) continue;
      if ((dx * fx2 + dy * fy + dz * fz) / d > 0.94) { k.hp -= dt * 7; k.slow = 1; } } }
}
function lights() {
  const L = fires.filter(f => f.fuel > 0).map(f => ({ x: f.x, y: f.y, z: f.z, r: f.r, big: f.big }));
  if (SLOTS[slot] === 'torch' && !me.dead) L.push({ x: me.x, y: me.y + 1, z: me.z, r: 4.5 });
  for (const p of others.values()) if (p.torch && !p.dead) L.push({ x: p.x, y: p.y + 1, z: p.z, r: 4.5 });
  return L;
}

// ---------------------------------------------------------------- multiplayer: the host checks everything a friend sends before it counts
const near = (p, x, y, z, r) => fin(x) && fin(y) && fin(z) && Math.hypot(p.x - x, p.y + 1.5 - y, p.z - z) < r;
const ints = (a, n) => Array.isArray(a) && a.length === n && a.every(v => Number.isInteger(v));
function bucket(p, key, perSec, cap, cost = 1) { const now = performance.now() / 1000; p[key] = Math.min(cap, (p[key] ?? cap) + (now - (p[key + 'T'] || now)) * perSec); p[key + 'T'] = now; if (p[key] < cost) return false; p[key] -= cost; return true; }
function friend(pid) { let p = others.get(pid); if (!p) { p = { pid, name: 'Friend', x: 80, y: -50, z: 80, tx: 80, ty: -50, tz: 80, yaw: 0, pitch: 0, dead: false, down: false, torch: false, gun: '', points: 0, isPlayer: true, fig: figure(), held: null, heldKey: '' }; scene.add(p.fig); others.set(pid, p); makeMark(p); } return p; }
function dropFriend(pid) { const p = others.get(pid); if (!p) return; scene.remove(p.fig); p.mark.remove(); others.delete(pid); }
const got = {};   // (how many of each message came in: for the automated test)
function onNet(m, from) {
  const H = net.host; got[m.t] = (got[m.t] || 0) + 1;
  if (m.t === 'joined' && H) { friend(from); net.sendTo(from, { t: 'hello', you: from, seed, edits: world.edits, fires: fires.map(f => [f.x, f.y, f.z, f.fuel, f.small ? 1 : 0]), clock, day, drops: drops.map(d => [d.id, DROP_KEYS.indexOf(d.k), d.x, d.y, d.z]) }); say(`A friend joined: ${others.size + 1} of ${MAX_PLAYERS} here.`, 4); return; }
  if (m.t === 'left') { const n = others.get(from)?.name; dropFriend(from); if (H || from === 0) say(from === 0 && !H ? 'The host left: the game is over.' : `${n || 'A friend'} left.`, 5); return; }
  if (m.t === 'bye') { const why = { full: `That room is full (${MAX_PLAYERS} players).`, locked: 'The host locked that room.', kicked: 'The host removed you from the game.' }[m.why] || 'The host closed the connection.'; $('menuNote').textContent = why; say(why, 8); return; }
  if (m.t === 'hello' && !H && from === 0) {
    if (!fin(m.seed) || !Array.isArray(m.edits) || !Array.isArray(m.fires)) return;
    me.pid = net.me; start(m.seed, false);
    for (const e of m.edits) if (ints(e, 4)) quietSet(...e);
    for (const f of m.fires) if (Array.isArray(f) && f.slice(0, 4).every(fin)) placeFire(f[0], f[1], f[2], f[3], false, !!f[4]);
    if (fin(m.clock)) clock = m.clock; if (Number.isInteger(m.day)) day = m.day;
    for (const d of m.drops || []) if (Array.isArray(d) && d.every(fin) && DROP_KEYS[d[1]]) { const q = { id: d[0], k: DROP_KEYS[d[1]], x: d[2], y: d[3], z: d[4] }; drops.push(q); showDrop(q); }
    friend(0); return;
  }
  if (m.t === 'p') {   // (where a player is: anyone's, passed on by the host)
    if (from === me.pid || ![m.x, m.y, m.z, m.yaw, m.pi].every(fin)) return; const p = friend(from);
    Object.assign(p, { tx: Math.max(0, Math.min(SIZE, m.x)), ty: Math.max(-60, Math.min(80, m.y)), tz: Math.max(0, Math.min(SIZE, m.z)), yaw: m.yaw, pitch: Math.max(-1.6, Math.min(1.6, m.pi)), dead: !!m.dead, down: !!m.down, torch: !!m.torch, gun: GUNS[m.g] ? m.g : '', name: cleanName(m.n) || 'Friend', points: Number.isInteger(m.pt) ? m.pt : 0 });
    if (p.y < -40) { p.x = p.tx; p.y = p.ty; p.z = p.tz; }
    if (H) net.relay(m, from); return;
  }
  if (m.t === 'bang') {   // (someone else's shot: heard from where they stand, the flash and the tracers seen)
    const p = others.get(from); if (!p || !GUNS[m.g] || !Array.isArray(m.m) || !near(p, m.m[0], m.m[1], m.m[2], 4)) return;
    if (H && !bucket(p, 'bangs', 14, 20)) return;
    const o = new THREE.Vector3(m.m[0], m.m[1], m.m[2]); sound.shot(m.g, o); muzzleLight.position.copy(o); muzzleLight.intensity = 1.6; setTimeout(() => muzzleLight.intensity = 0, 50);
    for (const e of (Array.isArray(m.e) ? m.e.slice(0, 8) : [])) if (Array.isArray(e) && e.length === 3 && e.every(fin)) { const v = new THREE.Vector3(...e); fx.tracer(o, v); fx.spark(v); }
    if (H) net.relay(m, from); return;
  }
  if (m.t === 'shot' && H) {   // (a friend's shot: the host traces it through its own world, so a wall stops it and the damage is the gun's, never the message's)
    const p = others.get(from); if (!p || p.dead || p.down || !GUNS[m.g] || (GUNS[m.g].melee && !bucket(p, 'knifeB', 3, 3)) || !Array.isArray(m.o) || !Array.isArray(m.p) || !near(p, m.o[0], m.o[1], m.o[2], 3.5)) return;
    const n = Math.min(m.p.length, GUNS[m.g].pellets || 1); if (!bucket(p, 'ammoB', 22, 30, n)) return;
    const o = new THREE.Vector3(m.o[0], m.o[1], m.o[2]), out = [];
    for (const d of m.p.slice(0, n)) { if (!Array.isArray(d) || d.length !== 3 || !d.every(fin)) continue; const v = new THREE.Vector3(...d); if (v.lengthSq() < 0.5) continue; v.normalize(); const range = GUNS[m.g].melee ? 2.6 : 80, w = world.ray(o, v, range), r = applyShot(o, v, w ? w.dist : range, m.g, from, m.u === true); if (r) out.push(r); }
    if (out.length) net.sendTo(from, { t: 'pts', r: out }); return;
  }
  if (m.t === 'pts' && !H && from === 0) { for (const r of (Array.isArray(m.r) ? m.r.slice(0, 8) : [])) if (r && typeof r === 'object') award({ head: !!r.head, kill: !!r.kill, armor: !!r.armor, broke: !!r.broke, tur: !!r.tur }); return; }
  if (m.t === 'kf') { if (H && from !== 0) return; if (Number.isInteger(m.w) && m.w !== me.pid) killFeed(m.w, !!m.h, String(m.k)); return; }
  if (m.t === 'e') {
    if (!ints(m.e, 4)) return; const [x, y, z, b] = m.e;
    if (H) { const p = others.get(from); if (!p || ![B.AIR, B.PLANKS, B.COBBLE].includes(b) || world.get(x, y, z) === B.STEEL || !near(p, x + 0.5, y + 0.5, z + 0.5, 9) || !bucket(p, 'edits', 12, 20)) { net.sendTo(from, { t: 'e', e: [x, y, z, world.get(x, y, z)] }); return; }   // (refused: the sender is told what is really there, so nobody's world drifts)
      quietSet(x, y, z, b); net.relay(m, from); }
    else quietSet(x, y, z, b);
    return;
  }
  if (m.t === 'fire') {
    if (!Array.isArray(m.f) || !m.f.slice(0, 4).every(fin) || fires.length > 60) return;
    if (H) { const p = others.get(from); if (!p || !near(p, m.f[0], m.f[1] + 1, m.f[2], 9) || !bucket(p, 'fires', 0.5, 2)) return; m.f[3] = m.f[4] ? 600 : 240; net.relay(m, from); }
    placeFire(m.f[0], m.f[1], m.f[2], m.f[3], false, !!m.f[4]); return;
  }
  if (m.t === 'feed') { if (!Number.isInteger(m.i) || !fires[m.i] || !fin(m.s)) return; const s = Math.min(90, Math.max(0, m.s)); if (H) { const p = others.get(from); if (!p || !bucket(p, 'feeds', 3, 6)) return; net.relay({ t: 'feed', i: m.i, s }, from); } addFuel(m.i, s, false); return; }
  if (m.t === 'revive') {   // (hold F by a downed friend; the host checks the two really stand together)
    if (H) { const p = others.get(from), to = m.to; if (!p || p.down || p.dead) return; const q = to === 0 ? me : others.get(to); if (!q || !q.down || Math.hypot(p.x - q.x, p.z - q.z) > 4) return; if (to === 0) revived(from); else net.sendTo(to, { t: 'revive', from }); }
    else if (from === 0 || Number.isInteger(m.from)) revived(from);
    return;
  }
  if (m.t === 's' && !H && from === 0) { if (Array.isArray(m.tu)) { turrets.length = 0; for (const q of m.tu.slice(0, 8)) if (Array.isArray(q) && q.every(fin)) turrets.push({ id: q[0], x: q[1], y: q[2], z: q[3], yaw: q[4], ammo: q[5] }); } hollow.unpack(m.h); if (fin(m.c)) clock = m.c; if (Number.isInteger(m.d)) day = m.d; if (Array.isArray(m.f)) fires.forEach((f, i) => { if (fin(m.f[i])) f.fuel = m.f[i]; }); return; }
  if (m.t === 'hurt' && !H && from === 0) { if (fin(m.n)) hurt(me, Math.min(200, m.n), Array.isArray(m.a) ? { x: m.a[0], z: m.a[1] } : null); return; }
  if (m.t === 'drop' && !H && from === 0) { const d = m.d; if (Array.isArray(d) && d.every(fin) && DROP_KEYS[d[1]]) { const q = { id: d[0], k: DROP_KEYS[d[1]], x: d[2], y: d[3], z: d[4] }; drops.push(q); showDrop(q); } return; }
  if (m.t === 'gone' && !H && from === 0) { removeDrop(m.id); return; }
  if (m.t === 'turret' && H) { const p = others.get(from); if (p && Array.isArray(m.p) && near(p, m.p[0], m.p[1] + 1, m.p[2], 9) && bucket(p, 'turrets', 0.05, 2)) addTurret(m.p[0], m.p[1], m.p[2], from); return; }
  if (m.t === 'tb' && !H && from === 0) { const T = turrets.find(q => q.id === m.i); if (T && Array.isArray(m.e) && m.e.every(fin)) { const o = new THREE.Vector3(T.x, T.y + 0.9, T.z); fx.tracer(o, new THREE.Vector3(...m.e)); sound.shot('sentry', o); } return; }
  if (m.t === 'take' && H) { if (Number.isInteger(m.id)) takeDrop(m.id, from); return; }
  if (m.t === 'boon' && !H && from === 0) { if (DROPS[m.k] || m.k === 'empty') boon(m.k, Number.isInteger(m.by) ? m.by : 0); return; }
}
function revived(by) { if (!me.down) return; me.down = false; me.hp = 50; say(`${nameOf(by)} revived you.`); }
let sendT = 0, stateT = 0;
function sync(dt) {
  if (!net || !net.live) return; sendT += dt; stateT += dt;
  if (sendT >= 1 / 15) { sendT = 0; net.send({ t: 'p', x: +me.x.toFixed(2), y: +me.y.toFixed(2), z: +me.z.toFixed(2), yaw: +me.yaw.toFixed(3), pi: +me.pitch.toFixed(2), dead: me.dead, down: me.down, torch: SLOTS[slot] === 'torch', g: gunIn(SLOTS[slot]) || '', n: me.name, pt: me.points }); }
  if (net.host && stateT >= 1 / 12) { stateT = 0; net.send({ t: 's', h: hollow.pack(), c: +clock.toFixed(5), d: day, f: fires.map(f => Math.round(f.fuel)), tu: turrets.map(T => [T.id, T.x, T.y, T.z, +T.yaw.toFixed(2), T.ammo]) }); }
}

// ---------------------------------------------------------------- the frame
let last = performance.now(), fpsN = 0, fpsT = 0, msWorst = 0;
const _v = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  const t0 = performance.now(), dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now; frameN++;
  if (mode !== 'play') { renderer.render(scene, camera); return; }
  const pending = world.update(scene, worldMat, world.ready ? 4 : 14);
  if (!world.ready) { if (pending > 0) { $('loading').textContent = `Building the world: ${100 - Math.round(pending)} of 100`; renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); return; } world.ready = true; $('loading').hidden = true; respawnAtStart(); buildMast(); }
  const L = sky(dt);
  if (!panel || panel === 'inv') move(dt);   // (keys move you even when the browser has not given the game the mouse)
  if (lastSlot !== slot) { if (lastSlot >= 0 && gunIn(SLOTS[slot])) switchT = 0.32; lastSlot = slot; reloadT = 0; mining = null; }
  switchT = Math.max(0, switchT - dt);
  if (meleeT > 0) { meleeT -= dt; if (!meleeHit && meleeT < MELEE * 0.62) { meleeHit = true; meleeStrike(); } }
  const gkNow = gunIn(SLOTS[slot]); spin = gkNow === 'minigun' && locked() && (mouseDown[0] || mouseDown[2]) && reloadT <= 0 ? Math.min(GUNS.minigun.spin, spin + dt) : Math.max(0, spin - dt * 1.5); sound.whir(spin / GUNS.minigun.spin);
  if (locked() && mouseDown[0] && !panel) { if (gkNow) shoot(); else if (meleeT <= 0) mine(dt); }
  if (reloadT > 0 && (reloadT -= dt) <= 0) { reloadT = 0; finishReload(); }
  ads += (((mouseDown[2] || testAim) && gunIn(SLOTS[slot]) && reloadT <= 0 && !me.down && switchT <= 0 ? 1 : 0) - ads) * Math.min(1, dt * 14);   // (aiming down the sights: right mouse)
  const fov = SET.fov - 22 * ads + 6 * sprintB; if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  for (const k in buffs) buffs[k] = Math.max(0, buffs[k] - dt);
  if (clock > NIGHT_AT && roundShown !== day) { roundShown = day; sound.round(); bigText('ROUND ' + day, 3.2); }
  if (clock < 0.1 && roundShown === day - 1 && roundEndShown !== day - 1 && day > 1) { roundEndShown = day - 1; sound.roundEnd(); bigText('ROUND SURVIVED', 2.6); }
  prompt = null;
  const downed = [...others.values()].find(p => p.down && !p.dead && Math.hypot(p.x - me.x, p.z - me.z) < 2.4);
  if (downed && !me.down) { prompt = { text: `Hold F to revive ${downed.name}` }; if (keys.KeyF) { reviveT += dt; prompt.text = `Reviving ${downed.name}: ${Math.min(100, Math.round(reviveT / 3 * 100))}%`; if (reviveT > 3) { reviveT = 0; net.send({ t: 'revive', to: downed.pid }); me.points += 150; floatPoints('+150 revive'); say(`Revived ${downed.name}.`); } } else reviveT = 0; }
  else { const d = lookDir(); for (const st of stations) { const dx = st.position.x - me.x, dz = st.position.z - me.z, dist = Math.hypot(dx, dz); if (dist < 2.6 && (dx * d.x + dz * d.z) / dist > 0.55) { const u = st.userData, own = u.kind === 'gun' && me.guns.includes(u.key); prompt = { station: st, text: own ? `Press F: ammo for the ${GUNS[u.key].name} (${Math.floor(u.price / 2)})` : `Press F: ${u.label}` }; } } }
  shotCd = Math.max(0, shotCd - dt); boxT = Math.max(0, boxT - dt);
  // the Hollow: the host spawns and moves them; everyone else draws what it is sent
  if (!net || net.host) {
    const night = clock > NIGHT_AT + 0.02, long = isLong(day), want = night ? Math.min(long ? 150 : 40 + day * 6, 200) * (1 + others.size * 0.35) : 0;   // (more players, more of them, as in Zombies)
    if (night && hollow.z.length < Math.min(want, 240) && t - lastSpawn > (long ? 0.4 : 1.6) / (1 + others.size * 0.4)) {
      lastSpawn = t; const pl = [me, ...others.values()].filter(p => !p.dead && p.y > -40);
      hollow.spawn(world, pl[Math.floor(Math.random() * pl.length)] || me, long ? 1.4 : 1, day, (day <= 10 ? 150 + 50 * (day - 1) : 600 * Math.pow(1.1, day - 10)) * (long ? 1.3 : 1));   // (tougher each round, CoD's curve)
    }
    hollow.step(dt, world, [me, ...others.values()], lights(), L, hurt, fires, (i, a) => { fires[i].fuel = Math.max(0, fires[i].fuel - a); });
    beams(dt); stepTurrets(dt);
  } else hollow.glide(dt);
  hollow.draw(dt); drawFires(t, dt); fx.update(dt);
  if ((groanT -= dt) <= 0 && hollow.z.length) { groanT = 0.9 + Math.random() * 1.2; const k = hollow.z[Math.floor(Math.random() * hollow.z.length)]; if (Math.hypot(k.x - me.x, k.z - me.z) < 30) sound.groan(_v.set(k.x, k.y + 1.8, k.z), k.kind === 'warden'); }
  for (const d of drops) { const g = dropMeshes.get(d.id); if (g) g.rotation.y = t * 1.6; if (!d.asked && !me.dead && Math.hypot(d.x - me.x, d.z - me.z) < 1.3) { if (!net || net.host) takeDrop(d.id, me.pid); else { d.asked = true; net.send({ t: 'take', id: d.id }); } } }
  if (!net || net.host) for (const d of [...drops]) if ((d.t -= dt) <= 0) { removeDrop(d.id); if (net) net.send({ t: 'gone', id: d.id }); }
  const tl = SLOTS[slot] === 'torch' && !me.dead && !me.down; torchLight.intensity = tl ? 1.4 : 0; torchLight.position.set(me.x, me.y + 1.5, me.z); beam.intensity = tl ? 60 : 0;
  drawTurrets();
  drawFriends(dt); drawGhost();
  if (mastLamp) mastLamp.visible = (t % 1.6) < 0.25;
  // the camera: no bob (his rule). Recoil and a flinch kick it and settle smoothly.
  kick += -kick * Math.min(1, dt * 10); flinch += -flinch * Math.min(1, dt * 6);
  camera.position.set(me.x, me.y + (me.down ? 0.7 : 1.62), me.z); camera.rotation.set(me.pitch + kick * 0.035 + flinch * 0.05, me.yaw, 0, 'YXZ');
  sound.listen(me.x, me.y + 1.62, me.z, -Math.sin(me.yaw), 0, -Math.cos(me.yaw));
  drawHeld(dt);
  if ((hitT -= dt) <= 0) $('hit').className = '';
  sync(dt); hud(L, dt);
  if (L > 0.02 && frameN % 2 === 0) renderer.shadowMap.needsUpdate = true;   // (shadows every other frame, and none at night: the sun is down)
  renderer.render(scene, camera);
  // the second pass: what you hold, over the world, lit by the daylight and the fires near you
  const here = Hollow.lightAt(lights(), me.x, me.y + 1, me.z); vhemi.intensity = 0.55 + 1.7 * L + 1.8 * here; vsun.intensity = 0.4 + 1.3 * L;
  vcam.fov = 54 - 8 * ads; vcam.aspect = camera.aspect; vcam.updateProjectionMatrix(); renderer.autoClear = false; renderer.clearDepth(); renderer.render(vscene, vcam); renderer.autoClear = true;
  const ms = performance.now() - t0; msWorst = Math.max(msWorst, ms);
  fpsN++; fpsT += dt; if (fpsT > 0.5) { $('fps').textContent = SET.fps ? `${Math.round(fpsN / fpsT)} fps  ${msWorst.toFixed(1)} ms` : ''; fpsN = 0; fpsT = 0; msWorst = 0; }
}
function drawHeld(dt) {   // what you hold: low right at the hip; aiming brings the sight dead center, steady; reload dips it, sprint drops it, the mouse drags it a hair
  for (const o of Object.values(held)) o.visible = false;
  const it = SLOTS[slot], gk = gunIn(it), key = meleeT > 0 ? 'knife' : gk || (it.startsWith('gun') ? null : it), vm = key && held[key];
  if (!vm || me.dead || (me.down && !gk)) return; vm.visible = true;
  swayX += -swayX * Math.min(1, dt * 9); swayY += -swayY * Math.min(1, dt * 9);
  const u = vm.userData, a = ads * ads * (3 - 2 * ads), still = 1 - a * 0.85;   // (eased, and almost no sway while aiming: a clear, steady sight picture)
  if (meleeT > 0) { const q = 1 - meleeT / MELEE, w = Math.sin(Math.min(1, q * 1.6) * Math.PI); vm.position.set(0.22 - w * 0.3, -0.16 + w * 0.06, -0.32 - w * 0.22); vm.rotation.set(-0.1 - w * 0.25, 0.5 - w * 1.2, -0.4 * w); return; }
  const r = reloadT > 0 ? Math.sin(Math.PI * Math.min(1, 1 - reloadT / (me.reloadOf || 1))) : 0, sw = switchT > 0 ? switchT / 0.32 : 0;
  if (gk) {
    const hip = [0.15, -0.15, -0.16 - u.len * 0.42], aim = [0, -u.top - 0.006, -0.3 - u.len * 0.5];   // (aimed: the sight's top edge on the center line, the back of the gun a forearm away)
    vm.position.set(hip[0] + (aim[0] - hip[0]) * a - swayX * still, hip[1] + (aim[1] - hip[1]) * a + swayY * still - r * 0.1 - sw * 0.25 - sprintB * 0.04, hip[2] + (aim[2] - hip[2]) * a + kick * 0.035 * (1 - a * 0.6));
    vm.rotation.set(-r * 0.3 - sprintB * 0.25 + kick * 0.05 * (1 - a * 0.7), sprintB * 0.65 + (1 - a) * 0.04, r * 0.45);
  } else {
    vm.position.set(0.26 - swayX, -0.27 + swayY - sw * 0.25, -0.5); vm.rotation.set(mining ? Math.sin(performance.now() / 55) * 0.45 : 0, it === 'pickaxe' ? 0.4 : 0.25, 0);
  }
}
function drawFriends(dt) {
  const f = Math.min(1, dt * 12);
  for (const p of others.values()) {
    if (p.ty > -40) { p.x += (p.tx - p.x) * f; p.y += (p.ty - p.y) * f; p.z += (p.tz - p.z) * f; }
    p.fig.visible = p.y > -40 && !p.dead; p.fig.position.set(p.x, p.y, p.z); p.fig.rotation.set(p.down ? -1.4 : 0, p.yaw, 0);
    if (p.heldKey !== p.gun) { if (p.held) p.fig.userData.hands.remove(p.held); p.held = p.gun ? gunModel(p.gun) : null; if (p.held) { p.held.rotation.set(0, 0, 0); p.fig.userData.hands.add(p.held); } p.heldKey = p.gun; }
    p.fig.userData.hands.rotation.x = p.pitch; p.fig.userData.cone.visible = p.torch && !p.down;
    // the marker over their head: name and how far, seen through walls, red when they need a revive
    _v.set(p.x, p.y + 2.25, p.z).project(camera); const vis = p.fig.visible && _v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1;
    p.mark.hidden = !vis; if (vis) { p.mark.style.transform = `translate(${(_v.x * 0.5 + 0.5) * innerWidth}px, ${(-_v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`; const txt = `${p.name}  ${Math.round(Math.hypot(p.x - me.x, p.z - me.z))} m${p.down ? '  REVIVE' : ''}`; if (p.mark.textContent !== txt) p.mark.textContent = txt; p.mark.classList.toggle('down', p.down); }
  }
}
function makeMark(p) { p.mark = document.createElement('div'); p.mark.className = 'mark'; p.mark.hidden = true; $('hud').append(p.mark); }
function buildMast() { if (!world.mast || mastLamp) return; mastLamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xff3355, fog: false })); mastLamp.position.set(...world.mast); scene.add(mastLamp); }
function bigText(t, s) { const e = $('roundBig'); e.textContent = t; e.className = 'show'; clearTimeout(bigText.h); bigText.h = setTimeout(() => e.className = '', s * 1000); }
function landNear(cx, cz) {   // (the nearest open ground to a point, spiraling out)
  for (let r = 0; r < 70; r++) for (let a = 0; a < 8 * Math.max(1, r); a++) { const x = Math.round(cx + Math.cos(a / (8 * Math.max(1, r)) * Math.PI * 2) * r), z = Math.round(cz + Math.sin(a / (8 * Math.max(1, r)) * Math.PI * 2) * r);
    const h = world.height(x, z), top = world.get(x, h - 1, z); if ([B.GRASS, B.CONCRETE, B.ASPHALT].includes(top) && h === world.height(x + 1, z)) return [x + 0.5, z + 0.5]; }
  return [cx, cz];
}
function respawnAtStart() {
  const f = fires.find(q => !q.small); const [x, z] = f ? landNear(f.x + 2, f.z) : landNear(80, 80);
  me.x = x; me.z = z; me.y = world.height(Math.floor(x), Math.floor(z)) + 0.5;
  if (!fires.length && (!net || net.host)) { const [fx2, fz2] = landNear(80, 80); placeFire(fx2, world.height(Math.floor(fx2), Math.floor(fz2)), fz2, 300, true, false); me.x = fx2 + 2; me.z = fz2; me.y = world.height(Math.floor(me.x), Math.floor(me.z)) + 0.5; }
}

// ---------------------------------------------------------------- the HUD (each piece is only rewritten when what it shows changed)
const last$ = {};
const txt = (id, v) => { if (last$[id] !== v) { last$[id] = v; $(id).textContent = v; } };
const html = (id, v) => { if (last$[id] !== v) { last$[id] = v; $(id).innerHTML = v; } };
const wid = (id, v) => { v = Math.round(v); if (last$[id] !== v) { last$[id] = v; $(id).style.width = v + '%'; } };
const COMPASS = [['N', 0], ['NE', -Math.PI / 4], ['E', -Math.PI / 2], ['SE', -3 * Math.PI / 4], ['S', Math.PI], ['SW', 3 * Math.PI / 4], ['W', Math.PI / 2], ['NW', Math.PI / 4]];
function bearing(x, z) { return Math.atan2(-(x - me.x), -(z - me.z)); }
function compass() {
  const items = COMPASS.map(([l, a]) => [l, a, l.length > 1 ? 'm' : '']);
  const f = fires.filter(q => q.fuel > 0 && !q.small).sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
  if (f && Math.hypot(f.x - me.x, f.z - me.z) > 6) items.push(['FIRE', bearing(f.x, f.z), 'fire']);
  for (const p of others.values()) if (p.y > -40) items.push([p.name.toUpperCase(), bearing(p.x, p.z), p.down ? 'down' : 'friend']);
  if (world.mast) items.push(['MAST', bearing(world.mast[0], world.mast[2]), 'mast']);
  let s = '';
  for (const [l, a, c] of items) { let rel = a - me.yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel)); if (Math.abs(rel) > 1.25) continue; s += `<span class="${c}" style="left:${(50 - rel / 1.25 * 50).toFixed(1)}%">${l}</span>`; }
  html('compass', s);
}
function hud(L, dt) {
  wid('hp', me.hp); wid('st', me.stamina); wid('hu', me.hunger);
  const sig = SLOTS.map((s, i) => `${i === slot}${s.startsWith('gun') ? gunIn(s) : inv[s]}`).join();
  if (last$.slots !== sig) { last$.slots = sig; $('slots').innerHTML = SLOTS.map((s, i) => { const g = s.startsWith('gun') ? gunIn(s) : null, n = s.startsWith('gun') || ['pickaxe', 'torch'].includes(s) ? '' : inv[s]; return `<div class="slot${i === slot ? ' on' : ''}${n === 0 ? ' none' : ''}" data-i="${i}"><b>${i + 1}</b><span>${s.startsWith('gun') ? (g ? GUNS[g].name : 'empty') : SLOT_NAME[s]}</span><i>${n}</i></div>`; }).join(''); }
  const gk = gunIn(SLOTS[slot]), am = gk && me.ammo[gk];
  html('ammo', gk ? `<b class="${am.mag <= Math.ceil(magOf(gk) * 0.25) ? 'low' : ''}">${am.mag}</b><span>/ ${am.res}</span><small>${GUNS[gk].name}${me.forged.has(gk) ? ' MARK II' : ''}</small>` : '');
  txt('warn', gk === 'minigun' && spin < GUNS.minigun.spin && spin > 0 ? 'SPINNING UP' : gk && reloadT <= 0 ? (am.mag === 0 && am.res === 0 ? 'NO AMMO' : am.mag <= Math.ceil(magOf(gk) * 0.25) && am.res > 0 ? 'RELOAD (R)' : '') : reloadT > 0 ? 'RELOADING' : '');
  txt('prompt', prompt ? prompt.text : (me.down ? `Down: ${Math.ceil(me.bleed)} s until you bleed out` : ''));
  txt('perks', [...me.perks].map(k => PERKS[k].name).join('   '));
  txt('round', String(day));
  const h = Math.floor(((clock * 24) + 6) % 24), mm = Math.floor((clock * 24 * 60) % 60), toLong = (LONG_EVERY - day % LONG_EVERY) % LONG_EVERY;
  txt('clockT', `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  txt('clockS', toLong === 0 ? (clock > NIGHT_AT ? 'THE LONG NIGHT' : 'the Long Night is tonight') : clock > NIGHT_AT ? `night ${day}: hold out till dawn` : `night falls in ${Math.max(0, Math.ceil((NIGHT_AT - clock) * DAY / 60))} min`);
  const nf = fires.filter(f => f.fuel > 0).map(f => [f, Math.hypot(f.x - me.x, f.z - me.z)]).sort((a, b) => a[1] - b[1])[0];
  txt('fire', nf && nf[1] < 10 ? `${nf[0].small ? 'Lantern' : 'Fire'}: ${Math.floor(nf[0].fuel / 60)}:${String(Math.floor(nf[0].fuel % 60)).padStart(2, '0')} left${nf[0].small ? '' : ' (right-click it with planks to feed it)'}` : '');
  txt('count', hollow.z.length ? `${hollow.z.length} in the dark` : '');
  const board = [[me.pid, me.name || 'You', me.points, true], ...[...others.values()].map(p => [p.pid, p.name, p.points, false, p.down])].sort((a, b) => a[0] - b[0]);
  html('board', board.map(([, n, pts, mine, down]) => `<div class="${mine ? 'me' : down ? 'down' : ''}"><span>${n.replace(/[<&>"]/g, '')}</span><b>${pts.toLocaleString()}</b></div>`).join(''));
  html('buffs', Object.entries(buffs).filter(([, v]) => v > 0).map(([k, v]) => `<span class="${k}">${DROPS[k].name} ${Math.ceil(v)}</span>`).join(''));
  txt('mp', net ? (net.live || others.size ? `ROOM ${net.code}  ${others.size + 1} of ${MAX_PLAYERS}${net.locked ? '  locked' : ''}` : net.host ? `ROOM ${net.code}: waiting for friends (Esc, then COPY INVITE)` : '') : '');
  if ((msgT -= dt) <= 0) { msgT = 0; txt('msg', ''); }
  if (dmgT > 0) { dmgT -= dt; $('dmg').style.opacity = Math.max(0, dmgT).toFixed(2); }
  const spread = gk ? GUNS[gk].spread * 900 * (me.onGround ? 1 : 2) + kick * 14 : 4; $('cross').style.setProperty('--g', (4 + spread).toFixed(1) + 'px'); $('cross').style.opacity = (gk ? 1 - ads : 0.6) * (1 - sprintB);
  $('mine').style.width = mining ? Math.min(100, mining.t / (HARD[world.get(mining.x, mining.y, mining.z)] || 1) * 100) + '%' : '0';
  compass();
}

// ---------------------------------------------------------------- the panels: the bag (Tab), the menu (Esc), settings. Every one has a BACK.
function togglePanel(which) {
  if (panel === which && which !== 'pause') { closePanel(); return; }
  panel = which; for (const id of ['inv', 'paused', 'settings']) $(id).hidden = true;
  $({ inv: 'inv', pause: 'paused', settings: 'settings' }[which]).hidden = false;
  mouseDown.fill(false); if (document.pointerLockElement) document.exitPointerLock();
  if (which === 'inv') drawBag(); if (which === 'pause') drawPause(); if (which === 'settings') drawSettings();
}
function closePanel() { panel = null; for (const id of ['inv', 'paused', 'settings']) $(id).hidden = true; lockMouse(); }
function bar(v, max) { return `<i><u style="width:${Math.round(Math.min(1, v / max) * 100)}%"></u></i>`; }
function drawBag() {
  const gun = (g, i) => g ? `<button class="card${gunIn(SLOTS[slot]) === g ? ' on' : ''}" data-hold="${i}"><b>${GUNS[g].name}</b><small>${me.ammo[g].mag} in the gun, ${me.ammo[g].res} spare</small>
      <div class="stat">damage ${bar(GUNS[g].dmg * (GUNS[g].pellets || 1), 280)}</div><div class="stat">fire rate ${bar(GUNS[g].rpm, 800)}</div><div class="stat">magazine ${bar(GUNS[g].mag, 45)}</div><div class="stat">control ${bar(0.1 - GUNS[g].recoil, 0.1)}</div></button>`
    : `<div class="card empty"><b>Empty</b><small>buy a gun off the walls at the base (F)</small></div>`;
  const items = SLOTS.slice(2).map((s, i) => { const n = ['pickaxe', 'torch'].includes(s) ? '' : inv[s]; return `<button class="item${SLOTS[slot] === s ? ' on' : ''}${n === 0 ? ' none' : ''}" data-hold="${i + 2}"><b>${SLOT_NAME[s]}</b><i>${n}</i><small>${SAYS[s]}</small></button>`; }).join('');
  const recipes = Object.entries(RECIPES).map(([k, R]) => { const ok = Object.entries(R.needs).every(([i, n]) => inv[i] >= n); return `<button class="key${ok ? '' : ' off'}" data-craft="${k}">CRAFT<small>(${R.says})</small></button>`; }).join('');
  $('invBody').innerHTML = `<section><h3>GUNS</h3>${gun(me.guns[0], 0)}${gun(me.guns[1], 1)}<h3>PERKS</h3><p class="perk">${[...me.perks].map(k => `<b>${PERKS[k].name}</b>: ${PERKS[k].says}`).join('<br>') || 'None yet: perk machines at the base glow pink.'}</p></section>
    <section><h3>CARRYING</h3><div class="items">${items}</div></section>
    <section><h3>MAKE</h3>${recipes}<button class="key${inv.berries > 0 && me.hunger < 100 ? '' : ' off'}" data-eat="1">EAT<small>(1 berry: food +25, health +5)</small></button>
      <h3>THIS GAME</h3><p class="perk">Round ${day}. ${me.kills} kills, ${me.heads} headshots. ${me.points.toLocaleString()} points.</p></section>`;
}
$('invBody').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.hold && hasItem(+b.dataset.hold)) { slot = +b.dataset.hold; } if (b.dataset.craft) craft(b.dataset.craft); if (b.dataset.eat) eat(); drawBag(); });
$('slots').addEventListener('click', e => { const s = e.target.closest('.slot'); if (s && hasItem(+s.dataset.i)) slot = +s.dataset.i; });
function drawPause() {
  const H = net && net.host, list = [...others.values()].map(p => `<div class="row"><span>${p.name.replace(/[<&>"]/g, '')}</span>${H ? `<button class="mini" data-kick="${p.pid}">REMOVE</button>` : ''}</div>`).join('');
  $('pauseNet').innerHTML = net ? `<div class="code">ROOM <b>${net.code}</b></div>
      <button class="key" id="copyInvite">COPY INVITE<small>(a link with the code in it: paste it in Discord, friends click it)</small></button>
      ${H ? `<button class="key" id="lockRoom">${net.locked ? 'UNLOCK THE ROOM' : 'LOCK THE ROOM'}<small>(${net.locked ? 'let new friends in again' : 'nobody new can join, even with the code'})</small></button>` : ''}
      <div class="who"><div class="row"><span>${(me.name || 'You').replace(/[<&>"]/g, '')} (you${H ? ', host' : ''})</span></div>${list}</div>` : '<p class="perk">Playing alone. HOST A GAME from the start screen to play with friends.</p>';
}
$('paused').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'resume') closePanel();
  if (b.id === 'openBag') togglePanel('inv');
  if (b.id === 'openSettings') togglePanel('settings');
  if (b.id === 'leave') location.href = location.pathname;
  if (b.id === 'copyInvite') { const url = `${location.origin}${location.pathname}#join=${net.code}`; navigator.clipboard?.writeText(url).then(() => { b.firstChild.textContent = 'COPIED'; setTimeout(() => b.firstChild.textContent = 'COPY INVITE', 1500); }, () => { b.querySelector('small').textContent = url; }); }
  if (b.id === 'lockRoom') { net.lock(!net.locked); drawPause(); }
  if (b.dataset.kick) { net.kick(+b.dataset.kick); setTimeout(drawPause, 400); }
});
function drawSettings() {
  $('setBody').innerHTML = `<label>Mouse speed <b id="vSens">${SET.sens.toFixed(2)}</b><input type="range" id="sSens" min="0.2" max="3" step="0.05" value="${SET.sens}"></label>
    <label>Field of view <b id="vFov">${SET.fov}</b><input type="range" id="sFov" min="65" max="105" step="1" value="${SET.fov}"></label>
    <label>Volume <b id="vVol">${Math.round(SET.vol * 100)}</b><input type="range" id="sVol" min="0" max="1" step="0.05" value="${SET.vol}"></label>
    <label>Sharpness <b id="vSharp">${SET.sharp === 1 ? 'full' : 'faster'}</b><input type="range" id="sSharp" min="0.5" max="1" step="0.25" value="${SET.sharp}"></label>
    <label class="tick"><input type="checkbox" id="sFps" ${SET.fps ? 'checked' : ''}> Show frames per second</label>`;
}
$('settings').addEventListener('input', e => {
  const id = e.target.id, v = +e.target.value;
  if (id === 'sSens') { SET.sens = v; $('vSens').textContent = v.toFixed(2); }
  if (id === 'sFov') { SET.fov = v; $('vFov').textContent = v; }
  if (id === 'sVol') { SET.vol = v; sound.setVolume(v); $('vVol').textContent = Math.round(v * 100); }
  if (id === 'sSharp') { SET.sharp = v; sizeRenderer(); $('vSharp').textContent = v === 1 ? 'full' : v >= 0.75 ? 'balanced' : 'faster'; }
  if (id === 'sFps') SET.fps = e.target.checked;
  saveSettings();
});
$('setBack').onclick = () => togglePanel('pause');
$('invBack').onclick = () => closePanel();

// ---------------------------------------------------------------- start
function start(s, host) {
  seed = s; world = new World(seed); world.ready = false; world.listen = (x, y, z, b) => { if (net) net.send({ t: 'e', e: [x, y, z, b] }); }; mode = 'play'; if (location.search.includes('night')) clock = NIGHT_AT + 0.03; /* (?night: start at nightfall, for testing) */ $('menu').hidden = true; $('hud').hidden = false; $('loading').hidden = false;
  sound.wake(); lockMouse();
}
function myName() { me.name = cleanName($('name').value) || 'Player'; SET.name = me.name; saveSettings(); }
$('name').value = SET.name || '';
function readInvite() { const invite = cleanCode((location.hash.match(/join=([A-Za-z]+)/) || [])[1]); if (invite.length === CODE_LEN && mode === 'menu') { $('code').value = invite; $('menuNote').textContent = `Your friend's room ${invite} is filled in: type your name, then click JOIN.`; } }
readInvite(); addEventListener('hashchange', readInvite);   // (an invite link pasted into a tab that is already open works too)
$('solo').onclick = () => { myName(); start(Math.floor(Math.random() * 1e9), true); };
$('host').onclick = () => { myName(); const code = roomCode(); net = new Net(onNet, s => say(s, 6)); net.hostGame(code); start(Math.floor(Math.random() * 1e9), true); say(`Room ${code} is open. Esc, then COPY INVITE, and paste it to your friends.`, 12); };
$('join').onclick = () => { myName(); const code = cleanCode($('code').value); if (code.length !== CODE_LEN) { $('menuNote').textContent = `Room codes are ${CODE_LEN} letters.`; return; } net = new Net(onNet, s => { $('menuNote').textContent = s; if (mode === 'play') say(s, 6); }); net.joinGame(code); sound.wake(); $('menuNote').textContent = `Joining room ${code}...`; };
requestAnimationFrame(frame);
window.lastfire = { set aim(v) { testAim = v; }, turrets, held, melee, get spin() { return spin; }, addTurret, get world() { return world; }, got, me, hollow, stations, others, renderer, get net() { return net; }, drops, buffs, shoot: () => { shotReady = true; shotCd = 0; switchT = 0; shoot(); }, get prompt() { return prompt; }, interact, togglePanel, get panel() { return panel; }, get slot() { return slot; }, set slot(v) { slot = v; }, inv, aimAt: k => { const dx = k.x - me.x, dz = k.z - me.z, dy = k.y + 1.4 - (me.y + 1.62); me.yaw = Math.atan2(-dx, -dz); me.pitch = Math.atan2(dy, Math.hypot(dx, dz)); } };   // (a handle for the automated test; nothing in play uses it)
