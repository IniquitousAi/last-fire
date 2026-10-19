// Last Fire: the arms you see. Two first-person arms in the held-gun space (the camera space the gun models live in), holding
// whatever gun is up, and the reload as a real hand motion: off the foregrip, mag out (it falls and fades), to the belt, a new
// mag in with a firm seat, then the charge (rack the slide, pull the handle, work the pump) and back to the foregrip.
// Look: minimalist futurism (his rule, 2026-10-19): a smooth matte sleeve, one armored cuff, one thin violet seam, a clean glove.
// Cost: one skinned mesh per material (3 draw calls for both arms), about 5.6k triangles, one shared skeleton of 36 bones.
// The gun is never moved while aiming (ads past 0.5): only the hands do. Hip sway and walk bob fade out on the way into the sights.
import { mergeGeometries } from '../../vendor/jsm/utils/BufferGeometryUtils.js';

const UPPER = 0.36, FORE = 0.40;   /* (arm bone lengths, a little long: the guns sit forward of a real shoulder, and the shoulders never show) */
const SLEEVE = 0x0c0d12, ARMOR = 0x191a21, GLOVE = 0x111217, PLATE = 0x1c1d24, SEAM = 0x7b5cff;
const FINGERS = [   /* (right hand, knuckle row along x: index on -x next to the thumb; segment lengths and radius, gloved) */
  { x: -0.0285, l: [0.044, 0.027, 0.022], r: 0.0102 },
  { x: -0.0095, l: [0.048, 0.030, 0.023], r: 0.0106 },
  { x: 0.0095, l: [0.045, 0.028, 0.022], r: 0.0101 },
  { x: 0.0278, l: [0.036, 0.022, 0.019], r: 0.0091 }];
const THUMB = { l: [0.040, 0.031, 0.025], r: [0.0115, 0.0104, 0.0097] };
const NB = 18;   /* (bones per arm: upper, fore, hand, 4 fingers x 3, thumb x 3) */
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
const EASE = { io: smoother, in: t => t * t * t, out: t => 1 - Math.pow(1 - t, 3) };
const sat = t => Math.max(0, Math.min(1, t));

// where the hands sit on each gun: fractions of the gun's box (y 0 bottom .. 1 top, z 0 muzzle .. 1 stock), measured on the CC0
// models in assets/m. rake: how far the pistol grip leans back. mag / slide / pump: the box (fractions) whose triangles become a
// part the hands can move (the real magazine, slide or pump of that model, cut out of it once).
const SPOTS = {
  pistol: { grip: [0.32, 0.85], rake: 0.24, support: [0.2, 0.80], mag: { y: [-1, 0.085], z: [0.68, 2] }, slide: { y: [0.71, 2], z: [-1, 2] }, kind: 'pistol' },
  ar: { grip: [0.37, 0.735], rake: 0.36, fore: [0.66, 0.33], mag: { y: [-1, 0.48], z: [0.45, 0.59] }, kind: 'mag' },
  lmg: { grip: [0.41, 0.70], rake: 0.36, fore: [0.71, 0.29], mag: { y: [-1, 0.5], z: [0.39, 0.515] }, kind: 'mag' },
  shotgun: { grip: [0.47, 0.725], rake: 0.32, fore: [0.45, 0.40], pump: { y: [-1, 0.76], z: [0.29, 0.49], mat: /Wood/ }, port: [0.40, 0.56], kind: 'shotgun' } };

