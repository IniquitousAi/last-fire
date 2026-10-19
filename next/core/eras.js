// Eras: the game grows deeper into the lore one era at a time. An era launches only when the robots AND real feedback say so, and real
// feedback weighs more than the robots (LORE.md). Tech follows the era: scavenged first, then light, then the dark's own.
// The numbers come from next/era_state.json (written by sim/eras.mjs from the real test files; feedback is Daniel's own verdicts, empty so far).
export const WEIGHT = { sim: 0.3, feedback: 0.7 };   // (real feedback counts more than the robots: 70 to 30)
export const ERAS = [
  { id: 1, name: 'Scavenged', tech: ['rifle', 'pistol', 'shotgun', 'fire axe', 'flare', 'lamp', 'relay', 'truck from parts'], need: null },
  { id: 2, name: 'Light', tech: ['light rifle', 'beacon lamp', 'warm suit', 'light rail'], need: { score: 0.75, sim: 0.8, feedback: 0.6, votes: 3 } },
  { id: 3, name: "The dark's own", tech: ['dark glass', 'shade cloak', 'the console'], need: { score: 0.85, sim: 0.9, feedback: 0.75, votes: 5 } },
];
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
// feedback: a list of verdicts from 0 (broken) to 1 (great); sim: the share of robot checks passing (0 to 1)
export function score(sim, feedback) { return feedback.length ? WEIGHT.sim * sim + WEIGHT.feedback * mean(feedback) : null; }
export function eraAt(sim, feedback) {
  const fb = mean(feedback), sc = score(sim, feedback); let era = ERAS[0];
  for (const E of ERAS.slice(1)) { const n = E.need; if (sc !== null && sc >= n.score && sim >= n.sim && fb >= n.feedback && feedback.length >= n.votes) era = E; else break; }
  return era;
}
export function nextNeed(sim, feedback) {
  const cur = eraAt(sim, feedback), nx = ERAS[ERAS.indexOf(cur) + 1]; if (!nx) return 'the last era is open';
  const n = nx.need, fb = mean(feedback);
  if (feedback.length < n.votes) return `needs ${n.votes - feedback.length} more verdicts from you`;
  if (sim < n.sim) return `robots at ${Math.round(sim * 100)}%, need ${Math.round(n.sim * 100)}%`;
  if (fb < n.feedback) return `your verdicts average ${Math.round(fb * 100)}%, need ${Math.round(n.feedback * 100)}%`;
  return 'waiting on the total score';
}
export const techFor = era => ERAS.filter(E => E.id <= era.id).flatMap(E => E.tech);
export const available = (era, tech) => techFor(era).includes(tech);
