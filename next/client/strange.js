// The sky and the far land get stranger the farther out you go (his Awe pick: cosmic, unknowable). core/immersion.js decides how strange a place
// is (strangeAt); this file draws it: a ringed disc in the sky that grows and tilts, and thin dark spires on the horizon that appear only
// where the land is strange. Nothing glows, nothing floats near you, and the spires sit in the fog so they only ever read as far away.
import * as THREE from 'three';
import { strangeAt, skyOf, spiresNear } from '../core/immersion.js?v=177';

const bands = (w, h, rows, lo, hi) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  for (let i = 0; i < rows; i++) { const t = i / rows, a = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(i * 2.1) * Math.cos(i * 0.7)); x.fillStyle = `rgb(${Math.round(a * 70)},${Math.round(a * 44)},${Math.round(a * 104)})`; x.fillRect(0, t * h, w, h / rows + 1); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex; };
const ringTex = () => { const c = document.createElement('canvas'); c.width = 256; c.height = 4; const x = c.getContext('2d');
  for (let i = 0; i < 256; i++) { const t = i / 255, a = (t > 0.05 && t < 0.97 ? 0.35 + 0.5 * Math.abs(Math.sin(t * 38)) * Math.cos(t * 5) : 0) * (t > 0.46 && t < 0.52 ? 0.05 : 1); x.fillStyle = `rgba(150,128,196,${Math.max(0, Math.min(0.8, a))})`; x.fillRect(i, 0, 1, 4); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex; };

export class Strange {
  constructor(scene) {
    this.scene = scene; const R = 1;
    this.sky = new THREE.Group(); this.sky.renderOrder = -5;   // (drawn right after the dome, before everything else; the dome has depthWrite off)
    this.planet = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 24), new THREE.MeshBasicMaterial({ map: bands(8, 64, 24, 0.35, 1.0), fog: false, depthWrite: false, transparent: true }));   // (transparent so it draws after the sky dome, with the ring)
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.6, 96, 1), new THREE.MeshBasicMaterial({ map: ringTex(), transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false }));
    { const p = this.ring.geometry.attributes.position, uv = this.ring.geometry.attributes.uv; for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getY(i)); uv.setXY(i, (r - 1.5) / 1.1, 0.5); } }   // (the ring's texture runs across its width)
    this.planet.renderOrder = this.ring.renderOrder = -5; this.ring.renderOrder = -4; this.sky.add(this.planet, this.ring); scene.add(this.sky);
    this.spires = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5, 1, true).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0x120c1c, fog: true }), 48); this.spires.frustumCulled = false; this.spires.count = 0; scene.add(this.spires);
    this.at = { x: 1e9, z: 1e9 }; this.m = new THREE.Matrix4();
  }
  update(camera, me, t, land) {
    const k = strangeAt(me.x, me.z), s = skyOf(k), D = 700, ang = 0.9;   // (the disc hangs in the same part of the sky always: west, 28 degrees up)
    const el = 0.49, dx = Math.cos(ang) * Math.cos(el), dz = Math.sin(ang) * Math.cos(el), dy = Math.sin(el), r = D * Math.tan(s.disc / 2);
    this.sky.position.set(camera.position.x + dx * D, camera.position.y + dy * D, camera.position.z + dz * D); this.sky.lookAt(camera.position);
    this.planet.scale.setScalar(r); this.ring.scale.setScalar(r); this.ring.rotation.set(Math.PI / 2 - s.tilt * 0.5, 0.2, 0); this.sky.visible = false;   /* (A2 second pass: the ringed disc hung 28 degrees up in clear sky, a floating glowing ball; his rule says nothing floats, so it is not drawn; the spires on the horizon stay) */
    this.planet.material.color.setScalar(0.45 + 0.55 * k + 0.1 * Math.sin(t / 40));   // (dim when near home: a thing you could miss; clear when far)
    if (Math.hypot(me.x - this.at.x, me.z - this.at.z) > 30) {   // (the spires are recomputed only when you have moved 30 m)
      this.at = { x: me.x, z: me.z }; const list = spiresNear(me.x, me.z, 48); this.spires.count = list.length;
      list.forEach((p, i) => { this.m.makeScale(p.w, p.h, p.w); this.m.setPosition(p.x, land(p.x, p.z) - 2, p.z); this.spires.setMatrixAt(i, this.m); }); this.spires.instanceMatrix.needsUpdate = true; }
  }
}
