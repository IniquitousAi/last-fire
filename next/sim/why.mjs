// node next/sim/why.mjs: checklist item 5, "every 'why is this not good' answered with a number for every system" (AUDIT-2026-10-19).
// Reads the robots' own result files (playtests/checklist/test-*.txt), gives every system one number and the bar it must clear, and writes
// next/why.json for the Simulator page. A system with no number fails this script: nothing is judged by adjective.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const next = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), dir = path.join(next, 'playtests', 'checklist');
const read = f => { try { return fs.readFileSync(path.join(dir, 'test-' + f + '.txt'), 'utf8'); } catch (e) { return null; } };
const tally = t => { const p = (t.match(/^\s*PASS\b/gm) || []).length, f = (t.match(/^\s*FAIL\b/gm) || []).length, m = t.match(/(\d+) of (\d+) (?:pass|basics pass)/); return m ? { p: +m[1], n: +m[2] } : { p, n: p + f }; };
const firstFail = t => ((t.match(/^\s*FAIL\s+(.+)$/m) || [])[1] || '').trim();
const checks = (name, file, what) => ({ name, file, what, judge(t) { const { p, n } = tally(t); return { value: n ? p / n : null, shown: `${p} of ${n}`, bar: 'all pass', good: n > 0 && p === n, why: firstFail(t) }; } });
const SYSTEMS = [
  checks('The basics a player expects', 'basics', 'aim, fire, reload, menus, the pad, nothing bobs'),
  { name: 'The nights feel tense, never hopeless', file: 'director', what: 'a perfect crew with the director on', judge(t) { const m = t.match(/director \{"falls":(\d+),"kills":\d+,"tense":([\d.]+)\}/); if (!m) return null; const v = +m[2]; return { value: v, shown: `danger close ${Math.round(v * 100)}% of the night, ${m[1]} falls`, bar: '25% to 70%, no falls', good: v >= 0.25 && v <= 0.7 && +m[1] === 0, why: v < 0.25 ? 'too calm' : v > 0.7 ? 'too relentless' : +m[1] ? 'a perfect crew fell' : '' }; } },
  { name: 'Light is the rule', file: 'light_rule', what: 'how much the light rule changes play against a control', judge(t) { const c = t.match(/control \{[^}]*"tense":([\d.]+)/), r = t.match(/rule \{[^}]*"tense":([\d.]+)/); if (!c || !r) return null; const d = +r[1] - +c[1]; return { value: d, shown: `tension ${+c[1]} to ${+r[1]} (${d >= 0 ? '+' : ''}${d.toFixed(2)})`, bar: 'the rule moves tension by 0.05 or more', good: Math.abs(d) >= 0.05, why: Math.abs(d) < 0.05 ? 'the rule barely changes play' : '' }; } },
  { name: 'The flood warns before it pours', file: 'breach', what: 'breaches seen 2 s ahead', judge(t) { const m = t.match(/ahead: ([\d.]+)%/); if (!m) return null; const v = +m[1]; return { value: v / 100, shown: `${v}% warned`, bar: '95% or more', good: v >= 95, why: v < 95 ? 'breaches come with no warning' : '' }; } },
  { name: 'The ship flies true', file: 'ship', what: 'hover overshoot on a hard drop', judge(t) { const m = t.match(/overshoot (\d+)%/); if (!m) return null; const v = +m[1]; return { value: v / 100, shown: `${v}% overshoot`, bar: '5% or less', good: v <= 5, why: v > 5 ? 'it bounces' : '' }; } },
  checks('The camp keeps its own rules', 'camp_sim', 'his nine camp rules'),
  checks('The lore is rules', 'lore_test', 'every lore line has a mechanic and the board tells the truth'),
  checks('The Rift', 'rift', 'the gate, the console, endless waves, the way out'),
  checks('Solo is never lonely', 'solo_company', 'the learned friend at your fire'),
  checks('Every feature says what it serves', 'spine', 'B, C or A on every item and version'),
  checks('Far sounds have a cause', 'farsound_test', 'no sound without a cause, no repeats'),
  checks('The checklist shows its proof', 'listshot', 'the in-game checklist'),
];
const rows = []; let missing = 0;
for (const S of SYSTEMS) { const t = read(S.file); const j = t && S.judge(t); if (!j || j.value === null || !Number.isFinite(j.value)) { missing++; rows.push({ name: S.name, what: S.what, shown: 'no number yet', bar: '', good: false, why: `no result file (run sim/${S.file})` }); continue; } rows.push({ name: S.name, what: S.what, shown: j.shown, bar: j.bar, good: j.good, why: j.good ? '' : j.why || 'below its bar' }); }
const ck = JSON.parse(fs.readFileSync(path.join(next, 'checklist.json'), 'utf8')), done = ck.items.filter(it => Object.values(it.checks).every(Boolean)).length;
rows.push({ name: 'The checklist', what: 'every idea he gave, five proven marks each', shown: `${done} of ${ck.items.length} done`, bar: 'all done', good: done === ck.items.length, why: done < ck.items.length ? `${ck.items.length - done} ideas still miss a proven mark` : '' });
fs.writeFileSync(path.join(next, 'why.json'), JSON.stringify({ at: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC', rows }, null, 1));
const out = rows.map(r => `${r.good ? 'GOOD' : 'NOT GOOD'}  ${r.name}: ${r.shown}${r.bar ? ' (bar: ' + r.bar + ')' : ''}${r.why ? '  why: ' + r.why : ''}`).join('\n') + `\n\n${missing ? 'FAIL' : 'PASS'}  every system has a number  (${rows.length - missing} of ${rows.length})\n`;
fs.writeFileSync(path.join(dir, 'test-why.txt'), out); console.log(out); process.exit(missing ? 1 : 0);
