// node next/sim/why_falls12.mjs [seeds]: why does a perfect crew fall over 12 nights? Counts falls by night, by what took them, and the dark's size then.
import { BASE_TACTIC } from '../core/game.js';
import { play } from './certify.mjs';
const P = n => ({ name: n, roam: 12, greed: 8, bankAt: 12, aim: 0.95, together: 1, blind: -1 });
const N = +(process.argv[2] || 32), byNight = {}, byKind = {}; let tot = 0;
for (let seed = 1 + (+process.argv[3] || 0); seed <= N + (+process.argv[3] || 0); seed++) { const r = play(BASE_TACTIC, [P('a'), P('b')], seed, 12); let night = 1;
  for (const l of r.g.log) { if (l[1] === 'dawn') night = l[2] + 1; if (l[1] === 'fall') { tot++; byNight[night] = (byNight[night] || 0) + 1; byKind[l[3]] = (byKind[l[3]] || 0) + 1; console.log('seed', seed, 'night', night, 'by', l[3], 't', l[0], 'recent', JSON.stringify(r.g.log.filter(x => x[0] > l[0] - 12 && x[0] <= l[0] && x[1] !== 'bank').slice(-7))); } } }
console.log('falls', tot, 'by night', JSON.stringify(byNight), 'by kind', JSON.stringify(byKind));
