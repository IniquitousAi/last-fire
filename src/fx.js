// The small things that make a shot feel like a shot: tracers, sparks off walls, the Hollow coming apart, and the muzzle's light.
// All pooled and drawn in two draw calls; nothing is made or thrown away while you play.
import * as THREE from 'three';

const TR = 48, PT = 600;
export class FX {
  constructor(scene) {
    // tracers: short bright streaks from the muzzle toward where the shot went, gone in a few frames
    this.tpos = new Float32Array(TR * 6); this.tcol = new Float32Array(TR * 6); this.tlife = new Float32Array(TR); this.ti = 0;
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(this.tpos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(this.tcol, 3));
    this.tracers = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.tracers.frustumCulled = false; scene.add(this.tracers);
    // particles: each one a point with a speed, a life and a color
    this.ppos = new Float32Array(PT * 3); this.pcol = new Float32Array(PT * 3); this.pvel = new Float32Array(PT * 3); this.plife = new Float32Array(PT); this.pmax = new Float32Array(PT); this.pc0 = new Float32Array(PT * 3); this.pi = 0;
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(this.ppos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(this.pcol, 3));
    this.points = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false; scene.add(this.points);
    for (let i = 0; i < PT; i++) this.ppos[i * 3 + 1] = -999;
  }
  tracer(a, b, color = [0.75, 0.85, 1.0]) {
    const i = this.ti++ % TR, d = b.clone().sub(a), len = d.length(); if (len < 1) return;
    const s = a.clone().addScaledVector(d, Math.min(0.08, 1.5 / len)), e = a.clone().addScaledVector(d, Math.min(1, 9 / len));   // (a streak a few meters long, not a laser line)
    this.tpos.set([s.x, s.y, s.z, e.x, e.y, e.z], i * 6); this.tcol.set([...color, color[0] * 0.2, color[1] * 0.2, color[2] * 0.25], i * 6); this.tlife[i] = 0.05;
  }
  burst(p, n, color, speed = 3, life = 0.35, up = 1) {
    for (let k = 0; k < n; k++) {
      const i = this.pi++ % PT, a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u), v = speed * (0.4 + Math.random() * 0.6);
      this.ppos.set([p.x, p.y, p.z], i * 3); this.pvel.set([Math.cos(a) * r * v, Math.abs(u) * v * up, Math.sin(a) * r * v], i * 3);
      this.plife[i] = this.pmax[i] = life * (0.6 + Math.random() * 0.6); this.pc0.set(color, i * 3);
    }
  }
  spark(p) { this.burst(p, 7, [0.9, 0.95, 1.0], 4, 0.25); this.burst(p, 4, [0.3, 0.32, 0.36], 1.2, 0.6); }   // (a hit on a wall: white sparks and grey dust)
  ichor(p, head) { this.burst(p, head ? 16 : 9, head ? [1.0, 0.35, 0.7] : [0.55, 0.45, 0.95], head ? 3.2 : 2.2, 0.4); }   // (a Hollow is not blood: it comes apart as pale violet light)
  update(dt) {
    for (let i = 0; i < TR; i++) if (this.tlife[i] > 0 && (this.tlife[i] -= dt) <= 0) { this.tpos.fill(0, i * 6, i * 6 + 6); }
    this.tracers.geometry.attributes.position.needsUpdate = true; this.tracers.geometry.attributes.color.needsUpdate = true;
    for (let i = 0; i < PT; i++) {
      if (this.plife[i] <= 0) continue;
      if ((this.plife[i] -= dt) <= 0) { this.ppos[i * 3 + 1] = -999; continue; }
      this.pvel[i * 3 + 1] -= 9 * dt; for (let c = 0; c < 3; c++) this.ppos[i * 3 + c] += this.pvel[i * 3 + c] * dt;
      const f = this.plife[i] / this.pmax[i]; for (let c = 0; c < 3; c++) this.pcol[i * 3 + c] = this.pc0[i * 3 + c] * f;
    }
    this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.attributes.color.needsUpdate = true;
  }
}
