// The lore as rules (LORE.md): the honest number, the leaders who soften it, the dark that is only entropy, the nights that hold, random
// nights with dry fine print. Plain numbers and plain words, deterministic (no Math.random: events come from stream(seed, name)).
// Every number the camp shows carries one of three labels: checked (counted from a record), reasoned (worked out from what happened),
// guess (no proof yet). Tested by sim/lore_test.mjs.
import { comfortable } from './habits.js';

export const LABELS = ['checked', 'reasoned', 'guess'];

// ---- the honest number: the chance something is past the dark. It moves only by what the camp really did (lit lamps, the fire's level, nights survived).
export const PAST = { base: 3.1e-6, perLit: 0.35, perLevel: 0.9, perNight: 0.05 };
export function pastDark(g) {
  const lit = g.nodes.filter(n => n.lit).length;
  return PAST.base * (1 + lit * PAST.perLit + g.fire.level * PAST.perLevel + g.history.length * PAST.perNight);
}
// how likely the camp is to see tomorrow, from the last three nights' falls (no nights yet: the old average, a reasoned number)
export function survival(g) {
  const h = g.history.slice(-3), players = Math.max(1, g.players.length);
  if (!h.length) return { pct: 81, label: 'reasoned', nights: 0 };
  const fallRate = h.reduce((s, n) => s + n.falls, 0) / (h.length * players);
  return { pct: Math.round(Math.max(0.05, Math.min(0.99, 1 - fallRate * 0.6 - (g.fire.fuel < 60 ? 0.15 : 0))) * 100), label: 'reasoned', nights: h.length };
}
// ---- ego is the villain: the leaders round the number up, and the worse it is, the more they round (never down, never past 99)
export function soften(real) { return Math.max(3, Math.round(3 + (100 - real) * 0.22)); }
export function councilOdds(real) { return Math.min(99, real + soften(real)); }
// proving them wrong changes nothing: you are right, and a little less welcome at dinner (1 = everyone saves you a seat, never below 0.4)
export function welcome(checks) { return Math.max(0.4, 1 - 0.08 * checks); }
export function afterProof(checks) {
  if (checks <= 0) return null;
  return ['You checked. The council says the board is "directionally correct".', 'You checked again. Someone moved their chair.', 'The seat beside the fire is taken now. It was not, before.', 'You are right. Nobody has asked you to say it at dinner.'][Math.min(3, checks - 1)];
}
// only whoever checks learns it: the dawn line on the wrist exists for someone who has checked at least once, never for anyone else
export function dawnLine(g, checks) {
  if (checks <= 0) return null; const s = survival(g);
  return `Real odds today: ${s.pct}%. The board says ${councilOdds(s.pct)}%.`;
}

// ---- the dark is entropy: it has no wants. Its work is one fixed rate (the fire's fuel), the same for everyone, watched or not.
export const ENTROPY = { dayRate: 0.4, nightRate: 1.0 };   // (fuel eaten per second; core/game.js#step uses the same numbers)
export const MALICE = /\b(hate|hates|wants? you|wants? to|cruel|evil|enjoy|enjoys|laughs?|hunts? you|punish|revenge|mock|mocks|smirk)\b/i;
export const DARK_LINES = {
  fire: 'The fire burns down by itself. Nothing is doing it.',
  fall: 'Someone stopped being anywhere. The dark did not notice.',
  quiet: 'A quiet night. The dark did not decide that, either.',
  scale: 'On the scale of the dark, a camp is a rounding error.',
};

// ---- no forever-win: the score is how long you hold. It only counts nights; nothing in the game ever reads "won".
export function held(g) { return Math.max(0, g.night - 1); }
export function holdLine(g) { const n = held(g); return n === 0 ? 'held: not yet' : `held ${n} night${n === 1 ? '' : 's'}`; }
// diminishing returns: the nth unit of light spent on yourself adds less than the one before (the camp's power curve)
export const gain = (spent, k = 0.25) => Math.pow(spent + 1, k) - Math.pow(spent, k);

// ---- the dark adapts only when you get too comfortable: two calm nights in a row, nobody fell (core/habits.js#comfortable)
export const darkLearning = g => comfortable(g.history || []);

