// node next/sim/fresh_test.mjs: no clip twice in a row; something new every 4 beats (client/fresh.js, and the far-sound scheduler that already did it).
import { pickFresh, beat } from '../client/fresh.js';
import { farStep, VOICES } from '../client/farsound.js';
let fail = 0; const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${got})`); if (!ok) fail++; };
const seeded = s => () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
for (const n of [2, 3, 4, 6]) {
  const V = Array.from({ length: n }, (_, i) => i), mem = {}, rnd = seeded(7 + n), seq = []; for (let i = 0; i < 20000; i++) seq.push(pickFresh(V, mem, 'step', rnd));
  const twice = seq.filter((v, i) => i && v === seq[i - 1]).length, used = new Set(seq).size;
  check(`${n} variants, 20000 plays: never the same clip twice in a row, every variant used`, twice === 0 && used === n, `${twice} repeats, ${used} used`);
  if (n >= 3) { let low = 4; for (let i = 4; i < seq.length; i++) low = Math.min(low, new Set(seq.slice(i - 4, i)).size); check(`${n} variants: any 4 plays in a row hold at least 3 different clips`, low >= 3, `fewest distinct in a window of 4: ${low}`); }
}
check('one variant just plays (nothing to choose)', pickFresh(['x'], {}, 'k') === 'x', 'x');
{ const mem = {}, a = [], b = []; const rnd = seeded(5); for (let i = 0; i < 200; i++) { a.push(pickFresh([1, 2, 3], mem, 'a', rnd)); b.push(pickFresh([1, 2, 3], mem, 'b', rnd)); }
  check('two sounds keep separate memory (a footstep never blocks a hit)', a.every((v, i) => !i || v !== a[i - 1]) && b.every((v, i) => !i || v !== b[i - 1]), 'independent'); }
{ const mem = {}; let need = 0, run = 0, maxRun = 0; const stream = ['s', 's', 's', 's', 's', 's', 'h', 's', 's', 's', 's', 'g']; for (const id of stream) { const r = beat(mem, id); if (r.needNew) need++; run = r.fresh ? 0 : run + 1; maxRun = Math.max(maxRun, run); }
  check('the beat counter calls for something new after 4 beats with nothing new', need >= 1 && beat({}, 'a').fresh, `asked ${need} time(s)`); }
// the far-sound scheduler: 600 s, 3 seeds, night: every sound differs from each of the 4 before it, and a new voice shows up in every window of 4
for (const seed of [1, 2, 3]) {
  const st = {}, rnd = seeded(seed), out = [], me = { x: 0, z: 0 }, causes = [{ x: 60, z: 0, dark: true }, { x: 0, z: -90, dark: false }];
  for (let t = 0; t < 900; t += 0.05) { const e = farStep(st, 0.05, me, 1, causes, rnd); if (e) out.push(e.voice); }
  const rep = out.some((v, i) => out.slice(Math.max(0, i - 4), i).includes(v)); let win = true; for (let i = 8; i < out.length; i++) if (new Set(out.slice(i - 4, i)).size < 4) win = false;
  check(`far sounds, seed ${seed}: ${out.length} sounds, none repeats within 4, every window of 4 is four different voices`, !rep && win && out.length > 40, `${out.length} sounds of ${VOICES.length} voices`);
}
process.exit(fail ? 1 : 0);
