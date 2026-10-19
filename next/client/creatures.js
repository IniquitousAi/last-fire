// The Hollow as bodies (the rework of 2026-10-19). His words, v163: "the enemies make no sense, they're holograms, their pathing and alignment don't
// make sense with the physics of the game, there's no depth or immersion to shooting them". His vision: tall, many-limbed things made of tendrils,
// like walking dead trees, near black, half hidden in fog, a faint crimson or violet vein glow and no other glow.
// The bodies are our own rigged models (tools/blender/dark_creatures.py): Thornwalker (walker, watcher, giant) and Skitter (runner, face).
// Everything a body does here is read off the core's body (client/ never decides anything): where it is, its heading, its speed (measured from
// how far it really moved), its attack (the core's cooldown just reset), its reaction (k.rt, k.r), its death (it left the list).
import * as THREE from 'three';
import { clone as skClone } from '../../vendor/jsm/utils/SkeletonUtils.js';

// model: which rig; h: scale; ground: the clips' measured ground speed in m/s at scale 1 (printed by the Blender script); rim: the vein color.
export const BODY = {
  walker: { model: 'hunch', s: 1.0, rim: 0xa561ff, ref: { Walk: 1.47, Run: 5.89 } },   // (the Stalker's thin hunched humanoid, red slit eyes)
  watcher: { model: 'thorn', s: 1.05, sx: 0.85, rim: 0xe8e0ff, ref: { Walk: 1.88, Run: 8.35 } },   // (the tall tendril creature from his first sheet)
  giant: { model: 'goliath', s: 1.0, rim: 0xff2b40, ref: { Walk: 1.2, Run: 4.1 } },   // (the Goliath: a black armored brute with red cracks)
  runner: { model: 'skitter', s: 0.7, rim: 0xff4fa0, ref: { Walk: 2.22, Run: 7.19 } },
  face: { model: 'skitter', s: 0.95, rim: 0xff4fd8, ref: { Walk: 2.22, Run: 7.19 } },
};
const CLIPS = ['Idle', 'Walk', 'Run', 'Attack', 'HitReact', 'Death'];
const ang = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export class Creatures {
  constructor({ scene, models, fx, sound, C, getG }) { this.scene = scene; this.models = models; this.fx = fx; this.sound = sound; this.C = C; this.dying = []; this.frame = 0; this.shardSrc = null; }

  make(k) {
    const B = BODY[k.kind], src = this.models[B.model]; if (!src) return null;
    const o = skClone(src.scene), mats = [], veins = []; o.scale.set(B.s * (B.sx || 1), B.s, B.s * (B.sx || 1));
    o.traverse(q => { if (!q.isMesh) return; q.frustumCulled = false; q.castShadow = false;
      const list = Array.isArray(q.material) ? q.material : [q.material];
      const out = list.map(m => { const n = m.clone();
        if (/Vein/.test(m.name)) { n.color.setHex(0x120008); n.emissive = new THREE.Color(B.rim); n.emissiveIntensity = 0.9; n.roughness = 1; veins.push(n); }
        else { n.color.setHex(0x07060c); n.emissive = new THREE.Color(0x0a0c18); n.emissiveIntensity = 0.3; n.roughness = 0.9; n.metalness = 0; n.userData.rim = 1; n.defines = { ...(n.defines || {}), USE_RIM: '', RIM_COLOR: rimVec(B.rim) }; n.needsUpdate = true; mats.push(n); }
        return n; });
      q.material = Array.isArray(q.material) ? out : out[0]; });
    const mix = new THREE.AnimationMixer(o), act = {};
    for (const n of CLIPS) { const c = src.animations.find(a => a.name === n); if (c) { act[n] = mix.clipAction(c); act[n].setEffectiveWeight(0); } }
    for (const n of ['Idle', 'Walk', 'Run']) { act[n].setLoop(THREE.LoopRepeat); act[n].play(); }
    for (const n of ['Attack', 'HitReact', 'Death']) { act[n].setLoop(THREE.LoopOnce, 1); act[n].clampWhenFinished = true; }
    mix.update(Math.random() * 0.8);
    return { o, mix, act, mats, veins, B, mix_t: 0, loco: 'Idle', w: { Idle: 1, Walk: 0, Run: 0 }, speed: 0, px: k.x, pz: k.z, hd: k.yaw, a: 0, h: 0, down: false, hpS: k.hp + k.sh + k.sb, flash: 0, tell: 0, cd: k.cd || 0, rt: 0, sol: 0, base: B.rim };
  }

  // Earth's dark comes out of spawner pods: a dark violet egg with a glowing red core and red root tendrils on the ground. The pod flashes, splits, and the body
  // climbs out of the ground under it. Rough on purpose; the creature is already hunting while it climbs (the core spawned it there).
  makePod(k) {
    const g = new THREE.Group(), egg = new THREE.MeshStandardMaterial({ color: 0x160a28, emissive: 0x24083a, emissiveIntensity: 0.5, roughness: 0.55 }), red = new THREE.MeshBasicMaterial({ color: 0xff2b40, transparent: true, toneMapped: false });
    const half = (top) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, top ? 0 : Math.PI / 2, Math.PI / 2), egg); m.scale.set(0.7, 0.55, 0.7); m.position.y = top ? 0.55 : 0.55; return m; };
    const up = half(true), low = half(false), core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), red); core.position.y = 0.55;
    const roots = new THREE.Group(); const rm = new THREE.MeshStandardMaterial({ color: 0x0a0610, emissive: 0xff2b40, emissiveIntensity: 0.5, roughness: 0.9 });
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + (k.id % 5) * 0.3, L = 1.3 + ((i * 37 + k.id) % 7) / 7, r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.04, L, 5), rm); r.position.set(Math.cos(a) * L * 0.5, 0.03, Math.sin(a) * L * 0.5); r.rotation.set(0, -a, Math.PI / 2 - 0.05); roots.add(r); }
    g.add(low, up, core, roots); g.position.set(k.x, k.y, k.z); this.scene.add(g);
    this.fx.burst(new THREE.Vector3(k.x, k.y + 0.6, k.z), 22, [1.0, 0.17, 0.25], 4.5, 0.55);   // (the red flash)
    return { g, up, low, core, red, egg, rm, t: 0 };
  }
  emerge(k, v, dt) {
    const P = v.pod; P.t += dt; const t = P.t, e = x => x * x * (3 - 2 * Math.min(1, Math.max(0, x)));
    v.o.visible = t > 0.35 && v.o.visible; const rise = Math.min(1, Math.max(0, (t - 0.35) / 1.2)); v.o.position.y = k.y - 2.4 * (1 - e(rise));
    P.g.position.set(k.x, k.y, k.z); const open = Math.min(1, Math.max(0, (t - 0.3) / 0.7)); P.up.position.y = 0.55 + 0.9 * e(open); P.up.rotation.z = 0.7 * e(open); P.up.rotation.x = 0.2 * e(open);
    const pulse = 0.6 + 0.4 * Math.sin(t * 26); P.red.opacity = t < 1.5 ? pulse : Math.max(0, 1 - (t - 1.5) / 0.6); P.core.scale.setScalar(1 + 0.8 * e(open));
    if (t > 1.8) { const f = Math.max(0, 1 - (t - 1.8) / 0.7); P.g.scale.setScalar(f); P.g.position.y -= (1 - f) * 0.4; }
    if (t > 2.5) { this.scene.remove(P.g); P.g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); P.red.dispose(); P.egg.dispose(); P.rm.dispose(); v.pod = null; }
  }

  // compile every body's shaders once at load (the first sight of each kind used to freeze the frame for a second)
  warm(renderer, camera) {
    const tmp = []; for (const kind of ['walker', 'runner', 'giant', 'watcher', 'face']) { const v = this.make({ kind, x: 0, z: 0, yaw: 0, y: 0, hp: 1, sh: 0, sb: 0, cd: 0 }); if (!v) continue; v.o.position.set(camera.position.x, camera.position.y - 500, camera.position.z); this.scene.add(v.o); tmp.push(v); }
    renderer.compile(this.scene, camera); for (const v of tmp) this.scene.remove(v.o);
  }

  // choose the locomotion clip whose natural speed is nearest the body's real ground speed, and run it at the ratio: no sliding feet
  loco(v, s, dt) {
    const B = v.B, scale = B.s; let pick = 'Idle', ts = 1;
    if (s > 0.25) { const w = B.ref.Walk * scale, r = B.ref.Run * scale, cw = Math.abs(Math.log(s / w)), cr = Math.abs(Math.log(s / r)); pick = (v.loco === 'Run' ? cr < cw * 1.25 : cr < cw * 0.8) ? 'Run' : 'Walk'; ts = s / (pick === 'Run' ? r : w); }
    v.loco = pick; const f = Math.min(1, dt * 7);
    for (const n of ['Idle', 'Walk', 'Run']) v.w[n] += ((n === pick ? 1 : 0) - v.w[n]) * f;
    v.act.Walk.timeScale = pick === 'Walk' ? Math.min(2.2, Math.max(0.4, ts)) : 1; v.act.Run.timeScale = pick === 'Run' ? Math.min(2.2, Math.max(0.4, ts)) : 1; v.act.Idle.timeScale = 1;
  }

  draw(g, dt, X) {   // X: { seen, hitStop, smart, SMART, SCAN, models }
    const { seen } = X, C = this.C, alive = new Set(), cam = X.camera, now = performance.now() / 1000; this.frame++;
    for (const k of g.hollow) {
      alive.add(k.id); let v = seen.get(k.id);
      if (!v) {
        if (k.kind === 'shard') { v = this.makeShard(k); if (!v) continue; }
        else { v = this.make(k); if (!v) continue; if (k.kind === 'face') { this.fx.burst(new THREE.Vector3(k.x, k.y + 1.2, k.z), 28, [0.55, 0.57, 0.66], 5, 0.7); if (this.sound.shatter) this.sound.shatter(new THREE.Vector3(k.x, k.y + 1.2, k.z)); } }   // (it tears out of the wall: concrete dust and a crack)
        this.scene.add(v.o); seen.set(k.id, v); v.sol = 0; if (k.earth && k.kind !== 'face' && k.kind !== 'shard' && !X.noPod) v.pod = this.makePod(k);
      }
      v.last = k; v.mats = v.mats || [];
      const d = cam ? Math.hypot(cam.position.x - k.x, cam.position.z - k.z) : 0; v.o.visible = d < 120;
      if (k.kind === 'shard') { this.drawShard(k, v, dt, X); continue; }
      // where and which way (the core did the turning and the walking; this only reads it)
      v.o.position.set(k.x, k.y, k.z); v.o.rotation.y = k.yaw; if (v.pod) this.emerge(k, v, dt);
      const moved = Math.hypot(k.x - v.px, k.z - v.pz); let s = moved > 3 ? v.speed : moved / Math.max(dt, 1e-3); v.px = k.x; v.pz = k.z;
      v.speed += (s - v.speed) * Math.min(1, dt * 10); const stag = k.rt > 0 && k.r >= 2;
      // solid in the light, a shape in the dark (the rule is the core's; the veins say which)
      { const want = C.solid(g, k) ? 1 : 0; v.sol += (want - v.sol) * Math.min(1, dt * 7); }
      // the strike: the core's cooldown just reset
      const cd = k.cd || 0; if (cd > v.cd + 0.2 && v.act.Attack && !(k.rt > 0)) { const a = v.act.Attack, len = a.getClip().duration; a.reset(); a.time = len * 0.3; a.timeScale = 1; a.setEffectiveWeight(1); a.play(); v.a = 1; v.atkT = len * 0.7; } v.cd = cd;
      if (v.atkT > 0) { v.atkT -= dt; if (v.atkT <= 0) v.a = 0; }
      // the hit reaction: flinch, stagger, or down
      const hp = k.hp + k.sh + k.sb; if (hp < v.hpS - 0.01) v.flash = 0.16; v.hpS = hp;
      if (k.rt > 0 && (!(v.rt > 0) || (k.r || 0) > v.r)) { v.r = k.r || 1; const a = v.act.HitReact, dn = v.r >= 3; if (dn) { const De = v.act.Death; De.reset(); De.timeScale = 1.4; De.setEffectiveWeight(1); De.play(); v.down = true; } else { a.reset(); a.timeScale = v.r === 2 ? 0.8 : 1.5; a.setEffectiveWeight(1); a.play(); v.h = 1; } }
      if (k.rt > 0 && v.down) { const De = v.act.Death; if (De.time > De.getClip().duration * 0.45) De.paused = true; }
      if (!(k.rt > 0) && (v.rt > 0)) { v.h = 0; if (v.down) { v.down = false; v.act.Death.paused = false; v.act.Death.fadeOut(0.5); } }
      v.rt = k.rt || 0;
      if (v.down) v.h = 0;
      const act = v.act, busy = Math.max(v.a, v.h, v.down ? 1 : 0), f = Math.min(1, dt * 12);
      this.loco(v, v.speed, dt);
      for (const n of ['Idle', 'Walk', 'Run']) act[n].setEffectiveWeight(v.w[n] * (1 - 0.85 * busy));
      if (v.a === 0 && act.Attack.isRunning()) act.Attack.fadeOut(0.15);
      if (v.h === 0 && act.HitReact.isRunning()) act.HitReact.fadeOut(0.2);
      // the veins: faint always, brighter the closer it is to striking range; dimmer when out of every light (a shape that cannot be hit yet)
      const K = C.KINDS[k.kind], reach = (K && K.reach) || 1.2; let dm = 1e9; for (const p of g.players) if (!p.ember) dm = Math.min(dm, Math.hypot(p.x - k.x, p.z - k.z));
      const tell = Math.max(0, Math.min(1, 1 - (dm - reach) / (reach * 1.6))) + (k.kind === 'watcher' && !C.lookedAt(g, k) && dm < 30 ? 0.5 : 0); v.tell += (tell - v.tell) * Math.min(1, dt * 8);
      v.flash = Math.max(0, v.flash - dt); const glow = (0.18 + 0.35 * v.sol) * (0.7 + 0.9 * v.tell) + 2.2 * (v.flash / 0.16);
      for (const m of v.veins) m.emissiveIntensity = glow;
      for (const m of v.mats) { m.emissiveIntensity = 0.3 + 2 * (v.flash > 0 ? v.flash / 0.16 : 0); }
      if (v.tag > 0) v.tag -= dt; if (X.smart.id === k.id && X.smart.t >= X.SMART.lock) v.scan = Math.max(v.scan || 0, 0.45);   // (a locked shape keeps its outline, in pink)
      if (v.scan > 0 || v.scanned) { v.scan = Math.max(0, (v.scan || 0) - dt); const a = Math.min(1, v.scan / 0.4);
        for (const m of v.mats) { if (m.userData.e0 === undefined) { m.userData.e0 = m.emissive.getHex(); } if (v.scan > 0) { m.emissive.setHex(X.smart.id === k.id && X.smart.t >= X.SMART.lock ? X.SMART.color : X.SCAN.color); m.emissiveIntensity = 0.9 * a; } else m.emissive.setHex(m.userData.e0); }
        v.scanned = v.scan > 0; }
      // the watcher holds perfectly still while anyone looks at it; hit stop freezes the dark for a few hundredths of a second
      if (X.hitStop <= 0 && !(k.kind === 'watcher' && C.lookedAt(g, k))) { const every = d > 45 ? 2 : 1; if ((this.frame + k.id) % every === 0) v.mix.update(dt * every); }
    }
    for (const [id, v] of seen) if (!alive.has(id)) { seen.delete(id); if (v.mix && v.last && v.last.kind !== 'shard' && v.o.visible) this.startDeath(v); else this.scene.remove(v.o); }
    this.stepDying(dt);
  }

  // a body that left the list collapses where it stood (a tree going over), lies a moment, then comes apart into light
  startDeath(v) {
    const k = v.last; v.o.position.set(k.x, k.y, k.z); v.o.rotation.y = k.yaw; const A = v.act; if (v.pod) { this.scene.remove(v.pod.g); v.pod = null; v.o.visible = true; }
    for (const n of ['Idle', 'Walk', 'Run', 'Attack', 'HitReact']) A[n].stop(); A.Death.stop(); A.Death.reset(); A.Death.paused = false; A.Death.timeScale = 1; A.Death.setEffectiveWeight(1); A.Death.play();
    for (const m of [...v.veins, ...v.mats]) m.transparent = true;
    v.t = 0; this.dying.push(v); if (this.dying.length > 24) { const o = this.dying.shift(); this.scene.remove(o.o); }
  }
  stepDying(dt) {
    for (const v of this.dying) { v.t += dt; v.mix.update(dt); const T = v.act.Death.getClip().duration, lie = T + 0.7, fade = 1.1;
      if (v.t > lie) { const a = Math.max(0, 1 - (v.t - lie) / fade); for (const m of [...v.veins, ...v.mats]) m.opacity = a; for (const m of v.veins) m.emissiveIntensity = 1.2 + 3 * (1 - a);
        if (!v.burst && v.t > lie + 0.15) { v.burst = true; const c = new THREE.Color(v.base); for (let i = 0; i < 4; i++) this.fx.burst(new THREE.Vector3(v.o.position.x + (Math.random() - 0.5) * 2, v.o.position.y + 0.3 + Math.random(), v.o.position.z + (Math.random() - 0.5) * 2), 10, [c.r, c.g, c.b], 3.5, 0.9); } } }
    this.dying = this.dying.filter(v => { if (v.t > v.act.Death.getClip().duration + 0.7 + 1.1) { this.scene.remove(v.o); return false; } return true; });
  }

  // the shard is not a body: it floats to the fire and drinks its light (its model is the old crystal, violet, with no glow of its own)
  makeShard(k) { const src = this.models.shard; if (!src) return null; const o = src.scene.clone(); const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()); o.scale.setScalar(1.3 / Math.max(s.x, s.y, s.z));
    const mats = []; o.traverse(q => { if (q.isMesh) { q.material = q.material.clone(); q.material.map = null; q.material.color.setHex(0x120c1e); q.material.emissive = new THREE.Color(0x8a5cff); q.material.emissiveIntensity = 0.3; mats.push(q.material); } }); return { o, mats, veins: [], shard: true, sol: 0 }; }
  drawShard(k, v, dt, X) {
    const C = this.C; { const want = C.solid(X.g, k) ? 1 : 0; v.sol += (want - v.sol) * Math.min(1, dt * 7); for (const m of v.mats) { m.transparent = true; m.opacity = 0.88 + 0.12 * v.sol; } }
    v.o.position.set(k.x, k.y + 2.6, k.z); v.o.rotation.y = k.yaw + performance.now() / 900;
    if (v.tag > 0) v.tag -= dt;
  }
}
function rimVec(hex) { const c = new THREE.Color(hex), k = 0.14; return `vec3(${(c.r * k).toFixed(3)}, ${(c.g * k).toFixed(3)}, ${(c.b * k).toFixed(3)})`; }   // (thin limbs are all edge: the rim is held low so they read as a shape, not neon)
