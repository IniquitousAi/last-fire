// One night through core/ only (no client, no DOM, no three.js): the same function runs in node and inside the browser page, and the two must agree.
// run(seed): a camp of two standing players, dusk to dawn of night 1, fixed 0.1 s steps. Returns the ground under five spots, the fire, and the night's log.
import { newGame, addPlayer, step, BASE_TACTIC } from '../core/game.js';
export function run(seed) {
  const g = newGame(seed, BASE_TACTIC); for (let i = 0; i < 2; i++) { const p = addPlayer(g, i + 1, 'R' + i); p.x = g.fire.x + (i ? 3 : -3); p.z = g.fire.z + 4; p.y = g.land(p.x, p.z); }
  g.clock = 0.5; const probes = [[0, 0], [12, 7], [-30, 18], [55, -40], [6020, 3]].map(([x, z]) => [x, z, +g.land(x, z).toFixed(6)]);
  let steps = 0; while (g.night <= 1 && steps < 5000) { step(g, 0.1); steps++; }
  const log = g.log.map(e => e.join(' ')); let h = 2166136261; for (const ch of log.join('\n')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return { seed, probes, fire: [+g.fire.x.toFixed(3), +g.fire.z.toFixed(3)], steps, night: g.night, kills: g.stats.kills, falls: g.stats.falls, logLines: log.length, logHash: h, head: log.slice(0, 14) };
}
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].endsWith('lane_d_core_run.mjs')) console.log(JSON.stringify(run(+process.argv[2] || 1)));
