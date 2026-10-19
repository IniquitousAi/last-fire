// node sim/lore_test.mjs: lane A's rules, checked by robots. The honest number, the softened board, the dark as entropy, no forever-win,
// random nights, the theories wall, the three labels, jobs that cannot be exploited, eras that need real feedback, and the dark-and-neon palette.
// Each line is PASS or FAIL with what it saw. Exit code 1 on any FAIL.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { newGame, step, evidence, THEORIES, fireRadius, stream, econ, DUES } from '../core/game.js';
import * as L from '../core/lore.js';
import * as J from '../core/jobs.js';
import * as E from '../core/eras.js';
import { comfortable } from '../core/habits.js';
import { newCamp, day, payDues } from '../core/camp.js';
import { run as econRun } from './economy.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), next = path.join(here, '..'), src = f => fs.readFileSync(path.join(next, f), 'utf8');
let fails = 0; const t = (name, ok, saw) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${saw})`); };
const nightRec = (falls = 0, tense = 0.1) => ({ night: 1, tense, falls, players: {} });

// ---- the honest number
{ const g = newGame(1), p0 = L.pastDark(g), p0b = L.pastDark(g);
  t('The honest number is the same when the camp did nothing new', p0 === p0b && p0 > 0 && p0 < 1e-4, p0.toExponential(2));
  const a = newGame(1); a.nodes.push({ lit: true }); const lit = L.pastDark(a);
  const b = newGame(1); b.fire.level = 2; const lvl = L.pastDark(b);
  const c = newGame(1); c.history.push(nightRec(), nightRec()); const nts = L.pastDark(c);
  t('A lit lamp, a higher fire and a survived night each move it up', lit > p0 && lvl > p0 && nts > p0, `base ${p0.toExponential(2)} lamp ${lit.toExponential(2)} fire ${lvl.toExponential(2)} nights ${nts.toExponential(2)}`);
  const d = newGame(1); d.nodes.push({ lit: false }); t('An unlit lamp does not move it', L.pastDark(d) === p0, 'same as base');
  let g2 = newGame(1), prev = L.pastDark(g2), mono = true; for (let i = 0; i < 40; i++) { if (i % 3 === 0) g2.nodes.push({ lit: true }); if (i % 7 === 0) g2.fire.level++; g2.history.push(nightRec()); const v = L.pastDark(g2); if (v < prev) mono = false; prev = v; }
  t('Built up over 40 steps it only ever goes up, and stays far below 1 percent', mono && prev < 1e-3, prev.toExponential(2)); }

// ---- the leaders who soften the odds (ego as the villain)
{ let ok = true, never = true, mono = true, last = 1e9, capped = true; for (let r = 0; r <= 99; r++) { const c = L.councilOdds(r), gap = c - r; if (c < r + (r > 96 ? 0 : 3) && r <= 96) ok = false; if (c > 99) capped = false; if (c < r) never = false; if (gap > last) mono = false; last = gap; }
  t('The board never rounds down: council is at least the real number', never, 'checked 0 to 99');
  t('The worse the real number, the more they soften it', mono && L.soften(10) > L.soften(80), `at 10%: +${L.soften(10)}, at 80%: +${L.soften(80)}`);
  t('The council never says more than 99', capped, `real 99 shows ${L.councilOdds(99)}`);
  t('Proving them wrong changes nothing but your seat at dinner', L.welcome(1) < L.welcome(0) && L.welcome(50) === 0.4 && L.afterProof(1) && L.afterProof(0) === null, `welcome ${L.welcome(0)} -> ${L.welcome(1)} -> floor ${L.welcome(50)}`);
  const g = newGame(1); t('Only someone who has checked gets the real odds at dawn', L.dawnLine(g, 0) === null && /Real odds today: \d+%/.test(L.dawnLine(g, 1)), L.dawnLine(g, 1)); }

// ---- the dark is entropy: a fixed rate, no wants, no malice words
{ const lines = [...Object.values(L.DARK_LINES), ...L.EVENTS.map(e => e.line), L.TUESDAY, ...L.edgeSign(newGame(1)).map(x => x.t), ...L.KNOWN.map(k => k.text)];
  const bad = lines.filter(l => L.MALICE.test(l)); t('No line about the dark shows malice', bad.length === 0, bad.length ? bad[0] : `${lines.length} lines read`);
  const g = newGame(1); g.clock = 0.35; const f0 = g.fire.fuel; step(g, 1); const dayLoss = f0 - g.fire.fuel; g.clock = 0.92; const f1 = g.fire.fuel; step(g, 1); const nightLoss = f1 - g.fire.fuel;
  t('The fire loses fuel at one fixed rate, day and night, with nobody doing it', Math.abs(dayLoss - L.ENTROPY.dayRate) < 0.05 && Math.abs(nightLoss - L.ENTROPY.nightRate) < 0.05, `day ${dayLoss.toFixed(2)} night ${nightLoss.toFixed(2)} per second`);
  const same = (() => { const a = newGame(1), b = newGame(9); a.clock = b.clock = 0.92; const x = a.fire.fuel, y = b.fire.fuel; step(a, 1); step(b, 1); return Math.abs((x - a.fire.fuel) - (y - b.fire.fuel)) < 1e-9; })();
  t('The same loss for every camp, whoever is watching', same, 'seed 1 and seed 9 match'); }

// ---- no forever-win
{ const g = newGame(1); g.players = []; let nights = 0; const n0 = g.night; for (let i = 0; i < 120000 && g.fire.fuel > 0; i++) { step(g, 0.5); } nights = g.night - n0;
  t('A fire nobody feeds goes out in a bounded time and the circle shrinks', g.fire.fuel === 0 && fireRadius(g.fire) === 3, `fuel 0 after ${nights} nights, circle ${fireRadius(g.fire)} m`);
  let dim = true, prev = 1e9; for (let s = 0; s < 400; s += 7) { const v = L.gain(s); if (v >= prev) dim = false; prev = v; }
  t('Each light spent on yourself adds less than the one before', dim && L.gain(1000) < L.gain(10) / 2, `gain at 10: ${L.gain(10).toFixed(4)}, at 1000: ${L.gain(1000).toFixed(4)}`);
  const h = newGame(1); const a = L.held(h); h.night += 9; t('The score is only how long you hold', L.held(h) === a + 9 && /held 9 nights/.test(L.holdLine(h)) && !/won|win/i.test(L.holdLine(h)), L.holdLine(h));
  const files = ['client/camp.js', 'core/lore.js'].map(src).join(' '); t('Nothing on screen says you won', !/\b(you win|you won|victory|game over, you)\b/i.test(files), 'no win text in camp.js or lore.js'); }

// ---- the dark adapts only when you get too comfortable
{ t('Two calm nights with no falls: the dark learns', comfortable([nightRec(), nightRec()]) && L.darkLearning({ history: [nightRec(), nightRec()] }), 'yes');
  t('One calm night is not enough', !comfortable([nightRec()]), 'no');
  t('A fall in the last two nights stops it', !comfortable([nightRec(), nightRec(1)]) && !comfortable([nightRec(1), nightRec()]), 'no');
  t('A tense night stops it', !comfortable([nightRec(0, 0.5), nightRec()]), 'no'); }

// ---- random nights
{ let ok = true, ids = new Set(), rep = false, dash = false;
  for (const seed of [1, 2, 3, 77]) for (let n = 1; n <= 200; n++) { const e = L.nightEvent(seed, n, stream); if (!e || !e.line) ok = false; ids.add(e.id); if (n > 1 && L.nightEvent(seed, n - 1, stream).id === e.id) rep = true; if (L.nightEvent(seed, n, stream).id !== e.id) ok = false; }
  for (const e of L.EVENTS) if (/[–—]/.test(e.line)) dash = true;
  t('Every night has an event, the same every time for a seed', ok, '800 nights'); t('Never the same event two nights running', !rep, `${ids.size} different events used`); t('Event lines use plain punctuation', !dash, 'no dashes'); }

// ---- the theories wall
{ const g = newGame(1); for (let i = 0; i < 400; i++) evidence(g, 'us', 1.15); const v = Object.values(g.theories);
  t('No theory is ever proven: the top one stops at 85 percent', Math.max(...v) <= 0.85 + 1e-9 && Math.min(...v) > 0, `top ${Math.round(Math.max(...v) * 100)}%, lowest ${(Math.min(...v) * 100).toFixed(1)}%`);
  t('Four survivors hold four theories, each by a named person', Object.keys(THEORIES).length === 4 && Object.values(THEORIES).every(x => x.who && x.says), Object.keys(THEORIES).join(', '));
  t('The Tuesday they all remember is in the lore', /Tuesday/.test(L.TUESDAY), L.TUESDAY); }

// ---- every number carries a label
{ const g = newGame(1); g.history.push(nightRec(), nightRec());
  const rows = L.boardRows(g, { ec: { burn: 30, standing: -12, morale: 80, pool: 40 }, st: { n: 3, back: 2, brier: 0.12 }, era: { era: 1, name: 'Scavenged', next: 'needs 3 more verdicts from you' } });
  t('Every row of the board small print is labeled checked, reasoned or guess', rows.length >= 8 && rows.every(r => L.LABELS.includes(r.label)), `${rows.length} rows`);
  const draw = src('client/camp.js'); t('The board draws the label with every row', /boardRows/.test(draw) && /\(\$\{r\.label\}\)/.test(draw), 'client/camp.js reads boardRows');
  t('The known-about-the-dark list is labeled too', L.KNOWN.every(k => L.LABELS.includes(k.label)) && L.KNOWN.some(k => k.label === 'guess'), L.KNOWN.map(k => k.label).join(', ')); }

// ---- the edge
{ const g = newGame(1); g.lost = ['the Night worker', 'a Council member']; const s = L.edgeSign(g).map(x => x.t).join(' '); t('The edge sign counts the ones who went and did not come back', /Went past: 2\. Came back: 0\./.test(s), s.slice(0, 80)); }

// ---- the camp keeps its own rules, alone or with friends
{ const log = econRun(1); const solo = log.filter(d => d.day >= 2 && d.day <= 4); t('Playing alone, the camp still keeps the rules and you stay within a day of dues', solo.every(d => d.danielBehind <= 1), solo.map(d => d.danielBehind).join(', ') + ' days behind');
  const c = newCamp(['me'], undefined); day(c, { me: 3 }); t('A one-person camp owes the same share the board shows', Math.round(c.people.me.dueToday) === 120 && DUES.perPerson === 30, `camp.js share ${Math.round(c.people.me.dueToday)}, live dues ${DUES.perPerson}`); }

// ---- jobs
{ const g = newGame(1), p = {}; J.take(g, p, 'haul'); g.stats.banked += 50;
  t('A job unfinished pays nothing', !J.turnIn(g, p, 'haul').ok && J.credit(p) === 0, 'not done');
  const q = {}; g.stats.banked += 500; J.take(g, q, 'haul'); t('Work done before taking the job never counts', !J.turnIn(g, q, 'haul').ok, `progress ${J.progress(g, q, 'haul')}`);
  g.stats.banked += 40; const r = J.turnIn(g, p, 'haul'); t('Finishing pays exactly once', r.ok && J.credit(p) === 1 && !J.turnIn(g, p, 'haul').ok, `credit ${J.credit(p)}`);
  const a = {}, b = {}, ga = newGame(1), gb = newGame(1); J.take(ga, a, 'haul'); J.take(gb, b, 'haul'); for (let i = 0; i < 90; i++) ga.stats.banked += 1; gb.stats.banked += 90;
  J.turnIn(ga, a, 'haul'); J.turnIn(gb, b, 'haul'); t('Ninety tiny hauls pay exactly what one big haul does', J.credit(a) === J.credit(b) && J.credit(a) === 1, `${J.credit(a)} and ${J.credit(b)}`);
  const gd = newGame(1), s = {}; J.take(gd, s, 'haul'); gd.stats.banked += 900; J.turnIn(gd, s, 'haul'); gd.night++; J.turnIn(gd, s, 'haul'); gd.night++; const again = J.turnIn(gd, s, 'haul');
  t('Piling up work never pays more than 1 credit a day, and the extra waits for tomorrow', J.credit(s) === 3 && again.ok === true && J.progress(gd, s, 'haul') >= 0, `credit ${J.credit(s)} after 3 days`);
  const c = newCamp(['me']); day(c, { me: 3 }); const owedBefore = c.people.me.owed; c.people.me.own = 0; const person = c.people.me; person.jobs = { credit: 50, taken: {}, paidDay: {} }; const paid = payDues(c, 'me', 1000);
  t('Gear credit can never pay your dues', paid === 0 && person.paid === 0 && c.people.me.owed === owedBefore, `paid ${paid} with 50 credit in hand`);
  const gl = newGame(1), l = {}; J.take(gl, l, 'lamps'); gl.nodes.push({ lit: true }); const early = J.turnIn(gl, l, 'lamps'); gl.nodes.push({ lit: true }); const late = J.turnIn(gl, l, 'lamps');
  t('The lamp job needs the lamps actually lit', !early.ok && late.ok, `one lamp: ${early.why}; two: paid`);
  const sp = { jobs: { credit: 1, taken: {}, paidDay: {} } }; t('Gear credit buys gear only when you have enough', !J.spendCredit(sp, 'resupply') && (sp.jobs.credit = 2, J.spendCredit(sp, 'resupply')) && sp.jobs.credit === 0, 'resupply costs 2'); }

// ---- eras
{ t('Real feedback weighs more than the robots', E.WEIGHT.feedback > E.WEIGHT.sim && E.score(0, [1]) > E.score(1, [0]), `all-good feedback ${E.score(0, [1])} vs all-good robots ${E.score(1, [0])}`);
  t('No era 2 on perfect robots alone', E.eraAt(1, []).id === 1 && E.eraAt(1, [0.2, 0.2, 0.2]).id === 1, 'robots 100%, no verdicts: era 1');
  t('Good robots and good verdicts open era 2, then 3', E.eraAt(0.85, [0.8, 0.8, 0.8]).id === 2 && E.eraAt(0.95, [0.9, 0.9, 0.9, 0.9, 0.9]).id === 3, 'era 2 then 3');
  t('Era 3 cannot skip era 2', E.eraAt(0.99, [1, 1, 1, 1, 1]).id === 3 && E.eraAt(0.7, [1, 1, 1, 1, 1]).id === 1, 'robots 70% blocks both');
  const e1 = E.ERAS[0], e2 = E.ERAS[1]; t('Tech comes by era: scavenged, then light, then the dark\'s own', E.available(e1, 'rifle') && !E.available(e1, 'light rifle') && E.available(e2, 'rifle') && E.available(e2, 'light rifle') && !E.available(e2, 'dark glass'), `${E.ERAS.map(x => x.name).join(' > ')}`);
  const st = JSON.parse(src('era_state.json')); t('The board reads the real robot score from the test files', st.pass > 0 && st.era === 1 && Math.abs(st.sim - st.pass / (st.pass + st.fail)) < 0.001, `era ${st.era}, robots ${Math.round(st.sim * 100)}% (${st.pass} pass, ${st.fail} fail), ${st.votes} verdicts`); }

// ---- dark and neon: the palette on every camp screen. Not cyan, orange, gold or brown; every text readable on its background.
{ const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), lum = h => { const [r, g, b] = hex(h).map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hsv = h => { const [r, g, b] = hex(h), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let H = 0; if (d) H = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return { h: H * 60, s: mx ? d / mx : 0, v: mx }; };
  const banned = h => { const { h: H, s, v } = hsv(h); if (s < 0.25) return null; if (H >= 165 && H <= 200) return 'cyan'; if (H >= 15 && H < 45) return v < 0.65 ? 'brown' : 'orange'; if (H >= 45 && H < 70) return 'gold'; return null; };
  const files = ['client/camp.js', 'client/wrist.js', 'client/hudlook.js', 'core/lore.js'], used = new Set(); for (const f of files) for (const m of src(f).matchAll(/#[0-9a-fA-F]{6}\b/g)) used.add(m[0].toLowerCase());
  const bad = [...used].filter(h => banned(h)); t('No cyan, orange, gold or brown in the camp, wrist or HUD colors', bad.length === 0, bad.length ? 'found ' + bad.join(' ') : `${used.size} colors read`);
  const pairs = [['#ffffff', '#05060b'], ['#b9a8ff', '#05060b'], ['#ff4fd8', '#05060b'], ['#a3a6bb', '#05060b'], ['#ff6fb1', '#05060b'], ['#3dff9a', '#05060b'], ['#eef0f8', '#05060b'], ['#ff3b5c', '#05060b'], ['#8d90a8', '#05060b']];
  const low = pairs.filter(([a, b]) => cr(a, b) < 4.5); t('Every board and wrist text color reads on its dark plate (contrast 4.5 or more)', low.length === 0, low.length ? low.map(([a, b]) => `${a} on ${b} ${cr(a, b).toFixed(1)}`).join('; ') : `lowest ${Math.min(...pairs.map(([a, b]) => cr(a, b))).toFixed(1)}`);
  const dim = src('client/camp.js').includes('#6f7188'); t('No dim grey that fails contrast is left on the board', !dim, dim ? '#6f7188 still there' : 'gone'); }

console.log(fails ? `${fails} FAILED` : 'all lore checks pass'); process.exit(fails ? 1 : 0);
