// Last Fire: the game. Player, light, day and night, building, crafting, the Hollow, and the two-player link.
import * as THREE from 'three';
import { World, B, NAMES, HARD, DROP, SIZE } from './world.js';
import { Hollow } from './hollow.js';
import { Net, roomCode } from './net.js';
import { GUNS, PERKS, POINTS, sound, makeStation } from './combat.js';

const $ = id => document.getElementById(id);
const DAY = 360, NIGHT_AT = 0.62, LONG_EVERY = 7;   // (a day is 6 minutes; night starts 62% in; every 7th night is the Long Night)

// ---------------------------------------------------------------- renderer, scene, light
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 400);
scene.fog = new THREE.FogExp2(0x8fb3d9, 0.012);
const hemi = new THREE.HemisphereLight(0xbfd6ff, 0x3a2f28, 0.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 220 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const stars = (() => { const n = 1400, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 0.9 + 0.1), r = 300; p.set([Math.cos(a) * Math.sin(b) * r, Math.cos(b) * r, Math.sin(a) * Math.sin(b) * r], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false })); scene.add(m); return m; })();
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe7b0, fog: false })); scene.add(sunDisc);
const moonDisc = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xc9d4ff, fog: false })); scene.add(moonDisc);
const worldMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });

// ---------------------------------------------------------------- state
let world = null, hollow = new Hollow(scene), net = null, mode = 'menu', seed = 0;
const me = { x: 80, y: 30, z: 80, vy: 0, yaw: 0, pitch: 0, hp: 100, stamina: 100, hunger: 100, dead: false, down: false, isPlayer: true, onGround: false, points: 500, perks: new Set(), guns: ['pistol', null], ammo: { pistol: { mag: 8, res: 64 } } };
const other = { x: 0, y: -50, z: 0, yaw: 0, hp: 100, dead: false, isPlayer: true, seen: false };
const inv = { pickaxe: 1, torch: 1, planks: 6, cobble: 0, dirt: 0, sand: 0, berries: 3, campfire: 1 };
const SLOTS = ['gun1', 'gun2', 'pickaxe', 'torch', 'planks', 'cobble', 'campfire', 'berries'];
const SLOT_NAME = { pickaxe: 'Pickaxe', torch: 'Torch', planks: 'Planks', cobble: 'Stone', campfire: 'Campfire', berries: 'Berries' };
const gunIn = s => s === 'gun1' ? me.guns[0] : s === 'gun2' ? me.guns[1] : null;   // (two guns at a time, CoD's rule)
let stations = [], reloadT = 0, ads = 0, hitT = 0, prompt = null, reviveT = 0, roundShown = 0, shotReady = true;
let slot = 0, clock = 0.25, day = 1, fires = [], lastSpawn = 0, mining = null, shotCd = 0, msgT = 0, mouseDown = [false, false, false];
const keys = {}, otherMesh = playerFigure(0x39e6ff); scene.add(otherMesh);
const firePool = Array.from({ length: 6 }, () => { const l = new THREE.PointLight(0x8fb4ff, 0, 14, 1.6); scene.add(l); return l; });   // (six real fire lights at most: the nearest six fires)
const fireMeshes = new THREE.Group(); scene.add(fireMeshes);
const torchLight = new THREE.PointLight(0xa6c4ff, 0, 9, 1.8); scene.add(torchLight);
const view = new THREE.Group(); camera.add(view); scene.add(camera); buildViewModels();

function playerFigure(color) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.0, 4, 8), m); body.position.y = 0.9; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), new THREE.MeshStandardMaterial({ color: 0xe8e6f0, roughness: 0.5 })); head.position.y = 1.62; head.castShadow = true;
  g.add(body, head); return g;
}
function buildViewModels() {   // what you hold, in the corner of your view
  const pick = new THREE.Group(); const hand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.55), new THREE.MeshStandardMaterial({ color: 0x6b4a2e }));
  const headM = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0x8c9099, metalness: 0.6, roughness: 0.4 })); headM.position.z = -0.27; pick.add(hand, headM);
  const gun = new THREE.Group(); gun.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.36), new THREE.MeshStandardMaterial({ color: 0x23252e, metalness: 0.5, roughness: 0.35 })));
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.08), new THREE.MeshStandardMaterial({ color: 0x14151b })); grip.position.set(0, -0.11, 0.1); gun.add(grip);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xdfe8ff })); flash.position.z = -0.24; flash.visible = false; gun.add(flash); gun.userData.flash = flash;
  const torch = new THREE.Group(); torch.add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.42, 6), new THREE.MeshStandardMaterial({ color: 0x5a3d24 })));
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 7), new THREE.MeshBasicMaterial({ color: 0x9fd8ff })); flame.position.y = 0.27; torch.add(flame); torch.userData.flame = flame;
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshStandardMaterial({ color: 0xa88052, roughness: 0.9 }));
  for (const [k, o] of Object.entries({ pickaxe: pick, pistol: gun, torch, block })) { o.position.set(0.34, -0.3, -0.55); o.visible = false; o.name = k; view.add(o); }
}

