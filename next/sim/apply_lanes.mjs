// node next/sim/apply_lanes.mjs: folds the helpers' lane files (next/lanes/*.json) into checklist.json, then checklist_verify erases any
// mark whose proof is missing. A lane only fills marks; it never clears one.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const next = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), file = path.join(next, 'checklist.json'), d = JSON.parse(fs.readFileSync(file, 'utf8'));
let n = 0; for (const f of fs.readdirSync(path.join(next, 'lanes')).filter(f => f.endsWith('.json'))) { const L = JSON.parse(fs.readFileSync(path.join(next, 'lanes', f), 'utf8'));
  for (const [i, marks] of Object.entries(L)) { if (i === 'notes' || !d.items[+i]) continue; for (const [k, v] of Object.entries(marks)) if (v && v.proof && ['built', 'tested', 'seen', 'pad', 'played'].includes(k) && !d.items[+i].checks[k]) { d.items[+i].checks[k] = v; n++; } } }
fs.writeFileSync(file, JSON.stringify(d, null, 1)); console.log(`${n} marks applied from the lanes`);
