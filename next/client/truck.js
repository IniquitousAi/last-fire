// Parts lying out on Earth, and the truck at the bay in camp, drawn as it is really fitted. The model is made in code (truckmodel.js):
// each part a few smooth surfaces you can read from far away, so you know what you found, and the whole truck five draw calls.
import * as THREE from 'three';
import { BAY, PARTS } from '../core/game.js?v=134';
import { buildTruck, buildPart, buildRoofLamp } from './truckmodel.js?v=134';

const FULL = Object.fromEntries(Object.entries(PARTS).map(([k, v]) => [k, v.n])), WRECK = { frame: 1, axle: 1, wheel: 1, cab: 1 };   // (a wreck: what is left after the scavengers)
export class Truck {
  constructor(scene, land) {
    this.scene = scene; this.land = land; this.lying = new Map(); this.shown = ''; this.models = {};
    this.rig = new THREE.Group(); this.rig.position.set(BAY.x, land(BAY.x, BAY.z), BAY.z); this.rig.rotation.y = 0.5; scene.add(this.rig);
    const bay = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.27, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb9a8ff })); bay.position.y = 0.05; this.rig.add(bay);   // (the bay's line on the ground: violet, the builder's color)
  }
  model(key, make) { return (this.models[key] = this.models[key] || make()).clone(); }   // (one built model per kind, shared by every copy)
  car(g) {   // (the finished truck on Earth: every part on, two headlight beams, following the host's truck)
    if (!this.carRig) { this.carRig = new THREE.Group(); this.carRig.add(buildTruck(THREE, FULL));   // (its white headlight bars sit at x 0.55 each side, y 1.0, z 2.12, where the beams start)
      const beam = new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false });
      for (const x of [-0.55, 0.55]) { const b = new THREE.Mesh(new THREE.ConeGeometry(2.6, 12, 16, 1, true).rotateX(-Math.PI / 2), beam); b.position.set(x, 1.0, 8.2); this.carRig.add(b); }
      this.scene.add(this.carRig); }
    if (!this.roof) { this.roof = new THREE.Group(); const housing = buildRoofLamp(THREE);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(4.6, 22, 20, 1, true).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe8d8ff, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.z = -11;
      this.roof.add(housing, beam); this.roof.userData.beam = beam; this.scene.add(this.roof); }   // (the roof lamp, aimed by whoever rides up front)
    this.carRig.visible = !!g.car; this.roof.visible = false; if (!g.car) return; const c = g.car;
    const gunner = c.seats[1] !== undefined && g.players.find(q => q.id === c.seats[1]); if (gunner) { this.roof.visible = true; this.roof.position.set(c.x, this.land(c.x, c.z) + 2.3, c.z); this.roof.rotation.set(0, gunner.yaw || 0, 0); }
    this.carRig.position.set(c.x, this.land(c.x, c.z), c.z); this.carRig.rotation.y = c.yaw + Math.PI;   // (the truck's front is +z in its own drawing, -z in the rules)
  }
  wrecks(g) {   // (dead machines on Earth: a tipped, burnt-out hull you strip for parts, and a tire thrown clear)
    this.wv = this.wv || new Map(); const live = new Set();
    for (const w of (g.earth && g.earth.wrecks) || []) { live.add(w.id); let o = this.wv.get(w.id);
      if (!o) { o = new THREE.Group(); const hull = this.model('wreck', () => buildTruck(THREE, WRECK, { dead: true })); hull.rotation.z = 0.35; hull.position.y = 0.15;
        const tire = this.model('tire', () => buildPart(THREE, 'wheel', { dead: true })); tire.position.set(1.9, 0.25, 1.5); tire.rotation.z = 1.2; o.add(hull, tire); o.position.set(w.x, this.land(w.x, w.z), w.z); o.rotation.y = w.ry || 0; this.scene.add(o); this.wv.set(w.id, o); } }
    for (const [id, o] of this.wv) if (!live.has(id)) { this.scene.remove(o); this.wv.delete(id); }
  }
  update(g) {
    this.car(g); this.wrecks(g);
    // parts lying out there
    const live = new Set();
    for (const q of g.parts) { live.add(q.id); let o = this.lying.get(q.id); if (!o) { o = this.model('part-' + q.kind, () => buildPart(THREE, q.kind)); o.position.set(q.x, this.land(q.x, q.z) + 0.35, q.z); o.rotation.y = q.id; this.scene.add(o); this.lying.set(q.id, o); } }
    for (const [id, o] of this.lying) if (!live.has(id)) { this.scene.remove(o); this.lying.delete(id); }
    // the truck, redrawn only when what is fitted changes: every fitted part appears in place, merged by material
    const key = JSON.stringify(g.truck || {}); if (key === this.shown) return; this.shown = key;
    for (const c of [...this.rig.children]) if (c.userData.part) { this.rig.remove(c); c.traverse(m => m.geometry && m.geometry.dispose()); }
    const t = buildTruck(THREE, g.truck || {}); t.userData.part = true; this.rig.add(t);
  }
}
