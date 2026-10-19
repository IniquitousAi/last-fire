// node sim/director.mjs: the Director (build up, peak, breathe) against a control without it, 32 seeds per crew style, 3 nights each.
// It passes if every style stays in the flow band (tense 0.25 to 0.70), a perfect crew stays fair, and falls do not rise beyond the noise.
import { play, STYLES } from './robots.mjs';
import { BASE_TACTIC } from '../core/game.js';
const SEEDS = Array.from({ length: 32 }, (_, i) => i + 1);
const run = on => { globalThis.__director = on; const out = {}; for (const s of Object.keys(STYLES)) { const rs = SEEDS.map(seed => play(BASE_TACTIC, s, seed));
  const m = k => rs.reduce((a, r) => a + r[k], 0) / rs.length; out[s] = { falls: +m('falls').toFixed(2), kills: Math.round(m('kills')), tense: +m('tense').toFixed(3) }; } return out; };
const t0 = Date.now(), off = run(false), on = run(true);
console.log('mean of 32 seeds, 3 nights each (falls = times someone fell; tense = share of night moments with danger close; flow band 0.25 to 0.70)');
for (const s of Object.keys(off)) console.log(s.padEnd(8), 'no director', JSON.stringify(off[s]), '  director', JSON.stringify(on[s]));
console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
