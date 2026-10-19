// Low fog on Earth (his north star picture: silver-gray fog lying in the forest and against the wall; sim/lookmatch.py measured the game 36
// points blacker than the picture, round 1 of 2026-10-19). Big soft cards that hug the ground around you, drifting slowly, thickest at night.
// Cards, not a volume: forty sprites, one material, no shader cost worth measuring.
import * as THREE from 'three';
const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  for (let i = 0; i < 9; i++) { const px = 30 + (i * 37) % 68, py = 40 + (i * 23) % 48, r = 26 + (i * 13) % 22, gr = x.createRadialGradient(px, py, 2, px, py, r); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
export class FogBank {
  constructor(scene, land, anchors = []) { this.land = land; this.mat = new THREE.SpriteMaterial({ map: tex, color: 0x9aa3b8, transparent: true, opacity: 0, depthWrite: false, fog: false }); this.cards = [];
    for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(this.mat); s.userData = { a: (i * 2.399) % 6.283, r: 14 + ((i * 0.618) % 1) * 70, h: 0.6 + ((i * 0.37) % 1) * 2.4, w: 16 + ((i * 0.77) % 1) * 18, sp: 0.4 + ((i * 0.53) % 1) * 0.6 }; s.scale.set(s.userData.w, s.userData.w * 0.28, 1); scene.add(s); this.cards.push(s); }
    // fog that lies against the walls, inside and out (his picture: the wall rises out of a bank of fog)
    this.wall = anchors.map(([x, z], i) => { const s = new THREE.Sprite(this.mat), w = 26 + (i * 7) % 14; s.scale.set(w, w * 0.32, 1); s.userData = { x, z, h: 2 + (i * 0.37) % 1 * 4, ph: i * 1.7 }; scene.add(s); return s; }); }
  update(t, me, onEarth, inRift, night) {   // (night: 0 by day, 1 at full night)
    const want = onEarth && !inRift ? 0.35 + 0.5 * night : 0; this.mat.opacity += (want - this.mat.opacity) * 0.03; const vis = this.mat.opacity > 0.01;
    for (const s of this.cards) { s.visible = vis; if (!vis) continue; const u = s.userData, a = u.a + t * 0.004 * u.sp, x = me.x + Math.cos(a) * u.r + Math.sin(t * 0.02 * u.sp + u.a) * 6, z = me.z + Math.sin(a) * u.r;
      s.position.set(x, this.land(x, z) + u.h, z); }
    for (const s of this.wall) { s.visible = vis; if (!vis) continue; const u = s.userData; s.position.set(u.x + Math.sin(t * 0.03 + u.ph) * 4, this.land(u.x, u.z) + u.h, u.z + Math.cos(t * 0.025 + u.ph) * 2); } }
}
