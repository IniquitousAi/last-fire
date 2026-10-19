// The ship, modeled in code (his words 2026-10-19: "really smooth and bold, hyper-futuristic"; the concept is shipgen ship_33):
// a stealth dropship, one lofted flying-wing surface (airfoil sections across the span, so the body melts into swept wings),
// a sculpted canopy cowl, four hover pods underneath and razor seams of light on the panel lines. About 9 m long, nose along +z,
// origin at the body's center, belly at about -0.6. Six draw calls: hull, trim, glass, magenta, violet, thrust.
import { mergeGeometries } from '../../vendor/jsm/utils/BufferGeometryUtils.js';

const TIP = 4.3;   // (half the span, meters)
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const sp = (x, k) => Math.log1p(Math.exp(k * x)) / k;   // (a soft corner: 0 before x = 0, a straight line after)
const tipR = a => ss(TIP - 0.9, TIP, a);
// the planform: a rounded nose sweeping back at about 56 degrees; the trailing edge notches in behind the body and sweeps back to the tips
const LE = a => 4.5 - 1.5 * Math.sqrt(a * a + 0.06) + 1.5 * Math.sqrt(0.06) - 0.7 * tipR(a) ** 2;
const TE = a => -4.5 + 1.15 * ss(0.15, 1.7, a) - 0.24 * sp(a - 1.7, 3) + 0.5 * tipR(a) ** 2;
// thickness as a share of the chord: a flat-topped body with a crisp shoulder (the chine at CH) that falls into thin wings, closing at the tips
const CH = 0.75, BODY = a => a < CH ? 1 - 0.08 * (a / CH) ** 2 : 0.92 * (1 - Math.min(1, (a - CH) / 0.55)) ** 2;
const TR = a => (0.055 + 0.085 * BODY(a)) * Math.sqrt(Math.max(0, 1 - (a / TIP) ** 8));
const SHARE = a => 0.56 + 0.14 * BODY(a);   // (how much of the thickness sits above the chord line)
const CAMBER = a => 0.02 - 0.07 * sp(a - 1.9, 3) ** 2;   // (the wings droop toward the tips)
const NACA = s => 0.5 * s ** 0.7 * (1 - s) / 0.316;   // (half thickness per unit: a blade-sharp leading edge, the thickest point at 41% of the chord)

// one point of the hull: x across, s along the chord (0 at the leading edge, 1 at the trailing edge), top or bottom
function hullPoint(x, s, up) {
  const a = Math.abs(x), le = LE(a), c = le - TE(a), T = 2 * NACA(s) * TR(a) * c;
  let y = CAMBER(a);
  if (up) y += T * SHARE(a) + 0.09 * Math.exp(-((x / 0.2) ** 2)) * ss(0.36, 0.52, s) * (1 - ss(0.8, 0.97, s)) * Math.min(1, T * 4);   // (the spine behind the canopy)
  else y -= T * (1 - SHARE(a));
  return [x, y, le - s * c];
}
// a point on the hull under (x, z), with its normal (for laying seams on the skin)
function onHull(x, z, up) {
  const at = (px, pz) => { const a = Math.abs(px), le = LE(a), c = le - TE(a); return hullPoint(px, Math.min(0.998, Math.max(0.002, (le - pz) / c)), up); };
  const p = at(x, z), e = 0.01, x0 = at(x - e, z), x1 = at(x + e, z), z0 = at(x, z - e), z1 = at(x, z + e);
  const tx = [x1[0] - x0[0], x1[1] - x0[1], x1[2] - x0[2]], tz = [z1[0] - z0[0], z1[1] - z0[1], z1[2] - z0[2]];
  let n = [tz[1] * tx[2] - tz[2] * tx[1], tz[2] * tx[0] - tz[0] * tx[2], tz[0] * tx[1] - tz[1] * tx[0]];
  const l = Math.hypot(...n) * (up ? 1 : -1); n = n.map(v => v / l);
  return { p, n };
}

