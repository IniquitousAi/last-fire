// The lander and the landing site (PLAN-SPACE.md step 3: gray boxes first; real models come after the robots and his hands say the trip is right).
// The pad on the Moon and the site on Earth each get a lander; Earth gets a dead city of broken towers around the site.
import * as THREE from 'three';
import { PAD, EARTH, TOWERS, WALLS } from '../core/game.js?v=160';
import { buildShip } from './shipmodel.js?v=160';

function lander(scene, x, z, y) {   // (the pad, and on it the ship modeled in code: the old cylinder, cone and floating red window were gray-box stand-ins he saw up close, 2026-10-19)
  const g = new THREE.Group(), line = new THREE.MeshBasicMaterial({ color: 0xff3b5c });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.2, 40), new THREE.MeshStandardMaterial({ color: 0x15171d, roughness: 0.8, metalness: 0.3 })); pad.position.y = 0.1;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.025, 6, 64), line); rim.rotation.x = Math.PI / 2; rim.position.y = 0.22;
  const ship = buildShip(THREE); ship.scale.setScalar(0.62); ship.position.set(0, 1.5, -1.2); ship.rotation.y = Math.PI * 0.85;   // (about 5.6 m long, resting on its hover pods over the pad)
  g.add(pad, rim, ship); g.position.set(x, y, z); scene.add(g); return g;
}
export function buildSites(scene, land) {
  lander(scene, PAD.x, PAD.z, land(PAD.x, PAD.z));
  lander(scene, EARTH.x, EARTH.z, land(EARTH.x, EARTH.z));
  // the dead city: broken towers in a ring around the site, one draw call (their places come from the core, so they are solid for everyone)
  // the community's walls: 30 m of concrete that was white once, eaten black by the dark from the ground up (the old white shows high up)
  { const tex = new THREE.TextureLoader().load('../assets/tex/concrete_floor_worn_001_diff_1k.jpg'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 3); tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, color: 0x9a9ca6, roughness: 0.95, metalness: 0 });
    mat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n varying float vH;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vH = position.y + 0.5;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n varying float vH;').replace('#include <map_fragment>', '#include <map_fragment>\n float eaten = 1.0 - smoothstep(0.35, 1.05, vH + 0.18 * sin(vMapUv.x * 9.0) * sin(vMapUv.x * 3.1));\n diffuseColor.rgb *= mix(1.0, 0.07, eaten);'); };
    const n = 8, walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, n), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < n; i++) { const t = TOWERS[i]; s.set(t.w, t.h, t.d); p.set(t.x, land(t.x, t.z) + t.h / 2 - 1, t.z); m.compose(p, q, s); walls.setMatrixAt(i, m); } scene.add(walls); }
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.92, metalness: 0.1 }), TOWERS.length), m = new THREE.Matrix4(), e = new THREE.Euler(), s = new THREE.Vector3(), pos = new THREE.Vector3(), qt = new THREE.Quaternion();
  TOWERS.forEach((t, i) => { if (i < 8) { towers.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); return; } s.set(t.w, t.h, t.d); e.set(t.tx, t.ry, t.tz); qt.setFromEuler(e); pos.set(t.x, land(t.x, t.z) + t.h / 2 - 0.4, t.z); m.compose(pos, qt, s); towers.setMatrixAt(i, m); });
  scene.add(towers);
}
