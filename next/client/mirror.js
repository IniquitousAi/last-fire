// The mirror realm, rough playable (core/mirror.js): the ordinary day flipped where it is cool. Outside each of Earth's four gates stands a smiling
// sign: a cheerful face and an official line that reads one way by day and another at night. Walk up to one and the wrist says what the
// ordinary hour here has become. Unlit and a hair under the bloom threshold, like the board: no glow, no halo.
import * as THREE from 'three';
import { EARTH, WALLS } from '../core/game.js?v=168';
import { SIGNS, signLine, mirrorDay } from '../core/mirror.js?v=168';

export class MirrorSigns {
  constructor(scene, land) {
    this.signs = []; this.land = land;
    [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dz], i) => {   // (outside each gate: north, east, south, west, beside the road a little)
      const x = EARTH.x + dx * (WALLS.half + 7) + dz * 7, z = EARTH.z + dz * (WALLS.half + 7) - dx * 7, y = land(x, z), c = document.createElement('canvas'); c.width = 512; c.height = 320;
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: tex, color: 0xc4c4c4, side: THREE.DoubleSide })), post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), new THREE.MeshStandardMaterial({ color: 0x23262f, roughness: 0.7 }));
      board.position.set(x, y + 2.5, z); board.rotation.y = Math.atan2(dx, dz) + Math.PI; post.position.set(x, y + 1.2, z); scene.add(board, post);
      this.signs.push({ i, x, z, c, tex, key: '' });
    });
  }
  draw(S, clock) {
    const line = signLine(S.i, clock), key = line; if (key === S.key) return; S.key = key; const g = S.c.getContext('2d');
    g.fillStyle = '#d9dce6'; g.fillRect(0, 0, 512, 320); g.strokeStyle = '#1b1d26'; g.lineWidth = 6; g.strokeRect(10, 10, 492, 300);
    g.fillStyle = '#1b1d26'; g.beginPath(); g.arc(256, 104, 66, 0, 7); g.fill(); g.fillStyle = '#d9dce6'; g.beginPath(); g.arc(232, 86, 9, 0, 7); g.arc(280, 86, 9, 0, 7); g.fill();   // (a face: two eyes and a smile that does not change at night)
    g.strokeStyle = '#d9dce6'; g.lineWidth = 7; g.beginPath(); g.arc(256, 108, 36, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = '#1b1d26'; let size = 40; g.font = `600 ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`; while (g.measureText(line).width > 470 && size > 20) { size -= 2; g.font = `600 ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`; }
    g.textAlign = 'center'; g.fillText(line, 256, 240); g.font = '400 24px "Barlow Condensed", "Arial Narrow", sans-serif'; g.fillStyle = '#8a2b4f'; g.fillText('approved by the council', 256, 285); S.tex.needsUpdate = true;
  }
  // the sign you stand at, with what the hour has become (the wrist says it once per hour of the game's day)
  update(me, clock) {
    let near = null; for (const S of this.signs) { this.draw(S, clock); if (Math.hypot(me.x - S.x, me.z - S.z) < 6) near = S; }
    if (!near) return null; const m = mirrorDay(clock); return m.id === this.said ? null : (this.said = m.id, `Mirror hour (${m.id}): ${m.flips}.`);
  }
}