// ---------------------------------------------------------------- input (the game asks for the mouse once you click in)
addEventListener('keydown', e => { keys[e.code] = true;
  if (mode !== 'play') return;
  const n = parseInt(e.key); if (n >= 1 && n <= SLOTS.length) slot = n - 1;
  if (e.code === 'KeyC') craft();
  if (e.code === 'KeyE') eat();
  if (e.code === 'KeyR') reload();
  if (e.code === 'KeyF') interact();
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('wheel', e => { if (mode === 'play') slot = (slot + (e.deltaY > 0 ? 1 : -1) + SLOTS.length) % SLOTS.length; });
renderer.domElement.addEventListener('click', () => { if (mode === 'play' && !document.pointerLockElement) renderer.domElement.requestPointerLock(); });
addEventListener('mousemove', e => { if (document.pointerLockElement !== renderer.domElement) return; me.yaw -= e.movementX * 0.0022; me.pitch = Math.max(-1.55, Math.min(1.55, me.pitch - e.movementY * 0.0022)); });
addEventListener('mousedown', e => { if (document.pointerLockElement) { mouseDown[e.button] = true; if (e.button === 2 && !gunIn(SLOTS[slot])) use(); if (e.button === 0) shotReady = true; } });
addEventListener('mouseup', e => { mouseDown[e.button] = false; if (e.button === 0) mining = null; });
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => { $('paused').hidden = !(mode === 'play' && !document.pointerLockElement); });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ---------------------------------------------------------------- actions
function say(t, s = 3) { $('msg').textContent = t; msgT = s; }
function lookDir() { return new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(me.pitch, me.yaw, 0, 'YXZ')); }
function eye() { return new THREE.Vector3(me.x, me.y + 1.62, me.z); }
function craft() { if (inv.planks >= 4) { inv.planks -= 4; inv.campfire++; say('Crafted a campfire (4 planks).'); } else say('A campfire needs 4 planks.'); }
function eat() { if (inv.berries > 0 && me.hunger < 100) { inv.berries--; me.hunger = Math.min(100, me.hunger + 25); me.hp = Math.min(100, me.hp + 5); say('Ate berries.'); } }
function use() {   // right click: place what you hold, feed a fire, or eat
  const it = SLOTS[slot], hit = world.ray(eye(), lookDir(), 6); if (gunIn(it)) return;
  if (it === 'berries') return eat();
  const near = fires.findIndex(f => Math.hypot(f.x - me.x, f.z - me.z) < 3 && hit && Math.floor(f.x) === hit.x && Math.floor(f.z) === hit.z);
  if (it === 'planks' && near >= 0) { if (inv.planks > 0) { inv.planks--; addFuel(near, 90); say('Fed the fire: +90 seconds.'); } return; }
  if (!hit || !hit.place) return;
  const [x, y, z] = hit.place;
  if (Math.abs(x + 0.5 - me.x) < 0.8 && Math.abs(z + 0.5 - me.z) < 0.8 && y >= Math.floor(me.y) - 0.1 && y <= me.y + 1.8) return;   // (not inside yourself)
  if (it === 'campfire' && inv.campfire > 0) { inv.campfire--; placeFire(x + 0.5, y, z + 0.5, 240, true); return; }
  const blockOf = { planks: B.PLANKS, cobble: B.COBBLE };
  if (blockOf[it] && inv[it] > 0) { inv[it]--; editBlock(x, y, z, blockOf[it]); }
}
function editBlock(x, y, z, b, fromNet = false) { if (world.set(x, y, z, b) && !fromNet && net && net.live) net.send({ t: 'e', e: [x, y, z, b] }); }
function placeFire(x, y, z, fuel, send) { const f = { x, y, z, fuel, r: 8, big: false }; fires.push(f); if (fires.length === 1) placeStations(f); if (send && net && net.live) net.send({ t: 'fire', f: [x, y, z, fuel] }); }
function addFuel(i, s, send = true) { fires[i].fuel = Math.min(900, fires[i].fuel + s); if (send && net && net.live) net.send({ t: 'feed', i, s }); }
function shoot() {
  const key = gunIn(SLOTS[slot]); if (!key || shotCd > 0 || reloadT > 0 || me.down) return;
  const G = GUNS[key], am = me.ammo[key];
  if (!G.auto && !shotReady) return; shotReady = false;
  if (am.mag <= 0) { sound.click(); if (am.res > 0) reload(); shotCd = 0.25; return; }
  am.mag--; shotCd = 60 / G.rpm; sound.shot(G.pitch, 0.45);
  const vm = view.getObjectByName('pistol'); vm.userData.flash.visible = true; setTimeout(() => vm.userData.flash.visible = false, 45); vm.position.z = -0.42;
  const spread = G.spread * (ads > 0.5 ? 0.3 : 1) * (me.onGround ? 1 : 2), o = eye();
  for (let i = 0; i < (G.pellets || 1); i++) {
    const d = lookDir(); d.x += (Math.random() - 0.5) * spread * 2; d.y += (Math.random() - 0.5) * spread * 2; d.z += (Math.random() - 0.5) * spread * 2; d.normalize();
    const wall = world.ray(o, d, 80), max = wall ? wall.dist : 80;
    if (!net || net.host) { const r = applyShot(o, d, max, G.dmg, G.head); if (r) award(r); }
    else net.send({ t: 'shot', o: [o.x, o.y, o.z], d: [d.x, d.y, d.z], m: max, dmg: G.dmg, head: G.head });
  }
  me.pitch = Math.min(1.55, me.pitch + G.recoil * (ads > 0.5 ? 0.6 : 1)); me.yaw += (Math.random() - 0.5) * G.recoil * 0.4;   // (recoil kicks the view up)
}
function reload() {
  const key = gunIn(SLOTS[slot]); if (!key || reloadT > 0) return; const G = GUNS[key], am = me.ammo[key];
  if (am.mag >= G.mag || am.res <= 0) return; reloadT = G.reload * (me.perks.has('quick') ? 0.5 : 1); sound.click();
}
function finishReload() { const key = gunIn(SLOTS[slot]); if (!key) return; const G = GUNS[key], am = me.ammo[key], n = Math.min(G.mag - am.mag, am.res); am.mag += n; am.res -= n; }
function applyShot(o, d, max, dmg, headMult) {   // the host's word on a shot: what it hit, and whether it killed
  const h = hollow.hit(o, d, max); if (!h) return null;
  const head = h.mult > 1; h.k.hp -= dmg * (head ? headMult : 1); h.k.x += d.x * 0.25; h.k.z += d.z * 0.25;
  return { head, kill: h.k.hp <= 0 };
}
function award(r) {   // points the CoD way, a hit marker and its tick
  me.points += POINTS.hit + (r.kill ? (r.head ? POINTS.head : POINTS.kill) : 0); hitT = r.kill ? 0.25 : 0.12; $('hit').className = r.head ? 'head' : r.kill ? 'kill' : 'on'; sound.hit(r.head);
  floatPoints('+' + (POINTS.hit + (r.kill ? (r.head ? POINTS.head : POINTS.kill) : 0)));
}
function floatPoints(t) { const e = document.createElement('div'); e.className = 'pts'; e.textContent = t; e.style.left = (52 + Math.random() * 6) + '%'; $('hud').append(e); setTimeout(() => e.remove(), 900); }
function interact() {   // F: buy what you look at, or revive the other player (held)
  if (!prompt || !prompt.station) return; const st = prompt.station.userData;
  if (st.kind === 'gun') {
    const owned = me.guns.indexOf(st.key);
    if (owned >= 0) { const cost = Math.floor(st.price / 2); if (me.points < cost) return say('Not enough points.'); me.points -= cost; me.ammo[st.key].res = GUNS[st.key].reserve; sound.buy(); say(`Ammo for the ${GUNS[st.key].name}.`); return; }
    if (me.points < st.price) return say('Not enough points.');
    me.points -= st.price; const at = me.guns[1] === null ? 1 : (SLOTS[slot] === 'gun2' ? 1 : 0); me.guns[at] = st.key; me.ammo[st.key] = { mag: GUNS[st.key].mag, res: GUNS[st.key].reserve }; slot = at; sound.buy(); say(`Bought the ${GUNS[st.key].name}.`);
  } else {
    if (me.perks.has(st.key)) return say('You already have it.'); if (me.perks.size >= 3) return say('Three perks at most.');
    if (me.points < st.price) return say('Not enough points.'); me.points -= st.price; me.perks.add(st.key); sound.buy(); say(`${PERKS[st.key].name}: ${PERKS[st.key].says}.`);
  }
}
function placeStations(f) {   // the base: wall-buys and perk machines in a ring round the first fire (the same for both players: it is built from the fire)
  if (stations.length || !world) return;
  const ring = [['gun', 'smg'], ['gun', 'shotgun'], ['gun', 'rifle'], ['perk', 'iron'], ['gun', 'lmg'], ['perk', 'quick'], ['perk', 'fleet']];
  ring.forEach(([kind, key], i) => { const a = i / ring.length * Math.PI * 2, x = f.x + Math.cos(a) * 6, z = f.z + Math.sin(a) * 6, y = world.height(Math.floor(x), Math.floor(z));
    const st = makeStation(kind, key, x, y, z, Math.atan2(f.x - x, f.z - z)); scene.add(st); stations.push(st); });
}
function mine(dt) {
  const hit = world.ray(eye(), lookDir(), 5);
  if (!hit) { mining = null; return; }
  if (!mining || mining.x !== hit.x || mining.y !== hit.y || mining.z !== hit.z) mining = { x: hit.x, y: hit.y, z: hit.z, t: 0 };
  mining.t += dt * (SLOTS[slot] === 'pickaxe' ? 2.2 : 1);
  if (mining.t >= (HARD[hit.b] || 1)) {
    const drop = DROP[hit.b]; editBlock(hit.x, hit.y, hit.z, B.AIR); mining = null;
    const into = { [B.PLANKS]: 'planks', [B.COBBLE]: 'cobble', [B.DIRT]: 'dirt', [B.SAND]: 'sand' }[drop];
    if (hit.b === B.LOG) inv.planks += 3; else if (into) inv[into]++;
    if (hit.b === B.LEAVES && Math.random() < 0.35) { inv.berries++; say('Found berries.'); }
  }
}

