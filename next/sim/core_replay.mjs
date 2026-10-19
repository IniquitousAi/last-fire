// node next/sim/core_replay.mjs [--ref main] [--seeds 8] [--from 1] [--nights 4] [--time] [--only perfect|mixed|drop|chaos]
// The proof for a rewrite of the pure core: the OLD core (next/core/ at a git ref, default main) and the NEW core (the working tree) play the
// same games in lockstep, the same robot drivers on both, and after EVERY step the whole world is compared as JSON (players, the dark, the
// fire, nodes, motes, embers, flares, tracers, car, Earth, Rift, stats, the newest log lines; the full log at the end of each game).
// Any difference is printed with the driver, seed and tick, and the exit code is 1: the rewrite is dropped.
// --time: also times both cores alone on the lane_b perfect-crew workload (median of 3), no comparing, one process.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { execSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), next = path.resolve(here, '..'), repo = path.resolve(next, '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const FROM = +arg('--from', 1), REF = arg('--ref', 'main'), SEEDS = +arg('--seeds', 8), NIGHTS = +arg('--nights', 4), ONLY = arg('--only', ''), TIME = process.argv.includes('--time');

// two copies side by side in the temp folder: old core from the ref, new core from the working tree, the SAME driver files in both
const root = path.join(os.tmpdir(), 'core_replay_' + process.pid);
const DRIVERS = ['certify.mjs', 'drop.mjs'];
function lay(name, coreFrom) {
  const d = path.join(root, name, 'next'); fs.mkdirSync(path.join(d, 'core'), { recursive: true }); fs.mkdirSync(path.join(d, 'sim'), { recursive: true });
  fs.writeFileSync(path.join(d, 'package.json'), '{"type":"module"}');
  coreFrom(path.join(d, 'core'));
  for (const f of DRIVERS) { let s = fs.readFileSync(path.join(here, f), 'utf8'); if (f === 'drop.mjs') s = s.slice(0, s.indexOf('const SEEDS = Array.from'));   /* (drop.mjs runs its measure on import: keep only its robot) */ fs.writeFileSync(path.join(d, 'sim', f), s); }
  return d;
}
const oldDir = lay('old', dst => { for (const f of execSync(`git ls-tree --name-only ${REF} next/core/`, { cwd: repo }).toString().trim().split(/\r?\n/)) fs.writeFileSync(path.join(dst, path.basename(f)), execSync(`git show ${REF}:${f}`, { cwd: repo, maxBuffer: 1 << 26 })); });
const newDir = lay('new', dst => { for (const f of fs.readdirSync(path.join(next, 'core'))) if (f.endsWith('.js')) fs.copyFileSync(path.join(next, 'core', f), path.join(dst, f)); });
const load = async d => ({ C: await import(pathToFileURL(path.join(d, 'core', 'game.js'))), cert: await import(pathToFileURL(path.join(d, 'sim', 'certify.mjs'))), drop: await import(pathToFileURL(path.join(d, 'sim', 'drop.mjs'))) });
const OLD = await load(oldDir), NEW = await load(newDir);

// the fingerprint: every number exactly (-0 and non-finite kept apart from 0 and null)
const rep = (k, v) => typeof v === 'number' ? (Object.is(v, -0) ? '-0' : Number.isFinite(v) ? v : 'n' + v) : typeof v === 'function' ? undefined : v;
const fp = g => JSON.stringify({ t: g.t, c: g.clock, n: g.night, f: g.fire, P: g.players, H: g.hollow, N: g.nodes, M: g.motes, E: g.embers, F: g.flares || null, T: g.tracers || null, car: g.car || null, ea: g.earth || null, ri: g.rift || null, sh: g.ship || null, S: g.stats, st: g.stash, tr: g.truck, pa: g.parts, no: g.noises || null, L: g.log.length, l: g.log.slice(-6), gz: g.gaze || null, ec: g.econ || null, th: g.theories || null }, rep);

