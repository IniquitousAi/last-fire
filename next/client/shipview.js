// The ship you fly (SHIP.md; his picks 2026-10-19: the HELMET cockpit HUD, a generated model). The physics live in core/ship.js and are
// tested by sim/ship.mjs; this draws the ship, puts you in its cockpit and paints the helmet HUD from the real flight numbers.
// The model: assets/ship.glb when it exists (made by TRELLIS.2 from a concept), else the ship modeled in code (shipmodel.js).
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/jsm/loaders/GLTFLoader.js';
import { SHIP, flyShip } from '../core/ship.js?v=148';
import { shipBounds } from '../core/game.js?v=148';
import { buildShip } from './shipmodel.js?v=148';

export class ShipView {
  constructor(scene, land) {
    this.land = land; this.on = false; this.d = null; this.lag = { r: 0, p: 0 }; this.read = { speed: 0, height: SHIP.hover };
    this.body = new THREE.Group(); scene.add(this.body);
    new GLTFLoader().load('./assets/ship.glb', gl => {   // (the real one: fit to 9 m long, nose along +z)
      const m = gl.scene, box = new THREE.Box3().setFromObject(m), sz = box.getSize(new THREE.Vector3()), k = 9 / Math.max(sz.x, sz.z);
      m.scale.setScalar(k); m.position.set(-(box.min.x + sz.x / 2) * k, -box.min.y * k - 1.2, -(box.min.z + sz.z / 2) * k); this.body.add(m);
    }, undefined, () => this.standIn());
    // the HELMET HUD: one canvas over the game, drawn only while you fly
    this.cv = Object.assign(document.createElement('canvas'), { id: 'helmet' }); Object.assign(this.cv.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4, display: 'none' });
    document.body.append(this.cv); this.x = this.cv.getContext('2d');
  }
  standIn() {   // (until a generated model arrives: the ship modeled in code, shipmodel.js)
    this.body.add(buildShip(THREE));
  }
  near(p, g) { const sv = g.ship; return !!sv && !sv.pilot && !this.on && Math.hypot(p.x - sv.x, p.z - sv.z) < 6; }
  // every frame: the pilot flies their own copy and the world follows it; everyone else eases toward the host's copy
  update(dt, keys, me, g, host) {
    const sv = g.ship; if (!sv) return; const mine = sv.pilot === me.id;
    if (mine && !this.on) { this.on = true; this.d = { ...sv }; me.yaw = sv.yaw + Math.PI; me.pitch = 0; this.lastYaw = sv.yaw; const h = document.getElementById('hud'); if (h) h.style.visibility = 'hidden'; this.cv.style.display = 'block'; }
    if (!mine && this.on) { this.on = false; const h = document.getElementById('hud'); if (h) h.style.visibility = ''; this.cv.style.display = 'none'; }
    const d = this.d = this.d || { ...sv };
    if (mine) {
      const k = c => keys[c] ? 1 : 0;
      this.read = flyShip(d, { fwd: k('KeyW') - k('KeyS'), turn: k('KeyA') - k('KeyD'), side: k('KeyE') - k('KeyQ'), up: k('Space') - k('ShiftLeft') }, this.land, Math.min(dt, 1 / 30)); shipBounds(d);
      if (host) Object.assign(sv, { x: d.x, y: d.y, z: d.z, yaw: d.yaw, roll: d.roll, pitch: d.pitch, vx: d.vx, vy: d.vy, vz: d.vz });
      me.yaw += d.yaw - this.lastYaw; this.lastYaw = d.yaw; me.x = d.x; me.z = d.z; me.y = d.y;   // (you turn with the ship; the mouse still looks around the cockpit)
      this.lag.r += (d.roll - this.lag.r) * Math.min(1, dt * 3.5); this.lag.p += (d.pitch - this.lag.p) * Math.min(1, dt * 3.5);
    } else { const a = host ? 1 : Math.min(1, dt * 10); for (const q of ['x', 'y', 'z', 'roll', 'pitch', 'vx', 'vy', 'vz']) d[q] += (sv[q] - d[q]) * a; d.yaw += Math.atan2(Math.sin(sv.yaw - d.yaw), Math.cos(sv.yaw - d.yaw)) * a; }
    this.body.position.set(d.x, d.y, d.z); this.body.rotation.set(d.pitch, d.yaw, d.roll, 'YXZ');
  }
  sent() { const d = this.d; return [d.x, d.y, d.z, d.yaw, d.roll, d.pitch, d.vx, d.vz, d.vy].map(v => +v.toFixed(3)); }
  camera(cam, me) {   // (the cockpit: your eyes just behind the canopy; the hull banks and dips, and you with it)
    const s = this.d, fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
    cam.position.set(s.x + fx * 1.6, s.y + 1.1, s.z + fz * 1.6); cam.rotation.set(me.pitch + s.pitch, me.yaw, -s.roll, 'YXZ');
  }
  hud(heading) {   // (mockups/cockpit.html look A: the visor curves around your face, readings on its curve settle a beat after the ship moves)
    const cv = this.cv, D = devicePixelRatio || 1, W = innerWidth, H = innerHeight, x = this.x; if (cv.width !== W * D || cv.height !== H * D) { cv.width = W * D; cv.height = H * D; }
    x.setTransform(D, 0, 0, D, 0, 0); x.clearRect(0, 0, W, H); const U = Math.min(W, H) / 60, s = this.d;
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
