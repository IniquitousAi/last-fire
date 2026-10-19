import { newRecord, sample, noteBank, noteShot, summarize } from './habits.js';
import { SHIP, makeShip, flyShip } from './ship.js';
export { SHIP };
import { labelFor } from './knowledge.js';
import { makeTrees, gridOf, pushOutTrees, inHazard, WILDS } from './wilds.js';
import { newCamp, day as campDay, payDues, standing, daysBehind, priceOf, mayHaveLantern, morale, CAMP } from './camp.js';
// Last Fire, the rules. No drawing, no sound, no network, no Math.random: the same seed and the same inputs give the same night,
// so the browser, the robots and the daemon all run this one file. Every system draws from its own named random stream.
// Units: meters and seconds. The valley is SIZE x SIZE, the fire at its middle.

export const DAY = 300, DUSK_AT = 0.55, NIGHT_AT = 0.62, DAWN_AT = 0.97;   // (a day is 5 minutes; the Tide rolls in over dusk)
export const MAX_HOLLOW = 32;
export const DARK = { off: false };   // (his call, 2026-10-19 10:22: the enemies come out until they are rebuilt as real models; the client turns them off, the robots keep them)

// ---------------------------------------------------------------- randomness: one named stream per system (eras 1 and 2 lesson)
export function stream(seed, name) {
  let h = seed >>> 0; for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 2654435761) >>> 0;
  return () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------- the land: endless, worked out from noise wherever anyone stands (no grid, no edge)
function valueNoise(r) {
  const G = new Float32Array(256 * 256); for (let i = 0; i < G.length; i++) G[i] = r();
  const at = (x, y) => G[((y & 255) << 8) | (x & 255)], s = t => t * t * (3 - 2 * t);
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = s(x - xi), v = s(y - yi);
    return at(xi, yi) * (1 - u) * (1 - v) + at(xi + 1, yi) * u * (1 - v) + at(xi, yi + 1) * (1 - u) * v + at(xi + 1, yi + 1) * u * v; };
}
// ---------------------------------------------------------------- the drop: the camp is on the Moon; Earth is a trip down, short and dangerous (PLAN-SPACE.md)
export const PAD = { x: 11, z: -13 };   // (the lander's pad inside the camp wall)
export const EARTH = { x: 0, z: 6000, stay: 150, light: 9, reach: 16, cells: 10 };   // (the landing site: the lander waits 150 s, its lamp holds 9 m)
export const onEarth = p => p.z > 3000;
// the dead city around the landing site: the same towers on every screen (drawn by the client, walked into by everyone)
export const WALLS = { half: 50, h: 30, t: 2.2, gate: 8 };   // (Earth's community lives walled in, the one thing taken from Maze Runner (his words, 2026-10-19): giant walls, once white, eaten black by the dark; the rest is ours)
export const TOWERS = (() => { let q = 33; const rnd = () => (q = (q * 16807) % 2147483647) / 2147483647, out = [], { half: A, h, t, gate: G } = WALLS;
  // the walls: a 100 m square around the landing site, a gate in the middle of every side. They are boxes in the towers' own format, so
  // light, shadows, the faces in the walls and collision all work on them unchanged.
  const seg = (x, z, w, d) => out.push({ x: EARTH.x + x, z: EARTH.z + z, w, d, h, tx: 0, ry: 0, tz: 0 }), L = A - G / 2;
  for (const s of [-1, 1]) { seg(-A / 2 - G / 4, s * A, L, t); seg(A / 2 + G / 4, s * A, L, t); seg(s * A, -A / 2 - G / 4, t, L); seg(s * A, A / 2 + G / 4, t, L); }
  // outside the walls: the old world's ruins in the corrupted land, never inside the community
  for (let i = 0; i < 60; i++) { const a = rnd() * Math.PI * 2, r = 72 + rnd() * 90, w = 3 + rnd() * 7, d = 3 + rnd() * 7, hh = 3 + rnd() * rnd() * 30, tx = (rnd() - 0.5) * 0.12, ry = rnd() * Math.PI, tz = (rnd() - 0.5) * 0.12;
    out.push({ x: EARTH.x + Math.cos(a) * r, z: EARTH.z + Math.sin(a) * r, w, d, h: hh, tx, ry, tz }); }
  return out; })();
