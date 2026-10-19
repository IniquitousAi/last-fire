// The world getting stranger, the fog at dusk, the dark's edge, and the morning after. Plain numbers, no drawing, no Math.random.
import { EARTH, DUSK_AT, NIGHT_AT, DAWN_AT, tideRadius } from './game.js';

// How far from home you are, and how strange the place has become (0 at the fire or inside the walls, 1 at 600 m). The sky and the far
// land read this: the ringed disc grows and tilts, the far ground drifts toward violet, stars thin to a few.
export const STRANGE = { start: 60, full: 600 };
export const homeOf = (x, z) => z > 3000 ? { x: EARTH.x, z: EARTH.z, earth: true } : { x: 0, z: 0, earth: false };
export function strangeAt(x, z) {
  const h = homeOf(x, z), d = Math.hypot(x - h.x, z - h.z), t = Math.max(0, Math.min(1, (d - STRANGE.start) / (STRANGE.full - STRANGE.start)));
  return t * t * (3 - 2 * t);
}
// what the sky shows for a strangeness k: the ringed disc's size in the sky (radians across), its tilt, the ring's width ratio, the stars left
export const skyOf = k => ({ disc: 0.05 + 0.33 * k, tilt: 0.25 + 0.9 * k, ring: 1.6 + 1.2 * k, stars: 1 - 0.7 * k, tint: k });

const dayK = c => c < DUSK_AT ? 0 : c < NIGHT_AT ? (c - DUSK_AT) / (NIGHT_AT - DUSK_AT) : c < DAWN_AT ? 1 : 1 - (c - DAWN_AT) / (1 - DAWN_AT);   // (0 by day, 1 at night)
// Fog multiplier on the base density: none by day, builds over dusk, thickest at night, thins at dawn. Earth holds more of it.
export function fogAt(clock, earth) { const k = dayK(clock), top = earth ? 1.9 : 1.45; return 1 + (top - 1) * k * k * (3 - 2 * k); }
// The dark's edge: a ring around home that moves in at dusk and out at dawn. The Moon uses the Tide; Earth's runs 170 m by day to 70 m at night.
export function edgeOf(g, earth) {
  if (!earth) return { x: g.fire.x, z: g.fire.z, r: tideRadius(g) };
  return { x: EARTH.x, z: EARTH.z, r: 170 - 100 * dayK(g.clock) };
}

// The morning after: what last night left that you can see today. Each is a thing in the world or on the board, never a menu.
// g.night has already moved on at dawn, so "last night" is g.night - 1.
export function consequences(g) {
  const n = g.night - 1, out = [], y = g.history[g.history.length - 1], marks = (g.marks || []).filter(m => m.n === n);
  const falls = marks.filter(m => m.k === 'fall').length, wrecks = marks.filter(m => m.k === 'wreck').length;
  if (marks.length) out.push({ kind: 'marks', n: marks.length, text: `${marks.length} mark${marks.length > 1 ? 's' : ''} on the ground from last night${falls ? `, ${falls} where someone fell` : ''}.` });
  if (wrecks) out.push({ kind: 'relays', n: wrecks, text: `${wrecks} relay${wrecks > 1 ? 's' : ''} out there went dark and stayed dark.` });
  out.push({ kind: 'fire', n: Math.round(g.fire.fuel), text: g.fire.fuel < 60 ? `The fire is low: ${Math.ceil(g.fire.fuel)} s of fuel. Last night ate it.` : `The fire has ${Math.ceil(g.fire.fuel)} s of fuel left after last night.` });
  if (y) out.push({ kind: 'board', n: y.falls, text: y.falls > 0 ? 'The board has a new footnote about last night, with a form number.' : 'The board notes last night was quiet, and distrusts it.' });
  if (g.out) out.push({ kind: 'people', n: 1, text: `${g.out.who} is out today, per the form.` });
  if ((g.lost || []).length) out.push({ kind: 'lost', n: g.lost.length, text: `${g.lost[g.lost.length - 1]} did not come back. The seat is still warm, or the Clerk says so.` });
  if ((g.stats.kills || 0) > 0) out.push({ kind: 'ground', n: g.stats.kills, text: 'Ash from the dark lies where it fell.' });
  if (g.fire.level > 0) out.push({ kind: 'level', n: g.fire.level, text: `The fire stands at level ${g.fire.level}. The dark remembers what that woke.` });
  return out;
}

// Thin dark spires on the far horizon, only where the land is strange. The world is cut into 120 m cells; each cell hashes to the same answer for
// everybody, so a spire is where it was. Returns the nearest `max` within 900 m but never closer than 150 m, as { x, z, w, h }.
const hash = (a, b, s) => { let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(s, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function spiresNear(px, pz, max = 48, R = 900, cell = 120) {
  const out = [], c0x = Math.floor((px - R) / cell), c1x = Math.floor((px + R) / cell), c0z = Math.floor((pz - R) / cell), c1z = Math.floor((pz + R) / cell);
  for (let cx = c0x; cx <= c1x; cx++) for (let cz = c0z; cz <= c1z; cz++) {
    const x = (cx + 0.15 + 0.7 * hash(cx, cz, 1)) * cell, z = (cz + 0.15 + 0.7 * hash(cx, cz, 2)) * cell, d = Math.hypot(x - px, z - pz); if (d < 150 || d > R) continue;
    if ((z > 3000) !== (pz > 3000)) continue;   // (a spire belongs to the place it stands in: none float between the Moon and Earth)
    const k = strangeAt(x, z); if (k < 0.2 + 0.6 * hash(cx, cz, 3)) continue;
    out.push({ x, z, w: 2 + 5 * hash(cx, cz, 4), h: 30 + 90 * hash(cx, cz, 5) * (0.6 + 0.4 * k), d }); }
  return out.sort((a, b) => a.d - b.d).slice(0, max);
}
