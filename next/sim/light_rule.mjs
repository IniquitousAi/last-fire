// node sim/light_rule.mjs: the light rule (smoke in the dark, solid in light) against a control (always solid), 8 seeds per crew style.
import { play, STYLES } from './robots.mjs';
import { BASE_TACTIC, SOLID_AT } from '../core/game.js';
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const run = (solidAt) => { const out = {}; for (const s of Object.keys(STYLES)) { globalThis.__solidAt = solidAt; const rs = SEEDS.map(seed => play(BASE_TACTIC, s, seed));
  const m = k => rs.reduce((a, r) => a + r[k], 0) / rs.length; out[s] = { falls: +m('falls').toFixed(2), kills: Math.round(m('kills')), tense: +m('tense').toFixed(3) }; } return out; };
const t0 = Date.now(), control = run(-1), rule = run(SOLID_AT);
console.log('mean of 8 seeds, 3 nights each (falls = times someone fell; tense = share of night moments with danger close; flow band 0.25 to 0.70)');
for (const s of Object.keys(control)) console.log(s.padEnd(8), 'control', JSON.stringify(control[s]), ' rule', JSON.stringify(rule[s]));
console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