// camp pieces are solid to light too (his pick, 2026-10-19: lamp shadows, INNOVATION.md idea 2): each client hands in the same pieces from the
// same camp layout, so every machine agrees on where the shadows fall. {x, z, w, d, ry}: a box, turned like the towers
export const TREES = makeTrees(EARTH, WALLS, TOWERS.slice(8)), TREE_GRID = gridOf(TREES);   // (the Wilds' trunks: solid like the towers, same list for the client, pushOut and the robots)
const OCC = []; export function setOccluders(list) { OCC.length = 0; for (const o of list) OCC.push(o); }
function blocks(list, ax, az, bx, bz, through) {   // (slab test in each box's own frame; a box the light stands in casts nothing)
  const minx = Math.min(ax, bx) - 8, maxx = Math.max(ax, bx) + 8, minz = Math.min(az, bz) - 8, maxz = Math.max(az, bz) + 8;
  for (const t of list) { if (t.x < minx || t.x > maxx || t.z < minz || t.z > maxz) continue; const c = Math.cos(t.ry), s = Math.sin(t.ry), hx = t.w / 2, hz = t.d / 2;
    const ax2 = (ax - t.x) * c - (az - t.z) * s, az2 = (ax - t.x) * s + (az - t.z) * c, bx2 = (bx - t.x) * c - (bz - t.z) * s, bz2 = (bx - t.x) * s + (bz - t.z) * c, dx = bx2 - ax2, dz = bz2 - az2;
    let t0 = 0, t1 = 1; for (const [p, d, h] of [[ax2, dx, hx], [az2, dz, hz]]) { if (Math.abs(d) < 1e-9) { if (Math.abs(p) > h) { t0 = 2; break; } continue; } let u = (-h - p) / d, v = (h - p) / d; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) break; }
    if (t0 <= t1 && t0 < 1 && t1 > 0 && t0 < through && (list === TOWERS || t0 > 0)) return true; }
  return false;
}
export function shadowed(ax, az, bx, bz) {   // (shadows are the dark too, INNOVATION.md: does a tower (Earth) or a camp piece (the Moon) stand between a light and a point?)
  if (az < 3000 && bz < 3000) return OCC.length > 0 && blocks(OCC, ax, az, bx, bz, 0.999);
  return blocks(TOWERS, ax, az, bx, bz, 0.98);
}
export function pushOut(x, z, rad = 0.4) {   // (moves a point out of any tower it is inside: the towers are solid)
  if (z < 3000) return [x, z];
  [x, z] = pushOutTrees(TREE_GRID, x, z, rad);
  for (const t of TOWERS) { const dx = x - t.x, dz = z - t.z; if (dx * dx + dz * dz > 120) continue; const c = Math.cos(t.ry), s = Math.sin(t.ry), lx = dx * c - dz * s, lz = dx * s + dz * c, hx = t.w / 2 + rad, hz = t.d / 2 + rad;
    if (Math.abs(lx) < hx && Math.abs(lz) < hz) { let nx = lx, nz = lz; if (hx - Math.abs(lx) < hz - Math.abs(lz)) nx = Math.sign(lx || 1) * hx; else nz = Math.sign(lz || 1) * hz; x = t.x + nx * c + nz * s; z = t.z - nx * s + nz * c; } }
  return [x, z];
}
// the truck: built at the bay in camp from parts found on Earth, fitted in an order that makes sense (his example, 2026-10-19). Weight slows you.
export const PARTS = { frame: { kg: 60, n: 1, after: [] }, axle: { kg: 25, n: 2, after: ['frame'] }, engine: { kg: 45, n: 1, after: ['frame'] }, wheel: { kg: 18, n: 4, after: ['axle'] }, battery: { kg: 15, n: 1, after: ['engine'] }, cab: { kg: 40, n: 1, after: ['frame', 'engine'] } };
export const PART_ORDER = ['frame', 'axle', 'engine', 'wheel', 'battery', 'cab'], BAY = { x: 5, z: 12 }, MAX_LOAD = 140;   // (the bay sits by the workshop, between the gate and the bench)
export const loadOf = p => (p.pack || []).reduce((s, k) => s + PARTS[k].kg, 0);
export const speedOf = p => Math.max(0.45, 1 - loadOf(p) / 160);   // (60 kg on your back: about two thirds speed; a full pack: under half)
export const fitted = (g, k) => (g.truck && g.truck[k]) || 0;
export const canFit = (g, k) => (g.stash[k] || 0) > 0 && fitted(g, k) < PARTS[k].n && PARTS[k].after.every(a => fitted(g, a) >= PARTS[a].n);
export const truckDone = g => PART_ORDER.every(k => fitted(g, k) >= PARTS[k].n);
// the finished truck rides the lander down; on Earth it seats four, holds 400 kg, its headlights make the dark solid, and it runs things over
export const CAR = { speed: 17, back: 6, turn: 1.7, seats: 4, store: 400, ram: 160, lamp: 14, roof: 22 };   // (roof: the big lamp the front passenger aims, seats are jobs)
const SEAT_AT = [[-0.45, -0.2], [0.45, -0.2], [-0.45, 1.2], [0.45, 1.2]];   // (driver, front passenger, two in the back; truck's own space, forward is -z)
export const seatOf = (g, id) => g.car && id !== null && id !== undefined ? g.car.seats.indexOf(id) : -1;   // (seats are fixed places: 0 drives, 1 aims the roof lamp, 2 and 3 work the mounted gun; empty is null)
export function seatPos(c, i) { const [ox, oz] = SEAT_AT[i] || SEAT_AT[0], co = Math.cos(c.yaw), si = Math.sin(c.yaw); return [c.x + ox * co + oz * si, c.z - ox * si + oz * co]; }
export const storeKg = car => car.store.reduce((s, k) => s + PARTS[k].kg, 0);
// the ship (SHIP.md): one pilot seat, chosen by the host. The pilot's own game flies it (smooth, no wait on the network) and reports where it is,
// the way every player reports their own position; with nobody at the controls the host settles it on its springs.
export const SHIP_PARK = { x: 0, z: 34 };
export function shipOf(g) { if (!g.ship) g.ship = makeShip(SHIP_PARK.x, g.land(SHIP_PARK.x, SHIP_PARK.z) + SHIP.hover - 0.05, SHIP_PARK.z, 0); return g.ship; }
export function useShip(g, p) {
  const s = shipOf(g); if (!p || p.ember) return null;
  if (s.pilot === p.id) { s.pilot = null; const a = s.yaw + Math.PI / 2; p.x = s.x + Math.sin(a) * 4; p.z = s.z + Math.cos(a) * 4; p.y = g.land(p.x, p.z); s.vx = s.vz = 0; p.tp = (p.tp || 0) + 1; return 'out'; }
  if (s.pilot || onEarth(p) || Math.hypot(p.x - s.x, p.z - s.z) > 6) return null; s.pilot = p.id; return 'in';
}
export function shipBounds(s) {   // (the camp wall bumps it off, and the Moon's edge holds it for now: Earth is a trip, not a flight, until the drop is flown)
  const r = Math.hypot(s.x, s.z); if (r < 24) { s.x *= 24 / r; s.z *= 24 / r; const vr = (s.vx * s.x + s.vz * s.z) / 24; if (vr < 0) { s.vx -= vr * s.x / 24 * 1.4; s.vz -= vr * s.z / 24 * 1.4; } }
  if (r > 1500) { s.x *= 1500 / r; s.z *= 1500 / r; }
}
function flyShips(g, dt) {
  const s = shipOf(g), p = s.pilot && g.players.find(q => q.id === s.pilot);
  if (s.pilot && (!p || p.ember)) s.pilot = null;
  if (!s.pilot) { flyShip(s, {}, g.land, Math.min(dt, 1 / 30)); shipBounds(s); } else { p.x = s.x; p.z = s.z; p.y = s.y; }
}
export function useCar(g, p) {   // (F at the truck: load your pack first if you carry one, else get in; F inside gets you out)
  const c = g.car; if (!c || !p || p.ember) return null; const i = c.seats.indexOf(p.id);
  if (i >= 0) { c.seats[i] = null; p.x = c.x + Math.cos(c.yaw) * 2.2; p.z = c.z - Math.sin(c.yaw) * 2.2; p.tp = (p.tp || 0) + 1; return 'out'; }
  if (Math.hypot(p.x - c.x, p.z - c.z) > 3.8) return null;
  if ((p.pack || []).length) { const keep = []; for (const k of p.pack) if (storeKg(c) + PARTS[k].kg <= CAR.store) c.store.push(k); else keep.push(k); const n = p.pack.length - keep.length; p.pack = keep; return n ? 'stowed' : 'full'; }
  const free = c.seats.indexOf(null); if (free < 0) return null; c.seats[free] = p.id; p.tp = (p.tp || 0) + 1; return free === 0 ? 'driver' : 'seat';
}
export function nextSeat(g, p) {   // (solo you climb between seats while the truck coasts: drive, then light, then shoot)
  const c = g.car; if (!c || !p) return -1; const i = c.seats.indexOf(p.id); if (i < 0) return -1;
  for (let k = 1; k < 4; k++) { const j = (i + k) % 4; if (c.seats[j] === null) { c.seats[i] = null; c.seats[j] = p.id; return j; } } return i;
}
function driveCar(g, dt) {
  const c = g.car; if (!c) return; c.seats = c.seats.map(id => { if (id === null) return null; const q = g.players.find(p => p.id === id); return q && !q.ember && onEarth(q) ? id : null; });
  const d = g.players.find(p => p.id === c.seats[0]), th = d && d.drive ? d.drive.th : 0, st = d && d.drive ? d.drive.st : 0;
  const want = th > 0 ? th * CAR.speed : th * CAR.back; c.v += (want - c.v) * Math.min(1, dt * (th === 0 ? (d ? 1.2 : 0.22) : 1.6));   /* (nobody at the wheel: it coasts, slowly losing speed, so a solo player can climb back to the gun while it rolls) */
  c.yaw -= st * CAR.turn * dt * Math.max(-1, Math.min(1, c.v / 6));
  const nx = c.x - Math.sin(c.yaw) * c.v * dt, nz = c.z - Math.cos(c.yaw) * c.v * dt, [px, pz] = pushOut(nx, nz, 1.7);
  if (px !== nx || pz !== nz) c.v *= -0.25; c.x = px; c.z = pz;   // (a tower stops it hard)
  for (const k of g.hollow) if (k.earth && !k.dead && Math.abs(c.v) > 5 && Math.hypot(k.x - c.x, k.z - c.z) < 2.2 && solid(g, k)) { damage(g, k, 0, CAR.ram * Math.abs(c.v) / CAR.speed, 1, d ? d.id : 0); c.v *= 0.85; }
  c.seats.forEach((id, i) => { if (id === null) return; const q = g.players.find(p => p.id === id); if (!q) return; [q.x, q.z] = seatPos(c, i); q.y = heightAt(g.land, q.x, q.z) + 0.9; });
}
// take it apart to learn it (INNOVATION.md idea 7): dead machines on Earth; stripping one hands you a part the truck still lacks, and a kind
// you took apart yourself is known (checked) from then on, the rest only reasoned
export function strip(g, p) {
  if (!g.earth || !p || p.ember) return null; const w = (g.earth.wrecks || []).find(w => w.left > 0 && Math.hypot(p.x - w.x, p.z - w.z) < 3.2); if (!w) return null;
  const lack = PART_ORDER.filter(k => PARTS[k].n - fitted(g, k) - (g.stash[k] || 0) - (p.pack || []).filter(q => q === k).length > 0), pool = lack.length ? lack : PART_ORDER, r = stream(g.seed, 'wreck-' + w.id + '-' + w.left);
  const kind = pool[Math.floor(r() * pool.length)]; w.left--; (g.learned = g.learned || {})[kind] = 1;
  p.pack = p.pack || []; if (loadOf(p) + PARTS[kind].kg <= MAX_LOAD) p.pack.push(kind); else g.parts.push({ id: g.nextId++, kind, x: w.x + 1, z: w.z });
  if (g.earth.found) g.earth.found.parts++; g.log.push([+g.t.toFixed(2), 'strip', p.id, kind]); return kind;
}
export function fit(g, p) {
  if (!p || p.ember || Math.hypot(p.x - BAY.x, p.z - BAY.z) > 5) return null; const k = PART_ORDER.find(k => canFit(g, k)); if (!k) return null;
  g.stash[k]--; g.truck[k] = fitted(g, k) + 1; g.log.push([+g.t.toFixed(2), 'fit', k]); return k;
}
export function makeLand(seed) {
  const r = stream(seed, 'land'), n1 = valueNoise(r), n2 = valueNoise(r), n3 = valueNoise(r), n4 = valueNoise(r);
  return (x, z) => {   // (rolling ground, long ridges, and the far land growing stranger the farther from the first fire)
    const d = Math.hypot(x, z), far = Math.min(1, d / 1500), k = Math.min(1, Math.max(0, (d - 18) / 30)), home = 1 - k * k * (3 - 2 * k);
    const h = n1(x / 90, z / 90) * 22 + n2(x / 28, z / 28) * 5 + n3(x / 9, z / 9) * 0.8, ridge = Math.abs(n4(x / 160, z / 160) - 0.5) * 2;
    const yard = n1(0, 0) * 22 + n2(0, 0) * 5 + n3(x / 9, z / 9) * 0.2;   /* (the camp's yard: level, at the height the hills around it already have, so no bowl) */
    const e = Math.hypot(x - EARTH.x, z - EARTH.z), ke = Math.min(1, Math.max(0, (e - 62) / 45)), site = 1 - ke * ke * (3 - 2 * ke);   /* (Earth's landing site: a flat dead city floor, rough hills past it) */
    const wild = (h + (1 - ridge) ** 3 * 30 * far) * (1 - home) + yard * home;
    return site > 0 ? wild * (1 - site) + (n1(EARTH.x / 90, EARTH.z / 90) * 22 + n3(x / 4, z / 4) * 0.35) * site : wild;
  };
}
export function heightAt(land, x, z) { return land(x, z); }

// ---------------------------------------------------------------- the dark's kinds (silhouette first: tall walker, low runner, floating shard, giant)
// shell: ash plates [head, body] at night 1, growing per night; hits: [height, radius, part 0 head or 1 body, multiplier]
export const KINDS = {
  walker: { hp: 120, shell: [40, 0], grow: [12, 15], speed: 2.4, bite: 14, wait: 1.0, reach: 1.2, hits: [[2.2, 0.26, 0, 2.5], [1.4, 0.4, 1, 1]], motes: 2 },
  runner: { hp: 70, shell: [20, 30], grow: [6, 8], speed: 5.6, bite: 8, wait: 0.6, reach: 1.1, hits: [[0.95, 0.24, 0, 2.5], [0.85, 0.42, 1, 1]], motes: 1 },
  shard: { hp: 100, shell: [0, 60], grow: [0, 15], speed: 3.4, bite: 0, wait: 1, reach: 1.6, hits: [[2.6, 0.55, 1, 1]], motes: 3 },   // (it floats to the fire and drinks its light)
  face: { hp: 90, shell: [0, 20], grow: [5, 6], speed: 6.4, bite: 16, wait: 0.7, reach: 1.2, hits: [[1.5, 0.25, 0, 3], [1.0, 0.4, 1, 1]], motes: 2 },   // (the face in the wall: dormant in a tower's surface on Earth until you pass too close, then it tears out and lunges)
  watcher: { hp: 160, shell: [0, 0], grow: [0, 0], speed: 4.6, bite: 30, wait: 1.4, reach: 1.4, hits: [[2.6, 0.22, 0, 3], [1.6, 0.35, 1, 1]], motes: 4, watched: true },   // (the tall one in the hat: it only moves while nobody is looking at it)
  giant: { hp: 900, shell: [150, 250], grow: [40, 60], speed: 1.3, bite: 34, wait: 1.6, reach: 1.9, hits: [[2.85, 0.32, 0, 2], [2.0, 0.72, 1, 1]], motes: 12 },
};
// what each fire level wakes in the dark that night: the player chooses when to provoke it, by feeding the fire
export const WAKES = [[], ['runner'], ['shard'], ['giant'], ['runner', 'giant'], ['shard', 'giant']];
export const FIRE_COST = [0, 60, 180, 400, 750, 1200];   // (banked light a level costs; growing it is the players' choice)

// ---------------------------------------------------------------- the dark's tactics: a genome the daemon breeds from recorded nights
// probe: the angle the first wave comes from (radians); spread: how wide they fan; rushAt: share of the night before they all commit;
// isolate: how much a lone player outweighs the nearest one; fireBias: how much shards prefer the fire over carriers; greed: pull of a glowing carrier
export const BASE_TACTIC = { probe: 0, spread: 1.2, rushAt: 0.55, isolate: 1.5, fireBias: 1, greed: 1.4 };
export function clampTactic(t) {
  const c = (v, a, b, d) => Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d;
  return { probe: c(t.probe, -Math.PI, Math.PI, 0), spread: c(t.spread, 0.3, Math.PI, 1.2), rushAt: c(t.rushAt, 0.15, 0.9, 0.55), isolate: c(t.isolate, 0.5, 4, 1.5), fireBias: c(t.fireBias, 0.2, 3, 1), greed: c(t.greed, 0.5, 4, 1.4) };
}

