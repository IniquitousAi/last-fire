// node sim/run.mjs [crew] [gens]: robots play the base tactic, then the breeder evolves the dark against that crew. Writes sim/tactic.json.
import { play, breed, STYLES } from './robots.mjs';
import { BASE_TACTIC } from '../core/game.js';
import { writeFileSync } from 'node:fs';

const crew = process.argv[2] || 'careful', gens = +(process.argv[3] || 10), t0 = Date.now();
console.log('base tactic, one game per crew, 3 nights:');
for (const s of Object.keys(STYLES)) console.log(' ', s.padEnd(8), JSON.stringify(play(BASE_TACTIC, s, 1)));
const out = breed(crew, { gens });
console.log(`\nbred against the ${crew} crew for ${gens} generations (${((Date.now() - t0) / 1000).toFixed(1)} s):`);
console.log('  base tactic:', JSON.stringify(out.base));
console.log('  best fair  :', out.best ? JSON.stringify(out.best.j) : 'none fair');
if (out.best) { writeFileSync(new URL('./tactic.json', import.meta.url), JSON.stringify({ crew, at: new Date().toISOString(), tactic: out.best.t, judged: out.best.j, base: out.base }, null, 1)); console.log('  tactic:', JSON.stringify(out.best.t)); }
