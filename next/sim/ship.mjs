// Robot test for the ship's feel (SHIP.md): does it settle like a real hover craft, and can a pilot land it on a pad?
// 1. Drop test: let go at 8 m over flat ground; measure how far it overshoots its hover height and how long until it settles.
// 2. Pad run: a robot pilot flies 300 m over rolling ground to a pad and stops on it; measure the time and how far off it lands.
// No bounce (his note 2026-10-19: the bob read as broken): overshoot 2 percent at most, settled inside 3.5 s; a careful pilot lands within 3 m in under 25 s.
import { SHIP, makeShip, flyShip } from '../core/ship.js';
const flat = () => 0, hills = (x, z) => Math.sin(x * 0.02) * 4 + Math.sin(z * 0.013 + 1) * 6;
export function dropTest(land = flat) {
  let rest = SHIP.hover - SHIP.gravity * SHIP.mass / SHIP.k, start = 8, dt = 1 / 60, s = makeShip(0, land(0, 0) + start, 0), hs = [];   // (rest: where the springs hold it against gravity)
  for (let t = 0; t < 10; t += dt) hs.push(flyShip(s, {}, land, dt).height);
  if (land !== flat) rest = hs[hs.length - 1];
  const band = (start - rest) * 0.02; let settle = 0; hs.forEach((h, i) => { if (Math.abs(h - rest) > band) settle = (i + 1) * dt; });   // (settled: inside 2% of the drop, for good)
  return { overshoot: (rest - Math.min(...hs)) / (start - rest), settle, rest };   /* (on hills the rest is wherever it ends: the ground under each corner differs) */
}
export function padRun(land = hills, pad = { x: 40, z: 300 }) {
  const s = makeShip(0, land(0, 0) + SHIP.hover, 0), dt = 1 / 60; let t = 0;
  for (; t < 60; t += dt) {
    const dx = pad.x - s.x, dz = pad.z - s.z, d = Math.hypot(dx, dz), want = Math.atan2(dx, dz); let err = want - s.yaw; err = Math.atan2(Math.sin(err), Math.cos(err));
    const sp = Math.hypot(s.vx, s.vz), brake = sp * sp / (2 * SHIP.thrust * 0.9) + sp * 0.4;   // (start braking when the stopping distance reaches the pad)
    const fwd = d > brake + 2 ? Math.max(0, 1 - Math.abs(err)) : -Math.min(1, sp / 6) * Math.sign(s.vx * Math.sin(s.yaw) + s.vz * Math.cos(s.yaw));
    flyShip(s, { fwd, turn: Math.max(-1, Math.min(1, err * 2.5)) }, land, dt);
    if (d < 3 && sp < 0.6) break;
  }
  return { time: t, miss: Math.hypot(pad.x - s.x, pad.z - s.z) };
}
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const a = dropTest(), b = padRun(), c = dropTest(hills);
  console.log(`drop test: overshoot ${(a.overshoot * 100).toFixed(0)}%, settled in ${a.settle.toFixed(2)} s  ${a.overshoot <= 0.02 && a.settle < 3.5 ? 'PASS' : 'FAIL'}`);
  console.log(`drop on hills: overshoot ${(c.overshoot * 100).toFixed(0)}%, settled in ${c.settle.toFixed(2)} s`);
  console.log(`pad run (300 m over hills): ${b.time.toFixed(1)} s, landed ${b.miss.toFixed(1)} m off  ${b.time < 25 && b.miss < 3 ? 'PASS' : 'FAIL'}`);
}
