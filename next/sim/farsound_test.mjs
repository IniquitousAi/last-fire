// node sim/farsound_test.mjs: the far-sound scheduler against its known answers (IMMERSION.md item 3), fixed seed, 600 game seconds each.
import { farStep, FAR } from '../client/farsound.js';
const seeded = s => () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
const me = { x: 0, z: 0 }, causes = [{ x: 60, z: 0, dark: true }, { x: 0, z: -90, dark: false }, { x: 20, z: 0, dark: true }, { x: 200, z: 0, dark: true }];
function run(night, cs, seed) { const st = {}, rnd = seeded(seed), out = []; for (let t = 0; t < 600; t += 0.05) { const e = farStep(st, 0.05, me, night, cs, rnd); if (e) out.push(e); } return out; }
let fail = 0; const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${got})`); if (!ok) fail++; };
for (const seed of [1, 2, 3]) {
  const day = run(0, causes, seed), night = run(1, causes, seed);
  check(`seed ${seed}: day count 55 +-10`, Math.abs(day.length - 55) <= 10, day.length);
  check(`seed ${seed}: night count 86 +-12`, Math.abs(night.length - 86) <= 12, night.length);
  const all = [...day, ...night], bad = all.filter(e => { const d = Math.hypot(e.x, e.z); return d < FAR.near || d > FAR.far; });
  check(`seed ${seed}: none closer than 35 m or past 110 m`, bad.length === 0, bad.length);
  const rep = seq => seq.some((e, i) => seq.slice(Math.max(0, i - 4), i).some(p => p.voice === e.voice));
  check(`seed ${seed}: no voice repeats within any run of 5`, !rep(day) && !rep(night), 'day ' + rep(day) + ', night ' + rep(night));
}
check('no cause in range: 0 sounds', run(1, [{ x: 10, z: 0, dark: true }, { x: 300, z: 0, dark: false }], 7).length === 0, run(1, [{ x: 10, z: 0, dark: true }], 7).length);
process.exit(fail ? 1 : 0);