// ---------------------------------------------------------------- a game
export function newGame(seed, tactic = BASE_TACTIC) {
  const C = 0;   // (the first fire stands at the world's middle; the world runs on forever from it)
  return { seed, land: makeLand(seed), t: 0, clock: 0.3, night: 1, tactic: clampTactic(tactic), rSpawn: stream(seed, 'spawn'), rAim: stream(seed, 'aim'), rMote: stream(seed, 'mote'),
    fire: { x: C, z: C, level: 0, light: 0, fuel: 180, woke: [] }, nodes: [], marks: [], keep: {}, parts: [], stash: {}, truck: {}, rec: newRecord(), history: [], players: [], hollow: [], motes: [], embers: [], nextId: 1, log: [], stats: { kills: 0, falls: 0, banked: 0, tense: 0, beats: 0, drained: 0 } };
}
export function addPlayer(g, id, name = 'Player') {
  const p = { id, name, x: g.fire.x + 3 + g.players.length, z: g.fire.z, y: 0, yaw: 0, pitch: 0, hp: 100, carried: 0, ember: false, carrying: null, isPlayer: true, hurtT: 0 };
  p.y = heightAt(g.land, p.x, p.z); if (g.keep && g.keep[name] > 0) { p.carried = g.keep[name]; } g.players.push(p); return p;
}
export const phase = c => c < DUSK_AT ? 'day' : c < NIGHT_AT ? 'dusk' : c < DAWN_AT ? 'night' : 'dawn';
export function fireRadius(f) { return f.fuel > 0 ? 9 + f.level * 2.5 : 3; }
// the Tide: by day the dark sits beyond the rim; over dusk it rolls in until only the light is left
export function tideRadius(g) {   // (how far out the dark holds back: far by day, pressed to the light's edge by night)
  const rim = 120, inner = fireRadius(g.fire) + 14, c = g.clock;
  if (c < DUSK_AT) return rim; if (c < NIGHT_AT) return rim - (rim - inner) * ((c - DUSK_AT) / (NIGHT_AT - DUSK_AT));
  if (c < DAWN_AT) return inner; return inner + (rim - inner) * ((c - DAWN_AT) / (1 - DAWN_AT));
}
// each player's own light: a small glow, brighter for every friend within 6 m (shared glow), brighter again while carrying light
export function glowOf(g, p) { if (p.ember) return 0; let near = 0; for (const q of g.players) if (q !== p && !q.ember && Math.hypot(q.x - p.x, q.z - p.z) < 6) near++; return (3 + near * 2 + Math.min(4, p.carried * 0.08)) * (0.45 + 0.55 * Math.max(0, p.hp) / 100); }   // (one light is your health, INNOVATION.md: hurt, you shine less, and the dark gets closer before it turns solid)
export const NODE = { relay: { r: 7, reach: 22, hp: 120, cost: 15 }, lamp: { r: 11, reach: 0, hp: 80, cost: 25 } };   // (a relay carries light on; a lamp only shines)
export function linkNetwork(g) {   // (which nodes are lit: walk outward from the fire through relays in reach of each other)
  const f = g.fire, lit = new Set(), open = [{ x: f.x, z: f.z, reach: 24 }, ...(g.earth ? [{ x: EARTH.x, z: EARTH.z, reach: EARTH.reach }] : [])];
  for (const n of g.nodes) n.lit = false;
  while (open.length) { const a = open.pop(); for (const n of g.nodes) if (!n.lit && n.hp > 0 && Math.hypot(n.x - a.x, n.z - a.z) <= a.reach) { n.lit = true; if (NODE[n.kind].reach) open.push({ x: n.x, z: n.z, reach: NODE[n.kind].reach }); } }
}
export function placeNode(g, kind, x, z, by) {
  { const q = g.players.find(q => q.id === by); if (kind === 'lamp' && q && q.name && !q.bot && !econ.lamps(g, q.name)) return null; }   // (more than a day behind on dues: the camp hands out no lamps)
  const K = NODE[kind]; if (!K) return null; const who = (g.players.find(q => q.id === by) || {}).name || '', n = { id: g.nextId++, kind, x, z, hp: K.hp, lit: false, by, who: who.slice(0, 12), n: g.night };   /* (the world keeps your friends: a node remembers who built it and when) */ g.nodes.push(n); linkNetwork(g); g.log.push([+g.t.toFixed(2), 'node', kind, Math.round(x), Math.round(z)]); return n;
}
export function lightAt(g, x, z, noGlow, noShadow) {   // (noShadow: the light as if nothing stood in the way: the client's shadow map divides by it)
  const sh = noShadow ? () => false : shadowed;   // (noGlow: leave out the glow players carry, for 'is this place lit')   // (0 in the dark, 1 at the heart of a light)
  let L = 0; const f = g.fire, rf = fireRadius(f), df = Math.hypot(f.x - x, f.z - z); if (df < rf && !sh(f.x, f.z, x, z)) L = 1 - df / rf;
  for (const n of g.nodes) if (n.lit && (f.fuel > 0 || onEarth(n))) { const r = NODE[n.kind].r, d = Math.hypot(n.x - x, n.z - z); if (d < r && 1 - d / r > L && !sh(n.x, n.z, x, z)) L = 1 - d / r; }
  if (!noGlow) for (const p of g.players) { const r = glowOf(g, p), d = Math.hypot(p.x - x, p.z - z); if (r > 0 && d < r) L = Math.max(L, (1 - d / r) * 0.8);
    if (p.torch && !p.ember && d < TORCH.r && d > 0.01) { const along = ((x - p.x) * -Math.sin(p.yaw) + (z - p.z) * -Math.cos(p.yaw)) / d; if (along > TORCH.cos && TORCH.s * (1 - d / TORCH.r) > L && !sh(p.x, p.z, x, z)) L = TORCH.s * (1 - d / TORCH.r); } }   /* (a flashlight beam is light: what it touches commits to a shape) */
  if (g.earth) { const d = Math.hypot(EARTH.x - x, EARTH.z - z); if (d < EARTH.light && 1 - d / EARTH.light > L && !sh(EARTH.x, EARTH.z, x, z)) L = 1 - d / EARTH.light; }
  if (g.flares) for (const f of g.flares) { const d = Math.hypot(f.x - x, f.z - z); if (d < FLARE.r) L = Math.max(L, (1 - d / FLARE.r) * Math.min(1, f.t / 2)); }
  if (g.tracers) for (const t of g.tracers) { const vx = t.bx - t.ax, vz = t.bz - t.az, k = Math.max(0, Math.min(1, ((x - t.ax) * vx + (z - t.az) * vz) / (vx * vx + vz * vz))), d = Math.hypot(t.ax + vx * k - x, t.az + vz * k - z); if (d < TRACER.width) L = Math.max(L, 0.5 * t.t / TRACER.life); }
  if (g.car) { const c = g.car, dx = x - c.x, dz = z - c.z, ahead = -dx * Math.sin(c.yaw) - dz * Math.cos(c.yaw), side = Math.abs(dx * Math.cos(c.yaw) - dz * Math.sin(c.yaw));
    if (ahead > 0 && ahead < CAR.lamp && side < 1.2 + ahead * 0.45 && 0.8 * (1 - ahead / CAR.lamp) > L && !sh(c.x, c.z, x, z)) L = 0.8 * (1 - ahead / CAR.lamp);
    const gun = c.seats[1] !== null && c.seats[1] !== undefined && g.players.find(q => q.id === c.seats[1]); if (gun) { const fx = -Math.sin(gun.yaw || 0), fz = -Math.cos(gun.yaw || 0), a2 = dx * fx + dz * fz, s2 = Math.abs(dx * fz - dz * fx);   /* (the roof lamp: a narrow, long beam where the front passenger looks) */
      if (a2 > 0 && a2 < CAR.roof && s2 < 0.8 + a2 * 0.22 && 0.9 * (1 - a2 / CAR.roof) > L && !sh(c.x, c.z, x, z)) L = 0.9 * (1 - a2 / CAR.roof); } else if (dx * dx + dz * dz < 9) L = Math.max(L, 0.3); }   // (the headlights: a wedge of light ahead, a little around the cab)
  return L;
}

// ---------------------------------------------------------------- shots: the first Hollow a ray passes through, and what the hit does
// tracers are light (INNOVATION.md, idea 1): every fourth round burns a line through the air for a third of a second, and what it passes turns solid
export const TRACER = { every: 4, life: 0.35, width: 1.8, len: 40 };
// the hunt by sight and sound (his pick, 2026-10-19), from 7 Days to Die's own zombie settings, read from his installed copy's Data/Config:
// sight: they see you 30 m off in full light (SightRange 30) and only up close in the dark (SightLightThreshold: how lit you must be to be seen);
// once they sense you they stay on you 6 s (their alert timer), then go where they last knew you were. Sound: each shot is as loud as 7 Days to
// Die's gun of the same kind (sounds.xml: AK 108, pump shotgun 81, M60 54, Desert Vulture 52, heard 2 s), here as meters x 0.35 (ours);
// crouching muffles it to 80% (muffled_when_crouched 0.8). Light, your own glow included, is what gives you away
export const SENSE = { far: 30, near: 10 /* ours */, alert: 6, noise: { pistol: 52, ar: 108, shotgun: 81, lmg: 54, mount: 54 }, scale: 0.35 /* ours */, life: 2, crouch: 0.8, drift: 0.9 /* ours */ };
// Advanced Warfare's boost slam (its own settings, ground_slam_*: 110 damage at the middle down to 50 at the edge, 75 to 125 inches across):
// a hit from above that hurts every solid one in the ring (shapes in the light only, like a bullet)
export const SLAM = { max: 110, min: 50, r0: 1.9, r1: 3.2 };
export function slam(g, p, x, z) { let n = 0; for (const k of g.hollow) { if (k.dead || !solid(g, k)) continue; const d = Math.hypot(k.x - x, k.z - z); if (d > SLAM.r1) continue;
  damage(g, k, 1, d <= SLAM.r0 ? SLAM.max : SLAM.max + (SLAM.min - SLAM.max) * (d - SLAM.r0) / (SLAM.r1 - SLAM.r0), 0.5, p.id); n++; } return n; }
