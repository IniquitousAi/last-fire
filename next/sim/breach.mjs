// node sim/breach.mjs: does the breach show before it pours? (INNOVATION.md 5A, queue item 68)
// For every flood the dark pours through, the warning it gave first (seconds between 'flood-warn' and 'flood' at the same gap), and whether
// the gap is still the weakest light when it pours (the dimmest gap moved less than 0.6 rad since the warning). 32 seeds per crew, 3 nights.
// Pass: 95% of breaches warned at least 2 s ahead, and 80% or more still land on the weakest light (so a warning is worth reading).
import { play, STYLES } from './robots.mjs';
import { BASE_TACTIC } from '../core/game.js';
let n = 0, warned = 0, onWeak = 0; const t0 = Date.now();
for (const s of Object.keys(STYLES)) for (let seed = 1; seed <= 32; seed++) {
  const log = play(BASE_TACTIC, s, seed).log; let warnAt = null;
  for (const e of log) { if (e[1] === 'flood-warn') warnAt = e[0]; if (e[1] === 'flood') { n++; if (warnAt !== null && e[0] - warnAt >= 2) warned++; if ((e[3] ?? 9) < 0.6) onWeak++; warnAt = null; } }
}
const pw = warned / n, pk = onWeak / n;
console.log(`breaches: ${n}; warned 2 s or more ahead: ${(100 * pw).toFixed(1)}%; still the weakest light when it pours: ${(100 * pk).toFixed(1)}%  ${pw >= 0.95 && pk >= 0.8 ? 'PASS' : 'FAIL'}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
