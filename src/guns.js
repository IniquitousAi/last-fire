// The guns you see: Kenney's Blaster Kit models (CC0, assets/guns/LICENSE-Kenney.txt), repainted gunmetal and black polymer, scaled to each gun's
// real length. One loaded copy per gun; the first-person one and each friend's held copy share its geometry.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';

const LENGTH = { pistol: 0.26, smg: 0.46, shotgun: 0.62, rifle: 0.74, lmg: 0.8 };   // (meters, muzzle to back)
const models = {};
export const gunsReady = (async () => {
  const loader = new GLTFLoader(), tex = await new THREE.TextureLoader().loadAsync('./assets/guns/Textures/colormap.png');
  tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.magFilter = THREE.NearestFilter;
  const mat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.55, roughness: 0.42 });
  await Promise.all(Object.keys(LENGTH).map(async key => {
    const g = await loader.loadAsync(`./assets/guns/${key}.glb`), root = g.scene;
    root.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; o.receiveShadow = false; } });
    // (the models point down +z; turn them to point where the camera looks, -z, and scale to the real length)
    root.rotation.y = Math.PI; const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), s = LENGTH[key] / size.z;
    const holder = new THREE.Group(); root.scale.setScalar(s); holder.add(root);
    const b2 = new THREE.Box3().setFromObject(holder), c = b2.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -c.y, -c.z);   // (centered on the holder)
    holder.userData.muzzle = new THREE.Vector3(0, (b2.max.y - b2.min.y) * 0.18, -(b2.max.z - b2.min.z) / 2);
    holder.userData.length = LENGTH[key];
    models[key] = holder;
  }));
  return models;
})().catch(e => { console.warn('gun models failed to load', e); return models; });
export function gunModel(key) { const m = models[key]; if (!m) return null; const c = m.clone(); c.userData = { ...m.userData, muzzle: m.userData.muzzle.clone() }; return c; }
