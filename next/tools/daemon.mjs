// node next/tools/daemon.mjs [--once] [--dir next/daemon/worlds] [--out next/daemon/learned.json] [--every 600]
// THE DAEMON ("one mind for every world"): whenever the PC is on, it reads the recorded nights of EVERY world dropped in its folder (a saved
// world from this browser, from Dalton's, from anyone's: each is plain JSON from core saveWorld) and learns from them with no live world and
// no browser open. Per world it runs the certified learner (sim/certify.mjs learn): robots rebuild the crew from the record, and only a dark that
// is proven (three fresh runs fair, in the flow band, better by more than twice the noise) is written down; anything it cannot prove is refused
// with the reason. Worlds whose record has not changed since the last pass are skipped (free). It never touches a world file; it only writes --out.
//   one mind: the crew of every world is also pooled into ONE shared crew record (learned.json "mind"), so what it learns about how people play
//   in one world is there for the next world's learner, free.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { learn } from '../sim/certify.mjs';
import { crewFrom } from '../core/habits.js';
import { BASE_TACTIC, loadWorld } from '../core/game.js';
const here = path.dirname(fileURLToPath(import.meta.url)), next = path.join(here, '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };

export function readWorlds(dir) {   // (every *.json that loads as a saved world and has recorded nights)
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => { try { const raw = fs.readFileSync(path.join(dir, f), 'utf8'), d = JSON.parse(raw), w = loadWorld(d); return w ? { id: f.replace(/\.json$/, ''), hash: crypto.createHash('sha1').update(JSON.stringify(w.history)).digest('hex').slice(0, 12), history: w.history, tactic: w.tactic, nights: w.history.length } : null; } catch (e) { return null; } }).filter(Boolean);
}
export function runOnce({ dir = path.join(next, 'daemon', 'worlds'), out = path.join(next, 'daemon', 'learned.json'), gens = 6, pop = 12 } = {}) {
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(out, 'utf8')); } catch (e) {}
  const state = { at: new Date().toISOString(), worlds: {}, mind: null }, ws = readWorlds(dir), t0 = Date.now(); let learned = 0, skipped = 0;
  for (const w of ws) {
    const old = (prev.worlds || {})[w.id];
    if (old && old.hash === w.hash) { state.worlds[w.id] = { ...old, skipped: true }; skipped++; continue; }   // (nothing new recorded: nothing to learn)
    if (w.nights < 2) { state.worlds[w.id] = { hash: w.hash, nights: w.nights, tactic: null, why: 'fewer than 2 recorded nights: nothing to learn from yet', at: state.at }; continue; }
    const r = learn(w.history, w.tactic || BASE_TACTIC, { gens, pop }); learned++;
    state.worlds[w.id] = { hash: w.hash, nights: w.nights, tactic: r.tactic, why: r.report.why, crew: r.report.crew, faithful: r.report.faithful, certify: r.report.certify ? { noise: r.report.certify.noise, gain: r.report.certify.gain, seconds: r.report.certify.seconds } : null, at: state.at };
  }
  const all = ws.flatMap(w => w.history); state.mind = { worlds: ws.length, nights: all.length, crew: crewFrom(all).map(c => ({ name: c.name, roam: +c.roam.toFixed(1), together: +c.together.toFixed(2), aim: +c.aim.toFixed(2), bankAt: +c.bankAt.toFixed(1) })) };
  state.summary = { worlds: ws.length, learned, skipped, certified: Object.values(state.worlds).filter(x => x.tactic).length, seconds: +((Date.now() - t0) / 1000).toFixed(1) };
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(state, null, 1));
  return state;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(arg('--dir', path.join(next, 'daemon', 'worlds'))), out = path.resolve(arg('--out', path.join(next, 'daemon', 'learned.json'))), every = +arg('--every', 600);
  const pass = () => { const s = runOnce({ dir, out }); console.log(`${s.at}  ${s.summary.worlds} worlds: ${s.summary.learned} learned, ${s.summary.skipped} unchanged, ${s.summary.certified} with a proven dark  (${s.summary.seconds} s)  mind: ${s.mind.nights} nights from ${s.mind.worlds} worlds`); for (const [id, w] of Object.entries(s.worlds)) console.log(`  ${id}: ${w.skipped ? 'unchanged' : w.tactic ? 'CERTIFIED' : 'refused'}  ${w.why || ''}`); };
  pass(); if (!process.argv.includes('--once')) { console.log(`watching ${dir} every ${every} s (Ctrl+C to stop)`); setInterval(pass, every * 1000); }
}
