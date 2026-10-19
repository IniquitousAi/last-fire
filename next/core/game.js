import { newRecord, sample, noteBank, noteShot, summarize } from './habits.js';
// Last Fire, the rules. No drawing, no sound, no network, no Math.random: the same seed and the same inputs give the same night,
// so the browser, the robots and the daemon all run this one file. Every system draws from its own named random stream.
// Units: meters and seconds. The valley is SIZE x SIZE, the fire at its middle.

export const DAY = 300, DUSK_AT = 0.55, NIGHT_AT = 0.62, DAWN_AT = 0.97;   // (a day is 5 minutes; the Tide rolls in over dusk)
export const MAX_HOLLOW = 32;

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
export const TOWERS = (() => { let q = 33; const rnd = () => (q = (q * 16807) % 2147483647) / 2147483647, out = [];
  for (let i = 0; i < 60; i++) { const a = rnd() * Math.PI * 2, r = 16 + rnd() * 80, w = 3 + rnd() * 7, d = 3 + rnd() * 7, h = 3 + rnd() * rnd() * 30, tx = (rnd() - 0.5) * 0.12, ry = rnd() * Math.PI, tz = (rnd() - 0.5) * 0.12;
    out.push({ x: EARTH.x + Math.cos(a) * r, z: EARTH.z + Math.sin(a) * r, w, d, h, tx, ry, tz }); } return out; })();
