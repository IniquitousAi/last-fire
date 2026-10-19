// node next/sim/look_rounds.mjs: checklist item 1, "side-by-side against the references; fix the biggest gap each round". Reads
// playtests/look/rounds.md (written by sim/lookmatch.py) and checks the loop really closes gaps: each round names its biggest gap, a later
// round has a smaller worst gap than the first, and no banned warm color ever showed.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const next = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), t = fs.readFileSync(path.join(next, 'playtests', 'look', 'rounds.md'), 'utf8');
const rounds = t.split(/^## /m).slice(1).map(r => { const rows = [...r.matchAll(/^\| ([\w-]+) \| ([\d.]+) \| [^|]+\|((?: [\d.]+ \|){7})$/gm)].map(m => ({ shot: m[1], gap: +m[2], warm: +m[3].split('|').map(x => x.trim()).filter(Boolean)[6] })); return { rows, next: (r.match(/fix next: (\w+)/) || [])[1] }; }).filter(r => r.rows.length);
const R = [], ok = (n, p, w) => R.push(`${p ? 'PASS' : 'FAIL'}  ${n}  (${w})`), worst = r => Math.max(...r.rows.map(x => x.gap));
ok('at least two rounds measured against his north star', rounds.length >= 2, rounds.length + ' rounds');
ok('every round names the biggest gap to fix next', rounds.every(r => r.next), rounds.map(r => r.next).join(', '));
ok('the worst gap shrank since the first round', worst(rounds.at(-1)) < worst(rounds[0]), `${worst(rounds[0]).toFixed(2)} to ${worst(rounds.at(-1)).toFixed(2)}`);
ok('no banned warm color in any shot of any round', rounds.every(r => r.rows.every(x => x.warm < 0.5)), 'orange, gold, brown all under 0.5%');
const out = R.join('\n') + `\n\n${R.filter(x => x.startsWith('PASS')).length} of ${R.length} pass  (look rounds)\n`; fs.writeFileSync(path.join(next, 'playtests', 'checklist', 'test-look_rounds.txt'), out); console.log(out); process.exit(R.some(x => x.startsWith('FAIL')) ? 1 : 0);