const PERFECT = { name: 'P', roam: 12, greed: 8, bankAt: 12, aim: 0.95, together: 1, blind: -1 };
const MIXED = [{ name: 'A', roam: 22, greed: 14, bankAt: 25, aim: 0.55, together: 0.3, blind: 2 }, { name: 'B', roam: 9, greed: 6, bankAt: 8, aim: 0.8, together: 0.8, blind: 5 }, { name: 'C', roam: 30, greed: 20, bankAt: 40, aim: 0.4, together: 0, blind: 0 }];
// each driver: make(M, seed) -> { g, tick() -> false when done }, built only from the module set M, so old and new run the same moves
const crewGame = crew => (M, seed) => { const { C, cert } = M, g = C.newGame(seed, C.BASE_TACTIC), r = C.stream(seed, 'robots');
  crew.forEach((S, i) => { const p = C.addPlayer(g, i + 1, S.name + (i + 1)), a = (i / crew.length) * Math.PI * 2 + 0.4; p.style = S; const home = Math.min(S.roam, 30); p.homeX = g.fire.x + Math.cos(a) * home; p.homeZ = g.fire.z + Math.sin(a) * home; });
  g.clock = 0.5; return { g, tick: () => { if (!(g.night <= NIGHTS && g.t < 330 * NIGHTS)) return false; for (const p of g.players) cert.think(g, p, r, 0.1); C.step(g, 0.1); return true; } }; };