// ---------------------------------------------------------------- the clock: day, night, the Long Night
function daylightAt(c) { return Math.max(0, Math.min(1, Math.sin(c * Math.PI * 2 / (NIGHT_AT * 2)) * 1.6)) * (c < NIGHT_AT ? 1 : 0); }
function isLong(d) { return d % LONG_EVERY === 0; }
function sky(dt) {
  clock += dt / (DAY * (isLong(day) && clock > NIGHT_AT ? 1.6 : 1));   // (the Long Night lasts 60% longer)
  if (clock >= 1) { clock -= 1; day++; say(isLong(day) ? `Day ${day}. Tonight is the Long Night.` : `Day ${day}.`, 5); }
  const L = daylightAt(clock), a = clock / NIGHT_AT * Math.PI;   // (the sun crosses the sky by day; the moon by night)
  const sp = new THREE.Vector3(Math.cos(a) * 160, Math.sin(a) * 140, 40).add(new THREE.Vector3(me.x, 0, me.z));
  sun.position.copy(sp); sun.target.position.set(me.x, 0, me.z); sun.intensity = 2.4 * L;
  sunDisc.position.copy(sp); sunDisc.visible = L > 0.02;
  const ma = (clock - NIGHT_AT) / (1 - NIGHT_AT) * Math.PI; moonDisc.position.set(me.x + Math.cos(ma) * 160, Math.sin(ma) * 120, me.z - 60); moonDisc.visible = clock > NIGHT_AT;
  const nightCol = isLong(day) ? new THREE.Color(0x060208) : new THREE.Color(0x05070f), dayCol = new THREE.Color(0x8fb3d9), dusk = new THREE.Color(0xd9748c);
  const c = new THREE.Color().copy(nightCol).lerp(dayCol, L); if (L > 0 && L < 0.5) c.lerp(dusk, (0.5 - L) * 0.5);
  scene.background = c; scene.fog.color.copy(c); scene.fog.density = 0.012 + (1 - L) * 0.035;
  hemi.intensity = 0.16 + 0.52 * L; hemi.color.setHex(L > 0.2 ? 0xbfd6ff : 0x6f86c9);   // (a faint blue moonlight at night: dark, never pitch black) stars.material.opacity = 1 - L; renderer.toneMappingExposure = 0.9 + (1 - L) * 0.5;
  return L;
}

