// The dead city outside the walls, built from a real CC0 scan kit (Poly Haven "Modular Urban Apartments Facade", James Ray Cock) instead of gray code boxes.
// Each tower the core lists (same position, size and tilt, so collision and shadows are unchanged) is wrapped in four faces of stacked wall and window
// modules, instanced: one InstancedMesh per kit part, so the whole city is a handful of draw calls.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/jsm/loaders/GLTFLoader.js';

const KIT = '../assets/ph/modular_urban_apartments_facade/modular_urban_apartments_facade_1k.gltf';
const MODW = 3, MODH = 3.0;   /* (a module is 3 m wide and 3 m tall: floors touch, no gaps) */

export function buildRuins(scene, land, towers, done) {
  new GLTFLoader().loadAsync(KIT).then(gltf => {
    const parts = names => { const out = []; for (const n of names) { const o = gltf.scene.getObjectByName(n); if (o) o.traverse(q => { if (q.isMesh) out.push(q); }); } return out; };
    const kinds = [parts(['wall_standard_standard_01']), parts(['wall_window_centered_large_01', 'window_centered_large_01', 'dado_standard_standard_01']), parts(['base_standard_01'])];
    const jobs = kinds.map(list => list.map(m => ({ m, mats: [] })));
    const R = new THREE.Matrix4(), A = new THREE.Matrix4(), B = new THREE.Matrix4(), M = new THREE.Matrix4(), e = new THREE.Euler(), p = new THREE.Vector3(), qq = new THREE.Quaternion(), s = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    towers.forEach((t, ti) => {
      e.set(t.tx, t.ry, t.tz); qq.setFromEuler(e); p.set(t.x, land(t.x, t.z) + t.h / 2 - 0.4, t.z); R.compose(p, qq, one);
      const nf = Math.max(1, Math.round(t.h / MODH)), sy = t.h / (nf * MODH);
      for (let k = 0; k < 4; k++) {
        const L = k % 2 ? t.d : t.w, D = (k % 2 ? t.w : t.d) / 2, nm = Math.max(1, Math.round(L / MODW)), sx = L / (nm * MODW);
        A.makeRotationY(k * Math.PI / 2);
        for (let f = 0; f < nf; f++) for (let i = 0; i < nm; i++) {
          const kind = f === 0 ? 0 : ((ti + k + f + i) % 3 === 0 ? 0 : 1), x = -L / 2 + (i + 1) * MODW * sx;
          B.compose(p.set(x, -t.h / 2 + f * MODH * sy, D), qq.identity(), s.set(sx, sy, 1)); M.multiplyMatrices(R, A).multiply(B);
          for (const j of jobs[kind]) j.mats.push(M.clone());
          if (f === 0) for (const j of jobs[2]) j.mats.push(M.clone());
        }
      }
    });
    const made = [];
    for (const list of jobs) for (const j of list) { if (!j.mats.length) continue;
      const mat = j.m.material.clone(); mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))) * vec3(0.5, 0.54, 0.74);'); };   /* (the brick scan is orange and brown, off his palette: tinted cold and dark, the way the dark has eaten the old world) */
      const im = new THREE.InstancedMesh(j.m.geometry, mat, j.mats.length); j.mats.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.frustumCulled = false; scene.add(im); made.push(im); }
    if (done) done(made);
  }).catch(err => console.warn('ruins kit missing, keeping the box towers', err));
}
