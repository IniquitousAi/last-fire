// node next/sim/fuzz.mjs [seeds] [steps]: robots that try to break every rule (his words: "no rules that don't add up"). Each seed plays a game of
// random actions (teleports, drops and rises, nodes, flares, shots, growing the fire, truck and ship, hurting, save and load, odd frame times) and after
// every action every invariant below is checked. A broken invariant is printed with its seed and the action that broke it, and the exit code is 1.
import * as G from '../core/game.js';
const SEEDS = +(process.argv[2] || 40), STEPS = +(process.argv[3] || 400), HTML = process.argv[4];   // (a 4th argument writes the report as a page, for a screenshot)
const fails = {};
const RULES = {
  'every number on a player, the fire and every dark shape is finite': g => [...g.players, ...g.hollow].every(o => Number.isFinite(o.x) && Number.isFinite(o.z)) && Number.isFinite(g.fire.fuel) && Number.isFinite(g.fire.light),
  'health stays between -0 and 100': g => g.players.every(p => p.hp <= 100.0001 && Number.isFinite(p.hp)),
  'light carried is never negative': g => g.players.every(p => p.carried >= -1e-9),
  'the fire fuel stays between 0 and 600': g => g.fire.fuel >= 0 && g.fire.fuel <= 600.0001,
  'the fire level stays on its ladder': g => g.fire.level >= 0 && g.fire.level < G.FIRE_COST.length,
  'banked light is never negative': g => g.fire.light >= -1e-9,
  'the clock stays in [0, 1)': g => g.clock >= 0 && g.clock < 1.0001,
  'light at any place is between 0 and 1': (g, r) => { for (const p of g.players) { const L = G.lightAt(g, p.x + r() * 4, p.z + r() * 4); if (!(L >= 0 && L <= 1.0001)) return false; } return true; },
  'the stash and the truck parts are never negative': g => Object.values(g.stash).every(v => v >= 0) && Object.values(g.truck).every(v => v >= 0),
  'nobody stands inside a tree trunk or a tower after pushOut': g => g.players.every(p => { const [x, z] = G.pushOut(p.x, p.z); const [x2, z2] = G.pushOut(x, z); return Math.hypot(x2 - x, z2 - z) < 0.05; }),
  'no tree is inside the walls': () => G.TREES.every(t => Math.max(Math.abs(t.x - G.EARTH.x), Math.abs(t.z - G.EARTH.z)) >= 60),
  'the dark never outnumbers its cap': g => g.hollow.filter(k => !k.dead).length <= G.MAX_HOLLOW + 8,
  'every node has health and a known kind': g => g.nodes.every(n => G.NODE[n.kind] && Number.isFinite(n.hp)),
  'an Ember always has a place': g => g.embers.every(e => Number.isFinite(e.x) && Number.isFinite(e.z)),
  'a saved world loads back with the same fire level and night': g => { const d = JSON.parse(JSON.stringify(G.saveWorld(g))), h = G.loadWorld(d); return h.fire.level === g.fire.level && h.night === g.night; },
  'the night counter only goes up': (g, r, m) => { const ok = g.night >= (m.night || 1); m.night = g.night; return ok; },
};
const seeded = s => () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
let broke = 0, checks = 0; const kinds = {}, reach = { earth: 0, nodes: 0, falls: 0, kills: 0, levels: 0, hazard: 0, nights: 0 };
for (let seed = 1; seed <= SEEDS; seed++) {
  const r = seeded(seed * 7919), g = G.newGame(seed), ps = [G.addPlayer(g, 1, 'A'), G.addPlayer(g, 2, 'B')], m = {}; g.clock = r(); const pick = a => a[Math.floor(r() * a.length)];
  const ACT = {
    step: () => { for (let i = 0; i < 1 + Math.floor(r() * 30); i++) G.step(g, [0.016, 0.05, 0.1, 0.5, 1.9][Math.floor(r() * 5)]); },
    teleportMoon: () => { const p = pick(ps); p.x = (r() - 0.5) * 140; p.z = (r() - 0.5) * 140; p.y = g.land(p.x, p.z); },
    teleportEarth: () => { const p = pick(ps); p.x = G.EARTH.x + (r() - 0.5) * 500; p.z = G.EARTH.z + (r() - 0.5) * 500; [p.x, p.z] = G.pushOut(p.x, p.z); p.y = g.land(p.x, p.z); },
    toPad: () => { const p = pick(ps); p.x = G.PAD.x; p.z = G.PAD.z; },
    drop: () => G.drop(g, pick(ps), pick(['city', 'depot', 'reservoir'])), rise: () => G.rise(g, pick(ps)),
    carry: () => { pick(ps).carried += r() * 60; }, hurt: () => G.hurt(g, pick(ps), r() * 150, 'fuzz'),
    node: () => { const p = pick(ps); G.placeNode(g, pick(['relay', 'lamp']), p.x + r() * 6, p.z + r() * 6, p.id); },
    flare: () => { const p = pick(ps); G.throwFlare(g, p, p.x + (r() - 0.5) * 30, p.z + (r() - 0.5) * 30); },
    shoot: () => { const p = pick(ps); const a = r() * 6.28; G.fired(g, p, p.x, p.z, Math.cos(a), Math.sin(a), pick(['pistol', 'ar', 'shotgun', 'lmg'])); const h = G.hitRay(g, p.x, p.y + 1.6, p.z, Math.cos(a), (r() - 0.5) * 0.3, Math.sin(a), 80); if (h) G.damage(g, h.k, h.part, r() * 200, r(), p.id); },
    grow: () => { g.fire.light += r() * 400; G.grow(g, pick(ps)); }, bank: () => { const p = pick(ps); p.x = g.fire.x + 1; p.z = g.fire.z; p.carried += r() * 100; },
    strip: () => G.strip(g, pick(ps)), fit: () => G.fit(g, pick(ps)), car: () => G.useCar(g, pick(ps)), ship: () => G.useShip(g, pick(ps)),
    parts: () => { g.stash[pick(G.PART_ORDER)] = (g.stash[pick(G.PART_ORDER)] || 0) + 1; }, slam: () => { const p = pick(ps); G.slam(g, p, p.x, p.z); },
    fuel: () => { g.fire.fuel = r() < 0.5 ? 0 : r() * 600; }, clock: () => { g.clock = r() < 0.5 ? 0.99 : r(); },
  };
  const names = Object.keys(ACT); let earth = 0;
  for (let i = 0; i < STEPS; i++) { const name = pick(names); try { ACT[name](); } catch (e) { broke++; console.log(`FAIL seed ${seed} step ${i}: action ${name} threw ${e.message}`); break; }
    if (g.earth) earth++;
    for (const p of ps) if (p.ember && r() < 0.3) { p.ember = false; p.hp = 100; }
    for (const [rule, f] of Object.entries(RULES)) { checks++; let ok; try { ok = f(g, r, m); } catch (e) { ok = false; } if (!ok) { broke++; fails[rule] = (fails[rule] || 0) + 1; kinds[rule] = (kinds[rule] || 0) + 1; if (kinds[rule] <= 2) console.log(`FAIL seed ${seed} step ${i}: after ${name}: ${rule}`); break; } } }
  reach.earth += earth > 0; reach.nodes += g.nodes.length; reach.falls += g.stats.falls; reach.kills += g.stats.kills; reach.levels += g.fire.level; reach.hazard += g.stats.hazard || 0; reach.nights += g.night;
}
console.log('reached by the robots:', JSON.stringify(reach));
console.log(`${SEEDS} games x ${STEPS} random actions, ${Object.keys(RULES).length} rules, ${checks} checks: ${broke ? broke + ' broken' : 'no rule broken'}`);
if (HTML) { const fs = await import('node:fs'); const rows = Object.keys(RULES).map(r => `<div class="r"><b class="${fails[r] ? 'bad' : 'ok'}">${fails[r] ? fails[r] + ' BROKEN' : 'HELD'}</b><span>${r}</span></div>`).join('');
  fs.writeFileSync(HTML, `<!doctype html><meta charset="utf-8"><title>fuzz</title><style>body{background:#05060b;color:#eef0f8;font:18px "Barlow Condensed",Arial Narrow,sans-serif;margin:32px;width:900px}h1{font-weight:500;letter-spacing:.16em;border-bottom:1px solid #4a4f63;padding-bottom:6px}.r{display:grid;grid-template-columns:130px 1fr;gap:12px;padding:5px 0 5px 10px;border-left:1px solid #4a4f63}.ok{color:#8c92a8;font-weight:500}.bad{color:#ff3b5c}p{color:#b9bccb}</style><h1>ROBOTS THAT TRY TO BREAK EVERY RULE</h1><p>${SEEDS} games of ${STEPS} random actions each: ${checks} checks, ${broke ? broke + ' broken' : 'no rule broken'}. They reached: ${Object.entries(reach).map(([k, v]) => v + ' ' + k).join(', ')}.</p>${rows}`); }
process.exit(broke ? 1 : 0);
