// Far sounds you cannot place, each one true (IMMERSION.md item 3, Hunt: Showdown's "what, where, is it dangerous"). Every so often,
// out past the light: a metal creak, a far impact, a scrape, a deep groan, a dust slide, a dry crack. Each comes from a cause that exists
// right now (a shape of the dark, a wreck, a part lying out), 35 to 110 m away; with no cause, no sound. Mean wait 11 s by day, 7 s at night.
// The scheduler is plain logic (tested in Node with a fixed seed); ambience.js makes the voices.
export const FAR = { near: 35, far: 110, dayWait: 11, nightWait: 7, minWait: 3, fresh: 4 };
export const VOICES = ['creak', 'impact', 'scrape', 'groan', 'slide', 'crack'];
// st: the scheduler's own memory (start with {}); night: 0 day, 0.5 dusk, 1 night; causes: [{ x, z, dark }]; rnd: a random source
export function farStep(st, dt, me, night, causes, rnd = Math.random) {
  const mean = FAR.dayWait + (FAR.nightWait - FAR.dayWait) * night;
  if (st.wait === undefined) st.wait = Math.max(FAR.minWait, -Math.log(1 - rnd()) * mean);
  if ((st.wait -= dt) > 0) return null;
  st.wait = Math.max(FAR.minWait, -Math.log(1 - rnd()) * mean);   // (random waits with that mean, never under 3 s)
  const inRange = causes.filter(c => { const d = Math.hypot(c.x - me.x, c.z - me.z); return d >= FAR.near && d <= FAR.far; });
  if (!inRange.length) return null;
  const dark = inRange.filter(c => c.dark), pool = dark.length && (rnd() < 0.5 || dark.length === inRange.length) ? dark : inRange.filter(c => !c.dark).length ? inRange.filter(c => !c.dark) : dark;
  const c = pool[Math.floor(rnd() * pool.length)];
  st.used = st.used || []; const ok = VOICES.filter(v => !st.used.slice(-FAR.fresh).includes(v)), voice = ok[Math.floor(rnd() * ok.length)];
  st.used.push(voice); if (st.used.length > 12) st.used.shift();
  return { voice, x: c.x, z: c.z, dark: !!c.dark };
}
