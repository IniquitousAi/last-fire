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
export function makeLand(seed) {
  const r = stream(seed, 'land'), n1 = valueNoise(r), n2 = valueNoise(r), n3 = valueNoise(r), n4 = valueNoise(r);
  return (x, z) => {   // (rolling ground, long ridges, and the far land growing stranger the farther from the first fire)
    const far = Math.min(1, Math.hypot(x, z) / 1500), home = Math.max(0, 1 - Math.hypot(x, z) / 30);
    const h = n1(x / 90, z / 90) * 22 + n2(x / 28, z / 28) * 5 + n3(x / 9, z / 9) * 0.8, ridge = Math.abs(n4(x / 160, z / 160) - 0.5) * 2;
    return (h + (1 - ridge) ** 3 * 30 * far) * (1 - home) + 6 * home;
  };
}
export function heightAt(land, x, z) { return land(x, z); }

// ---------------------------------------------------------------- the dark's kinds (silhouette first: tall walker, low runner, floating shard, giant)
// shell: ash plates [head, body] at night 1, growing per night; hits: [height, radius, part 0 head or 1 body, multiplier]
export const KINDS = {
  walker: { hp: 120, shell: [40, 0], grow: [12, 15], speed: 2.4, bite: 14, wait: 1.0, reach: 1.2, hits: [[2.2, 0.26, 0, 2.5], [1.4, 0.4, 1, 1]], motes: 2 },
  runner: { hp: 70, shell: [20, 30], grow: [6, 8], speed: 5.6, bite: 8, wait: 0.6, reach: 1.1, hits: [[0.95, 0.24, 0, 2.5], [0.85, 0.42, 1, 1]], motes: 1 },
  shard: { hp: 100, shell: [0, 60], grow: [0, 15], speed: 3.4, bite: 0, wait: 1, reach: 1.6, hits: [[2.6, 0.55, 1, 1]], motes: 3 },   // (it floats to the fire and drinks its light)
  giant: { hp: 900, shell: [150, 250], grow: [40, 60], speed: 1.3, bite: 34, wait: 1.6, reach: 1.9, hits: [[2.85, 0.32, 0, 2], [2.0, 0.72, 1, 1]], motes: 12 },
};
// what each fire level wakes in the dark that night: the player chooses when to provoke it, by feeding the fire
export const WAKES = [[], ['runner'], ['shard'], ['giant'], ['runner', 'giant'], ['shard', 'giant']];
export const FIRE_COST = [0, 40, 110, 220, 380, 600];   // (light banked to reach each level)

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
    fire: { x: C, z: C, level: 0, light: 0, fuel: 180, woke: [] }, nodes: [], players: [], hollow: [], motes: [], embers: [], nextId: 1, log: [], stats: { kills: 0, falls: 0, banked: 0, tense: 0, beats: 0, drained: 0 } };
}
export function addPlayer(g, id, name = 'Player') {
  const p = { id, name, x: g.fire.x + 3 + g.players.length, z: g.fire.z, y: 0, yaw: 0, pitch: 0, hp: 100, carried: 0, ember: false, carrying: null, isPlayer: true, hurtT: 0 };
  p.y = heightAt(g.land, p.x, p.z); g.players.push(p); return p;
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
  const f = g.fire, lit = new Set(), open = [{ x: f.x, z: f.z, reach: 24 }];
  for (const n of g.nodes) n.lit = false;
  while (open.length) { const a = open.pop(); for (const n of g.nodes) if (!n.lit && n.hp > 0 && Math.hypot(n.x - a.x, n.z - a.z) <= a.reach) { n.lit = true; if (NODE[n.kind].reach) open.push({ x: n.x, z: n.z, reach: NODE[n.kind].reach }); } }
}
export function placeNode(g, kind, x, z, by) {
  const K = NODE[kind]; if (!K) return null; const n = { id: g.nextId++, kind, x, z, hp: K.hp, lit: false, by }; g.nodes.push(n); linkNetwork(g); g.log.push([+g.t.toFixed(2), 'node', kind, Math.round(x), Math.round(z)]); return n;
}
export function lightAt(g, x, z) {   // (0 in the dark, 1 at the heart of a light)
  let L = 0; const f = g.fire, rf = fireRadius(f), df = Math.hypot(f.x - x, f.z - z); if (df < rf) L = 1 - df / rf;
  for (const n of g.nodes) if (n.lit && f.fuel > 0) { const r = NODE[n.kind].r, d = Math.hypot(n.x - x, n.z - z); if (d < r) L = Math.max(L, 1 - d / r); }
  for (const p of g.players) { const r = glowOf(g, p), d = Math.hypot(p.x - x, p.z - z); if (r > 0 && d < r) L = Math.max(L, (1 - d / r) * 0.8); }
  return L;
}

