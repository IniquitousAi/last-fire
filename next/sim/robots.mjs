// Robot crews that play Last Fire headless, and the breeder that evolves the dark's tactics against them.
// A crew style is how a group plays (how far from the fire they roam, how greedy for light, how well they aim, whether they stick together).
// Later, styles come from recorded sessions of the real crew; for now, a few made-up crews stand in for them.
import { newGame, addPlayer, step, hitRay, damage, heightAt, fireRadius, KINDS, BASE_TACTIC, clampTactic, stream, fired } from '../core/game.js';

export const STYLES = {
  careful: { roam: 10, greed: 6, bankAt: 10, aim: 0.75, together: 1 },
  greedy:  { roam: 40, greed: 25, bankAt: 40, aim: 0.6, together: 0.3 },
  split:   { roam: 30, greed: 14, bankAt: 20, aim: 0.65, together: 0 },
  perfect: { roam: 14, greed: 8, bankAt: 12, aim: 0.95, together: 1 },   // (the fairness check: a perfect crew must not fall to the dark's tactic)
};
const PISTOL = { dmg: 40, head: 2.5, ap: 0.1, rate: 0.35 };   // (a person's pace: about three aimed shots a second)

function think(g, p, S, r, dt) {   // (one robot: shoot the nearest Hollow it can see, gather light near it, bank when full, rescue embers)
  if (p.ember) return;
  const f = g.fire; let tx = p.homeX, tz = p.homeZ;
  const ember = g.embers.find(e => !e.held && Math.hypot(e.x - p.x, e.z - p.z) < 40);
  if (p.carrying || p.carried >= S.bankAt) { tx = f.x; tz = f.z; }
  else if (ember) { tx = ember.x; tz = ember.z; }
  else { const m = g.motes.filter(m => Math.hypot(m.x - p.x, m.z - p.z) < S.greed).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (m) { tx = m.x; tz = m.z; } }
  if (S.together > 0.5) { const mates = g.players.filter(q => q !== p && !q.ember); if (mates.length) { const cx = mates.reduce((s, q) => s + q.x, 0) / mates.length, cz = mates.reduce((s, q) => s + q.z, 0) / mates.length; tx = tx * 0.6 + cx * 0.4; tz = tz * 0.6 + cz * 0.4; } }
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); if (d > 0.5) { const sp = Math.min(d, 4.4 * dt); p.x += dx / d * sp; p.z += dz / d * sp; }
  if (Math.hypot(p.x - f.x, p.z - f.z) > S.roam && !p.carrying && p.carried < S.bankAt && !ember) { const a = Math.atan2(p.z - f.z, p.x - f.x); p.x = f.x + Math.cos(a) * S.roam; p.z = f.z + Math.sin(a) * S.roam; }
  p.y = heightAt(g.land, p.x, p.z);
  p.cd = (p.cd || 0) - dt; if (p.cd > 0) return;
  const k = g.hollow.filter(k => Math.hypot(k.x - p.x, k.z - p.z) < 30).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (!k) return; p.yaw = Math.atan2(-(k.x - p.x), -(k.z - p.z));
  p.cd = PISTOL.rate; const dist = Math.hypot(k.x - p.x, k.z - p.z), hitChance = S.aim * Math.max(0.15, 1 - dist / 40), head = r() < hitChance * 0.35; if (r() > hitChance) return;   // (harder to hit the farther it is)
  const hy = head ? KINDS[k.kind].hits[0][0] : KINDS[k.kind].hits[KINDS[k.kind].hits.length - 1][0], ox = p.x, oy = p.y + 1.6, oz = p.z, vx = k.x - ox, vy = k.y + hy - oy, vz = k.z - oz, L = Math.hypot(vx, vy, vz);
  fired(g, p, ox, oz, vx / L, vz / L); const h = hitRay(g, ox, oy, oz, vx / L, vy / L, vz / L, 31); if (h) damage(g, h.k, h.part, PISTOL.dmg * (h.mult > 1 ? PISTOL.head : 1), PISTOL.ap, p.id);
}
// one game: a crew of n robots plays some nights against a tactic; returns what the night did to them
export function play(tactic, styleName, seed, nights = 3, n = 2) {
  const g = newGame(seed, tactic), S = STYLES[styleName], r = stream(seed, 'robot-' + styleName); if (globalThis.__solidAt !== undefined) g.solidAt = globalThis.__solidAt;
  for (let i = 0; i < n; i++) { const p = addPlayer(g, i + 1, 'R' + i), a = i / n * Math.PI * 2; p.homeX = g.fire.x + Math.cos(a) * Math.min(6, S.roam); p.homeZ = g.fire.z + Math.sin(a) * Math.min(6, S.roam); if (S.together < 0.5) { p.homeX = g.fire.x + Math.cos(a) * S.roam * 0.8; p.homeZ = g.fire.z + Math.sin(a) * S.roam * 0.8; } }
  const dt = 0.1; g.clock = 0.5;
  while (g.night <= nights) { for (const p of g.players) think(g, p, S, r, dt); step(g, dt); if (g.t > 330 * nights) break; }
  return { falls: g.stats.falls, kills: g.stats.kills, banked: g.stats.banked, level: g.fire.level, drained: Math.round(g.stats.drained), tense: g.stats.beats ? g.stats.tense / g.stats.beats : 0, beats: g.stats.beats };
}
// the dark's score against a crew: how close it holds them to the edge (flow), not how many it kills; thrown out (fair = false) if a perfect crew falls, or the nights stop being in the flow band
export function judge(tactic, crew, seeds) {
  let falls = 0, drained = 0, tense = 0, perfectFalls = 0;
  for (const s of seeds) { const a = play(tactic, crew, s); falls += a.falls; drained += a.drained; tense += a.tense; perfectFalls += play(tactic, 'perfect', s + 7777).falls; }
  tense /= seeds.length;
  const fair = perfectFalls <= seeds.length * 0.5 && tense >= 0.25 && tense <= 0.7;
  const perNight = falls / (seeds.length * 3);   // (the dark does not want a slaughter: it wants this crew held at the edge, about one fall a night and half the beats tense)
  return { score: -(Math.abs(perNight - 1) + 3 * Math.abs(tense - 0.5) + drained / 2000), fair, falls, perNight: +perNight.toFixed(2), drained: Math.round(drained), tense: +tense.toFixed(2), perfectFalls };
}
export function breed(crew, { gens = 12, pop = 16, seeds = [1, 2, 3], start = BASE_TACTIC, seed = 99 } = {}) {
  const r = stream(seed, 'breed'), mut = t => clampTactic({ probe: t.probe + (r() - 0.5) * 1.2, spread: t.spread * (0.75 + r() * 0.5), rushAt: t.rushAt + (r() - 0.5) * 0.2, isolate: t.isolate * (0.75 + r() * 0.5), fireBias: t.fireBias * (0.75 + r() * 0.5), greed: t.greed * (0.75 + r() * 0.5) });
  let people = [clampTactic(start), ...Array.from({ length: pop - 1 }, () => mut(start))], best = null, history = [];
  for (let gen = 0; gen < gens; gen++) {
    const rated = people.map(t => ({ t, j: judge(t, crew, seeds) })).sort((a, b) => (b.j.fair - a.j.fair) || (b.j.score - a.j.score));
    if (rated[0].j.fair && (!best || rated[0].j.score > best.j.score)) best = rated[0];
    history.push({ gen, best: rated[0].j });
    const keep = rated.slice(0, pop / 4).map(x => x.t); people = [...keep, ...Array.from({ length: pop - keep.length }, (_, i) => mut(keep[i % keep.length]))];
  }
  return { best, history, base: judge(clampTactic(start), crew, seeds) };
}
