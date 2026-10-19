// node next/sim/lane_d_nobob.mjs  (checklist: "Camera and creatures never bob")
// Creatures: through 3 nights on 4 seeds, every living Hollow stands exactly on the ground under it at every tick (core: y = land(x, z), zero height
// error), and the client draws it at that height plus one constant (no time term). Camera: the view's eye height is a constant (no step bob).
import { readFileSync } from 'node:fs';
import { newGame, addPlayer, step, heightAt, BASE_TACTIC } from '../core/game.js';
let samples = 0, worst = 0, moved = 0;
for (const seed of [1, 2, 3, 4]) {
  const g = newGame(seed, BASE_TACTIC); for (let i = 0; i < 2; i++) { const p = addPlayer(g, i + 1, 'R' + i); p.x = g.fire.x + i * 2; p.z = g.fire.z + 3; p.y = heightAt(g.land, p.x, p.z); }
  g.clock = 0.5; const last = new Map();
  for (let t = 0; t < 3000 && g.night <= 3; t++) { step(g, 0.1);
    for (const k of g.hollow) { if (k.dead) continue; const e = Math.abs(k.y - heightAt(g.land, k.x, k.z)); worst = Math.max(worst, e); samples++; const q = last.get(k.id); if (q && Math.hypot(q[0] - k.x, q[1] - k.z) > 0.01) moved++; last.set(k.id, [k.x, k.z]); } }
}
const src = readFileSync(new URL('../client/main.js', import.meta.url), 'utf8');
const drawLine = src.split('\n').find(l => l.includes("const tgt = k.y + (k.kind === 'shard' ? 2.6 : 0.2)")) || '';
const cam = src.split('\n').find(l => l.includes('camera.position.set(me.x, me.y + eyeH, me.z)')) || '';
const bad = /sin\(|cos\(|performance|Date|clock/.test(drawLine.split('v.o.rotation')[0]);
const ok = samples > 500 && moved > 50 && worst < 1e-9 && drawLine && !bad && cam && !/sin\(|bob/.test(cam.split('//')[0]);
console.log(`creatures: ${samples} samples (${moved} while walking), worst height error ${worst.toExponential(1)} m; client draw height is a constant: ${!!drawLine && !bad}; camera eye height constant: ${!!cam}  ${ok ? 'PASS' : 'FAIL'}`);
process.exit(ok ? 0 : 1);
