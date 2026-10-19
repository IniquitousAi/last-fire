// The guided first night (his note, 2026-10-19: "the game needs to feel guided until you get past the tutorial").
// The Clerk talks you through it in the world: one thing to do at a time, a thin line of light standing where it is,
// and the next step starts by itself when you have done it. Nothing to read in a menu; SKIP THE GUIDE ends it for good.
import * as THREE from 'three';

const STEPS = [
  { id: 'desk', goal: 'Read your form, then go to the board by the fire', line: "That's your form. The council says ninety-two. The board by the fire says something else. Go look." },
  { id: 'board', goal: 'Check the real odds at the board', line: 'Stand at the board and click CHECK. It costs nothing. That is the only free thing here.' },
  { id: 'gate', goal: 'Walk to the gate', line: "Eighty-one. Nobody here says it out loud. The wall has one gate. That's where the dark comes in." },
  { id: 'fire', goal: 'Stand by the fire until dusk', line: 'Good. Now come back to the fire. Dusk is close. It always is.' },
  { id: 'shoot', goal: 'Let one into the light, shoot it, walk through what it drops', line: "Out in the dark they're smoke. Bullets go through. Let them into the light, then they have to be something. Then shoot." },
  { id: 'bank', goal: 'Bring the light into the fire\'s circle', line: 'Light in your hands keeps nothing warm. Walk it into the fire\'s circle.' },
  { id: 'build', goal: 'Build a relay: Q, or click RELAY, where you look', line: 'The fire only reaches so far. A relay carries its light out. Put one down where you look.' },
  { id: 'dawn', goal: 'Hold the light until dawn', line: "Now hold it until morning. Nobody has ever been told how. You're not the first." },
];
const DONE = 'Morning. You did the paperwork and lived. The board updates at dawn. From here on, nobody tells you anything.';

