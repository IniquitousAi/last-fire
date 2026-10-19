// The truck, modeled in code the way the ship is (shipmodel.js): a scavenged all-terrain hauler, rebuilt at the bay from parts found on Earth.
// Each part is a few smooth generated surfaces (lofted bodies with rolled edges, rounded slabs, lathed wheels), clean on its own; the truck
// reads as rebuilt because the finishes do not match (a gloss black cab and hood, a matte graphite bed, fenders and chassis).
// Five materials: gloss, matte, rubber, dark glass, and the light (magenta and violet seams, white headlights, red tail and danger lights,
// one vertex-colored material). Whatever is fitted is merged by material, so a whole truck is five draw calls.
// Truck space: ground at y = 0, the nose along +z, the middle of the wheelbase at the origin; about 4.4 m long, 2.6 m wide over the wheels.
import { mergeGeometries } from '../../vendor/jsm/utils/BufferGeometryUtils.js';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const se = (c, n) => Math.sign(c) * Math.abs(c) ** (2 / n);   // (a superellipse coordinate: n = 2 is a circle, higher is a softened box)
const W = { r: 0.52, x: 1.1, z: 1.42 };   // (the wheels: radius, track and wheelbase halves)
export const TRUCK_PARTS = { frame: 1, axle: 2, engine: 1, wheel: 4, battery: 1, cab: 1 };   // (how many of each the model draws)
const MAG = 0xff4fd8, VIO = 0x7b5cff, RED = 0xff1238, LAMP = 0xf4f2ff, BUCKETS = ['gloss', 'matte', 'rubber', 'glass', 'light'];

