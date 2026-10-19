// node next/sim/daemon_test.mjs: the daemon learns for every world from recorded nights with no live world (checklist item: "One daemon learns
// for every world from recorded nights"). Two made-up worlds (two different crews) are played by robots, saved as plain JSON, dropped in a folder;
// tools/daemon.mjs reads them with no browser. Fast settings (2 generations) so the test runs in seconds; the real daemon uses more.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { play } from './certify.mjs';
import { saveWorld, BASE_TACTIC } from '../core/game.js';
import { runOnce, readWorlds } from '../tools/daemon.mjs';
let fail = 0; const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${got})`); if (!ok) fail++; };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lf-daemon-')), wdir = path.join(dir, 'worlds'), out = path.join(dir, 'learned.json'); fs.mkdirSync(wdir);
const careful = [{ name: 'Daniel', roam: 8, greed: 8, bankAt: 12, aim: 0.7, together: 0.7, blind: 3 }, { name: 'Dalton', roam: 9, greed: 8, bankAt: 12, aim: 0.6, together: 0.7, blind: 5 }];
const bold = [{ name: 'Rex', roam: 22, greed: 20, bankAt: 30, aim: 0.5, together: 0.3, blind: 6 }, { name: 'Mo', roam: 20, greed: 18, bankAt: 28, aim: 0.55, together: 0.3, blind: 1 }];
const put = (id, crew, seed, nights) => { const r = play(BASE_TACTIC, crew, seed, nights); fs.writeFileSync(path.join(wdir, id + '.json'), JSON.stringify(saveWorld(r.g))); return r.g.history.length; };
const nA = put('world-daniel', careful, 11, 4), nB = put('world-rex', bold, 22, 4); fs.writeFileSync(path.join(wdir, 'young.json'), JSON.stringify(saveWorld(play(BASE_TACTIC, careful, 33, 1).g))); fs.writeFileSync(path.join(wdir, 'junk.json'), '{ not json');
const sha = f => crypto.createHash('sha1').update(fs.readFileSync(path.join(wdir, f))).digest('hex'), before = fs.readdirSync(wdir).map(f => [f, sha(f)]);
check('it finds every saved world in the folder and ignores a corrupt file', readWorlds(wdir).length === 3 && readWorlds(wdir).every(w => w.id !== 'junk'), readWorlds(wdir).map(w => `${w.id}(${w.nights} nights)`).join(', '));
const t0 = Date.now(), s = runOnce({ dir: wdir, out, gens: 2, pop: 8 });
check('one pass handles all three worlds with no browser and no live world', Object.keys(s.worlds).length === 3 && s.summary.worlds === 3 && fs.existsSync(out), `${s.summary.learned} learned in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
check('every world gets an answer: a proven dark or a plain reason it refused', Object.values(s.worlds).every(w => w.tactic || (typeof w.why === 'string' && w.why.length > 8)), Object.entries(s.worlds).map(([k, w]) => `${k}: ${w.tactic ? 'certified' : w.why}`).join(' | '));
check('a world with too few recorded nights is refused with that reason (not guessed at)', /fewer than 2/.test(s.worlds.young.why) && !s.worlds.young.tactic, s.worlds.young.why);
check('certification refuses what it cannot prove (a tactic is only kept when certified)', Object.values(s.worlds).every(w => !w.tactic || /certified/.test(w.why)), 'no unproven tactic stored');
check('one mind: the crews of both worlds are pooled (Daniel, Dalton, Rex and Mo all in it)', ['Daniel', 'Dalton', 'Rex', 'Mo'].every(n => s.mind.crew.some(c => c.name === n)) && s.mind.worlds === 3, s.mind.crew.map(c => `${c.name} roam ${c.roam}`).join(', '));
const t1 = Date.now(), s2 = runOnce({ dir: wdir, out, gens: 2, pop: 8 });
check('a second pass with nothing new skips every world (free)', s2.summary.learned === 0 && s2.summary.skipped >= 2, `${s2.summary.skipped} skipped, ${s2.summary.learned} learned, ${((Date.now() - t1) / 1000).toFixed(2)} s`);
put('world-rex', bold, 44, 5); const s3 = runOnce({ dir: wdir, out, gens: 2, pop: 8 });
check('when one world records more nights, only that world is learned again', s3.worlds['world-rex'].skipped !== true && s3.worlds['world-daniel'].skipped === true, `rex relearned, daniel skipped`);
check('it never changes a world file, it only writes its own answer', before.filter(([f]) => f !== 'world-rex.json').every(([f, h]) => sha(f) === h), 'world files untouched');
fs.rmSync(dir, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
