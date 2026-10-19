// The learned friend (his ask, 2026-10-19: play with someone who feels exactly like Dalton, or like you): the same faithful robot the
// certifier uses (sim/certify.mjs), playing one person's recorded habits (core/habits.js crewFrom). It keeps the camp; it never takes the lander.
import { hitRay, damage, heightAt, KINDS, shotBy, canGrow, grow, fired } from '../core/game.js?v=181';
import { SECTORS, CAL } from '../core/habits.js?v=181';
const PISTOL = { dmg: 40, head: 2.5, ap: 0.1, rate: 0.35 };
export function think(g, p, r, dt) {   // (one robot plays one person's habits: where they roam, when they bank, how they aim, the way they never look)
  const S = p.style; if (p.ember) return; if (S.perfect) return perfectThink(g, p, r, dt); const f = g.fire;
  let tx = p.homeX, tz = p.homeZ; const ember = g.embers.find(e => !e.held && Math.hypot(e.x - p.x, e.z - p.z) < 40);
  if (p.carrying || p.carried >= S.bankAt) { tx = f.x; tz = f.z; } else if (ember) { tx = ember.x; tz = ember.z; }
  else { const m = g.motes.filter(m => Math.hypot(m.x - p.x, m.z - p.z) < S.greed).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (m) { tx = m.x; tz = m.z; } }
  if (S.together > 0) { const mates = g.players.filter(q => q !== p && !q.ember); if (mates.length) { const cx = mates.reduce((s, q) => s + q.x, 0) / mates.length, cz = mates.reduce((s, q) => s + q.z, 0) / mates.length, w = Math.min(1, S.together) * CAL.pull; tx = tx * (1 - w) + cx * w; tz = tz * (1 - w) + cz * w; } }   // (sticking with others is a dial, not a switch: a 0.56 player is pulled about halfway, never glued)
  const giant = g.hollow.find(k => k.kind === 'giant' && Math.hypot(k.x - p.x, k.z - p.z) < 7); if (giant && S.aim > 0.5) { tx = p.x + (p.x - giant.x) * 2; tz = p.z + (p.z - giant.z) * 2; }   // (a skilled player backs away from a giant and keeps shooting)
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); if (d > 0.5) { const sp = Math.min(d, 4.4 * dt); p.x += dx / d * sp; p.z += dz / d * sp; }
  if (canGrow(g) && g.fire.level < g.night - 1 && g.clock < 0.5) grow(g, p);   // (robots grow the fire by day, at most one level per night survived)
  p.y = heightAt(g.land, p.x, p.z);
  // where they face: mostly out from the fire, never toward their blind sector
  const out = Math.atan2(-(p.x - f.x), -(p.z - f.z)) + Math.PI; p.yaw = out;
  p.cd = (p.cd || 0) - dt; if (p.cd > 0) return;
  const sectorOf = (x, z) => { const a = ((Math.atan2(-(x - p.x), -(z - p.z)) + Math.PI * 4) % (Math.PI * 2)); return Math.floor(a / (Math.PI * 2) * SECTORS) % SECTORS; };
  const k = g.hollow.filter(k => { const dd = Math.hypot(k.x - p.x, k.z - p.z); return dd < 30 && (S.blind < 0 || sectorOf(k.x, k.z) !== S.blind || dd < 7); }).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (!k) return; p.yaw = Math.atan2(-(k.x - p.x), -(k.z - p.z));
  p.cd = PISTOL.rate; const dist = Math.hypot(k.x - p.x, k.z - p.z), chance = S.aim * Math.max(0.15, 1 - dist / 40), head = r() < chance * 0.35;
  if (r() > chance) { shotBy(g, p, false); return { x: k.x, y: k.y + 1.2, z: k.z, miss: true }; }
  const hy = head ? KINDS[k.kind].hits[0][0] : KINDS[k.kind].hits[KINDS[k.kind].hits.length - 1][0], ox = p.x, oy = p.y + 1.6, oz = p.z, vx = k.x - ox, vy = k.y + hy - oy, vz = k.z - oz, L = Math.hypot(vx, vy, vz);
  fired(g, p, ox, oz, vx / L, vz / L); const h = hitRay(g, ox, oy, oz, vx / L, vy / L, vz / L, 31); shotBy(g, p, !!h); if (h) damage(g, h.k, h.part, PISTOL.dmg * (h.mult > 1 ? PISTOL.head : 1), PISTOL.ap, p.id); return { x: k.x, y: k.y + hy, z: k.z };
}
// THE PERFECT CREW (item 16, test only: ?perfectcrew): the same robot as sim/certify.mjs think() with blind < 0, the one lane_b.mjs plays 12 nights
// on 32 seeds with no fall. It is a style flag (S.perfect), never reached by a learned friend: it gets the rifle, then the M14 (night 5) and the rail (night 8),
// falls back to the light when three of the dark are close, steps away from every giant, and one of the crew keeps its eyes on the tall one.
const RIFLE = { dmg: 48, head: 2.0, ap: 0.3, rate: 0.12 }, M14 = { dmg: 120, head: 3.0, ap: 0.7, rate: 0.2 }, RAIL = { dmg: 260, head: 4.0, ap: 1.0, rate: 0.55 };
function perfectThink(g, p, r, dt) {
  const S = p.style, W = g.night >= 8 ? RAIL : g.night >= 5 ? M14 : RIFLE, f = g.fire; let tx = p.homeX, tz = p.homeZ; const ember = g.embers.find(e => !e.held && Math.hypot(e.x - p.x, e.z - p.z) < 40);
  if (p.carrying || p.carried >= S.bankAt) { tx = f.x; tz = f.z; } else if (ember) { tx = ember.x; tz = ember.z; }
  else { const m = g.motes.filter(m => Math.hypot(m.x - p.x, m.z - p.z) < S.greed).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (m) { tx = m.x; tz = m.z; } }
  if (Math.hypot(p.x - f.x, p.z - f.z) > 10 && g.hollow.filter(k => !k.dead && Math.hypot(k.x - p.x, k.z - p.z) < 22).length >= 3) { tx = f.x; tz = f.z; }
  if (S.together > 0) { const mates = g.players.filter(q => q !== p && !q.ember); if (mates.length) { const cx = mates.reduce((s, q) => s + q.x, 0) / mates.length, cz = mates.reduce((s, q) => s + q.z, 0) / mates.length, w = Math.min(1, S.together) * CAL.pull; tx = tx * (1 - w) + cx * w; tz = tz * (1 - w) + cz * w; } }
  { let rx = 0, rz = 0, n = 0; for (const k of g.hollow) { if (k.dead || k.kind !== 'giant') continue; const gd = Math.hypot(k.x - p.x, k.z - p.z); if (gd < 12) { rx += (p.x - k.x) / (gd * gd + 1); rz += (p.z - k.z) / (gd * gd + 1); n++; } }
    if (n) { const L = Math.hypot(rx, rz) || 1; tx = p.x + rx / L * 6; tz = p.z + rz / L * 6; } }
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); if (d > 0.5) { const sp = Math.min(d, 4.4 * dt); p.x += dx / d * sp; p.z += dz / d * sp; }
  if (canGrow(g) && g.fire.level < g.night - 1 && g.clock < 0.5) grow(g, p);
  p.y = heightAt(g.land, p.x, p.z); p.yaw = Math.atan2(-(p.x - f.x), -(p.z - f.z)) + Math.PI;
  const watchers = g.hollow.filter(k => !k.dead && KINDS[k.kind].watched && Math.hypot(k.x - f.x, k.z - f.z) < 60), duty = watchers.length && g.players.filter(q => !q.ember).sort((a, b) => a.id - b.id)[0] === p;
  const aimAt = (k, head) => { const hy = head ? KINDS[k.kind].hits[0][0] : KINDS[k.kind].hits[KINDS[k.kind].hits.length - 1][0], ox = p.x, oy = p.y + 1.6, oz = p.z, vx = k.x - ox, vy = k.y + hy - oy, vz = k.z - oz, L = Math.hypot(vx, vy, vz);
    return { ox, oy, oz, vx, vy, vz, L, hy }; };
  if (duty) { const w = watchers.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; p.yaw = Math.atan2(-(w.x - p.x), -(w.z - p.z)); p.cd = (p.cd || 0) - dt; if (p.cd > 0) return; p.cd = W.rate;
    if (Math.hypot(w.x - p.x, w.z - p.z) > 30 || r() > S.aim * Math.max(0.15, 1 - Math.hypot(w.x - p.x, w.z - p.z) / 40)) { shotBy(g, p, false); return; }
    const a = aimAt(w, false); fired(g, p, a.ox, a.oz, a.vx / a.L, a.vy / a.L); const h = hitRay(g, a.ox, a.oy, a.oz, a.vx / a.L, a.vy / a.L, a.vz / a.L, 31); shotBy(g, p, !!h); if (h) damage(g, h.k, h.part, W.dmg * (h.mult > 1 ? W.head : 1), W.ap, p.id); return { x: w.x, y: w.y + a.hy, z: w.z }; }   // (fired() gets vy where the sim passes it too: kept identical to the tested robot)
  p.cd = (p.cd || 0) - dt; if (p.cd > 0) return;
  const k = g.hollow.filter(k => !k.dead && Math.hypot(k.x - p.x, k.z - p.z) < 30).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (!k) return; p.yaw = Math.atan2(-(k.x - p.x), -(k.z - p.z));
  p.cd = W.rate; const dist = Math.hypot(k.x - p.x, k.z - p.z), chance = S.aim * Math.max(0.15, 1 - dist / 40), head = r() < chance * 0.35; if (r() > chance) { shotBy(g, p, false); return { x: k.x, y: k.y + 1.2, z: k.z, miss: true }; }
  const a = aimAt(k, head); fired(g, p, a.ox, a.oz, a.vx / a.L, a.vz / a.L); const h = hitRay(g, a.ox, a.oy, a.oz, a.vx / a.L, a.vy / a.L, a.vz / a.L, 31); shotBy(g, p, !!h); if (h) damage(g, h.k, h.part, W.dmg * (h.mult > 1 ? W.head : 1), W.ap, p.id); return { x: k.x, y: k.y + a.hy, z: k.z };
}