export function buildShip(THREE) {
  const G = new THREE.Group(); G.name = 'ship';
  const geo = (pos, nrm, idx, col) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g; };
  const bare = (g, col) => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]); if (col) { const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.set(col, i * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); } return g; };

  // the hull: lofted grids, span rows by a loop that runs trailing edge, over the top, leading edge, under the belly, trailing edge;
  // three grids (wing, body, wing) so the chine stays a crisp edge where they meet
  const NC = 30, NL = 2 * NC - 1;
  const loft = xs => {
    const pos = [], idx = [];
    for (const x of xs) for (let j = 0; j < NL; j++) { const top = j < NC, t = top ? 1 - j / (NC - 1) : (j - (NC - 1)) / (NC - 1); pos.push(...hullPoint(x, (1 - Math.cos(Math.PI * t)) / 2, top)); }
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < NL - 1; j++) { const a = i * NL + j, b = a + NL; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const mid = (xs.length >> 1) * NL + (NC >> 1); if (g.attributes.normal.getY(mid) < 0) { for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]; g.setIndex(idx); g.computeVertexNormals(); }
    return g;
  };
  const span = (a, b, n) => Array.from({ length: n + 1 }, (_, k) => a + (b - a) * k / n);
  const hull = [loft(span(-CH, CH, 30)), loft(span(CH, TIP, 30)), loft(span(-TIP, -CH, 30))];
  const hullParts = [...hull], trimParts = [], glassParts = [], magenta = [], violet = [], thrust = [];

  // a ribbon laid on a surface: points with normals, a width, lifted a few millimeters off the skin
  const ribbon = (pts, w, lift = 0.007) => {
    const P = [], N = [], I = [];
    pts.forEach((q, k) => {
      const a = pts[Math.max(0, k - 1)].p, b = pts[Math.min(pts.length - 1, k + 1)].p, t = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      const n = new THREE.Vector3(...q.n), sd = new THREE.Vector3().crossVectors(t, n).normalize().multiplyScalar(w / 2), c = new THREE.Vector3(...q.p).addScaledVector(n, lift);
      P.push(c.x + sd.x, c.y + sd.y, c.z + sd.z, c.x - sd.x, c.y - sd.y, c.z - sd.z); N.push(n.x, n.y, n.z, n.x, n.y, n.z);
      if (k) { const o = 2 * k; I.push(o - 2, o - 1, o, o, o - 1, o + 1); }
    });
    const g = geo(P, N, I), nm = g.attributes.normal, ps = g.attributes.position;   // (wind the strip to face out along the skin's normal)
    const e1 = new THREE.Vector3().fromBufferAttribute(ps, 1).sub(new THREE.Vector3().fromBufferAttribute(ps, 0)), e2 = new THREE.Vector3().fromBufferAttribute(ps, 2).sub(new THREE.Vector3().fromBufferAttribute(ps, 0));
    if (e1.cross(e2).dot(new THREE.Vector3().fromBufferAttribute(nm, 0)) < 0) { for (let k = 0; k < I.length; k += 3) [I[k + 1], I[k + 2]] = [I[k + 2], I[k + 1]]; g.setIndex(I); }
    return g;
  };
  // a seam on the hull: a polyline in (x, z), densified and laid on the top or the belly, mirrored to both sides
  const seam = (list, xz, w, up = true, mirror = true) => {
    for (const m of mirror ? [1, -1] : [1]) {
      const pts = [];
      for (let k = 0; k < xz.length - 1; k++) { const [x0, z0] = xz[k], [x1, z1] = xz[k + 1], n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.06)); for (let q = 0; q < n; q++) { const t = q / n; pts.push(onHull(m * (x0 + (x1 - x0) * t), z0 + (z1 - z0) * t, up)); } }
      const [xl, zl] = xz[xz.length - 1]; pts.push(onHull(m * xl, zl, up)); list.push(ribbon(pts, w));
    }
  };
  const along = (a0, a1, f, n = 24) => Array.from({ length: n + 1 }, (_, k) => { const a = a0 + (a1 - a0) * k / n; return [a, f(a)]; });

  // light seams (razor thin): chevrons on the nose, the wing leading edges, the trailing edges, the spine flanks, the tail
  seam(magenta, [[0.16, 3.95], [0.52, 3.25]], 0.035);
  seam(magenta, [[0.34, 4.0], [0.72, 3.32]], 0.035);
  seam(magenta, [[1.0, 0.95], [1.28, 0.25]], 0.04);
  seam(magenta, [[1.36, -0.7], [1.62, -2.7]], 0.04);
  seam(violet, along(1.55, 3.75, a => LE(a) - 0.32), 0.03);
  seam(violet, along(1.95, 3.85, a => TE(a) + 0.2), 0.03);
  seam(violet, [[0.3, 0.7], [0.3, -3.3]], 0.025);
  seam(violet, along(0, 0.85, a => TE(a) + 0.07, 10), 0.045);
  seam(magenta, along(0.7, 3.4, a => LE(a) - 0.4), 0.035, false);
  // panel lines (matte graphite on the gloss): the wing fold, a chord line, a spanwise line, the body's shoulder
  seam(trimParts, [[1.75, LE(1.75) - 0.15], [1.75, TE(1.75) + 0.1]], 0.022);
  seam(trimParts, [[3.0, LE(3.0) - 0.12], [3.0, TE(3.0) + 0.1]], 0.022);
  seam(trimParts, along(1.8, 3.9, a => LE(a) - 0.62 * (LE(a) - TE(a))), 0.022);
  seam(trimParts, [[0.62, 3.0], [0.72, 0.6], [0.72, -3.0]], 0.022);
  seam(trimParts, [[0.0, -0.4], [0.62, -0.4]], 0.02);

  // the canopy: a sculpted cowl in the hull's gloss with a dark glass cap set into its front, and a frame bar across the glass
  const ZC = 2.0, at = z => hullPoint(0, (4.5 - z) / 9, true)[1], tilt = Math.atan2(at(ZC - 0.5) - at(ZC + 0.5), 1);
  const seat = g => g.rotateX(tilt).translate(0, at(ZC), ZC);   // (laid along the slope of the nose)
  hullParts.push(seat(bare(new THREE.SphereGeometry(1, 32, 14)).scale(0.56, 0.25, 1.25).translate(0, -0.1, -0.2)));
  glassParts.push(seat(bare(new THREE.SphereGeometry(1, 32, 14)).scale(0.42, 0.23, 0.82).translate(0, -0.03, 0.12)));
  { const pts = []; for (let k = 0; k <= 20; k++) { const th = Math.PI * (0.1 + 0.8 * k / 20), d = new THREE.Vector3(Math.cos(th), Math.sin(th), 0.0); const n = new THREE.Vector3(d.x / 0.42, d.y / 0.23, 0).normalize(); pts.push({ p: [d.x * 0.42, d.y * 0.23 - 0.03, 0.12], n: [n.x, n.y, n.z] }); } trimParts.push(seat(ribbon(pts, 0.045, 0.004))); }

  // four hover pods: a smooth nacelle on a neck that rises into the hull, a recessed mouth with a faint violet ring
  const pods = [[1.2, 1.3], [-1.2, 1.3], [2.4, -1.6], [-2.4, -1.6]], BOT = -0.68;
  for (const [px, pz] of pods) {
    const neck = CAMBER(Math.abs(px)) - BOT, prof = [[0, 0.1], [0.24, 0.1], [0.27, 0.05], [0.29, 0.0], [0.38, 0.0], [0.43, 0.04], [0.46, 0.12], [0.465, 0.24], [0.44, 0.33], [0.36, 0.4], [0.26, 0.45], [0.23, neck - 0.05], [0.18, neck], [0, neck]];
    const lathe = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28);
    hullParts.push(bare(lathe).scale(1, 1, 1.22).translate(px, BOT, pz));
    thrust.push(bare(new THREE.TorusGeometry(0.262, 0.016, 4, 24), [0.42, 0.32, 1.0]).rotateX(Math.PI / 2).scale(1, 1, 1.22).translate(px, BOT + 0.07, pz));
    thrust.push(bare(new THREE.CircleGeometry(0.245, 20), [0.07, 0.05, 0.22]).rotateX(Math.PI / 2).scale(1, 1, 1.22).translate(px, BOT + 0.098, pz));
  }

  // materials: deep glossy black armor reflecting a soft night sky, matte graphite trim, dark glass, and the light
  const env = nightSky(THREE);
  const hullM = new THREE.MeshPhysicalMaterial({ color: 0x0a0b10, metalness: 0.8, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, envMap: env, envMapIntensity: 1.0 });
  const trimM = new THREE.MeshStandardMaterial({ color: 0x1c1e27, metalness: 0.5, roughness: 0.6, envMap: env, envMapIntensity: 0.6 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x05060a, metalness: 0.3, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMap: env, envMapIntensity: 1.6, emissive: 0x0d0820 });
  const glow = (hex, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k) });
  const thrustM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(2.2), vertexColors: true });
  for (const [parts, mat, name] of [[hullParts, hullM, 'hull'], [trimParts, trimM, 'trim'], [glassParts, glassM, 'glass'], [magenta, glow(0xff4fd8, 2.6), 'seams-magenta'], [violet, glow(0x7b5cff, 2.6), 'seams-violet'], [thrust, thrustM, 'thrust']]) {
    const m = new THREE.Mesh(mergeGeometries(parts), mat); m.name = name; G.add(m);
  }
  return G;
}