// ---------------------------------------------------------------- the player
function move(dt) {
  if (me.dead) return;
  if (me.down) { me.bleed -= dt; if (me.bleed <= 0) { me.down = false; me.hp = 1; hurt(me, 999); } }
  const fleet = me.perks.has('fleet'), sprint = keys.ShiftLeft && me.stamina > 1 && me.onGround && !me.down, speed = me.down ? 0.8 : (sprint ? (fleet ? 8.4 : 7.2) : (fleet ? 5 : 4.4)) * (1 - ads * 0.35);
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const sinY = Math.sin(me.yaw), cosY = Math.cos(me.yaw);
  let vx = (-sinY * f + cosY * s), vz = (-cosY * f - sinY * s); const len = Math.hypot(vx, vz) || 1; vx = vx / len * speed * dt; vz = vz / len * speed * dt;
  if (f || s) { me.stamina = Math.max(0, me.stamina - (sprint ? (fleet ? 7 : 14) : 0) * dt); } if (!sprint) me.stamina = Math.min(100, me.stamina + 9 * dt);
  const free = (x, y, z) => !world.solid(x - 0.3, y, z - 0.3) && !world.solid(x + 0.3, y, z - 0.3) && !world.solid(x - 0.3, y, z + 0.3) && !world.solid(x + 0.3, y, z + 0.3);
  const fits = (x, y, z) => free(x, y + 0.05, z) && free(x, y + 0.9, z) && free(x, y + 1.75, z);
  // (his 'nobody can move', 2026-10-18: a step up worked only sideways, so W walked into every one-block rise as a wall; now every way steps up)
  const stepTo = (nx, nz) => { if (fits(nx, me.y, nz)) { me.x = nx; me.z = nz; return; } if (me.onGround && fits(nx, me.y + 1.02, nz) && fits(me.x, me.y + 1.02, me.z)) { me.x = nx; me.z = nz; me.y = Math.floor(me.y + 1.02); } };
  stepTo(me.x + vx, me.z); stepTo(me.x, me.z + vz);
  if (keys.Space && me.onGround && !me.down) { me.vy = 7.6; me.onGround = false; }
  // feet: the ground is solid just under the soles (not 0.05 above them, which made standing read as falling every other frame)
  me.vy -= 24 * dt; const ny = me.y + me.vy * dt;
  if (me.vy <= 0 && !free(me.x, ny - 0.001, me.z)) { if (me.vy < -14) hurt(me, (-me.vy - 14) * 4); me.y = Math.floor(ny - 0.001) + 1; me.vy = 0; me.onGround = true; }
  else if (me.vy > 0 && !free(me.x, ny + 1.8, me.z)) me.vy = 0;
  else { me.y = ny; me.onGround = false; }
  me.x = Math.max(1, Math.min(SIZE - 1, me.x)); me.z = Math.max(1, Math.min(SIZE - 1, me.z));
  me.hunger = Math.max(0, me.hunger - dt * 0.18); if (me.hunger <= 0) hurt(me, dt * 2);
  else if (me.hunger > 60 && me.hp < 100) me.hp = Math.min(100, me.hp + dt * 0.8);
}
function hurt(p, n) {
  if (p === me) { if (me.dead || me.down) return; me.hp -= n / (me.perks.has('iron') ? 2.5 : 1); $('hurt').style.opacity = Math.min(0.6, n / 25); setTimeout(() => $('hurt').style.opacity = 0, 160);
    if (me.hp <= 0) { if (net && net.live && !other.dead && !other.down) { me.down = true; me.hp = 0; me.bleed = 30; say('You are down. Your friend can revive you (hold F): 30 seconds.', 6); }
      else { me.dead = true; me.points = Math.floor(me.points * 0.9); say('You fell. Back up by the fire in 8 seconds (lost 10% of your points).', 8); setTimeout(respawn, 8000); } } }
  else if (p === other && net && net.host) net.send({ t: 'hurt', n });
}
function respawn() { me.down = false; const f = fires.find(q => q.fuel > 0) || fires[0]; me.x = f ? f.x + 1.5 : 80; me.z = f ? f.z : 80; me.y = world.height(Math.floor(me.x), Math.floor(me.z)) + 1; me.hp = 60; me.dead = false; me.vy = 0; }

