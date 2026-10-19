// The camp economy, played by robots for 30 days, then judged against his rules. node sim/camp_sim.mjs [--tune]
// Kinds of player: the contributor (plays, pays his share), the lone wolf (pays a lot early, gone for days, comes back), the free rider (plays,
// never pays), the grinder (plays three times as long, often while the crew is offline), the casual (a little most days).
import { newCamp, day, payDues, spend, standing, priceOf, mayHaveLantern, morale, sharedPower, CAMP } from '../core/camp.js';
import { stream } from '../core/game.js';
import { writeFileSync } from 'node:fs';

function run(k, seed = 1, days = 30) {
  const r = stream(seed, 'camp'), names = ['contributor', 'loneWolf', 'freeRider', 'grinder', 'casual'], c = newCamp(names, k);
  for (let d = 1; d <= days; d++) {
    const hours = { contributor: 2 + r(), freeRider: 2 + r(), grinder: 6 + r() * 2, casual: r() < 0.6 ? 1 : 0, loneWolf: d <= 3 || d >= 25 ? 3 : 0 };
    day(c, hours);
    const due = k.burnPerDay / names.length;   // (what a fair share looks like on a day everyone is here)
    const pay = n => hours[n] > 0 ? payDues(c, n, c.people[n].dueToday * 1.05) : 0;   // (an honest player pays what the game shows as today's dues, a little over)
    pay('contributor'); pay('grinder'); pay('casual');
    if (d <= 3) payDues(c, 'loneWolf', 400);   // (the lone wolf stokes the fire a whole lot, then runs off)
    else if (d >= 25) pay('loneWolf');
    for (const n of names) spend(c, n, 1e9);   // (whatever is left, each spends on themselves)
  }
  return c;
}
// the exploit robots: tiny payments vs one big one (must give the same standing), and paying with light the camp gave (must be impossible)
function exploits(k) {
  const a = newCamp(['x'], k), b = newCamp(['x'], k); day(a, { x: 3 }); day(b, { x: 3 });
  for (let i = 0; i < 90; i++) payDues(a, 'x', 1); payDues(b, 'x', 90);
  const split = Math.abs(standing(a.people.x) - standing(b.people.x));
  const c = newCamp(['x', 'y'], k); day(c, { x: 3, y: 0 }); const poolBefore = c.pool, ownBefore = c.people.x.own; payDues(c, 'x', 1e9);   // (can x pay with the pool? payDues only reads x's own)
  return { splitGap: +split.toFixed(6), paidFromPool: c.people.x.paid > ownBefore + 1e-9 || c.pool !== poolBefore };
}
export function judge(k, seeds = [1, 2, 3, 4, 5]) {
  const rows = seeds.map(s => run(k, s)), avg = f => rows.reduce((t, c) => t + f(c), 0) / rows.length, P = (c, n) => c.people[n];
  const priceRatio = avg(c => priceOf(c, P(c, 'freeRider'), 1) / priceOf(c, P(c, 'contributor'), 1));
  const wolfPrice = avg(c => priceOf(c, P(c, 'loneWolf'), 1)), wolfLantern = rows.every(c => mayHaveLantern(c, P(c, 'loneWolf'))), riderLantern = rows.some(c => mayHaveLantern(c, P(c, 'freeRider')));
  const total = n => c => P(c, n).power + sharedPower(c);   // (what a player can actually do: their own gear plus the camp they share)
  const gap = avg(c => total('grinder')(c) / Math.max(1e-9, total('contributor')(c)) - 1), gapCasual = avg(c => total('grinder')(c) / Math.max(1e-9, total('casual')(c)) - 1);
  const ex = exploits(k);
  const checks = [
    ['A free rider pays at least 1.5x a contributor', priceRatio >= 1.5, `${priceRatio.toFixed(2)}x`],
    ['A free rider gets no more lanterns', !riderLantern, riderLantern ? 'gets lanterns' : 'none'],
    ['The lone wolf back after 21 days pays normal prices', wolfPrice <= 1.0001, `${wolfPrice.toFixed(2)}x`],
    ['The lone wolf may still have lanterns', wolfLantern, wolfLantern ? 'yes' : 'no'],
    ['The grinder (about 3x a friend hours) is at most 25% ahead of that friend', gap <= 0.25, `${(gap * 100).toFixed(0)}% ahead`],
    ['The grinder (about 12x the casual hours) is at most 75% ahead of the casual', gapCasual <= 0.75, `${(gapCasual * 100).toFixed(0)}% ahead`],
    ['Tiny payments earn exactly what one big one does', ex.splitGap === 0, `gap ${ex.splitGap}`],
    ['Dues cannot be paid with the camp\'s light', !ex.paidFromPool, ex.paidFromPool ? 'they can' : 'they cannot'],
    ['Morale with one free rider stays above half', avg(morale) > 0.5, avg(morale).toFixed(2)],
  ];
  return { checks, pass: checks.filter(c => c[1]).length, of: checks.length };
}
const tune = process.argv.includes('--tune');
let best = { k: CAMP, j: judge(CAMP) };
console.log(`as written: ${best.j.pass} of ${best.j.of}`); for (const [name, ok, got] of best.j.checks) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}: ${got}`);
if (tune) {   // (search the knobs for the version that passes the most checks, and among those, the gentlest prices)
  for (const soloShare of [0.5, 0.65, 0.75, 0.85, 0.95]) for (const powerCurve of [0.25, 0.3, 0.35, 0.4, 0.5]) for (const priceStep of [0.25, 0.5, 1]) {
    const k = { ...CAMP, soloShare, powerCurve, priceStep }, j = judge(k);
    if (j.pass > best.j.pass || (j.pass === best.j.pass && priceStep < best.k.priceStep)) best = { k, j };
  }
  console.log(`\ntuned (${5 * 5 * 3} versions tried): ${best.j.pass} of ${best.j.of} with`, JSON.stringify({ soloShare: best.k.soloShare, powerCurve: best.k.powerCurve, priceStep: best.k.priceStep }));
  for (const [name, ok, got] of best.j.checks) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}: ${got}`);
  writeFileSync(new URL('./camp_tuned.json', import.meta.url), JSON.stringify({ at: new Date().toISOString(), knobs: best.k, checks: best.j.checks }, null, 1));
}
