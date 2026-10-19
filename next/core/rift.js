// The Rift (SKELETON.md, build order step 2; his words in ANSWERS.md, "The Rift, the wilds, and the scaling"): where Maze Runner's maze door
// would be, one gate in Earth's wall opens into another dimension. Walk through it and you are inside; behind you the opening back. Inside
// stands an alien console nobody understands: touch it and the waves come, one after another, forever (the infinite mode). While anyone
// is inside, the lander waits. Rules only: deterministic, no drawing.
// (no imports: game.js hands in what this needs, so the browser never loads a second copy of the rules under another version tag)

// (numbers, not imports, so this file loads before game.js has finished: the north gate of Earth's walls is at EARTH.z + WALLS.half)
export const RIFT = { x: 0, z: 6050, w: 8, in: { x: 0, z: 9000 }, console: { x: 0, z: 9026 }, touch: 3.2, room: 70, gap: 6, light: 11 };
export const inRift = p => p.z > 8500;
export const RIFT_KINDS = w => w < 3 ? ['walker', 'walker', 'runner'] : w < 6 ? ['walker', 'runner', 'runner', 'watcher'] : ['walker', 'runner', 'watcher', 'giant'];

export function riftSize(w, max = 32) { return Math.min(max, 3 + w * 3); }   // (wave 1: 6, wave 5: 18, wave 10 and on: the most the world holds)

export function touchConsole(g, p) {   // (F at the console: it wakes. Touching it again while it runs does nothing)
  if (!p || p.ember || !inRift(p) || Math.hypot(p.x - RIFT.console.x, p.z - RIFT.console.z) > RIFT.touch) return null;
  const r = g.rift = g.rift || { on: false, wave: 0, best: 0, kills: 0 }; if (r.on) return 'running';
  r.on = true; r.wave = 0; r.next = 2; r.kills = 0; g.log.push([+g.t.toFixed(2), 'console', p.id]); return 'woke';
}

export function riftStep(g, dt, { KINDS, MAX_HOLLOW, DARK, heightAt, stream }) {
  for (const p of g.players) { if (p.ember) continue;
    // through the opening: from the community's side of the north gate you step into the Rift; walking back out of its mouth returns you
    if (!inRift(p) && p.z > 3000 && Math.abs(p.x - RIFT.x) < RIFT.w / 2 && p.z > RIFT.z - 0.4 && p.z < RIFT.z + 3) { p.x = RIFT.in.x + (p.x - RIFT.x) * 0.5; p.z = RIFT.in.z + 1.5; p.y = heightAt(g.land, p.x, p.z); p.tp = (p.tp || 0) + 1; g.log.push([+g.t.toFixed(2), 'rift-in', p.id]); continue; }
    if (inRift(p)) {
      if (p.z < RIFT.in.z - 0.5 && Math.abs(p.x - RIFT.in.x) < RIFT.w / 2) { p.x = RIFT.x + (p.x - RIFT.in.x); p.z = RIFT.z - 3; p.y = heightAt(g.land, p.x, p.z); p.tp = (p.tp || 0) + 1; g.log.push([+g.t.toFixed(2), 'rift-out', p.id]); continue; }
      const cx = RIFT.console.x, cz = RIFT.console.z, d = Math.hypot(p.x - cx, p.z - cz);   // (the Rift has an edge: the smoke thickens into a wall you cannot walk through)
      if (d > RIFT.room) { p.x = cx + (p.x - cx) * RIFT.room / d; p.z = cz + (p.z - cz) * RIFT.room / d; }
      if (p.z < RIFT.in.z - 0.5) p.z = RIFT.in.z - 0.5; } }
  const r = g.rift; if (!r || !r.on) return;
  const inside = g.players.filter(p => inRift(p) && !p.ember);
  if (!inside.length && !g.players.some(p => inRift(p))) { r.on = false; r.best = Math.max(r.best, r.wave); g.hollow = g.hollow.filter(k => !k.rift); g.log.push([+g.t.toFixed(2), 'rift-closed', r.wave]); return; }   // (everyone out: the console sleeps, and it remembers the best wave)
  for (const k of g.hollow) if (k.rift && k.dead && !k.counted) { k.counted = true; r.kills++; }
  if (g.hollow.some(k => k.rift && !k.dead)) return;
  r.next -= dt; if (r.next > 0) return;
  r.wave++; r.next = RIFT.gap; r.best = Math.max(r.best, r.wave); g.log.push([+g.t.toFixed(2), 'wave', r.wave]);
  if (DARK.off) { r.held = true; return; }   // (the dark is being rebuilt: the console counts the waves it would send, and sends none)
  const rs = stream(g.seed, 'rift-' + r.wave), pool = RIFT_KINDS(r.wave), n = riftSize(r.wave, MAX_HOLLOW), grow = 1 + 0.15 * (r.wave - 1);
  for (let i = 0; i < n; i++) { const kind = pool[Math.floor(rs() * pool.length)], K = KINDS[kind], a = rs() * Math.PI * 2, d = 24 + rs() * 10, x = RIFT.console.x + Math.cos(a) * d, z = RIFT.console.z + Math.sin(a) * d;
    g.hollow.push({ id: g.nextId++, kind, earth: true, rift: true, x, z, y: heightAt(g.land, x, z), yaw: 0, hp: K.hp * grow, max: K.hp * grow, sh: K.shell[0] * grow, sb: K.shell[1] * grow, cd: 1, dead: false, speed: K.speed * (0.9 + rs() * 0.2) }); }
}
// the console's light: inside the Rift the only fixed light is the console, so the dark commits to a shape near it (the light rule holds)
export function riftLight(g, x, z) { if (z < 8500) return 0; const d = Math.hypot(x - RIFT.console.x, z - RIFT.console.z), r = RIFT.light * (g.rift && g.rift.on ? 1.4 : 1); return d < r ? 1 - d / r : 0; }