// ---------------------------------------------------------------- fires: fuel burns down; the six nearest get real light
const flameGeo = new THREE.ConeGeometry(0.28, 0.7, 8), logGeo = new THREE.BoxGeometry(0.7, 0.14, 0.14), flameMat = new THREE.MeshBasicMaterial({ color: 0x9fd8ff }), logMat = new THREE.MeshStandardMaterial({ color: 0x3b2818, roughness: 1 });
function drawFires(t, dt) {
  while (fireMeshes.children.length < fires.length) { const g = new THREE.Group(); const l1 = new THREE.Mesh(logGeo, logMat), l2 = new THREE.Mesh(logGeo, logMat); l2.rotation.y = Math.PI / 2; const fl = new THREE.Mesh(flameGeo, flameMat); fl.position.y = 0.4; g.add(l1, l2, fl); fireMeshes.add(g); }
  for (const f of fires) { f.fuel = Math.max(0, f.fuel - dt); f.r = f.fuel > 0 ? 8 + Math.min(4, f.fuel / 120) : 0; f.big = f.fuel > 300; }
  fires.forEach((f, i) => { const g = fireMeshes.children[i]; g.position.set(f.x, f.y + 0.07, f.z); const fl = g.children[2]; fl.visible = f.fuel > 0; fl.scale.setScalar((0.8 + Math.sin(t * 13 + i) * 0.08) * Math.min(1.4, 0.6 + f.fuel / 300)); });
  const near = fires.map((f, i) => [i, (f.x - me.x) ** 2 + (f.z - me.z) ** 2]).filter(([i]) => fires[i].fuel > 0).sort((a, b) => a[1] - b[1]).slice(0, firePool.length);
  firePool.forEach((l, j) => { const n = near[j]; if (!n) { l.intensity = 0; return; } const f = fires[n[0]]; l.position.set(f.x, f.y + 0.8, f.z); l.distance = f.r * 1.7; l.intensity = 9 * (0.9 + Math.sin(t * 11 + j) * 0.07 + Math.sin(t * 23 + j) * 0.04); });
}
function lights() {
  const L = fires.filter(f => f.fuel > 0).map(f => ({ x: f.x, y: f.y, z: f.z, r: f.r, big: f.big }));
  if (SLOTS[slot] === 'torch' && !me.dead) L.push({ x: me.x, y: me.y + 1, z: me.z, r: 4.5 });
  if (other.torch) L.push({ x: other.x, y: other.y + 1, z: other.z, r: 4.5 });
  return L;
}

