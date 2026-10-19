// Small details and depth up close (his words: the feeling that matters most). Things you only see when you stand right next to them, each with a
// reason in the world: worn boot paths between the places people really go, a scorch ring that grows with the fire, scratched tallies for nights survived.
// Positions come from here (seeded, no Math.random) so every client draws the same ground; client/details.js draws them.
export const SPOTS = { fire: [0, 0], gate: [0, 21], board: [5, -4], hut: [-9, 9], bunks: [Math.cos(3.98) * 11.4, Math.sin(3.98) * 11.4], store: [15.8, -2.5], bench: [Math.cos(0.56) * 15, Math.sin(0.56) * 15] };
// the paths people really walk, with why (reasons live next to the data so nothing is decoration)
export const PATHS = [
  { id: 'bunks-fire', from: 'bunks', to: 'fire', why: 'sleepers walk to the fire first thing every morning' },
  { id: 'fire-gate', from: 'fire', to: 'gate', why: 'the day crew commutes out through the gate' },
  { id: 'hut-board', from: 'hut', to: 'board', why: 'the Clerk checks the board every hour and signs for it' },
  { id: 'board-fire', from: 'board', to: 'fire', why: 'everyone who reads the odds goes to stand by the fire after' },
  { id: 'bench-store', from: 'bench', to: 'store', why: 'the bench and the store trade parts all day' },
];
export const DETAILS = {
  prints: 'boot prints along the paths people walk: the ground remembers who goes where',
  scorch: 'a scorch ring around the fire, wider at each fire level: it burned that far',
  tally: 'tally scratches on the board post, one per night survived: the Clerk scratches them',
};
export function bootPrints(seed = 11) {
  let s = seed * 2654435761 >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296), out = [];
  for (const P of PATHS) { const [ax, az] = SPOTS[P.from], [bx, bz] = SPOTS[P.to], len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az), n = Math.floor(len / 0.8);
    for (let i = 2; i < n - 2; i++) { const t = i / n, side = i % 2 ? 1 : -1, wob = Math.sin(t * 6 + P.id.length) * 0.5, off = side * 0.16 + wob + (rnd() - 0.5) * 0.25;
      out.push({ x: ax + (bx - ax) * t + Math.cos(yaw) * off, z: az + (bz - az) * t - Math.sin(yaw) * off, yaw: yaw + (rnd() - 0.5) * 0.35, side, a: 0.25 + 0.5 * rnd() * Math.sin(Math.PI * t), path: P.id }); } }
  return out;
}
export const scorchRadius = level => 3.2 + level * 2.5;   // (just inside the fire's lit circle at 9 + 2.5 m per level)
export const tallyOf = g => Math.max(0, g.night - 1);
