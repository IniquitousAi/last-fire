// How a crew plays, written down night by night: the raw material the dark learns from. Plain numbers only, nothing personal:
// how far from the fire each player roams, how often they stand near a friend, which way they never look, how much light they carry
// before they bank it, how well they hit. The host records; the world saves the last 30 nights.
export const SECTORS = 8;

export function newRecord() { return { players: {}, tenseBeats: 0, beats: 0, falls: 0 }; }
function slot(rec, p) { return rec.players[p.name] ||= { n: 0, far: 0, roamSum: 0, near: 0, look: new Array(SECTORS).fill(0), bankSum: 0, banks: 0, shots: 0, hits: 0, loadSum: 0, loadN: 0 }; }

// one sample a second while the dark is out (dusk and night)
export function sample(rec, g, fireX, fireZ) {
  for (const p of g.players) {
    if (p.ember || !p.name || p.bot) continue; const s = slot(rec, p), d = Math.hypot(p.x - fireX, p.z - fireZ);   // (a learned friend is never recorded: it would learn from itself)
    s.n++; s.roamSum += d; if (d > 15) s.far++; if (p.carried > 0 && d > 10) { s.loadSum += p.carried; s.loadN++; }   // (how much light they carry while out past the circle: the real overload habit, since the circle banks at once)
    if (g.players.some(q => q !== p && !q.ember && Math.hypot(q.x - p.x, q.z - p.z) < 8)) s.near++;
    const a = ((Math.atan2(-Math.sin(p.yaw || 0), -Math.cos(p.yaw || 0)) + Math.PI * 2) % (Math.PI * 2)); s.look[Math.floor(a / (Math.PI * 2) * SECTORS) % SECTORS]++;   // (the way they face, as one of 8 compass sectors)
  }
}
export function noteBank(rec, p, amount) { const s = slot(rec, p); s.bankSum += amount; s.banks++; }
export function noteShot(rec, p, hit) { const s = slot(rec, p); s.shots++; if (hit) s.hits++; }

// a night, boiled down per player: the habits a robot needs to play like them
export function summarize(rec, night) {
  const out = { night, tense: rec.beats ? rec.tenseBeats / rec.beats : 0, falls: rec.falls, players: {} };
  for (const [name, s] of Object.entries(rec.players)) {
    if (s.n < 10) continue; const lookN = s.look.reduce((a, b) => a + b, 0) || 1, blind = s.look.indexOf(Math.min(...s.look));
    out.players[name] = { roam: +(s.roamSum / s.n).toFixed(1), farShare: +(s.far / s.n).toFixed(2), together: +(s.near / s.n).toFixed(2), blind, blindShare: +(s.look[blind] / lookN).toFixed(3),
      bankAt: s.banks ? +(s.bankSum / s.banks).toFixed(1) : 10, load: s.loadN ? +(s.loadSum / s.loadN).toFixed(1) : 0, loadN: s.loadN, aim: s.shots >= 10 ? +(s.hits / s.shots).toFixed(2) : 0.6 };
  }
  return out;
}

// the crew as robots: each player's habits averaged over their recorded nights (newer nights count double)
// the record is what came out of play; a robot's dials are what goes in. CAL turns one into the other (fitted by sim/faithful.mjs --fit so a
// learned friend's own record lands on the source's: the round trip that makes 'you cannot tell it is not him' true)
export const CAL = { roamSolo: 1.0, roam: 1.8, aim: 1.45, pull: 0.45, load: 2.0 };   // (best of 100 by sim/faithful.mjs --fit: mean round-trip error 13% over roam, together, aim and carried load)
// recorded hit share saturates (a robot with 0.9 aim still records about 0.55, since far shots miss): measured by playing robots at known aims
// (3 seeds x 3 nights, two players), so the inverse is a table, not one multiplier. Between rows it is a straight line.
export const AIM_TABLE = [[0.0, 0.0], [0.231, 0.3], [0.345, 0.45], [0.447, 0.6], [0.522, 0.75], [0.549, 0.9], [0.609, 0.95]];
export function aimFrom(rec) { const T = AIM_TABLE; if (rec <= T[0][0]) return 0.2; for (let i = 1; i < T.length; i++) if (rec <= T[i][0]) { const [r0, a0] = T[i - 1], [r1, a1] = T[i]; return Math.max(0.2, a0 + (a1 - a0) * (rec - r0) / (r1 - r0)); } return 0.95; }
export function crewFrom(history) {
  const acc = {};
  history.forEach((h, i) => { const w = i >= history.length - 3 ? 2 : 1; for (const [name, p] of Object.entries(h.players || {})) { const a = acc[name] ||= { w: 0, roam: 0, farShare: 0, together: 0, bankAt: 0, aim: 0, load: 0, loadN: 0, blind: new Array(SECTORS).fill(0) };
    a.w += w; a.roam += p.roam * w; a.farShare += p.farShare * w; a.together += p.together * w; a.bankAt += p.bankAt * w; a.load += (p.load || 0) * w; a.loadN += p.loadN || 0; a.aim += p.aim * w; a.blind[p.blind] += w; } });
  return Object.entries(acc).map(([name, a]) => ({ name, roam: a.roam / a.w * (Object.keys(acc).length === 1 ? CAL.roamSolo : CAL.roam), greed: Math.max(5, a.roam / a.w * (0.6 + a.farShare / a.w)), bankAt: a.loadN >= 20 ? Math.max(3, a.load / a.w * CAL.load) : a.bankAt / a.w,   /* (the load habit only once it is measured: 20 samples out past the circle) */ load: a.load / a.w, aim: aimFrom(a.aim / a.w), together: a.together / a.w, blind: a.blind.indexOf(Math.max(...a.blind)) }));
}

// too comfortable: the last two nights were calm (under the tense band) and nobody fell. Only then does the dark go learn.
export function comfortable(history) { const last = history.slice(-2); return last.length === 2 && last.every(h => h.tense < 0.25 && h.falls === 0); }