// a tiny night sky for the gloss to reflect (the camp has no environment light): dark overhead, a faint cool band at the horizon,
// one soft streak of light above, black below. Six 32 px canvases, made once.
function nightSky(THREE) {
  const S = 32, faces = [(u, v) => [1, -v, -u], (u, v) => [-1, -v, u], (u, v) => [u, 1, v], (u, v) => [u, -1, -v], (u, v) => [u, -v, 1], (u, v) => [-u, -v, -1]];
  const imgs = faces.map(f => {
    const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), d = x.createImageData(S, S);
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const [dx, dy, dz] = f((px + 0.5) / S * 2 - 1, (py + 0.5) / S * 2 - 1), l = Math.hypot(dx, dy, dz), y = dy / l, z = dz / l;
      const band = Math.exp(-(((y - 0.04) / 0.12) ** 2)), streak = Math.exp(-(((y - 0.62) / 0.06) ** 2)) * Math.exp(-(((z - 0.2) / 0.5) ** 2));
      const k = y < -0.05 ? 0.02 : 0.06 + 0.1 * Math.max(0, y);
      const r = 255 * Math.min(1, k * 0.8 + band * 0.62 + streak * 0.95), g = 255 * Math.min(1, k * 0.85 + band * 0.66 + streak * 0.95), b = 255 * Math.min(1, k * 1.4 + band * 0.9 + streak), o = (py * S + px) * 4;
      d.data[o] = r; d.data[o + 1] = g; d.data[o + 2] = b; d.data[o + 3] = 255;
    }
    x.putImageData(d, 0, 0); return c;
  });
  const t = new THREE.CubeTexture(imgs); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
}
