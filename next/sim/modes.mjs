// node next/sim/modes.mjs: "with friends it is a hangout, alone it is survival: both full games" (his words). 1, 2 and 4 robots play 3 nights, 16 seeds each.
// Both modes must be a full game: they live through the nights (not wiped out every time), fight (kills), and stay in the flow band (tense 0.25 to 0.70);
// and they must differ in the way he said: the crew is lit by each other (shared glow); the lone player is pressed harder per head.
import { play } from './robots.mjs';
import { BASE_TACTIC, newGame, addPlayer, glowOf } from '../core/game.js';
const SEEDS = Array.from({ length: 16 }, (_, i) => i + 1), res = {};
for (const n of [1, 2, 4]) { const rs = SEEDS.map(s => play(BASE_TACTIC, 'careful', s, 3, n)), m = k => rs.reduce((a, r) => a + r[k], 0) / rs.length;
  res[n] = { fallsPerHead: +(m('falls') / n).toFixed(2), kills: Math.round(m('kills')), tense: +m('tense').toFixed(2), level: +m('level').toFixed(2), wiped: rs.filter(r => r.log.some(e => e[1] === 'allfell')).length }; console.log(n + ' player' + (n > 1 ? 's' : ' '), JSON.stringify(res[n])); }
let fail = 0; const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${got})`); if (!ok) fail++; };
check('alone is a full game: fights, in the flow band, not wiped every time', res[1].kills > 0 && res[1].tense >= 0.25 && res[1].tense <= 0.7 && res[1].wiped < 16, JSON.stringify(res[1]));
check('a hangout of 4 is a full game: fights, in the flow band', res[4].kills > 0 && res[4].tense >= 0.25 && res[4].tense <= 0.7, JSON.stringify(res[4]));
check('the hangout is warmer: each friend near you adds to your glow', (() => { const g = newGame(1), a = addPlayer(g, 1, 'A'), solo = glowOf(g, a); addPlayer(g, 2, 'B'); addPlayer(g, 3, 'C'); return glowOf(g, a) > solo; })(), 'glow grows with company');
check('alone is harder per head than together', res[1].fallsPerHead >= res[4].fallsPerHead, `${res[1].fallsPerHead} vs ${res[4].fallsPerHead} falls per head`);
process.exit(fail ? 1 : 0);