// the flashlight (his ask, 2026-10-19: the dark stays hard to see unless you bring light): a cone 20 m long and about 30 degrees wide (ours)
export const TORCH = { r: 20, cos: Math.cos(0.26), s: 0.9 };
export function sees(g, k, p) { const range = p.torch ? SENSE.far : SENSE.near + (SENSE.far - SENSE.near) * Math.min(1, lightAt(g, p.x, p.z));   /* (a lit flashlight gives you away from as far as they can see) */ return Math.hypot(p.x - k.x, p.z - k.z) < range; }
export function fired(g, p, ox, oz, dx, dz, gun) { (g.noises = g.noises || []).push({ x: ox, z: oz, earth: onEarth(p), r: (SENSE.noise[gun] || 60) * SENSE.scale * (p.crouch ? SENSE.crouch : 1), t: SENSE.life }); p.shots = (p.shots || 0) + 1; if (p.shots % TRACER.every) return false; const L = Math.hypot(dx, dz) || 1; (g.tracers = g.tracers || []).push({ ax: ox, az: oz, bx: ox + dx / L * TRACER.len, bz: oz + dz / L * TRACER.len, t: TRACER.life }); return true; }
// the decoy flare (queue 31, from the shielded-box test): a burning light you throw; it lights where it lands and pulls the hunt to it
export const FLARE = { cost: 10, life: 12, r: 6.5, reach: 16, pull: 18, burn: 45 };
export function throwFlare(g, p, x, z) { const cost = flareCost(g, p); if (!p || p.ember || p.carried < cost || Math.hypot(x - p.x, z - p.z) > FLARE.reach) return false; p.carried -= cost; (g.flares = g.flares || []).push({ x, z, t: FLARE.life, earth: onEarth(p) }); g.log.push([+g.t.toFixed(2), 'flare', p.id]); return true; }
export function flareCost(g, p) { return p && p.name && !p.bot && g.econ ? Math.round(econ.price(g, p.name, FLARE.cost)) : FLARE.cost; }   // (behind on dues, the camp's flares cost more)
export const SOLID_AT = 0.02;   // (the dark has no shape of its own: out of every light it is smoke, and shots pass through; light makes it commit to a shape you can kill. PLAN-SPACE.md)
export const solid = (g, k) => lightAt(g, k.x, k.z) > (g.solidAt ?? SOLID_AT);   /* (g.solidAt: the simulator turns the rule off for its control) */
// bullet pull (GAMEDEV-TRICKS.md 7): a shot within about 3 degrees of a solid enemy bends most of the way to it. It lives on the gun, not the
// enemy (The Astronauts, Destiny), so cover still blocks it; it only rewards aim that was nearly right.
export const PULL = { cone: 0.05, max: 60, k: 0.65 };
export function aimPull(g, ox, oy, oz, dx, dy, dz) {
  let best = null, ba = PULL.cone;
  for (const k of g.hollow) { if (k.dead || !solid(g, k)) continue; const hy = KINDS[k.kind].hits.find(h => h[3] === 1)[0], cx = k.x - ox, cy = k.y + hy - oy, cz = k.z - oz, L = Math.hypot(cx, cy, cz); if (L > PULL.max || L < 0.5) continue;
    const a = Math.acos(Math.min(1, (cx * dx + cy * dy + cz * dz) / L)); if (a < ba) { ba = a; best = [cx / L, cy / L, cz / L]; } }
  if (!best) return [dx, dy, dz]; const x = dx + (best[0] - dx) * PULL.k, y = dy + (best[1] - dy) * PULL.k, z = dz + (best[2] - dz) * PULL.k, n = Math.hypot(x, y, z); return [x / n, y / n, z / n];
}
// every shape along a line, nearest first, its closest part each (the rail's full charge goes through them all)
export function hitAll(g, ox, oy, oz, dx, dy, dz, max = 80) {
  const out = [];
  for (const k of g.hollow) if (solid(g, k)) { let best = null; for (const [hy, r, part, mult] of KINDS[k.kind].hits) {
    const cx = k.x - ox, cy = k.y + hy - oy, cz = k.z - oz, t = cx * dx + cy * dy + cz * dz; if (t < 0 || t > max) continue;
    if (cx * cx + cy * cy + cz * cz - t * t < r * r && (!best || mult > best.mult)) best = { k, part, mult, t }; } if (best) out.push(best); }
  return out.sort((a, b) => a.t - b.t);
}
export function hitRay(g, ox, oy, oz, dx, dy, dz, max = 80) {
  let best = null, bt = max;
  for (const k of g.hollow) if (solid(g, k)) for (const [hy, r, part, mult] of KINDS[k.kind].hits) {
    const cx = k.x - ox, cy = k.y + hy - oy, cz = k.z - oz, t = cx * dx + cy * dy + cz * dz; if (t < 0 || t > bt) continue;
    if (cx * cx + cy * cy + cz * cz - t * t < r * r) { bt = t; best = { k, part, mult, t }; }
  }
  return best;
}
// a shell takes most of a blow and wears (piercing guns get more through and wear it faster); the blow that breaks it is spent on it
// Hit reactions, Cyberpunk's own (CD Projekt's hitReactionComponent and hit-reaction thresholds, CYBERPUNK.md): damage adds up over 0.25 s;
// past 15% of its health a shape flinches 0.2 s, past 30% it staggers 0.4 s, past 40% it goes down for 2.5 s. The giant is tough: double the bars.
export const REACT = { window: 0.25, bars: [[0.4, 3, 2.5], [0.3, 2, 0.4], [0.15, 1, 0.2]] };
function react(g, k, dmg) { if (k.kind === 'shard') return; if (!(k.rw > g.t - REACT.window)) { k.rw = g.t; k.racc = 0; } k.racc += dmg; const f = k.racc / k.max / (k.kind === 'giant' ? 2 : 1);
  for (const [bar, r, t] of REACT.bars) if (f >= bar) { if (r > (k.rt > 0 ? k.r : 0)) { k.r = r; k.rt = t; } break; } }
export function damage(g, k, part, dmg, ap, by) {
  const key = part ? 'sb' : 'sh'; let res; react(g, k, dmg);
  if (k[key] > 0) { const through = dmg * (0.25 + 0.75 * ap); k[key] -= dmg * (0.6 + ap);
    if (k[key] <= 0) { k[key] = 0; k.hp -= Math.min(through, k.max * 0.5); res = { shell: true, broke: true }; } else { k.hp -= through; res = { shell: true, broke: false }; } }
  else { k.hp -= dmg; res = { shell: false, broke: false }; }
  if (k.hp <= 0 && !k.dead) { k.dead = true; die(g, k, by); res.kill = true; }
  return res;
}
function die(g, k, by) {   // (a Hollow bursts into motes of light where it fell: someone has to walk out and gather them)
  g.stats.kills++; const n = KINDS[k.kind].motes;
  for (let i = 0; i < n; i++) { const a = g.rMote() * Math.PI * 2, r = g.rMote() * 1.5; g.motes.push({ id: g.nextId++, x: k.x + Math.cos(a) * r, z: k.z + Math.sin(a) * r, v: 2, t: 45 }); }
  g.log.push([+g.t.toFixed(2), 'kill', k.kind, by]);
}

