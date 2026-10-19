// node next/sim/growth.mjs [--tune]: growth curves that flatten, tuned by robots for grinders and casuals ("Infinite progression, scaled by logic;
// grinders and casuals both fine"). The robots (sim/certify.mjs crews) measure how much light a casual crew and a grinder crew really bank a night;
// the cost of each fire level past the table flattens (each step costs a smaller multiple of the last); --tune searches the two numbers of that tail
// and prints the best; the run then judges the numbers now in core/game.js (FIRE_TAIL) against the rules below.
import { play } from './certify.mjs';
import { BASE_TACTIC, FIRE_COST, FIRE_TAIL, levelCost, stream } from '../core/game.js';
const casual = [{ name: 'C1', roam: 8, greed: 6, bankAt: 10, aim: 0.7, together: 0.9, blind: 3 }, { name: 'C2', roam: 8, greed: 6, bankAt: 10, aim: 0.65, together: 0.9, blind: 5 }];
const grinder = [{ name: 'G1', roam: 30, greed: 22, bankAt: 40, aim: 0.8, together: 0.3, blind: 4 }, { name: 'G2', roam: 30, greed: 22, bankAt: 40, aim: 0.8, together: 0.3, blind: 4 }];
let fail = 0; const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${got})`); if (!ok) fail++; };
// 1. what the robots really bank in a night (mean of 6 seeds, 4 nights, light that reached the fire)
const income = crew => { let b = 0, n = 0; for (let s = 1; s <= 6; s++) { const r = play(BASE_TACTIC, crew, s, 4); b += r.g.stats.banked; n += Math.max(1, r.history.length); } return b / n; };
const perNight = { casual: income(casual), grinder: income(grinder) };
console.log(`robots bank per night: casual crew ${perNight.casual.toFixed(0)}, grinder crew ${perNight.grinder.toFixed(0)} (a night is 5 minutes; income measured, not guessed)`);
// 2. days to reach a level. A casual player plays 1 night a day (about 5 minutes plus the day); a grinder 4 nights a day. Spare light is never lost.
const NIGHTS_PER_DAY = { casual: 1, grinder: 4 };
function levelAfter(days, who, tail) { let bank = perNight[who] * NIGHTS_PER_DAY[who] * days, lvl = 0; while (true) { const c = levelCost(lvl + 1, tail); if (bank < c) return lvl; bank -= c; lvl++; if (lvl > 400) return lvl; } }
const daysTo = (L, who, tail) => { for (let d = 1; d <= 3000; d++) if (levelAfter(d, who, tail) >= L) return d; return Infinity; };
function judge(tail) {
  const r = { casual5: daysTo(5, 'casual', tail), grinder5: daysTo(5, 'grinder', tail), c100: levelAfter(100, 'casual', tail), g100: levelAfter(100, 'grinder', tail), c365: levelAfter(365, 'casual', tail), g365: levelAfter(365, 'grinder', tail) };
  const ratios = []; for (let n = FIRE_COST.length; n < FIRE_COST.length + 12; n++) ratios.push(levelCost(n, tail) / levelCost(n - 1, tail));
  const flat = ratios.every((x, i) => x > 1 && (!i || x <= ratios[i - 1] + 1e-9));
  const ok = r.casual5 >= 8 && r.casual5 <= 40 && r.grinder5 >= 2 && r.grinder5 <= 14 && r.g100 <= 2 * Math.max(1, r.c100) && r.c365 > r.c100 && flat && r.g365 <= 2.2 * r.c365;
  const score = -(Math.abs(Math.log(r.g100 / Math.max(1, r.c100)) - Math.log(1.6)) + Math.abs(Math.log(r.casual5 / 20)) * 0.3);
  return { ...r, flat, ok, score, ratios };
}
if (process.argv.includes('--tune')) {
  let best = null; for (let ratio = 1.15; ratio <= 2.0001; ratio += 0.05) for (let decay = 0.5; decay <= 1.0001; decay += 0.05) { const tail = { ratio: +ratio.toFixed(2), decay: +decay.toFixed(2) }, j = judge(tail); if (j.ok && (!best || j.score > best.j.score)) best = { tail, j }; }
  console.log('best tail of 200:', best ? JSON.stringify(best.tail) : 'none', best ? `casual level 5 in ${best.j.casual5} days, grinder in ${best.j.grinder5}; at day 100 casual ${best.j.c100}, grinder ${best.j.g100}` : '');
}
const now = judge(FIRE_TAIL);
console.log(`curve now (FIRE_TAIL ${JSON.stringify(FIRE_TAIL)}): level costs ${Array.from({ length: 12 }, (_, i) => levelCost(i, FIRE_TAIL)).join(', ')} ...`);
console.log(`days to level 5: casual ${now.casual5}, grinder ${now.grinder5}; level at day 100: casual ${now.c100}, grinder ${now.g100}; at day 365: casual ${now.c365}, grinder ${now.g365}`);
check('each step costs a smaller multiple of the last (the curve flattens) and never stops growing', now.flat, now.ratios.slice(0, 6).map(x => x.toFixed(2)).join(' '));
check('casual crew (1 night a day) reaches level 5 in 8 to 40 days', now.casual5 >= 8 && now.casual5 <= 40, `${now.casual5} days`);
check('grinder crew (4 nights a day) reaches level 5 in 2 to 14 days', now.grinder5 >= 2 && now.grinder5 <= 14, `${now.grinder5} days`);
check('at day 100 the grinder is ahead but at most twice the casual level (both fine)', now.g100 > now.c100 && now.g100 <= 2 * now.c100, `casual ${now.c100}, grinder ${now.g100}`);
check('the casual keeps growing past day 100 (there is no wall)', now.c365 > now.c100 && now.g365 <= 2.2 * now.c365, `day 365: casual ${now.c365}, grinder ${now.g365}`);
check('the table part is untouched: levels 0 to 5 cost what the game says', [0, 1, 2, 3, 4, 5].every(i => levelCost(i, FIRE_TAIL) === FIRE_COST[i]), FIRE_COST.join(','));
process.exit(fail ? 1 : 0);