// ---------------------------------------------------------------- multiplayer
function onNet(m) {
  if (m.t === 'joined' && net.host) { net.send({ t: 'hello', seed, edits: world.edits, fires: fires.map(f => [f.x, f.y, f.z, f.fuel]), clock, day }); other.seen = true; say('Dalton is here.', 4); }
  if (m.t === 'hello') { start(m.seed, false); for (const [x, y, z, b] of m.edits) world.set(x, y, z, b); for (const [x, y, z, fu] of m.fires) placeFire(x, y, z, fu, false); clock = m.clock; day = m.day; other.seen = true; }
  if (m.t === 'p') Object.assign(other, { x: m.x, y: m.y, z: m.z, yaw: m.yaw, dead: m.dead, down: m.down, torch: m.torch, seen: true });
  if (m.t === 'e') world.set(...m.e);
  if (m.t === 'fire') placeFire(...m.f, false);
  if (m.t === 'feed' && fires[m.i]) addFuel(m.i, m.s, false);
  if (m.t === 'shot' && net.host) { const r = applyShot(new THREE.Vector3(...m.o), new THREE.Vector3(...m.d), m.m, m.dmg, m.head); if (r) net.send({ t: 'pts', r }); }
  if (m.t === 'pts') award(m.r);
  if (m.t === 'revive' && me.down) { me.down = false; me.hp = 50; say('Revived.'); }
  if (m.t === 's' && !net.host) { hollow.unpack(m.h); clock = m.c; day = m.d; fires.forEach((f, i) => { if (m.f[i] !== undefined) f.fuel = m.f[i]; }); }
  if (m.t === 'hurt' && !net.host) hurt(me, m.n);
  if (m.t === 'left') { other.seen = false; other.y = -50; }
}
let sendT = 0;
function sync(dt) {
  if (!net || !net.live) return; sendT += dt; if (sendT < 1 / 15) return; sendT = 0;
  net.send({ t: 'p', x: +me.x.toFixed(2), y: +me.y.toFixed(2), z: +me.z.toFixed(2), yaw: +me.yaw.toFixed(2), dead: me.dead, down: me.down, torch: SLOTS[slot] === 'torch' });
  if (net.host) net.send({ t: 's', h: hollow.pack(), c: clock, d: day, f: fires.map(f => Math.round(f.fuel)) });
}