// ---------------------------------------------------------------- one step of the world (the host runs this; robots and the daemon run it headless)
export function step(g, dt) {
  g.t += dt; const prev = g.clock; if (g.tracers && g.tracers.length) { for (const t of g.tracers) t.t -= dt; g.tracers = g.tracers.filter(t => t.t > 0); } if (g.flares && g.flares.length) { for (const f of g.flares) f.t -= dt; g.flares = g.flares.filter(f => f.t > 0); } g.clock += g.holdDay ? 0 : dt / DAY;   /* (the guide holds the day through its first three steps: a slow new player never loses the tutorial to the night, found by the robot player) */
  if (g.clock >= 1) { g.clock -= 1; g.night++; g.log.push([+g.t.toFixed(2), 'dawn', g.night - 1]); campTrips(g);
    { const S = g.stats, k = (S.kills || 0) - (S.killsMark || 0); S.killsMark = S.kills || 0; if (k > (S.bestKills || 0)) { S.bestKills = k; S.bestNight = g.night - 1; } } }   /* (the menu remembers your best night: his rule, it learned from you) */
  if (prev < 0.97 && g.clock >= 0.97) { g.history.push(summarize(g.rec, g.night)); if (g.history.length > 30) g.history.shift(); g.rec = newRecord(); g.log.push([+g.t.toFixed(2), 'learned-night', g.night]); }   // (at the ebb, the night is written down)
  if (prev < DUSK_AT && g.clock >= DUSK_AT) { g.fire.woke = WAKES[Math.min(g.fire.level, WAKES.length - 1)]; g.log.push([+g.t.toFixed(2), 'dusk', g.night, g.fire.level]); }
  const f = g.fire, ph = phase(g.clock); f.fuel = Math.max(0, f.fuel - dt * (ph === 'night' ? 1 : 0.4));   // (the fire eats its fuel fast at night: a crew that never leaves its circle starves it)
  if ((ph === 'night' || ph === 'dusk') && Math.floor(g.t) !== Math.floor(g.t - dt)) sample(g.rec, g, g.fire.x, g.fire.z);
  if (Math.floor(g.t) !== Math.floor(g.t - dt)) { g.seenToday = g.seenToday || []; for (const p of g.players) if (p.name && !p.bot && !g.seenToday.includes(p.name)) g.seenToday.push(p.name); }
  if (Math.floor(g.t * 2) !== Math.floor((g.t - dt) * 2)) for (const p of g.players) if (!p.ember) { (p.trail = p.trail || []).push([+p.x.toFixed(1), +p.z.toFixed(1)]); if (p.trail.length > 20) p.trail.shift(); }
  if (g.traces && g.traces.length) { for (const t of g.traces) t.t -= dt; g.traces = g.traces.filter(t => t.t > 0); }
  if (Math.floor(g.t) !== Math.floor(g.t - dt)) { g.gaze = g.gaze || {}; for (const k of g.hollow) { if (k.dead) continue; for (const p of g.players) { if (p.ember) continue; const dx = k.x - p.x, dz = k.z - p.z, d = Math.hypot(dx, dz); if (d < 40 && d > 0.1 && (-Math.sin(p.yaw || 0) * dx - Math.cos(p.yaw || 0) * dz) / d > 0.9) { g.gaze[k.kind] = (g.gaze[k.kind] || 0) + 1; break; } } } }
  if (g.earth && Math.floor(g.t) !== Math.floor(g.t - dt)) for (const p of g.players) if (!p.ember && inHazard(EARTH, p.x, p.z)) { hurt(g, p, WILDS.hazard.dps, 'the spores'); g.stats.hazard = (g.stats.hazard || 0) + 1; }   // (the Wilds' hazard zone: a second of spores costs a few points of light)
  spawn(g, dt, ph); spawnEarth(g, dt); driveCar(g, dt); flyShips(g, dt); moveHollow(g, dt, ph); tripClock(g, dt);
  // motes: gathered by walking through them; carried light is banked by standing in the fire's circle
  for (const m of g.motes) { m.t -= dt; for (const p of g.players) if (!p.ember && Math.hypot(p.x - m.x, p.z - m.z) < 1.4) { p.carried += m.v; m.t = 0; if (m.cell && g.earth && g.earth.found) g.earth.found.cells++; } }
  g.motes = g.motes.filter(m => m.t > 0);
  for (const p of g.players) { if (p.ember) continue; p.pack = p.pack || [];
    for (const q of g.parts) if (!q.taken && Math.hypot(p.x - q.x, p.z - q.z) < 1.6 && loadOf(p) + PARTS[q.kind].kg <= MAX_LOAD) { q.taken = true; p.pack.push(q.kind); if (g.earth && g.earth.found && onEarth(q)) g.earth.found.parts++; g.log.push([+g.t.toFixed(2), 'part', p.id, q.kind]); }
    if (p.pack.length && Math.hypot(p.x - BAY.x, p.z - BAY.z) < 5) { for (const k of p.pack) g.stash[k] = (g.stash[k] || 0) + 1; g.log.push([+g.t.toFixed(2), 'stash', p.id, p.pack.length]); p.pack = []; } }
  if (g.parts.some(q => q.taken)) g.parts = g.parts.filter(q => !q.taken);
  for (const p of g.players) {
    if (!p.ember && p.carried > 0 && Math.hypot(p.x - f.x, p.z - f.z) < fireRadius(f)) { f.light += p.carried; f.fuel = Math.min(600, f.fuel + p.carried * 1.5); g.stats.banked += p.carried; noteBank(g.rec, p, p.carried); if (p.name && !p.bot) { (g.dues = g.dues || {})[p.name] = Math.round((g.dues[p.name] || 0) + p.carried); const pp = person(g, p.name), c = campOf(g), owe = Math.max(0, pp.owed - pp.paid), toDues = Math.min(p.carried, owe), extra = p.carried - toDues;
      pp.own += p.carried; pp.gathered += p.carried; payDues(c, p.name, toDues);   /* (your dues come first, always: playing alone never puts you behind) */
      const away = Object.keys(c.people).some(n => n !== p.name && !g.players.some(q => q.name === n)); if (away && extra > 0) { const give = extra * CAMP.soloShare; pp.own -= give; pp.given += give; pp.paid += give; c.pool += give;   /* (giving to the camp is paying your way: it counts toward your standing) */ g.fire.light -= give; }   /* (held back from the fire until friends are back: counted once) */ else payDues(c, p.name, extra); }   /* (past your dues while a friend is away: most goes to the camp pool for when they are back) */ g.log.push([+g.t.toFixed(2), 'bank', p.id, p.carried]); p.carried = 0; }
    p.hurtT = Math.max(0, p.hurtT - dt); p.calm = p.hurtT > 0 ? 0 : (p.calm || 0) + dt; if (!p.ember && p.calm > 4) p.hp = Math.min(100, p.hp + dt * 8);   // (four quiet seconds and you get your breath back)
    if (p.carrying) { const e = g.embers.find(q => q.id === p.carrying); if (e) { e.x = p.x; e.z = p.z; if (Math.hypot(p.x - f.x, p.z - f.z) < fireRadius(f) * 0.6 || (g.earth && Math.hypot(p.x - EARTH.x, p.z - EARTH.z) < 3.5)) { e.t += dt; if (e.t >= 3) revive(g, e); } else e.t = 0; } else p.carrying = null; }   // (the fire takes three seconds to rekindle someone: hold their Ember near it)
    else if (!p.ember) for (const e of g.embers) if (!e.held && Math.hypot(p.x - e.x, p.z - e.z) < 1.5) { e.held = p.id; p.carrying = e.id; }
  }
  // a tense beat: a player hurt in the last second, or a Hollow within 5 m (for the fun checklist)
  if (ph === 'night' && Math.floor(g.t) !== Math.floor(g.t - dt)) { g.stats.beats++; g.rec.beats++; if (g.players.some(p => !p.ember && (p.hurtT > 0 || g.hollow.some(k => Math.hypot(k.x - p.x, k.z - p.z) < 5)))) { g.stats.tense++; g.rec.tenseBeats++; } }
}
export function mark(g, k, x, z, who) { g.marks.push({ k, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, n: g.night, ...(who ? { who: String(who).slice(0, 12) } : {}) }); if (g.marks.length > 600) g.marks.splice(0, g.marks.length - 600); }   // (the world keeps where things happened)
// ---------------------------------------------------------------- saving: everything that lasts, as plain data (the dark itself does not keep; it comes back each night)
export function saveWorld(g) {
  for (const p of g.players) if (p.name) g.keep[p.name] = Math.floor(p.carried);
  return { v: 1, seed: g.seed, t: g.t, clock: g.clock, night: g.night, tactic: g.tactic, nextId: g.nextId, fire: { level: g.fire.level, light: Math.floor(g.fire.light), fuel: Math.round(g.fire.fuel) },
    nodes: g.nodes.filter(n => !onEarth(n)).map(n => [n.id, n.kind, +n.x.toFixed(2), +n.z.toFixed(2), Math.round(n.hp), n.who || '', n.n || 0, n.honor || '']), motes: g.motes.filter(m => !onEarth(m)).map(m => [+m.x.toFixed(1), +m.z.toFixed(1), m.v]), stash: g.stash, truck: g.truck, learned: g.learned || {}, econ: g.econ ? { day: g.econ.day, pool: g.econ.pool, people: g.econ.people } : null, sites: g.sites || {}, voice: g.voice || {}, dues: g.dues || {}, gaze: g.gaze || {}, theories: g.theories || null, lost: g.lost || [], out: g.out || null, parts: g.parts.filter(q => !onEarth(q)).map(q => [q.kind, +q.x.toFixed(1), +q.z.toFixed(1)]), marks: g.marks, keep: g.keep, stats: g.stats, history: g.history,
    host: g.players[0] && !onEarth(g.players[0]) ? [+g.players[0].x.toFixed(2), +g.players[0].z.toFixed(2)] : [PAD.x - 1.5, PAD.z + 1.5] };
}
export function loadWorld(d) {
  const ok = v => typeof v === 'number' && Number.isFinite(v); if (!d || d.v !== 1 || !ok(d.seed)) return null;
  const g = newGame(d.seed, d.tactic || BASE_TACTIC); g.t = ok(d.t) ? d.t : 0; g.clock = ok(d.clock) ? d.clock : 0.3; g.night = Number.isInteger(d.night) ? d.night : 1; g.nextId = Number.isInteger(d.nextId) ? d.nextId : 1;
  if (d.fire) { g.fire.level = Math.max(0, Math.min(FIRE_COST.length - 1, d.fire.level | 0)); g.fire.light = ok(d.fire.light) ? d.fire.light : 0; g.fire.fuel = ok(d.fire.fuel) ? d.fire.fuel : 180; }
  for (const n of d.nodes || []) if (Array.isArray(n) && NODE[n[1]] && [n[0], n[2], n[3], n[4]].every(ok)) g.nodes.push({ id: n[0], kind: n[1], x: n[2], z: n[3], hp: n[4], lit: false, who: typeof n[5] === 'string' ? n[5].slice(0, 12) : '', n: Number.isInteger(n[6]) ? n[6] : 0, ...(typeof n[7] === 'string' && n[7] ? { honor: n[7].slice(0, 24) } : {}) });
  for (const m of d.motes || []) if (Array.isArray(m) && m.every(ok)) g.motes.push({ id: g.nextId++, x: m[0], z: m[1], v: m[2], t: 1e9 });   // (light left lying out there stays until someone takes it)
  const cnt = o => { const r = {}; if (o && typeof o === 'object') for (const k of PART_ORDER) if (Number.isInteger(o[k]) && o[k] >= 0 && o[k] <= 99) r[k] = o[k]; return r; }; g.stash = cnt(d.stash); g.truck = cnt(d.truck);
  for (const q of d.parts || []) if (Array.isArray(q) && PARTS[q[0]] && ok(q[1]) && ok(q[2])) g.parts.push({ id: g.nextId++, kind: q[0], x: q[1], z: q[2] });
  if (d.theories && typeof d.theories === 'object' && Object.keys(THEORIES).every(k => ok(d.theories[k]))) { g.theories = {}; for (const k of Object.keys(THEORIES)) g.theories[k] = Math.max(0.01, Math.min(0.85, d.theories[k])); }
  g.gaze = {}; if (d.gaze && typeof d.gaze === 'object') for (const k of Object.keys(KINDS)) if (ok(d.gaze[k]) && d.gaze[k] >= 0) g.gaze[k] = Math.round(d.gaze[k]);
  g.voice = {}; if (d.voice && typeof d.voice === 'object') for (const [k, v] of Object.entries(d.voice).slice(0, 16)) if (k.length <= 24 && Array.isArray(v)) g.voice[k] = v.filter(l => typeof l === 'string').map(l => l.replace(/[<>&]/g, '').slice(0, 70)).slice(0, 12);
  if (d.econ && typeof d.econ === 'object' && d.econ.people && typeof d.econ.people === 'object') { const c = campOf(g); c.day = d.econ.day | 0; c.pool = ok(d.econ.pool) ? d.econ.pool : 0; for (const [n, v] of Object.entries(d.econ.people).slice(0, 32)) if (n.length <= 24 && v && [v.paid, v.owed].every(ok)) c.people[n] = { paid: v.paid, owed: v.owed, own: ok(v.own) ? v.own : 0, spent: 0, power: 0, gathered: ok(v.gathered) ? v.gathered : 0, given: 0, days: v.days | 0 }; }
  g.learned = {}; if (d.learned && typeof d.learned === 'object') for (const k of PART_ORDER) if (d.learned[k]) g.learned[k] = 1;
  g.sites = {}; if (d.sites && typeof d.sites === 'object') for (const k of Object.keys(SITES)) { const v = d.sites[k]; if (v && [v.trips, v.parts, v.cells].every(ok)) g.sites[k] = { trips: v.trips | 0, parts: v.parts | 0, cells: v.cells | 0 }; }
  g.dues = {}; if (d.dues && typeof d.dues === 'object') for (const [k, v] of Object.entries(d.dues).slice(0, 32)) if (typeof k === 'string' && k.length <= 24 && ok(v) && v >= 0) g.dues[k] = Math.round(v);
  g.lost = Array.isArray(d.lost) ? d.lost.filter(w => CAMP_OUT.includes(w)) : []; g.out = d.out && CAMP_OUT.includes(d.out.who) ? { who: d.out.who, night: d.out.night | 0 } : null;
  g.marks = Array.isArray(d.marks) ? d.marks.filter(m => m && ok(m.x) && ok(m.z)).slice(-600) : []; g.keep = d.keep && typeof d.keep === 'object' ? d.keep : {}; if (d.stats) Object.assign(g.stats, d.stats); g.history = Array.isArray(d.history) ? d.history.filter(h => h && typeof h === 'object').slice(-30) : [];
  g.startAt = Array.isArray(d.host) && d.host.every(ok) ? d.host : null; linkNetwork(g); return g;
}
function revive(g, e) {
  const p = g.players.find(q => q.id === e.of); if (p) { p.ember = false; p.hp = 50; p.x = g.fire.x + 1; p.z = g.fire.z; p.y = heightAt(g.land, p.x, p.z); p.tp = (p.tp || 0) + 1; }   // (tp: tells a friend's screen it was moved)
  const h = g.players.find(q => q.id === e.held); if (h) h.carrying = null;
  g.embers = g.embers.filter(q => q !== e); g.log.push([+g.t.toFixed(2), 'revive', e.of, e.held]);
}
// growing the fire is a choice: a player standing at it spends banked light, and tonight the dark answers with what that level wakes
export function canGrow(g) { const f = g.fire; return f.level < FIRE_COST.length - 1 && f.light >= FIRE_COST[f.level + 1]; }
export function grow(g, p) { const f = g.fire; if (!canGrow(g) || !p || p.ember || Math.hypot(p.x - f.x, p.z - f.z) > fireRadius(f)) return false; f.light -= FIRE_COST[f.level + 1]; f.level++; g.log.push([+g.t.toFixed(2), 'level', f.level, p.id]); return true; }
export function shotBy(g, p, hit) { if (p) noteShot(g.rec, p, hit); }   // (for the record: how well each player hits)
// people go out, and some do not come back (INNOVATION.md, camp): at each dawn one of the camp (never the Clerk: the desk needs her) goes out
// for a day; the next dawn they come back on the camp's true odds, from the last three nights' falls. A loss is permanent and saved.
export const CAMP_OUT = ['the Night worker', 'a Council member'];
// the wall of theories (INNOVATION.md: every survivor has a theory, all could be wrong): live odds that what you find moves, never past 85%
export const THEORIES = { mind: { who: 'the Night worker', says: 'one thing, wearing what we fear' }, creatures: { who: 'a Council member', says: 'many things, grown to look like fear' },
  us: { who: 'nobody, out loud', says: 'they were people, once' }, heads: { who: 'the Clerk', says: 'the dark is dark; the faces are ours' } };
