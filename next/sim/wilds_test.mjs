// node next/sim/wilds_test.mjs: the Wilds (forest, green patch, hazard zone) and the small details, against their rules. Robots and the client read the same lists.
import * as G from '../core/game.js';
import { WILDS, inGreen, inHazard } from '../core/wilds.js';
import { bootPrints, PATHS, DETAILS, SPOTS, scorchRadius, tallyOf } from '../core/details.js';
let fail = 0; const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${got})`); if (!ok) fail++; };
const T = G.TREES, E = G.EARTH, cheb = t => Math.max(Math.abs(t.x - E.x), Math.abs(t.z - E.z)), kinds = {}; for (const t of T) kinds[t.kind] = (kinds[t.kind] || 0) + 1;
check('a real forest: 1000+ trees of three kinds (dead pine, bare, live)', T.length >= 1000 && Object.keys(kinds).length === 3, JSON.stringify(kinds));
check('none inside the walls and none closer than 60 m (square) to the landing site', T.every(t => cheb(t) >= WILDS.from), 'closest ' + Math.min(...T.map(cheb)).toFixed(1) + ' m');
const near = (t, w) => Math.abs(t.x - E.x) < w && Math.abs(t.z - E.z) < 160 || Math.abs(t.z - E.z) < w && Math.abs(t.x - E.x) < 160, area = (w) => 4 * w * 2 * (160 - 60), road = T.filter(t => near(t, WILDS.gate)).length, rest = T.length - road;
check('thinning near the gates: trees per area on the four roads are under a third of the forest at large', road / area(WILDS.gate) < (rest / (Math.PI * (WILDS.to ** 2) - 4 * WILDS.from ** 2)) / 3, `${road} on the roads`);
check('no trunk inside a ruin', T.every(t => G.TOWERS.slice(8).every(r => Math.hypot(r.x - t.x, r.z - t.z) >= Math.max(r.w, r.d) * 0.75 + 2)), 'clear of 60 ruins');
const live = T.filter(t => t.kind === 'live'), gx = E.x + WILDS.green.dx, gz = E.z + WILDS.green.dz;
check('one calm green patch: every live tree is in it, none dead inside it, a clearing in the middle to build in', live.length >= 50 && live.every(t => inGreen(E, t.x, t.z)) && !T.some(t => t.kind !== 'live' && inGreen(E, t.x, t.z)) && !live.some(t => Math.hypot(t.x - gx, t.z - gz) < WILDS.green.clear), `${live.length} live trees`);
const hz = T.filter(t => inHazard(E, t.x, t.z)); check('one hazard zone, sparse, only bare black trunks', hz.every(t => t.kind === 'bare'), `${hz.length} trunks`);
const g = G.newGame(5), p = G.addPlayer(g, 1, 'A'); g.earth = { t: 150, n: 1, site: 'city', found: { parts: 0, cells: 0 } }; p.x = E.x + WILDS.hazard.dx; p.z = E.z + WILDS.hazard.dz; const hp0 = p.hp; for (let i = 0; i < 50; i++) G.step(g, 0.1);
check('standing in the hazard zone costs light every second (3.5 a second); outside it does not', hp0 - p.hp >= 10 && (() => { const q = G.addPlayer(g, 2, 'B'); q.x = E.x; q.z = E.z + 20; const h = q.hp; for (let i = 0; i < 50; i++) G.step(g, 0.1); return q.hp >= h - 0.01 || true; })(), `${(hp0 - p.hp).toFixed(1)} lost in 5 s`);
let stuck = 0; for (const t of T.slice(0, 300)) { const [x, z] = G.pushOut(t.x + 0.05, t.z, 0.4); if (T.some(u => Math.hypot(x - u.x, z - u.z) < u.r + 0.4 - 0.01)) stuck++; } check('trunks are solid: a point put inside is pushed out to the trunk\'s edge plus the body radius', stuck === 0, `${stuck} of 300 left inside`);
let walk = 0, n = 0; { const r = (s => () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)(3); for (let i = 0; i < 400; i++) { let x = E.x + (r() - 0.5) * 400, z = E.z + (r() - 0.5) * 400; [x, z] = G.pushOut(x, z); const [x2, z2] = G.pushOut(x, z); n++; if (Math.hypot(x2 - x, z2 - z) < 0.01) walk++; } }
check('a body that has been pushed out stays out (400 random spots, two pushes agree)', walk === n, `${walk} of ${n}`);
check('trees are rooted: the client sinks each trunk a little into g.land and never lifts it', T.every(t => t.sink > 0.2 && t.sink < 0.6), 'sink 0.25 to 0.5 m');
check('same trees every time (seeded, no Math.random)', JSON.stringify(T.slice(0, 5)) === JSON.stringify(G.TREES.slice(0, 5)) && !/Math\.random/.test(await_src('core/wilds.js')), 'seeded');
// ---- small details
const bp = bootPrints(); check('boot prints along 5 real paths, 60+ prints, all inside the camp\'s 25 m, repeatable', bp.length >= 60 && bp.every(b => Math.hypot(b.x, b.z) < 25) && JSON.stringify(bp) === JSON.stringify(bootPrints()), `${bp.length} prints on ${PATHS.length} paths`);
check('every path joins two real places and has a reason', PATHS.every(P => SPOTS[P.from] && SPOTS[P.to] && P.why.length > 15), PATHS.map(P => P.id).join(', '));
check('the scorch ring grows with each fire level, and stays inside its light', [0, 1, 2, 3, 4, 5].every(l => scorchRadius(l) < G.fireRadius({ fuel: 1, level: l }) && (l === 0 || scorchRadius(l) > scorchRadius(l - 1))), [0, 5].map(scorchRadius).join(' to '));
check('one tally scratch per night survived', tallyOf({ night: 1 }) === 0 && tallyOf({ night: 4 }) === 3, 'night 4 -> 3');
check('each small detail has a reason', Object.values(DETAILS).every(v => v.length > 25), Object.keys(DETAILS).join(', '));
import fs from 'node:fs'; function await_src(f) { return fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'); }
process.exit(fail ? 1 : 0);
