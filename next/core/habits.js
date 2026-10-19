// How a crew plays, written down night by night: the raw material the dark learns from. Plain numbers only, nothing personal:
// how far from the fire each player roams, how often they stand near a friend, which way they never look, how much light they carry
// before they bank it, how well they hit. The host records; the world saves the last 30 nights.
export const SECTORS = 8;

export function newRecord() { return { players: {}, tenseBeats: 0, beats: 0, falls: 0 }; }
function slot(rec, p) { return rec.players[p.name] ||= { n: 0, far: 0, roamSum: 0, near: 0, look: new Array(SECTORS).fill(0), bankSum: 0, banks: 0, shots: 0, hits: 0 }; }

// one sample a second while the dark is out (dusk and night)
export function sample(rec, g, fireX, fireZ) {
  for (const p of g.players) {
    if (p.ember || !p.name || p.bot) continue; const s = slot(rec, p), d = Math.hypot(p.x - fireX, p.z - fireZ);   // (a learned friend is never recorded: it would learn from itself)
    s.n++; s.roamSum += d; if (d > 15) s.far++;
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
      bankAt: s.banks ? +(s.bankSum / s.banks).toFixed(1) : 10, aim: s.shots >= 10 ? +(s.hits / s.shots).toFixed(2) : 0.6 };
  }
  return out;
}

// the crew as robots: each player's habits averaged over their recorded nights (newer nights count double)
export function crewFrom(history) {
  const acc = {};
  history.forEach((h, i) => { const w = i >= history.length - 3 ? 2 : 1; for (const [name, p] of Object.entries(h.players || {})) { const a = acc[name] ||= { w: 0, roam: 0, farShare: 0, together: 0, bankAt: 0, aim: 0, blind: new Array(SECTORS).fill(0) };
    a.w += w; a.roam += p.roam * w; a.farShare += p.farShare * w; a.together += p.together * w; a.bankAt += p.bankAt * w; a.aim += p.aim * w; a.blind[p.blind] += w; } });
  return Object.entries(acc).map(([name, a]) => ({ name, roam: a.roam / a.w, greed: Math.max(5, a.roam / a.w * (0.6 + a.farShare / a.w)), bankAt: a.bankAt / a.w, aim: Math.max(0.2, Math.min(0.95, a.aim / a.w)), together: a.together / a.w, blind: a.blind.indexOf(Math.max(...a.blind)) }));
}

// too comfortable: the last two nights were calm (under the tense band) and nobody fell. Only then does the dark go learn.
export function comfortable(history) { const last = history.slice(-2); return last.length === 2 && last.every(h => h.tense < 0.25 && h.falls === 0); }
