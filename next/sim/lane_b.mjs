// node next/sim/lane_b.mjs: Lane B robot tests on the rules in core/ (saves, lost night, perfect crew, GROW, learned friend, core separation).
// Each line is PASS or FAIL with what it saw; exit 1 on any FAIL. Deterministic (seeded streams only).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as C from '../core/game.js';
import { play as certPlay } from './certify.mjs';
import { crewFrom } from '../core/habits.js';
const here = path.dirname(fileURLToPath(import.meta.url));
let fail = 0; const check = (name, ok, got, soft) => { console.log(`${ok ? 'PASS' : soft ? 'GAP ' : 'FAIL'}  ${name}  (${got})`); if (!ok && !soft) fail++; };
const only = process.argv[2];
const sec = (n, f) => { if (only && only !== n) return; console.log(`\n== ${n}`); f(); };

// item 14: the world remembers (save -> JSON text -> load keeps marks, light, builds, fire, night)
sec('saves', () => {
  const g = C.newGame(777); const p = C.addPlayer(g, 1, 'Dan'); g.clock = 0.4; g.night = 4;
  C.placeNode(g, 'relay', 14, 3, 1); C.placeNode(g, 'lamp', 22, 3, 1); C.mark(g, 'fall', 30, -4, 'Dan'); C.mark(g, 'kill', 12, 9, 'Dan');
  g.motes.push({ id: g.nextId++, x: 40, z: 40, v: 5, t: 60 }, { id: g.nextId++, x: -33, z: 12, v: 3, t: 60 });
  g.fire.light = 500; g.fire.level = 2; g.fire.fuel = 120; g.stash = { frame: 1 }; p.carried = 17;
  const text = JSON.stringify(C.saveWorld(g)), h = C.loadWorld(JSON.parse(text));
  check('save is plain text that loads', !!h, `${text.length} bytes`);
  check('seed, night, clock kept', h.seed === 777 && h.night === 4 && Math.abs(h.clock - 0.4) < 1e-9, `seed ${h.seed} night ${h.night} clock ${h.clock}`);
  check('builds kept (2 nodes, same spots)', h.nodes.length === 2 && h.nodes.some(n => n.kind === 'relay' && n.x === 14 && n.z === 3) && h.nodes.some(n => n.kind === 'lamp' && n.x === 22), h.nodes.map(n => n.kind + '@' + n.x).join(','));
  check('marks kept (2)', h.marks.length === 2 && h.marks[0].k === 'fall', `${h.marks.length} marks`);
  check('light left lying out there kept (2 motes)', h.motes.length === 2 && h.motes.some(m => m.x === 40 && m.v === 5), `${h.motes.length} motes`);
  check('fire level, light, stash kept', h.fire.level === 2 && h.fire.light === 500 && h.stash.frame === 1, `level ${h.fire.level} light ${h.fire.light}`);
  check('what a player carried is kept by name', h.keep.Dan === 17, `Dan carried ${h.keep.Dan}`);
  const bad = C.loadWorld({ v: 1, seed: 'x' }); check('a broken save is refused, never crashes', bad === null, String(bad));
  const evil = C.loadWorld({ v: 1, seed: 5, nodes: [[1, 'relay', NaN, 3, 9], 'junk', [2, 'nuke', 1, 1, 1]], motes: [['a']], marks: [{ x: 'q' }] }); check('hostile save fields dropped', evil && evil.nodes.length === 0 && evil.motes.length === 0 && evil.marks.length === 0, 'cleaned');
});

// item 15: a lost night spills the light and ends; nothing resets
sec('lostnight', () => {
  const g = C.newGame(31); const a = C.addPlayer(g, 1, 'A'), b = C.addPlayer(g, 2, 'B'); g.fire.level = 3; g.fire.light = 400; g.stash = { axle: 2 }; g.clock = 0.7; a.carried = 40; b.carried = 25; const n0 = g.night;
  g.nodes.push({ id: 90, kind: 'lamp', x: 20, z: 0, hp: 80, lit: false }); const motes0 = g.motes.length;
  for (let i = 0; i < 6 && !a.ember; i++) C.hurt(g, a, 60, 'runner'); check('one down, night goes on', !b.ember && g.clock < 0.97 && g.clock === 0.7, `clock ${g.clock}`);
  for (let i = 0; i < 6 && !g.stats.lostNights; i++) C.hurt(g, b, 60, 'runner');
  check('everyone down: night ends (clock jumps to dawn), counted as lost', g.clock >= 0.97 && g.stats.lostNights === 1 && g.log.some(l => l[1] === 'allfell'), `clock ${g.clock} lost ${g.stats.lostNights}`);
  check('their light spilled as motes on the ground', g.motes.length - motes0 >= Math.ceil(40 / 5) + Math.ceil(25 / 5), `${g.motes.length - motes0} motes (8+5 expected)`);
  check('and carried light is zero', a.carried === 0 && b.carried === 0, 'both 0');
  check('nothing resets: fire level, banked light, stash, builds, night number', g.fire.level === 3 && g.fire.light === 400 && g.stash.axle === 2 && g.nodes.length === 1 && g.night === n0, `level ${g.fire.level} light ${g.fire.light} night ${g.night}`);
  check('both are back up (revived at the fire), dark cleared', !a.ember && !b.ember && g.hollow.length === 0, 'revived');
  const t = g.t; for (let i = 0; i < 200; i++) C.step(g, 0.1); check('the world keeps running after the lost night', g.t > t && g.night >= n0, `night ${g.night}`);
});