export function evidence(g, toward, k = 1.12) {   // (one find nudges one theory up; the rest share the loss; nothing is ever checked)
  const t = g.theories = g.theories || { mind: 0.25, creatures: 0.25, us: 0.25, heads: 0.25 }; t[toward] *= k; let sum = 0; for (const x in t) sum += t[x]; for (const x in t) t[x] = Math.min(0.85, t[x] / sum);
}
export function tripOdds(g) { const h = g.history.slice(-3), n = Math.max(1, g.players.length); if (!h.length) return 0.85; const fallRate = h.reduce((s, x) => s + x.falls, 0) / (h.length * n); return Math.max(0.72, Math.min(0.95, 0.95 - fallRate * 0.4)); }
// the camp economy, live (queue 47; core/camp.js tuned 9 of 9 by sim/camp_sim.mjs): the fire eats 120 light a day, split between whoever was
// here; banking pays your share; standing is paid minus owed, remembered; behind, prices rise and the camp hands out no lamps
export function campOf(g) { return g.econ = g.econ || newCamp([]); }
export function person(g, name) { const c = campOf(g); return c.people[name] = c.people[name] || { paid: 0, owed: 0, own: 0, spent: 0, power: 0, gathered: 0, given: 0, days: 0 }; }
// each person the fire lights that day owes the same share, alone or in a crew (sim/economy.mjs: a split burn made playing alone cost double)
export const DUES = { perPerson: 30 };
const behindOf = (g, name) => Math.max(0, -standing(person(g, name))) / DUES.perPerson;
export const econ = { standing: (g, name) => standing(person(g, name)), behind: behindOf, price: (g, name, base) => base * (1 + Math.min(CAMP.priceCap, behindOf(g, name) * CAMP.priceStep)), lamps: (g, name) => behindOf(g, name) <= CAMP.lanternDebt,
  morale: g => { const ns = Object.keys(campOf(g).people); return ns.length ? Math.max(0, 1 - ns.reduce((s, n) => s + Math.min(3, behindOf(g, n)), 0) / ns.length / 3) : 1; }, get burn() { return DUES.perPerson; } };
function campDues(g) { const c0 = campOf(g); if (c0.pool > 0 && (g.seenToday || []).length >= 2) { g.fire.light += c0.pool; g.log.push([+g.t.toFixed(2), 'pool', Math.round(c0.pool)]); c0.pool = 0; }   // (a dawn with two or more here: the pool goes into the fire, and everyone shares it)
  { const c1 = campOf(g); for (const [n, pp] of Object.entries(c1.people)) { const honors = g.nodes.filter(x => x.honor === n).length; if (honors < 6 && standing(pp) >= 300 * (honors + 1)) {   // (what credit buys: every 300 light of credit, the camp raises a lamp in the yard with your name)
      const a = (Object.keys(c1.people).indexOf(n) * 1.7 + honors * 0.55) % (Math.PI * 2), x = Math.cos(a) * 16, z = Math.sin(a) * 16, node = placeNode(g, 'lamp', x, z, 0); if (node) { node.who = n; node.honor = n; g.log.push([+g.t.toFixed(2), 'honor', n, honors + 1]); } } } }
  const c = campOf(g); c.day++; for (const n of g.seenToday || []) { const pp = person(g, n); pp.owed += DUES.perPerson; pp.days++; pp.dueToday = DUES.perPerson; } g.seenToday = g.players.filter(q => q.name && !q.bot).map(q => q.name); }
function campTrips(g) { campDues(g);
  g.lost = g.lost || []; const r = stream(g.seed, 'camp-' + g.night);
  if (g.out) { const back = r() < tripOdds(g); if (!back) { g.lost.push(g.out.who); evidence(g, 'us', 1.15); } g.log.push([+g.t.toFixed(2), back ? 'returned' : 'lost', g.out.who]); g.out = null; return; }
  const free = CAMP_OUT.filter(w => !g.lost.includes(w)); if (free.length && r() < 0.3) { g.out = { who: free[Math.floor(r() * free.length)], night: g.night }; g.log.push([+g.t.toFixed(2), 'goes', g.out.who]); }
}
export function hurt(g, p, n, from) {
  if (p.ember) return;
  // two quiet mercies the best action games keep (GAMEDEV-TRICKS.md): the last quarter of your light is worth more than it looks (Doom,
  // Assassin's Creed), and no single hit takes you from healthy to down (Control). Falls stay earned, never one cheap blow.
  p.stress = (p.stress || 0) + n * DIRECTOR.hurt; const was = p.hp; if (was <= 25) n *= 0.6; p.hp -= n; if (was > 40 && p.hp <= 0) p.hp = 1; p.hurtT = 1;
  if (p.hp <= 0) {   // (you become an Ember where you fell; the light you carried spills as motes; a friend carries the Ember home)
    for (const k of p.pack || []) g.parts.push({ id: g.nextId++, kind: k, x: p.x + (Math.random() - 0.5) * 2, z: p.z + (Math.random() - 0.5) * 2 }); p.pack = [];
    if (g.earth && onEarth(p)) { const L = g.earth.lost = g.earth.lost || { falls: 0, cells: 0, parts: 0 }; L.falls++; L.cells += p.carried / 8; }
    p.ember = true; p.hp = 0; g.stats.falls++; g.rec.falls++; if (p.carrying) { const e = g.embers.find(q => q.id === p.carrying); if (e) e.held = null; p.carrying = null; }
    for (let i = 0; i < Math.ceil(p.carried / 5); i++) g.motes.push({ id: g.nextId++, x: p.x + (g.rMote() - 0.5) * 2, z: p.z + (g.rMote() - 0.5) * 2, v: 5, t: 60 });
    const killer = g.hollow.filter(k => !k.dead && k.kind === from).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];   // (your Ember shows how you fell, INNOVATION.md: the last 10 s and what came for you)
    (g.traces = g.traces || []).push({ of: p.id, pts: (p.trail || []).slice(), x: p.x, z: p.z, cause: from || 'the dark', fx: killer ? killer.x : p.x, fz: killer ? killer.z : p.z, t: 120 }); if (g.traces.length > 6) g.traces.shift(); p.trail = [];
    p.carried = 0; g.embers.push({ id: g.nextId++, of: p.id, x: p.x, z: p.z, held: null, t: 0, cause: from || 'the dark' }); mark(g, 'fall', p.x, p.z, p.name); g.log.push([+g.t.toFixed(2), 'fall', p.id, from || '']);
    if (g.players.every(q => q.ember)) { g.stats.lostNights = (g.stats.lostNights || 0) + 1;   // (everyone down: the dark took what it came for. The night is lost, what you carried lies where you fell, and it draws back to dawn; the fire keeps every level)
      for (const q of g.players) revive(g, g.embers.find(e => e.of === q.id) || { of: q.id }); g.hollow = []; if (g.earth) endTrip(g); if (g.clock > 0.5 && g.clock < 0.97) g.clock = 0.97;   /* (a trip that ends in everyone falling is still recorded and cleared) */ g.log.push([+g.t.toFixed(2), 'allfell', g.night]); }
  }
}

// the trip: down to Earth from the pad, back up from the landing site; the lander leaves when its time is up, with or without you
// pick the site by its odds (INNOVATION.md, Earth trips): three districts around the landing; each holds different things, and your own
// record turns the posted odds from a guess into reasoned (3 trips) into checked (10 trips)
export const SITES = { city: { name: 'THE CITY', parts: 3, cells: 10, dir: 0, est: [0.3, 2.1] }, depot: { name: 'THE DEPOT', parts: 6, cells: 5, dir: Math.PI * 0.5, est: [2.3, 1.0] }, reservoir: { name: 'THE RESERVOIR', parts: 1, cells: 16, dir: Math.PI, est: [0.1, 3.0] } };   // (est: parts and cells a trip for a careful player, from sim/drop.mjs --sites, 20 robot trips each)
export function siteOdds(g, k) { const r = (g.sites || {})[k], S = SITES[k]; if (!r || r.trips < 3) return { parts: S.est[0], cells: S.est[1], label: 'guess: robots', trips: r ? r.trips : 0 };
  const n = r.trips, lc = (r.lostCells || 0) / n, lp = (r.lostParts || 0) / n;   // (the loss goes on the board, INNOVATION.md 13B: the odds drop by exactly what was lost, and the footnote names it)
  return { parts: r.parts / n - lp, cells: r.cells / n - lc, label: labelFor(n), trips: n, lost: { cells: lc, parts: lp, falls: (r.falls || 0) / n, left: (r.left || 0) / n } }; }