// the reload, as keys over its progress (0..1). at: a spot on the gun (or 'belt', in camera space), off: a nudge in gun space,
// curl: how closed the hand is, e: the ease into this key. Events in ev: when a mag or shell is grabbed, dropped, fetched, seated.
const RELOADS = {
  mag: { keys: [
    { t: 0, at: 'fore' }, { t: 0.10, at: 'mag', curl: 0.45 }, { t: 0.14, at: 'mag', curl: 0.8 },
    { t: 0.25, at: 'mag', off: [-0.035, -0.17, 0.04], curl: 0.8 }, { t: 0.40, at: 'belt', curl: 0.8 }, { t: 0.45, at: 'belt', curl: 0.8 },
    { t: 0.57, at: 'mag', off: [-0.004, -0.085, 0.012], curl: 0.8 }, { t: 0.635, at: 'mag', curl: 0.8, e: 'in' }, { t: 0.68, at: 'mag', curl: 0.6 },
    { t: 0.76, at: 'charge', curl: 0.3 }, { t: 0.80, at: 'charge', curl: 0.85 }, { t: 0.875, at: 'charge', off: [0, 0, 0.085], curl: 0.85, e: 'out' },
    { t: 0.90, at: 'charge', off: [-0.01, 0.01, 0.09], curl: 0.3 }, { t: 1, at: 'fore' }],
    ev: { grab: 0.14, drop: 0.25, fetch: 0.40, seat: 0.635 } },
  pistol: { keys: [
    { t: 0, at: 'support' }, { t: 0.07, at: 'support', off: [-0.03, -0.02, 0.03], curl: 0.4 }, { t: 0.27, at: 'belt', curl: 0.75 }, { t: 0.32, at: 'belt', curl: 0.75 },
    { t: 0.45, at: 'pmag', off: [0, -0.075, 0.006], curl: 0.75 }, { t: 0.515, at: 'pmag', curl: 0.75, e: 'in' }, { t: 0.56, at: 'pmag', curl: 0.5 },
    { t: 0.68, at: 'rack', curl: 0.3 }, { t: 0.72, at: 'rack', curl: 0.9 }, { t: 0.80, at: 'rack', off: [0, 0, 0.038], curl: 0.9, e: 'out' },
    { t: 0.82, at: 'rack', off: [-0.02, 0.025, 0.045], curl: 0.3 }, { t: 1, at: 'support' }],
    ev: { grab: 0.0, drop: 0.035, fetch: 0.30, seat: 0.515, slide: [0.72, 0.80, 0.815] } },
  shotgun: { keys: [
    { t: 0, at: 'fore' }, { t: 0.09, at: 'fore', off: [-0.02, -0.05, 0.05], curl: 0.4 }, { t: 0.22, at: 'belt', curl: 0.6 }, { t: 0.25, at: 'belt', curl: 0.6 },
    { t: 0.36, at: 'port', off: [0, -0.035, -0.012], curl: 0.6 }, { t: 0.42, at: 'port', curl: 0.6, e: 'in' }, { t: 0.54, at: 'belt', curl: 0.6 }, { t: 0.57, at: 'belt', curl: 0.6 },
    { t: 0.66, at: 'port', off: [0, -0.035, -0.012], curl: 0.6 }, { t: 0.72, at: 'port', curl: 0.6, e: 'in' }, { t: 0.82, at: 'fore' },
    { t: 0.89, at: 'fore', off: [0, 0, 0.075], e: 'out' }, { t: 0.95, at: 'fore', e: 'in' }, { t: 1, at: 'fore' }],
    ev: { shells: [[0.22, 0.42], [0.54, 0.72]], pump: [0.82, 0.89, 0.95] } } };

// how the gun is presented while the hands reload it (hip only): lifted toward the middle and canted so the magwell, port or slide
// faces the left hand and the eye. Replaces main.js's old reload dip (its r term), which hid the whole reload below the screen.
const PRESENT = { mag: { p: [-0.08, 0.115, 0.06], r: [0.16, 0.26, -0.45] }, pistol: { p: [-0.08, 0.115, 0.03], r: [0.38, 0.3, -0.3] }, shotgun: { p: [-0.07, 0.10, 0.05], r: [0.12, 0.22, -0.58] } };

// hip framing per gun, so the hands on it are in the picture (main.js's pistol sits so low its grip, and so both hands, are off
// screen). Hip only: it eases out on the way into the sights, where the gun is exactly where main.js puts it.
const HIP = { pistol: [-0.04, 0.08, -0.04] };

