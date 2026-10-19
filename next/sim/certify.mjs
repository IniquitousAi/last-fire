// Certified learning: the dark proposes tactics against a robot copy of the real crew; a tactic goes live only if it is proven.
// 1. Build the crew from its recorded nights (core/habits.js crewFrom), and check the robots really play like that (their own recorded habits match).
// 2. Breed tactics against them (the same breeder as robots.mjs).
// 3. Certify, the daemon's way: three runs in a row on fresh nights, each fair (a perfect crew never falls), each in the flow band
//    (25 to 70% of moments tense, about one fall a night), and better than the dark it would replace by more than twice the noise.
import { newGame, addPlayer, step, hitRay, damage, heightAt, KINDS, BASE_TACTIC, clampTactic, stream, shotBy, canGrow, grow, FIRE_COST, fired } from '../core/game.js';
import { crewFrom, summarize, SECTORS, CAL } from '../core/habits.js';

const PISTOL = { dmg: 40, head: 2.5, ap: 0.1, rate: 0.35 };
const RIFLE = { dmg: 48, head: 2.0, ap: 0.3, rate: 0.12 };   // (the M4 he starts with, at a human pace: a perfect crew carries it, the recorded players keep the pistol)
const M14 = { dmg: 120, head: 3.0, ap: 0.7, rate: 0.2 };   // (a perfect crew has bought the M14 by night 5)
const RAIL = { dmg: 260, head: 4.0, ap: 1.0, rate: 0.55 };   // (and the rail by night 8: its slow, heavy shot is how a crew drops a giant)
const PERFECT = { name: 'perfect', roam: 12, greed: 8, bankAt: 12, aim: 0.95, together: 1, blind: -1 };

