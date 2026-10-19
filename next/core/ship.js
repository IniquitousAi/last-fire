// The ship (his ask, 2026-10-19: smooth, bold, hyper-futuristic, and physics that look real when you drive it). SHIP.md has the research.
// A hover ship: four corner thrusters each cast a ray to the ground and push like a damped spring (Hooke's law plus a damper on how fast
// it compresses: one small settle, never an endless bounce). Mass and drag give it inertia, so it drifts; it banks into turns and dips its
// nose when it pushes forward. Shared by the game and the robots, so the feel is measured before it is felt.
export const SHIP = {
  mass: 1, hover: 3.2, reach: 9,           // (hover: the height it rests at; reach: how far down the thrusters still feel the ground)
  k: 34, damp: 1.0, climb: 9, ceil: 80,     // (damping 1.0 = critically damped: it settles with no bounce. Was 0.4, a deliberate bob; he found it bobbing and confusing, 2026-10-19. climb: m/s the held height moves; ceil: highest hold)
  thrust: 38, lift: 22, drag: 0.35, dragQ: 0.0016, grip: 1.6,   // (grip: how fast sideways drift dies; low enough to feel the slide)
  turn: 1.5, bank: 0.38, nose: 0.12, gravity: 1.62,             // (the Moon's gravity: it is where the camp is)
  half: { x: 2.4, z: 3.6 }, top: 340,                           // (the corner thrusters' spread, and its top speed in m/s)
};
const C = SHIP, CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
export function makeShip(x, y, z, yaw = 0) { return { x, y, z, vx: 0, vy: 0, vz: 0, yaw, yawV: 0, roll: 0, pitch: 0, pilot: null }; }
// one physics step. input: { fwd -1..1, side -1..1, up -1..1, turn -1..1 }; land(x, z) is the ground height
export function flyShip(s, input, land, dt) {
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), rx = Math.cos(s.yaw), rz = -Math.sin(s.yaw);
  const crit = 2 * Math.sqrt(C.k * C.mass), cdamp = crit * C.damp;
  let ay = -C.gravity, tp = 0, tr = 0, touching = 0;
  for (const [sx, sz] of CORNERS) {   // (each thruster: a ray down from its corner, a spring and a damper)
    const cx = s.x + rx * sx * C.half.x + fx * sz * C.half.z, cz = s.z + rz * sx * C.half.x + fz * sz * C.half.z;
    const gap = s.y - land(cx, cz); if (gap > (s.ht ?? C.hover) + C.reach) continue; touching++;
    const comp = (s.ht ?? C.hover) - gap, cornerV = s.vy;   // (the corners share the body's vertical speed: pitch and roll are drawn, not simulated)
    const f = Math.max(0, C.k * comp - cdamp * cornerV) / 4; ay += f / C.mass; tp += sz * f; tr += sx * f;
  }
  s.ht = Math.max(C.hover, Math.min(C.ceil, (s.ht ?? C.hover) + (input.up || 0) * C.climb * dt));   // (altitude hold: up and down move the height it holds; let go and it stays there, like any flight game)
  // thrust along the nose and the side, then drag (linear and quadratic) and grip on the sideways slide
  const sp = Math.hypot(s.vx, s.vz), fwdV = s.vx * fx + s.vz * fz, sideV = s.vx * rx + s.vz * rz;
  let ax = fx * (input.fwd || 0) * C.thrust + rx * (input.side || 0) * C.thrust * 0.6, az = fz * (input.fwd || 0) * C.thrust + rz * (input.side || 0) * C.thrust * 0.6;
  ax -= s.vx * C.drag + s.vx * sp * C.dragQ + rx * sideV * C.grip; az -= s.vz * C.drag + s.vz * sp * C.dragQ + rz * sideV * C.grip;
  s.vx += ax * dt; s.vz += az * dt; s.vy += ay * dt; s.vy *= Math.exp(-0.25 * dt);
  const sp2 = Math.hypot(s.vx, s.vz); if (sp2 > C.top) { s.vx *= C.top / sp2; s.vz *= C.top / sp2; }
  // turning has its own inertia: the nose swings, then settles
  s.yawV += ((input.turn || 0) * C.turn - s.yawV) * Math.min(1, dt * 4); s.yaw += s.yawV * dt;
  s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
  const floor = land(s.x, s.z) + 0.6; if (s.y < floor) { s.y = floor; if (s.vy < 0) s.vy *= -0.2; }   // (the hull never goes through the ground)
  // how it looks: banks into the turn by how fast it goes, dips the nose under thrust, leans with the ground
  const wantRoll = -s.yawV * C.bank * Math.min(1, Math.abs(fwdV) / 30) + (touching ? tr * 0.002 : 0), wantPitch = -(input.fwd || 0) * C.nose + (touching ? tp * 0.002 : 0);
  s.roll += (wantRoll - s.roll) * Math.min(1, dt * 3); s.pitch += (wantPitch - s.pitch) * Math.min(1, dt * 3);
  return { speed: Math.hypot(s.vx, s.vz), height: s.y - land(s.x, s.z), touching };
}