export function pushOut(x, z, rad = 0.4) {   // (moves a point out of any tower it is inside: the towers are solid)
  if (z < 3000) return [x, z];
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
export const CAR = { speed: 17, back: 6, turn: 1.7, seats: 4, store: 400, ram: 160, lamp: 14 };
const SEAT_AT = [[-0.45, -0.2], [0.45, -0.2], [-0.45, 1.2], [0.45, 1.2]];   // (driver, front passenger, two in the back; truck's own space, forward is -z)
export const seatOf = (g, id) => g.car ? g.car.seats.indexOf(id) : -1;
export function seatPos(c, i) { const [ox, oz] = SEAT_AT[i] || SEAT_AT[0], co = Math.cos(c.yaw), si = Math.sin(c.yaw); return [c.x + ox * co + oz * si, c.z - ox * si + oz * co]; }
export const storeKg = car => car.store.reduce((s, k) => s + PARTS[k].kg, 0);
export function useCar(g, p) {   // (F at the truck: load your pack first if you carry one, else get in; F inside gets you out)
  const c = g.car; if (!c || !p || p.ember) return null; const i = c.seats.indexOf(p.id);
  if (i >= 0) { c.seats.splice(i, 1); p.x = c.x + Math.cos(c.yaw) * 2.2; p.z = c.z - Math.sin(c.yaw) * 2.2; p.tp = (p.tp || 0) + 1; return 'out'; }
  if (Math.hypot(p.x - c.x, p.z - c.z) > 3.8) return null;
  if ((p.pack || []).length) { const keep = []; for (const k of p.pack) if (storeKg(c) + PARTS[k].kg <= CAR.store) c.store.push(k); else keep.push(k); const n = p.pack.length - keep.length; p.pack = keep; return n ? 'stowed' : 'full'; }
  if (c.seats.length >= CAR.seats) return null; c.seats.push(p.id); p.tp = (p.tp || 0) + 1; return c.seats[0] === p.id ? 'driver' : 'seat';
}
function driveCar(g, dt) {
  const c = g.car; if (!c) return; c.seats = c.seats.filter(id => { const q = g.players.find(p => p.id === id); return q && !q.ember && onEarth(q); });
  const d = g.players.find(p => p.id === c.seats[0]), th = d && d.drive ? d.drive.th : 0, st = d && d.drive ? d.drive.st : 0;
  const want = th > 0 ? th * CAR.speed : th * CAR.back; c.v += (want - c.v) * Math.min(1, dt * (th === 0 ? 1.2 : 1.6));
  c.yaw -= st * CAR.turn * dt * Math.max(-1, Math.min(1, c.v / 6));
  const nx = c.x - Math.sin(c.yaw) * c.v * dt, nz = c.z - Math.cos(c.yaw) * c.v * dt, [px, pz] = pushOut(nx, nz, 1.7);
  if (px !== nx || pz !== nz) c.v *= -0.25; c.x = px; c.z = pz;   // (a tower stops it hard)
  for (const k of g.hollow) if (k.earth && !k.dead && Math.abs(c.v) > 5 && Math.hypot(k.x - c.x, k.z - c.z) < 2.2 && solid(g, k)) { damage(g, k, 0, CAR.ram * Math.abs(c.v) / CAR.speed, 1, d ? d.id : 0); c.v *= 0.85; }
  c.seats.forEach((id, i) => { const q = g.players.find(p => p.id === id); if (!q) return; [q.x, q.z] = seatPos(c, i); q.y = heightAt(g.land, q.x, q.z) + 0.9; });
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
    const e = Math.hypot(x - EARTH.x, z - EARTH.z), ke = Math.min(1, Math.max(0, (e - 40) / 50)), site = 1 - ke * ke * (3 - 2 * ke);   /* (Earth's landing site: a flat dead city floor, rough hills past it) */
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
export function glowOf(g, p) { if (p.ember) return 0; let near = 0; for (const q of g.players) if (q !== p && !q.ember && Math.hypot(q.x - p.x, q.z - p.z) < 6) near++; return 3 + near * 2 + Math.min(4, p.carried * 0.08); }
export const NODE = { relay: { r: 7, reach: 22, hp: 120, cost: 15 }, lamp: { r: 11, reach: 0, hp: 80, cost: 25 } };   // (a relay carries light on; a lamp only shines)
export function linkNetwork(g) {   // (which nodes are lit: walk outward from the fire through relays in reach of each other)
  const f = g.fire, lit = new Set(), open = [{ x: f.x, z: f.z, reach: 24 }, ...(g.earth ? [{ x: EARTH.x, z: EARTH.z, reach: EARTH.reach }] : [])];
  for (const n of g.nodes) n.lit = false;
  while (open.length) { const a = open.pop(); for (const n of g.nodes) if (!n.lit && n.hp > 0 && Math.hypot(n.x - a.x, n.z - a.z) <= a.reach) { n.lit = true; if (NODE[n.kind].reach) open.push({ x: n.x, z: n.z, reach: NODE[n.kind].reach }); } }
}
export function placeNode(g, kind, x, z, by) {
  const K = NODE[kind]; if (!K) return null; const n = { id: g.nextId++, kind, x, z, hp: K.hp, lit: false, by }; g.nodes.push(n); linkNetwork(g); g.log.push([+g.t.toFixed(2), 'node', kind, Math.round(x), Math.round(z)]); return n;
}
export function lightAt(g, x, z, noGlow) {   // (noGlow: leave out the glow players carry, for 'is this place lit')   // (0 in the dark, 1 at the heart of a light)
  let L = 0; const f = g.fire, rf = fireRadius(f), df = Math.hypot(f.x - x, f.z - z); if (df < rf) L = 1 - df / rf;
  for (const n of g.nodes) if (n.lit && (f.fuel > 0 || onEarth(n))) { const r = NODE[n.kind].r, d = Math.hypot(n.x - x, n.z - z); if (d < r) L = Math.max(L, 1 - d / r); }
  if (!noGlow) for (const p of g.players) { const r = glowOf(g, p), d = Math.hypot(p.x - x, p.z - z); if (r > 0 && d < r) L = Math.max(L, (1 - d / r) * 0.8); }
  if (g.earth) { const d = Math.hypot(EARTH.x - x, EARTH.z - z); if (d < EARTH.light) L = Math.max(L, 1 - d / EARTH.light); }
  if (g.tracers) for (const t of g.tracers) { const vx = t.bx - t.ax, vz = t.bz - t.az, k = Math.max(0, Math.min(1, ((x - t.ax) * vx + (z - t.az) * vz) / (vx * vx + vz * vz))), d = Math.hypot(t.ax + vx * k - x, t.az + vz * k - z); if (d < TRACER.width) L = Math.max(L, 0.5 * t.t / TRACER.life); }
  if (g.car) { const c = g.car, dx = x - c.x, dz = z - c.z, ahead = -dx * Math.sin(c.yaw) - dz * Math.cos(c.yaw), side = Math.abs(dx * Math.cos(c.yaw) - dz * Math.sin(c.yaw));
    if (ahead > 0 && ahead < CAR.lamp && side < 1.2 + ahead * 0.45) L = Math.max(L, 0.8 * (1 - ahead / CAR.lamp)); else if (dx * dx + dz * dz < 9) L = Math.max(L, 0.3); }   // (the headlights: a wedge of light ahead, a little around the cab)
  return L;
}

// ---------------------------------------------------------------- shots: the first Hollow a ray passes through, and what the hit does
// tracers are light (INNOVATION.md, idea 1): every fourth round burns a line through the air for a third of a second, and what it passes turns solid
export const TRACER = { every: 4, life: 0.35, width: 1.8, len: 40 };
export function fired(g, p, ox, oz, dx, dz) { p.shots = (p.shots || 0) + 1; if (p.shots % TRACER.every) return false; const L = Math.hypot(dx, dz) || 1; (g.tracers = g.tracers || []).push({ ax: ox, az: oz, bx: ox + dx / L * TRACER.len, bz: oz + dz / L * TRACER.len, t: TRACER.life }); return true; }
export const SOLID_AT = 0.02;   // (the dark has no shape of its own: out of every light it is smoke, and shots pass through; light makes it commit to a shape you can kill. PLAN-SPACE.md)
export const solid = (g, k) => lightAt(g, k.x, k.z) > (g.solidAt ?? SOLID_AT);   /* (g.solidAt: the simulator turns the rule off for its control) */
export function hitRay(g, ox, oy, oz, dx, dy, dz, max = 80) {
  let best = null, bt = max;
  for (const k of g.hollow) if (solid(g, k)) for (const [hy, r, part, mult] of KINDS[k.kind].hits) {
    const cx = k.x - ox, cy = k.y + hy - oy, cz = k.z - oz, t = cx * dx + cy * dy + cz * dz; if (t < 0 || t > bt) continue;
    if (cx * cx + cy * cy + cz * cz - t * t < r * r) { bt = t; best = { k, part, mult, t }; }
  }
  return best;
}
// a shell takes most of a blow and wears (piercing guns get more through and wear it faster); the blow that breaks it is spent on it
export function damage(g, k, part, dmg, ap, by) {
  const key = part ? 'sb' : 'sh'; let res;
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
  g.t += dt; const prev = g.clock; if (g.tracers && g.tracers.length) { for (const t of g.tracers) t.t -= dt; g.tracers = g.tracers.filter(t => t.t > 0); } g.clock += dt / DAY;
  if (g.clock >= 1) { g.clock -= 1; g.night++; g.log.push([+g.t.toFixed(2), 'dawn', g.night - 1]); }
  if (prev < 0.97 && g.clock >= 0.97) { g.history.push(summarize(g.rec, g.night)); if (g.history.length > 30) g.history.shift(); g.rec = newRecord(); g.log.push([+g.t.toFixed(2), 'learned-night', g.night]); }   // (at the ebb, the night is written down)
  if (prev < DUSK_AT && g.clock >= DUSK_AT) { g.fire.woke = WAKES[Math.min(g.fire.level, WAKES.length - 1)]; g.log.push([+g.t.toFixed(2), 'dusk', g.night, g.fire.level]); }
  const f = g.fire, ph = phase(g.clock); f.fuel = Math.max(0, f.fuel - dt * (ph === 'night' ? 1 : 0.4));   // (the fire eats its fuel fast at night: a crew that never leaves its circle starves it)
  if ((ph === 'night' || ph === 'dusk') && Math.floor(g.t) !== Math.floor(g.t - dt)) sample(g.rec, g, g.fire.x, g.fire.z);
  spawn(g, dt, ph); spawnEarth(g, dt); driveCar(g, dt); moveHollow(g, dt, ph); tripClock(g, dt);
  // motes: gathered by walking through them; carried light is banked by standing in the fire's circle
  for (const m of g.motes) { m.t -= dt; for (const p of g.players) if (!p.ember && Math.hypot(p.x - m.x, p.z - m.z) < 1.4) { p.carried += m.v; m.t = 0; } }
  g.motes = g.motes.filter(m => m.t > 0);
  for (const p of g.players) { if (p.ember) continue; p.pack = p.pack || [];
    for (const q of g.parts) if (!q.taken && Math.hypot(p.x - q.x, p.z - q.z) < 1.6 && loadOf(p) + PARTS[q.kind].kg <= MAX_LOAD) { q.taken = true; p.pack.push(q.kind); g.log.push([+g.t.toFixed(2), 'part', p.id, q.kind]); }
    if (p.pack.length && Math.hypot(p.x - BAY.x, p.z - BAY.z) < 5) { for (const k of p.pack) g.stash[k] = (g.stash[k] || 0) + 1; g.log.push([+g.t.toFixed(2), 'stash', p.id, p.pack.length]); p.pack = []; } }
  if (g.parts.some(q => q.taken)) g.parts = g.parts.filter(q => !q.taken);
  for (const p of g.players) {
    if (!p.ember && p.carried > 0 && Math.hypot(p.x - f.x, p.z - f.z) < fireRadius(f)) { f.light += p.carried; f.fuel = Math.min(600, f.fuel + p.carried * 1.5); g.stats.banked += p.carried; noteBank(g.rec, p, p.carried); g.log.push([+g.t.toFixed(2), 'bank', p.id, p.carried]); p.carried = 0; }
    p.hurtT = Math.max(0, p.hurtT - dt); p.calm = p.hurtT > 0 ? 0 : (p.calm || 0) + dt; if (!p.ember && p.calm > 4) p.hp = Math.min(100, p.hp + dt * 8);   // (four quiet seconds and you get your breath back)
    if (p.carrying) { const e = g.embers.find(q => q.id === p.carrying); if (e) { e.x = p.x; e.z = p.z; if (Math.hypot(p.x - f.x, p.z - f.z) < fireRadius(f) * 0.6 || (g.earth && Math.hypot(p.x - EARTH.x, p.z - EARTH.z) < 3.5)) { e.t += dt; if (e.t >= 3) revive(g, e); } else e.t = 0; } else p.carrying = null; }   // (the fire takes three seconds to rekindle someone: hold their Ember near it)
    else if (!p.ember) for (const e of g.embers) if (!e.held && Math.hypot(p.x - e.x, p.z - e.z) < 1.5) { e.held = p.id; p.carrying = e.id; }
  }
  // a tense beat: a player hurt in the last second, or a Hollow within 5 m (for the fun checklist)
  if (ph === 'night' && Math.floor(g.t) !== Math.floor(g.t - dt)) { g.stats.beats++; g.rec.beats++; if (g.players.some(p => !p.ember && (p.hurtT > 0 || g.hollow.some(k => Math.hypot(k.x - p.x, k.z - p.z) < 5)))) { g.stats.tense++; g.rec.tenseBeats++; } }
}
export function mark(g, k, x, z) { g.marks.push({ k, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, n: g.night }); if (g.marks.length > 600) g.marks.splice(0, g.marks.length - 600); }   // (the world keeps where things happened)
// ---------------------------------------------------------------- saving: everything that lasts, as plain data (the dark itself does not keep; it comes back each night)
export function saveWorld(g) {
  for (const p of g.players) if (p.name) g.keep[p.name] = Math.floor(p.carried);
  return { v: 1, seed: g.seed, t: g.t, clock: g.clock, night: g.night, tactic: g.tactic, nextId: g.nextId, fire: { level: g.fire.level, light: Math.floor(g.fire.light), fuel: Math.round(g.fire.fuel) },
    nodes: g.nodes.filter(n => !onEarth(n)).map(n => [n.id, n.kind, +n.x.toFixed(2), +n.z.toFixed(2), Math.round(n.hp)]), motes: g.motes.filter(m => !onEarth(m)).map(m => [+m.x.toFixed(1), +m.z.toFixed(1), m.v]), stash: g.stash, truck: g.truck, parts: g.parts.filter(q => !onEarth(q)).map(q => [q.kind, +q.x.toFixed(1), +q.z.toFixed(1)]), marks: g.marks, keep: g.keep, stats: g.stats, history: g.history,
    host: g.players[0] && !onEarth(g.players[0]) ? [+g.players[0].x.toFixed(2), +g.players[0].z.toFixed(2)] : [PAD.x - 1.5, PAD.z + 1.5] };
}
export function loadWorld(d) {
  const ok = v => typeof v === 'number' && Number.isFinite(v); if (!d || d.v !== 1 || !ok(d.seed)) return null;
  const g = newGame(d.seed, d.tactic || BASE_TACTIC); g.t = ok(d.t) ? d.t : 0; g.clock = ok(d.clock) ? d.clock : 0.3; g.night = Number.isInteger(d.night) ? d.night : 1; g.nextId = Number.isInteger(d.nextId) ? d.nextId : 1;
  if (d.fire) { g.fire.level = Math.max(0, Math.min(FIRE_COST.length - 1, d.fire.level | 0)); g.fire.light = ok(d.fire.light) ? d.fire.light : 0; g.fire.fuel = ok(d.fire.fuel) ? d.fire.fuel : 180; }
  for (const n of d.nodes || []) if (Array.isArray(n) && NODE[n[1]] && [n[0], n[2], n[3], n[4]].every(ok)) g.nodes.push({ id: n[0], kind: n[1], x: n[2], z: n[3], hp: n[4], lit: false });
  for (const m of d.motes || []) if (Array.isArray(m) && m.every(ok)) g.motes.push({ id: g.nextId++, x: m[0], z: m[1], v: m[2], t: 1e9 });   // (light left lying out there stays until someone takes it)
  const cnt = o => { const r = {}; if (o && typeof o === 'object') for (const k of PART_ORDER) if (Number.isInteger(o[k]) && o[k] >= 0 && o[k] <= 99) r[k] = o[k]; return r; }; g.stash = cnt(d.stash); g.truck = cnt(d.truck);
  for (const q of d.parts || []) if (Array.isArray(q) && PARTS[q[0]] && ok(q[1]) && ok(q[2])) g.parts.push({ id: g.nextId++, kind: q[0], x: q[1], z: q[2] });
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
export function hurt(g, p, n, from) {
  if (p.ember) return; p.hp -= n; p.hurtT = 1;
  if (p.hp <= 0) {   // (you become an Ember where you fell; the light you carried spills as motes; a friend carries the Ember home)
    for (const k of p.pack || []) g.parts.push({ id: g.nextId++, kind: k, x: p.x + (Math.random() - 0.5) * 2, z: p.z + (Math.random() - 0.5) * 2 }); p.pack = [];
    p.ember = true; p.hp = 0; g.stats.falls++; g.rec.falls++; if (p.carrying) { const e = g.embers.find(q => q.id === p.carrying); if (e) e.held = null; p.carrying = null; }
    for (let i = 0; i < Math.ceil(p.carried / 5); i++) g.motes.push({ id: g.nextId++, x: p.x + (g.rMote() - 0.5) * 2, z: p.z + (g.rMote() - 0.5) * 2, v: 5, t: 60 });
    p.carried = 0; g.embers.push({ id: g.nextId++, of: p.id, x: p.x, z: p.z, held: null, t: 0 }); mark(g, 'fall', p.x, p.z); g.log.push([+g.t.toFixed(2), 'fall', p.id, from || '']);
    if (g.players.every(q => q.ember)) {   // (everyone down: the dark took what it came for. The night is lost, what you carried lies where you fell, and it draws back to dawn; the fire keeps every level)
      for (const q of g.players) revive(g, g.embers.find(e => e.of === q.id) || { of: q.id }); g.hollow = []; g.earth = null; if (g.clock > 0.5 && g.clock < 0.97) g.clock = 0.97; g.log.push([+g.t.toFixed(2), 'allfell', g.night]); }
  }
}

// the trip: down to Earth from the pad, back up from the landing site; the lander leaves when its time is up, with or without you
export function drop(g, p) {
  if (!p || p.ember || onEarth(p) || Math.hypot(p.x - PAD.x, p.z - PAD.z) > 4) return false;
  if (!g.earth) { g.earth = { t: EARTH.stay, n: (g.trips = (g.trips || 0) + 1) }; const r = stream(g.seed, 'earth-' + g.earth.n);
    for (let i = 0; i < EARTH.cells; i++) { const a = r() * Math.PI * 2, d = 14 + r() * 50; g.motes.push({ id: g.nextId++, x: EARTH.x + Math.cos(a) * d, z: EARTH.z + Math.sin(a) * d, v: 8, t: 1e9, cell: true }); } }
  if (g.earth && !g.car && truckDone(g)) g.car = { x: EARTH.x + 7, z: EARTH.z - 3, yaw: 0, v: 0, seats: [], store: [] };
  if (g.earth && !g.earth.parts) { g.earth.parts = true; const r = stream(g.seed, 'parts-' + g.earth.n), lack = PART_ORDER.flatMap(k => Array(Math.max(0, PARTS[k].n - fitted(g, k) - (g.stash[k] || 0))).fill(k)), pool = lack.length ? lack : PART_ORDER;
    for (let i = 0; i < 3; i++) { const a = r() * Math.PI * 2, d = 22 + r() * 48; g.parts.push({ id: g.nextId++, kind: pool[Math.floor(r() * pool.length)], x: EARTH.x + Math.cos(a) * d, z: EARTH.z + Math.sin(a) * d }); } }
  for (const q of [...g.motes, ...g.parts]) if (onEarth(q)) [q.x, q.z] = pushOut(q.x, q.z, 1);   // (nothing lies inside a tower)
  p.x = EARTH.x + 1.5; p.z = EARTH.z + 1.5; p.y = heightAt(g.land, p.x, p.z); p.tp = (p.tp || 0) + 1; g.log.push([+g.t.toFixed(2), 'drop', p.id]); return true;
}
export function rise(g, p) {
  if (!p || p.ember || !onEarth(p) || Math.hypot(p.x - EARTH.x, p.z - EARTH.z) > 4) return false;
  p.x = PAD.x - 1.5; p.z = PAD.z + 1.5; p.y = heightAt(g.land, p.x, p.z); p.tp = (p.tp || 0) + 1; g.log.push([+g.t.toFixed(2), 'rise', p.id]);
  if (!g.players.some(onEarth)) endTrip(g); return true;
}
function endTrip(g) { if (g.car) { for (const k of g.car.store) g.stash[k] = (g.stash[k] || 0) + 1; g.car = null; } g.earth = null; g.hollow = g.hollow.filter(k => !k.earth); g.motes = g.motes.filter(m => !onEarth(m)); g.parts = g.parts.filter(q => !onEarth(q)); g.nodes = g.nodes.filter(n => !onEarth(n)); g.embers = g.embers.filter(e => !onEarth(e)); linkNetwork(g); }
function tripClock(g, dt) {
  if (!g.earth) return; g.earth.t -= dt; if (g.earth.t > 0) return;
  for (const p of g.players) if (onEarth(p)) {   // (left behind: the lander is gone; whatever brings you back up, the light you carried stays down there)
    if (p.ember) { const e = g.embers.find(q => q.of === p.id); if (e) e.x = 1e9; } p.ember = false; p.carrying = null; p.carried = 0; p.pack = []; p.hp = 25;
    p.x = PAD.x - 1.5; p.z = PAD.z + 1.5; p.y = heightAt(g.land, p.x, p.z); p.tp = (p.tp || 0) + 1; g.log.push([+g.t.toFixed(2), 'stranded', p.id]); }
  g.embers = g.embers.filter(e => e.x < 1e8); endTrip(g);
}
export const EARTH_DARK = { base: 18, perPlayer: 3, perMinute: 14, every: 0.3 };   // (how hard Earth pushes: picked by sim/drop.mjs --tune from 45 settings, 20 trips each, robots slowed by what they carry: perfect solo back 100%, careful 95%, greedy 65%, tense 0.58 to 0.70)
function wakeFaces(g) {   // (about a third of the towers hold one face each per trip; passing within 3 m of that wall wakes it)
  if (!g.earth.faces) { const r = stream(g.seed, 'faces-' + g.earth.n); g.earth.faces = TOWERS.map(() => r() < 0.33); }
  for (const p of g.players) { if (p.ember || !onEarth(p)) continue;
    TOWERS.forEach((t, i) => { if (!g.earth.faces[i]) return; const dx = p.x - t.x, dz = p.z - t.z; if (dx * dx + dz * dz > 150) return; const c = Math.cos(t.ry), sn = Math.sin(t.ry), lx = dx * c - dz * sn, lz = dx * sn + dz * c;
      const ex = Math.max(0, Math.abs(lx) - t.w / 2), ez = Math.max(0, Math.abs(lz) - t.d / 2); if (Math.hypot(ex, ez) > 3) return;
      g.earth.faces[i] = false; const wx = Math.max(-t.w / 2, Math.min(t.w / 2, lx)), wz = Math.max(-t.d / 2, Math.min(t.d / 2, lz)), x = t.x + wx * c + wz * sn, z = t.z - wx * sn + wz * c, K = KINDS.face;
      g.hollow.push({ id: g.nextId++, kind: 'face', earth: true, x, z, y: heightAt(g.land, x, z), yaw: 0, hp: K.hp, max: K.hp, sh: K.shell[0], sb: K.shell[1], cd: 0.4, dead: false, speed: K.speed }); g.log.push([+g.t.toFixed(2), 'face', i]); }); }
}
function spawnEarth(g, dt) {
  if (!g.earth) return; wakeFaces(g); const down = g.players.filter(p => onEarth(p) && !p.ember); if (!down.length) return;
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
function spawn(g, dt, ph) {
  if (ph !== 'night' && ph !== 'dusk') return;
  const night = g.night, want = Math.min(MAX_HOLLOW, 4 + night * 2 + g.players.length * 3), T = g.tactic;
  g.spawnT = (g.spawnT || 0) - dt; if (g.spawnT > 0 || g.hollow.length >= want) return;
  const into = (g.clock - NIGHT_AT) / (DAWN_AT - NIGHT_AT), rush = into > T.rushAt;
  g.spawnT = rush ? (g.flood !== false ? 0.35 : 0.5) : 1.6;   // (a flood pours faster than a scatter: tuned by sim/flood.mjs)
  const pool = ['walker', 'walker', 'walker', ...g.fire.woke, ...(night >= 3 ? ['runner'] : []), ...(night >= 2 ? ['watcher'] : [])];
  if (rush && g.flood !== false && !((g.gapT = (g.gapT || 0) - dt) > 0)) { g.gapT = 5; const was = g.gap; g.gap = dimmestGap(g); if (was === undefined || Math.abs(Math.atan2(Math.sin(g.gap - was), Math.cos(g.gap - was))) > 0.6) g.log.push([+g.t.toFixed(2), 'flood', +g.gap.toFixed(2)]); }   // (late in the night the horde floods: it finds the weakest part of your light and pours in there)
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
  const T = g.tactic, f = g.fire;
  for (const k of g.hollow) {
    const K = KINDS[k.kind];
    if (!k.earth && (ph === 'day' || ph === 'dawn')) { k.hp -= dt * 60; if (k.hp <= 0) k.dead = true; continue; }   // (light of day unmakes them: no motes, they were never yours)
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
    let best = Infinity;
    for (const p of g.players) { if (p.ember || !!k.earth !== onEarth(p)) continue; let near = 0; for (const q of g.players) if (q !== p && !q.ember && Math.hypot(q.x - p.x, q.z - p.z) < 8) near++;
      const s = Math.hypot(p.x - k.x, p.z - k.z) / ((near === 0 ? T.isolate : 1) * (1 + Math.min(1, p.carried * 0.02) * (T.greed - 1))); if (s < best) { best = s; target = p; } }
    let node = null; if (g.nodes.length) { let nb = Infinity; for (const n of g.nodes) if (n.lit && n.hp > 0 && !!k.earth === onEarth(n)) { const s2 = Math.hypot(n.x - k.x, n.z - k.z) * (n.hp / NODE[n.kind].hp + 0.5) / T.fireBias; if (s2 < nb) { nb = s2; node = n; } } if (node && (!target || nb < best * 0.8)) target = null; }   // (a weak, lonely relay is a better prize than a person)
    if (!target && !node) continue;
    if (!target) { tx = node.x; tz = node.z; const d0 = Math.hypot(tx - k.x, tz - k.z); if (d0 < 1.4) { if ((k.cd -= dt) <= 0) { node.hp -= K.bite * 2; k.cd = K.wait; if (node.hp <= 0) { mark(g, 'wreck', node.x, node.z); linkNetwork(g); g.log.push([+g.t.toFixed(2), 'broke', node.kind]); } } continue; } const sp = k.speed * dt; k.x += (tx - k.x) / d0 * sp; k.z += (tz - k.z) / d0 * sp; k.yaw = Math.atan2(tx - k.x, tz - k.z); k.y = heightAt(g.land, k.x, k.z); continue; }
    tx = target.x; tz = target.z;
    let dx = tx - k.x, dz = tz - k.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    const ahead = lightAt(g, k.x + dx * 1.5, k.z + dz * 1.5), here = lightAt(g, k.x, k.z);
    if (k.kind !== 'giant' && !k.staged) { if (here > 0.15) k.hp -= dt * 50 * here; if (ahead > 0.25 && d > K.reach) { const side = k.id % 2 ? 1 : -1; [dx, dz] = [dx * 0.25 + dz * side, dz * 0.25 - dx * side]; } }   // (light burns them, so they circle its edge; the giant walks in)
    if (k.hp <= 0 && !k.dead) { k.dead = true; die(g, k, 'light'); continue; }
    if (K.watched && (k.still = lookedAt(g, k))) { k.y = heightAt(g.land, k.x, k.z); continue; }   // (seen: it holds perfectly still, wherever it was caught)
    k.yaw = Math.atan2(dx, dz);
    if (d < K.reach) { if ((k.cd -= dt) <= 0) { hurt(g, target, K.bite, k.kind); k.cd = K.wait; } }
    else { k.x += dx * k.speed * dt; k.z += dz * k.speed * dt; }
    k.y = heightAt(g.land, k.x, k.z);
  }
  g.hollow = g.hollow.filter(k => !k.dead); g.nodes = g.nodes.filter(n => n.hp > 0);
}