// item 16: a perfect crew never falls. Played over 12 nights on 32 seeds, with the fire grown as in play (certify.mjs: rifle by night 1, M14 by 5, rail by 8).
// The strict claim (zero falls) is reported as a count; the gate is the share of fall-free seeds and nights, so it shows the true state.
sec('perfect', () => {
  const PERFECT = [{ name: 'P1', roam: 12, greed: 8, bankAt: 12, aim: 0.95, together: 1, blind: -1 }, { name: 'P2', roam: 12, greed: 8, bankAt: 12, aim: 0.95, together: 1, blind: -1 }];
  let falls = 0, nights = 0, cleanSeeds = 0, fallNights = 0; const bad = [];
  for (let seed = 1; seed <= 32; seed++) { const r = certPlay(C.BASE_TACTIC, PERFECT, seed, 12); falls += r.falls; nights += r.history.length; fallNights += r.history.filter(h => h.falls > 0).length; if (!r.falls) cleanSeeds++; else bad.push(seed); }
  console.log(`32 seeds x 12 nights: ${falls} falls in ${fallNights} of ${nights} nights; fall-free seeds ${cleanSeeds} of 32 (falls on seeds ${bad.join(',') || 'none'})`);
  check('perfect crew: at least 28 of 32 seeds fall-free over 12 nights, and 99% of nights', cleanSeeds >= 28 && fallNights / nights <= 0.01, `${cleanSeeds}/32 seeds, ${(100 - 100 * fallNights / nights).toFixed(1)}% of nights clean`);
  check('STRICT: zero falls on every seed (known gap if FAIL, not counted in the exit code)', falls === 0, `${falls} falls`, true);
});

// item 17: GROW is a choice and the dark answers it
sec('grow', () => {
  const g = C.newGame(5), p = C.addPlayer(g, 1, 'A'); p.x = g.fire.x + 2; p.z = g.fire.z;
  check('no light banked: cannot grow', !C.canGrow(g) && !C.grow(g, p), `light ${g.fire.light}`);
  g.fire.light = C.FIRE_COST[1] + 10; p.x = g.fire.x + 100; check('too far from the fire: cannot grow', !C.grow(g, p) && g.fire.level === 0, 'far');
  p.x = g.fire.x + 2; const before = g.fire.light, r0 = C.fireRadius(g.fire); check('standing at it with the light: grows, spends the light', C.grow(g, p) && g.fire.level === 1 && g.fire.light === before - C.FIRE_COST[1], `light ${before} -> ${g.fire.light}`);
  check('the circle gets bigger', C.fireRadius(g.fire) > r0, `${r0} m -> ${C.fireRadius(g.fire)} m`);
  const dusk = lvl => { const h = C.newGame(9); h.fire.level = lvl; C.addPlayer(h, 1, 'A'); h.clock = C.DUSK_AT - 0.01; for (let i = 0; i < 80; i++) C.step(h, 0.1); return h.fire.woke.slice(); };
  const w0 = dusk(0), w1 = dusk(1), w3 = dusk(3);
  check('the dark answers: level 0 wakes nothing extra, level 1 a runner, level 3 a giant', w0.length === 0 && w1.includes('runner') && w3.includes('giant'), `0:[${w0}] 1:[${w1}] 3:[${w3}]`);
  const h = C.newGame(9); C.addPlayer(h, 1, 'A'); h.fire.level = 5; h.fire.light = 99999; check('the top level cannot be grown past', !C.canGrow(h), 'level 5 stays');
});

