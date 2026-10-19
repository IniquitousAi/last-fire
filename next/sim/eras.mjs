// node sim/eras.mjs: reads the robots' real test outputs (playtests/checklist/test-*.txt: PASS and FAIL lines) and Daniel's verdicts
// (next/feedback.json, a list of 0 to 1 numbers, empty until he gives one) and writes next/era_state.json for the board.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { eraAt, nextNeed, score, ERAS } from '../core/eras.js';
const here = path.dirname(fileURLToPath(import.meta.url)), next = path.join(here, '..'), dir = path.join(next, 'playtests', 'checklist');
let pass = 0, fail = 0;
for (const f of fs.readdirSync(dir).filter(f => /^test-.*\.txt$/.test(f))) for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) { if (/^\s*PASS\b/.test(l)) pass++; else if (/^\s*FAIL\b/.test(l)) fail++; }
const sim = pass + fail ? pass / (pass + fail) : 0, fbFile = path.join(next, 'feedback.json'), feedback = fs.existsSync(fbFile) ? JSON.parse(fs.readFileSync(fbFile, 'utf8')) : [];
const era = eraAt(sim, feedback), st = { era: era.id, name: era.name, sim: +sim.toFixed(3), pass, fail, votes: feedback.length, score: score(sim, feedback), next: nextNeed(sim, feedback), of: ERAS.length };
fs.writeFileSync(path.join(next, 'era_state.json'), JSON.stringify(st, null, 1));
console.log(JSON.stringify(st));