export class Guide {
  constructor(scene, ctx) {
    this.ctx = ctx; this.i = -1; this.t = 0; this.base = 0;
    // the line of light where the next thing is (thin, cold, in the world; never on the screen)
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 30, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xff2a8d, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.8, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff2a8d, transparent: true, opacity: 0.7, depthWrite: false }));
    this.beam.visible = this.ring.visible = false; scene.add(this.beam, this.ring);
    const hud = document.getElementById('hud');
    this.box = Object.assign(document.createElement('div'), { id: 'guide' });
    Object.assign(this.box.style, { position: 'fixed', left: '50%', top: '58px', transform: 'translateX(-50%)', textAlign: 'center', textShadow: '0 1px 3px #000', pointerEvents: 'none' });
    this.goal = document.createElement('div'); Object.assign(this.goal.style, { fontSize: '22px', letterSpacing: '.04em', color: '#eef0f8' });
    this.dist = document.createElement('div'); Object.assign(this.dist.style, { fontSize: '14px', color: '#a3a6bb', letterSpacing: '.1em', marginTop: '2px' });
    const row = document.createElement('div'); Object.assign(row.style, { display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' });
    const key = (html) => { const b = Object.assign(document.createElement('button'), { className: 'bk', innerHTML: html }); b.style.pointerEvents = 'auto'; return b; };
    this.dusk = key('BRING THE DUSK<small>(skip the wait; Esc frees the mouse)</small>'); this.skip = key('SKIP THE GUIDE<small>(you know how this goes)</small>');
    this.dusk.onclick = () => { this.ctx.bringDusk(); this.dusk.style.display = 'none'; }; this.skip.onclick = () => this.finish(true);
    row.append(this.dusk, this.skip); this.box.append(this.goal, this.dist, row); this.box.hidden = true; hud.append(this.box);
  }
  start() { if (this.ctx.done()) return; this.go(0); this.box.hidden = false; }
  go(i) {
    this.i = i; this.t = 0; const S = STEPS[i], g = this.ctx.g(), me = this.ctx.me();
    this.base = g.nodes.length; this.banked = g.stats.banked;
    this.goal.innerHTML = `<span style="color:#ff2a8d">${i + 1} / ${STEPS.length}</span>&nbsp; ${S.goal}`;
    this.ctx.speak('the Clerk', S.line, 9);
    if (S.id === 'shoot' && this.ctx.stage) this.ctx.stage();   // (the first one is staged: it walks slowly out of the dark into your light, smoke turning solid as it crosses: the rule, taught with no words. INNOVATION.md idea 5)
  }
  finish(skipped) { this.i = -1; this.box.hidden = true; this.beam.visible = this.ring.visible = false; this.ctx.setDone(); if (!skipped) this.ctx.speak('the Clerk', DONE, 10); }
  target() {   // (where the line of light stands for this step; null when the step is about doing, not going)
    const g = this.ctx.g(), S = STEPS[this.i], B = this.ctx.board();
    if (S.id === 'desk' || S.id === 'board') return B;
    if (S.id === 'gate') return { x: 0, z: 20.2 };
    if (S.id === 'fire' || S.id === 'bank') return { x: g.fire.x, z: g.fire.z };
    if (S.id === 'shoot' && g.motes.length) { const me = this.ctx.me(); return g.motes.reduce((a, m) => Math.hypot(m.x - me.x, m.z - me.z) < Math.hypot(a.x - me.x, a.z - me.z) ? m : a); }
    return null;
  }
  update(dt) {
    if (this.i < 0) return; const away = this.ctx.me().z > 3000; this.box.hidden = away; if (away) { this.beam.visible = this.ring.visible = false; return; }   // (on Earth the guide waits: its steps are all at the camp)
    this.t += dt; const g = this.ctx.g(), me = this.ctx.me(), S = STEPS[this.i], ph = this.ctx.phase();
    const d = (p) => Math.hypot(me.x - p.x, me.z - p.z), next = () => (this.i + 1 < STEPS.length ? this.go(this.i + 1) : this.finish(false));
    if (S.id === 'desk' && (this.t > 7 || d(this.ctx.board()) < 6)) next();
    else if (S.id === 'board' && this.ctx.checked()) next();
    else if (S.id === 'gate' && d({ x: 0, z: 20.2 }) < 3.5) next();
    else if (S.id === 'fire' && ph !== 'day') next();
    else if (S.id === 'shoot') { if (g.stats.banked > this.banked) this.go(STEPS.findIndex(q => q.id === 'build')); else if (me.carried > 0) next(); }   // (light picked up inside the circle goes straight in: that counts as both steps)
    else if (S.id === 'bank') { if (me.carried === 0 && d(g.fire) < this.ctx.fireRadius()) next(); }
    else if (S.id === 'build' && g.nodes.length > this.base) next();
    else if (S.id === 'dawn' && (ph === 'dawn' || ph === 'day')) next();
    if (this.i < 0) return;
    // if the night moves past a step (dawn came, the fire ran out), the guide moves along with it instead of asking for the impossible
    if ((STEPS[this.i].id === 'shoot' || STEPS[this.i].id === 'bank' || STEPS[this.i].id === 'build') && (ph === 'dawn' || ph === 'day') && this.t > 3) this.finish(false);
    if (this.i < 0) return;
    const tg = this.target(), atFire = STEPS[this.i].id === 'fire';
    this.beam.visible = this.ring.visible = !!tg;
    if (tg) { const y = this.ctx.land(tg.x, tg.z); this.beam.position.set(tg.x, y + 15, tg.z); this.ring.position.set(tg.x, y + 0.06, tg.z); this.beam.material.opacity = 0.3 + Math.sin(this.t * 2.2) * 0.12; this.dist.textContent = `${Math.round(d(tg))} m`; }
    else this.dist.textContent = STEPS[this.i].id === 'build' ? `you carry ${Math.floor(me.carried)} light` : '';
    this.dusk.style.display = atFire && ph === 'day' && this.ctx.isHost() && d(g.fire) < this.ctx.fireRadius() ? '' : 'none';
  }
}
