// The wrist screen (his UI rule, 2026-10-19: "UI you can't tell is UI"). Messages are no longer text on the screen: a thin band on your
// left wrist projects them as a small hologram that opens, holds, and folds away. It lives in the held-gun scene, so it moves with you.
import * as THREE from 'three';

export class Wrist {
  constructor(vcam) {
    this.c = document.createElement('canvas'); this.c.width = 1024; this.c.height = 384; this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.root = new THREE.Group(); this.root.position.set(-0.13, -0.115, -0.55); this.root.rotation.set(-0.16, 0.32, 0.03); vcam.add(this.root);
    // (no floating band or pink lip: a dark slab with a pink line hung in the middle of the screen and read as a stray glitch at 1920x908, so the hologram unfolds on its own, 2026-10-19)
    this.holo = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.09), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, opacity: 0, depthWrite: false }));
    this.holo.position.set(0, 0, 0); this.root.add(this.holo); this.root.visible = false;
    this.text = ''; this.t = 0; this.hold = 0; this.open = 0;
  }
  draw(text, head = 'INCOMING') {   /* (the box hugs its words and sits on the band; nothing is ever cut: long lines step the type down until every word fits) */
    const g = this.c.getContext('2d'), W = 1024, H = 384; g.clearRect(0, 0, W, H);
    let size = 50, lines = [];
    for (; size >= 30; size -= 4) { g.font = `400 ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`; lines = []; let line = '';
      for (const w of String(text).split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > W - 72 && line) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line);
      if (74 + lines.length * (size + 12) + 22 <= H) break; }
    const lh = size + 12, h = Math.min(H, 74 + lines.length * lh + 22), y0 = H - h;
    g.fillStyle = 'rgba(5,5,9,0.86)'; g.fillRect(0, y0, W, h);   /* (near black, solid enough that a bright lamp behind never washes the words out) */
    g.strokeStyle = '#ff4fd8'; g.lineWidth = 3; const k = 34;   // (corner marks only: the frame is implied, never a box)
    for (const [x, y, dx, dy] of [[4, y0 + 4, 1, 1], [W - 4, y0 + 4, -1, 1], [4, H - 4, 1, -1], [W - 4, H - 4, -1, -1]]) { g.beginPath(); g.moveTo(x, y + dy * k); g.lineTo(x, y); g.lineTo(x + dx * k, y); g.stroke(); }
    g.fillStyle = '#ff4fd8'; g.font = '500 30px "Barlow Condensed", "Arial Narrow", sans-serif'; g.fillText('WRIST  ·  ' + head.toUpperCase(), 36, y0 + 52);
    g.fillStyle = '#eef0f8'; g.font = `400 ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    lines.forEach((l, i) => g.fillText(l, 36, y0 + 74 + size * 0.9 + i * lh));
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
