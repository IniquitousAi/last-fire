// node sim/drop.mjs [--tune]: robots ride the lander down to Earth, gather the light cells, fight what comes, and try to make the lander
// before it leaves. Measures, per crew style and crew size: how many come back, how much light they bring, how tense it was.
// --tune tries Earth's pressure settings and keeps the one closest to the pass lines (all of them reasoned, from the night's flow band):
//   a perfect player solo comes back at least 95% of the time; a careful one 70 to 90%; a greedy one 40 to 70% (and brings the most light);
//   tense (danger within 5 m) between 25% and 70% of the trip.
import { newGame, addPlayer, step, hitRay, damage, heightAt, KINDS, stream, drop, rise, onEarth, speedOf, PAD, EARTH, EARTH_DARK, fired, throwFlare, FLARE, loadOf, PARTS, MAX_LOAD } from '../core/game.js';

export const STYLES = {
  careful: { roam: 28, leaveAt: 35, full: 30, aim: 0.75 },
  greedy:  { roam: 60, leaveAt: 14, full: 70, aim: 0.6 },
  perfect: { roam: 45, leaveAt: 25, full: 50, aim: 0.95 },
};
const PISTOL = { dmg: 40, head: 2.5, ap: 0.1, rate: 0.35 };
export function think(g, p, S, r, dt) {
  if (p.ember || !onEarth(p) || p.home) return;
  const goHome = g.earth.t < S.leaveAt + Math.hypot(p.x - EARTH.x, p.z - EARTH.z) / (4.4 * speedOf(p)) || p.carried >= S.full;
  let tx = EARTH.x, tz = EARTH.z;
  if (!goHome) { const want = [...g.motes.filter(m => onEarth(m)), ...g.parts.filter(q => onEarth(q) && loadOf(p) + PARTS[q.kind].kg <= MAX_LOAD)];   // (light cells and truck parts alike: whatever is nearest and can be carried)
    const m = want.filter(m => Math.hypot(m.x - EARTH.x, m.z - EARTH.z) < S.roam).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (m) { tx = m.x; tz = m.z; } }
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); if (d > 0.3) { const sp = Math.min(d, 4.4 * speedOf(p) * dt); p.x += dx / d * sp; p.z += dz / d * sp; } p.y = heightAt(g.land, p.x, p.z);
  if (goHome && Math.hypot(p.x - EARTH.x, p.z - EARTH.z) < 3.5) { const brought = p.carried; if (rise(g, p)) { p.home = true; p.brought = brought; } return; }
  if (globalThis.__flare && (p.flareT = (p.flareT || 0) - dt) <= 0) { const near = g.hollow.filter(k => k.earth && Math.hypot(k.x - p.x, k.z - p.z) < 14); if (near.length >= 3 && p.carried >= FLARE.cost) { const a = Math.atan2(near[0].z - p.z, near[0].x - p.x); throwFlare(g, p, p.x + Math.cos(a) * 9, p.z + Math.sin(a) * 9); p.flareT = 6; } }   // (a robot throws a flare between itself and a pack of three)
  p.cd = (p.cd || 0) - dt; if (p.cd > 0) return;
  const k = g.hollow.filter(k => k.earth && Math.hypot(k.x - p.x, k.z - p.z) < 30).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (!k) return; p.yaw = Math.atan2(-(k.x - p.x), -(k.z - p.z));
  p.cd = PISTOL.rate; const dist = Math.hypot(k.x - p.x, k.z - p.z), hc = S.aim * Math.max(0.15, 1 - dist / 40), head = r() < hc * 0.35; if (r() > hc) return;
  const hy = head ? KINDS[k.kind].hits[0][0] : KINDS[k.kind].hits[KINDS[k.kind].hits.length - 1][0], oy = p.y + 1.6, vx = k.x - p.x, vy = k.y + hy - oy, vz = k.z - p.z, L = Math.hypot(vx, vy, vz);
  fired(g, p, p.x, p.z, vx / L, vz / L); const h = hitRay(g, p.x, oy, p.z, vx / L, vy / L, vz / L, 31); if (h) damage(g, h.k, h.part, PISTOL.dmg * (h.mult > 1 ? PISTOL.head : 1), PISTOL.ap, p.id);
}
export function trip(style, seed, n = 1) {
  const g = newGame(seed), S = STYLES[style], r = stream(seed, 'drop-' + style); g.clock = 0.3;
  for (let i = 0; i < n; i++) { const p = addPlayer(g, i + 1, 'R' + i); p.x = PAD.x + i; p.z = PAD.z; drop(g, p, globalThis.__site); }
  let beats = 0, tense = 0; const dt = 0.1;
  for (let t = 0; t < EARTH.stay + 5 && g.earth; t += dt) {
    for (const p of g.players) think(g, p, S, r, dt); step(g, dt);
    if (Math.floor(t) !== Math.floor(t - dt)) { const down = g.players.filter(p => onEarth(p) && !p.ember); if (down.length) { beats++; if (down.some(p => p.hurtT > 0 || g.hollow.some(k => k.earth && Math.hypot(k.x - p.x, k.z - p.z) < 5))) tense++; } }
  }
  const back = g.players.filter(p => p.home).length, fell = g.log.filter(l => l[1] === 'allfell').length > 0;
  globalThis.__lastGame = g; return { back: back / n, light: g.players.reduce((s, p) => s + (p.brought || 0), 0) / n, tense: beats ? tense / beats : 0, fell };
}
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
function measure(n = 1) {
  const out = {}; for (const s of Object.keys(STYLES)) { const rs = SEEDS.map(seed => trip(s, seed, n)), m = k => rs.reduce((a, x) => a + (+x[k]), 0) / rs.length;
    out[s] = { back: +m('back').toFixed(2), light: Math.round(m('light')), tense: +m('tense').toFixed(2) }; } return out;
}
const miss = o => Math.max(0, 0.95 - o.perfect.back) + Math.max(0, 0.7 - o.careful.back) + Math.max(0, o.careful.back - 0.9) + Math.max(0, 0.4 - o.greedy.back) + Math.max(0, o.greedy.back - 0.7)
  + Object.values(o).reduce((a, x) => a + Math.max(0, 0.25 - x.tense) + Math.max(0, x.tense - 0.7), 0) + (o.greedy.light <= o.careful.light ? 0.3 : 0);
