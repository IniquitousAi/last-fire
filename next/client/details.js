// Small details up close (core/details.js): worn boot prints along the paths people walk, a scorch ring that grows with the fire, and tally scratches
// on the board post, one per night survived. All flat decals on the ground or the post: no glow, nothing floating, sunk a hair into the ground.
import * as THREE from 'three';
import { bootPrints, scorchRadius, tallyOf, SPOTS } from '../core/details.js?v=166';

const printTex = () => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fff';
  x.beginPath(); x.ellipse(32, 38, 17, 30, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(32, 98, 14, 20, 0, 0, 7); x.fill();   // (a sole and a heel, two blobs with a gap: the shape of a boot print)
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; for (let i = 0; i < 6; i++) { x.fillRect(14, 16 + i * 8, 36, 3); }   // (tread)
  const t = new THREE.CanvasTexture(c); return t; };
const scorchTex = () => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 60, 128, 128, 128); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(0,0,0,0.0)'); g.addColorStop(0.8, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); };

export class Details {
  constructor(scene, land, board) {
    this.land = land; const list = bootPrints(), geo = new THREE.PlaneGeometry(0.3, 0.6).rotateX(-Math.PI / 2);
    this.prints = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: printTex(), color: 0x9a9cb0, transparent: true, side: THREE.DoubleSide, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    list.forEach((b, i) => { e.set(0, b.yaw, 0); q.setFromEuler(e); s.set(b.side > 0 ? 1 : -1, 1, 1); p.set(b.x, land(b.x, b.z) + 0.14, b.z); m.compose(p, q, s); this.prints.setMatrixAt(i, m); }); this.prints.frustumCulled = false; scene.add(this.prints);
    this.scorch = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: scorchTex(), transparent: true, depthWrite: false, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); this.scorch.renderOrder = 1; this.scorch.position.set(0, land(0, 0) + 0.14, 0); scene.add(this.scorch); this.lv = -1;
    this.c = document.createElement('canvas'); this.c.width = 256; this.c.height = 256; this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace; this.n = -1;
    const by = land(board.x, board.z), face = Math.atan2(-board.x, -board.z); this.tally = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, color: 0xc4c4c4 }));
    this.tally.position.set(board.x + Math.sin(face) * 0.09, by + 1.25, board.z + Math.cos(face) * 0.09); this.tally.rotation.y = face; scene.add(this.tally);   // (on the post's face toward the fire, at hand height)
  }
  drawTally(n) { const g = this.c.getContext('2d'); g.clearRect(0, 0, 256, 256); g.strokeStyle = '#a9aab8'; g.lineWidth = 5; g.lineCap = 'round';
    for (let i = 0; i < n && i < 40; i++) { const grp = Math.floor(i / 5), k = i % 5, col = grp % 4, row = Math.floor(grp / 4), x0 = 20 + col * 58, y0 = 30 + row * 54;
      if (k < 4) { g.beginPath(); g.moveTo(x0 + k * 11, y0); g.lineTo(x0 + k * 11 + 2, y0 + 38); g.stroke(); } else { g.beginPath(); g.moveTo(x0 - 6, y0 + 30); g.lineTo(x0 + 48, y0 + 6); g.stroke(); } } this.tex.needsUpdate = true; }
  update(g) { const n = tallyOf(g); if (n !== this.n) { this.n = n; this.drawTally(n); }
    if (g.fire.level !== this.lv) { this.lv = g.fire.level; const r = scorchRadius(this.lv); this.scorch.scale.setScalar(r); } }
}
