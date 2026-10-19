// Why does a perfect crew fall? Play the base dark on many fresh nights and count what took them, night by night.
import { newGame, addPlayer, step, BASE_TACTIC } from '../core/game.js';
import { play } from './certify.mjs';
const PERFECT = { name: 'perfect', roam: 12, greed: 8, bankAt: 12, aim: 0.95, together: 1, blind: -1 };
const rows = [];
for (let s = 100; s < 112; s++) { const r = play(BASE_TACTIC, [PERFECT, { ...PERFECT, name: 'perfect2' }], s); rows.push([s, r.falls, r.history.map(h => h.falls).join('/')]); }
console.log('seed, falls, per night:', JSON.stringify(rows));