let K = null;
function kit(THREE) {
  if (K) return K;
  const V = (...a) => new THREE.Vector3(...a);
  const geo = (pos, nrm, idx) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setIndex(idx); return g; };
  const bare = g => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]); return g; };
  const paint = (g, hex, k = 1) => { const c = new THREE.Color(hex).multiplyScalar(k), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  // wind every triangle to face the way its vertex normals point (so normals are the one truth about which side is out)
  const orient = g => {
    const I = g.index.array, p = g.attributes.position, n = g.attributes.normal, a = V(), b = V(), c = V(), m = V();
    for (let k = 0; k < I.length; k += 3) {
      a.fromBufferAttribute(p, I[k]); b.fromBufferAttribute(p, I[k + 1]).sub(a); c.fromBufferAttribute(p, I[k + 2]).sub(a);
      m.fromBufferAttribute(n, I[k]).add(V().fromBufferAttribute(n, I[k + 1])).add(V().fromBufferAttribute(n, I[k + 2]));
      if (b.cross(c).dot(m) < 0) { const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; }
    }
    g.index.needsUpdate = true; return g;
  };
  // a rounded slab: a box whose edges roll over at radius r (k steps per quarter turn), centered at the origin
  const rbox = (w, h, d, r, k = 2) => {
    const H = [w / 2, h / 2, d / 2]; r = Math.min(r, ...H); const S = 2 * k + 1, inner = H.map(v => v - r);
    const g = bare(new THREE.BoxGeometry(w, h, d, S, S, S)), p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const v = [p.getX(i), p.getY(i), p.getZ(i)].map((u, a) => { const q = Math.round((u + H[a]) / (2 * H[a]) * S); return q <= k ? -H[a] + r * q / k : H[a] - r * (S - q) / k; });
      const q = v.map((u, a) => Math.max(-inner[a], Math.min(inner[a], u))), d3 = V(v[0] - q[0], v[1] - q[1], v[2] - q[2]).normalize();
      p.setXYZ(i, q[0] + d3.x * r, q[1] + d3.y * r, q[2] + d3.z * r); n.setXYZ(i, d3.x, d3.y, d3.z);
    }
    return g;
  };
  // a lathe whose normals face out (checked at its widest point), then wound to match
  const lathe = (prof, seg) => {
    const g = bare(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg)), p = g.attributes.position, n = g.attributes.normal;
    let w = 0; for (let i = 1; i < p.count; i++) if (p.getX(i) ** 2 + p.getZ(i) ** 2 > p.getX(w) ** 2 + p.getZ(w) ** 2) w = i;
    if (n.getX(w) * p.getX(w) + n.getZ(w) * p.getZ(w) < 0) for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    return orient(g);
  };
  // a sweep: a superellipse section {a across, b up, c lift, n} carried along a path; the ends roll over at radius e into flat caps.
  // Returns the surface and at(t, f), a point on it with its normal, for laying seams.
  const sweep = ({ path, sec, side = [1, 0, 0], N = 24, M = 40, e = 0, R = 5, cap = true }) => {
    const sd = V(...side), Q = 96, cum = [0];
    for (let k = 1; k <= Q; k++) cum.push(cum[k - 1] + V(...path(k / Q)).distanceTo(V(...path((k - 1) / Q))));
    const L = cum[Q], tOf = d => { let k = 1; while (k < Q && cum[k] < d) k++; return (k - 1 + (d - cum[k - 1]) / Math.max(1e-9, cum[k] - cum[k - 1])) / Q; };
    const lenAt = t => { const x = t * Q, k = Math.min(Q - 1, Math.floor(x)); return cum[k] + (cum[k + 1] - cum[k]) * (x - k); };
    const frame = t => { const T = V(...path(Math.min(1, t + 1e-3))).sub(V(...path(Math.max(0, t - 1e-3)))).normalize(), up = V().crossVectors(T, sd).normalize(); return { T, up, sx: V().crossVectors(up, T) }; };
    const mid = t => V(...path(t)).addScaledVector(frame(t).up, sec(t).c || 0);
    const P = (t, f) => {
      const s = sec(t), d = Math.min(lenAt(t), L - lenAt(t)), k = e && d < e ? e * (1 - Math.sqrt(Math.max(0, 1 - (1 - d / e) ** 2))) : 0, { up, sx } = frame(t);
      return mid(t).addScaledVector(sx, (s.a - k) * se(Math.cos(f), s.n)).addScaledVector(up, (s.b - k) * se(Math.sin(f), s.n));
    };
    let sign = 1;
    const nrm = (t, f) => { const a = P(Math.min(1, t + 1e-4), f).sub(P(Math.max(0, t - 1e-4), f)), b = P(t, f + 1e-3).sub(P(t, f - 1e-3)); return V().crossVectors(a, b).normalize().multiplyScalar(sign); };
    sign = nrm(0.5, 0.4).dot(P(0.5, 0.4).sub(mid(0.5))) < 0 ? -1 : 1;
    const ts = [];
    if (e > 0) {   /* (rings crowd the rolled ends: even steps around each quarter circle, even steps between) */
      for (let j = 0; j < R; j++) ts.push(tOf(e * (1 - Math.cos(Math.PI / 2 * j / R))));
      for (let j = 0; j <= N; j++) ts.push(tOf(e + (L - 2 * e) * j / N));
      for (let j = R - 1; j >= 0; j--) ts.push(tOf(L - e * (1 - Math.cos(Math.PI / 2 * j / R))));
    } else for (let j = 0; j <= N; j++) ts.push(j / N);
    const pos = [], nor = [], idx = [], fs = Array.from({ length: M + 1 }, (_, j) => 2 * Math.PI * j / M);
    for (const t of ts) for (const f of fs) { const p = P(t, f), n = nrm(t, f); pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); }
    for (let i = 0; i < ts.length - 1; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    if (cap) for (const [t, s] of [[0, -1], [1, 1]]) {
      const T = frame(t).T.multiplyScalar(s), c = mid(t), o = pos.length / 3; pos.push(c.x, c.y, c.z); nor.push(T.x, T.y, T.z);
      for (const f of fs) { const p = P(t, f); pos.push(p.x, p.y, p.z); nor.push(T.x, T.y, T.z); }
      for (let j = 0; j < M; j++) idx.push(o, o + 1 + j, o + 2 + j);
    }
    return { g: orient(geo(pos, nor, idx)), at: (t, f, lift = 0.005) => { const n = nrm(t, f); return { p: P(t, f).addScaledVector(n, lift).toArray(), n: n.toArray() }; } };
  };
  // a ribbon laid on a surface (points with normals): the seams of light, and the matte panel lines
  const ribbon = (pts, w, hex, k = 1) => {
    const P = [], N = [], I = [];
    pts.forEach((q, j) => {
      const a = pts[Math.max(0, j - 1)].p, b = pts[Math.min(pts.length - 1, j + 1)].p, t = V(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      const n = V(...q.n), sd = V().crossVectors(t, n).normalize().multiplyScalar(w / 2), c = V(...q.p);
      P.push(c.x + sd.x, c.y + sd.y, c.z + sd.z, c.x - sd.x, c.y - sd.y, c.z - sd.z); N.push(n.x, n.y, n.z, n.x, n.y, n.z);
      if (j) { const o = 2 * j; I.push(o - 2, o - 1, o, o, o - 1, o + 1); }
    });
    const g = orient(geo(P, N, I)); return hex === undefined ? g : paint(g, hex, k);
  };
  const curve = (sw, n, fn) => Array.from({ length: n + 1 }, (_, j) => sw.at(...fn(j / n)));
  const line = (a, b, n, w, hex) => ribbon([a, b].map(p => ({ p: p.map((v, i) => v + n[i] * 0.004), n })), w, hex);
  const cyl = (r0, r1, h, seg) => bare(new THREE.CylinderGeometry(r0, r1, h, seg));
  const ring = (r, tube, seg, hex, k) => paint(bare(new THREE.TorusGeometry(r, tube, 4, seg)).rotateX(Math.PI / 2), hex, k);   // (lying flat, around y)
  const B = () => ({ gloss: [], matte: [], rubber: [], glass: [], light: [] });

  // the wheel, built once: a lathed off-road tire (rolled shoulders, two grooves), a dished rim with a magenta ring, axis along +x
  const TIRE = [[0.34, -0.17], [0.4, -0.19], [0.46, -0.2], [0.495, -0.195], [0.515, -0.175], [0.52, -0.14], [0.522, -0.1], [0.505, -0.088], [0.505, -0.062], [0.522, -0.05], [0.525, 0], [0.522, 0.05], [0.505, 0.062], [0.505, 0.088], [0.522, 0.1], [0.52, 0.14], [0.515, 0.175], [0.495, 0.195], [0.46, 0.2], [0.4, 0.19], [0.34, 0.17]];
  const RIM = [[0.335, -0.17], [0.335, 0.12], [0.345, 0.15], [0.33, 0.168], [0.29, 0.135], [0.2, 0.105], [0.13, 0.11], [0.1, 0.16], [0.06, 0.18], [0, 0.185]];
  const toX = g => g.rotateZ(-Math.PI / 2);
  const WHEEL = { rubber: toX(lathe(TIRE, 30)), matte: toX(lathe(RIM, 30)), light: toX(ring(0.3, 0.007, 30, MAG).translate(0, 0.152, 0)) };

  const PART = {
    // the chassis: two rails, four crossmembers, a skid plate under the nose and a hitch; a violet seam on each rail (the builder's color)
    frame() {
      const o = B();
      for (const s of [-1, 1]) { o.matte.push(rbox(0.14, 0.2, 4.1, 0.045, 1).translate(0.5 * s, 0.72, -0.05)); o.light.push(line([0.57 * s, 0.72, -1.85], [0.57 * s, 0.72, 1.75], [s, 0, 0], 0.02, VIO)); }
      for (const z of [-1.95, -0.7, 0.5, 1.9]) o.matte.push(rbox(1.0, 0.12, 0.14, 0.035, 1).translate(0, 0.7, z));
      o.matte.push(rbox(1.24, 0.06, 0.55, 0.03, 2).rotateX(-0.32).translate(0, 0.6, 2.08), rbox(0.22, 0.12, 0.3, 0.04, 1).translate(0, 0.66, -2.22));
      return o;
    },
    // an axle (rear first): the tube, the differential, two dampers with violet collars, two links to the frame, the hubs
    axle(i) {
      const o = B(), z = i ? W.z : -W.z, y = W.r;
      o.matte.push(cyl(0.06, 0.06, 1.84, 14).rotateZ(Math.PI / 2).translate(0, y, z), bare(new THREE.SphereGeometry(0.17, 18, 12)).scale(1, 0.85, 1.1).translate(0, y, z));
      for (const s of [-1, 1]) {
        o.gloss.push(cyl(0.055, 0.055, 0.2, 14).translate(0.66 * s, y + 0.14, z));
        o.matte.push(cyl(0.024, 0.024, 0.42, 8).translate(0.66 * s, y + 0.2, z), rbox(0.08, 0.06, 0.72, 0.025, 1).translate(0.36 * s, y + 0.04, z - Math.sign(z) * 0.38), cyl(0.1, 0.12, 0.08, 16).rotateZ(-Math.PI / 2 * s).translate(0.92 * s, y, z));
        o.light.push(ring(0.058, 0.007, 20, VIO).translate(0.66 * s, y + 0.25, z));
      }
      return o;
    },
    // a wheel (rear left, rear right, front left, front right)
    wheel(i) {
      const o = B(), s = i % 2 ? 1 : -1, z = i < 2 ? -W.z : W.z;
      for (const k of ['rubber', 'matte', 'light']) { const g = WHEEL[k].clone(); if (s < 0) g.rotateY(Math.PI); o[k].push(g.translate(s * W.x, W.r, z)); }
      return o;
    },
    // the engine: a matte block, and a gloss spine on top with two magenta seams (it rises through the hood once the cab is on)
    engine() {
      const o = B(), sp = sweep({ path: t => [0, 1.29, 0.98 + t], sec: () => ({ a: 0.17, b: 0.12, n: 4 }), N: 12, M: 28, e: 0.07, R: 4 });
      o.matte.push(rbox(0.66, 0.4, 0.82, 0.07, 2).translate(0, 1.03, 1.44)); o.gloss.push(sp.g);
      for (const f of [Math.PI / 2 - 0.62, Math.PI / 2 + 0.62]) o.light.push(ribbon(curve(sp, 16, u => [0.1 + 0.8 * u, f]), 0.018, MAG));
      for (const s of [-1, 1]) o.light.push(line([0.33 * s, 1.03, 1.12], [0.33 * s, 1.03, 1.76], [s, 0, 0], 0.02, VIO));
      return o;
    },
    // the battery: a saddle pack hung on the right side between the wheels, one magenta seam
    battery() {
      const o = B(), sp = sweep({ path: t => [0.99, 0.66, -0.62 + 1.24 * t], sec: () => ({ a: 0.1, b: 0.15, n: 6 }), N: 8, M: 20, e: 0.05, R: 3 });
      o.gloss.push(sp.g); o.light.push(ribbon(curve(sp, 12, u => [0.08 + 0.84 * u, 0]), 0.02, MAG));
      for (const z of [-0.4, 0.4]) o.matte.push(rbox(0.16, 0.07, 0.1, 0.02, 1).translate(0.86, 0.78, z));
      return o;
    },
    // the cab, which is the whole body: the lower hull from the cab's back wall to the nose (the hood falls away from the cowl),
    // the glass house and its roof, the fenders, the bed with its gun, the lamps
    cab() {
      const o = B(), Z0 = -0.86, Z1 = 2.12, bot = 0.84, top = z => 1.32 + 0.18 * (1 - ss(0.75, 1.15, z)), tz = z => (z - Z0) / (Z1 - Z0);
      const body = sweep({ path: t => [0, 0, Z0 + (Z1 - Z0) * t], sec: t => { const z = Z0 + (Z1 - Z0) * t, tp = top(z); return { a: 0.86 - 0.04 * ss(1.5, 2.12, z), b: (tp - bot) / 2, c: (tp + bot) / 2, n: 7 }; }, N: 24, M: 40, e: 0.08, R: 5 });
      o.gloss.push(body.g);
      for (const s of [-1, 1]) {
        const f = s > 0 ? 0.42 : Math.PI - 0.42;
        o.light.push(ribbon(curve(body, 40, u => [tz(-0.7) + (tz(1.95) - tz(-0.7)) * u, f]), 0.02, MAG));   // (the beltline, falling with the hood)
        o.matte.push(ribbon(curve(body, 8, u => [tz(0.62), s > 0 ? -0.75 + 1.05 * u : Math.PI + 0.75 - 1.05 * u]), 0.014));   // (the door's front edge)
      }
      // the glass house: a section in plan carried upward, its front raked back like a windshield; pillars as matte ribbons; then the roof
      const gh = sweep({ path: t => [0, 1.49 + 0.44 * t, 0], side: [1, 0, 0], sec: t => ({ a: 0.82 - 0.1 * t, b: 0.78 - 0.3 * t, c: 0.06 + 0.22 * t, n: 5 }), N: 8, M: 48, cap: false });
      o.glass.push(gh.g);
      for (const f of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75, 0, Math.PI]) o.matte.push(ribbon(curve(gh, 6, u => [u, f]), f % (Math.PI / 2) ? 0.06 : 0.04));
      const roof = sweep({ path: t => [0, 1.915 + 0.1 * t, 0], sec: () => ({ a: 0.75, b: 0.53, c: 0.28, n: 5 }), N: 2, M: 48, e: 0.04, R: 4 });
      o.gloss.push(roof.g); o.light.push(ribbon(curve(roof, 48, u => [0.5, 2 * Math.PI * u]), 0.012, VIO));
      o.matte.push(cyl(0.07, 0.09, 0.08, 16).translate(0, 2.05, 0));   // (the roof lamp's mount: the lamp itself turns with whoever aims it)
      // the nose: two white headlight bars (where the beams start) and a violet slit between them
      for (const s of [-1, 1]) o.light.push(paint(rbox(0.3, 0.045, 0.03, 0.012, 1).translate(0.55 * s, 1.02, 2.115), LAMP));
      o.light.push(line([-0.3, 1.16, 2.12], [0.3, 1.16, 2.12], [0, 0, 1], 0.014, VIO));
      // the fenders: flat arcs over each wheel, flared out past the body
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) o.matte.push(sweep({ path: t => { const th = 0.35 + (Math.PI - 0.7) * t; return [sx * 1.08, W.r + 0.72 * Math.sin(th), sz * W.z + 0.72 * Math.cos(th)]; }, sec: () => ({ a: 0.22, b: 0.04, n: 4 }), N: 14, M: 16, e: 0.035, R: 3 }).g);
      // the bed: floor, two walls with violet seams on top, the tailgate with two red tail lights
      o.matte.push(rbox(1.68, 0.08, 1.34, 0.03, 1).translate(0, 0.88, -1.52), rbox(1.68, 0.52, 0.08, 0.035, 2).translate(0, 1.14, -2.15));
      for (const s of [-1, 1]) {
        o.matte.push(rbox(0.08, 0.52, 1.34, 0.035, 2).translate(0.8 * s, 1.14, -1.52));
        o.light.push(line([0.8 * s, 1.4, -2.1], [0.8 * s, 1.4, -0.95], [0, 1, 0], 0.018, VIO), paint(rbox(0.05, 0.28, 0.02, 0.01, 1).translate(0.7 * s, 1.17, -2.195), RED, 0.5));
      }
      // the mounted gun, worked from the back seats: a lathed pedestal, a gloss housing with magenta seams, the barrel over the cab, a red muzzle ring
      o.matte.push(lathe([[0, 0.92], [0.2, 0.92], [0.2, 0.96], [0.09, 1.02], [0.07, 1.1], [0.07, 1.86], [0.12, 1.9], [0.12, 1.95], [0, 1.95]], 20).translate(0, 0, -1.45));
      const gun = sweep({ path: t => [0, 2.08, -1.78 + 0.72 * t], sec: () => ({ a: 0.12, b: 0.1, n: 4 }), N: 10, M: 24, e: 0.04, R: 3 });
      o.gloss.push(gun.g);
      o.matte.push(rbox(0.06, 0.16, 0.12, 0.02, 1).translate(0, 1.99, -1.45), cyl(0.032, 0.032, 0.66, 12).rotateX(Math.PI / 2).translate(0, 2.1, -0.75), cyl(0.045, 0.045, 0.1, 12).rotateX(Math.PI / 2).translate(0, 2.1, -0.47));
      for (const f of [0.5, Math.PI - 0.5]) o.light.push(ribbon(curve(gun, 12, u => [0.12 + 0.76 * u, f]), 0.014, MAG));
      o.light.push(ring(0.047, 0.006, 16, RED, 0.5).rotateX(Math.PI / 2).translate(0, 2.1, -0.418));
      return o;
    },
  };
  const cache = new Map(), piece = (kind, i) => { const key = kind + i; if (!cache.has(key)) cache.set(key, PART[kind](i)); return cache.get(key); };

  // materials: gloss black armor reflecting a soft night sky, matte graphite, rubber, dark glass, and the light; dead ones are char
  const env = nightSky(THREE);
  const M = {
    gloss: new THREE.MeshPhysicalMaterial({ color: 0x0b0c11, metalness: 0.75, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, envMap: env, envMapIntensity: 1.0 }),
    matte: new THREE.MeshStandardMaterial({ color: 0x1a1c23, metalness: 0.45, roughness: 0.62, envMap: env, envMapIntensity: 0.55 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0d0e11, metalness: 0, roughness: 0.92, envMap: env, envMapIntensity: 0.25 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x05060a, metalness: 0.3, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMap: env, envMapIntensity: 1.6, emissive: 0x0d0820 }),
    light: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(2.6), vertexColors: true }),
    char: new THREE.MeshStandardMaterial({ color: 0x121214, metalness: 0.2, roughness: 0.95 }),
  };
  // merge what is listed, by material, into one group (dead: char and rubber only, no light)
  const group = (all, dead, name) => {
    const G = new THREE.Group(); G.name = name;
    const sets = dead ? [['char', [...all.gloss, ...all.matte, ...all.glass]], ['rubber', all.rubber]] : BUCKETS.map(b => [b, all[b]]);
    for (const [m, list] of sets) if (list.length) { const mesh = new THREE.Mesh(mergeGeometries(list), dead && m === 'rubber' ? M.char : M[m]); mesh.name = name + '-' + m; G.add(mesh); }
    return G;
  };
  const collect = list => { const all = B(); for (const [kind, i] of list) { const p = piece(kind, i); for (const b of BUCKETS) all[b].push(...p[b]); } return all; };
  // the roof lamp (it turns on its own): a lathed matte housing, a white lens facing -z, a violet collar
  const roofLamp = () => {
    const all = B();
    all.matte.push(lathe([[0, 0.2], [0.13, 0.2], [0.2, 0.17], [0.235, 0.08], [0.255, -0.1], [0.262, -0.17], [0.25, -0.2], [0.21, -0.2], [0.205, -0.185]], 28).rotateX(Math.PI / 2));
    all.light.push(paint(bare(new THREE.CircleGeometry(0.205, 24)).rotateY(Math.PI).translate(0, 0, -0.186), LAMP), ring(0.243, 0.006, 28, VIO).translate(0, 0.02, 0).rotateX(Math.PI / 2));
    return group(all, false, 'roof-lamp');
  };
  return (K = { piece, collect, group, roofLamp });
}