const DRIVE = {
  perfect: crewGame([PERFECT, PERFECT]),
  mixed: crewGame(MIXED),
  drop: (M, seed) => { const { C, drop } = M, style = ['careful', 'greedy', 'perfect'][seed % 3], g = C.newGame(seed), S = drop.STYLES[style], r = C.stream(seed, 'drop-' + style); g.clock = 0.3; globalThis.__flare = seed % 2 === 0;
    if (seed % 2) for (const k of C.PART_ORDER) g.truck[k] = C.PARTS[k].n;   /* (odd seeds: the truck rides down, its lights count) */
    for (let i = 0; i < 2; i++) { const p = C.addPlayer(g, i + 1, 'R' + i); p.x = C.PAD.x + i; p.z = C.PAD.z; C.drop(g, p, ['city', 'depot', 'reservoir'][seed % 3]); }
    let t = 0; return { g, tick: () => { if (!(t < C.EARTH.stay + 5 && g.earth)) return false; for (const p of g.players) drop.think(g, p, S, r, 0.1); if (g.car && g.players[1] && seed % 2) { if (C.seatOf(g, g.players[1].id) < 0) C.useCar(g, g.players[1]); g.players[1].drive = { th: 1, st: Math.sin(t) }; } C.step(g, 0.1); t += 0.1; return true; } }; },
  chaos: (M, seed) => { const { C } = M, g = C.newGame(seed), r = C.stream(seed, 'chaos'), pick = a => a[Math.floor(r() * a.length)];
    C.setOccluders([{ x: 6, z: 4, w: 3, d: 1, ry: 0.3 }, { x: -9, z: -2, w: 2, d: 4, ry: 1.1 }, { x: 2, z: -12, w: 5, d: 1, ry: 0 }]);   /* (camp pieces: lamp shadows on the Moon) */
    const ps = [C.addPlayer(g, 1, 'A'), C.addPlayer(g, 2, 'B'), C.addPlayer(g, 3, 'C')]; ps[2].bot = true; let left = 2400, burst = 0;
    const ACT = {
      walk: () => { for (const p of ps) if (!p.ember) { p.x += (r() - 0.5) * 6; p.z += (r() - 0.5) * 6; p.yaw = r() * 6.28; p.y = g.land(p.x, p.z); } },
      torch: () => { const p = pick(ps); p.torch = !p.torch; }, crouch: () => { const p = pick(ps); p.crouch = !p.crouch; },
      optic: () => { const p = pick(ps); C.placeOptic(g, pick(['mirror', 'lens', 'prism']), p.x + (r() - 0.5) * 12, p.z + (r() - 0.5) * 12, p.id, r() * 6.28); },
      teleportMoon: () => { const p = pick(ps); p.x = (r() - 0.5) * 80; p.z = (r() - 0.5) * 80; p.y = g.land(p.x, p.z); },
      toPad: () => { const p = pick(ps); p.x = C.PAD.x; p.z = C.PAD.z; }, drop: () => C.drop(g, pick(ps), pick(['city', 'depot', 'reservoir'])), rise: () => C.rise(g, pick(ps)),
      rift: () => { const p = pick(ps); if (C.onEarth(p)) { p.x = C.RIFT.x; p.z = C.RIFT.z + 1; } }, console: () => { const p = pick(ps); if (p.z > 8500) { p.x = C.RIFT.console.x + 1; p.z = C.RIFT.console.z; C.touchConsole(g, p); } },
      carry: () => { pick(ps).carried += r() * 60; }, hurt: () => C.hurt(g, pick(ps), r() * 60, 'chaos'),
      node: () => { const p = pick(ps); C.placeNode(g, pick(['relay', 'lamp']), p.x + r() * 6, p.z + r() * 6, p.id); },
      flare: () => { const p = pick(ps); p.carried += 10; C.throwFlare(g, p, p.x + (r() - 0.5) * 30, p.z + (r() - 0.5) * 30); },
      shoot: () => { const p = pick(ps); const a = r() * 6.28; C.fired(g, p, p.x, p.z, Math.cos(a), Math.sin(a), pick(['pistol', 'ar', 'shotgun', 'lmg'])); const h = C.hitRay(g, p.x, p.y + 1.6, p.z, Math.cos(a), (r() - 0.5) * 0.3, Math.sin(a), 80); if (h) C.damage(g, h.k, h.part, r() * 200, r(), p.id); },
      grow: () => { g.fire.light += r() * 400; C.grow(g, pick(ps)); }, bank: () => { const p = pick(ps); p.x = g.fire.x + 1; p.z = g.fire.z; p.carried += r() * 100; },
      truck: () => { for (const k of C.PART_ORDER) g.truck[k] = C.PARTS[k].n; }, car: () => C.useCar(g, pick(ps)), drive: () => { const p = pick(ps); p.drive = { th: r() * 2 - 0.5, st: r() * 2 - 1 }; },
      strip: () => C.strip(g, pick(ps)), ship: () => C.useShip(g, pick(ps)), slam: () => { const p = pick(ps); C.slam(g, p, p.x, p.z); },
      fuel: () => { g.fire.fuel = r() < 0.3 ? 0.05 : r() * 600; }, night: () => { if (g.clock < 0.55) g.clock = 0.6; }, revive: () => { for (const p of ps) if (p.ember && r() < 0.3) { p.ember = false; p.hp = 100; } },
    }, names = Object.keys(ACT);
    return { g, tick: () => { if (left-- <= 0) return false; if (burst-- <= 0) { ACT[pick(names)](); burst = Math.floor(r() * 12); } C.step(g, [0.016, 0.05, 0.1, 0.1, 0.25][Math.floor(r() * 5)]); return true; } }; },
};

let diffs = 0, ticks = 0; const per = {};
{ // the land itself, point by point: every height the old core gives, the new one gives bit for bit (camp, hills, the far land, Earth, the Rift)
  let pts = 0, bad = 0; for (let seed = 1; seed <= SEEDS; seed++) { const lo = OLD.C.makeLand(seed), ln = NEW.C.makeLand(seed), r = OLD.C.stream(seed, 'land-check');
    for (const [cx, cz, span] of [[0, 0, 60], [0, 0, 400], [0, 0, 4000], [0, 6000, 300], [0, 9000, 200]]) for (let i = 0; i < 40000; i++) { const x = cx + (r() - 0.5) * 2 * span, z = cz + (r() - 0.5) * 2 * span; pts++; if (!Object.is(lo(x, z), ln(x, z))) { bad++; if (bad < 4) console.log(`DIFF  land seed ${seed} at ${x}, ${z}: ${lo(x, z)} vs ${ln(x, z)}`); } }
    for (const d of [17.999999, 18, 18.000001, 47.999999, 48, 48.000001, 0]) for (let a = 0; a < 64; a++) { const x = Math.cos(a) * d, z = Math.sin(a) * d; pts++; if (!Object.is(lo(x, z), ln(x, z))) bad++; } }   /* (the edges where the yard ends and the hills begin) */
  if (bad) diffs++; console.log(`land     ${pts} points compared: ${bad} differ`); }
