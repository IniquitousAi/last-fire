// The ship you fly (SHIP.md; his picks 2026-10-19: the HELMET cockpit HUD, a generated model). The physics live in core/ship.js and are
// tested by sim/ship.mjs; this draws the ship, puts you in its cockpit and paints the helmet HUD from the real flight numbers.
// The model: assets/ship.glb when it exists (made by TRELLIS.2 from a concept), else a gray-box stand-in, the way the lander started.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/jsm/loaders/GLTFLoader.js';
import { SHIP, makeShip, flyShip } from '../core/ship.js?v=109';

const PARK = { x: 0, z: 34, yaw: 0 };   // (outside the camp's gate, nose away from the tents)
export class ShipView {
  constructor(scene, land) {
    this.land = land; this.s = makeShip(PARK.x, land(PARK.x, PARK.z) + SHIP.hover - 0.05, PARK.z, PARK.yaw); this.on = false; this.lag = { r: 0, p: 0 }; this.read = { speed: 0, height: SHIP.hover };
    this.body = new THREE.Group(); scene.add(this.body);
    new GLTFLoader().load('./assets/ship.glb', gl => {   // (the real one: fit to 9 m long, nose along +z)
      const m = gl.scene, box = new THREE.Box3().setFromObject(m), sz = box.getSize(new THREE.Vector3()), k = 9 / Math.max(sz.x, sz.z);
      m.scale.setScalar(k); m.position.set(-(box.min.x + sz.x / 2) * k, -box.min.y * k - 1.2, -(box.min.z + sz.z / 2) * k); this.body.add(m);
    }, undefined, () => this.standIn());
    // the HELMET HUD: one canvas over the game, drawn only while you fly
    this.cv = Object.assign(document.createElement('canvas'), { id: 'helmet' }); Object.assign(this.cv.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4, display: 'none' });
    document.body.append(this.cv); this.x = this.cv.getContext('2d');
  }
  standIn() {   // (gray box until the generated model arrives: a low black wedge with two seams of light)
    const sh = new THREE.Shape(); sh.moveTo(0, 4.5); sh.lineTo(3.6, -3.2); sh.lineTo(1.2, -2.4); sh.lineTo(0, -3.4); sh.lineTo(-1.2, -2.4); sh.lineTo(-3.6, -3.2); sh.closePath();
    const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.2, bevelSegments: 3 }).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0b0c12, roughness: 0.3, metalness: 0.8 }));
    hull.position.y = -0.4; const seam = new THREE.LineSegments(new THREE.EdgesGeometry(hull.geometry, 30), new THREE.LineBasicMaterial({ color: 0xff4fd8 })); seam.position.copy(hull.position); this.body.add(hull, seam);
  }
  near(p) { return !this.on && Math.hypot(p.x - this.s.x, p.z - this.s.z) < 6; }
  board(me) { this.on = true; me.yaw = this.s.yaw + Math.PI; me.pitch = 0; this.lastYaw = this.s.yaw; const h = document.getElementById('hud'); if (h) h.style.visibility = 'hidden'; this.cv.style.display = 'block'; }
  leave(me) { this.on = false; const s = this.s, a = s.yaw + Math.PI / 2; me.x = s.x + Math.sin(a) * 4; me.z = s.z + Math.cos(a) * 4; me.y = this.land(me.x, me.z); s.vx = s.vz = 0; const h = document.getElementById('hud'); if (h) h.style.visibility = ''; this.cv.style.display = 'none'; }
  update(dt, keys, me) {
    const k = c => keys[c] ? 1 : 0, s = this.s;
    const input = this.on ? { fwd: k('KeyW') - k('KeyS'), turn: k('KeyA') - k('KeyD'), side: k('KeyE') - k('KeyQ'), up: k('Space') - k('ShiftLeft') } : {};
    this.read = flyShip(s, input, this.land, Math.min(dt, 1 / 30));
    { const r = Math.hypot(s.x, s.z); if (r < 24) { s.x *= 24 / r; s.z *= 24 / r; const vr = (s.vx * s.x + s.vz * s.z) / 24; if (vr < 0) { s.vx -= vr * s.x / 24 * 1.4; s.vz -= vr * s.z / 24 * 1.4; } }   /* (the camp wall: it bumps off, it never flies into the tents) */
      if (r > 1500) { s.x *= 1500 / r; s.z *= 1500 / r; } }   /* (the Moon's edge for now: Earth is a trip, not a flight, until the drop is flown) */
    this.body.position.set(s.x, s.y, s.z); this.body.rotation.set(s.pitch, s.yaw, s.roll, 'YXZ');
    if (!this.on) return;
    me.yaw += s.yaw - this.lastYaw; this.lastYaw = s.yaw; me.x = s.x; me.z = s.z; me.y = s.y;   // (you turn with the ship; the mouse still looks around the cockpit)
    this.lag.r += (s.roll - this.lag.r) * Math.min(1, dt * 3.5); this.lag.p += (s.pitch - this.lag.p) * Math.min(1, dt * 3.5);
  }
  camera(cam, me) {   // (the cockpit: your eyes just behind the canopy; the hull banks and dips, and you with it)
    const s = this.s, fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
    cam.position.set(s.x + fx * 1.6, s.y + 1.1, s.z + fz * 1.6); cam.rotation.set(me.pitch + s.pitch, me.yaw, -s.roll, 'YXZ');
  }
  hud(heading) {   // (mockups/cockpit.html look A: the visor curves around your face, readings on its curve settle a beat after the ship moves)
    const cv = this.cv, D = devicePixelRatio || 1, W = innerWidth, H = innerHeight, x = this.x; if (cv.width !== W * D || cv.height !== H * D) { cv.width = W * D; cv.height = H * D; }
    x.setTransform(D, 0, 0, D, 0, 0); x.clearRect(0, 0, W, H); const U = Math.min(W, H) / 60, s = this.s;
    const text = (t, px, py, size, col, al = 'center') => { x.font = `400 ${size}px "Barlow Condensed", sans-serif`; x.textAlign = al; x.textBaseline = 'middle'; x.fillStyle = '#000'; x.fillText(t, px + 1, py + 1); x.fillStyle = col; x.fillText(t, px, py); };
    x.save(); x.translate(W / 2, H / 2); x.rotate((s.roll - this.lag.r) * 0.6); x.translate(0, (this.lag.p - s.pitch) * H * 0.4);
    x.fillStyle = '#000'; x.beginPath(); x.rect(-W, -H, W * 2, H * 2); x.ellipse(0, 0, W * 0.6, H * 0.64, 0, 0, Math.PI * 2, true); x.fill('evenodd');
    x.lineWidth = 1.2; x.strokeStyle = '#7b5cff'; x.beginPath(); x.ellipse(0, 0, W * 0.6, H * 0.64, 0, Math.PI * 0.62, Math.PI * 1.38); x.stroke(); x.strokeStyle = '#ff6fb1'; x.beginPath(); x.ellipse(0, 0, W * 0.6, H * 0.64, 0, -Math.PI * 0.38, Math.PI * 0.38); x.stroke();
    x.lineWidth = 1.5; x.strokeStyle = '#ff4fd8'; x.beginPath(); x.arc(0, 0, 15 * U, Math.PI * 0.82, Math.PI * 1.18); x.stroke(); x.strokeStyle = '#7b5cff'; x.beginPath(); x.arc(0, 0, 15 * U, -Math.PI * 0.18, Math.PI * 0.18); x.stroke();
    const sp = this.read.speed, sk = Math.min(1, sp / SHIP.top * 3); x.strokeStyle = '#ff4fd8'; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 15 * U + 6, Math.PI * 1.18 - sk * Math.PI * 0.36, Math.PI * 1.18); x.stroke();
    text(Math.round(sp * 3.6), -15 * U - 14, -U * 0.5, 54, '#ff4fd8', 'right'); text('KM AN HOUR', -15 * U - 14, U * 2.6, 15, '#eef0f8', 'right');
    text(this.read.height.toFixed(1), 15 * U + 14, -U * 0.5, 34, '#7b5cff', 'left'); text('METERS UP', 15 * U + 14, U * 2, 15, '#eef0f8', 'left');
    const hd = ((-heading * 180 / Math.PI) % 360 + 360) % 360;
    for (let d = -30; d <= 30; d += 5) { const hh = Math.round(hd / 5) * 5 + d, off = hh - hd, a = -Math.PI / 2 + off * Math.PI / 180 * 0.9, r = 24 * U, big = ((hh % 15) + 15) % 15 === 0; if (Math.abs(off) > 30) continue;
      x.strokeStyle = '#a3a6bb'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(Math.cos(a) * r, Math.sin(a) * r); x.lineTo(Math.cos(a) * (r - (big ? 10 : 5)), Math.sin(a) * (r - (big ? 10 : 5))); x.stroke();
      if (big) text(String(((hh % 360) + 360) % 360).padStart(3, '0'), Math.cos(a) * (r + 12), Math.sin(a) * (r + 12), 14, '#eef0f8'); }
    text('FLIGHT', 0, 20 * U, 17, '#ff6fb1'); text('W S thrust   A D turn   SPACE up   SHIFT down   F leave the ship', 0, 21.6 * U, 14, '#a3a6bb');
    x.restore();
    // the flight path marker: where the ship is really going (it slides), against the nose at the center
    const fwdV = s.vx * Math.sin(s.yaw) + s.vz * Math.cos(s.yaw), sideV = s.vx * Math.cos(s.yaw) - s.vz * Math.sin(s.yaw), drift = sp > 1 ? Math.atan2(sideV, Math.max(1, fwdV)) : 0;
    const mx = W / 2 - Math.max(-0.5, Math.min(0.5, drift)) * W * 0.6, my = H / 2 - s.vy * 3;
    x.strokeStyle = '#eef0f8'; x.lineWidth = 1.5; x.beginPath(); x.arc(mx, my, 6, 0, 7); x.moveTo(mx - 18, my); x.lineTo(mx - 7, my); x.moveTo(mx + 7, my); x.lineTo(mx + 18, my); x.moveTo(mx, my - 7); x.lineTo(mx, my - 13); x.stroke();
  }
}