// ---- the edge: the dark past the wall is the maze. Facts from the record, in the camp's paperwork voice.
export function edgeSign(g) {
  const lost = (g.lost || []).length;
  return [{ t: 'THE EDGE', size: 40 }, { t: 'Past this gate: the dark.', size: 28 }, { t: lost ? `Went past: ${lost}. Came back: 0.` : 'Went past: some. Came back: 0.', size: 28 },
    { t: 'Nobody has been hurt there. They stopped being anywhere.', size: 22 }, { t: 'Form 7, in triplicate. Read first, then decide.', size: 22 }];
}

// ---- everyone remembers the same ordinary Tuesday, then the dark. Nobody knows more than that.
export const TUESDAY = 'Everyone remembers the same ordinary Tuesday. Then the dark. Nobody remembers Wednesday.';

// ---- random nights: every night something happens, dry fine print under it. Chosen by the night's own stream, never the same twice in a row.
export const EVENTS = [
  { id: 'rats', line: 'The rats got the ration forms. The rations are fine.' },
  { id: 'lamp', line: 'A lamp flickered for an hour. Maintenance is a rumor.' },
  { id: 'wind', line: 'Wind from the wall side. Three signs fell. Two were useful.' },
  { id: 'static', line: 'The radio picked up a voice for four seconds. It read the weather.' },
  { id: 'quota', line: 'The quota went up. The sun did not.' },
  { id: 'cat', line: 'Something small sat on the wall all night and left at dawn. Filed as a cat.' },
  { id: 'smoke', line: 'The fire made a shape in the smoke. The Clerk filed it under shapes.' },
  { id: 'quake', line: 'The ground shook for one second. The board did not update.' },
  { id: 'spill', line: 'The coolant spilled by the store. It is now a landmark.' },
  { id: 'mayhem', line: 'Everything went wrong at once at 3 a.m. Everyone survived. Nobody is sure why.' },
];
export function nightEvent(seed, night, stream) {   // (stream is core/game.js#stream, passed in so this file imports nothing heavy)
  let i = Math.floor(stream(seed, 'event-1')() * EVENTS.length);
  for (let n = 2; n <= night; n++) i = (i + 1 + Math.floor(stream(seed, 'event-' + n)() * (EVENTS.length - 1))) % EVENTS.length;   // (each night steps 1 to N-1 places on from the last: never the same event two nights running)
  return EVENTS[i];
}

// ---- the camp's paperwork about the maze, kept for the codex: what is known, how sure
export const KNOWN = [
  { text: 'The dark has a gate-shaped opening in the wall.', label: 'checked' },
  { text: 'Nobody who went in has come back.', label: 'checked' },
  { text: 'The dark may be one thing wearing many shapes.', label: 'guess' },
  { text: 'Your odds fall when the fire is low.', label: 'reasoned' },
];

// ---- the board's small print: every row says how sure it is (checked, reasoned or guess). One list, so a test can read it.
// in: ec (the camp ledger or null), st (your trip guesses or null), era (era_state.json or null)
export function boardRows(g, { ec, st, era } = {}) {
  const rows = [];
  if (st) rows.push({ text: `your trip guesses: ${st.n}, came back ${st.back}`, label: 'checked' }, { text: `how true: ${st.brier.toFixed(2)}`, label: 'checked' });
  if (ec) {
    rows.push({ text: `the fire costs ${ec.burn} light a day each`, label: 'checked' }, { text: `your standing ${ec.standing >= 0 ? '+' : ''}${ec.standing}, morale ${ec.morale}%`, label: 'checked' });
    if (ec.pool > 0) rows.push({ text: `camp pool ${ec.pool} light`, label: 'checked' });
  }
  rows.push({ text: holdLine(g), label: 'checked' });
  if (darkLearning(g)) rows.push({ text: 'the dark is learning how you play', label: 'reasoned' });
  if (era) rows.push({ text: `era ${era.era}, ${String(era.name).toLowerCase()}`, label: 'checked' }, { text: `next: ${era.next}`, label: 'checked' });
  return rows;
}
