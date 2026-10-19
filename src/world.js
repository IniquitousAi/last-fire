// The world: a block grid in 16 x 16 chunks. Each chunk is one merged mesh (only the faces that touch air are drawn), with soft corner shading
// baked into the vertex colors, so it looks rich with no textures and stays fast: about one draw call a chunk.
import * as THREE from 'three';

export const CHUNK = 16, HEIGHT = 48, SIZE = 160;   // (the world is SIZE x SIZE blocks, HEIGHT tall)
export const B = { AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, LOG: 4, LEAVES: 5, PLANKS: 6, SAND: 7, WATER: 8, COBBLE: 9, CONCRETE: 10, ASPHALT: 11, STEEL: 12 };
export const NAMES = { 1: 'Dead grass', 2: 'Gravel', 3: 'Rock', 4: 'Burnt log', 5: 'Pine needles', 6: 'Planks', 7: 'Ash', 9: 'Rubble', 10: 'Concrete', 11: 'Asphalt', 12: 'Steel' };
const COLOR = { 1: [0.33, 0.37, 0.39], 2: [0.24, 0.25, 0.28], 3: [0.40, 0.42, 0.47], 4: [0.10, 0.10, 0.12], 5: [0.07, 0.11, 0.13], 6: [0.40, 0.38, 0.42], 7: [0.62, 0.65, 0.70], 8: [0.03, 0.05, 0.09], 9: [0.46, 0.47, 0.51], 10: [0.55, 0.56, 0.59], 11: [0.10, 0.10, 0.12], 12: [0.26, 0.29, 0.36] };   // (a cold, burnt-out country at night: no toy greens, no browns)
export const HARD = { 1: 0.5, 2: 0.5, 3: 1.6, 4: 1.0, 5: 0.2, 6: 0.8, 7: 0.4, 9: 1.8, 10: 2.6, 11: 1.4, 12: Infinity };   // (steel never breaks)   // (seconds to break by hand)
export const DROP = { 1: B.DIRT, 2: B.DIRT, 3: B.COBBLE, 4: B.PLANKS, 5: 0, 6: B.PLANKS, 7: B.SAND, 9: B.COBBLE, 10: B.COBBLE, 11: B.COBBLE, 12: 0 };

