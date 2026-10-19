// The camp around the fire: your old desk in the leaders' hut, and the odds board. (LORE.md: the leaders soften the odds; the truth is
// there only for whoever goes and checks; the humor lives in the paperwork and the board's footnotes.) Numbers carry his labels:
// reasoned (worked out from what really happened), guess (no proof yet). None of them is decoration.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/jsm/loaders/GLTFLoader.js';

export const HUT = { x: -9, z: 9 }, BOARD = { x: 5, z: -4 };
function paper(lines, w = 512, h = 360) {   // (a sheet of paper as a texture: lines are [text, size, color])
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = '#d9dce6'; g.fillRect(0, 0, w, h); g.fillStyle = '#c3c7d4'; for (let y = 52; y < h; y += 34) g.fillRect(24, y, w - 48, 1);
  let y = 46; for (const [t, s, col] of lines) { g.fillStyle = col || '#1b1d26'; g.font = `500 ${s}px "Barlow Condensed", "Arial Narrow", sans-serif`; g.fillText(t, 28, y); y += s + 12; }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
export class Camp {
  constructor(scene, ctx) {
    this.scene = scene; this.ctx = ctx; this.checkedNight = -1; this.drawn = ''; const land = ctx.land, L = new GLTFLoader();
    const put = (url, x, z, s, ry = 0) => L.loadAsync('../assets/' + url).then(r => { const o = r.scene; o.scale.setScalar(s); o.position.set(x, land(x, z), z); o.rotation.y = ry; scene.add(o); return o; }).catch(() => null);
    // the leaders' hut: a big canvas shelter over a desk, a cold lamp, and the two papers
    put('kit/structure-canvas.glb', HUT.x, HUT.z, 4.6, 0.6); const desk = put('kit/workbench.glb', HUT.x - 0.6, HUT.z - 0.9, 3.2, 0.6); put('kit/chest.glb', HUT.x + 1.4, HUT.z + 1.2, 2.4, 2);
    const lamp = new THREE.PointLight(0xdfe6ff, 6, 9, 1.6); lamp.position.set(HUT.x, land(HUT.x, HUT.z) + 2.4, HUT.z); scene.add(lamp);
    const name = ctx.name();
    const form = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.6), new THREE.MeshStandardMaterial({ map: paper([['FORM 12-A: MORNING ODDS', 34, '#2b3a8f'], ['Survival today: 92%', 44], ['(approved by the council)', 26, '#555a6e'], [`Signed: ${name}`, 30], ['Please do not round down.', 24, '#8a2b4f']]), roughness: 0.9 }));
    const real = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.6), new THREE.MeshStandardMaterial({ map: paper([['the real one', 34, '#6b2fa0'], ['Survival today: 81%  (reasoned)', 34], ['Past the dark: 0.0000031%  (guess)', 30], ['not zero.', 40, '#8a2b4f']]), roughness: 0.9 }));
    const deskY = land(HUT.x - 0.6, HUT.z - 0.9) + 1.06;
    form.rotation.x = real.rotation.x = -Math.PI / 2; form.rotation.z = 0.5; real.rotation.z = 0.75;
    form.position.set(HUT.x - 0.95, deskY, HUT.z - 1.05); real.position.set(HUT.x - 0.2, deskY + 0.002, HUT.z - 0.7); scene.add(form, real);
    desk.then(o => { if (!o) return; o.updateMatrixWorld(true); const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);   // (each paper dropped straight down onto whatever is really under it)
      for (const [pp, lift] of [[form, 0.004], [real, 0.006]]) { ray.set(new THREE.Vector3(pp.position.x, pp.position.y + 3, pp.position.z), down); const hit = ray.intersectObject(o, true)[0]; if (hit) pp.position.y = hit.point.y + lift; } });
    // the board: a dark panel on a post at the edge of the fire's light, redrawn only when what it shows changes
    this.bc = document.createElement('canvas'); this.bc.width = 768; this.bc.height = 480; this.btex = new THREE.CanvasTexture(this.bc); this.btex.colorSpace = THREE.SRGBColorSpace;
    const by = land(BOARD.x, BOARD.z); const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.7 })); post.position.set(BOARD.x, by + 1.1, BOARD.z);
    this.board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.25), new THREE.MeshBasicMaterial({ map: this.btex })); this.board.position.set(BOARD.x, by + 2.7, BOARD.z); this.board.rotation.y = Math.atan2(-BOARD.x, -BOARD.z);
    const glow = new THREE.PointLight(0x39e6ff, 3, 6, 1.6); glow.position.set(BOARD.x, by + 2.7, BOARD.z + 0.6); scene.add(post, this.board, glow);
    // the CHECK key: shown only when you stand at the board (click it, or press C)
    this.btn = Object.assign(document.createElement('button'), { className: 'bk', innerHTML: 'CHECK THE REAL ODDS<small>(the board shows what the council approved)</small>' });
    Object.assign(this.btn.style, { position: 'fixed', left: '50%', top: '64%', transform: 'translateX(-50%)', display: 'none', zIndex: 4 }); document.getElementById('hud').append(this.btn);
    this.btn.onclick = () => this.check(); addEventListener('keydown', e => { if (e.code === 'KeyC' && this.near) this.check(); });
  }
  // the honest numbers, from what really happened (labels say how sure)
  odds() {
    const g = this.ctx.g(), h = g.history.slice(-3), players = Math.max(1, g.players.length);
    let surv = 0.81, label = 'reasoned';   // (no nights yet: the camp's old average)
    if (h.length) { const fallRate = h.reduce((s, n) => s + n.falls, 0) / (h.length * players); surv = Math.max(0.05, Math.min(0.99, 1 - fallRate * 0.6 - (g.fire.fuel < 60 ? 0.15 : 0))); }
    const lit = g.nodes.filter(n => n.lit).length, past = 3.1e-6 * (1 + lit * 0.35 + g.fire.level * 0.9 + g.history.length * 0.05);
    return { surv: Math.round(surv * 100), council: Math.min(99, Math.round(surv * 100) + 11), past, label };
  }
  footnote() {   // (the dry part: written from yesterday's real events)
    const g = this.ctx.g(), y = g.history[g.history.length - 1]; if (!y) return 'no data yet. the council recommends optimism.';
    const fallen = Object.keys(y.players || {})[0], broke = (g.marks || []).filter(m => m.k === 'wreck' && m.n === y.night).length;
    if (y.falls > 0) return `down since ${fallen || 'someone'} briefly stopped being anywhere. form 9-C filed.`;
    if (broke > 0) return `${broke} relay${broke > 1 ? 's' : ''} stopped being anywhere. replacement forms are out of stock.`;
    if (y.tense < 0.2) return 'nothing happened last night. statistically suspicious.';
    return 'everyone came back. this has been noted, in triplicate.';
  }
  check() { this.checkedNight = this.ctx.g().night; this.drawn = ''; this.ctx.say('The real odds. Nobody else came to check.', 4); }
  draw() {
    const g = this.ctx.g(), o = this.odds(), real = this.checkedNight === g.night, key = [real, o.surv, o.past.toPrecision(2), g.night, this.footnote()].join('|'); if (key === this.drawn) return; this.drawn = key;
    const c = this.bc.getContext('2d'); c.fillStyle = '#05060b'; c.fillRect(0, 0, 768, 480); c.strokeStyle = real ? '#39e6ff' : '#b9a8ff'; c.lineWidth = 8; c.strokeRect(8, 8, 752, 464);
    c.fillStyle = real ? '#39e6ff' : '#b9a8ff'; c.font = '500 46px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillText(real ? `THE REAL ODDS, DAY ${g.night}` : `SURVIVAL TODAY, DAY ${g.night}`, 36, 76);
    c.fillStyle = '#fff'; c.font = '500 170px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillText(`${real ? o.surv : o.council}%`, 36, 250);
    c.font = '400 32px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillStyle = '#a3a6bb'; c.fillText(real ? `(${o.label}: from the last ${Math.min(3, g.history.length) || 'no'} nights)` : '(approved by the council)', 40, 300);
    c.fillStyle = '#ff6fb1'; c.font = '400 34px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillText(this.footnote().slice(0, 52), 40, 362);
    c.fillStyle = real ? '#3dff9a' : '#6f7188'; c.font = '400 32px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillText(real ? `past the dark: ${(o.past).toFixed(7)}%  (guess)` : 'have a nice day.', 40, 430);
    this.btex.needsUpdate = true;
  }
  update() {
    const me = this.ctx.me(); if (!me) return; this.near = Math.hypot(me.x - BOARD.x, me.z - BOARD.z) < 4.5 && this.checkedNight !== this.ctx.g().night;
    this.btn.style.display = this.near ? 'block' : 'none'; this.draw();
  }
  // a new world starts you at your old desk, facing the two papers
  static startAt(me, land) { me.x = HUT.x + 0.3; me.z = HUT.z + 0.5; me.y = land(me.x, me.z); me.yaw = Math.atan2(-((HUT.x - 0.6) - me.x), -((HUT.z - 0.9) - me.z)); me.pitch = -0.72; }
}
