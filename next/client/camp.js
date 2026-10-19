// The camp around the fire: your old desk in the leaders' hut, and the odds board. (LORE.md: the leaders soften the odds; the truth is
// there only for whoever goes and checks; the humor lives in the paperwork and the board's footnotes.) Numbers carry his labels:
// reasoned (worked out from what really happened), guess (no proof yet). None of them is decoration.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from '../../vendor/jsm/utils/SkeletonUtils.js';

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
    // camp people: each speaks from what really happened, one line at a time, never repeating while a fresh one is left (IMMERSION.md)
    this.people = []; this.heard = new Set();
    const PEOPLE = [{ role: 'the Clerk', url: 'c/survivor.glb', x: 3.2, z: -5.2, anim: 'SitIdle', h: 1.75 }, { role: 'the Night worker', url: 'c/soldier.glb', x: 0, z: -17, anim: 'Idle_Gun', walk: 'Walk', h: 1.8 }, { role: 'a Council member', url: 'c/survivor.glb', x: -10.8, z: 7.2, anim: 'Idle', h: 1.7 }];
    for (const P of PEOPLE) L.loadAsync('../assets/' + P.url).then(r => {
      r.scene.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(r.scene), o = skClone(r.scene); o.scale.setScalar(P.h / b.getSize(new THREE.Vector3()).y);   /* (measured on the original: a copy of an animated model measures wrong) */ o.position.set(P.x, land(P.x, P.z), P.z); o.rotation.y = Math.atan2(-P.x, -P.z);
      o.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.material = m.material.clone(); m.material.color.lerp(new THREE.Color(0x2a2e38), 0.55); m.castShadow = false; } });   /* (worn, muted clothes: grounded near) */
      if (P.anim === 'SitIdle') put('kit/box-large.glb', P.x, P.z, 1.6, 0.4);   /* (something to sit on) */
      const lamp = new THREE.PointLight(0xcfe0ff, 5, 6, 1.5); lamp.position.set(P.x + 0.6, land(P.x, P.z) + 1.4, P.z + 0.4); scene.add(lamp);   // (each person keeps a small lantern: you see who is talking)
      const mix = new THREE.AnimationMixer(o), clip = r.animations.find(a => a.name.endsWith('|' + P.anim) || a.name.endsWith(P.anim)); if (clip) mix.clipAction(clip).play();
      const walk = P.walk && r.animations.find(a => a.name.endsWith('|' + P.walk)), acts = { idle: clip ? mix.clipAction(clip) : null, walk: walk ? mix.clipAction(walk) : null };
      if (P.lamp === false) scene.remove(lamp); else if (P.walk) { scene.remove(lamp); }
      scene.add(o); this.people.push({ ...P, o, mix, acts, moving: false, ang: Math.atan2(P.z, P.x), line: '', lineT: 0 }); }).catch(() => {});
    this.sub = Object.assign(document.createElement('div'), { id: 'sub' }); Object.assign(this.sub.style, { position: 'fixed', left: '50%', bottom: '172px', transform: 'translateX(-50%)', maxWidth: 'min(680px, 90vw)', textAlign: 'center', fontSize: '21px', lineHeight: '1.3', textShadow: '0 1px 3px #000, 0 0 2px #000', pointerEvents: 'none' }); this.sub.hidden = true; document.getElementById('hud').append(this.sub);
    this.yard(L, land);
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
  lines(role) {   // (every line is written from the live world: the night, the board, the fire, yesterday's record)
    const g = this.ctx.g(), me = this.ctx.me(), o = this.odds(), y = g.history[g.history.length - 1], out = [];
    if (role === 'the Clerk') {
      if (me.carried > 0) out.push(`You're carrying ${Math.floor(me.carried)} light. The fire is right there. I'm only saying.`);
      out.push(`Night ${g.night}. The board says ${o.council}%. The board says a lot of things.`);
      if (y && y.falls > 0) out.push('Form 9-C is for when someone stops being anywhere. We are out of 9-C.');
      if (this.checkedNight === g.night) out.push('You checked the real odds. Nobody checks. Huh.');
      out.push("I don't make the quotas. I laminate them.");
    } else if (role === 'the Night worker') {
      out.push(g.fire.level ? `Fire's at level ${g.fire.level}. Something out there noticed. It always does.` : 'Fire is small. The dark is not. That is the whole job description.');
      if ((g.marks || []).some(m => m.k === 'wreck')) out.push('A relay went dark out there. I filed it under expected.');
      if (y && y.tense < 0.2) out.push("Quiet night. I don't trust it either.");
      out.push('Light the edge, keep your back to the fire. Not the other way around.');
    } else {
      out.push(`Survival today is ${o.council}%. Officially. We round with compassion.`);
      out.push('The real number upsets people. Upset people do not feed fires.');
      if (this.checkedNight === g.night) out.push("You went and looked, didn't you. Of course you did. You signed those for years.");
    }
    return out;
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
    const cam = this.ctx.camera(), v = new THREE.Vector3();
    let talk = null, best = 1e9; const fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw);
    for (const P of this.people) {
      P.mix.update(1 / 60); const d = Math.hypot(me.x - P.o.position.x, me.z - P.o.position.z);
      if (P.walk) {   // (the night worker walks the wall, and stops to talk when you come close)
        const stop = d < 4.5; if (stop !== P.moving || !P.started) { P.started = true; const a = stop ? P.acts.idle : P.acts.walk, b = stop ? P.acts.walk : P.acts.idle; if (a) a.reset().fadeIn(0.4).play(); if (b) b.fadeOut(0.4); P.moving = stop; }
        if (!stop) { P.ang += (1.25 / 17) / 60; const x = Math.cos(P.ang) * 17, z = Math.sin(P.ang) * 17; P.o.position.set(x, this.ctx.land(x, z), z); P.o.rotation.y = Math.atan2(-Math.sin(P.ang), Math.cos(P.ang)); }
        else P.o.rotation.y = Math.atan2(me.x - P.o.position.x, me.z - P.o.position.z);
      }
      if (d < 4.5 && (P.lineT -= 1 / 60) <= 0) { const all = this.lines(P.role), fresh = all.filter(l => !this.heard.has(l)); P.line = (fresh.length ? fresh : all)[0]; this.heard.add(P.line); P.lineT = 9; }
      if (d >= 6) P.lineT = 0;
      const facing = ((P.o.position.x - me.x) * fx + (P.o.position.z - me.z) * fz) / Math.max(d, 0.01);
      if (d < 4.5 && facing > 0.5 && P.line && d < best) { best = d; talk = P; }
    }
    if (this.voice && this.voice.until > performance.now()) { const t = `<span style="color:#b9a8ff">${this.voice.role[0].toUpperCase() + this.voice.role.slice(1)}</span>&nbsp; ${this.voice.line}`; this.sub.hidden = false; if (this.sub.innerHTML !== t) this.sub.innerHTML = t; return; }   // (the guide's voice comes first while it speaks)
    this.sub.hidden = !talk; if (talk) { const t = `<span style="color:#b9a8ff">${talk.role[0].toUpperCase() + talk.role.slice(1)}</span>&nbsp; ${talk.line.replace(/[<>&]/g, '')}`; if (this.sub.innerHTML !== t) this.sub.innerHTML = t; }
  }
  // the yard: a fortified wall with one gate, tents and bedrolls, a workshop, a store, stones in the dark outside (grounded near; CC0 Kenney kit)
  yard(L, land) {
    const cache = {}, get = url => cache[url] || (cache[url] = L.loadAsync('../assets/' + url).then(r => { r.scene.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(r.scene), s = b.getSize(new THREE.Vector3()); return { scene: r.scene, s }; }).catch(() => null));
    const put = (url, x, z, size, ry = 0, sink = 0) => get(url).then(m => { if (!m) return null; const o = m.scene.clone(); o.scale.setScalar(size / Math.max(m.s.x, m.s.z)); o.position.set(x, land(x, z) - sink, z); o.rotation.y = ry;  this.scene.add(o); return o; });
    const face = (x, z) => Math.atan2(-x, -z);   // (turns a thing's front toward the fire)
    const R = 21, SEG = 2.7, n = Math.round(2 * Math.PI * R / SEG), GATE = Math.PI / 2;   // (the gate faces out past the hut's side)
    get('kit/fence-fortified.glb').then(m => { if (!m) return; const along = m.s.x >= m.s.z ? 0 : Math.PI / 2;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, gap = Math.abs(Math.atan2(Math.sin(a - GATE), Math.cos(a - GATE))); if (gap < 0.12) continue;
        const x = Math.cos(a) * R, z = Math.sin(a) * R; put('kit/fence-fortified.glb', x, z, SEG * 1.04, -a - Math.PI / 2 + along, 0.05); } });
    const gx = Math.cos(GATE) * R, gz = Math.sin(GATE) * R;
    for (const s of [-1, 1]) { const x = gx + s * 2.2, z = gz, post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22), new THREE.MeshStandardMaterial({ color: 0x23262f, roughness: 0.6, metalness: 0.3 })); post.position.set(x, land(x, z) + 1.7, z);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: 0x7fd8ff, emissiveIntensity: 1.6 })); head.position.set(x, land(x, z) + 3.5, z); this.scene.add(post, head); }
    put('kit/signpost.glb', gx + 3.4, gz + 2.2, 1.0, Math.PI);
    // where people sleep: tents in an arc on the far side of the fire, a bedroll at each door
    [[200, 'kit/tent-canvas.glb', 3.8], [228, 'kit/tent-canvas.glb', 3.4], [256, 'kit/tent-canvas.glb', 3.8], [284, 'kit/tent-canvas.glb', 3.4], [170, 'kit/tent-canvas.glb', 3.4]].forEach(([deg, url, w]) => {
      const a = deg * Math.PI / 180, x = Math.cos(a) * 14, z = Math.sin(a) * 14; put(url, x, z, w, face(x, z));
      const bx = Math.cos(a) * 11.4, bz = Math.sin(a) * 11.4; put('kit/bedroll.glb', bx, bz, 1.9, face(bx, bz) + 0.2); });
    // the workshop: a bench, planks, barrels and a chest by the wall
    const W = (deg, r) => { const a = deg * Math.PI / 180; return [Math.cos(a) * r, Math.sin(a) * r]; };
    { const [x, z] = W(32, 15); put('kit/workbench.glb', x, z, 2.4, face(x, z)); }
    { const [x, z] = W(40, 17); put('kit/planks.glb', x, z, 2.0, 0.4); }
    for (const [deg, r] of [[20, 17.6], [24, 18.2], [17, 18.6]]) { const [x, z] = W(deg, r); put('kit/barrel.glb', x, z, 0.75, deg); }
    { const [x, z] = W(47, 16.5); put('kit/chest.glb', x, z, 1.1, face(x, z)); }
    { const [x, z] = W(55, 17.2); put('kit/box-large.glb', x, z, 1.2, 0.3); put('kit/box-large.glb', x + 0.4, z + 1.1, 1.0, 1.1); }
    // the store: metal walls by the wall, the camp's stock behind them
    { const [x, z] = W(-15, 17.5); put('kit/structure-metal-wall.glb', x, z, 3.4, face(x, z)); }
    { const [x, z] = W(-3, 17.8); put('kit/structure-metal-wall.glb', x, z, 3.4, face(x, z)); }
    { const [x, z] = W(-9, 19.2); put('kit/box-large.glb', x, z, 1.3, 0.2); }
    // three hanging lamps: the tents, the workshop, the store (each lit corner reads as a place, not a floor)
    for (const [deg, r] of [[237, 10.5], [36, 13], [-9, 14]]) { const [x, z] = W(deg, r), y = land(x, z), l = new THREE.PointLight(0xcfe0ff, 9, 13, 1.4); l.position.set(x, y + 2.8, z);
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3, 0.12), new THREE.MeshStandardMaterial({ color: 0x23262f, roughness: 0.6 })); pole.position.set(x, y + 1.5, z);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.26), new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: 0xcfe0ff, emissiveIntensity: 1.4 })); bulb.position.set(x, y + 3.05, z); this.scene.add(l, pole, bulb); }
    // outside: stones and rubble in the dark, so the land is somewhere and not a floor
    let q = 7; const rnd = () => (q = (q * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, r = 24 + rnd() * 50, x = Math.cos(a) * r, z = Math.sin(a) * r; put('kit/stone.glb', x, z, 0.5 + rnd() * rnd() * 2.6, rnd() * 6.3, 0.15); }
    for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, r = 4 + rnd() * 15, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.hypot(x - HUT.x, z - HUT.z) < 5 || Math.hypot(x - BOARD.x, z - BOARD.z) < 3 || r < 5) continue; put('kit/stone.glb', x, z, 0.25 + rnd() * 0.35, rnd() * 6.3, 0.05); }
  }
  speak(role, line, sec) { this.voice = { role, line: line.replace(/[<>&]/g, ''), until: performance.now() + sec * 1000 }; }
  // a new world starts you at your old desk, facing the two papers
  static startAt(me, land) { me.x = HUT.x + 0.3; me.z = HUT.z + 0.5; me.y = land(me.x, me.z); me.yaw = Math.atan2(-((HUT.x - 0.6) - me.x), -((HUT.z - 0.9) - me.z)); me.pitch = -0.72; }
}
