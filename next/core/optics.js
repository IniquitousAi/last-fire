// Optics (checklist 23, his idea: "mirrors, lenses and prisms that bend and focus light"; rough playable). Three pieces a player builds with carried light:
//   MIRROR: a flat face. A torch beam that hits its front bounces off at the mirror angle (turn it by aiming at it and building again).
//   LENS:   passes the beam on, narrower and longer (focus).
//   PRISM:  splits the beam into two weaker beams, 26 degrees either side.
// A beam keeps going through up to 3 pieces. Only your torch (and your friends') feeds them, so light you carry can be thrown around a corner, into a
// dark corner of the camp, or far out. lightAt in game.js lights whatever a beam covers, so it counts for the rule that nothing can be killed in the dark.
// Deterministic, no randomness: the same pieces and the same torches always make the same beams.
export const OPTIC = { mirror: { cost: 8, hp: 60 }, lens: { cost: 12, hp: 60 }, prism: { cost: 16, hp: 60 } };
export const OPTIC_MAX = 24;
export function placeOptic(g, kind, x, z, by, yaw = 0) {
  const K = OPTIC[kind]; if (!K) return null; const list = g.optics || (g.optics = []); if (list.length >= OPTIC_MAX) list.shift();
  const o = { id: g.nextId++, kind, x, z, yaw, by }; list.push(o); if (g.log) g.log.push([+g.t.toFixed(2), 'optic', kind, Math.round(x), Math.round(z)]); return o;
}
// turn the piece nearest (x, z) by a step; returns it, or null if none is within reach
export function turnOptic(g, x, z, step = Math.PI / 4, reach = 1.4) {
  let best = null, bd = reach; for (const o of g.optics || []) { const d = Math.hypot(o.x - x, o.z - z); if (d < bd) { bd = d; best = o; } }
  if (best) best.yaw = (best.yaw + step) % (Math.PI * 2); return best;
}
// the beams the pieces make from every torch (not the torch's own cone, which lightAt already covers). T is TORCH: { r, cos, s }.
// Each beam: origin (x, z), unit direction (dx, dz), range r, cone cosine cos, strength s at its origin. Light at distance d inside the cone is s * (1 - d / r).
export function beams(g, T) {
  const out = []; if (!g.optics || !g.optics.length) return out;
  const trace = (b, depth, from) => {
    for (const o of g.optics) { if (o === from) continue;
      const vx = o.x - b.x, vz = o.z - b.z, d = Math.hypot(vx, vz); if (d < 0.4 || d > b.r) continue;
      const along = (vx * b.dx + vz * b.dz) / d; if (along < b.cos) continue;   // (the piece must be inside this beam's cone)
      const rem = b.r - d, s = b.s * (1 - d / b.r); if (rem < 1.5 || s < 0.05) continue;
      let made = [];
      if (o.kind === 'mirror') { const nx = -Math.sin(o.yaw), nz = -Math.cos(o.yaw), dot = b.dx * nx + b.dz * nz; if (dot >= -0.05) continue;   // (hits the back or the edge: no reflection)
        made = [{ x: o.x, z: o.z, dx: b.dx - 2 * dot * nx, dz: b.dz - 2 * dot * nz, r: rem * 0.9, cos: b.cos, s: s * 0.85 }]; }
      else if (o.kind === 'lens') made = [{ x: o.x, z: o.z, dx: b.dx, dz: b.dz, r: rem * 1.8, cos: Math.cos(0.11), s: Math.min(1, s * 1.15) }];
      else if (o.kind === 'prism') for (const a of [-0.45, 0.45]) { const c = Math.cos(a), sn = Math.sin(a); made.push({ x: o.x, z: o.z, dx: b.dx * c - b.dz * sn, dz: b.dx * sn + b.dz * c, r: rem * 0.7, cos: Math.cos(0.2), s: s * 0.7 }); }
      for (const m of made) { out.push(m); if (depth < 2) trace(m, depth + 1, o); }
    }
  };
  for (const p of g.players) if (p.torch && !p.ember) trace({ x: p.x, z: p.z, dx: -Math.sin(p.yaw || 0), dz: -Math.cos(p.yaw || 0), r: T.r, cos: T.cos, s: T.s }, 0, null);
  return out;
}
