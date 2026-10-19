// The lander and the landing site (PLAN-SPACE.md step 3: gray boxes first; real models come after the robots and his hands say the trip is right).
// The pad on the Moon and the site on Earth each get a lander; Earth gets a dead city of broken towers around the site.
import * as THREE from 'three';
import { PAD, EARTH } from '../core/game.js?v=25';

function lander(scene, x, z, y) {
  const g = new THREE.Group(), hull = new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: 0.55, metalness: 0.5 }), line = new THREE.MeshBasicMaterial({ color: 0x39e6ff });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.2, 40), new THREE.MeshStandardMaterial({ color: 0x15171d, roughness: 0.8, metalness: 0.3 })); pad.position.y = 0.1;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.025, 6, 64), line); rim.rotation.x = Math.PI / 2; rim.position.y = 0.22;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.5, 2.2, 8), hull); body.position.set(0, 2.1, -1.6);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.1, 8), hull); top.position.set(0, 3.75, -1.6);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.05), line); win.position.set(0, 2.6, -0.25);
  g.add(pad, rim, body, top, win);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 6), hull); leg.position.set(Math.cos(a) * 1.5, 0.95, -1.6 + Math.sin(a) * 1.5); leg.rotation.z = Math.cos(a) * 0.35; leg.rotation.x = -Math.sin(a) * 0.35; g.add(leg); }
  g.position.set(x, y, z); scene.add(g); return g;
}
export function buildSites(scene, land) {
  lander(scene, PAD.x, PAD.z, land(PAD.x, PAD.z));
  lander(scene, EARTH.x, EARTH.z, land(EARTH.x, EARTH.z));
  // the dead city: broken towers in a ring around the site, one draw call
  let q = 33; const rnd = () => (q = (q * 16807) % 2147483647) / 2147483647, N = 60;
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.92, metalness: 0.1 }), N), m = new THREE.Matrix4(), e = new THREE.Euler(), s = new THREE.Vector3(), pos = new THREE.Vector3(), qt = new THREE.Quaternion();
  for (let i = 0; i < N; i++) {
    const a = rnd() * Math.PI * 2, r = 16 + rnd() * 80, x = EARTH.x + Math.cos(a) * r, z = EARTH.z + Math.sin(a) * r, w = 3 + rnd() * 7, d = 3 + rnd() * 7, h = 3 + rnd() * rnd() * 30;
    s.set(w, h, d); e.set((rnd() - 0.5) * 0.12, rnd() * Math.PI, (rnd() - 0.5) * 0.12); qt.setFromEuler(e); pos.set(x, land(x, z) + h / 2 - 0.4, z); m.compose(pos, qt, s); towers.setMatrixAt(i, m);
  }
  scene.add(towers);
}