export function drop(g, p, site) {
  if (!p || p.ember || onEarth(p) || Math.hypot(p.x - PAD.x, p.z - PAD.z) > 4) return false;
  if (!g.earth) { const S = SITES[site] ? site : 'city'; g.earth = { t: EARTH.stay, n: (g.trips = (g.trips || 0) + 1), site: S, found: { parts: 0, cells: 0 } }; const r = stream(g.seed, 'earth-' + g.earth.n);
    for (let i = 0; i < SITES[S].cells; i++) { const a = SITES[S].dir + (r() - 0.5) * 2.2, d = 14 + r() * 50; g.motes.push({ id: g.nextId++, x: EARTH.x + Math.cos(a) * d, z: EARTH.z + Math.sin(a) * d, v: 8, t: 1e9, cell: true }); } }
  if (g.earth && !g.car && truckDone(g)) g.car = { x: EARTH.x + 7, z: EARTH.z - 3, yaw: 0, v: 0, seats: [null, null, null, null], store: [] };
  if (g.earth && !g.earth.wrecks) { const r = stream(g.seed, 'wrecks-' + g.earth.n), S = SITES[g.earth.site]; g.earth.wrecks = [];   /* (one dead machine a trip, two at the depot) */
    const dry = g.dry || 0;   /* (bad luck paid back, GAMEDEV-TRICKS.md 10: after two trips in a row that found no parts, the next one has an extra wreck, closer in (sim/truckbuild.mjs: one dry trip was too generous). It never says so) */
    for (let i = 0; i < (g.earth.site === 'depot' ? 2 : 1) + (dry >= 2 ? 1 : 0); i++) { const a = S.dir + (r() - 0.5) * 1.6, d = dry >= 2 ? 12 + r() * 16 : 18 + r() * 26; const [x, z] = pushOut(EARTH.x + Math.cos(a) * d, EARTH.z + Math.sin(a) * d, 2.5); g.earth.wrecks.push({ id: g.nextId++, x, z, ry: r() * 6.3, left: 1 }); } }   // (tuned by sim/truckbuild.mjs: more wrecks made every district a parts district)
  if (g.earth && !g.earth.parts) { g.earth.parts = true; const r = stream(g.seed, 'parts-' + g.earth.n), lack = PART_ORDER.flatMap(k => Array(Math.max(0, PARTS[k].n - fitted(g, k) - (g.stash[k] || 0))).fill(k)), pool = lack.length ? lack : PART_ORDER;
    for (let i = 0; i < SITES[g.earth.site].parts; i++) { const a = SITES[g.earth.site].dir + (r() - 0.5) * 2.2, d = g.earth.site === 'depot' ? 14 + r() * 30 : 22 + r() * 48;   /* (a depot keeps its stock close) */ g.parts.push({ id: g.nextId++, kind: pool[Math.floor(r() * pool.length)], x: EARTH.x + Math.cos(a) * d, z: EARTH.z + Math.sin(a) * d }); } }
  for (const q of [...g.motes, ...g.parts]) if (onEarth(q)) [q.x, q.z] = pushOut(q.x, q.z, 1);   // (nothing lies inside a tower)
  p.x = EARTH.x + 1.5; p.z = EARTH.z + 1.5; p.y = heightAt(g.land, p.x, p.z); p.tp = (p.tp || 0) + 1; g.log.push([+g.t.toFixed(2), 'drop', p.id]); evidence(g, 'creatures', 1.04); return true;   // (every trip down sees more of whatever lives there)
}
export function rise(g, p) {
  if (!p || p.ember || !onEarth(p) || Math.hypot(p.x - EARTH.x, p.z - EARTH.z) > 4) return false;
  p.x = PAD.x - 1.5; p.z = PAD.z + 1.5; p.y = heightAt(g.land, p.x, p.z); p.tp = (p.tp || 0) + 1; g.log.push([+g.t.toFixed(2), 'rise', p.id]);
  if (!g.players.some(onEarth)) endTrip(g); return true;
}
function endTrip(g) { if (g.earth && g.earth.found) g.dry = g.earth.found.parts ? 0 : (g.dry || 0) + 1; if (g.earth && g.earth.found) { const k = g.earth.site, r = (g.sites = g.sites || {})[k] = (g.sites[k] || { trips: 0, parts: 0, cells: 0 }); r.trips++; r.parts += g.earth.found.parts; r.cells += g.earth.found.cells; const L = g.earth.lost; if (L) { r.lostCells = (r.lostCells || 0) + L.cells; r.lostParts = (r.lostParts || 0) + L.parts; r.falls = (r.falls || 0) + L.falls; r.left = (r.left || 0) + (L.left || 0); } } if (g.car) { for (const k of g.car.store) g.stash[k] = (g.stash[k] || 0) + 1; g.car = null; } g.earth = null; g.hollow = g.hollow.filter(k => !k.earth); g.motes = g.motes.filter(m => !onEarth(m)); g.parts = g.parts.filter(q => !onEarth(q)); g.nodes = g.nodes.filter(n => !onEarth(n)); g.embers = g.embers.filter(e => !onEarth(e)); linkNetwork(g); }
function tripClock(g, dt) {
  if (!g.earth) return; g.earth.t -= dt; if (g.earth.t > 0) return;
  for (const p of g.players) if (onEarth(p)) {   // (left behind: the lander is gone; whatever brings you back up, the light you carried stays down there)
    { const L = g.earth.lost = g.earth.lost || { falls: 0, cells: 0, parts: 0 }; L.cells += (p.carried || 0) / 8; L.parts += (p.pack || []).length; L.left = (L.left || 0) + 1; }
    if (p.ember) { const e = g.embers.find(q => q.of === p.id); if (e) e.x = 1e9; } p.ember = false; p.carrying = null; p.carried = 0; p.pack = []; p.hp = 25;
    p.x = PAD.x - 1.5; p.z = PAD.z + 1.5; p.y = heightAt(g.land, p.x, p.z); p.tp = (p.tp || 0) + 1; g.log.push([+g.t.toFixed(2), 'stranded', p.id]); }
  g.embers = g.embers.filter(e => e.x < 1e8); endTrip(g);
}
export const EARTH_DARK = { base: 18, perPlayer: 3, perMinute: 7, every: 0.3 };   // (how hard Earth pushes: sim/drop.mjs; per minute 14 to 7 on 2026-10-19 brought a perfect player's tension 0.71 to 0.68, back 95%)
function wakeFaces(g) {   // (about a third of the towers hold one face each per trip; passing within 3 m of that wall wakes it)
  if (!g.earth.faces) { const r = stream(g.seed, 'faces-' + g.earth.n); g.earth.faces = TOWERS.map(() => r() < 0.33); }
  for (const p of g.players) { if (p.ember || !onEarth(p)) continue;
    TOWERS.forEach((t, i) => { if (!g.earth.faces[i]) return; const dx = p.x - t.x, dz = p.z - t.z; if (dx * dx + dz * dz > 150) return; const c = Math.cos(t.ry), sn = Math.sin(t.ry), lx = dx * c - dz * sn, lz = dx * sn + dz * c;
      const ex = Math.max(0, Math.abs(lx) - t.w / 2), ez = Math.max(0, Math.abs(lz) - t.d / 2); if (Math.hypot(ex, ez) > 3) return;
      g.earth.faces[i] = false; const wx = Math.max(-t.w / 2, Math.min(t.w / 2, lx)), wz = Math.max(-t.d / 2, Math.min(t.d / 2, lz)), x = t.x + wx * c + wz * sn, z = t.z - wx * sn + wz * c, K = KINDS.face;
      g.hollow.push({ id: g.nextId++, kind: 'face', earth: true, x, z, y: heightAt(g.land, x, z), yaw: 0, hp: K.hp, max: K.hp, sh: K.shell[0], sb: K.shell[1], cd: 0.4, dead: false, speed: K.speed }); g.log.push([+g.t.toFixed(2), 'face', i]); evidence(g, 'heads', 1.06);   /* (a face in a wall: is it there, or are we seeing faces?) */ }); }
}
function spawnEarth(g, dt) {
  if (!g.earth || DARK.off) return; wakeFaces(g); const down = g.players.filter(p => onEarth(p) && !p.ember); if (!down.length) return;
  const into = EARTH.stay - g.earth.t, want = Math.min(MAX_HOLLOW, EARTH_DARK.base + down.length * EARTH_DARK.perPlayer + Math.floor(into / 60 * EARTH_DARK.perMinute));
  g.spawnE = (g.spawnE || 0) - dt; if (g.spawnE > 0 || g.hollow.filter(k => k.earth).length >= want) return; g.spawnE = EARTH_DARK.every;
  const who = down[Math.floor(g.rSpawn() * down.length)], pool = into > 90 ? ['walker', 'walker', 'runner', 'runner', 'watcher', 'giant'] : into > 30 ? ['walker', 'walker', 'runner', 'watcher'] : ['walker', 'walker', 'runner'];
  const kind = pool[Math.floor(g.rSpawn() * pool.length)], K = KINDS[kind], a = g.rSpawn() * Math.PI * 2, r = 26 + g.rSpawn() * 12, x = who.x + Math.cos(a) * r, z = who.z + Math.sin(a) * r, grow = Math.max(0, g.night - 1);
  g.hollow.push({ id: g.nextId++, kind, earth: true, x, z, y: heightAt(g.land, x, z), yaw: 0, hp: K.hp * (1 + 0.25 * grow), max: K.hp * (1 + 0.25 * grow), sh: K.shell[0] + K.grow[0] * grow, sb: K.shell[1] + K.grow[1] * grow, cd: 0, dead: false, speed: K.speed * (0.85 + g.rSpawn() * 0.3) });
}
// the horde is a flood, light is the dam (INNOVATION.md, hordes): the dimmest of 16 directions around the fire, judged by the light 8 to 20 m out
export function dimmestGap(g) { const f = g.fire; let best = 0, low = Infinity;
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; let L = 0; for (const r of [8, 14, 20]) L += lightAt(g, f.x + Math.cos(a) * r, f.z + Math.sin(a) * r, true); if (L < low) { low = L; best = a; } }
  return best; }
