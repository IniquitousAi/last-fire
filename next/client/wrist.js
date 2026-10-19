// The wrist screen (his UI rule, 2026-10-19: "UI you can't tell is UI"). Messages are no longer text on the screen: a thin band on your
// left wrist projects them as a small hologram that opens, holds, and folds away. It lives in the held-gun scene, so it moves with you.
import * as THREE from 'three';

export class Wrist {
  constructor(vcam) {
    this.c = document.createElement('canvas'); this.c.width = 1024; this.c.height = 384; this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.root = new THREE.Group(); this.root.position.set(-0.13, -0.115, -0.55); this.root.rotation.set(-0.16, 0.32, 0.03); vcam.add(this.root);
    // the band and its emitter: a dark strip, a hair of cyan where the light comes out
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.055), new THREE.MeshStandardMaterial({ color: 0x0b0d13, roughness: 0.4, metalness: 0.7 })); band.position.set(0, -0.062, 0.02);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.003, 0.004), new THREE.MeshBasicMaterial({ color: 0x39e6ff })); lip.position.set(0, -0.051, 0.048);
    this.holo = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.09), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.holo.position.set(0, 0, 0); this.root.add(band, lip, this.holo); this.root.visible = false;
    this.text = ''; this.t = 0; this.hold = 0; this.open = 0;
  }
  draw(text, head = 'INCOMING') {
    const g = this.c.getContext('2d'), W = 1024, H = 384; g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(8,24,40,0.55)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#39e6ff'; g.lineWidth = 3; const k = 34;   // (corner marks only: the frame is implied, never a box)
    for (const [x, y, dx, dy] of [[4, 4, 1, 1], [W - 4, 4, -1, 1], [4, H - 4, 1, -1], [W - 4, H - 4, -1, -1]]) { g.beginPath(); g.moveTo(x, y + dy * k); g.lineTo(x, y); g.lineTo(x + dx * k, y); g.stroke(); }
    g.fillStyle = '#39e6ff'; g.font = '500 30px "Barlow Condensed", "Arial Narrow", sans-serif'; g.fillText('WRIST  ·  ' + head.toUpperCase(), 36, 52);
    g.fillStyle = '#eef0f8'; g.font = '400 50px "Barlow Condensed", "Arial Narrow", sans-serif';
    const words = String(text).split(' '), lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > W - 72 && line) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line);
    lines.slice(0, 4).forEach((l, i) => g.fillText(l, 36, 118 + i * 62));
    g.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);   // (scanlines: it is light in the air, not paint)
    this.tex.needsUpdate = true;
  }
  say(text, sec = 3, head) { if (!text) return; if (text !== this.text) { this.text = text; this.draw(text, head); if (this.open < 0.5) this.open = 0; } this.hold = Math.max(1.6, sec); }
  update(dt) {
    this.hold -= dt; const want = this.hold > 0 ? 1 : 0; this.open += (want - this.open) * Math.min(1, dt * (want ? 14 : 7));
    this.root.visible = this.open > 0.01; if (!this.root.visible) return;
    this.holo.scale.set(1, Math.max(0.02, this.open), 1); this.holo.position.y = -0.045 * (1 - this.open);   // (it unfolds upward from the band)
    this.holo.material.opacity = Math.min(1, this.open * 1.2) * 0.95;
  }
}