// the truck with what is fitted ({ frame: 1, axle: 2, ... }), merged fresh: the caller owns (and disposes) its geometry
export function buildTruck(THREE, fitted = {}, { dead = false } = {}) {
  const k = kit(THREE), list = [];
  for (const kind of Object.keys(TRUCK_PARTS)) for (let i = 0; i < Math.min(fitted[kind] || 0, TRUCK_PARTS[kind]); i++) list.push([kind, i]);
  return k.group(k.collect(list), dead, 'truck');
}
// one part on its own, centered on its middle (a part lying out on Earth)
export function buildPart(THREE, kind, { dead = false } = {}) {
  const k = kit(THREE), G = k.group(k.collect([[kind, 0]]), dead, 'part-' + kind), c = new THREE.Box3().setFromObject(G).getCenter(new THREE.Vector3());
  for (const m of G.children) m.geometry.translate(-c.x, -c.y, -c.z);
  return G;
}
export function buildRoofLamp(THREE) { return kit(THREE).roofLamp(); }

// a tiny night sky for the gloss to reflect (the camp has no environment light): dark overhead, a faint lavender band at the horizon,
// one soft streak of light above, black below. Six 32 px canvases, made once.
function nightSky(THREE) {
  const S = 32, faces = [(u, v) => [1, -v, -u], (u, v) => [-1, -v, u], (u, v) => [u, 1, v], (u, v) => [u, -1, -v], (u, v) => [u, -v, 1], (u, v) => [-u, -v, -1]];
  const imgs = faces.map(f => {
    const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), d = x.createImageData(S, S);
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const [dx, dy, dz] = f((px + 0.5) / S * 2 - 1, (py + 0.5) / S * 2 - 1), l = Math.hypot(dx, dy, dz), y = dy / l, z = dz / l;
      const band = Math.exp(-(((y - 0.04) / 0.12) ** 2)), streak = Math.exp(-(((y - 0.6) / 0.07) ** 2)) * Math.exp(-(((z - 0.3) / 0.5) ** 2));
      const k = y < -0.05 ? 0.02 : 0.06 + 0.1 * Math.max(0, y), o = (py * S + px) * 4;
      d.data[o] = 255 * Math.min(1, k * 0.85 + band * 0.62 + streak * 0.95); d.data[o + 1] = 255 * Math.min(1, k * 0.8 + band * 0.58 + streak * 0.92); d.data[o + 2] = 255 * Math.min(1, k * 1.4 + band * 0.88 + streak); d.data[o + 3] = 255;
    }
    x.putImageData(d, 0, 0); return c;
  });
  const t = new THREE.CubeTexture(imgs); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
}
