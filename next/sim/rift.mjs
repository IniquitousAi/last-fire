// node next/sim/rift.mjs: the Rift's rules, played by a robot (SKELETON.md step 2). Walk through the north gate into the Rift, touch the
// console, hold off the waves; the waves keep coming and grow; the lander waits while anyone is inside; walking out of the mouth brings you
// back to the gate; with everyone out the console sleeps and keeps the best wave. Same seed, same night.
import * as C from '../core/game.js'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const R = [], ok = (n, p, w) => R.push(`${p ? 'PASS' : 'FAIL'}  ${n}  (${w})`), DT = 1 / 30;
function run(seed, waves) {
  const g = C.newGame(seed); g.clock = 0.3; const p = C.addPlayer(g, 1, 'Robot'); p.x = C.PAD.x; p.z = C.PAD.z; C.drop(g, p, 'city');
  const out = { g, p }; p.x = C.RIFT.x; p.z = C.RIFT.z - 4; let steps = 0;
  while (!C.inRift(p) && steps++ < 300) { p.z += 4.5 * DT; C.step(g, DT); }   // (walk north through the gate)
  out.entered = C.inRift(p); out.at = [p.x, p.z];
  while (Math.hypot(p.x - C.RIFT.console.x, p.z - C.RIFT.console.z) > 2.5 && steps++ < 2000) { const dx = C.RIFT.console.x - p.x, dz = C.RIFT.console.z - p.z, d = Math.hypot(dx, dz); p.x += dx / d * 4.5 * DT; p.z += dz / d * 4.5 * DT; C.step(g, DT); }
  out.woke = C.touchConsole(g, p); out.lander0 = g.earth.t; const sizes = {};
  for (let t = 0; t < 900 && (g.rift.wave < waves || g.hollow.some(k => k.rift && !k.dead)); t += DT) {   // (a perfect turret: one kill every 0.4 s, nearest first; the robot stands at the console)
    p.hp = 100; if (Math.floor(t / 0.4) !== Math.floor((t - DT) / 0.4)) { const k = g.hollow.filter(k => k.rift && !k.dead).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (k) { k.hp = 0; k.dead = true; } }
    C.step(g, DT); g.hollow = g.hollow.filter(k => !k.dead || !k.counted); const w = g.rift.wave; sizes[w] = Math.max(sizes[w] || 0, g.hollow.filter(k => k.rift && !k.dead).length); }
  out.sizes = sizes; out.lander1 = g.earth ? g.earth.t : -1; out.wave = g.rift.wave; out.kills = g.rift.kills;
  p.x = C.RIFT.in.x; p.z = C.RIFT.in.z + 3; for (let i = 0; i < 200 && C.inRift(p); i++) { p.z -= 4.5 * DT; C.step(g, DT); }   // (walk back out of the mouth)
  out.out = !C.inRift(p) && Math.abs(p.z - (C.RIFT.z - 3)) < 1.5; C.step(g, DT); out.slept = !g.rift.on && !g.hollow.some(k => k.rift); out.best = g.rift.best;
  out.log = JSON.stringify(g.log.filter(e => ['rift-in', 'console', 'wave', 'rift-out', 'rift-closed'].includes(e[1])));
  return out; }
const a = run(33, 8), b = run(33, 8);
ok('walking north through the gate takes you into the Rift', a.entered, `arrived at ${a.at.map(v => v.toFixed(1)).join(', ')}`);
ok('the console wakes at a touch', a.woke === 'woke', a.woke);
ok('the waves keep coming (8 held off by a perfect robot)', a.wave >= 8 && a.kills > 0, `wave ${a.wave}, ${a.kills} killed`);
const s = Object.values(a.sizes); ok('each wave is at least as big as the last', s.every((v, i) => i === 0 || v >= s[i - 1] - 1), Object.entries(a.sizes).map(([w, n]) => w + ':' + n).join(' '));
ok('the lander waits while you are inside', Math.abs(a.lander1 - a.lander0) < 0.5, `${a.lander0.toFixed(1)} s before, ${a.lander1.toFixed(1)} s after`);
ok('walking out of the mouth brings you back to the gate', a.out, 'back on the community side');
ok('with everyone out the console sleeps and keeps the best wave', a.slept && a.best >= 8, `best wave ${a.best}`);
ok('same seed, same Rift', a.log === b.log, a.log.length + ' chars of log match');
C.DARK.off = true; const c = run(34, 2); C.DARK.off = false; ok('with the dark switched off the console counts waves and sends none', c.kills === 0 && c.wave >= 2, `wave ${c.wave}, ${c.kills} sent`);
const out = R.join('\n') + `\n\n${R.filter(x => x.startsWith('PASS')).length} of ${R.length} pass  (rift)\n`;
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'playtests', 'checklist', 'test-rift.txt'), out); console.log(out); process.exit(R.some(x => x.startsWith('FAIL')) ? 1 : 0);
