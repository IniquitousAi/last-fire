// node next/sim/enemies.mjs: the body test for the Hollow (the rework of 2026-10-19: "the enemies make no sense ... pathing and alignment don't
// make sense with the physics"). Robots run the core headless for long stretches on Earth and on the Moon and measure what a body must obey:
//   1. no enemy ever stands inside a wall or tower (Earth) or a camp piece (Moon)
//   2. no enemy turns faster than its kind's limit; none gains speed faster than its limit (or stops, faster than twice that)
//   3. nobody floats: y equals the ground under it, every step
//   4. ground speed never passes the kind's speed (stagger shoves aside), and no step teleports
//   5. across the wall: a hunter outside the wall that wants a player inside gets in through a gate, never through the wall
import { newGame, addPlayer, step, drop, fired, heightAt, KINDS, MOVE, TOWERS, EARTH, WALLS, PAD, solidAt, setOccluders, damage, onEarth, MAX_HOLLOW } from '../core/game.js';

const out = []; const check = (name, pass, saw) => { out.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (${saw})`); };
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const dt = 1 / 30;

function watch(g, S) {   // (called after every step: measures each live enemy against its previous state)
  for (const k of g.hollow) {
    if (k.dead || k.kind === 'shard') continue; const M = MOVE[k.kind], K = KINDS[k.kind], p = S.prev.get(k.id);
    S.n++;
    if (solidAt(k.x, k.z, M.rad * 0.8)) { S.inWall++; if (S.inWall < 4) console.log('  in wall', k.kind, k.x.toFixed(1), k.z.toFixed(1)); }
    if (Math.abs(k.y - heightAt(g.land, k.x, k.z)) > 0.02) S.float++;
    if (p) {
      const turn = Math.abs(angDiff(p.yaw, k.yaw)) / dt; S.maxTurn[k.kind] = Math.max(S.maxTurn[k.kind] || 0, turn); if (turn > M.turn * 1.02 + 0.01) S.badTurn++;
      const v = Math.hypot(k.x - p.x, k.z - p.z) / dt; S.maxV[k.kind] = Math.max(S.maxV[k.kind] || 0, v); (S.vs[k.kind] = S.vs[k.kind] || []).push(v / k.speed); if (v * dt > 0.5) S.fast++;   /* (a step over half a metre is a teleport) */
      const sp = k.sp || 0, a = (sp - p.sp) / dt; if (!(k.rt > 0) && !k.still && !p.still && (a > M.acc * 1.05 + 0.5 || a < -M.acc * 2.05 - 0.5)) S.badAcc++;   // (a stagger shoves the body: that jump is the hit, not the legs)
    }
    S.prev.set(k.id, { x: k.x, z: k.z, yaw: k.yaw, sp: k.sp || 0, still: k.still });
  }
}
const fresh = () => ({ n: 0, inWall: 0, float: 0, badTurn: 0, fast: 0, badAcc: 0, maxTurn: {}, maxV: {}, vs: {}, prev: new Map() });
const report = (tag, S) => {
  check(`${tag}: nobody inside a wall or tower`, S.inWall === 0, `${S.inWall} of ${S.n} enemy-steps`);
  check(`${tag}: turn rate within each kind's limit`, S.badTurn === 0, Object.entries(S.maxTurn).map(([k, v]) => `${k} ${v.toFixed(1)}/${MOVE[k].turn}`).join(', ') + ' rad/s');
  check(`${tag}: nobody floats or sinks`, S.float === 0, `${S.float} bad steps`);
  const p99 = Object.entries(S.vs).map(([k, a]) => { a.sort((x, y) => x - y); return [k, a[Math.floor(a.length * 0.99)]]; });
  check(`${tag}: ground speed sane, no teleports`, S.fast === 0 && p99.every(([, r]) => r < 1.15), p99.map(([k, r]) => `${k} p99 ${r.toFixed(2)}x its speed`).join(', ') + `, ${S.fast} jumps`);
  check(`${tag}: acceleration within limits`, S.badAcc === 0, `${S.badAcc} bad steps`);
};

