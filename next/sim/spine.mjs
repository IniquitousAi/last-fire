// node next/sim/spine.mjs: checklist item 3, "every new feature says which of B, C, A it serves before it is built" (DESIGN.md, the spine).
// Checks: every checklist item names one part of the spine; bump.py refuses to ship a version that does not say what it serves, and accepts one that does.
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const next = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), R = [], ok = (n, p, w) => R.push(`${p ? 'PASS' : 'FAIL'}  ${n}  (${w})`);
const d = JSON.parse(fs.readFileSync(path.join(next, 'checklist.json'), 'utf8')), bad = d.items.filter(it => !['B', 'C', 'A'].includes(it.spine));
ok('every checklist item names the part of the spine it serves', !bad.length, `${d.items.length - bad.length} of ${d.items.length}`);
const run = a => { try { return [0, execFileSync('python', [path.join(next, 'bump.py'), '--check', ...a], { encoding: 'utf8', stdio: 'pipe' })]; } catch (e) { return [e.status, String(e.stderr || e.stdout)]; } };
const [c1, o1] = run(['a note with no spine']); ok('bump.py refuses a version that does not say what it serves', c1 !== 0 && /spine/.test(o1), o1.trim().slice(0, 60));
const [c2, o2] = run(['--serves', 'C', 'a learned friend joins solo']); ok('bump.py accepts one that does', c2 === 0, o2.trim().slice(0, 60));
const counts = { B: 0, C: 0, A: 0 }; for (const it of d.items) counts[it.spine] = (counts[it.spine] || 0) + 1; ok('all three parts have work', counts.B && counts.C && counts.A, JSON.stringify(counts));
const out = R.join('\n') + `\n\n${R.filter(x => x.startsWith('PASS')).length} of ${R.length} pass  (spine)\n`; fs.writeFileSync(path.join(next, 'playtests', 'checklist', 'test-spine.txt'), out); console.log(out);
process.exit(R.some(x => x.startsWith('FAIL')) ? 1 : 0);
