// What a hit does in the air (his words, v163: "no depth and immersion to shooting the enemies"; the weight of Gears of War, in his palette).
// One pooled InstancedMesh of crisp little shards: dark ichor with crimson specks thrown along the shot, a gray puff when the shot passes through
// smoke (out of every light the dark has no shape and bleeds nothing, the light rule), and crimson motes rising when a body dissolves.
// Nothing is made or thrown away while you play: a ring of CAP particles, the oldest overwritten, so the pool can never pass its cap.
// No additive blending, no halos: opaque flat color, shrinking as it dies.
import * as THREE from 'three';

export const CAP = 480;
const INK = [0x24103a, 0x2e1450, 0x1b0b2c], CRIMSON = [0xe0102e, 0xb80c28, 0xff2b46], SMOKE = [0x5a5470, 0x6a6480, 0x4a4560], MOTE = [0xff2b46, 0xd0102e, 0xff4f6d];
const _o = new THREE.Object3D(), _c = new THREE.Color();

export class Impact {
  constructor(scene, land) {
    this.land = land; this.enabled = true; this.frame = 0; this.live = 0; this.spawned = 0; this.events = []; this.i = 0;
    this.pos = new Float32Array(CAP * 3); this.vel = new Float32Array(CAP * 3); this.life = new Float32Array(CAP); this.max = new Float32Array(CAP); this.size = new Float32Array(CAP); this.kind = new Uint8Array(CAP);
    this.mesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), CAP);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false; this.mesh.count = CAP; this.mesh.renderOrder = 2;
    for (let i = 0; i < CAP; i++) { this.mesh.setColorAt(i, _c.setHex(0)); _o.position.set(0, -999, 0); _o.scale.setScalar(0); _o.updateMatrix(); this.mesh.setMatrixAt(i, _o.matrix); }
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage); scene.add(this.mesh);
  }
  log(kind, n) { this.events.push([this.frame, kind, n]); if (this.events.length > 4000) this.events.splice(0, 2000); }
  spawn(kind, x, y, z, vx, vy, vz, size, life, color) {
    const i = this.i++ % CAP; this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z; this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.size[i] = size; this.life[i] = this.max[i] = life; this.kind[i] = kind; this.mesh.setColorAt(i, _c.setHex(color)); this.mesh.instanceColor.needsUpdate = true; this.spawned++;
  }
  // a hit on a body: ichor along the shot (p: the hit point, d: the shot's direction), a head hit throws more, a heavy one throws farther
  ichor(p, d, head, heavy, kill) {
    if (!this.enabled) return; const n = 12 + (head ? 6 : 0) + (heavy ? 8 : 0) + (kill ? 12 : 0), sp = 2.5 + (heavy ? 2.5 : 0) + (kill ? 1.5 : 0);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.283, r = Math.random() * 0.55, s = sp * (0.5 + Math.random() * 0.9), crim = k % 3 === 0;
      // a cone around the shot direction: the throw goes through the body and out the far side, a little up
      const sx = Math.cos(a) * r, sy = Math.sin(a) * r, sz = (Math.random() - 0.5) * 0.4;
      this.spawn(0, p.x, p.y, p.z, (d.x + sx) * s, (d.y + sy) * s + 0.8, (d.z + sz) * s, crim ? 0.018 + Math.random() * 0.012 : 0.03 + Math.random() * 0.03, 0.5 + Math.random() * 0.5, (crim ? CRIMSON : INK)[k % 3]);
    }
    this.log('ichor', n);
  }
  // a shot through smoke: a gray puff, no blood
  puff(p, d) {
    if (!this.enabled) return; for (let k = 0; k < 7; k++) { const s = 0.3 + Math.random() * 0.8; this.spawn(1, p.x, p.y, p.z, d.x * s * 0.4 + (Math.random() - 0.5) * 0.7, 0.3 + Math.random() * 0.6, d.z * s * 0.4 + (Math.random() - 0.5) * 0.7, 0.07 + Math.random() * 0.1, 0.5 + Math.random() * 0.5, SMOKE[k % 3]); }
    this.log('puff', 7);
  }
  // a dissolving body: crimson motes rising from a spot (the caller spreads the spawn points over the body)
  mote(p) { if (!this.enabled) return; this.spawn(2, p.x, p.y, p.z, (Math.random() - 0.5) * 0.5, 0.8 + Math.random() * 1.4, (Math.random() - 0.5) * 0.5, 0.022 + Math.random() * 0.02, 1.1 + Math.random() * 0.8, MOTE[(Math.random() * 3) | 0]); }
  update(dt) {
    this.frame++; let live = 0;
    for (let i = 0; i < CAP; i++) {
      let l = this.life[i];
      if (l > 0) {
        l -= dt; this.life[i] = l; const k = this.kind[i], j = i * 3;
        if (l <= 0) { _o.scale.setScalar(0); _o.position.set(0, -999, 0); _o.updateMatrix(); this.mesh.setMatrixAt(i, _o.matrix); continue; }
        live++;
        if (k === 0) { this.vel[j + 1] -= 8 * dt; this.vel[j] *= 1 - 0.8 * dt; this.vel[j + 2] *= 1 - 0.8 * dt; }
        else if (k === 1) { this.vel[j + 1] += 0.2 * dt; this.vel[j] *= 1 - 1.5 * dt; this.vel[j + 2] *= 1 - 1.5 * dt; }
        this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
        if (k === 0) { const gy = this.land(this.pos[j], this.pos[j + 2]) + this.size[i]; if (this.pos[j + 1] < gy) { this.pos[j + 1] = gy; this.vel[j] = this.vel[j + 1] = this.vel[j + 2] = 0; if (l > 0.3) this.life[i] = 0.3; } }   // (ichor lands and pools, then shrinks away)
        const f = l / this.max[i], s = this.size[i] * (k === 1 ? (1 + (1 - f) * 1.6) * Math.sqrt(f) : Math.sqrt(Math.min(1, f * 2.5)));
        _o.position.set(this.pos[j], this.pos[j + 1], this.pos[j + 2]); _o.rotation.set(i, i * 1.7, 0); _o.scale.set(s, s * (k === 0 ? 1.7 : 1), s); _o.updateMatrix(); this.mesh.setMatrixAt(i, _o.matrix);
      }
    }
    this.live = live; this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// where a shot goes through a shape that is only smoke (out of every light): the first such shape along the line, as a point; or null
export function smokeHit(g, C, ox, oy, oz, dx, dy, dz, max) {
  let best = null, bt = max;
  for (const k of g.hollow) { if (k.dead || C.solid(g, k)) continue;
    for (const [hy, r] of C.KINDS[k.kind].hits) { const cx = k.x - ox, cy = k.y + hy - oy, cz = k.z - oz, t = cx * dx + cy * dy + cz * dz; if (t < 0 || t > bt) continue; if (cx * cx + cy * cy + cz * cz - t * t < r * r) { bt = t; best = new THREE.Vector3(ox + dx * t, oy + dy * t, oz + dz * t); } } }
  return best;
}