// ---------------------------------------------------------------- shots: the first Hollow a ray passes through, and what the hit does
export function hitRay(g, ox, oy, oz, dx, dy, dz, max = 80) {
  let best = null, bt = max;
  for (const k of g.hollow) for (const [hy, r, part, mult] of KINDS[k.kind].hits) {
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
  g.t += dt; const prev = g.clock; g.clock += dt / DAY;
  if (g.clock >= 1) { g.clock -= 1; g.night++; g.log.push([+g.t.toFixed(2), 'dawn', g.night - 1]); }
  if (prev < DUSK_AT && g.clock >= DUSK_AT) { g.fire.woke = WAKES[Math.min(g.fire.level, WAKES.length - 1)]; g.log.push([+g.t.toFixed(2), 'dusk', g.night, g.fire.level]); }
  const f = g.fire, ph = phase(g.clock); f.fuel = Math.max(0, f.fuel - dt * (ph === 'night' ? 1 : 0.4));   // (the fire eats its fuel fast at night: a crew that never leaves its circle starves it)
  spawn(g, dt, ph); moveHollow(g, dt, ph);
  // motes: gathered by walking through them; carried light is banked by standing in the fire's circle
  for (const m of g.motes) { m.t -= dt; for (const p of g.players) if (!p.ember && Math.hypot(p.x - m.x, p.z - m.z) < 1.4) { p.carried += m.v; m.t = 0; } }
  g.motes = g.motes.filter(m => m.t > 0);
  for (const p of g.players) {
    if (!p.ember && p.carried > 0 && Math.hypot(p.x - f.x, p.z - f.z) < fireRadius(f)) { f.light += p.carried; f.fuel = Math.min(600, f.fuel + p.carried * 1.5); g.stats.banked += p.carried; g.log.push([+g.t.toFixed(2), 'bank', p.id, p.carried]); p.carried = 0; }
    while (f.level < FIRE_COST.length - 1 && f.light >= FIRE_COST[f.level + 1]) { f.level++; g.log.push([+g.t.toFixed(2), 'level', f.level]); }
    p.hurtT = Math.max(0, p.hurtT - dt); p.calm = p.hurtT > 0 ? 0 : (p.calm || 0) + dt; if (!p.ember && p.calm > 4) p.hp = Math.min(100, p.hp + dt * 8);   // (four quiet seconds and you get your breath back)
    if (p.carrying) { const e = g.embers.find(q => q.id === p.carrying); if (e) { e.x = p.x; e.z = p.z; if (Math.hypot(p.x - f.x, p.z - f.z) < fireRadius(f)) revive(g, e); } else p.carrying = null; }
    else if (!p.ember) for (const e of g.embers) if (!e.held && Math.hypot(p.x - e.x, p.z - e.z) < 1.5) { e.held = p.id; p.carrying = e.id; }
  }
  // a tense beat: a player hurt in the last second, or a Hollow within 5 m (for the fun checklist)
  if (ph === 'night' && Math.floor(g.t) !== Math.floor(g.t - dt)) { g.stats.beats++; if (g.players.some(p => !p.ember && (p.hurtT > 0 || g.hollow.some(k => Math.hypot(k.x - p.x, k.z - p.z) < 5)))) g.stats.tense++; }
}
function revive(g, e) {
  const p = g.players.find(q => q.id === e.of); if (p) { p.ember = false; p.hp = 50; p.x = g.fire.x + 1; p.z = g.fire.z; p.y = heightAt(g.land, p.x, p.z); }
  const h = g.players.find(q => q.id === e.held); if (h) h.carrying = null;
  g.embers = g.embers.filter(q => q !== e); g.log.push([+g.t.toFixed(2), 'revive', e.of, e.held]);
}
export function hurt(g, p, n, from) {
  if (p.ember) return; p.hp -= n; p.hurtT = 1;
  if (p.hp <= 0) {   // (you become an Ember where you fell; the light you carried spills as motes; a friend carries the Ember home)
    p.ember = true; p.hp = 0; g.stats.falls++; if (p.carrying) { const e = g.embers.find(q => q.id === p.carrying); if (e) e.held = null; p.carrying = null; }
    for (let i = 0; i < Math.ceil(p.carried / 5); i++) g.motes.push({ id: g.nextId++, x: p.x + (g.rMote() - 0.5) * 2, z: p.z + (g.rMote() - 0.5) * 2, v: 5, t: 60 });
    p.carried = 0; g.embers.push({ id: g.nextId++, of: p.id, x: p.x, z: p.z, held: null, t: 0 }); g.log.push([+g.t.toFixed(2), 'fall', p.id, from || '']);
    if (g.players.every(q => q.ember)) { for (const q of g.players) revive(g, g.embers.find(e => e.of === q.id) || { of: q.id }); g.fire.light = Math.max(0, g.fire.light); g.log.push([+g.t.toFixed(2), 'allfell', g.night]); }   // (everyone down: all wake at the fire; the fire keeps every level)
  }
}

function spawn(g, dt, ph) {
  if (ph !== 'night' && ph !== 'dusk') return;
  const night = g.night, want = Math.min(MAX_HOLLOW, 4 + night * 2 + g.players.length * 3), T = g.tactic;
  g.spawnT = (g.spawnT || 0) - dt; if (g.spawnT > 0 || g.hollow.length >= want) return;
  const into = (g.clock - NIGHT_AT) / (DAWN_AT - NIGHT_AT), rush = into > T.rushAt;
  g.spawnT = rush ? 0.5 : 1.6;
  const pool = ['walker', 'walker', 'walker', ...g.fire.woke, ...(night >= 3 ? ['runner'] : [])];
  const kind = pool[Math.floor(g.rSpawn() * pool.length)], K = KINDS[kind], a = T.probe + (g.rSpawn() - 0.5) * (rush ? Math.PI * 2 : T.spread), r = tideRadius(g) + 4;
  const x = g.fire.x + Math.cos(a) * r, z = g.fire.z + Math.sin(a) * r, grow = night - 1;
  g.hollow.push({ id: g.nextId++, kind, x, z, y: heightAt(g.land, x, z), yaw: 0, hp: K.hp * (1 + 0.25 * grow), max: K.hp * (1 + 0.25 * grow), sh: K.shell[0] + K.grow[0] * grow, sb: K.shell[1] + K.grow[1] * grow, cd: 0, dead: false, speed: K.speed * (0.85 + g.rSpawn() * 0.3) });
}
function moveHollow(g, dt, ph) {
  const T = g.tactic, f = g.fire;
  for (const k of g.hollow) {
    const K = KINDS[k.kind];
    if (ph === 'day' || ph === 'dawn') { k.hp -= dt * 60; if (k.hp <= 0) k.dead = true; continue; }   // (light of day unmakes them: no motes, they were never yours)
    let tx, tz, target = null;
    if (k.kind === 'shard') {   // (the shard goes for the fire, or for whoever carries the most light, weighed by its tactic)
      let best = (Math.hypot(f.x - k.x, f.z - k.z) + 1) / T.fireBias; tx = f.x; tz = f.z;
      for (const p of g.players) if (!p.ember && p.carried > 0) { const s = Math.hypot(p.x - k.x, p.z - k.z) / (1 + p.carried * 0.05 * T.greed); if (s < best) { best = s; tx = p.x; tz = p.z; target = p; } }
      const d = Math.hypot(tx - k.x, tz - k.z);
      if (d > K.reach) { k.x += (tx - k.x) / d * k.speed * dt; k.z += (tz - k.z) / d * k.speed * dt; }
      else if (target) { const take = Math.min(target.carried, dt * 8); target.carried -= take; } else { const take = Math.min(f.fuel, dt * 6); f.fuel -= take; g.stats.drained += take; }
      k.yaw = Math.atan2(tx - k.x, tz - k.z); k.y = heightAt(g.land, k.x, k.z); continue;
    }
    // walkers, runners and giants hunt players: the lone one counts more (isolate), a glowing carrier more again (greed)
    let best = Infinity;
    for (const p of g.players) { if (p.ember) continue; let near = 0; for (const q of g.players) if (q !== p && !q.ember && Math.hypot(q.x - p.x, q.z - p.z) < 8) near++;
      const s = Math.hypot(p.x - k.x, p.z - k.z) / ((near === 0 ? T.isolate : 1) * (1 + Math.min(1, p.carried * 0.02) * (T.greed - 1))); if (s < best) { best = s; target = p; } }
    let node = null; if (g.nodes.length) { let nb = Infinity; for (const n of g.nodes) if (n.lit && n.hp > 0) { const s2 = Math.hypot(n.x - k.x, n.z - k.z) * (n.hp / NODE[n.kind].hp + 0.5) / T.fireBias; if (s2 < nb) { nb = s2; node = n; } } if (node && (!target || nb < best * 0.8)) target = null; }   // (a weak, lonely relay is a better prize than a person)
    if (!target && !node) continue;
    if (!target) { tx = node.x; tz = node.z; const d0 = Math.hypot(tx - k.x, tz - k.z); if (d0 < 1.4) { if ((k.cd -= dt) <= 0) { node.hp -= K.bite * 2; k.cd = K.wait; if (node.hp <= 0) { linkNetwork(g); g.log.push([+g.t.toFixed(2), 'broke', node.kind]); } } continue; } const sp = k.speed * dt; k.x += (tx - k.x) / d0 * sp; k.z += (tz - k.z) / d0 * sp; k.yaw = Math.atan2(tx - k.x, tz - k.z); k.y = heightAt(g.land, k.x, k.z); continue; }
    tx = target.x; tz = target.z;
    let dx = tx - k.x, dz = tz - k.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    const ahead = lightAt(g, k.x + dx * 1.5, k.z + dz * 1.5), here = lightAt(g, k.x, k.z);
    if (k.kind !== 'giant') { if (here > 0.15) k.hp -= dt * 50 * here; if (ahead > 0.25 && d > K.reach) { const side = k.id % 2 ? 1 : -1; [dx, dz] = [dx * 0.25 + dz * side, dz * 0.25 - dx * side]; } }   // (light burns them, so they circle its edge; the giant walks in)
    if (k.hp <= 0 && !k.dead) { k.dead = true; die(g, k, 'light'); continue; }
    k.yaw = Math.atan2(dx, dz);
    if (d < K.reach) { if ((k.cd -= dt) <= 0) { hurt(g, target, K.bite, k.kind); k.cd = K.wait; } }
    else { k.x += dx * k.speed * dt; k.z += dz * k.speed * dt; }
    k.y = heightAt(g.land, k.x, k.z);
  }
  g.hollow = g.hollow.filter(k => !k.dead); g.nodes = g.nodes.filter(n => n.hp > 0);
}