export class Hands {
  constructor(THREE, vcam) {
    const T = this.T = THREE; this.vcam = vcam;
    this.root = new T.Group(); this.root.name = 'hands'; vcam.add(this.root);
    this.bones = []; for (let i = 0; i < NB * 2; i++) { const b = new T.Bone(); b.matrixAutoUpdate = false; this.root.add(b); this.bones.push(b); }
    const skel = new T.Skeleton(this.bones, this.bones.map(() => new T.Matrix4()));   /* (identity inverses: each part is modeled in its own bone's space) */
    const lists = { suit: [], glove: [], seam: [] }; this.build(lists);
    const mats = {
      suit: new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.6, metalness: 0.1 }),
      glove: new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.55, metalness: 0.06 }),
      seam: new T.MeshStandardMaterial({ color: SEAM, emissive: SEAM, emissiveIntensity: 1.6, roughness: 0.35 }) };
    this.meshes = []; this.tris = 0;
    for (const k in lists) { const geo = mergeGeometries(lists[k], false), m = new T.SkinnedMesh(geo, mats[k]); m.bind(skel, new T.Matrix4()); m.frustumCulled = false; this.root.add(m); this.meshes.push(m); this.tris += geo.index.count / 3; }
    this.gun = null; this.key = ''; this.t = 0; this.walk = 0; this.mov = 0; this.jolt = 0; this.dropped = []; this.lastP = -1; this.seated = 0;
    this.tmp = { m: new T.Matrix4(), m2: new T.Matrix4(), v: new T.Vector3(), v2: new T.Vector3(), q: new T.Quaternion() };
    this.shell = this.makeShell(); this.root.add(this.shell); this.shell.visible = false;
    this.root.visible = false;
  }

  // ------------------------------------------------------------- the model: smooth lathed limbs, a beveled palm, round finger segments
  build(L) {
    const T = this.T, col = new T.Color();
    const part = (list, g, bone, hex) => { g.deleteAttribute('uv'); const n = g.attributes.position.count; col.setHex(hex);
      const c = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; si[i * 4] = bone; sw[i * 4] = 1; }
      g.setAttribute('color', new T.BufferAttribute(c, 3)); g.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new T.BufferAttribute(sw, 4)); list.push(g); };
    /* a limb along -z from 0 to -len: a lathe with rounded ends; r is a function of t (0 at the start, 1 at the end) */
    const limb = (r, len, radial, mid, cap = 3, sq = 0.8) => { const p = [], r0 = r(0), r1 = r(1);
      for (let i = 0; i <= cap; i++) { const a = -Math.PI / 2 + (i / cap) * Math.PI / 2; p.push(new T.Vector2(Math.max(1e-4, r0 * Math.cos(a)), r0 * Math.sin(a) * sq)); }
      for (let i = 1; i < mid; i++) p.push(new T.Vector2(r(i / mid), (i / mid) * len));
      for (let i = 0; i <= cap; i++) { const a = (i / cap) * Math.PI / 2; p.push(new T.Vector2(Math.max(1e-4, r1 * Math.cos(a)), len + r1 * Math.sin(a) * sq)); }
      const g = new T.LatheGeometry(p, radial); g.rotateX(-Math.PI / 2); return g; };
    /* a box with every edge rounded (its normals point straight out of the rounding, so it shades smooth) */
    const rbox = (w, h, d, r, seg) => { const g = new T.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, nr = g.attributes.normal, v = new T.Vector3(), c = new T.Vector3(), lim = new T.Vector3(w / 2 - r, h / 2 - r, d / 2 - r);
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.copy(v).clamp(lim.clone().negate(), lim); v.sub(c).normalize(); nr.setXYZ(i, v.x, v.y, v.z); v.multiplyScalar(r).add(c); p.setXYZ(i, v.x, v.y, v.z); } return g; };
    const R = { suit: [], glove: [], seam: [] };
    /* upper arm (bone 0), mostly off screen */
    part(R.suit, limb(t => 0.052 - 0.006 * t, UPPER, 12, 4).scale(1.05, 0.95, 1), 0, SLEEVE);
    /* forearm (bone 1): the sleeve tapers to the wrist, then one armored cuff and one thin seam of light at its edge */
    part(R.suit, limb(t => 0.049 - 0.023 * smoother(sat(t / 0.82)) + 0.005 * Math.sin(Math.PI * sat(t / 0.55)), FORE - 0.02, 18, 8).scale(1.1, 0.9, 1), 1, SLEEVE);
    { const p = [[0.0272, 0], [0.0305, 0.008], [0.0312, 0.05], [0.0304, 0.074], [0.0282, 0.082]].map(([r, y]) => new T.Vector2(r, y)), g = new T.LatheGeometry(p, 20); g.rotateX(-Math.PI / 2); g.translate(0, 0, -(FORE - 0.095)); g.scale(1.1, 0.9, 1); part(R.suit, g, 1, ARMOR); }
    { const g = new T.TorusGeometry(0.0307, 0.0011, 4, 28); g.translate(0, 0, -(FORE - 0.095) - 0.066); g.scale(1.1, 0.9, 1); part(R.seam, g, 1, SEAM); }
    /* hand (bone 2): origin at the palm's middle; the wrist runs back along +z into the cuff */
    part(R.glove, rbox(0.080, 0.029, 0.084, 0.0115, 4).translate(0, 0, -0.002), 2, GLOVE);
    part(R.glove, rbox(0.064, 0.007, 0.056, 0.0032, 2).translate(0.002, 0.0158, -0.008), 2, PLATE);
    part(R.glove, limb(t => 0.023 + 0.003 * t, 0.05, 12, 3, 2).rotateY(Math.PI).scale(1.15, 0.62, 1).translate(0, 0.001, 0.022), 2, GLOVE);
    /* fingers (bones 3..14) and thumb (15..17): round segments that overlap at the joints like gloved knuckles */
    FINGERS.forEach((f, i) => f.l.forEach((l, j) => part(R.glove, limb(t => f.r * (1 - 0.06 * j - 0.05 * t), l, 8, 2, 2, 0.9), 3 + i * 3 + j, GLOVE)));
    THUMB.l.forEach((l, j) => part(R.glove, limb(t => THUMB.r[j] * (1 - 0.06 * t), l, 8, 2, 2, 0.9), 15 + j, GLOVE));
    /* the left arm is the right one in a mirror (winding flipped so it still faces out), on the next 18 bones */
    for (const k in R) for (const g of R[k]) { L[k].push(g); const m = g.clone(); m.scale(-1, 1, 1); const ix = m.index.array; for (let i = 0; i < ix.length; i += 3) { const a = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = a; }
      const si = m.attributes.skinIndex; for (let i = 0; i < si.count; i++) si.setX(i, si.getX(i) + NB); L[k].push(m); }
  }

  makeShell() {
    const T = this.T, g = mergeGeometries([new T.CylinderGeometry(0.0094, 0.0094, 0.052, 14).translate(0, 0.008, 0), new T.CylinderGeometry(0.0099, 0.0099, 0.014, 14).translate(0, -0.026, 0)].map(x => { x.deleteAttribute('uv'); return x; }), true);
    const m = new T.Mesh(g, [new T.MeshStandardMaterial({ color: 0x2a0f18, roughness: 0.55 }), new T.MeshStandardMaterial({ color: 0x8c7448, roughness: 0.35, metalness: 0.8 })]);
    m.rotation.z = Math.PI / 2; const o = new T.Group(); o.add(m); return o;   /* (the shell lies along x, the way the hand pinches it) */
  }

  // ------------------------------------------------------------- attach: put the hands on this gun (cuts its mag / slide / pump out once)
  attach(gunModel, key) {
    this.gun = gunModel || null; this.key = key; this.cancel(); if (!gunModel) return;
    const T = this.T, S = SPOTS[key] || SPOTS.ar, ud = gunModel.userData; this.spot = S;
    if (!ud.hands) { gunModel.updateMatrixWorld(true); const inv = gunModel.matrixWorld.clone().invert(), box = new T.Box3(), v = new T.Vector3();
      gunModel.traverse(o => { if (!o.isMesh) return; const rel = inv.clone().multiply(o.matrixWorld), p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(rel)); });
      ud.hands = { box, parts: {} }; for (const name of ['mag', 'slide', 'pump']) if (S[name]) ud.hands.parts[name] = this.cut(gunModel, inv, box, S[name]);
      if (key === 'pistol' && ud.hands.parts.mag) { const b = box, g = new T.Mesh(new T.BoxGeometry(0.017, 0.074, 0.036), new T.MeshStandardMaterial({ color: 0x15161b, roughness: 0.5, metalness: 0.6 }));   /* (the pistol's mag body: hidden inside the grip until it comes out) */
        g.position.set(0, b.min.y + 0.044, this.fz(b, 0.835) - 0.004); g.rotation.x = -S.rake; ud.hands.parts.mag.add(g); } }
    const H = ud.hands, b = H.box; this.box = b; this.parts = H.parts;
    /* the spots, in the gun's own space: palm-centre position and the hand's axes (x along the knuckles, y out of the back of the hand) */
    const P = this.P = {}, fx = (x, y, z) => new T.Vector3(x, y, z), pose = (p, xh, yh) => ({ p, q: this.basis(xh, yh) });
    const up = fx(0, Math.cos(S.rake), -Math.sin(S.rake));
    const gy = this.fy(b, S.grip[0]), gz = this.fz(b, S.grip[1]);
    P.grip = pose(fx(b.max.x * 0.62 + 0.0135, gy, gz + 0.004), up.clone().negate(), fx(1, 0, -0.05));
    if (S.kind === 'pistol') {
      /* the support hand: palm on the left panel, fingers forward round the front strap over the right hand's, wrist back and low */
      P.support = { p: fx(b.min.x * 0.7 - 0.0135, this.fy(b, S.support[0]), this.fz(b, S.support[1])), q: this.basisF(fx(0.45, 0.2, -0.85), fx(-1, -0.3, 0)) };
      P.pmag = pose(fx(0, b.min.y - 0.017, this.fz(b, 0.84) + 0.012), fx(0, 0, -1), fx(0, -1, 0));
      P.rack = pose(fx(-0.012, b.max.y + 0.006, this.fz(b, 0.80)), fx(0, 0, 1), fx(-0.6, 1, 0));
      P.fore = P.support;
    } else {
      P.fore = pose(fx(-0.004, this.fy(b, S.fore[0]) - 0.0148, this.fz(b, S.fore[1])), fx(0, 0, -1), fx(-0.32, -1, 0));
      if (S.mag) { const mz = (this.fz(b, S.mag.z[0]) + this.fz(b, S.mag.z[1])) / 2; P.mag = pose(fx(b.min.x - 0.012, b.min.y * 0.55, mz + 0.008), fx(0, 1, -0.25), fx(-1, 0, 0)); P.charge = pose(fx(b.min.x - 0.02, this.fy(b, 0.66), mz - 0.03), fx(0, 1, -0.2), fx(-1, 0.1, 0)); }
      if (S.port) P.port = pose(fx(0.004, this.fy(b, S.port[0]) - 0.03, this.fz(b, S.port[1]) + 0.01), fx(0, 0, -1), fx(0, -1, 0));
    }
    /* how a held mag sits in the hand: exactly where it is when the hand is on it, so it comes back home to the millimetre */
    const magSpot = P.pmag || P.mag; if (magSpot) this.handToMag = new T.Matrix4().compose(magSpot.p, magSpot.q, new T.Vector3(1, 1, 1)).invert();
    this.root.visible = true;
  }

  /* hand axes from where the fingers point and where the back of the hand faces */
  basisF(f, yh) { const T = this.T, z = f.clone().normalize().negate(), y = yh.clone().addScaledVector(z, -yh.dot(z)).normalize(), x = new T.Vector3().crossVectors(y, z); return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z)); }
  fy(b, f) { return b.min.y + (b.max.y - b.min.y) * f; }
  fz(b, f) { return b.min.z + (b.max.z - b.min.z) * f; }
  basis(xh, yh) { const T = this.T, x = xh.clone().normalize(), y = yh.clone().addScaledVector(x, -yh.dot(x)).normalize(), z = new T.Vector3().crossVectors(x, y); return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z)); }

  /* cut the triangles inside a box (fractions of the gun's box) out of the gun into their own movable part, same materials */
  cut(gun, inv, b, sel) {
    const T = this.T, part = new T.Group(), v = new T.Vector3(), c = new T.Vector3(); part.name = 'hands-part';
    const inBox = p => { const fy = (p.y - b.min.y) / (b.max.y - b.min.y), fz = (p.z - b.min.z) / (b.max.z - b.min.z); return fy >= sel.y[0] && fy <= sel.y[1] && fz >= sel.z[0] && fz <= sel.z[1]; };
    const meshes = []; gun.traverse(o => { if (o.isMesh && o.parent && o.parent.name !== 'hands-part') meshes.push(o); });
    for (const o of meshes) { if (sel.mat && !sel.mat.test(o.material.name || '')) continue;
      const rel = inv.clone().multiply(o.matrixWorld), g = o.geometry, pos = g.attributes.position, ix = g.index ? Array.from(g.index.array) : [...Array(pos.count).keys()], keep = [], take = [];
      /* whole pieces first: triangles joined by shared corners (welded by position) are one piece, and a piece whose middle is in
         the box goes as one, so a magazine leaves no shards behind. A piece bigger than half the gun is judged triangle by triangle. */
      const root = [], find = a => { while (root[a] !== a) a = root[a] = root[root[a]]; return a; }, weld = new Map(), id = new Int32Array(pos.count), len = b.max.z - b.min.z;
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const key = Math.round(v.x * 1e4) + ',' + Math.round(v.y * 1e4) + ',' + Math.round(v.z * 1e4); if (!weld.has(key)) { weld.set(key, root.length); root.push(root.length); } id[i] = weld.get(key); }
      for (let i = 0; i < ix.length; i += 3) { const a = find(id[ix[i]]); root[find(id[ix[i + 1]])] = a; root[find(id[ix[i + 2]])] = a; }
      const box = new Map(); for (let i = 0; i < pos.count; i++) { const r = find(id[i]); if (!box.has(r)) box.set(r, new T.Box3()); box.get(r).expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(rel)); }
      for (let i = 0; i < ix.length; i += 3) { const pb = box.get(find(id[ix[i]])), whole = pb.max.z - pb.min.z < len * 0.5;
        if (whole) pb.getCenter(c); else { c.set(0, 0, 0); for (let j = 0; j < 3; j++) c.add(v.fromBufferAttribute(pos, ix[i + j]).applyMatrix4(rel)); c.multiplyScalar(1 / 3); }
        (inBox(c) ? take : keep).push(ix[i], ix[i + 1], ix[i + 2]); }
      if (!take.length) continue;
      const k = g.clone(); k.setIndex(keep); o.geometry = k;
      const t = g.clone(); t.setIndex(take); t.applyMatrix4(rel); part.add(new T.Mesh(t, o.material)); }
    part.matrixAutoUpdate = false; gun.add(part); return part;
  }

  cancel() { this.lastP = -1; this.shell.visible = false; if (this.parts) for (const k in this.parts) { const p = this.parts[k]; p.matrix.identity(); p.visible = true; p.matrixWorldNeedsUpdate = true; } }

  // ------------------------------------------------------------- every frame, after the gun is placed: s = { reloading, ads, kick, moving, gun }
  update(dt, s) {
    const gm = this.gun; this.root.visible = !!(gm && gm.visible); if (!this.root.visible) { this.updateDrops(dt); return; }
    const T = this.T, ads = s.ads || 0, kick = s.kick || 0, hip = 1 - sat(ads / 0.5) * sat(ads / 0.5) * (3 - 2 * sat(ads / 0.5));   /* (1 at the hip, 0 from half-way into the sights on) */
    this.t += dt; this.mov += ((s.moving || 0) - this.mov) * Math.min(1, dt * 8); this.walk += dt * (6 + 3 * this.mov) * this.mov;
    this.jolt += -this.jolt * Math.min(1, dt * 14);
    /* the gun breathes and bobs at the hip only; in the sights it holds dead still (his rule) */
    const br = Math.sin(this.t * 1.7), w = this.walk, m = this.mov;
    gm.position.x += hip * (0.0018 * Math.sin(this.t * 0.9) + 0.008 * m * Math.sin(w));
    gm.position.y += hip * (0.0022 * br - 0.010 * m * Math.abs(Math.cos(w)) + 0.005 * this.jolt);
    gm.rotation.z += hip * (0.012 * m * Math.sin(w)); gm.rotation.x += hip * (0.0035 * br + 0.025 * this.jolt);
    const hp = HIP[this.key]; if (hp) { gm.position.x += hp[0] * hip; gm.position.y += hp[1] * hip; gm.position.z += hp[2] * hip; }
    const rp = s.reloading != null && s.reloading >= 0 ? sat(s.reloading) : -1, pr = PRESENT[this.spot.kind];
    if (rp >= 0 && pr) { const env = hip * smoother(sat(rp / 0.12)) * smoother(sat((1 - rp) / 0.1)); gm.position.x += pr.p[0] * env; gm.position.y += pr.p[1] * env; gm.position.z += pr.p[2] * env; gm.rotation.x += pr.r[0] * env; gm.rotation.y += pr.r[1] * env; gm.rotation.z += pr.r[2] * env; }
    gm.updateMatrix(); const G = this.toRoot(gm, new T.Matrix4()), Gi = G.clone().invert();
    const p = s.reloading != null && s.reloading >= 0 ? sat(s.reloading) : -1; if (p < 0 && this.lastP >= 0) this.cancel();
    /* right hand: on the grip, always */
    const RH = G.clone().multiply(this.mat(this.P.grip));
    /* left hand: on its spot, or wherever the reload has it */
    let LH, lc = this.key === 'pistol' ? 0.82 : 0.78, li = -1;
    if (p >= 0) { const r = this.reloadPose(p, G, Gi); LH = r.m; lc = r.curl; li = r.curl * 0.95; }
    else LH = G.clone().multiply(this.mat(this.P.fore));
    /* shoulders: off screen, low; they breathe, bob and take the kick */
    const sh = 0.004 * br - 0.012 * m * Math.abs(Math.cos(w)) * (0.4 + 0.6 * hip);
    this.arm(0, RH, new T.Vector3(0.24, -0.30 + sh, 0.30 + kick * 0.03), new T.Vector3(0.35, -0.6, 1), { curl: 0.86, index: p >= 0 ? 0.12 : 0.42, thumb: 0.75, td: this.key === 'pistol' ? [-0.12, -0.42, -0.9] : null });
    this.arm(1, LH, new T.Vector3(-0.22, -0.32 + sh, 0.0 + kick * 0.02), new T.Vector3(-0.8, -1, 0.2), { curl: lc, index: li >= 0 ? li : lc, thumb: 0.6, td: this.key === 'pistol' && p < 0 ? [-0.3, -0.12, -0.95] : null });
    this.lastP = p; this.updateDrops(dt);
  }

  toRoot(o, out) { out.copy(o.matrix); let q = o.parent; while (q && q !== this.vcam) { q.updateMatrix(); out.premultiply(q.matrix); q = q.parent; } return out; }
  mat(pose, off) { const m = new this.T.Matrix4().compose(pose.p, pose.q, new this.T.Vector3(1, 1, 1)); if (off) m.premultiply(new this.T.Matrix4().makeTranslation(off[0], off[1], off[2])); return m; }

  /* the reload: find the two keys around p, blend between them with that key's ease, and move the mag, slide, pump or shell with the hand */
  reloadPose(p, G, Gi) {
    const T = this.T, S = this.spot, R = RELOADS[S.kind], K = R.keys; let i = 0; while (i < K.length - 2 && p >= K[i + 1].t) i++;
    const a = K[i], b = K[i + 1], u = (EASE[b.e || 'io'])(sat((p - a.t) / Math.max(1e-4, b.t - a.t)));
    const at = k => { if (k.at === 'belt') { const q = this.basis(new T.Vector3(0, 1, -0.3), new T.Vector3(-1, -0.2, 0)); return new T.Matrix4().compose(new T.Vector3(-0.27, -0.46, -0.12), q, new T.Vector3(1, 1, 1)); }
      return G.clone().multiply(this.mat(this.P[k.at] || this.P.fore, k.off)); };
    const ma = at(a), mb = at(b), pa = new T.Vector3(), pb = new T.Vector3(), qa = new T.Quaternion(), qb = new T.Quaternion(), sc = new T.Vector3();
    ma.decompose(pa, qa, sc); mb.decompose(pb, qb, sc);
    /* trips to the belt and back swing low, never straight through the gun */
    const arc = (a.at === 'belt') !== (b.at === 'belt') ? Math.sin(Math.PI * u) * 0.05 : 0;
    const pos = pa.lerp(pb, u).add(new T.Vector3(-arc * 0.5, -arc, 0)), m = new T.Matrix4().compose(pos, qa.slerp(qb, u), new T.Vector3(1, 1, 1));
    const curl = (a.curl ?? 0.78) + ((b.curl ?? 0.78) - (a.curl ?? 0.78)) * u, E = R.ev;
    /* the magazine: home, in the hand, falling, gone, fetched, seated */
    const mag = this.parts.mag;
    if (mag && E.drop != null) { const hand = Gi.clone().multiply(m).multiply(this.handToMag), out = S.kind === 'pistol' ? new T.Matrix4().makeTranslation(0, -0.06 * sat((p - E.grab) / Math.max(1e-4, E.drop - E.grab)), 0) : hand;
      if (this.lastP >= 0 && this.lastP < E.drop && p >= E.drop) this.drop(mag, G, S.kind === 'pistol' ? new T.Matrix4().makeTranslation(0, -0.06, 0) : hand);
      if (p < E.grab) mag.matrix.identity(); else if (p < E.drop) mag.matrix.copy(out); else if (p < E.fetch) mag.matrix.identity(); else if (p < E.seat) mag.matrix.copy(hand); else mag.matrix.identity();
      mag.visible = p < E.drop || p >= E.fetch; mag.matrixWorldNeedsUpdate = true;
      if (this.lastP >= 0 && this.lastP < E.seat && p >= E.seat) this.jolt = 1; }
    /* the slide rides back with the hand while it racks, and snaps home when the hand lets go */
    const slide = this.parts.slide; if (slide && E.slide) { const [s0, s1, s2] = E.slide, z = p < s0 ? 0 : p < s1 ? 0.034 * EASE.out(sat((p - s0) / (s1 - s0))) : p < s2 ? 0.034 * (1 - EASE.in(sat((p - s1) / (s2 - s1)))) : 0; slide.matrix.makeTranslation(0, 0, z); slide.matrixWorldNeedsUpdate = true; }
    /* the pump goes back and forward with the hand on it */
    const pump = this.parts.pump; if (pump && E.pump) { const [p0, p1, p2] = E.pump, z = p < p0 ? 0 : p < p1 ? 0.075 * EASE.out(sat((p - p0) / (p1 - p0))) : p < p2 ? 0.075 * (1 - EASE.in(sat((p - p1) / (p2 - p1)))) : 0; pump.matrix.makeTranslation(0, 0, z); pump.matrixWorldNeedsUpdate = true; }
    /* shells: pinched in the fingers from the belt to the port, then pushed in out of sight */
    if (E.shells) { const on = E.shells.find(([s0, s1]) => p >= s0 && p < s1); this.shell.visible = !!on; if (on) { const o = new T.Matrix4().makeTranslation(-0.006, 0.012, -0.05); this.shell.matrixAutoUpdate = false; this.shell.matrix.copy(m).multiply(o); this.shell.matrixWorldNeedsUpdate = true; } }
    return { m, curl };
  }

  /* the old mag leaves the gun for good: a copy falls with gravity in camera space and fades out in under a second */
  drop(mag, G, at) {
    const T = this.T, o = mag.clone(); o.traverse(x => { if (x.isMesh) { x.material = x.material.clone(); x.material.transparent = true; } });
    o.visible = true; o.matrixAutoUpdate = true; G.clone().multiply(at).decompose(o.position, o.quaternion, o.scale);
    o.userData.v = new T.Vector3(-0.15, -0.35, 0.05); o.userData.w = new T.Vector3(1.4, 0.3, 2.2); o.userData.t = 0; this.root.add(o); this.dropped.push(o);
  }
  updateDrops(dt) {
    for (let i = this.dropped.length - 1; i >= 0; i--) { const o = this.dropped[i], d = o.userData; d.t += dt; d.v.y -= 5.5 * dt; o.position.addScaledVector(d.v, dt); o.rotation.x += d.w.x * dt; o.rotation.z += d.w.z * dt;
      const a = 1 - sat((d.t - 0.35) / 0.5); o.traverse(x => { if (x.isMesh) x.material.opacity = a; });
      if (d.t > 0.85) { this.root.remove(o); o.traverse(x => { if (x.isMesh) x.material.dispose(); }); this.dropped.splice(i, 1); } }
  }

  /* one arm: two-bone reach from the shoulder to the wrist (the shoulder slides forward when the hand is out of reach), then the fingers */
  arm(side, H, S, pole, pose) {
    const T = this.T, B = this.bones, o = side * NB, W = new T.Vector3(0, 0.002, 0.052).applyMatrix4(H), hy = new T.Vector3(0, 1, 0).transformDirection(H);
    const d = W.clone().sub(S), reach = (UPPER + FORE) * 0.985; let len = d.length(); const dir = d.clone().divideScalar(len || 1);
    if (len > reach) { S = W.clone().addScaledVector(dir, -reach); len = reach; } len = Math.max(len, Math.abs(UPPER - FORE) + 0.02);
    const ca = (UPPER * UPPER + len * len - FORE * FORE) / (2 * UPPER * len), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    const perp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize(), E = S.clone().addScaledVector(dir, UPPER * ca).addScaledVector(perp, UPPER * sa);
    this.limb(B[o], S, E, perp.clone().negate()); this.limb(B[o + 1], E, W, hy);
    B[o + 2].matrix.copy(H); B[o + 2].matrixWorldNeedsUpdate = true;
    const mir = side === 1, L = new T.Matrix4(), step = new T.Matrix4(), rot = new T.Matrix4();
    FINGERS.forEach((f, i) => { const c = i === 0 ? pose.index : pose.curl, ang = [1.35 * c, 1.5 * c, 1.0 * c];
      L.makeTranslation(f.x, -0.002, -0.040).multiply(rot.makeRotationY((i - 1.5) * -0.035 * (1 - c)));
      for (let j = 0; j < 3; j++) { if (j) L.multiply(step.makeTranslation(0, 0, -f.l[j - 1])); L.multiply(rot.makeRotationX(-ang[j])); this.setBone(B[o + 3 + i * 3 + j], H, L, mir); } });
    /* the thumb: from open (out to the side) to wrapped (over the back of the grip and down its far side, pointing forward) */
    const th = pose.thumb, td = (pose.td ? new T.Vector3(...pose.td) : new T.Vector3(-0.55, -0.2, -0.8).lerp(new T.Vector3(0.14, -0.62, -0.77), th)).normalize(), xa = new T.Vector3(1, 0, 0).addScaledVector(td, -td.x).normalize(), za = td.clone().negate(), ya = new T.Vector3().crossVectors(za, xa);
    L.makeBasis(xa, ya, za).setPosition(-0.031, -0.011, 0.016);
    const ta = [0.05, 0.25 * th + 0.1, 0.3 * th + 0.1]; for (let j = 0; j < 3; j++) { if (j) L.multiply(step.makeTranslation(0, 0, -THUMB.l[j - 1])); L.multiply(rot.makeRotationX(ta[j])); this.setBone(B[o + 15 + j], H, L, mir); }
  }
  limb(bone, a, b, up) { bone.matrix.lookAt(a, b, up).setPosition(a); bone.matrixWorldNeedsUpdate = true; }
  /* a finger bone: hand space times its chain, mirrored for the left hand (the mirror conjugate keeps it a proper rotation) */
  setBone(bone, H, L, mir) { const m = bone.matrix.copy(L); if (mir) { const e = m.elements; e[1] = -e[1]; e[2] = -e[2]; e[4] = -e[4]; e[8] = -e[8]; e[12] = -e[12]; } m.premultiply(H); bone.matrixWorldNeedsUpdate = true; }
}