if (process.argv.includes('--sites')) { for (const site of ['city', 'depot', 'reservoir']) { globalThis.__site = site; const rs = SEEDS.map(seed => { const r = trip('careful', seed, 1); const f = (globalThis.__lastGame.sites || {})[site] || { parts: 0, cells: 0 }; return f; }); const m = k => (rs.reduce((a, x) => a + x[k], 0) / rs.length).toFixed(1); console.log(site.padEnd(10), 'careful robot, 20 trips: parts found a trip', m('parts'), ' cells found a trip', m('cells')); } }
else if (process.argv.includes('--flare')) { console.log('no flares:  ', JSON.stringify(measure(1))); globalThis.__flare = true; console.log('with flares:', JSON.stringify(measure(1))); }
else if (process.argv.includes('--tune')) {
  const t0 = Date.now(), tried = [];
  for (const base of [6, 10, 14, 18, 24]) for (const perMinute of [4, 8, 14]) for (const every of [0.3, 0.6, 1.0]) {
    Object.assign(EARTH_DARK, { base, perMinute, every }); const o = measure(1); tried.push({ set: { base, perMinute, every }, o, miss: +miss(o).toFixed(3) }); }
  tried.sort((a, b) => a.miss - b.miss);
  console.log(`tried ${tried.length} settings, 20 trips each per style (${((Date.now() - t0) / 1000).toFixed(0)} s); best five:`);
  for (const t of tried.slice(0, 5)) console.log(JSON.stringify(t));
} else {
  console.log('solo, 20 trips each:', JSON.stringify(measure(1)));
  console.log('duo,  20 trips each:', JSON.stringify(measure(2)));
}
