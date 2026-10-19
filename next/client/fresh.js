// No clip twice in a row, something new every 4 beats (IMMERSION.md, "no repetition you notice"). Plain logic, tested in Node (sim/fresh_test.mjs).
// pickFresh(variants, memory, key, rnd): the next variant for a sound, never the one just played, never one of the last two while others exist,
// and the one heard longest ago is a little more likely. `memory` is any object the caller keeps; `key` names the sound (so footsteps and hits do not share).
export function pickFresh(variants, mem, key, rnd = Math.random) {
  const n = variants.length; if (n <= 1) return variants[0];
  const m = (mem[key] = mem[key] || { last: [], age: new Array(n).fill(0) });
  if (m.age.length !== n) { m.age = new Array(n).fill(0); m.last = []; }
  const banned = new Set(m.last.slice(-Math.min(2, n - 1))), ok = []; for (let i = 0; i < n; i++) if (!banned.has(i)) ok.push(i);
  let tot = 0; for (const i of ok) tot += 1 + m.age[i]; let r = rnd() * tot, pick = ok[ok.length - 1]; for (const i of ok) { r -= 1 + m.age[i]; if (r <= 0) { pick = i; break; } }
  for (let i = 0; i < n; i++) m.age[i]++; m.age[pick] = 0; m.last.push(pick); if (m.last.length > 4) m.last.shift();
  return variants[pick];
}
// the beat counter: every sound event is a beat; if the last four beats offered nothing the listener had not heard in the last twelve, the
// caller is told to reach for something new (a different far voice, a different footstep surface sound, a breath instead of a heartbeat).
export function beat(mem, id) {
  const h = (mem.__beats = mem.__beats || []); const seenBefore = h.slice(-12).includes(id); h.push(id); if (h.length > 16) h.shift();
  const fresh = !seenBefore; mem.__stale = fresh ? 0 : (mem.__stale || 0) + 1;
  return { fresh, needNew: mem.__stale >= 4 };   // (needNew: four beats running with nothing new)
}
