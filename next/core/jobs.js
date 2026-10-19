// Optional jobs from the Clerk: honest work for gear credit. Never exploitable (his rule), because:
//  - a job is measured from the game's own counters, from the moment you take it (work done before taking it never counts);
//  - turning in consumes the measured work (the baseline moves up), so tiny hauls add to exactly what one big haul does;
//  - one pay per job per day, whatever you bring;
//  - gear credit buys gear only. It is not "your own light", so it can never pay your dues (core/camp.js#payDues reads only own light).
// Plain numbers, no drawing. Tested by sim/jobs_test.mjs.
export const JOBS = {
  haul: { name: 'Haul', task: 'Bank 90 light at the fire', target: 90, credit: 1, measure: g => g.stats.banked },
  lamps: { name: 'Lamps', task: 'Light 2 more lamps than you have now', target: 2, credit: 1, measure: g => g.nodes.filter(n => n.lit).length, level: true },
};
export const SPEND = { resupply: 2 };   // (what the Clerk's counter charges, in gear credit)
const slot = p => p.jobs = p.jobs || { credit: 0, taken: {}, paidDay: {} };

export function take(g, p, id) {
  const J = JOBS[id], s = slot(p); if (!J) return { ok: false, why: 'no such job' };
  if (s.taken[id]) return { ok: false, why: 'already taken' };
  s.taken[id] = { base: J.measure(g) }; return { ok: true };
}
export function progress(g, p, id) {
  const J = JOBS[id], t = slot(p).taken[id]; if (!J || !t) return 0;
  return Math.max(0, J.measure(g) - t.base);
}
export function turnIn(g, p, id) {
  const J = JOBS[id], s = slot(p), t = s.taken[id]; if (!J || !t) return { ok: false, why: 'not taken' };
  if (s.paidDay[id] === g.night) return { ok: false, why: 'paid today' };
  const done = progress(g, p, id); if (done < J.target) return { ok: false, why: 'not done', done };
  s.credit += J.credit; s.paidDay[id] = g.night;
  if (J.level) delete s.taken[id]; else t.base += J.target;   // (hauls: the work is consumed, any extra stays toward the next; lamps: take it again)
  return { ok: true, credit: s.credit };
}
export function spendCredit(p, what) { const s = slot(p), cost = SPEND[what]; if (!cost || s.credit < cost) return false; s.credit -= cost; return true; }
export const credit = p => slot(p).credit;
