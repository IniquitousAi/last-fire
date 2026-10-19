// node sim/checklist_verify.mjs: no mark on the checklist without its proof (his rule, 2026-10-19: every item has five marks, each proven
// looked at before it is signed off). A proof is a file that exists ("path"), or a file that contains a named thing ("path#name"), or, for
// PAD only, "n/a: ..." when there is nothing to press. Any mark whose proof fails is erased and the file is written back.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), next = path.join(here, '..'), root = path.join(next, '..'), file = path.join(next, 'checklist.json');
const d = JSON.parse(fs.readFileSync(file, 'utf8')), KEYS = ['built', 'tested', 'seen', 'pad', 'played'];
const ok = (k, proof) => { if (typeof proof !== 'string') return false; if (proof.startsWith('n/a:')) return k === 'pad';
  const [p, name] = proof.split('#'), f = [path.join(next, p), path.join(root, p)].find(x => fs.existsSync(x)); if (!f) return false;
  return !name || fs.readFileSync(f, 'utf8').includes(name); };
let erased = 0; const tally = { done: 0, marks: 0, of: d.items.length * 5 };
for (const it of d.items) { for (const k of KEYS) { const c = it.checks[k]; if (c && !ok(k, c.proof)) { console.log(`erased ${k} on "${it.idea.slice(0, 50)}": proof "${c.proof}" not found`); it.checks[k] = null; erased++; } if (it.checks[k]) tally.marks++; }
  if (KEYS.every(k => it.checks[k])) tally.done++; }
fs.writeFileSync(file, JSON.stringify(d, null, 1));
console.log(`${tally.done} of ${d.items.length} done (all five marks); ${tally.marks} of ${tally.of} marks proven; ${erased} erased`);
