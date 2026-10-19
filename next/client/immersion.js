// Lane C's immersion pieces in one place, so main.js needs one object and one call a frame (small hunks, easy merges):
// the strange sky and far land, the dark's edge, fog that thickens at dusk, the mirror realm's signs, moments of hyper-awareness,
// and the morning after (what last night left, said once at dawn through the wrist).
import * as THREE from 'three';
import { fogAt, edgeOf, consequences } from '../core/immersion.js?v=172';
import { awareStep } from '../core/awareness.js?v=172';
import { Strange } from './strange.js?v=172';
import { Edge } from './edge.js?v=172';
import { MirrorSigns } from './mirror.js?v=172';
import { Details } from './details.js?v=172';
import { Forest } from './forest.js?v=172';
import { BOARD } from './camp.js?v=172';
import { onEarth, phase, EARTH } from '../core/game.js?v=172';

const note = (kind, text) => { if (window.__lf) (window.__imm = window.__imm || []).push([kind, text]); };   // (the test hook ?shot reads these: what was said and when)
export class Immersion {
  constructor(scene, ctx) {
    this.ctx = ctx; this.strange = new Strange(scene); this.edge = new Edge(scene); this.signs = null; this.details = null; this.forest = null; this.scene = scene;
    this.aware = {}; this.night = null; this.queue = []; this.qt = 0; this.px = null; this.pz = null; this.fwd = new THREE.Vector3();
  }
  update(dt, t) {
    const { g, me, camera, say } = this.ctx, earth = onEarth(me), land = (x, z) => g.land(x, z);
    if (!this.signs && earth) this.signs = new MirrorSigns(this.scene, land);   // (built the first time you stand on Earth: the signs belong there)
    if (!this.details) { this.details = new Details(this.scene, land, BOARD); }
    if (!this.forest && earth) { const t0 = performance.now(); this.forest = new Forest(this.scene, land); note('forest', `baked ${this.forest.stats.variants} variants, ${this.forest.stats.tris} triangles [${this.forest.stats.v.join('; ')}], ${(performance.now() - t0).toFixed(0)} ms`); }   // (grown once, the first time you stand on Earth)   // (small details in the camp, the Wilds' trees on Earth)
    this.details.update(g); if (this.forest) this.forest.update(me);
    this.strange.update(camera, me, t, land);
    this.edge.mesh.visible = !me.ember; this.edge.update(t, edgeOf(g, earth), earth ? land(EARTH.x, EARTH.z) : land(g.fire.x, g.fire.z), earth ? 22 : 14);
    this.ctx.fog().density *= fogAt(g.clock, earth);   // (main.js set the base density this frame; dusk thickens it)
    // the morning after: when the night counter moves, the first three consequences, one at a time, through the wrist
    if (this.night === null) this.night = g.night; else if (g.night > this.night) { this.night = g.night; this.queue = consequences(g).filter(c => c.kind !== 'ground').slice(0, 3).map(c => c.text); this.qt = 3; }
    if (this.queue.length && (this.qt -= dt) <= 0) { { const l = this.queue.shift(); note('morning', l); say(l, 5, 'THE MORNING AFTER'); } this.qt = 6; }
    // hyper-awareness: rare, true, dry
    const moved = this.px === null ? 0 : Math.hypot(me.x - this.px, me.z - this.pz); this.px = me.x; this.pz = me.z;
    if (!me.ember && !this.queue.length) {
      camera.getWorldDirection(this.fwd); const fx = g.fire.x - me.x, fz = g.fire.z - me.z, fd = Math.hypot(fx, fz) || 1, lookingAtFire = !earth && fd < 30 && (this.fwd.x * fx + this.fwd.z * fz) / fd > 0.96;
      const r = awareStep(this.aware, { dt, moved, hp: me.hp, lookingAtFire, earth, lit: this.ctx.lit(), phase: phase(g.clock) }, Math.random); if (r) { note('aware:' + r.kind, r.line); say(r.line, 5, 'NOTICED'); } }
    // the mirror realm: walk up to a sign and the wrist says what the hour has become
    if (this.signs) { const s = this.signs.update(me, g.clock); if (s) { note('mirror', s); say(s, 6, 'MIRROR'); } }
  }
}
