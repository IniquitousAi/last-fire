// node sim/flood.mjs: the flood (late-night spawns pour through the dimmest gap) against a control (spawns all around), 8 seeds per crew.
import { play, STYLES } from './robots.mjs';
import { BASE_TACTIC } from '../core/game.js';
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const run = flood => { globalThis.__flood = flood; const out = {}; for (const s of Object.keys(STYLES)) { const rs = SEEDS.map(seed => play(BASE_TACTIC, s, seed)), m = k => rs.reduce((a, r) => a + r[k], 0) / rs.length;
  out[s] = { falls: +m('falls').toFixed(2), kills: Math.round(m('kills')), tense: +m('tense').toFixed(3) }; } return out; };
const c = run(false), f = run(true);
console.log('mean of 8 seeds, 3 nights each (flow band for tense: 0.25 to 0.70)');
for (const s of Object.keys(c)) console.log(s.padEnd(8), 'spawns all around', JSON.stringify(c[s]), '  flood', JSON.stringify(f[s]));
