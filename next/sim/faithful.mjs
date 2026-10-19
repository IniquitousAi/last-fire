// node sim/faithful.mjs: does a learned friend play like the person it learned from? The round trip that matters:
// a source player plays and is recorded; a friend is built from that record (crewFrom, what the game does); the friend plays and is
// recorded; the two RECORDS are compared (roam, together, aim, bank point). Two very different made-up players, three seeds each.
import { play } from './certify.mjs';
import { crewFrom, CAL } from '../core/habits.js';
const careful = { name: 'Careful', roam: 8, greed: 8, bankAt: 12, aim: 0.7, together: 0.7, blind: 3 }, bold = { name: 'Bold', roam: 22, greed: 20, bankAt: 30, aim: 0.5, together: 0.3, blind: 6 };
const f = (x, d = 2) => (+x).toFixed(d);
for (const seed of [11, 22, 33]) {
  const src = crewFrom(play(undefined, [careful, bold], seed).history), friend = crewFrom(play(undefined, src, seed + 500).history);
  for (const s of src) { const m = friend.find(q => q.name === s.name);
    console.log(`seed ${seed} ${s.name.padEnd(8)} roam ${f(s.roam, 1)} -> ${f(m.roam, 1)}   together ${f(s.together)} -> ${f(m.together)}   aim ${f(s.aim)} -> ${f(m.aim)}   carries ${f(s.load, 1)} -> ${f(m.load, 1)} light out past the circle`); }
}

// --fit: try calibrations, keep the one whose round trip lands closest (mean relative error over roam, together, aim, two players, two seeds)
if (process.argv.includes('--fit')) {
  const err = () => { let e = 0, n = 0; for (const seed of [11, 22]) { const src = crewFrom(play(undefined, [careful, bold], seed).history), fr = crewFrom(play(undefined, src, seed + 500).history);
    for (const s of src) { const m = fr.find(q => q.name === s.name); if (!m) { e += 3; n += 3; continue; } e += Math.abs(m.roam - s.roam) / s.roam + Math.abs(m.together - s.together) / Math.max(0.2, s.together) + Math.abs(m.aim - s.aim) / s.aim + (s.load > 0 ? Math.abs(m.load - s.load) / s.load : 0); n += 4; } } return e / n; };
  let best = null; for (const roam of [1.4, 1.8, 2.2, 2.6, 3.0]) for (const aim of [1.15, 1.3, 1.45, 1.6]) for (const pull of [0.45]) for (const load of [1.0, 1.3, 1.6, 2.0, 2.5]) { Object.assign(CAL, { roam, aim, pull, load }); const e = err(); if (!best || e < best.e) best = { roam, aim, pull, load, e }; }
  console.log('best calibration of 100:', JSON.stringify(best));
}
