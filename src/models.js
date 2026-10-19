// Every model you hold or place, from free CC0 packs (assets/CREDITS.txt): Quaternius' guns and turret, Kenney's survival and food kits, and a
// knife, flashlight and lantern from Poly Pizza. Warm wood, rust and orange are repainted cold (his color rule). Each loads once; copies share it.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';

// len: meters muzzle to back (it points down the view); size: the biggest side, for things that stand up
const DEFS = {
  pistol:  { url: 'm/pistol.glb',   len: 0.24 }, smg: { url: 'm/smg.glb', len: 0.5 }, shotgun: { url: 'm/shotgun.glb', len: 0.95 },
  rifle:   { url: 'm/rifle.glb',    len: 1.05 }, lmg: { url: 'm/lmg.glb', len: 0.95 }, ar: { url: 'm/ar.glb', len: 0.82 },
  minigun: { url: 'guns/minigun.glb', len: 0.85, flipZ: true }, knife: { url: 'm/knife.glb', len: 0.3 },
  flashlight: { url: 'm/flashlight.glb', len: 0.2, alongZ: true },
  lantern: { url: 'm/lantern.glb', size: 0.42 }, turret: { url: 'm/turret.glb', size: 1.0 },
  pickaxe: { url: 'kit/pickaxe.glb', size: 0.5 }, planks: { url: 'kit/planks.glb', size: 0.32 }, cobble: { url: 'kit/stone.glb', size: 0.24 },
  campfire: { url: 'kit/campfire.glb', size: 1.0 }, berries: { url: 'food/berries.glb', size: 0.15 },
};
const DARK = { Wood: 0x1d1f25, DarkWood: 0x15161b, Orange: 0x2c3038 };   // (wood stocks become black polymer; the turret's orange stripe becomes steel)
const models = {};
function coldTexture(tex) {   // (the lantern's glass is orange: repaint it a pale blue-white, the color of every light in this game)
  const img = tex.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const r = p[i], gg = p[i + 1], b = p[i + 2]; if (r > gg + 30 && r > b + 50) { const v = (r + gg + b) / 3; p[i] = v * 0.75; p[i + 1] = v * 0.9; p[i + 2] = Math.min(255, v * 1.25); } }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = tex.flipY; return t;
}
export const modelsReady = (async () => {
  const loader = new GLTFLoader();
  await Promise.all(Object.entries(DEFS).map(async ([key, D]) => {
    try {
      const root = (await loader.loadAsync('./assets/' + D.url)).scene;
      root.traverse(o => { if (!o.isMesh) return; o.castShadow = false; o.receiveShadow = false; const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) { if (DARK[m.name] !== undefined) m.color.setHex(DARK[m.name]); if (/Metal/.test(m.name)) { m.metalness = 0.25; m.roughness = 0.45; m.color.multiplyScalar(1.35); }   // (no reflections to show: a high metalness reads pitch black) else if (m.roughness !== undefined) m.roughness = Math.max(0.55, m.roughness);
          if (key === 'lantern' && m.map && m.map.image) m.map = coldTexture(m.map); if (key === 'lantern' && m.map) { m.emissive = new THREE.Color(0x8fb4ff); m.emissiveMap = m.map; m.emissiveIntensity = 0.6; } } });
      const holder = new THREE.Group(), inner = new THREE.Group(); inner.add(root); holder.add(inner);
      let box = new THREE.Box3().setFromObject(inner), s = box.getSize(new THREE.Vector3());
      if (D.len) {   // (point it down -z: these models lie along +x, the Kenney one along +z)
        if (D.flipZ) inner.rotation.y = Math.PI; else if (!D.alongZ) inner.rotation.y = s.x >= s.z ? Math.PI / 2 : 0;
        box = new THREE.Box3().setFromObject(inner); s = box.getSize(new THREE.Vector3()); inner.scale.setScalar(D.len / s.z);
      } else inner.scale.setScalar(D.size / Math.max(s.x, s.y, s.z));
      box = new THREE.Box3().setFromObject(inner); const c = box.getCenter(new THREE.Vector3());
      inner.position.set(-c.x, D.len ? -c.y : -box.min.y, -c.z);   // (guns centered; standing things with their base at 0)
      box = new THREE.Box3().setFromObject(holder); s = box.getSize(new THREE.Vector3());
      holder.userData = { key, len: s.z, height: s.y, top: box.max.y, muzzle: new THREE.Vector3(0, box.max.y * 0.35, box.min.z) };
      models[key] = holder;
    } catch (e) { console.warn('model failed', key, e); }
  }));
  return models;
})();
export function model(key) { const m = models[key]; if (!m) return null; const c = m.clone(); c.userData = { ...m.userData, muzzle: m.userData.muzzle.clone() }; return c; }
export const gunModel = model;
