// node sim/economy.mjs: the camp economy inside real nights. Two faithful robots: Daniel plays every day; Dalton is away for days 2 to 4,
// then back. His rules, checked: the one who plays alone never falls behind; what he gathers past his dues reaches the pool and then the fire
// when Dalton is back; the friend who was away is not left behind (at most a day of dues after two days back).
import { newGame, addPlayer, step, stream, econ, campOf, DUES } from '../core/game.js';
import { think } from './certify.mjs';
const careful = { name: 'Daniel', roam: 10, greed: 8, bankAt: 12, aim: 0.7, together: 0.5, blind: 3 }, other = { name: 'Dalton', roam: 14, greed: 10, bankAt: 16, aim: 0.6, together: 0.5, blind: 6 };
export function run(seed) {
  const g = newGame(seed), r = stream(seed, 'econ'), add = (S, id) => { const p = addPlayer(g, id, S.name), a = id * 2; p.style = S; p.homeX = g.fire.x + Math.cos(a) * 6; p.homeZ = g.fire.z + Math.sin(a) * 6; return p; };
  add(careful, 1); let dalton = add(other, 2); const log = []; g.clock = 0.3;
  for (let day = 1; day <= 7; day++) {
    if (day === 2) g.players = g.players.filter(p => p !== dalton);   // (Dalton goes to sleep for three days)
    if (day === 5) { dalton = add(other, 2); }
    const night = g.night; let poolMax = 0; while (g.night === night) { for (const p of g.players) think(g, p, r, 0.1); step(g, 0.1); poolMax = Math.max(poolMax, campOf(g).pool); }
    log.push({ day, here: g.players.map(p => p.name).join('+'), daniel: Math.round(econ.standing(g, 'Daniel')), dalton: Math.round(econ.standing(g, 'Dalton')), danielBehind: +econ.behind(g, 'Daniel').toFixed(2), daltonBehind: +econ.behind(g, 'Dalton').toFixed(2), poolMax: Math.round(poolMax), pool: Math.round(campOf(g).pool) });
  }
  log.banked = g.dues; return log;
}
const MAIN = typeof process !== 'undefined' && Array.isArray(process.argv) && (process.argv[1] || '').endsWith('economy.mjs');
if (MAIN) for (const seed of [1, 2, 3]) { const log = run(seed); console.log(`seed ${seed}`); for (const d of log) console.log(`  day ${d.day} ${d.here.padEnd(13)} Daniel ${d.daniel} (${d.danielBehind} days behind)  Dalton ${d.dalton} (${d.daltonBehind})  pool peak ${d.poolMax}, at dawn ${d.pool}`);
  const solo = log.filter(d => d.day >= 2 && d.day <= 4), ok1 = solo.every(d => d.danielBehind <= 1), ok2 = log.some(d => d.poolMax > 0) && log[log.length - 1].pool === 0, ok3 = log[6].daltonBehind <= 1;
  console.log(`  rules: soloist at most a day behind (the new day's share lands at dawn) ${ok1 ? 'PASS' : 'FAIL'}; pool reaches the fire ${ok2 ? 'PASS' : 'FAIL'}; the returning friend within a day ${ok3 ? 'PASS' : 'FAIL'}`); }

if (MAIN) { const per = []; for (const seed of [1, 2, 3]) { const l = run(seed); per.push(l.banked.Daniel / 7, l.banked.Dalton / 4); } console.log('banked a day per player:', per.map(x => Math.round(x)).join(' '), ' dues per person now', DUES.perPerson); }