// ---------------------------------------------------------------- the frame
let last = performance.now(), fpsN = 0, fpsT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now;
  if (mode !== 'play') { renderer.render(scene, camera); return; }
  const pending = world.update(scene, worldMat, 12);
  if (pending > 0 && !world.ready) { $('loading').textContent = `Building the world: ${100 - Math.round(pending)} chunks left`; } else if (!world.ready) { world.ready = true; $('loading').hidden = true; respawnAtStart(); }
  if (!world.ready) { renderer.render(scene, camera); return; }
  const L = sky(dt);
  move(dt);   // (keys move you even when the browser has not given the game the mouse: his 'nobody can move', 2026-10-18)
  if (document.pointerLockElement && mouseDown[0]) { if (gunIn(SLOTS[slot])) shoot(); else mine(dt); }
  if (reloadT > 0 && (reloadT -= dt) <= 0) { reloadT = 0; finishReload(); }
  ads += ((mouseDown[2] && gunIn(SLOTS[slot]) && reloadT <= 0 && !me.down ? 1 : 0) - ads) * Math.min(1, dt * 14);   // (aiming down the sights: right mouse)
  camera.fov = 72 - 20 * ads; camera.updateProjectionMatrix();
  if (clock > NIGHT_AT && roundShown !== day) { roundShown = day; sound.round(); $('round').textContent = day; $('roundBig').textContent = 'ROUND ' + day; $('roundBig').className = 'show'; setTimeout(() => $('roundBig').className = '', 3200); }
  prompt = null;
  if (other.seen && other.down && Math.hypot(other.x - me.x, other.z - me.z) < 2.2) { prompt = { revive: true, text: 'Hold F to revive' }; if (keys.KeyF) { reviveT += dt; if (reviveT > 3) { reviveT = 0; net.send({ t: 'revive' }); say('Revived your friend.'); } } else reviveT = 0; }
  else { const d = lookDir(); for (const st of stations) { const dx = st.position.x - me.x, dz = st.position.z - me.z, dist = Math.hypot(dx, dz); if (dist < 2.6 && (dx * d.x + dz * d.z) / dist > 0.55) { const u = st.userData, own = u.kind === 'gun' && me.guns.includes(u.key); prompt = { station: st, text: own ? `Press F: ammo for the ${GUNS[u.key].name} (${Math.floor(u.price / 2)})` : `Press F: ${u.label}` }; } } }
  shotCd = Math.max(0, shotCd - dt);
  // the Hollow: the host spawns and moves them; the other player only draws what it is sent
  if (!net || net.host) {
    const night = clock > NIGHT_AT + 0.02, long = isLong(day), want = night ? Math.min(long ? 150 : 40 + day * 6, 200) : 0;
    if (night && hollow.z.length < want && t - lastSpawn > (long ? 0.4 : 1.6)) { lastSpawn = t; const pl = [me, other].filter(p => p.seen !== false && !p.dead); hollow.spawn(world, pl[Math.floor(Math.random() * pl.length)] || me, long ? 1.4 : 1); const k = hollow.z[hollow.z.length - 1]; if (k) k.hp = (day <= 10 ? 80 + 40 * (day - 1) : 440 * Math.pow(1.1, day - 10)) * (long ? 1.3 : 1); }   // (tougher each round, CoD's curve)
    hollow.step(dt, world, [me, ...(other.seen ? [other] : [])], lights(), L, hurt);
  }
  hollow.draw(t); drawFires(t, dt);
  const tl = SLOTS[slot] === 'torch' && !me.dead; torchLight.intensity = tl ? 4 * (0.92 + Math.sin(t * 17) * 0.06) : 0; torchLight.position.set(me.x, me.y + 1.5, me.z);
  otherMesh.visible = !!other.seen && !other.dead; otherMesh.position.set(other.x, other.y, other.z); otherMesh.rotation.set(other.down ? -1.4 : 0, other.yaw, 0);
  camera.position.set(me.x, me.y + 1.62 + (me.onGround && (keys.KeyW || keys.KeyS) ? Math.sin(t * 9) * 0.03 : 0), me.z); camera.rotation.set(me.pitch, me.yaw, 0, 'YXZ');
  for (const o of view.children) o.visible = false;
  const held = SLOTS[slot], gk = gunIn(held), vm = view.getObjectByName(gk ? 'pistol' : ['pickaxe', 'torch'].includes(held) ? held : 'block'); vm.visible = !me.dead && !me.down && (gk || !held.startsWith('gun'));
  vm.position.z += (-0.55 - vm.position.z) * Math.min(1, dt * 12); vm.position.x = 0.34 - 0.34 * ads; vm.position.y = -0.3 + 0.12 * ads - (reloadT > 0 ? 0.15 : 0); vm.rotation.x = mining && !gk ? Math.sin(t * 18) * 0.4 : 0;
  if ((hitT -= dt) <= 0) $('hit').className = '';
  sync(dt); hud(L, dt);
  renderer.render(scene, camera);
  fpsN++; fpsT += dt; if (fpsT > 0.5) { $('fps').textContent = Math.round(fpsN / fpsT) + ' fps'; fpsN = 0; fpsT = 0; }
}
function landNear(cx, cz) {   // (the nearest grass to a point, spiraling out: the middle of the map can be a lake)
  for (let r = 0; r < 70; r++) for (let a = 0; a < 8 * Math.max(1, r); a++) { const x = Math.round(cx + Math.cos(a / (8 * Math.max(1, r)) * Math.PI * 2) * r), z = Math.round(cz + Math.sin(a / (8 * Math.max(1, r)) * Math.PI * 2) * r);
    const h = world.height(x, z); if (world.get(x, h - 1, z) === B.GRASS && world.get(x + 1, world.height(x + 1, z) - 1, z) === B.GRASS) return [x + 0.5, z + 0.5]; }
  return [cx, cz];
}
function respawnAtStart() { const [x, z] = landNear(80, 80); me.x = x; me.z = z; me.y = world.height(Math.floor(x), Math.floor(z)) + 0.5; if (!fires.length && (!net || net.host)) placeFire(x + 1, world.height(Math.floor(x + 1), Math.floor(z)), z, 300, true); }

