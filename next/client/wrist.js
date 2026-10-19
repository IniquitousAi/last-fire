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
    this.text = ''; this.era = 0; this.t = 0; this.hold = 0; this.open = 0;
  }
  // The wrist screen grows with the era (his rule, 2026-10-19: tech scales from primitive to futuristic; look from his sheet next/ref/wrist-ui.png: a translucent
  // deep blue hologram, thin grid lines, a small map, a schematic). Era 0 (nights 1 and 2): words only, a plain scrawl. Era 1 (nights 3 and 4): a map of where the fire is.
  // Era 2 (night 5 on): the map plus a schematic and a scan line. Blue, never cyan.
  draw(text, head = 'INCOMING') {   /* (the box hugs its words and sits on the band; nothing is ever cut: long lines step the type down until every word fits) */
    const g = this.c.getContext('2d'), W = 1024, H = 384, era = this.era || 0, BLUE = '#3d63ff', TX = W - 72 - (era >= 1 ? 300 : 0); g.clearRect(0, 0, W, H);
    let size = 50, lines = [];
    for (; size >= 30; size -= 4) { g.font = `400 ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`; lines = []; let line = '';
      for (const w of String(text).split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > TX && line) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line);
      if (74 + lines.length * (size + 12) + 22 <= H) break; }
    const lh = size + 12, h = Math.min(H, 74 + lines.length * lh + 22), y0 = H - h;
    g.fillStyle = 'rgba(5,8,30,0.84)'; g.fillRect(0, y0, W, h);   /* (near black blue, solid enough that a bright lamp behind never washes the words out) */
    if (era >= 1) { g.strokeStyle = 'rgba(61,99,255,0.22)'; g.lineWidth = 1; for (let x = 36; x < W; x += 48) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, H); g.stroke(); } for (let y = y0 + 20; y < H; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } }   /* (the hologram's fine grid) */
    g.strokeStyle = BLUE; g.lineWidth = 3; const k = 34;   // (corner marks only: the frame is implied, never a box)
    for (const [x, y, dx, dy] of [[4, y0 + 4, 1, 1], [W - 4, y0 + 4, -1, 1], [4, H - 4, 1, -1], [W - 4, H - 4, -1, -1]]) { g.beginPath(); g.moveTo(x, y + dy * k); g.lineTo(x, y); g.lineTo(x + dx * k, y); g.stroke(); }
    g.fillStyle = BLUE; g.font = '500 30px "Barlow Condensed", "Arial Narrow", sans-serif'; g.fillText('WRIST  ·  ' + head.toUpperCase(), 36, y0 + 52);
    g.fillStyle = '#e4e9ff'; g.font = `400 ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    lines.forEach((l, i) => g.fillText(l, 36, y0 + 74 + size * 0.9 + i * lh));
    if (era >= 1) { const cx = W - 150, cy = Math.max(y0 + 104, H - 104), r = 82, nav = this.nav || { a: 0, d: 0 };   // (era 1: the map. You are the arrow at its middle, facing up; the fire is the dot, at its bearing and (compressed) distance)
      g.strokeStyle = BLUE; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r * 0.5, 0, 7); g.moveTo(cx - r, cy); g.lineTo(cx + r, cy); g.moveTo(cx, cy - r); g.lineTo(cx, cy + r); g.stroke();
      const rr = Math.min(1, Math.log(1 + nav.d) / Math.log(1 + 60)) * r; g.fillStyle = '#e4e9ff'; g.beginPath(); g.arc(cx + Math.sin(nav.a) * rr, cy - Math.cos(nav.a) * rr, 7, 0, 7); g.fill();
      g.fillStyle = BLUE; g.beginPath(); g.moveTo(cx, cy - 12); g.lineTo(cx + 9, cy + 9); g.lineTo(cx, cy + 4); g.lineTo(cx - 9, cy + 9); g.fill();
      g.font = '500 24px "Barlow Condensed", "Arial Narrow", sans-serif'; g.fillStyle = BLUE; g.fillText(`FIRE ${Math.round(nav.d)} M`, cx - 52, cy + r + 24); }
    if (era >= 2) { const sx = W - 300, sy = y0 + 40; g.strokeStyle = 'rgba(61,99,255,0.8)'; g.lineWidth = 2;   // (era 2: a schematic and a scan line, as on his sheet)
      g.beginPath(); for (let q = 0; q < 6; q++) { const a = q / 6 * Math.PI * 2; g.lineTo(sx + Math.cos(a) * 34, sy + Math.sin(a) * 34); } g.closePath(); g.moveTo(sx + 16, sy); g.arc(sx, sy, 16, 0, 7); g.stroke();
      g.lineWidth = 1; for (let q = 0; q < 4; q++) { g.beginPath(); g.moveTo(sx - 52, sy - 44 + q * 24); g.lineTo(sx - 28 + (q % 2) * 24, sy - 44 + q * 24); g.stroke(); }
      g.fillStyle = 'rgba(61,99,255,0.35)'; g.fillRect(36, y0 + 60 + ((this.t * 40) % Math.max(10, h - 70)), TX - 40, 2); }
    this.tex.needsUpdate = true;
  }
  say(text, sec = 3, head) { if (!text) return; if (text !== this.text) { this.text = text; this.head = head; this.draw(text, head); if (this.open < 0.5) this.open = 0; } this.hold = Math.max(1.6, sec); }
  update(dt, info) {   // (info: { era, a: bearing to the fire, d: its distance in m })
    this.t = (this.t || 0) + dt; if (info) { const nav = { a: Math.round(info.a * 10) / 10, d: Math.round(info.d) }, era = info.era || 0; if (era !== this.era || !this.nav || nav.a !== this.nav.a || nav.d !== this.nav.d || (era >= 2 && this.open > 0.5)) { this.era = era; this.nav = nav; if (this.text && this.open > 0.01) this.draw(this.text, this.head); } }
    this.hold -= dt; const want = this.hold > 0 ? 1 : 0; this.open += (want - this.open) * Math.min(1, dt * (want ? 14 : 7));
    this.root.visible = this.open > 0.01; if (!this.root.visible) return;
    this.holo.scale.set(1, Math.max(0.02, this.open), 1); this.holo.position.y = -0.045 * (1 - this.open);   // (it unfolds upward from the band)
    this.holo.material.opacity = Math.min(1, this.open * 1.2) * 0.95;
  }
}