// ---- Earth: a player in the middle of the yard, then another outside the wall, the hunt has to use the gates
{
  const g = newGame(7); const p = addPlayer(g, 1, 'T'); p.x = PAD.x; p.z = PAD.z; p.carried = 40; p.torch = true;   /* (a lit torch: seen from 30 m, so the hunt is on) */ g.fire.fuel = 9999;
  check('Earth: the drop works', drop(g, p), 'on the pad'); const S = fresh(); let through = 0, crossed = 0, maxHollow = 0;
  const route = [[EARTH.x, EARTH.z], [EARTH.x + 90, EARTH.z + 10], [EARTH.x + 10, EARTH.z + 95], [EARTH.x, EARTH.z], [EARTH.x - 100, EARTH.z], [EARTH.x + 8, EARTH.z - 30]];
  let leg = 0, legT = 0;
  for (let i = 0; i < 30 * 600; i++) {
    g.earth.t = 150; p.hp = 100;   // (the lander never leaves in this test; the player cannot die)
    legT += dt; if (legT > 60) { legT = 0; leg = (leg + 1) % route.length; } const [tx, tz] = route[leg]; p.x = tx; p.z = tz; p.y = heightAt(g.land, p.x, p.z);   // (he waits at each stop for a minute: the dark must come to him)
    if (i % 60 === 0) fired(g, p, p.x, p.z, 0, 1, 'ar');   // (a shot every two seconds: they hear it and come)
    const before = new Map(g.hollow.map(k => [k.id, inside(k)])); step(g, dt); watch(g, S); maxHollow = Math.max(maxHollow, g.hollow.length);
    for (const k of g.hollow) { const b = before.get(k.id); if (b !== undefined && b !== inside(k)) { crossed++; if (!nearGate(k)) through++; } }
  }
  report('Earth, 10 min', S);
  check('Earth: the wall is only ever crossed at a gate', through === 0, `${crossed} crossings, ${through} away from a gate`);
  check('Earth: enough of them to mean something', S.n > 4000, `${S.n} enemy-steps, up to ${maxHollow} at once (cap ${MAX_HOLLOW})`);
}
function inside(k) { return Math.abs(k.x - EARTH.x) < WALLS.half && Math.abs(k.z - EARTH.z) < WALLS.half; }
function nearGate(k) { const A = WALLS.half, G = WALLS.gate / 2 + 1.5; return [[0, A], [0, -A], [A, 0], [-A, 0]].some(([x, z]) => Math.abs(k.x - EARTH.x - x) < (x ? 6 : G) && Math.abs(k.z - EARTH.z - z) < (z ? 6 : G)); }

// ---- the Moon: night after night at the fire, with a camp piece or two standing in the way
{
  const g = newGame(11); setOccluders([{ x: 14, z: 6, w: 4, d: 1.2, ry: 0.4 }, { x: -12, z: 10, w: 1.2, d: 6, ry: 0 }, { x: 4, z: -16, w: 6, d: 1.2, ry: 1.1 }]);
  const p = addPlayer(g, 1, 'T'); g.fire.level = 3; g.fire.fuel = 9999; const S = fresh();
  for (let i = 0; i < 30 * 900; i++) { p.hp = 100; p.x = 3 + Math.sin(i / 200) * 4; p.z = Math.cos(i / 170) * 4; p.y = heightAt(g.land, p.x, p.z); step(g, dt); watch(g, S); }
  report('Moon, 15 min', S); check('Moon: enough of them to mean something', S.n > 1500, `${S.n} enemy-steps`);
  setOccluders([]);
}

// ---- hit reactions are physical: a heavy hit shoves the body back, the flinch lasts, nothing slides forever
{
  const g = newGame(5); const p = addPlayer(g, 1, 'T'); g.fire.fuel = 9999; g.clock = 0.8; p.x = 0; p.z = 0;
  const k = { id: 99, kind: 'walker', x: 6, z: 0, y: 0, yaw: -Math.PI / 2, hd: -Math.PI / 2, hp: 120, max: 120, sh: 0, sb: 0, cd: 0, dead: false, speed: 2.4 }; g.hollow.push(k);
  for (let i = 0; i < 20; i++) step(g, dt); const x0 = k.x; damage(g, k, 1, 100, 0, 1); let back = 0; for (let i = 0; i < 20; i++) { step(g, dt); back = Math.max(back, k.x - x0); }
  check('a heavy hit shoves the body back', back > 0.1 && (k.rt > 0 || k.dead), `pushed back ${back.toFixed(2)} m, reaction ${k.r || 0}`);
}
const bad = out.filter(x => !x).length; console.log(`\n${out.length - bad} of ${out.length} pass`); process.exit(bad ? 1 : 0);
