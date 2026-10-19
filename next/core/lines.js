// Lines that never repeat while a fresh one remains (IMMERSION.md, no fake-feeling people). st is the speaker pool's own memory ({}).
// A line is fresh until it has been said; once every line in the pool has been said, the one said longest ago goes first, and never the
// one just said. Deterministic given rnd.
export function pickFresh(st, pool, rnd = Math.random) {
  if (!pool.length) return '';
  st.said = st.said || new Map(); st.n = (st.n || 0) + 1;
  const fresh = pool.filter(l => !st.said.has(l));
  let line;
  if (fresh.length) line = fresh[Math.floor(rnd() * fresh.length)];
  else { const old = pool.filter(l => l !== st.last), pick = old.length ? old : pool; line = pick.reduce((a, b) => st.said.get(b) < st.said.get(a) ? b : a); }
  st.said.set(line, st.n); st.last = line; return line;
}
