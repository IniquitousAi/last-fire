// A truly comfortable crew (great aim, always together, never strays): the dark only learns when nights are calm and nobody falls.
import { learn, play } from './certify.mjs';
import { comfortable, crewFrom } from '../core/habits.js';
import { BASE_TACTIC } from '../core/game.js';
const night = n => ({ night: n, tense: 0.15, falls: 0, players: { Daniel: { roam: 5, farShare: 0, together: 0.95, blind: 5, blindShare: 0.01, bankAt: 6, aim: 0.9 }, Dalton: { roam: 5, farShare: 0, together: 0.95, blind: 5, blindShare: 0.01, bankAt: 6, aim: 0.88 } } });
const hist = [night(1), night(2), night(3)];
const base = play(BASE_TACTIC, crewFrom(hist), 777);
console.log('comfortable by the rule:', comfortable(hist), '| base dark against this crew: tense', base.tense.toFixed(2), 'falls', base.falls);
const out = learn(hist);
const r = out.report; console.log('best in training:', JSON.stringify(r.best)); console.log('certify runs:', JSON.stringify(r.certify && r.certify.runs.map(x => [x.perNight, x.tense, x.perfectFalls, x.fair, +x.score.toFixed(3)])), 'base', JSON.stringify(r.certify && r.certify.base), 'noise', r.certify && r.certify.noise, 'gain', r.certify && r.certify.gain);
console.log('passed:', r.passed, '|', r.why); console.log('tactic:', JSON.stringify(out.tactic));