for (const [name, make] of Object.entries(DRIVE)) { if (ONLY && ONLY !== name) continue; per[name] = { seeds: 0, ticks: 0 }; const saw = { kills: 0, falls: 0, dark: 0, car: 0, flares: 0, optics: 0, torch: 0, earth: 0, rift: 0, nodes: 0 };
  for (let seed = FROM; seed <= SEEDS; seed++) {
    const a = make(OLD, seed), b = make(NEW, seed); let n = 0, bad = null;
    for (;;) { const ra = a.tick(), rb = b.tick(); if (ra !== rb) { bad = 'one game ended before the other'; break; } if (!ra) break; n++; { const g = b.g; saw.dark += g.hollow.length; saw.car += !!g.car; saw.flares += !!(g.flares && g.flares.length); saw.optics += !!(g.optics && g.optics.length); saw.torch += g.players.some(p => p.torch); saw.earth += !!g.earth; saw.rift += g.players.some(p => p.z > 8500); saw.nodes += g.nodes.length > 0; }
      const fa = fp(a.g), fb = fp(b.g); if (fa !== fb) { let i = 0; while (fa[i] === fb[i]) i++; bad = `tick ${n}: ...${fa.slice(Math.max(0, i - 120), i + 60)}\n   new: ...${fb.slice(Math.max(0, i - 120), i + 60)}`; break; } }
    if (!bad && JSON.stringify(a.g.log, rep) !== JSON.stringify(b.g.log, rep)) bad = 'full log differs';
    ticks += n; per[name].ticks += n; saw.kills += b.g.stats.kills; saw.falls += b.g.stats.falls; per[name].seeds++;
    if (bad) { diffs++; console.log(`DIFF  ${name} seed ${seed}: ${bad}`); } }
  console.log(`${name.padEnd(8)} ${per[name].seeds} seeds, ${per[name].ticks} ticks compared; reached (ticks with): ${Object.entries(saw).map(([k, v]) => k + ' ' + v).join(', ')}`); }
console.log(`${ticks} ticks compared, old core (${REF}) vs new core: ${diffs ? diffs + ' games DIFFER: the rewrite is dropped' : '0 differences'}`);

if (TIME) {   // (the lane_b perfect-crew workload: 8 seeds x 12 nights, each core alone, median of 3, alternating so heat and load hit both alike)
  const run = M => { const t0 = process.hrtime.bigint(); let falls = 0; for (let s = 1; s <= 8; s++) falls += M.cert.play(M.C.BASE_TACTIC, [PERFECT, PERFECT], s, 12).falls; return [Number(process.hrtime.bigint() - t0) / 1e9, falls]; };
  const to = [], tn = []; for (let i = 0; i < 3; i++) { to.push(run(OLD)); tn.push(run(NEW)); }
  const med = a => a.map(x => x[0]).sort((x, y) => x - y)[1];
  console.log(`time, perfect crew 8 seeds x 12 nights: old ${med(to).toFixed(2)} s, new ${med(tn).toFixed(2)} s (x${(med(to) / med(tn)).toFixed(2)}); falls old ${to[0][1]} new ${tn[0][1]}`);
}
fs.rmSync(root, { recursive: true, force: true });
process.exit(diffs ? 1 : 0);
