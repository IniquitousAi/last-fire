// The camp: the community around the fire, as rules. Plain numbers, no drawing, deterministic. (His answers: next/ANSWERS.md, "The community".)
// - Dues: the fire burns light every day it lights you. You owe your share only for the days you are here (away, you use none of it).
// - Standing: what you have paid minus what you owed. The camp remembers it forever: credit stays, debt stays. "We know if you do or don't."
// - Consequences, never a forced rule: in debt, prices rise and the camp hands out no more lanterns; morale is everyone's standing together.
// - Honest work only: standing comes from light you gathered yourself; light the camp gave you cannot pay your dues (no circles).
// - Playing while your crew is offline: most of what you gather goes into the camp, which everyone shares when they are back; your own
//   power grows slower, so nobody is left behind ("a measured amount of low impact if you grind without your friends").

// (the knobs below were picked by the camp robots, sim/camp_sim.mjs --tune: 75 versions tried, the only ones passing all 9 of his rules; 2026-10-19)
export const CAMP = {
  burnPerDay: 120,    // (light the fire eats in a day, split between whoever was here that day)
  priceStep: 0.25,    // (each day of dues you are behind adds this much to your prices, up to priceCap)
  priceCap: 2.0,      // (prices at most triple: punished, never locked out)
  lanternDebt: 1,     // (more than one day behind: no more lanterns from the camp)
  soloShare: 0.85,    // (playing while some of your crew is offline: this share of what you gather goes to the camp)
  powerCurve: 0.25,   // (power = (light spent on yourself) ^ this: growth that slows the more you have, by design)
};

export function newCamp(names, k = CAMP) { const c = { k, day: 0, pool: 0, people: {} }; for (const n of names) c.people[n] = { paid: 0, owed: 0, own: 0, spent: 0, power: 0, gathered: 0, given: 0, days: 0 }; return c; }
export const standing = p => p.paid - p.owed;
export function daysBehind(c, p) { const perDay = c.k.burnPerDay / Math.max(1, Object.keys(c.people).length); return Math.max(0, -standing(p)) / perDay; }
export function priceOf(c, p, base) { return base * (1 + Math.min(c.k.priceCap, daysBehind(c, p) * c.k.priceStep)); }
export function mayHaveLantern(c, p) { return daysBehind(c, p) <= c.k.lanternDebt; }
export function morale(c) { const ps = Object.values(c.people); const behind = ps.reduce((s, p) => s + Math.min(3, daysBehind(c, p)), 0) / Math.max(1, ps.length); return Math.max(0, 1 - behind / 3); }   // (1: everyone pulls their weight; 0: everyone is three days behind)

// one day: who was here, and for how many hours, and what each chose to do with what they gathered
export function day(c, present, gatherPerHour = 30) {
  c.day++; const here = Object.entries(present).filter(([, h]) => h > 0), share = c.k.burnPerDay / Math.max(1, here.length);
  for (const [name, hours] of here) {
    const p = c.people[name]; p.days++; p.owed += share; p.dueToday = share;   // (what the game shows as "your dues today")
    const others = Object.entries(present).filter(([n]) => n !== name).map(([, h]) => h || 0), most = others.length ? Math.max(...others) : hours;
    const soloHours = Math.max(0, hours - most), got = hours * gatherPerHour, toCamp = soloHours * gatherPerHour * c.k.soloShare;   // (only the hours you play past every friend's that day count as solo)
    c.pool += toCamp; p.gathered += got; p.own += got - toCamp;
  }
}
// paying dues: only from light you gathered yourself (own), never from what the camp gave you
export function payDues(c, name, amount) { const p = c.people[name]; const a = Math.max(0, Math.min(amount, p.own)); p.own -= a; p.paid += a; return a; }
// spending on yourself (gear): prices follow your standing; power grows on a curve
export function spend(c, name, amount, base = 1) { const p = c.people[name], price = priceOf(c, p, base) / base, a = Math.max(0, Math.min(amount, p.own)); p.own -= a; p.spent += a / price; p.power = Math.pow(p.spent, c.k.powerCurve); return a; }
// the camp's pool lifts everyone equally when it is spent on the camp (walls, fire, comforts): counted as shared power
export function sharedPower(c) { return Math.pow(c.pool, c.k.powerCurve) * 0.5; }
