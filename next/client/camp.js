// The camp around the fire: your old desk in the leaders' hut, and the odds board. (LORE.md: the leaders soften the odds; the truth is
// there only for whoever goes and checks; the humor lives in the paperwork and the board's footnotes.) Numbers carry his labels:
// reasoned (worked out from what really happened), guess (no proof yet). None of them is decoration.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from '../../vendor/jsm/utils/SkeletonUtils.js';

export const HUT = { x: -9, z: 9 }, BOARD = { x: 5, z: -4 };
// the night worker's pace: a calm patrol, 1.1 to 1.45 m/s, new each leg (people stroll at 1.2 to 1.4). The soldier's Walk clip, at its own 1.82 m
// size, carries its planted foot back 0.55 m in 0.40 s: 1.39 m/s of ground per clip second, so the clip plays at pace / (1.39 x his scale)
const PACE = [1.1, 1.45], CLIP_WALK = 1.39;
// how people read as people and not bots (ambient-life practice, Red Dead 2 and the idle layering tools): nobody walks a metronome loop, stops have a
// reason (a lamp, the gate, the wall), the eyes lead and the head and neck follow inside natural limits, the chest breathes, turns take a beat
const FADE = 0.3, TURN = 7, LOOK = 5;   // (clip cross-fade in s; body turn rate, 95% of any turn in 0.43 s; head follow rate, 95% in 0.6 s)
const _v = new THREE.Vector3(), _f = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _pi = new THREE.Quaternion(), _m = new THREE.Matrix4(), _b = new THREE.Box3();
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a)), ease = (k, dt) => 1 - Math.exp(-k * dt), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), rnd = (a, b) => a + Math.random() * (b - a);
function bend(bone, ry, yaw, pitch) {   // (turns one bone by a yaw and pitch in the world, measured from the body's facing ry, on top of whatever the clip posed)
  _f.set(Math.sin(ry), 0, Math.cos(ry)); _d.set(Math.sin(ry + yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(ry + yaw) * Math.cos(pitch));
  _q.setFromUnitVectors(_f, _d); bone.parent.getWorldQuaternion(_pq); _pi.copy(_pq).invert(); _q.multiply(_pq).premultiply(_pi); bone.quaternion.premultiply(_q);
}
function fade(P, to, t = FADE) { if (!to || P.cur === to) return; to.reset(); to.setEffectiveWeight(1); to.play(); if (P.cur) P.cur.crossFadeTo(to, t, false); P.cur = to; }
// where the night worker stops (angles around the fire, in degrees; look = what he turns to). Kept in step with the yard below and PAD and STORE in core and main
const POSTS = [{ a: 90, look: [0, 34, 1.6], hold: [5, 9], scan: true },   // (the gate: he watches the dark through it)
  { a: -50, look: [11, -13, 2], hold: [3, 6] },   // (the lander on its pad)
  { a: 34, look: [Math.cos(0.56) * 15, Math.sin(0.56) * 15, 0.9], hold: [3, 5], act: 1 },   // (the workshop bench: he checks something on it)
  { a: -9, look: [15.8, -2.5, 1.2], hold: [3, 5], act: 1 },   // (the store behind the metal walls)
  { a: 237, look: [Math.cos(4.14) * 10.5, Math.sin(4.14) * 10.5, 2.4], hold: [4, 7] },   // (the lamp over the sleepers)
  { wall: true, hold: [3, 6], act: 0.5, scan: true },   // (any stretch of wall: tests it, looks out past it)
  { fire: true, hold: [4, 8] }];   // (anywhere: stands looking at the fire a while)
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
    const lamp = new THREE.PointLight(0xdfe6ff, 3, 9, 1.6);   /* (was 6: the papers under it blew out to pure white and flashed his eyes, 2026-10-19) */ lamp.position.set(HUT.x, land(HUT.x, HUT.z) + 2.4, HUT.z); scene.add(lamp);
    const name = ctx.name();
    const form = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.6), new THREE.MeshStandardMaterial({ color: 0x8a8d99, roughness: 1, map: paper([['FORM 12-A: MORNING ODDS', 34, '#2b3a8f'], ['Survival today: 92%', 44], ['(approved by the council)', 26, '#555a6e'], [`Signed: ${name}`, 30], ['Please do not round down.', 24, '#8a2b4f']]), roughness: 0.9 }));
    const real = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.6), new THREE.MeshStandardMaterial({ color: 0x8a8d99, roughness: 1, map: paper([['the real one', 34, '#6b2fa0'], ['Survival today: 81%  (reasoned)', 34], ['Past the dark: 0.0000031%  (guess)', 30], ['not zero.', 40, '#8a2b4f']]), roughness: 0.9 }));
    const deskY = land(HUT.x - 0.6, HUT.z - 0.9) + 1.06;
    form.rotation.x = real.rotation.x = -Math.PI / 2; form.rotation.z = 0.5; real.rotation.z = 0.75;
    form.position.set(HUT.x - 0.95, deskY, HUT.z - 1.05); real.position.set(HUT.x - 0.2, deskY + 0.002, HUT.z - 0.7); scene.add(form, real);
    desk.then(o => { if (!o) return; o.updateMatrixWorld(true); const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);   // (each paper dropped straight down onto whatever is really under it)
      for (const [pp, lift] of [[form, 0.004], [real, 0.006]]) { ray.set(new THREE.Vector3(pp.position.x, pp.position.y + 3, pp.position.z), down); const hit = ray.intersectObject(o, true)[0]; if (hit) pp.position.y = hit.point.y + lift; } });
    // the board: a dark panel on a post at the edge of the fire's light, redrawn only when what it shows changes
    this.bc = document.createElement('canvas'); this.bc.width = 768; this.bc.height = 480; this.btex = new THREE.CanvasTexture(this.bc); this.btex.colorSpace = THREE.SRGBColorSpace;
    const by = land(BOARD.x, BOARD.z); const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.7 })); post.position.set(BOARD.x, by + 1.1, BOARD.z);
    this.board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.25), new THREE.MeshBasicMaterial({ map: this.btex, color: 0xc4c4c4 }));   /* (a hair under the bloom threshold: no halo behind its big numbers, his rule) */ this.board.position.set(BOARD.x, by + 2.7, BOARD.z); this.board.rotation.y = Math.atan2(-BOARD.x, -BOARD.z);
    const glow = new THREE.PointLight(0xff4fd8, 3, 6, 1.6); glow.position.set(BOARD.x, by + 2.7, BOARD.z + 0.6); scene.add(post, this.board, glow);
    // the CHECK key: shown only when you stand at the board (click it, or press C)
    this.btn = Object.assign(document.createElement('button'), { className: 'bk', innerHTML: 'CHECK THE REAL ODDS<small>(the board shows what the council approved)</small>' });
    Object.assign(this.btn.style, { position: 'fixed', left: '50%', top: '55%', transform: 'translateX(-50%)', display: 'none', zIndex: 4 }); document.getElementById('hud').append(this.btn);
    this.btn.onclick = () => this.check(); addEventListener('keydown', e => { if (e.code === 'KeyC' && this.near) this.check(); });
    // camp people: each speaks from what really happened, one line at a time, never repeating while a fresh one is left (IMMERSION.md)
    this.people = []; this.heard = new Set();
    // (the soldier's Idle_Gun and Idle hold a rifle he does not carry: Idle_Neutral has his arms at rest; Interact reaches out to check a thing)
    const PEOPLE = [{ role: 'the Clerk', url: 'c/survivor.glb', x: 3.2, z: -5.2, anim: 'SitIdle', h: 1.75, chain: [['Spine2', 0.2], ['Neck', 0.3], ['Head', 0.5]], chest: 'Spine1', yawMax: 1.05 },
      { role: 'the Night worker', url: 'c/soldier.glb', x: 0, z: -17, anim: 'Idle_Neutral', walk: 'Walk', act: 'Interact', h: 1.8, chain: [['Chest', 0.2], ['Neck', 0.3], ['Head', 0.5]], chest: 'Chest', yawMax: 1.2 },
      { role: 'a Council member', url: 'c/survivor.glb', x: -10.8, z: 7.2, anim: 'Idle', h: 1.7 }];
    for (const P of PEOPLE) L.loadAsync('../assets/' + P.url).then(r => {
      r.scene.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(r.scene), o = skClone(r.scene); o.scale.setScalar(P.h / b.getSize(new THREE.Vector3()).y);   /* (measured on the original: a copy of an animated model measures wrong) */ o.position.set(P.x, land(P.x, P.z), P.z); o.rotation.y = Math.atan2(-P.x, -P.z);
      o.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.material = m.material.clone(); m.material.color.lerp(new THREE.Color(0x2a2e38), 0.55); m.castShadow = false; } });   /* (worn, muted clothes: grounded near) */
      const lamp = new THREE.PointLight(0xcfe0ff, 5, 6, 1.5); lamp.position.set(P.x + 0.6, land(P.x, P.z) + 1.4, P.z + 0.4); scene.add(lamp);   // (each person keeps a small lantern: you see who is talking)
      const mix = new THREE.AnimationMixer(o), find = n => n && r.animations.find(a => a.name.endsWith('|' + n)), clip = find(P.anim) || r.animations.find(a => a.name.endsWith(P.anim));
      const walk = find(P.walk), act = find(P.act), acts = { idle: clip ? mix.clipAction(clip) : null, walk: walk ? mix.clipAction(walk) : null, act: act ? mix.clipAction(act) : null };
      if (acts.idle) { acts.idle.play(); acts.idle.time = Math.random() * clip.duration; }   /* (each starts somewhere in its idle: no two people breathe in step) */
      if (acts.act) { acts.act.setLoop(THREE.LoopOnce, 1); acts.act.clampWhenFinished = true; }
      const bone = n => o.getObjectByName(n), chain = (P.chain || []).map(([n, w]) => [bone(n), w]).filter(c => c[0]), chest = P.chest && bone(P.chest);
      const rest = [...chain.map(c => c[0]), chest].filter(Boolean).map(b => [b, b.quaternion.clone()]);   /* (bones a clip leaves alone, like the soldier's neck, go back to rest each frame so the look never adds up) */
      if (P.anim === 'SitIdle') { const ry = o.rotation.y; put('kit/box-large.glb', P.x, P.z, 1.6, ry + Math.PI / 2).then(bx => {   /* (something to sit on: its 0.4 m depth runs along her facing, a crate bench) */
        if (!bx) return; mix.update(0); o.updateMatrixWorld(true); const top = _b.setFromObject(bx).max.y, hips = bone('Hips').getWorldPosition(new THREE.Vector3()); let low = 1e9;
        o.traverse(m => { if (!m.isSkinnedMesh) return; for (let i = 0, n = m.geometry.attributes.position.count; i < n; i++) { m.getVertexPosition(i, _v).applyMatrix4(m.matrixWorld); if (Math.hypot(_v.x - hips.x, _v.z - hips.z) < 0.12 && _v.y < low) low = _v.y; } });
        if (low < 1e8) o.position.y += top - low; }); }   /* (her seat is the lowest skin under her hips, measured once in the clip's own pose and set on the box top: she sat 3 cm into it) */
      if (P.lamp === false) scene.remove(lamp); else if (P.walk) { scene.remove(lamp); }
      scene.add(o); this.people.push({ ...P, lamp: P.walk ? null : lamp, o, mix, acts, chain, chest, rest, cur: acts.idle, head: bone('Head'), lyaw: 0, lpitch: 0, gYaw: 0, gPitch: 0, gT: 0, br: Math.random() * 6.3, clock: 0,
        state: 'stop', a: Math.atan2(P.z, P.x), r: Math.hypot(P.x, P.z), goal: Math.atan2(P.z, P.x), dir: 1, pace: 1.3, hold: 0, actT: 0, post: null, last: [], yawT: o.rotation.y, line: '', lineT: 0 }); }).catch(() => {});
    this.sub = Object.assign(document.createElement('div'), { id: 'sub' }); Object.assign(this.sub.style, { position: 'fixed', left: '50%', bottom: '172px', transform: 'translateX(-50%)', maxWidth: 'min(680px, 90vw)', textAlign: 'center', fontSize: '21px', lineHeight: '1.3', textShadow: '0 1px 3px #000, 0 0 2px #000', pointerEvents: 'none' }); this.sub.hidden = true; document.getElementById('hud').append(this.sub);
    this.yard(L, land);
    // the wall of theories by the hut: every survivor's guess at what the dark is, with odds that what you find moves; none ever reads 'checked'
    this.tc = document.createElement('canvas'); this.tc.width = 768; this.tc.height = 512; this.ttex = new THREE.CanvasTexture(this.tc); this.ttex.colorSpace = THREE.SRGBColorSpace;
    const tx = -7, tz = 13.5, ty = land(tx, tz), wall = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.73), new THREE.MeshBasicMaterial({ map: this.ttex, color: 0xc4c4c4 }));
    wall.position.set(tx, ty + 2.1, tz); wall.rotation.y = Math.atan2(-tx, -tz); const legs = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x15171d })); legs.position.set(tx, ty + 0.6, tz); this.scene.add(wall, legs); this.tdrawn = '';
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
    const g = this.ctx.g(), o = this.odds(), real = this.checkedNight === g.night, st = this.ctx.stakes ? this.ctx.stakes() : null, ec = this.ctx.econ ? this.ctx.econ() : null, key = [real, o.surv, o.past.toPrecision(2), g.night, this.footnote(), st && st.n, ec && ec.key].join('|'); if (key === this.drawn) return; this.drawn = key;
    const c = this.bc.getContext('2d'); c.fillStyle = '#05060b'; c.fillRect(0, 0, 768, 480); c.strokeStyle = real ? '#ff4fd8' : '#b9a8ff'; c.lineWidth = 8; c.strokeRect(8, 8, 752, 464);
    c.fillStyle = real ? '#ff4fd8' : '#b9a8ff'; c.font = '500 46px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillText(real ? `THE REAL ODDS, DAY ${g.night}` : `SURVIVAL TODAY, DAY ${g.night}`, 36, 76);
    c.fillStyle = '#fff'; c.font = '500 170px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillText(`${real ? o.surv : o.council}%`, 36, 250);
    c.font = '400 32px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillStyle = '#a3a6bb'; c.fillText(real ? `(${o.label}: from the last ${Math.min(3, g.history.length) || 'no'} nights)` : '(approved by the council)', 40, 300);
    c.fillStyle = '#ff6fb1'; c.font = '400 34px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillText(this.footnote().slice(0, 52), 40, 362);
    c.fillStyle = real ? '#3dff9a' : '#6f7188'; c.font = '400 32px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillText(real ? `past the dark: ${(o.past).toFixed(7)}%  (guess)` : 'have a nice day.', 40, 430);
    if (ec) { c.fillStyle = '#a3a6bb'; c.font = '400 24px "Barlow Condensed", "Arial Narrow", sans-serif'; c.textAlign = 'right'; c.fillText(`each person the fire lights owes ${ec.burn} light a day`, 728, 150); c.fillStyle = ec.standing >= 0 ? '#b9a8ff' : '#ff3b5c'; c.fillText(`your standing ${ec.standing >= 0 ? '+' : ''}${ec.standing}   camp morale ${ec.morale}%`, 728, 180); if (ec.pool > 0) { c.fillStyle = '#ff6fb1'; c.fillText(`camp pool ${ec.pool} light: into the fire when friends are back`, 728, 210); } c.textAlign = 'left'; }   /* (the camp economy, in the open) */
    if (st) { c.fillStyle = '#b9a8ff'; c.font = '400 26px "Barlow Condensed", "Arial Narrow", sans-serif'; c.textAlign = 'right'; c.fillText(`your trip guesses: ${st.n}, came back ${st.back}`, 728, 76); c.fillText(`how true: ${st.brier.toFixed(2)} (0 is perfect, 0.25 is a coin)`, 728, 108); c.textAlign = 'left'; }   // (the Brier score of your own stakes: checked math, your own record)
    this.btex.needsUpdate = true;
  }
  bunkLight() {   // (your bunk shows your dues, INNOVATION.md: each bunk burns as bright as what its sleeper has fed the fire; no rule, only light)
    const g = this.ctx.g(), d = g.dues || {}, names = Object.keys(d).slice(0, (this.bunks || []).length), top = Math.max(1, ...Object.values(d));
    (this.bunks || []).forEach((b, i) => { const n = names[i], k = n ? 0.12 + 0.88 * Math.min(1, d[n] / top) : 0; b.lamp.material.emissiveIntensity = 3 * k; b.name = n; b.dues = n ? d[n] : 0; });
  }
  bunkNear(me) { for (const b of this.bunks || []) if (b.name && Math.hypot(me.x - b.x, me.z - b.z) < 2.6) return b; return null; }
  drawTheories(T) {
    const g = this.ctx.g(), th = g.theories || { mind: 0.25, creatures: 0.25, us: 0.25, heads: 0.25 }, key = Object.values(th).map(v => v.toFixed(3)).join('|'); if (key === this.tdrawn) return; this.tdrawn = key;
    const c = this.tc.getContext('2d'); c.fillStyle = '#05060b'; c.fillRect(0, 0, 768, 512); c.fillStyle = '#b9a8ff'; c.font = '500 40px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillText('WHAT IS THE DARK?', 32, 62);
    c.fillStyle = '#a3a6bb'; c.font = '400 26px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillText('nobody knows. these are guesses. what you find moves them.', 32, 98);
    Object.entries(th).sort((a, b) => b[1] - a[1]).forEach(([k, v], i) => { const y = 160 + i * 86, who = T[k].who;
      c.fillStyle = '#eef0f8'; c.font = '400 30px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillText(T[k].says, 32, y);   // (the theory on its own line, who holds it under it: nothing overlaps)
      c.fillStyle = '#a3a6bb'; c.font = '400 22px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillText(`held by ${who}`, 32, y + 28);
      c.fillStyle = '#ff4fd8'; c.fillRect(520, y + 22, Math.round(110 * v / 0.85), 6);   /* (the bar sits by the number, never over the words) */ c.fillStyle = '#eef0f8'; c.font = '500 30px "Barlow Condensed", "Arial Narrow", sans-serif'; c.textAlign = 'right'; c.fillText(`${Math.round(v * 100)}%`, 712, y + 2);
      c.fillStyle = '#a3a6bb'; c.font = '400 22px "Barlow Condensed", "Arial Narrow", sans-serif'; c.fillText('(guess)', 712, y + 30); c.textAlign = 'left'; });
    this.ttex.needsUpdate = true;
  }
  pushOut(px, pz, r = 0.35) {   /* (out of any solid camp piece, to its nearest side: boxes turned with their piece) */
    for (const [x, z, hx, hz, cs, sn] of this.solids || []) { const dx = px - x, dz = pz - z; let a = dx * cs - dz * sn, b = dx * sn + dz * cs; const ex = hx + r - Math.abs(a), ez = hz + r - Math.abs(b);
      if (ex <= 0 || ez <= 0) continue; if (ex < ez) a = Math.sign(a || 1) * (hx + r); else b = Math.sign(b || 1) * (hz + r); px = x + a * cs + b * sn; pz = z - a * sn + b * cs; }
    return [px, pz];
  }
  update(dt = 1 / 60) {   // (dt is the real frame time: a fixed 1/60 walked him 1.7 m/s at 82 fps and 3 m/s on a 144 Hz screen)
    const me = this.ctx.me(); if (!me) return; if (this.ctx.theories) this.drawTheories(this.ctx.theories); if (!this.bunkT || (this.bunkT -= dt) <= 0) { this.bunkT = 1; this.bunkLight(); } this.near = Math.hypot(me.x - BOARD.x, me.z - BOARD.z) < 4.5 && this.checkedNight !== this.ctx.g().night;
    this.btn.style.display = this.near ? 'block' : 'none'; this.draw();
    const cam = this.ctx.camera();
    let talk = null, best = 1e9; const fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw);
    const g0 = this.ctx.g(), gone = new Set([...(g0.lost || []), ...(g0.out ? [g0.out.who] : [])]);
    for (const P of this.people) {
      P.o.visible = !gone.has(P.role); if (P.lamp) P.lamp.visible = P.o.visible; if (!P.o.visible) continue;   // (out on a trip, or lost: their place by the fire is empty)
      for (const [b, q] of P.rest) b.quaternion.copy(q);
      P.mix.update(dt); const d = Math.hypot(me.x - P.o.position.x, me.z - P.o.position.z);
      if (P.walk) this.patrol(P, dt, d, me);   // (the night worker walks the wall with reasons to stop, and stops to talk when you come close)
      if (P.chain && P.chain.length) this.live(P, dt, d, cam);
      if (d < 4.5 && (P.lineT -= dt) <= 0) { const all = this.lines(P.role), fresh = all.filter(l => !this.heard.has(l)); P.line = (fresh.length ? fresh : all)[0]; this.heard.add(P.line); P.lineT = 9; }
      if (d >= 6) P.lineT = 0;
      const facing = ((P.o.position.x - me.x) * fx + (P.o.position.z - me.z) * fz) / Math.max(d, 0.01);
      if (d < 4.5 && facing > 0.5 && P.line && d < best) { best = d; talk = P; }
    }
    const who = this.voice && this.voice.until > performance.now() ? this.voice : talk ? { role: talk.role, line: talk.line.replace(/[<>&]/g, '') } : null;   // (the guide's voice first, then whoever you face)
    this.sub.hidden = true; if (who && who.line !== this.lastHeard) { this.lastHeard = who.line; if (this.ctx.hear) this.ctx.hear(who.role[0].toUpperCase() + who.role.slice(1), who.line); }   // (what people say comes through your wrist: his UI rule)
  }
  // the night worker's round: walk the lane to a reason to stop, stand there a few seconds doing something, pick a new place (never the last two)
  patrol(P, dt, d, me) {
    const land = this.ctx.land, A = P.acts; if ((this.laneT = (this.laneT ?? 3) - dt) <= 0) { this.laneT = 30; this.scanLane(); }   /* (the lane is measured 3 s in, once the yard stands, then every 30 s as things are built) */
    if (d < 4.5 && P.state !== 'talk') { P.state = 'talk'; fade(P, A.idle); }
    if (P.state === 'talk') { P.yawT = Math.atan2(me.x - P.o.position.x, me.z - P.o.position.z); if (d >= 4.5) { P.state = 'stop'; P.hold = rnd(0.6, 1.4); P.post = null; } }   // (he watches you go a moment before he moves on)
    else if (P.state === 'stop') {
      if (P.actT > 0 && (P.actT -= dt) <= 0) fade(P, A.idle);
      if ((P.hold -= dt) <= 0) { this.nextLeg(P); P.state = 'walk'; fade(P, A.walk); }
    }
    // moving: speed rides the walk clip's own blend weight, so he eases in and out over the cross-fade and the feet stay matched
    const w = A.walk ? A.walk.getEffectiveWeight() : 0; if (w > 0.01) {
      const rem = Math.abs(wrap(P.goal - P.a)) * P.r; let step = P.pace * w * dt; if (P.state === 'walk') step = Math.min(step, rem);
      P.a += P.dir * step / P.r; P.r += (this.laneAt(P.a) - P.r) * ease(3, dt);
      const x = Math.cos(P.a) * P.r, z = Math.sin(P.a) * P.r, dx = x - P.o.position.x, dz = z - P.o.position.z;
      if (dx * dx + dz * dz > 1e-8 && P.state === 'walk') P.yawT = Math.atan2(dx, dz);
      P.o.position.set(x, land(x, z) + this.liftAt(P.a), z);
      if (P.state === 'walk' && rem - step < 0.22) { const S = P.post; P.state = 'stop'; P.hold = rnd(S.hold[0], S.hold[1]);   // (arrived: a short stop, with something to do)
        if (A.act && S.act && Math.random() < S.act) { A.act.timeScale = rnd(0.85, 1); fade(P, A.act); P.actT = A.act.getClip().duration / A.act.timeScale - FADE; } else fade(P, A.idle);
        A.idle.timeScale = rnd(0.85, 1.1); }
    }
    if (P.state === 'stop' && P.post) P.yawT = Math.atan2(P.post.lx - P.o.position.x, P.post.lz - P.o.position.z);
    P.o.rotation.y += wrap(P.yawT - P.o.rotation.y) * ease(TURN, dt);   // (turns take a beat: no snapping round)
  }
  nextLeg(P) {
    let S, goal = P.a; for (let k = 0; k < 8; k++) { const i = Math.floor(Math.random() * POSTS.length); if (P.last.includes(i)) continue; S = POSTS[i];
      goal = S.a !== undefined ? S.a * Math.PI / 180 : P.a + (Math.random() < 0.75 ? P.dir : -P.dir) * rnd(0.6, 1.8); if (Math.abs(wrap(goal - P.a)) < 0.3) { S = null; continue; }
      P.last = [i, ...P.last].slice(0, 2); break; }
    if (!S) { S = POSTS[POSTS.length - 1]; goal = P.a + P.dir * rnd(0.6, 1.4); }
    P.goal = wrap(goal); P.dir = Math.sign(wrap(goal - P.a)) || 1; P.pace = rnd(PACE[0], PACE[1]);
    if (P.acts.walk) P.acts.walk.timeScale = P.pace / (CLIP_WALK * P.o.scale.x);   /* (steps matched to the ground at this leg's pace: no sliding feet) */
    const lx = S.look ? S.look[0] : S.wall ? Math.cos(goal) * 34 : 0, lz = S.look ? S.look[1] : S.wall ? Math.sin(goal) * 34 : 0;
    P.post = { hold: S.hold, act: S.act, scan: S.scan, lx, lz, ly: S.look ? S.look[2] : S.wall ? 1.5 : 0.7 };
  }
  // a person alive in place: the chest breathes, the eyes go somewhere (you, the fire, the job, the dark), the neck and head follow within a person's limits
  live(P, dt, d, cam) {
    const ry = P.o.rotation.y, land = this.ctx.land; P.clock += dt; P.br += dt * (P.walk ? 2 * Math.PI / 3.4 : 2 * Math.PI / 4.3);
    if ((P.gT -= dt) <= 0) {   // (a new glance every few seconds: mostly ahead, sometimes off to one side)
      P.gT = rnd(2, 6); const r = Math.random(); P.gYaw = r < 0.55 ? 0 : (Math.random() < 0.5 ? -1 : 1) * rnd(0.3, 0.75); P.gPitch = P.walk ? -0.1 : rnd(-0.12, 0.05);
      P.glance = P.walk ? null : r < 0.5 ? 'fire' : r < 0.75 && this.people.some(Q => Q.walk && Q.o.visible && Q.o.position.distanceTo(P.o.position) < 14) ? 'worker' : null; }   // (seated: mostly the fire, the night worker as he passes, else off into the dark)
    let tx = null, ty = 0, tz = 0;
    if (d < 6 && cam) { tx = cam.position.x; ty = cam.position.y; tz = cam.position.z; }   // (you, when you are near)
    else if (P.walk && P.state === 'stop' && P.post && !P.post.scan) { tx = P.post.lx; tz = P.post.lz; ty = land(tx, tz) + P.post.ly; }
    else if (P.walk && P.state === 'stop' && P.post) { P.gYaw = Math.sin(P.clock * 0.55) * 0.6; P.gPitch = -0.03; }   // (scanning the dark, slowly side to side)
    else if (P.glance === 'fire') { tx = 0; tz = 0; ty = land(0, 0) + 0.6; }
    else if (P.glance === 'worker') { const Q = this.people.find(Q => Q.walk); tx = Q.o.position.x; tz = Q.o.position.z; ty = Q.o.position.y + 1.6; }
    let yaw = P.gYaw, pitch = P.gPitch;
    if (tx !== null) { P.head.getWorldPosition(_v); const dx = tx - _v.x, dz = tz - _v.z, y = wrap(Math.atan2(dx, dz) - ry);
      if (Math.abs(y) < P.yawMax + 0.4) { yaw = y; pitch = Math.atan2(ty - _v.y, Math.hypot(dx, dz)); } }   // (past what a neck can do, he lets it go: nobody stares over their own shoulder)
    yaw = clamp(yaw, -P.yawMax, P.yawMax); pitch = clamp(pitch, -0.35, 0.3); const k = ease(LOOK, dt); P.lyaw += (yaw - P.lyaw) * k; P.lpitch += (pitch - P.lpitch) * k;
    if (P.chest) bend(P.chest, ry, 0, Math.sin(P.br) * (P.walk ? 0.015 : 0.022));   // (breath: the chest rises and settles, 14 breaths a minute seated)
    for (const [b, w] of P.chain) bend(b, ry, P.lyaw * w, P.lpitch * w);
  }
  // the lane he walks: for each of 120 directions around the fire, the radius (11.5 to 20.3 m) nearest his last that clears every built thing by 0.45 m,
  // and how high any low platform under it stands (the lander pad), measured from the scene's own boxes, then smoothed so he never zigzags
  laneAt(a) { const L = this.lane; if (!L) return 17; const f = ((a / (2 * Math.PI)) * 120 % 120 + 120) % 120, i = Math.floor(f), t = f - i; return L.r[i] + (L.r[(i + 1) % 120] - L.r[i]) * t; }
  liftAt(a) { const L = this.lane; if (!L) return 0; const i = Math.round(((a / (2 * Math.PI)) * 120 % 120 + 120) % 120) % 120; return L.lift[i]; }
  scanLane() {
    const land = this.ctx.land, obs = [], low = [], sz = _v;
    this.scene.traverse(o => { if (!o.isMesh || o.isSkinnedMesh) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const one = M => { _b.copy(o.geometry.boundingBox).applyMatrix4(M); _b.getSize(sz); const cx = (_b.min.x + _b.max.x) / 2, cz = (_b.min.z + _b.max.z) / 2, rc = Math.hypot(cx, cz);
        if (rc < 8 || rc > 24 || sz.x > 12 || sz.z > 12) return; const g = land(cx, cz), h = _b.max.y - g; if (h < 0.06 || _b.min.y > g + 1.9) return;
        (h <= 0.35 && sz.x > 1.5 && sz.z > 1.5 ? low : obs).push([_b.min.x, _b.min.z, _b.max.x, _b.max.z, h]); };
      if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, _m); _m.premultiply(o.matrixWorld); one(_m); } else one(o.matrixWorld); });
    const N = 120, R0 = 11.5, NR = 36, free = new Uint8Array(N * NR), r = new Float32Array(N), lift = new Float32Array(N), M = 0.45;
    for (let i = 0; i < N; i++) { const a = i / N * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a);
      for (let j = 0; j < NR; j++) { const x = c * (R0 + j * 0.25), z = s * (R0 + j * 0.25); free[i * NR + j] = obs.some(B => x > B[0] - M && x < B[2] + M && z > B[1] - M && z < B[3] + M) ? 0 : 1; } }
    let prev = 18.4; for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) { let best = prev, cost = 1e9;   // (twice round, so the first direction knows where the last one ended)
      for (let j = 0; j < NR; j++) { if (!free[i * NR + j]) continue; const rr = R0 + j * 0.25, cc = Math.abs(rr - prev) + 0.35 * Math.abs(rr - 18.4); if (cc < cost) { cost = cc; best = rr; } } r[i] = prev = best; }
    for (let i = 0; i < N; i++) { const s = (r[(i + N - 2) % N] + r[(i + N - 1) % N] + r[i] + r[(i + 1) % N] + r[(i + 2) % N]) / 5, j = Math.round((s - R0) / 0.25); if (free[i * NR + j]) r[i] = s; }
    for (let i = 0; i < N; i++) { const a = i / N * 2 * Math.PI, x = Math.cos(a) * r[i], z = Math.sin(a) * r[i]; for (const B of low) if (x > B[0] && x < B[2] && z > B[1] && z < B[3]) lift[i] = Math.max(lift[i], B[4]); }
    this.lane = { r, lift };
  }
  // the yard: a fortified wall with one gate, tents and bedrolls, a workshop, a store, stones in the dark outside (grounded near; CC0 Kenney kit)
  yard(L, land) {
    const cache = {}, get = url => cache[url] || (cache[url] = L.loadAsync('../assets/' + url.split('#')[0]).then(r => { const part = url.split('#')[1]; if (part) { const n = r.scene.getObjectByName(part).clone(); n.position.set(0, 0, 0); r = { scene: new THREE.Group().add(n) }; } r.scene.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(r.scene), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()); return { scene: r.scene, s, c, y0: b.min.y }; }).catch(() => null));
    // every piece is measured: its footprint centered on (x, z) (the fence and metal wall pivots sit 1.3 m off the piece), its base on the ground
    // (the bedroll's base is 5 cm under its pivot), and set on the lowest ground under its footprint so no corner floats on a slope.
    // lie = a loose thing (a stone): tipped to rest on the slope's own plane and bedded a tenth of its height in, not balanced level on a hill
    this.solids = this.solids || [];
    const up = new THREE.Vector3(0, 1, 0), spin = new THREE.Quaternion();
    const put0 = (url, x, z, size, ry = 0, sink = 0, lie = false) => get(url).then(m => { if (!m) return null; const o = m.scene.clone(), k = size / Math.max(m.s.x, m.s.z); o.scale.setScalar(k);
      const cs = Math.cos(ry), sn = Math.sin(ry), ox = (m.c.x * cs + m.c.z * sn) * k, oz = (-m.c.x * sn + m.c.z * cs) * k, hx = m.s.x * k / 2, hz = m.s.z * k / 2;
      if (lie) { const e = 0.5, n = new THREE.Vector3(land(x - e, z) - land(x + e, z), 2 * e, land(x, z - e) - land(x, z + e)).normalize();
        o.quaternion.setFromUnitVectors(up, n).multiply(spin.setFromAxisAngle(up, ry)); o.position.set(x - ox, land(x, z) - m.y0 * k - sink - 0.1 * m.s.y * k, z - oz); }
      else { let low = land(x, z); for (const [a, b] of [[hx, hz], [-hx, hz], [hx, -hz], [-hx, -hz]]) low = Math.min(low, land(x + a * cs + b * sn, z - a * sn + b * cs));
        o.position.set(x - ox, low - m.y0 * k - sink, z - oz); o.rotation.y = ry; if (m.s.y * k > 1) this.solids.push([x, z, hx, hz, cs, sn, m.s.y * k]); }   /* (anything taller than a meter is solid: the camera never walks inside a wall) */
      this.scene.add(o); if (batch.has(url)) mine.push(o); return o; });
    const put = (...a) => { const p = put0(...a); pend.push(p); return p; };
    /* (draw-call pass: pieces that repeat with one geometry and material (fence, stones, barrels, boxes, metal walls) are folded into one InstancedMesh per sub-mesh once all are placed; each instance matrix is that sub-mesh's own world matrix, so every position, tip, spin and grounding above is kept exactly) */
    const poleG = new THREE.BoxGeometry(0.12, 3, 0.12), poleM = new THREE.MeshStandardMaterial({ color: 0x23262f, roughness: 0.6 }), bulbG = new THREE.BoxGeometry(0.26, 0.3, 0.26), bulbM = new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: 0xe0d8ff, emissiveIntensity: 0.55 });   /* (was 1.4: up close it blew out to a white blob in his eyes, 2026-10-19) */   /* (the three hanging lamps share one pole and one bulb) */
    const FEN = 'ph/modular_chainlink_fence/modular_chainlink_fence_1k.gltf#modular_chainlink_fence_double', POST = 'ph/modular_chainlink_fence/modular_chainlink_fence_1k.gltf#modular_chainlink_fence_post', BAR = 'ph/Barrel_01/Barrel_01_1k.gltf', CRATE = 'ph/old_military_crate/old_military_crate_1k.gltf', PH = n => `ph/${n}/${n}_1k.gltf`;   // (Poly Haven photo scans, CC0: the Kenney toy kit and the code boxes looked like a placeholder up close, his eyes 2026-10-19)
    const batch = new Set([FEN, POST, 'kit/stone.glb', BAR, CRATE, 'kit/box-large.glb', 'kit/structure-metal-wall.glb']), mine = [], pend = [];
    const fold = () => { const groups = new Map(); for (const o of mine) { this.scene.remove(o); o.updateMatrixWorld(true); o.traverse(q => { if (!q.isMesh) return; const k = q.geometry.uuid + '|' + q.material.uuid; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(q); }); }
      for (const list of groups.values()) { const f = list[0], im = new THREE.InstancedMesh(f.geometry, f.material, list.length); list.forEach((q, i) => im.setMatrixAt(i, q.matrixWorld)); im.castShadow = f.castShadow; im.receiveShadow = f.receiveShadow; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); this.scene.add(im); } };
    const face = (x, z) => Math.atan2(-x, -z);
    const cloth = o => o && o.traverse(q => { if (q.isMesh) { q.material = q.material.clone(); q.material.map = null; q.material.color.setHex(0x505a70); q.material.roughness = 0.95; } });   // (the repainted canvas was near black: tents read as bare frames at night, so they get one plain cloth color)   // (turns a thing's front toward the fire)
    const R = 21, SEG = 1.95, n = Math.round(2 * Math.PI * R / SEG), GATE = Math.PI / 2;   // (the gate faces out past the hut's side)
    const fenceP = get(FEN).then(m => { if (!m) return; const along = m.s.x >= m.s.z ? 0 : Math.PI / 2;   // (a real chain-link panel, 1.9 m by 2.4 m, at its own size, with a post at every joint)
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, gap = Math.abs(Math.atan2(Math.sin(a - GATE), Math.cos(a - GATE))); if (gap < 0.12) continue;
        const x = Math.cos(a) * R, z = Math.sin(a) * R; put(FEN, x, z, SEG, -a - Math.PI / 2 + along, 0.02);
        const b = (i + 0.5) / n * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(b - GATE), Math.cos(b - GATE))) > 0.12 - 0.5 / n * Math.PI * 2) put(POST, Math.cos(b) * R, Math.sin(b) * R, 0.15, 0, 0.02); } });
    const gx = Math.cos(GATE) * R, gz = Math.sin(GATE) * R;
    for (const s of [-1, 1]) { const x = gx + s * 2.2, z = gz, post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22), new THREE.MeshStandardMaterial({ color: 0x23262f, roughness: 0.6, metalness: 0.3 })); post.position.set(x, land(x, z) + 1.7, z);
      this.scene.add(post); get(PH('security_light')).then(m => { if (!m) return; const o = m.scene.clone(), k = 0.5 / Math.max(m.s.x, m.s.z); o.scale.setScalar(k); o.position.set(x, land(x, z) + 3.4 - m.y0 * k, z); o.rotation.y = face(x, z); this.scene.add(o); }); }
    for (const s of [-1, 1]) put(PH('concrete_road_barrier'), gx + s * 3.6, gz + 1.6, 1.6, Math.PI / 2 + s * 0.15);   // (barriers flank the gate outside)   // (the gate heads glow white-violet: they read cyan, his rule is no cyan)
    put('kit/signpost.glb', gx + 3.4, gz + 2.2, 1.0, Math.PI);
    // where people sleep: tents in an arc on the far side of the fire, a bedroll at each door
    [[200, 'kit/tent-canvas.glb', 3.8], [228, 'kit/tent-canvas.glb', 3.4], [256, 'kit/tent-canvas.glb', 3.8], [284, 'kit/tent-canvas.glb', 3.4], [170, 'kit/tent-canvas.glb', 3.4]].forEach(([deg, url, w]) => {
      const a = deg * Math.PI / 180, x = Math.cos(a) * 14, z = Math.sin(a) * 14; put(url, x, z, w, face(x, z)).then(cloth);
      const bx = Math.cos(a) * 11.4, bz = Math.sin(a) * 11.4; put('kit/bedroll.glb', bx, bz, 1.9, face(bx, bz) + 0.2);
      const lx = bx - Math.sin(a) * 0.8, lz = bz + Math.cos(a) * 0.8;   /* (the bunk lantern stands on the ground beside the bedroll: it hung in the air half a meter up) */
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.16), new THREE.MeshStandardMaterial({ color: 0x07070c, emissive: 0xb9a8ff, emissiveIntensity: 0 })); lamp.position.set(lx, land(lx, lz) + 0.12, lz); this.scene.add(lamp); (this.bunks = this.bunks || []).push({ x: bx, z: bz, lamp }); });   // (no real light per bunk: 5 more lights would cost every surface; the lamp's own glow is the receipt)
    // the workshop: a bench, planks, barrels and a chest by the wall
    const W = (deg, r) => { const a = deg * Math.PI / 180; return [Math.cos(a) * r, Math.sin(a) * r]; };
    { const [x, z] = W(32, 15); put('kit/workbench.glb', x, z, 2.4, face(x, z)); }
    { const [x, z] = W(40, 17); put('kit/planks.glb', x, z, 2.0, 0.4); }
    for (const [deg, r] of [[20, 17.6], [24, 18.2], [17, 18.6]]) { const [x, z] = W(deg, r); put(BAR, x, z, 0.62, deg).then(o => o && o.traverse(q => { if (q.isMesh && !q.material.userData.steel) { q.material = q.material.clone(); q.material.color.setHex(0x5a6070); q.material.userData.steel = 1; } })); }   // (the scan is fire-red; red means danger here, so the paint is weathered steel)
    { const [x, z] = W(47, 16.5); put('kit/chest.glb', x, z, 1.1, face(x, z)); }
    { const [x, z] = W(55, 17.2); put(CRATE, x, z, 1.7, 0.3); }
    // the store: metal walls by the wall, the camp's stock behind them
    { const [x, z] = W(-15, 17.5); put('kit/structure-metal-wall.glb', x, z, 3.4, face(x, z)); }
    { const [x, z] = W(-3, 17.8); put('kit/structure-metal-wall.glb', x, z, 3.4, face(x, z)); }
    { const [x, z] = W(-9, 19.2); put(CRATE, x, z, 1.7, 0.2); }
    { const [x, z] = W(-21, 18.6); put(PH('worn_metal_rack'), x, z, 0.95, face(x, z)); }
    { const [x, z] = W(4, 18.4); put(PH('portable_generator'), x, z, 0.85, face(x, z) + 0.4); }
    { const [x, z] = W(84, 18.8); put(PH('utility_box_01'), x, z, 0.55, face(x, z)); }
    // the workshop's leftovers and the tents' stove: the camp is lived in
    for (const [deg, r, n, sz] of [[28, 16.2, 'metal_jerrycan', 0.36], [29, 16.5, 'metal_jerrycan', 0.36], [44, 18.4, 'propane_tank', 0.36], [60, 18.6, 'old_tyre', 0.62], [62, 18.9, 'old_tyre', 0.62], [-28, 18.2, 'propane_tank', 0.36]]) { const [x, z] = W(deg, r); put(PH(n), x, z, sz, deg); }
    { const [x, z] = W(237, 9.4); put(PH('barrel_stove'), x, z, 0.6, 0); }
    // three hanging lamps: the tents, the workshop, the store (each lit corner reads as a place, not a floor)
    for (const [deg, r] of [[237, 10.5], [36, 13], [-9, 14]]) { const [x, z] = W(deg, r), y = land(x, z), l = new THREE.PointLight(0xcfe0ff, 9, 13, 1.4); l.position.set(x, y + 2.8, z);
      const pole = new THREE.Mesh(poleG, poleM); pole.position.set(x, y + 1.5, z);
      this.scene.add(l); mine.push(pole); put(PH('security_light'), x, z, 0.42, deg * Math.PI / 180, -2.92); }
    // outside: stones and rubble in the dark, so the land is somewhere and not a floor
    let q = 7; const rnd = () => (q = (q * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, r = 24 + rnd() * 50, x = Math.cos(a) * r, z = Math.sin(a) * r; put('kit/stone.glb', x, z, 0.5 + rnd() * rnd() * 2.6, rnd() * 6.3, 0, true); }
    for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, r = 4 + rnd() * 15, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.hypot(x - HUT.x, z - HUT.z) < 5 || Math.hypot(x - BOARD.x, z - BOARD.z) < 3 || r < 5) continue; put('kit/stone.glb', x, z, 0.25 + rnd() * 0.35, rnd() * 6.3, 0, true); }
    fenceP.then(() => Promise.all(pend)).then(fold);
  }
  speak(role, line, sec) { this.voice = { role, line: line.replace(/[<>&]/g, ''), until: performance.now() + sec * 1000 }; }
  // a new world starts you at your old desk, facing the two papers
  static startAt(me, land) { me.x = HUT.x + 0.3; me.z = HUT.z + 0.5; me.y = land(me.x, me.z); me.yaw = Math.atan2(-((HUT.x - 0.6) - me.x), -((HUT.z - 0.9) - me.z)); me.pitch = -0.72; }
}
