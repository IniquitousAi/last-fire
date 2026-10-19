// A crew that always camps and never looks north-east: does the dark learn it, prove it, and leave a fair crew alone?
import { learn } from './certify.mjs';
const night = n => ({ night: n, tense: 0.12, falls: 0, players: { Daniel: { roam: 6, farShare: 0, together: 0.9, blind: 1, blindShare: 0.01, bankAt: 8, aim: 0.7 }, Dalton: { roam: 7, farShare: 0.05, together: 0.9, blind: 1, blindShare: 0.02, bankAt: 9, aim: 0.65 } } });
const out = learn([night(1), night(2), night(3)]);
console.log(JSON.stringify(out.report, null, 1)); console.log('tactic:', JSON.stringify(out.tactic));