// ---------------------------------------------------------------- the HUD
function hud(L, dt) {
  $('hp').style.width = me.hp + '%'; $('st').style.width = me.stamina + '%'; $('hu').style.width = me.hunger + '%';
  $('slots').innerHTML = SLOTS.map((s, i) => { const g = s.startsWith('gun') ? gunIn(s) : null; return `<div class="slot${i === slot ? ' on' : ''}"><b>${i + 1}</b><span>${s.startsWith('gun') ? (g ? GUNS[g].name : 'empty') : SLOT_NAME[s]}</span><i>${s.startsWith('gun') || ['pickaxe', 'torch'].includes(s) ? '' : inv[s]}</i></div>`; }).join('');
  const gk = gunIn(SLOTS[slot]); $('ammo').innerHTML = gk ? `<b>${me.ammo[gk].mag}</b> / ${me.ammo[gk].res}<small>${GUNS[gk].name}${reloadT > 0 ? ': reloading' : ''}</small>` : '';
  $('points').textContent = me.points.toLocaleString(); $('prompt').textContent = prompt ? prompt.text : (me.down ? `Down: ${Math.ceil(me.bleed)} s until you bleed out` : '');
  $('perks').textContent = [...me.perks].map(k => PERKS[k].name).join('  ');
  const h = Math.floor(((clock * 24) + 6) % 24), mm = Math.floor((clock * 24 * 60) % 60), toLong = (LONG_EVERY - day % LONG_EVERY) % LONG_EVERY;
  $('clock').innerHTML = `<b>Day ${day}</b> ${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}<small>${toLong === 0 ? (clock > NIGHT_AT ? 'THE LONG NIGHT' : 'the Long Night is tonight') : `the Long Night in ${toLong} day${toLong > 1 ? 's' : ''}`}</small>`;
  $('clock').classList.toggle('long', isLong(day));
  const near = fires.filter(f => f.fuel > 0).map(f => [f, Math.hypot(f.x - me.x, f.z - me.z)]).sort((a, b) => a[1] - b[1])[0];
  $('fire').textContent = near && near[1] < 10 ? `Fire: ${Math.floor(near[0].fuel / 60)}:${String(Math.floor(near[0].fuel % 60)).padStart(2, '0')} of fuel left (right-click it with planks to feed it)` : '';
  $('count').textContent = hollow.z.length ? `${hollow.z.length} in the dark` : '';
  $('mp').textContent = net ? (net.live ? (net.host ? 'Dalton is in your world' : 'In the host\'s world') : (net.host ? `Room ${net.code}: waiting for the other player` : '')) : '';
  if ((msgT -= dt) <= 0) $('msg').textContent = '';
  $('mine').style.width = mining ? Math.min(100, mining.t / (HARD[world.get(mining.x, mining.y, mining.z)] || 1) * 100) + '%' : '0';
}

// ---------------------------------------------------------------- start
function start(s, host) {
  seed = s; world = new World(seed); world.ready = false; mode = 'play'; if (location.search.includes('night')) clock = NIGHT_AT + 0.03; /* (?night: start at nightfall, for testing) */ $('menu').hidden = true; $('hud').hidden = false; $('loading').hidden = false;
  renderer.domElement.requestPointerLock?.();
}
$('solo').onclick = () => start(Math.floor(Math.random() * 1e9), true);
$('host').onclick = () => { const code = roomCode(); net = new Net(onNet, s => say(s, 6)); net.code = code; net.hostGame(code); start(Math.floor(Math.random() * 1e9), true); say(`Room ${code}: send Dalton this code.`, 30); };
$('join').onclick = () => { const code = $('code').value.trim().toUpperCase(); if (code.length !== 4) { $('menuNote').textContent = 'Room codes are 4 letters.'; return; } net = new Net(onNet, s => { $('menuNote').textContent = s; say(s, 6); }); net.code = code; net.joinGame(code); $('menuNote').textContent = `Joining room ${code}...`; };
$('resume').onclick = () => renderer.domElement.requestPointerLock();
requestAnimationFrame(frame);
window.lastfire = { me, hollow, stations, shoot: () => { shotReady = true; shotCd = 0; shoot(); }, get prompt() { return prompt; }, interact, aimAt: k => { const dx = k.x - me.x, dz = k.z - me.z, dy = k.y + 1.4 - (me.y + 1.62); me.yaw = Math.atan2(-dx, -dz); me.pitch = Math.atan2(dy, Math.hypot(dx, dz)); } };   // (a handle for the automated test; nothing in play uses it)
