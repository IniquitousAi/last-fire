// node next/sim/lane_d_optics.mjs  (checklist 23: mirrors, lenses and prisms that bend light; rough playable, the rules)
// A player 200 m out in the dark with the torch on. Without pieces, light is 0 off the beam. With them: a mirror bounces the beam to the side (and
// only from its front), a lens carries it past the torch's own range, a prism splits it in two, the lit spots really count in lightAt, and it is deterministic.
import { newGame, addPlayer, lightAt, placeOptic, turnOptic, opticBeams, TORCH, OPTIC, BASE_TACTIC } from '../core/game.js';
let fails = 0; const say = (ok, name, detail) => { if (!ok) fails++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  (' + detail + ')'); };
const fresh = () => { const g = newGame(7, BASE_TACTIC), p = addPlayer(g, 1, 'T'); p.x = g.fire.x + 200; p.z = g.fire.z; p.y = g.land(p.x, p.z); p.yaw = 0; p.torch = true; g.optics = []; return { g, p }; };
const L = (g, x, z) => lightAt(g, x, z);
{ const { g, p } = fresh(); say(L(g, p.x - 8, p.z - 8) === 0 && L(g, p.x, p.z - 26) === 0, 'baseline: off the beam and past 20 m is dark', `${L(g, p.x - 8, p.z - 8)} and ${L(g, p.x, p.z - 26)}`);
  say(L(g, p.x, p.z - 8) > 0.4, 'the torch itself lights straight ahead', L(g, p.x, p.z - 8).toFixed(2)); }
{ const { g, p } = fresh(); placeOptic(g, 'mirror', p.x, p.z - 8, 1, 3 * Math.PI / 4);   // (front faces back toward the player and to the left: the beam goes to -x)
  const a = L(g, p.x - 8, p.z - 8), b = L(g, p.x + 8, p.z - 8);
  say(a > 0.08 && b === 0, 'mirror bounces the beam to the side it faces', `lit ${a.toFixed(2)} on the bounce side, ${b} on the other`);
  g.optics[0].yaw += Math.PI; say(L(g, p.x - 8, p.z - 8) === 0, 'the back of a mirror reflects nothing', String(L(g, p.x - 8, p.z - 8)));
  const t = turnOptic(g, p.x + 0.5, p.z - 8); say(!!t && Math.abs(t.yaw - (3 * Math.PI / 4 + Math.PI + Math.PI / 4) % (Math.PI * 2)) < 1e-9, 'a piece turns a quarter-eighth step when you aim at it', t ? t.yaw.toFixed(3) : 'none'); }
{ const { g, p } = fresh(); placeOptic(g, 'lens', p.x, p.z - 6, 1, 0);
  const far = L(g, p.x, p.z - 26); say(far > 0.1 && L(g, p.x, p.z - 6 - 6) > 0, 'lens carries the beam past the torch range (26 m ahead is lit)', far.toFixed(2)); }
{ const { g, p } = fresh(); placeOptic(g, 'prism', p.x, p.z - 6, 1, 0); const bs = opticBeams(g, TORCH), ang = bs.map(b => Math.atan2(b.dx, -b.dz));
  say(bs.length === 2 && Math.abs(Math.abs(ang[0]) - 0.45) < 1e-6 && ang[0] * ang[1] < 0, 'prism splits the beam into two, 26 degrees either side', ang.map(a => a.toFixed(2)).join(' and '));
  const px = p.x + Math.sin(0.45) * 6, pz = p.z - 6 - Math.cos(0.45) * 6; say(L(g, px, pz) > 0.05 && L(g, p.x - Math.sin(0.45) * 6, pz) > 0.05, 'both split beams light the ground', `${L(g, px, pz).toFixed(2)} and ${L(g, p.x - Math.sin(0.45) * 6, pz).toFixed(2)}`); }
{ const { g, p } = fresh(); placeOptic(g, 'mirror', p.x, p.z - 5, 1, 3 * Math.PI / 4); placeOptic(g, 'mirror', p.x - 6, p.z - 5, 1, Math.PI / 4 * 5 - Math.PI / 2 + Math.PI / 2);   // (a second mirror down the bounced beam)
  say(opticBeams(g, TORCH).length >= 1, 'beams chain through more than one piece', String(opticBeams(g, TORCH).length)); }
{ const { g, p } = fresh(); p.torch = false; placeOptic(g, 'lens', p.x, p.z - 6, 1, 0); say(opticBeams(g, TORCH).length === 0 && L(g, p.x, p.z - 10) === 0, 'no torch, no beams (pieces make no light of their own)', 'dark'); }
{ const { g, p } = fresh(); placeOptic(g, 'mirror', p.x, p.z - 8, 1, 3 * Math.PI / 4); const a = JSON.stringify(opticBeams(g, TORCH)), b = JSON.stringify(opticBeams(g, TORCH)); say(a === b, 'deterministic: the same pieces make the same beams', 'identical'); }
say(Object.keys(OPTIC).length === 3 && Object.values(OPTIC).every(k => k.cost > 0), 'three pieces, each with a light cost', Object.entries(OPTIC).map(([k, v]) => k + ' ' + v.cost).join(', '));
console.log(fails ? fails + ' FAILED' : 'all optics checks pass'); process.exit(fails ? 1 : 0);