export function think(g, p, r, dt) {   // (one robot plays one person's habits: where they roam, when they bank, how they aim, the way they never look)
  const S = p.style; if (p.ember) return; const W = S.blind < 0 ? (g.night >= 8 ? RAIL : g.night >= 5 ? M14 : RIFLE) : PISTOL; const f = g.fire;
  let tx = p.homeX, tz = p.homeZ; const ember = g.embers.find(e => !e.held && Math.hypot(e.x - p.x, e.z - p.z) < 40);
  if (p.carrying || p.carried >= S.bankAt) { tx = f.x; tz = f.z; } else if (ember) { tx = ember.x; tz = ember.z; }
  else { const m = g.motes.filter(m => Math.hypot(m.x - p.x, m.z - p.z) < S.greed).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (m) { tx = m.x; tz = m.z; } }
  if (S.blind < 0 && Math.hypot(p.x - f.x, p.z - f.z) > 10 && g.hollow.filter(k => !k.dead && Math.hypot(k.x - p.x, k.z - p.z) < 22).length >= 3) { tx = f.x; tz = f.z; }   // (a perfect player falls back to the light when three or more of the dark are close)
  if (S.together > 0) { const mates = g.players.filter(q => q !== p && !q.ember); if (mates.length) { const cx = mates.reduce((s, q) => s + q.x, 0) / mates.length, cz = mates.reduce((s, q) => s + q.z, 0) / mates.length, w = Math.min(1, S.together) * CAL.pull; tx = tx * (1 - w) + cx * w; tz = tz * (1 - w) + cz * w; } }   // (sticking with others is a dial, not a switch: a 0.56 player is pulled about halfway, never glued)
  if (S.blind < 0) { let rx = 0, rz = 0, n = 0; for (const k of g.hollow) { if (k.dead || k.kind !== 'giant') continue; const gd = Math.hypot(k.x - p.x, k.z - p.z); if (gd < 12) { rx += (p.x - k.x) / (gd * gd + 1); rz += (p.z - k.z) / (gd * gd + 1); n++; } }
    if (n) { const L = Math.hypot(rx, rz) || 1; tx = p.x + rx / L * 6; tz = p.z + rz / L * 6; } }   // (a perfect player steps away from every giant at once, never into the next one)
  else { const giant = g.hollow.find(k => k.kind === 'giant' && Math.hypot(k.x - p.x, k.z - p.z) < 7); if (giant && S.aim > 0.5) { tx = p.x + (p.x - giant.x) * 2; tz = p.z + (p.z - giant.z) * 2; } }   // (a skilled player backs away from a giant and keeps shooting)
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); if (d > 0.5) { const sp = Math.min(d, 4.4 * dt); p.x += dx / d * sp; p.z += dz / d * sp; }
  if (canGrow(g) && g.fire.level < g.night - 1 && g.clock < 0.5) grow(g, p);   // (robots grow the fire by day, at most one level per night survived)
  p.y = heightAt(g.land, p.x, p.z);
  // where they face: mostly out from the fire, never toward their blind sector
  const out = Math.atan2(-(p.x - f.x), -(p.z - f.z)) + Math.PI; p.yaw = out;
  const watchers = S.blind < 0 ? g.hollow.filter(k => !k.dead && KINDS[k.kind].watched && Math.hypot(k.x - f.x, k.z - f.z) < 60) : [], duty = watchers.length && g.players.filter(q => !q.ember).sort((a, b) => a.id - b.id)[0] === p;
  if (duty) { const w = watchers.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; p.yaw = Math.atan2(-(w.x - p.x), -(w.z - p.z)); p.cd = (p.cd || 0) - dt; if (p.cd > 0) return; p.cd = W.rate; if (Math.hypot(w.x - p.x, w.z - p.z) > 30 || r() > S.aim * Math.max(0.15, 1 - Math.hypot(w.x - p.x, w.z - p.z) / 40)) { shotBy(g, p, false); return; }
    const hy = KINDS[w.kind].hits[KINDS[w.kind].hits.length - 1][0], ox = p.x, oy = p.y + 1.6, oz = p.z, vx = w.x - ox, vy = w.y + hy - oy, vz = w.z - oz, L = Math.hypot(vx, vy, vz); fired(g, p, ox, oz, vx / L, vy / L); const h = hitRay(g, ox, oy, oz, vx / L, vy / L, vz / L, 31); shotBy(g, p, !!h); if (h) damage(g, h.k, h.part, W.dmg * (h.mult > 1 ? W.head : 1), W.ap, p.id); return; }   // (a perfect crew keeps one pair of eyes on the tall one, which only moves unwatched, and that one shoots it; the rest fight on)   // (a perfect player never turns their back on the tall one: it only moves unwatched)
  p.cd = (p.cd || 0) - dt; if (p.cd > 0) return;
  const sectorOf = (x, z) => { const a = ((Math.atan2(-(x - p.x), -(z - p.z)) + Math.PI * 4) % (Math.PI * 2)); return Math.floor(a / (Math.PI * 2) * SECTORS) % SECTORS; };
  const k = g.hollow.filter(k => { const dd = Math.hypot(k.x - p.x, k.z - p.z); return dd < 30 && (S.blind < 0 || sectorOf(k.x, k.z) !== S.blind || dd < 7); }).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (!k) return; p.yaw = Math.atan2(-(k.x - p.x), -(k.z - p.z));
  p.cd = W.rate; const dist = Math.hypot(k.x - p.x, k.z - p.z), chance = S.aim * Math.max(0.15, 1 - dist / 40), head = r() < chance * 0.35;
  if (r() > chance) { shotBy(g, p, false); return; }
  const hy = head ? KINDS[k.kind].hits[0][0] : KINDS[k.kind].hits[KINDS[k.kind].hits.length - 1][0], ox = p.x, oy = p.y + 1.6, oz = p.z, vx = k.x - ox, vy = k.y + hy - oy, vz = k.z - oz, L = Math.hypot(vx, vy, vz);
  fired(g, p, ox, oz, vx / L, vz / L); const h = hitRay(g, ox, oy, oz, vx / L, vy / L, vz / L, 31); shotBy(g, p, !!h); if (h) damage(g, h.k, h.part, W.dmg * (h.mult > 1 ? W.head : 1), W.ap, p.id);
}
// one game: this crew of robots plays some nights against a tactic
export function play(tactic, crew, seed, nights = 2) {
  const g = newGame(seed, tactic), r = stream(seed, 'robots');
  crew.forEach((S, i) => { const p = addPlayer(g, i + 1, S.name), a = (i / crew.length) * Math.PI * 2 + 0.4; p.style = S; const home = Math.min(S.roam, 30); p.homeX = g.fire.x + Math.cos(a) * home; p.homeZ = g.fire.z + Math.sin(a) * home; });
  g.clock = 0.5; while (g.night <= nights && g.t < 330 * nights) { for (const p of g.players) think(g, p, r, 0.1); step(g, 0.1); }
  const nightsDone = g.history.length || 1;
  return { falls: g.stats.falls, perNight: g.stats.falls / nightsDone, tense: g.stats.beats ? g.stats.tense / g.stats.beats : 0, drained: g.stats.drained, history: g.history, g };
}
// do the robots play like the real crew? their own recorded habits must land near the real ones (roam within 35% or 5 m, together within 0.25)
export function faithful(crew, seed = 4242) {
  const h = play(BASE_TACTIC, crew, seed).history, mine = crewFrom(h), bad = [];
  for (const real of crew) { const m = mine.find(q => q.name === real.name); if (!m) { bad.push(real.name + ': no record'); continue; }
    if (Math.abs(m.roam - real.roam) > Math.max(5, real.roam * 0.35)) bad.push(`${real.name}: roams ${m.roam.toFixed(0)} m, really ${real.roam.toFixed(0)} m`);
    if (crew.length > 1 && Math.abs(m.together - real.together) > 0.25) bad.push(`${real.name}: together ${m.together.toFixed(2)}, really ${real.together.toFixed(2)}`);
    if (real.aim >= 0.75 ? m.aim < 0.7 : Math.abs(m.aim - real.aim) > 0.15) bad.push(`${real.name}: hits ${Math.round(m.aim * 100)}%, really ${Math.round(real.aim * 100)}%`);   // (above 0.75 the record cannot tell 0.75 from 0.95: a robot at either records 0.52 to 0.61 hits, because far shots miss, so a strong aimer only has to come back strong: core/habits.js AIM_TABLE) (his misses: the learned friend must miss like him, INNOVATION.md idea 10)
    if (Math.abs(m.bankAt - real.bankAt) > Math.max(7, real.bankAt * 0.35)) bad.push(`${real.name}: banks at ${m.bankAt.toFixed(0)}, really ${real.bankAt.toFixed(0)}`); }   // (his overloads: how much he carries before he banks)
  return { ok: bad.length === 0, bad };
}
function judge(tactic, crew, seeds) {
  let falls = 0, nights = 0, tense = 0, perfectFalls = 0;
  for (const s of seeds) { const a = play(tactic, crew, s); falls += a.falls; nights += a.history.length || 1; tense += a.tense; perfectFalls += play(tactic, crew.map(() => PERFECT), s + 7777).falls; }
  tense /= seeds.length; const perNight = falls / nights;
  // (tension is the goal; falls count lightly, aiming at about one every two nights. Fair: a perfect crew falls at most once in six nights, since even the 'perfect' robot never dodges)
  return { score: -(3 * Math.abs(tense - 0.5) + 0.5 * Math.abs(perNight - 0.5)), fair: perfectFalls <= Math.floor(seeds.length * 2 / 6) && tense >= 0.25 && tense <= 0.7, perNight: +perNight.toFixed(2), tense: +tense.toFixed(2), perfectFalls };
}
export function learn(history, current = BASE_TACTIC, { gens = 10, pop = 12, seed = 7 } = {}) {
  const crew = crewFrom(history), t0 = Date.now(), report = { crew: crew.map(c => ({ name: c.name, roam: +c.roam.toFixed(1), together: +c.together.toFixed(2), blind: c.blind, aim: +c.aim.toFixed(2) })) };
  if (!crew.length) return { tactic: null, report: { ...report, why: 'no recorded nights' } };
  const f = faithful(crew); report.faithful = f; if (!f.ok) return { tactic: null, report: { ...report, why: 'the robots do not play like this crew yet' } };
  const r = stream(seed, 'learn'), mut = t => clampTactic({ probe: t.probe + (r() - 0.5) * 1.6, spread: t.spread * (0.7 + r() * 0.6), rushAt: t.rushAt + (r() - 0.5) * 0.25, isolate: t.isolate * (0.7 + r() * 0.6), fireBias: t.fireBias * (0.7 + r() * 0.6), greed: t.greed * (0.7 + r() * 0.6) });
  const seeds = [11, 12, 13, 14, 15];   // (five practice nights: with two it memorized them, and the certifier caught it on fresh ones)
  // aim the first guess at the crew's blind side: the breeder starts there and is free to leave it
  const blindAngle = crew[0].blind >= 0 ? (crew[0].blind + 0.5) / SECTORS * Math.PI * 2 - Math.PI / 2 : current.probe;
  let people = [clampTactic(current), clampTactic({ ...current, probe: blindAngle }), ...Array.from({ length: pop - 2 }, () => mut(current))];
  for (let gen = 0; gen < gens; gen++) { const rated = people.map(t => ({ t, j: judge(t, crew, seeds) })).sort((a, b) => (b.j.fair - a.j.fair) || (b.j.score - a.j.score)); const keep = rated.slice(0, pop / 4).map(x => x.t); people = [...keep, ...Array.from({ length: pop - keep.length }, (_, i) => mut(keep[i % keep.length]))]; report.best = rated[0].j; }
  const cand = people[0];
  // certification: three runs in a row on fresh nights, against the dark it would replace
  const runs = [], base = [];
  for (let i = 0; i < 3; i++) { const fresh = [100 + i * 3, 101 + i * 3, 102 + i * 3]; runs.push(judge(cand, crew, fresh)); base.push(judge(current, crew, fresh)); }
  const noise = Math.max(...base.map(b => b.score)) - Math.min(...base.map(b => b.score)), gain = Math.min(...runs.map((x, i) => x.score - base[i].score));
  report.certify = { runs, base: base.map(b => b.score.toFixed(3)), noise: +noise.toFixed(3), gain: +gain.toFixed(3), seconds: +((Date.now() - t0) / 1000).toFixed(1) };
  const passed = runs.every(x => x.fair) && gain > 2 * noise;
  return { tactic: passed ? cand : null, report: { ...report, passed, why: passed ? 'certified' : runs.some(x => !x.fair) ? 'not fair in every run' : 'not better than the current dark by more than twice the noise' } };
}