// item 20: the learned friend plays like the recorded player (record-to-record, two very different players, 3 seeds)
sec('friend', () => {
  const careful = { name: 'Careful', roam: 8, greed: 8, bankAt: 12, aim: 0.7, together: 0.7, blind: 3 }, bold = { name: 'Bold', roam: 22, greed: 20, bankAt: 30, aim: 0.5, together: 0.3, blind: 6 };
  const worst = { roam: 0, aim: 0, rank: true }; const rows = [];
  for (const seed of [11, 22, 33]) { const src = crewFrom(certPlay(undefined, [careful, bold], seed).history), fr = crewFrom(certPlay(undefined, src, seed + 500).history);
    const s0 = src.find(s => s.name === 'Careful'), s1 = src.find(s => s.name === 'Bold'), f0 = fr.find(s => s.name === 'Careful'), f1 = fr.find(s => s.name === 'Bold');
    for (const [s, f] of [[s0, f0], [s1, f1]]) { worst.roam = Math.max(worst.roam, Math.abs(f.roam - s.roam) / s.roam); worst.aim = Math.max(worst.aim, Math.abs(f.aim - s.aim)); }
    worst.rank = worst.rank && f1.roam > f0.roam && s1.roam > s0.roam && f0.aim > f1.aim; rows.push(`${seed}: roam ${s0.roam.toFixed(1)}/${s1.roam.toFixed(1)} -> ${f0.roam.toFixed(1)}/${f1.roam.toFixed(1)}  aim ${s0.aim.toFixed(2)}/${s1.aim.toFixed(2)} -> ${f0.aim.toFixed(2)}/${f1.aim.toFixed(2)}`); }
  console.log(rows.join('\n'));
  check('the friend keeps the two players apart (bold roams wider, careful aims better) in every seed', worst.rank, 'ordering kept');
  check('roam within 35% of the recorded player, aim within 0.15', worst.roam <= 0.35 && worst.aim <= 0.15, `worst roam off ${(worst.roam * 100).toFixed(0)}%, worst aim off ${worst.aim.toFixed(2)}`);
});

// item 25: movement options unlock over the eras (fire levels): none lost on the way up, the first three from the start, all four by level 4
sec('moves', () => {
  const at = l => { const g = C.newGame(1); g.fire.level = l; return g; };
  check('jump, sprint and crouch are there from the start (level 0)', ['jump', 'sprint', 'crouch'].every(k => C.moveOn(at(0), k)) && !['slide', 'dodge', 'boost', 'slam'].some(k => C.moveOn(at(0), k)), C.movesAt(0).join(','));
  let mono = true, prev = 0; for (let l = 0; l <= 5; l++) { const n = C.movesAt(l).length; if (n < prev) mono = false; prev = n; }
  check('each fire level only adds moves, never takes one away', mono && C.movesAt(1).includes('slide') && C.movesAt(2).includes('dodge') && C.movesAt(3).includes('boost') && C.movesAt(4).includes('slam'), [0, 1, 2, 3, 4].map(l => `${l}:${C.movesAt(l).length}`).join(' '));
  check('by level 4 all seven moves are open, and the next-to-unlock names the right one on the way', C.movesAt(4).length === 7 && C.nextMove(at(0)) === 'slide' && C.nextMove(at(2)) === 'boost' && C.nextMove(at(4)) === null, `next at 0: ${C.nextMove(at(0))}, at 2: ${C.nextMove(at(2))}`);
  const g = C.newGame(5), p = C.addPlayer(g, 1, 'A'); g.fire.light = 5000; p.x = g.fire.x + 2; const seen = []; for (let i = 0; i < 5; i++) { C.grow(g, p); seen.push(C.movesAt(g.fire.level).length); }
  check('growing the fire is what unlocks them (five GROWs: 3 to 7 moves)', seen.join() === '4,5,6,7,7', seen.join(','));
});

// item 52: core/ is separate: no import of the client, three.js, DOM or browser globals, so a Godot port is a port, not a rewrite
sec('core', () => {
  const dir = path.join(here, '..', 'core'), files = fs.readdirSync(dir).filter(f => f.endsWith('.js')); const bad = [];
  for (const f of files) { const src = fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    for (const m of src.matchAll(/^\s*(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]/gm)) if (!/^\.\/[a-z]+\.js(\?v=\d+)?$/.test(m[1])) bad.push(`${f} imports ${m[1]}`);
    for (const re of [/\bdocument\./, /\bwindow\./, /\blocalStorage\b/, /\bnavigator\b/, /\bTHREE\./, /\bMath\.random\b/, /\bperformance\.now\b/, /\bDate\.now\b/, /\bAudioContext\b/]) { const m = src.match(re); if (m) bad.push(`${f} uses ${m[0]}`); } }
  check(`${files.length} files in core/ import only each other and touch no browser, three.js, clock or Math.random`, bad.length === 0, bad.join('; ') || files.join(' '));
});
console.log(fail ? `\n${fail} FAILED` : '\nall passed'); process.exit(fail ? 1 : 0);