// the Director (GAMEDEV-TRICKS.md 11, 12: Left 4 Dead's pacing, Alien: Isolation's menace gauge). Each person's stress rises with hurt, with the
// dark close (8 m) and with being alone; it fades when nothing is near. When anyone peaks, the dark sends nothing new for a while: build up,
// peak, breathe. It never cheats: what is already out there keeps coming.
export const FLOOD_WARN = 2.5;   // (seconds between the dark choosing a gap and pouring through it: a perfect crew sees it coming, his 5A pass line is 2 s)
export const DIRECTOR = { hurt: 0.025, near: 0.06, alone: 0.015, decay: 0.07, peak: 1.0, relax: 6, r: 3 };   // (picked from 16 tried by sim/director.mjs)
function director(g, dt) {
  if (g.director === false || globalThis.__director === false) return; const D = DIRECTOR;
  for (const p of g.players) { if (p.ember) { p.stress = 0; continue; } let near = 0; for (const k of g.hollow) if (!k.dead && Math.abs(k.x - p.x) < D.r && Math.abs(k.z - p.z) < D.r && Math.hypot(k.x - p.x, k.z - p.z) < D.r) near++;
    const alone = g.players.length > 1 && !g.players.some(q => q !== p && !q.ember && Math.hypot(q.x - p.x, q.z - p.z) < 15);
    p.stress = Math.max(0, Math.min(1.5, (p.stress || 0) + dt * (Math.min(near, 4) * D.near + (alone ? D.alone : 0)) - (near ? 0 : dt * D.decay))); }
  g.relaxT = Math.max(0, (g.relaxT || 0) - dt); const I = Math.max(0, ...g.players.map(p => p.stress || 0));
  if (!g.relaxT && I > D.peak) { g.relaxT = D.relax; g.log.push([+g.t.toFixed(2), 'relax', +I.toFixed(2)]); }
}
function spawn(g, dt, ph) {
  if (DARK.off) { if (g.hollow.length) g.hollow = []; return; }
  if (ph !== 'night' && ph !== 'dusk') return; director(g, dt); if (g.relaxT > 0) return;   /* (a breath after a peak) */
  const night = g.night, want = Math.min(MAX_HOLLOW, 4 + night * 2 + Math.round(3 * Math.pow(g.players.length, 1.5))), T = g.tactic;
  g.spawnT = (g.spawnT || 0) - dt; if (g.spawnT > 0 || g.hollow.length >= want) return;
  const into = (g.clock - NIGHT_AT) / (DAWN_AT - NIGHT_AT), rush = into > T.rushAt;
  g.spawnT = rush ? (g.flood !== false ? 0.35 : 0.5) : 1.6;   // (a flood pours faster than a scatter: tuned by sim/flood.mjs)
  const base = ['walker', 'walker', 'walker', ...g.fire.woke, ...(night >= 3 ? ['runner'] : []), ...(night >= 2 ? ['watcher'] : [])], gz = g.gaze || {}, tot = Object.values(gz).reduce((a, b) => a + b, 0);
  const pool = tot < 30 ? base : [...base, ...[...new Set(base)].flatMap(k => Array(Math.round(3 * (gz[k] || 0) / tot)).fill(k))];   // (the dark wears what you looked at, INNOVATION.md idea 3: it never says so)
  if (rush && g.flood !== false && !((g.gapT = (g.gapT || 0) - dt) > 0)) { g.gapT = 5; const was = g.gapNext !== undefined ? g.gapNext : g.gap, gap = dimmestGap(g); if (was === undefined || Math.abs(Math.atan2(Math.sin(gap - was), Math.cos(gap - was))) > 0.6) { g.gapNext = gap; g.gapAt = g.t + FLOOD_WARN; g.log.push([+g.t.toFixed(2), 'flood-warn', +gap.toFixed(2)]); } }
  if (g.gapNext !== undefined && g.t >= g.gapAt) { g.gap = g.gapNext; g.gapNext = undefined; const now = dimmestGap(g); g.log.push([+g.t.toFixed(2), 'flood', +g.gap.toFixed(2), +Math.abs(Math.atan2(Math.sin(now - g.gap), Math.cos(now - g.gap))).toFixed(2)]);   /* (the last number: how far the dimmest gap has moved since the warning, for sim/breach.mjs) */ evidence(g, 'mind', 1.05); }   /* (the breach shows before it pours, INNOVATION.md 5A: the new gap is marked FLOOD_WARN seconds before the dark is sent through it) */   // (late in the night the horde floods: it finds the weakest part of your light and pours in there)
  const kind = pool[Math.floor(g.rSpawn() * pool.length)], K = KINDS[kind], a = rush && g.flood !== false && g.gap !== undefined ? g.gap + (g.rSpawn() - 0.5) * 0.5 : T.probe + (g.rSpawn() - 0.5) * (rush ? Math.PI * 2 : T.spread), r = tideRadius(g) + 4;
  const x = g.fire.x + Math.cos(a) * r, z = g.fire.z + Math.sin(a) * r, grow = night - 1;
  g.hollow.push({ id: g.nextId++, kind, x, z, y: heightAt(g.land, x, z), yaw: 0, hp: K.hp * (1 + 0.25 * grow), max: K.hp * (1 + 0.25 * grow), sh: K.shell[0] + K.grow[0] * grow, sb: K.shell[1] + K.grow[1] * grow, cd: 0, dead: false, speed: K.speed * (0.85 + g.rSpawn() * 0.3) });
}
export function lookedAt(g, k) {   // (someone on its side of the sky faces it, within about 35 degrees, closer than 45 m)
  for (const p of g.players) { if (p.ember || !!k.earth !== onEarth(p)) continue; const dx = k.x - p.x, dz = k.z - p.z, d = Math.hypot(dx, dz); if (d > 45 || d < 0.1) continue;
    if ((-Math.sin(p.yaw || 0) * dx - Math.cos(p.yaw || 0) * dz) / d > 0.82) return true; }
  return false;
}
function moveHollow(g, dt, ph) {
  const T = g.tactic, f = g.fire; if (g.noises) { for (const n of g.noises) n.t -= dt; g.noises = g.noises.filter(n => n.t > 0); }
  for (const k of g.hollow) {
    const K = KINDS[k.kind];
    if (!k.earth && (ph === 'day' || ph === 'dawn')) { k.hp -= dt * 60; if (k.hp <= 0) k.dead = true; continue; }
    if (k.rt > 0) { k.rt -= dt; if (k.rt <= 0) k.r = 0; else continue; }   /* (flinched, staggered or down: it does nothing until it recovers) */   // (light of day unmakes them: no motes, they were never yours)
    let tx, tz, target = null;
    if (k.kind === 'shard') {   // (the shard goes for the fire, or for whoever carries the most light, weighed by its tactic)
      let best = (Math.hypot(f.x - k.x, f.z - k.z) + 1) / T.fireBias; tx = f.x; tz = f.z;
      for (const p of g.players) if (!p.ember && p.carried > 0 && !!k.earth === onEarth(p)) { const s = Math.hypot(p.x - k.x, p.z - k.z) / (1 + p.carried * 0.05 * T.greed); if (s < best) { best = s; tx = p.x; tz = p.z; target = p; } }
      const d = Math.hypot(tx - k.x, tz - k.z);
      if (d > K.reach) { k.x += (tx - k.x) / d * k.speed * dt; k.z += (tz - k.z) / d * k.speed * dt; }
      else if (target) { const take = Math.min(target.carried, dt * 8); target.carried -= take; } else { const take = Math.min(f.fuel, dt * 6); f.fuel -= take; g.stats.drained += take; }
      k.yaw = Math.atan2(tx - k.x, tz - k.z); k.y = heightAt(g.land, k.x, k.z); continue;
    }
    // walkers, runners and giants hunt players: the lone one counts more (isolate), a glowing carrier more again (greed)
    let best = Infinity; k.alert = Math.max(0, (k.alert || 0) - dt);
    for (const p of g.players) { if (p.ember || !!k.earth !== onEarth(p)) continue; if (!(k.alert > 0 && k.on === p.id) && !sees(g, k, p)) continue; let near = 0; for (const q of g.players) if (q !== p && !q.ember && Math.hypot(q.x - p.x, q.z - p.z) < 8) near++;
      const s = Math.hypot(p.x - k.x, p.z - k.z) / ((near === 0 ? T.isolate : 1) * (1 + Math.min(1, p.carried * 0.02) * (T.greed - 1))); if (s < best) { best = s; target = p; } }
    let node = null; if (g.nodes.length) { let nb = Infinity; for (const n of g.nodes) if (n.lit && n.hp > 0 && !!k.earth === onEarth(n)) { const s2 = Math.hypot(n.x - k.x, n.z - k.z) * (n.hp / NODE[n.kind].hp + 0.5) / T.fireBias; if (s2 < nb) { nb = s2; node = n; } } if (node && (!target || nb < best * 0.8)) target = null; }   // (a weak, lonely relay is a better prize than a person)
    if (g.flares && g.flares.length && k.kind !== 'giant') { const fl = g.flares.filter(f => !!f.earth === !!k.earth && f.t > 1).sort((a, b) => Math.hypot(a.x - k.x, a.z - k.z) - Math.hypot(b.x - k.x, b.z - k.z))[0];
      if (fl && Math.hypot(fl.x - k.x, fl.z - k.z) < FLARE.pull && (!target || Math.hypot(fl.x - k.x, fl.z - k.z) < best * 1.5)) { target = null; node = { x: fl.x, z: fl.z, hp: 1, kind: 'flare', flare: true };
        const df = Math.hypot(fl.x - k.x, fl.z - k.z); if (df < FLARE.r) { k.hp -= dt * FLARE.burn * (1 - df / FLARE.r); if (k.hp <= 0 && !k.dead) { k.dead = true; die(g, k, 'light'); continue; } } } }   /* (it burns what it pulls in: a trap, not a gathering) */
    if (target) { if (sees(g, k, target)) k.alert = SENSE.alert; k.on = target.id; k.lx = target.x; k.lz = target.z; }
    if (!target && !node && g.noises) { let nb = Infinity; for (const n of g.noises) { const dn = Math.hypot(n.x - k.x, n.z - k.z); if (!!n.earth === !!k.earth && dn < n.r && dn < nb) { nb = dn; k.lx = n.x; k.lz = n.z; k.alert = SENSE.alert; k.on = -1; } } }   /* (a shot it heard: it goes to look) */
    if (!target && !node && k.alert > 0 && k.lx !== undefined) { const dl = Math.hypot(k.lx - k.x, k.lz - k.z); if (dl > 1) { k.x += (k.lx - k.x) / dl * k.speed * dt; k.z += (k.lz - k.z) / dl * k.speed * dt; k.yaw = Math.atan2(k.lx - k.x, k.lz - k.z); } k.y = heightAt(g.land, k.x, k.z); continue; }   /* (it goes where it last sensed you, or where the noise was) */
    if (!target && !node && !k.earth) { const df = Math.hypot(f.x - k.x, f.z - k.z); if (df > 6) { const sp = k.speed * SENSE.drift * dt; k.x += (f.x - k.x) / df * sp; k.z += (f.z - k.z) / df * sp; k.yaw = Math.atan2(f.x - k.x, f.z - k.z); } k.y = heightAt(g.land, k.x, k.z); continue; }   /* (sensing nothing, it drifts toward the camp's light, slower than a hunt: the light is what draws the dark) */
    if (!target && !node) continue;
    if (!target) { tx = node.x; tz = node.z; const d0 = Math.hypot(tx - k.x, tz - k.z); if (d0 < 1.4) { if (node.flare) continue; if ((k.cd -= dt) <= 0) { node.hp -= K.bite * 2; k.cd = K.wait; if (node.hp <= 0) { mark(g, 'wreck', node.x, node.z); linkNetwork(g); g.log.push([+g.t.toFixed(2), 'broke', node.kind]); } } continue; } const sp = k.speed * dt; k.x += (tx - k.x) / d0 * sp; k.z += (tz - k.z) / d0 * sp; k.yaw = Math.atan2(tx - k.x, tz - k.z); k.y = heightAt(g.land, k.x, k.z); continue; }
    tx = target.x; tz = target.z;
    let dx = tx - k.x, dz = tz - k.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    const ahead = lightAt(g, k.x + dx * 1.5, k.z + dz * 1.5), here = lightAt(g, k.x, k.z);
    if (k.kind !== 'giant' && !k.staged) { if (here > 0.15) k.hp -= dt * 50 * here; if (ahead > 0.25 && d > K.reach) { const side = k.id % 2 ? 1 : -1; [dx, dz] = [dx * 0.25 + dz * side, dz * 0.25 - dx * side]; } }   // (light burns them, so they circle its edge; the giant walks in)
    if (k.hp <= 0 && !k.dead) { k.dead = true; die(g, k, 'light'); continue; }
    if (K.watched && (k.still = lookedAt(g, k))) { k.y = heightAt(g.land, k.x, k.z); continue; }   // (seen: it holds perfectly still, wherever it was caught)
    k.yaw = Math.atan2(dx, dz);
    const back = target.yaw !== undefined && d > K.reach * 0.45 && (-Math.sin(target.yaw) * (k.x - target.x) - Math.cos(target.yaw) * (k.z - target.z)) / Math.max(d, 0.01) < -0.17;   /* (behind you it moves, in front it strikes, GAMEDEV-TRICKS.md 5: more than about 100 degrees off your facing it closes in but holds its blow until you turn or it is right on you) */
    if (d < K.reach * 0.88 && !back) { if ((k.cd -= dt) <= 0) { hurt(g, target, K.bite, k.kind);   /* (its claws look longer than they reach: a near miss you can see, GAMEDEV-TRICKS.md 8) */ k.cd = K.wait; } }
    else { k.x += dx * k.speed * dt; k.z += dz * k.speed * dt; }
    k.y = heightAt(g.land, k.x, k.z);
  }
  // bodies keep their room (his eyes, 2026-10-19: they clipped through him and stuck to him, and through each other): a shape never stands
  // inside a person or inside another shape; it is pushed out to touching, the giant's body wider. Positions only: who it hunts is unchanged.
  const R = k => k.kind === 'giant' ? 1.15 : 0.55, live = g.hollow.filter(k => !k.dead && !(K_WATCH(k) && k.still));
  for (const k of live) { for (const p of g.players) { if (p.ember) continue; const dx = k.x - p.x, dz = k.z - p.z, d = Math.hypot(dx, dz), min = R(k) + 0.4; if (d < min) { const u = d > 1e-4 ? 1 / d : 0; k.x = p.x + (u ? dx * u : 1) * min; k.z = p.z + (u ? dz * u : 0) * min; } } }
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) { const a = live[i], b = live[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = R(a) + R(b); if (d < min && d > 1e-4) { const push = (min - d) / 2 / d; a.x -= dx * push; a.z -= dz * push; b.x += dx * push; b.z += dz * push; } }
  for (const k of live) k.y = heightAt(g.land, k.x, k.z);
  g.hollow = g.hollow.filter(k => !k.dead); g.nodes = g.nodes.filter(n => n.hp > 0);
}
const K_WATCH = k => KINDS[k.kind] && KINDS[k.kind].watched;