// seeded value noise, so every player builds the same world from the host's seed
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function noise2(seed) {
  const r = rng(seed), P = new Uint8Array(512), G = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const f = t => t * t * (3 - 2 * t);
  return (x, y) => { const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255, xf = x - Math.floor(x), yf = y - Math.floor(y);
    const a = G[P[P[xi] + yi]], b = G[P[P[xi + 1] + yi]], c = G[P[P[xi] + yi + 1]], d = G[P[P[xi + 1] + yi + 1]], u = f(xf), v = f(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
}

export class World {
  constructor(seed) {
    this.seed = seed; this.data = new Uint8Array(SIZE * SIZE * HEIGHT); this.dirty = new Set(); this.meshes = new Map(); this.edits = [];
    this.generate();
  }
  idx(x, y, z) { return (y * SIZE + z) * SIZE + x; }
  get(x, y, z) { if (x < 0 || z < 0 || x >= SIZE || z >= SIZE || y < 0) return B.STONE; if (y >= HEIGHT) return B.AIR; return this.data[this.idx(x, y, z)]; }
  set(x, y, z, b, record = true) {
    if (x < 0 || z < 0 || x >= SIZE || z >= SIZE || y < 1 || y >= HEIGHT) return false;
    this.data[this.idx(x, y, z)] = b; if (record) this.edits.push([x, y, z, b]);
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK); this.dirty.add(cx + ',' + cz);
    if (x % CHUNK === 0) this.dirty.add((cx - 1) + ',' + cz); if (x % CHUNK === CHUNK - 1) this.dirty.add((cx + 1) + ',' + cz);
    if (z % CHUNK === 0) this.dirty.add(cx + ',' + (cz - 1)); if (z % CHUNK === CHUNK - 1) this.dirty.add(cx + ',' + (cz + 1));
    return true;
  }
  height(x, z) { for (let y = HEIGHT - 1; y > 0; y--) { const b = this.get(x, y, z); if (b && b !== B.LEAVES && b !== B.WATER) return y + 1; } return 1; }
  generate() {
    const n1 = noise2(this.seed), n2 = noise2(this.seed + 7), n3 = noise2(this.seed + 13), r = rng(this.seed + 99), SEA = 12;
    for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
      const hills = n1(x / 38, z / 38) * 0.65 + n2(x / 13, z / 13) * 0.25 + n3(x / 5, z / 5) * 0.1;
      const edge = Math.min(x, z, SIZE - 1 - x, SIZE - 1 - z) / 18;   // (the land rises toward the edges: a valley you cannot walk out of)
      const h = Math.floor(8 + hills * 18 + Math.max(0, 1 - edge) * 14);
      for (let y = 0; y < Math.min(h, HEIGHT); y++) this.data[this.idx(x, y, z)] = y < h - 4 ? B.STONE : y < h - 1 ? B.DIRT : (h <= SEA + 1 ? B.SAND : B.GRASS);
      for (let y = h; y <= SEA; y++) this.data[this.idx(x, y, z)] = B.WATER;
    }
    for (let i = 0; i < 170; i++) {   // dead pines: tall burnt trunks, a few dark needle clusters near the top
      const x = 4 + Math.floor(r() * (SIZE - 8)), z = 4 + Math.floor(r() * (SIZE - 8)), y = this.height(x, z);
      if (this.get(x, y - 1, z) !== B.GRASS || Math.hypot(x - 80, z - 80) < 16) continue;
      const t = 6 + Math.floor(r() * 4);
      for (let k = 0; k < t; k++) this.data[this.idx(x, y + k, z)] = B.LOG;
      for (let dy = t - 3; dy <= t; dy++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if ((dx || dz) && r() < 0.45) continue;
        const X = x + dx, Y = y + dy, Z = z + dz; if (this.get(X, Y, Z) === B.AIR && Y < HEIGHT) this.data[this.idx(X, Y, Z)] = B.LEAVES;
      }
    }
    this.ruins(r);
    for (let cz = 0; cz < SIZE / CHUNK; cz++) for (let cx = 0; cx < SIZE / CHUNK; cx++) this.dirty.add(cx + ',' + cz);
  }
  put(x, y, z, b) { if (x >= 0 && z >= 0 && x < SIZE && z < SIZE && y > 0 && y < HEIGHT) this.data[this.idx(x, y, z)] = b; }
  clearUp(x, y, z) { for (let k = y; k < HEIGHT; k++) this.put(x, k, z, B.AIR); }
  // what is left of people: two roads through the valley, a walled outpost where they meet (the base), house shells, a radio mast
  ruins(r) {
    const C = 80, base = Math.max(14, this.height(C, C));
    for (let z = C - 12; z <= C + 12; z++) for (let x = C - 12; x <= C + 12; x++) {   // the outpost: a flat concrete yard, walls with four gates and broken gaps
      const d = Math.max(Math.abs(x - C), Math.abs(z - C)); if (d > 12) continue;
      for (let y = 1; y < base; y++) if (this.get(x, y, z) === B.AIR || this.get(x, y, z) === B.WATER) this.put(x, y, z, B.STONE);
      this.clearUp(x, base, z); this.put(x, base - 1, z, d <= 11 ? B.CONCRETE : B.STONE);
      if (d === 11) { const gate = Math.min(Math.abs(x - C), Math.abs(z - C)) <= 1, broke = r() < 0.18;
        if (!gate) for (let k = 0; k < (broke ? 1 : 3); k++) this.put(x, base + k, z, B.CONCRETE); }
    }
    for (const axis of [0, 1]) for (let a = 2; a < SIZE - 2; a++) for (let w = -1; w <= 1; w++) {   // the roads, laid on the land
      const x = axis ? a : C + w, z = axis ? C + w : a; if (Math.max(Math.abs(x - C), Math.abs(z - C)) <= 12) continue;
      const h = this.height(x, z); if (this.get(x, h - 1, z) === B.WATER || h - 1 <= 12) continue;
      this.clearUp(x, h, z); if (r() > 0.06) this.put(x, h - 1, z, B.ASPHALT);
    }
    for (let i = 0, made = 0; i < 60 && made < 8; i++) {   // house shells: 7 by 9 rooms, a window each side, part of the roof fallen in
      const x0 = 12 + Math.floor(r() * (SIZE - 32)), z0 = 12 + Math.floor(r() * (SIZE - 32)); if (Math.hypot(x0 - C, z0 - C) < 24) continue;
      const hs = []; for (let x = x0; x < x0 + 7; x++) for (let z = z0; z < z0 + 9; z++) hs.push(this.height(x, z));
      const lo = Math.min(...hs), hi = Math.max(...hs); if (hi - lo > 2 || lo <= 13) continue; made++;
      for (let x = x0; x < x0 + 7; x++) for (let z = z0; z < z0 + 9; z++) {
        for (let y = lo - 1; y < hi + 1; y++) this.put(x, y, z, B.CONCRETE); this.clearUp(x, hi + 1, z);
        const edge = x === x0 || x === x0 + 6 || z === z0 || z === z0 + 8, door = z === z0 && x === x0 + 3, win = (x === x0 || x === x0 + 6) && z === z0 + 4;
        if (edge) for (let k = 1; k <= 4; k++) if (!(door && k <= 2) && !(win && k === 2) && !(k === 4 && r() < 0.35)) this.put(x, hi + k, z, B.CONCRETE);
        if (!edge && r() < 0.45) this.put(x, hi + 4, z, B.PLANKS);
      }
    }
    const mx = C + 22, mz = C - 18, mh = this.height(mx, mz);   // the radio mast: steel, the one tall thing (its red light is drawn by the game)
    for (let k = 0; k < 26; k++) this.put(mx, mh + k, mz, B.STEEL);
    for (let k = 0; k < 24; k += 4) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.put(mx + dx, mh + k, mz + dz, B.STEEL);
    this.mast = [mx + 0.5, mh + 26.5, mz + 0.5];
  }
  solid(x, y, z) { const b = this.get(Math.floor(x), Math.floor(y), Math.floor(z)); return b !== B.AIR && b !== B.WATER; }

  // one chunk's mesh: the faces next to air, each corner darkened by the blocks around it (ambient occlusion), as one geometry
  meshChunk(cx, cz) {
    const pos = [], nor = [], col = [], ind = []; let v = 0;
    const FACES = [[[1, 0, 0], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], 0.8], [[-1, 0, 0], [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], 0.8],
      [[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], 1.0], [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], 0.5],
      [[0, 0, 1], [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], 0.9], [[0, 0, -1], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], 0.9]];
    const opaque = (x, y, z) => { const b = this.get(x, y, z); return b !== B.AIR && b !== B.WATER && b !== B.LEAVES; };
    for (let y = 0; y < HEIGHT; y++) for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const x = cx * CHUNK + lx, z = cz * CHUNK + lz, b = this.get(x, y, z);
      if (b === B.AIR) continue;
      const c = COLOR[b], jitter = 0.93 + ((x * 73856093 ^ y * 19349663 ^ z * 83492791) & 15) / 120;   // (each block a hair different: no flat repeat)
      for (const [n, corners, shade] of FACES) {
        const nb = this.get(x + n[0], y + n[1], z + n[2]);
        if (b === B.WATER ? nb !== B.AIR : (nb !== B.AIR && nb !== B.WATER && !(nb === B.LEAVES && b !== B.LEAVES))) continue;
        if (b === B.WATER && n[1] !== 1) continue;
        for (const k of corners) {
          const px = x + k[0], py = y + k[1], pz = z + k[2];
          pos.push(px, b === B.WATER ? py - 0.12 : py, pz); nor.push(n[0], n[1], n[2]);
          // ambient occlusion: count solid blocks around this corner on the face's outer side
          let occ = 0;   // (the face's outer layer is fixed on the normal's axis; the corner touches 4 cells there, 3 besides the face's own)
          const xs = n[0] ? [x + n[0]] : [x + k[0] - 1, x + k[0]], ys = n[1] ? [y + n[1]] : [y + k[1] - 1, y + k[1]], zs = n[2] ? [z + n[2]] : [z + k[2] - 1, z + k[2]];
          for (const X of xs) for (const Y of ys) for (const Z of zs) if (opaque(X, Y, Z)) occ++;
          const ao = 1 - Math.min(occ, 3) * 0.17, s = shade * ao * jitter;
          col.push(c[0] * s, c[1] * s, c[2] * s);
        }
        ind.push(v, v + 1, v + 2, v, v + 2, v + 3); v += 4;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(ind); g.computeBoundingSphere();
    return g;
  }
  // rebuild a few changed chunks a frame (a whole world on the first frames, then only what was edited)
  update(scene, material, budget = 6) {
    let done = 0;
    for (const key of this.dirty) {
      if (done >= budget) break;
      this.dirty.delete(key); const [cx, cz] = key.split(',').map(Number);
      if (cx < 0 || cz < 0 || cx >= SIZE / CHUNK || cz >= SIZE / CHUNK) continue;
      const old = this.meshes.get(key); if (old) { scene.remove(old); old.geometry.dispose(); }
      const m = new THREE.Mesh(this.meshChunk(cx, cz), material); m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false;
      scene.add(m); this.meshes.set(key, m); done++;
    }
    return this.dirty.size;
  }
  // the first block a ray hits (stepping through the grid one cell at a time), and the empty cell before it
  ray(origin, dir, max = 6) {
    let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z), last = null;
    const sx = Math.sign(dir.x), sy = Math.sign(dir.y), sz = Math.sign(dir.z);
    const tdx = Math.abs(1 / dir.x), tdy = Math.abs(1 / dir.y), tdz = Math.abs(1 / dir.z);
    let tx = (sx > 0 ? x + 1 - origin.x : origin.x - x) * tdx, ty = (sy > 0 ? y + 1 - origin.y : origin.y - y) * tdy, tz = (sz > 0 ? z + 1 - origin.z : origin.z - z) * tdz, t = 0;
    while (t <= max) {
      const b = this.get(x, y, z);
      if (b !== B.AIR && b !== B.WATER) return { x, y, z, b, place: last, dist: t };
      last = [x, y, z];
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; } else if (ty < tz) { y += sy; t = ty; ty += tdy; } else { z += sz; t = tz; tz += tdz; }
    }
    return null;
  }
}
