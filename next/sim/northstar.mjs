// node next/sim/northstar.mjs: checklist item 56. Every reference in NORTHSTAR-CHECK.md has a measured look and a story rule that exists.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const next = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), t = fs.readFileSync(path.join(next, 'NORTHSTAR-CHECK.md'), 'utf8'), R = [], ok = (n, p, w) => R.push(`${p ? 'PASS' : 'FAIL'}  ${n}  (${w})`);
for (const ref of ['Arcane', 'Destiny', 'Maze Runner']) { const row = t.split('\n').find(l => l.startsWith('| ' + ref + ' |')) || '', proofs = [...row.matchAll(/([\w/]+\.js)#(\w+)/g)];
  const real = proofs.filter(([, f, name]) => fs.existsSync(path.join(next, f)) && fs.readFileSync(path.join(next, f), 'utf8').includes(name));
  ok(`${ref}: a measured look and a story rule that exists`, /round \d/.test(row) && real.length >= 1 && real.length === proofs.length, `${real.length} of ${proofs.length} rules found`); }
const rounds = fs.readFileSync(path.join(next, 'playtests', 'look', 'rounds.md'), 'utf8'); ok('the look numbers come from a real round', /## 2026-10-19/.test(rounds), 'rounds.md');
const out = R.join('\n') + `\n\n${R.filter(x => x.startsWith('PASS')).length} of ${R.length} pass  (north star)\n`; fs.writeFileSync(path.join(next, 'playtests', 'checklist', 'test-northstar.txt'), out); console.log(out); process.exit(R.some(x => x.startsWith('FAIL')) ? 1 : 0);
