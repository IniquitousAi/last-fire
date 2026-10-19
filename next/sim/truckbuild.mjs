// node sim/truckbuild.mjs: how many Earth trips does a careful player need to bring home all ten truck parts, by district?
// Each campaign keeps its stash between trips (the parts that spawn are the ones still missing). Pass line (reasoned): the depot route
// finishes in about 5 to 8 trips, never 1 or 2; the other districts take longer.
import { newGame, addPlayer, step, stream, drop, onEarth, PAD, EARTH, PART_ORDER, PARTS } from '../core/game.js';
import { think, STYLES } from './drop.mjs';
const need = () => PART_ORDER.reduce((a, k) => a + PARTS[k].n, 0);
export function campaign(site, seed, style = 'careful') {
  const stash = {}; let trips = 0, have = 0, dry = 0;   // (dry: trips in a row that found no part; a real save carries it, so the campaign does too)
  while (have < need() && trips < 40) {
    trips++; const g = newGame(seed * 100 + trips), S = STYLES[style], r = stream(seed * 100 + trips, 'tb'); g.clock = 0.3; g.stash = { ...stash }; g.dry = dry;
    const p = addPlayer(g, 1, 'R'); p.x = PAD.x; p.z = PAD.z; drop(g, p, site);
    for (let t = 0; t < EARTH.stay + 5 && g.earth; t += 0.1) { think(g, p, S, r, 0.1); step(g, 0.1); }
    dry = g.dry || 0;
    if (p.home) for (const k of p.pack || []) if ((stash[k] || 0) < PARTS[k].n) { stash[k] = (stash[k] || 0) + 1; have++; }
  }
  return trips;
}
if (typeof process !== 'undefined' && process.argv && (process.argv[1] || '').endsWith('truckbuild.mjs')) for (const site of ['depot', 'city', 'reservoir']) { const ts = [1, 2, 3, 4, 5, 6, 7, 8].map(s => campaign(site, s)); ts.sort((a, b) => a - b); console.log(site.padEnd(10), 'trips to a whole truck, 8 careful players:', ts.join(' '), ' median', ts[4]); }
