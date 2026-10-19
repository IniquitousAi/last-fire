// The Hollow: shapes the night is made of. One rule drives them: light. They keep out of firelight and burn at its edge, unmake walls that
// stand in the dark, are drawn to big fires from far away, and daylight burns them off. All drawn as one instanced mesh; only the host simulates them.
import * as THREE from 'three';
import { mergeGeometries } from './merge.js';

export const MAX = 240;

function hollowGeometry() {   // tall, thin, too-long arms, two pale eyes: a silhouette more than a body (a placeholder until a real model)
  const part = (w, h, d, x, y, z, c, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z); const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; };
  const body = [0.03, 0.03, 0.05], eye = [3.2, 2.6, 3.6];   // (eyes above 1: with tone mapping they read as a faint light, the only thing you see at a distance)
  return mergeGeometries([part(0.36, 1.1, 0.22, 0, 1.45, 0, body), part(0.3, 0.38, 0.3, 0, 2.2, 0.02, body), part(0.12, 1.1, 0.14, -0.1, 0.55, 0, body), part(0.12, 1.1, 0.14, 0.1, 0.55, 0, body),
    part(0.09, 1.25, 0.09, -0.26, 1.35, 0.25, body, -0.5), part(0.09, 1.25, 0.09, 0.26, 1.35, 0.25, body, -0.5), part(0.07, 0.035, 0.02, -0.07, 2.24, 0.175, eye), part(0.07, 0.035, 0.02, 0.07, 2.24, 0.175, eye)]);
}

export class Hollow {
  constructor(scene) {
    this.mesh = new THREE.InstancedMesh(hollowGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }), MAX);
    this.mesh.count = 0; this.mesh.frustumCulled = false; scene.add(this.mesh);
    this.z = []; this.next = 1; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.s = new THREE.Vector3(1, 1, 1); this.p = new THREE.Vector3();
  }
  spawn(world, near, speedUp) {
    if (this.z.length >= MAX) return;
    const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 20;
    const x = Math.max(2, Math.min(157, near.x + Math.cos(a) * d)), z = Math.max(2, Math.min(157, near.z + Math.sin(a) * d));
    this.z.push({ x, y: world.height(Math.floor(x), Math.floor(z)), z, vy: 0, yaw: 0, hp: 60, cd: 0, id: this.next++, speed: 1.8 + Math.random() * 1.4 * speedUp, dig: 0 });
  }
  // light at a point: 1 inside a fire's circle, falling to 0 at its edge; a carried torch counts too
  static lightAt(lights, x, y, z) {
    let L = 0; for (const f of lights) { const d = Math.hypot(f.x - x, f.y - y, f.z - z); if (d < f.r) L = Math.max(L, 1 - d / f.r); } return L;
  }
  // host only: every Hollow goes for what draws it most (the nearest player, or a big fire seen from far), keeps out of light, burns in it and by day
  step(dt, world, players, lights, daylight, hurt) {
    for (const k of this.z) {
      if (daylight > 0.25) { k.hp -= dt * 40 * daylight; continue; }   // (morning burns them off: they stand and fade)
      const lit = Hollow.lightAt(lights, k.x, k.y + 1, k.z);
      if (lit > 0.15) k.hp -= dt * 55 * lit;   // (the edge of a fire hurts)
      let target = null, bd = 1e9;
      for (const p of players) { if (p.dead) continue; const d = (p.x - k.x) ** 2 + (p.z - k.z) ** 2; if (d < bd) { bd = d; target = p; } }
      for (const f of lights) if (f.big) { const d = ((f.x - k.x) ** 2 + (f.z - k.z) ** 2) * 0.6; if (d < bd) { bd = d; target = f; } }   // (a big fire calls them from farther than a person does)
      if (!target) continue;
      let dx = target.x - k.x, dz = target.z - k.z; const d = Math.sqrt(dx * dx + dz * dz) || 1; dx /= d; dz /= d;
      const ahead = Hollow.lightAt(lights, k.x + dx * 1.5, k.y + 1, k.z + dz * 1.5);
      if (ahead > 0.2) { const side = (k.id % 2 ? 1 : -1); [dx, dz] = [dx * 0.2 + dz * side, dz * 0.2 - dx * side]; }   // (light ahead: they circle the edge instead)
      k.yaw = Math.atan2(dx, dz);
      if (target.isPlayer && d < 1.2) { if ((k.cd -= dt) <= 0 && Math.abs(target.y - k.y) < 2) { hurt(target, 14); k.cd = 1.0; } continue; }
      const vx = dx * k.speed * dt, vz = dz * k.speed * dt, fx = k.x + dx * 0.7, fz = k.z + dz * 0.7;
      const block = world.solid(fx, k.y + 0.5, fz), above = world.solid(fx, k.y + 1.5, fz);
      if (!block) { k.x += vx; k.z += vz; }
      else if (!above && k.vy === 0) k.vy = 6.4;   // (one block up is a step)
      else if (Hollow.lightAt(lights, fx, k.y + 1, fz) < 0.1) {   // (a wall in the dark comes apart; a lit wall holds)
        k.dig += dt; if (k.dig > 2.8) { world.set(Math.floor(fx), Math.floor(k.y + 0.5), Math.floor(fz), 0); world.set(Math.floor(fx), Math.floor(k.y + 1.5), Math.floor(fz), 0); k.dig = 0; }
      }
      k.vy -= 22 * dt; k.y += k.vy * dt;
      const ground = world.height(Math.floor(k.x), Math.floor(k.z)); if (k.y <= ground) { k.y = ground; k.vy = 0; }
    }
    this.z = this.z.filter(k => k.hp > 0);
  }
  draw(t) {
    this.mesh.count = this.z.length;
    for (let i = 0; i < this.z.length; i++) {
      const k = this.z[i]; this.e.set(Math.sin(t * 3 + k.id) * 0.05, k.yaw, Math.sin(t * 5 + k.id) * 0.05); this.q.setFromEuler(this.e);
      this.p.set(k.x, k.y + Math.sin(t * 2 + k.id) * 0.04, k.z); this.mesh.setMatrixAt(i, this.m.compose(this.p, this.q, this.s));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  hit(origin, dir, max = 60) {   // the first one a shot passes through (the head counts more)
    let best = null, bt = max;
    for (const k of this.z) for (const [hy, r, mult] of [[2.2, 0.26, 2.5], [1.4, 0.4, 1]]) {
      const cx = k.x - origin.x, cy = k.y + hy - origin.y, cz = k.z - origin.z, t = cx * dir.x + cy * dir.y + cz * dir.z;
      if (t < 0 || t > bt) continue;
      if (cx * cx + cy * cy + cz * cz - t * t < r * r) { bt = t; best = { k, mult, t }; }
    }
    return best;
  }
  pack() { const a = new Float32Array(this.z.length * 5); this.z.forEach((k, i) => a.set([k.id, k.x, k.y, k.z, k.yaw], i * 5)); return Array.from(a, v => Math.round(v * 100) / 100); }
  unpack(a) { const z = []; for (let i = 0; i < a.length; i += 5) z.push({ id: a[i], x: a[i + 1], y: a[i + 2], z: a[i + 3], yaw: a[i + 4], hp: 1 }); this.z = z; }
}
