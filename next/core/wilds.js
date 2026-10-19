// The Wilds (SKELETON.md pillar 1, box 3): open Earth past the walls. A night forest of black dead pines and bare trees from 60 m out, thinning
// near the gates, none inside the walls; one calm green uncorrupted patch of live trees to build a base in; one hazard zone. Positions come from
// here so the client's trees, collision (pushOut) and the robots all agree. Deterministic: its own seeded stream, its own seeded stream only.
// Built from the board's numbers (E = EARTH, W = WALLS, ruins = the towers list) so this file never imports game.js (no import cycle).
export const WILDS = {
  from: 60, to: 240, gate: 14, count: 1100, cell: 12,
  green: { dx: 150, dz: -125, r: 38, clear: 9 },     // (the calm patch: live trees, a clearing in the middle to build in)
  hazard: { dx: -135, dz: 120, r: 30, dps: 3.5 },    // (the spore bog: bare black trunks and a drifting damage zone; the light you carry does not help)
  kinds: { deadpine: { r: 0.35, h: 18 }, bare: { r: 0.25, h: 11 }, live: { r: 0.3, h: 14 } },   // (r matches the grown trees' trunk feet: client/forest.js logs the measured foot radii)
};
export function makeTrees(E, W, ruins) {
  let s = 90210; const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296), out = [], G = WILDS.green, H = WILDS.hazard;
  const gx = E.x + G.dx, gz = E.z + G.dz, hx = E.x + H.dx, hz = E.z + H.dz;
  const ok = (x, z) => { const cheb = Math.max(Math.abs(x - E.x), Math.abs(z - E.z)); if (cheb < WILDS.from) return false;   // (none inside the walls or in their first 10 m)
    if (Math.abs(x - E.x) < WILDS.gate && Math.abs(z - E.z) < 160 || Math.abs(z - E.z) < WILDS.gate && Math.abs(x - E.x) < 160) if (rnd() >= 0.12) return false;   // (the roads out of the gates stay open)
    for (const t of ruins) if (Math.hypot(t.x - x, t.z - z) < Math.max(t.w, t.d) * 0.75 + 2.5) return false; return true; };
  const add = (x, z, kind) => { if (out.some(o => Math.hypot(o.x - x, o.z - z) < 2)) return false; const K = WILDS.kinds[kind], sc = 0.75 + rnd() * 0.8; out.push({ x, z, kind, sc, r: K.r * sc, h: K.h * sc, lean: (rnd() - 0.5) * 0.2, ry: rnd() * 6.283, sink: 0.25 + rnd() * 0.25 }); return true; };   // (no two trunks closer than 2 m: a body can always walk between them)
  for (let i = 0, tries = 0; out.length < WILDS.count && tries < 20000; tries++) {
    const a = rnd() * 6.283, d = WILDS.from + (WILDS.to - WILDS.from) * Math.sqrt(rnd()), x = E.x + Math.cos(a) * d, z = E.z + Math.sin(a) * d;
    if (rnd() > 1 - (d - WILDS.from) / 340) continue;                                        // (thicker near the walls, thinner far out)
    const inG = Math.hypot(x - gx, z - gz) < G.r + 6, inH = Math.hypot(x - hx, z - hz) < H.r;
    if (inG || !ok(x, z)) continue; if (inH && rnd() < 0.6) continue; add(x, z, inH || rnd() < 0.42 ? 'bare' : 'deadpine'); }
  for (let n = 0, t = 0; n < 70 && t < 1000; t++) { const a = rnd() * 6.283, d = G.clear + (G.r - G.clear) * Math.sqrt(rnd()), x = gx + Math.cos(a) * d, z = gz + Math.sin(a) * d; if (ok(x, z) && add(x, z, 'live')) n++; }
  return out;
}
export const gridOf = (list, cell = WILDS.cell) => { const m = new Map(); for (const t of list) { const k = Math.floor(t.x / cell) + ',' + Math.floor(t.z / cell); (m.get(k) || m.set(k, []).get(k)).push(t); } return m; };
// trunks are solid circles: moves (x, z) out of any trunk within r of it
export function pushOutTrees(grid, x, z, rad = 0.4, cell = WILDS.cell) {
  for (let pass = 0; pass < 2; pass++) { const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
  for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) { const l = grid.get(i + ',' + j); if (!l) continue;
    for (const t of l) { const dx = x - t.x, dz = z - t.z, m = t.r + rad, d2 = dx * dx + dz * dz; if (d2 < m * m) { const d = Math.sqrt(d2) || 0.001; x = t.x + dx / d * m; z = t.z + dz / d * m; } } } }   // (two passes: a gap between two close trunks does not trap you inside the second)
  return [x, z];
}
export const inGreen = (E, x, z) => Math.hypot(x - (E.x + WILDS.green.dx), z - (E.z + WILDS.green.dz)) < WILDS.green.r;
export const inHazard = (E, x, z) => Math.hypot(x - (E.x + WILDS.hazard.dx), z - (E.z + WILDS.hazard.dz)) < WILDS.hazard.r;
