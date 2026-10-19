// Parts lying out on Earth, and the truck at the bay in camp, drawn as it is really fitted (gray boxes first, PLAN-SPACE.md: real models
// come once his hands say the building feels right). Each part has a shape you can read from far away, so you know what you found.
import * as THREE from 'three';
import { BAY, PARTS } from '../core/game.js?v=35';

const steel = new THREE.MeshStandardMaterial({ color: 0x3a3f4b, roughness: 0.5, metalness: 0.6 }), rubber = new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.95 });
const cell = new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: 0x39e6ff, emissiveIntensity: 1.2 }), body = new THREE.MeshStandardMaterial({ color: 0x2b303a, roughness: 0.7, metalness: 0.35 });
const SHAPE = {
  frame: () => { const g = new THREE.Group(); for (const s of [-0.55, 0.55]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 4.2), steel); r.position.x = s; g.add(r); } for (const z of [-1.6, 0, 1.6]) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.12, 0.14), steel); c.position.z = z; g.add(c); } return g; },
  axle: () => new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.0, 8).rotateZ(Math.PI / 2), steel),
  wheel: () => new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.32, 18).rotateZ(Math.PI / 2), rubber),
  engine: () => { const g = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.8), steel), t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.6), body); t.position.y = 0.38; g.add(b, t); return g; },
  battery: () => { const g = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), body), l = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.31), cell); l.position.y = 0.05; g.add(b, l); return g; },
  cab: () => { const g = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.4), body), w = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.02), cell); w.position.set(0, 0.25, 0.71); g.add(b, w); return g; },
};
const SPOTS = {   // (where each fitted part sits on the truck, in the truck's own space)
  frame: [[0, 0.75, 0]], axle: [[0, 0.5, -1.4], [0, 0.5, 1.4]], wheel: [[-1.05, 0.48, -1.4], [1.05, 0.48, -1.4], [-1.05, 0.48, 1.4], [1.05, 0.48, 1.4]],
  engine: [[0, 1.15, 1.35]], battery: [[0.45, 1.0, 0.5]], cab: [[0, 1.4, -0.2]],
};
export class Truck {
  constructor(scene, land) {
    this.scene = scene; this.land = land; this.lying = new Map(); this.shown = '';
    this.rig = new THREE.Group(); this.rig.position.set(BAY.x, land(BAY.x, BAY.z), BAY.z); this.rig.rotation.y = 0.5; scene.add(this.rig);
    const bay = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.27, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb9a8ff })); bay.position.y = 0.05; this.rig.add(bay);   // (the bay's line on the ground: violet, the builder's color)
  }
  car(g) {   // (the finished truck on Earth: every part on, two headlight beams, following the host's truck)
    if (!this.carRig) { this.carRig = new THREE.Group(); for (const k of Object.keys(PARTS)) for (const at of SPOTS[k]) { const o = SHAPE[k](); o.position.set(...at); this.carRig.add(o); }
      const beam = new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false });
      for (const x of [-0.55, 0.55]) { const b = new THREE.Mesh(new THREE.ConeGeometry(2.6, 12, 16, 1, true).rotateX(-Math.PI / 2), beam); b.position.set(x, 1.0, 8.2); this.carRig.add(b);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.04), new THREE.MeshBasicMaterial({ color: 0xeaf4ff })); lamp.position.set(x, 1.0, 2.12); this.carRig.add(lamp); }
      this.scene.add(this.carRig); }
    this.carRig.visible = !!g.car; if (!g.car) return; const c = g.car;
    this.carRig.position.set(c.x, this.land(c.x, c.z), c.z); this.carRig.rotation.y = c.yaw + Math.PI;   // (the truck's front is +z in its own drawing, -z in the rules)
  }
  update(g) {
    this.car(g);
    // parts lying out there
    const live = new Set();
    for (const q of g.parts) { live.add(q.id); let o = this.lying.get(q.id); if (!o) { o = SHAPE[q.kind](); o.position.set(q.x, this.land(q.x, q.z) + 0.35, q.z); o.rotation.y = q.id; this.scene.add(o); this.lying.set(q.id, o); } }
    for (const [id, o] of this.lying) if (!live.has(id)) { this.scene.remove(o); this.lying.delete(id); }
    // the truck, redrawn only when what is fitted changes
    const key = JSON.stringify(g.truck || {}); if (key === this.shown) return; this.shown = key;
    for (const c of [...this.rig.children]) if (c.userData.part) this.rig.remove(c);
    for (const k of Object.keys(PARTS)) for (let i = 0; i < Math.min((g.truck || {})[k] || 0, SPOTS[k].length); i++) { const o = SHAPE[k](); o.position.set(...SPOTS[k][i]); o.userData.part = true; this.rig.add(o); }
  }
}
