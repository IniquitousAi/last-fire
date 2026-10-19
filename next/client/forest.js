// The Wilds' forest (core/wilds.js): black dead pines and bare trees outside Earth's walls, one calm green patch of live trees. Positions, scale and
// lean come from the core's TREES list (the same list pushOut and the robots use). Models are real CC0 scans or kits read from assets/trees/<kind>.glb
// (deadpine, bare, live); if a model is not on disk that kind is simply not drawn (no stand-in shapes built from code). Each kind is one InstancedMesh
// per sub-mesh, rooted in the ground (land height minus the tree's sink), never floating, only drawn once you stand on Earth.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/jsm/loaders/GLTFLoader.js';
import { TREES, EARTH } from '../core/game.js?v=169';
import { WILDS } from '../core/wilds.js?v=169';

export class Forest {
  constructor(scene, land) {
    this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group); this.drawn = {};
    const L = new GLTFLoader(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (const kind of Object.keys(WILDS.kinds)) {
      const list = TREES.filter(t => t.kind === kind); if (!list.length) continue;
      L.loadAsync(`../assets/trees/${kind}.glb`).then(r => { const root = r.scene; root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), base = WILDS.kinds[kind].h / Math.max(0.01, size.y);
        root.traverse(o => { if (!o.isMesh) return; const g = o.geometry, im = new THREE.InstancedMesh(g, o.material, list.length), local = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().makeTranslation(0, -box.min.y * base, 0).multiply(new THREE.Matrix4().makeScale(base, base, base)), o.matrixWorld);
          list.forEach((t, i) => { e.set(t.lean, t.ry, t.lean * 0.6); q.setFromEuler(e); s.setScalar(t.sc); p.set(t.x, land(t.x, t.z) - t.sink, t.z); m.compose(p, q, s).multiply(local); im.setMatrixAt(i, m); });
          im.frustumCulled = false; this.group.add(im); }); this.drawn[kind] = list.length; }).catch(() => {});   // (no model on disk: this kind is not drawn)
    }
  }
  update(me) { this.group.visible = me.z > 3000 && Math.hypot(me.x - EARTH.x, me.z - EARTH.z) < WILDS.to + 120; }
}
