// The Simulator page (queue 51): the game's own robot tests, run in the browser, rows filling in live.
import { play, STYLES } from './sim/robots.mjs';
import { BASE_TACTIC } from './core/game.js';
import { trip } from './sim/drop.mjs';
import { campaign } from './sim/truckbuild.mjs';
import { play as cplay } from './sim/certify.mjs';
import { crewFrom } from './core/habits.js';
import { run as campWeek } from './sim/economy.mjs';
const $ = s => document.querySelector(s), wait = () => new Promise(r => setTimeout(r, 0)), pct = x => Math.round(x * 100) + '%';
const band = x => x >= 0.25 && x <= 0.7;
// each test: a name, what it asks, the columns, and a run that yields rows one at a time (so the table fills in live)
const TESTS = [
  { id: 'nights', name: 'THE NIGHTS', asks: 'Four kinds of crew play three nights, eight times each. Fair means a perfect crew never falls and every crew stays in the fun band (danger close 25% to 70% of the night).',
    cols: ['crew', 'falls a game', 'kills', 'danger close', 'in the band'], steps: Object.keys(STYLES).length,
    async *run() { for (const s of Object.keys(STYLES)) { let f = 0, k = 0, t = 0; for (let seed = 1; seed <= 8; seed++) { const r = play(BASE_TACTIC, s, seed); f += r.falls; k += r.kills; t += r.tense; await wait(); } yield [s, (f / 8).toFixed(2), Math.round(k / 8), pct(t / 8), band(t / 8)]; } } },
  { id: 'earth', name: 'TRIPS TO EARTH', asks: 'A robot rides the lander down alone, twenty trips per style: how often it makes it back, what it brings, how tense it was.',
    cols: ['style', 'back', 'light brought', 'danger close', 'in the band'], steps: 3,
    async *run() { for (const s of ['careful', 'greedy', 'perfect']) { let b = 0, l = 0, t = 0; for (let seed = 1; seed <= 20; seed++) { const r = trip(s, seed, 1); b += r.back; l += r.light; t += r.tense; if (seed % 4 === 0) await wait(); } yield [s, pct(b / 20), Math.round(l / 20), pct(t / 20), band(t / 20)]; } } },
  { id: 'truck', name: 'BUILDING THE TRUCK', asks: 'A careful player keeps going down until all ten truck parts are home: how many trips, by district. The depot should take about 5 to 8.',
    cols: ['district', 'trips, eight players', 'median', 'in the target'], steps: 3,
    async *run() { for (const site of ['depot', 'city', 'reservoir']) { const ts = []; for (let s = 1; s <= 8; s++) { ts.push(campaign(site, s)); await wait(); } ts.sort((a, b) => a - b); yield [site, ts.join(' '), ts[4], site === 'depot' ? ts[4] >= 5 && ts[4] <= 8 : null]; } } },
  { id: 'friend', name: 'THE LEARNED FRIEND', asks: 'A player is recorded; a friend is built from the record; the friend is recorded too. The two records should match: that is "you cannot tell it is not him".',
    cols: ['player, seed', 'roam', 'sticks close', 'aim', 'close enough'], steps: 3,
    async *run() { const careful = { name: 'Careful', roam: 8, greed: 8, bankAt: 12, aim: 0.7, together: 0.7, blind: 3 }, bold = { name: 'Bold', roam: 22, greed: 20, bankAt: 30, aim: 0.5, together: 0.3, blind: 6 };
      for (const seed of [11, 22, 33]) { const src = crewFrom(cplay(undefined, [careful, bold], seed).history); await wait(); const fr = crewFrom(cplay(undefined, src, seed + 500).history); await wait();
        for (const s of src) { const m = fr.find(q => q.name === s.name); const ok = Math.abs(m.roam - s.roam) / s.roam < 0.25 && Math.abs(m.aim - s.aim) < 0.12;
          yield [`${s.name}, ${seed}`, `${s.roam.toFixed(1)} to ${m.roam.toFixed(1)} m`, `${s.together.toFixed(2)} to ${m.together.toFixed(2)}`, `${pct(s.aim)} to ${pct(m.aim)}`, ok]; } } } },
  { id: 'camp', name: "THE CAMP'S BOOKS", asks: 'Daniel plays every day; Dalton sleeps through days 2 to 4. Fair means the one alone is never more than a day of dues behind, what he gives reaches the fire, and the friend who was away is not left behind.',
    cols: ['seed', 'Daniel alone, worst', 'Dalton after', 'pool reached the fire', 'fair'], steps: 3,
    async *run() { for (const seed of [1, 2, 3]) { await wait(); const log = campWeek(seed), solo = log.filter(d => d.day >= 2 && d.day <= 4), worst = Math.max(...solo.map(d => d.danielBehind)), poolOk = log.some(d => d.poolMax > 0) && log[log.length - 1].pool === 0, last = log[log.length - 1];
      yield [seed, worst.toFixed(2) + ' days behind', `standing ${last.dalton >= 0 ? '+' : ''}${last.dalton}`, poolOk ? 'yes' : 'no', worst <= 1 && poolOk && last.daltonBehind <= 1]; } } },
];
for (const T of TESTS) {
  const el = document.createElement('section'); el.className = 'test';
  el.innerHTML = `<div class="head"><div><b>${T.name}</b><small>${T.asks}</small></div><button>RUN IT<small style="display:block;font-size:13px;letter-spacing:.02em;color:var(--meta)">(a few seconds)</small></button></div><div class="bar"><i></i></div><table><tr>${T.cols.map(c => `<th>${c}</th>`).join('')}</tr></table><div class="say"></div>`;
  $('#tests').append(el);
  el.querySelector('button').onclick = async () => {
    const btn = el.querySelector('button'), tb = el.querySelector('table'), bar = el.querySelector('.bar i'), say = el.querySelector('.say'); btn.disabled = true;
    tb.querySelectorAll('tr:not(:first-child)').forEach(r => r.remove()); bar.style.width = '0'; const t0 = performance.now(); let n = 0, pass = 0, judged = 0;
    for await (const row of T.run()) { const tr = document.createElement('tr'); row.forEach((v, i) => { const td = document.createElement('td'); if (i === row.length - 1) { td.textContent = v === null ? '' : v ? 'yes' : 'no'; td.className = v === null ? '' : v ? 'pass' : 'fail'; if (v !== null) { judged++; if (v) pass++; } } else { td.textContent = v; td.className = 'n'; } tr.append(td); }); tb.append(tr); n++; bar.style.width = Math.min(100, n / T.steps * 100) + '%'; }
    say.textContent = `${pass} of ${judged} in line, in ${((performance.now() - t0) / 1000).toFixed(1)} s. Same rules as the game (core/game.js), run in your browser.`; btn.disabled = false;
  };
}
// "why is this not good", answered with a number for every system (checklist item 5): sim/why.mjs reads the robots' result files into why.json
(async () => { try { const d = await (await fetch('./why.json?t=' + Date.now())).json(), esc = x => String(x || '').replace(/[<&>]/g, ''), rows = d.rows.slice().sort((a, b) => a.good - b.good);
  const box = document.createElement('div'); box.className = 'test'; box.id = 'why';
  box.innerHTML = `<div class="head"><span><b>WHY IS THIS NOT GOOD</b><small>Every system, one number, the bar it must clear. From the robots' last runs (${esc(d.at)}).</small></span></div>
    <table><tr><th>system</th><th>the number</th><th>the bar</th><th></th></tr>${rows.map(r => `<tr><td>${esc(r.name)}<div class="say" style="margin:2px 0 0">${esc(r.what)}</div></td><td class="n">${esc(r.shown)}</td><td>${esc(r.bar)}</td><td class="${r.good ? 'pass' : 'fail'}">${r.good ? 'GOOD' : 'NOT GOOD: ' + esc(r.why)}</td></tr>`).join('')}</table>`;
  const t = $('#tests'); t.parentNode.insertBefore(box, t); } catch (e) { /* (no why.json yet: run node next/sim/why.mjs) */ } })();
