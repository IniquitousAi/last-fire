// The crew as friends see them (CHARACTERS.md 1, the crew suit): the CC0 soldier in a sealed black work suit, thin violet seams, one faint
// magenta line across the visor, a plain rifle in the right hand. One material set for every copy; nothing is allocated per frame.
// Use: const crew = new Crew(scene, models.soldier, { gun: models.ar }); each frame crew.update(dt, list) with one entry per player to draw:
// { id, x, y, z, yaw, pitch, vx?, vz?, speed?, shooting?, hurt?, hp?, fallen?, seat? }. Velocity and speed are worked out from the moves when left out; seat 'drive'
// keeps them still in the truck, seat 'fly' hides them (inside the ship). crew.shot(id) and crew.hurt(id) fire a one-off from a net event.
import * as THREE from 'three';
import { clone as skClone } from '../../vendor/jsm/utils/SkeletonUtils.js';
import { mergeVertices } from '../../vendor/jsm/utils/BufferGeometryUtils.js';

const FADE = 0.25, HEIGHT = 1.8;   /* (cross-fade between clips in s; the crew stands 1.8 m) */
// ground covered per clip second at 1.8 m, measured as the planted foot's travel over each clip (Walk 1.34, matching camp.js's 1.39 at 1.82;
// Run and all three strafes 3.05), so a clip plays at speed / stride and the feet do not skate. Players move 4.6 m/s, 7.4 sprinting.
const STRIDE = { walk: 1.34, run: 3.05, back: 3.05, left: 3.05, right: 3.05 }, WALK_MAX = 2.2, STILL = 0.35, TS = [0.6, 2.2];
const PITCH_MAX = 0.9, PITCH_RATE = 12, SPEED_RATE = 10;   /* (aim bend clamp in rad; 95% of an aim change in 0.25 s; speed smoothing) */
const BEND = [['Abdomen', 0.25], ['Torso', 0.3], ['Chest', 0.25], ['Neck', 0.2]];   /* (the aim spread down the spine, head on top) */
// two layers, the way shooters draw a third person: the legs and spine from moving, the arms from aiming (the soldier's own Walk and Idle_Gun
// let the rifle hang at the leg, a pistol carry), and the whole body only for a hit or a fall
const ARMS = /^(Shoulder|UpperArm|LowerArm|Wrist|Index|Middle|Ring|Pinky|Thumb)/;
const LEGS = { idle: 'Idle_Gun_Pointing', walk: 'Walk', run: 'Run', back: 'Run_Back', left: 'Run_Left', right: 'Run_Right' };
const HANDS = { aim: 'Idle_Gun_Pointing', shoot: 'Gun_Shoot' }, WHOLE = { hit: 'HitRecieve', death: 'Death' };
const SHOT_HOLD = 0.35, HIT_HOLD = 0.55, RECOIL = 0.14;   /* (a shot keeps the firing arms up this long; a hit plays this much of its clip, then the body moves on) */

// the suit (his words: "futurism, minimalist, spandex, nanite, soldier suit", an open face helmet "so you can see his HUD very clearly"):
// a fitted black satin bodysuit, graphite plates only where the soldier already has them, thin violet seams running down the side of every limb,
// the respirator and goggles taken off so the helmet is open, the face a smooth dark nanite skin, and one thin magenta HUD line in front of the eyes
const SEAM = new THREE.Color(0x7b5cff), VISOR = new THREE.Color(0xff4fd8), FACE = new THREE.Color(0x24252e);
const _f = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _pi = new THREE.Quaternion();
const ease = (k, dt) => 1 - Math.exp(-k * dt), clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// one shader edit, measured in the bind pose (u: the model's own units, 18.5 tall, standing on Z, facing -Y), so the lines ride the body like real
// panel seams whatever the clip does. The side seam is where the body's centre plane cuts the surface: down both sides of the torso, the outside
// of each leg, along each arm. The HUD keeps only a thin band of the old goggles: the line, and a few small ticks over the right eye.
const SUIT_GLSL = `{ vec3 u = vBind * uS; float body = 1.0 - step(15.2, u.z);
  float side = body * step(0.8, abs(u.x)) * ln(u.y, -0.55, 0.022);
  float belt = (1.0 - step(2.1, abs(u.x))) * ln(u.z, 10.75, 0.03);
  float cuff = step(3.0, abs(u.x)) * (ln(abs(u.x), 6.35, 0.035) + ln(abs(u.x), 3.4, 0.035));
  totalEmissiveRadiance += uSeam * min(side + belt + cuff, 1.0) * 1.0; }`;
const FACE_GLSL = `{ vec3 u = vBind * uS; float face = step(u.y, -0.6) * step(15.25, u.z) * (1.0 - step(16.95, u.z)) * (1.0 - step(1.05, abs(u.x)));
  diffuseColor.rgb = mix(diffuseColor.rgb, uFace, face); }`;
const PLATE_GLSL = `{ vec3 u = vBind * uS; float keep = step(10.6, u.z);
  diffuseColor.rgb = mix(uSuit, diffuseColor.rgb, keep); }`;   /* (plates stay on the chest, shoulders and arms; the leg pads become suit) */
const HUD_GLSL = `{ vec3 u = vBind * uS; float line = ln(u.z, uHud, 0.022);
  float tick = step(-0.85, u.x) * step(u.x, -0.3) * step(0.45, fract(u.x * 7.0)) * ln(u.z, uHud + 0.11, 0.012);
  float a = max(line, tick) * step(u.y, -1.45); if (a < 0.03) discard;
  totalEmissiveRadiance += uVisor * a * 1.6; }`;
function suit(m, U, kind) {
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBind;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vBind;\nuniform vec3 uSeam, uVisor, uFace, uSuit;\nuniform float uS, uHud;\nfloat ln(float v, float at, float w) { float d = abs(v - at), aa = fwidth(v) * 1.2; return 1.0 - smoothstep(w, w + aa, d); }');
    if (kind === 'suit') s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + PLATE_GLSL);
    if (kind === 'face') s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + FACE_GLSL);
    s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + (kind === 'hud' ? HUD_GLSL : SUIT_GLSL));
  };
  m.customProgramCacheKey = () => 'crew-' + kind;
}

export class Crew {
  constructor(scene, soldier, { gun = null, height = HEIGHT } = {}) {
    this.scene = scene; this.src = soldier; this.views = new Map(); this.frame = 0;
    soldier.scene.updateMatrixWorld(true);   /* (measured on the original: a copy of an animated model measures wrong) */
    const box = new THREE.Box3().setFromObject(soldier.scene), size = box.getSize(new THREE.Vector3());
    this.scale = height / size.y; this.k = height / 1.8;   /* (stride scale against the 1.8 m the strides were measured at) */
    // the bind-pose scale the seams are measured in, the old goggles' height (the HUD line sits across them), and the respirator to take off
    const lo = new THREE.Vector3(1e9, 1e9, 1e9), hi = new THREE.Vector3(-1e9, -1e9, -1e9), vb = new THREE.Box3(); this.hide = new Set();
    soldier.scene.traverse(o => { if (!o.isMesh) return; o.geometry.computeBoundingBox(); lo.min(o.geometry.boundingBox.min); hi.max(o.geometry.boundingBox.max); if (/Visor/.test(o.material.name)) vb.union(o.geometry.boundingBox); });
    soldier.scene.traverse(o => { if (o.isMesh && o.material.name === 'Swat' && o.geometry.boundingBox.min.z > lo.z + 0.8 * (hi.z - lo.z)) this.hide.add(o.geometry); });   /* (the respirator: the only plate above the shoulders) */
    const uS = 18.52 / (hi.z - lo.z), U = { uS: { value: uS }, uHud: { value: vb.isEmpty() ? 16.8 : (vb.min.z + vb.max.z) / 2 * uS + 0.15 }, uSeam: { value: SEAM }, uVisor: { value: VISOR }, uFace: { value: FACE }, uSuit: { value: new THREE.Color(0x0a0b0f) } };
    // smooth shading: the soldier is cut flat, every facet its own shade (a patchwork on satin); welded once and shared, it reads as one fitted skin
    this.geo = new Map(); soldier.scene.traverse(o => { if (!o.isMesh || this.geo.has(o.geometry)) return; const g = o.geometry.clone(); g.deleteAttribute('normal'); if (g.attributes.uv) g.deleteAttribute('uv');
      const w = mergeVertices(g, (hi.z - lo.z) * 1e-5); w.computeVertexNormals(); w.boundingBox = o.geometry.boundingBox; this.geo.set(o.geometry, w); });
    const std = (color, rough, metal) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    this.mats = { Swat: std(0x121319, 0.45, 0.4), Swat_Black: std(0x0a0b0f, 0.5, 0.3), Skin: std(0x0c0d11, 0.55, 0.25), Visor: std(0x000000, 1, 0) };   /* (satin, not rubber: the rim and the fire slide along it) */
    suit(this.mats.Swat, U, 'suit'); suit(this.mats.Swat_Black, U, 'face'); suit(this.mats.Visor, U, 'hud');
    for (const m of Object.values(this.mats)) { m.userData.rim = 1; m.defines = { USE_RIM: '' }; }   /* (main.js's violet edge, opted in here so rimAll never copies them) */
    const find = n => soldier.animations.find(a => a.name === n || a.name.endsWith('|' + n)) || null;
    const part = (n, arms) => { const c = find(n); if (!c) return null; const t = c.tracks.filter(k => ARMS.test(k.name) === arms); return new THREE.AnimationClip(c.name + (arms ? '_arms' : '_legs'), c.duration, t); };
    this.clips = {}; for (const [k, n] of Object.entries(LEGS)) this.clips[k] = part(n, false); for (const [k, n] of Object.entries(HANDS)) this.clips[k] = part(n, true); for (const [k, n] of Object.entries(WHOLE)) this.clips[k] = find(n);
    this.gun = gun ? this.prepGun(gun) : null;
  }
  // the rifle: grip in the right palm, barrel along the body's forward the way Idle_Gun_Pointing aims it; solved once on a test copy, shared by all
  prepGun(gun) {
    const mats = { Main: new THREE.MeshStandardMaterial({ color: 0x111217, roughness: 0.6, metalness: 0.45 }), MainDark: new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.8, metalness: 0.2 }),
      MainLight: new THREE.MeshStandardMaterial({ color: 0x1c1e26, roughness: 0.45, metalness: 0.6, emissive: SEAM, emissiveIntensity: 0.08 }) };
    for (const m of Object.values(mats)) { m.userData.rim = 1; m.defines = { USE_RIM: '' }; }
    const g = gun.scene.clone(); g.traverse(o => { if (o.isMesh) { o.material = mats[o.material.name] || mats.Main; o.frustumCulled = false; } });
    g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const len = Math.max(s.x, s.z), ax = s.x >= s.z ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const muzzle = ax.clone().multiplyScalar(this.gunFlip), up = new THREE.Vector3(0, 1, 0);
    // test copy in the aiming pose: the wrist's turn against the body, so the rifle can be laid along the body's forward (+Z), its top up
    const t = skClone(this.src.scene), mix = new THREE.AnimationMixer(t), aim = this.src.animations.find(a => a.name.endsWith('|' + HANDS.aim));
    if (aim) { mix.clipAction(aim).play(); mix.update(0); } t.updateMatrixWorld(true);
    const w = t.getObjectByName('WristR'), ws = new THREE.Vector3(), wq = new THREE.Quaternion(), wp = new THREE.Vector3(); w.matrixWorld.decompose(wp, wq, ws);
    const from = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(up, muzzle), up, muzzle));
    const roll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.gunRoll), tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.gunTilt);
    const want = new THREE.Quaternion().multiplyQuaternions(tilt, roll).multiply(from.invert());   /* (gun axes onto body axes: muzzle to +Z, top to +Y) */
    const hold = new THREE.Group(); hold.quaternion.copy(wq).invert().multiply(want);
    const k = (0.78 / this.scale) / len / ws.x;   /* (a 0.78 m rifle, in the wrist's own units) */
    const grip = c.clone().addScaledVector(muzzle, this.grip[0] * len).addScaledVector(up, -this.grip[1] * len);   /* (behind the middle, under the barrel) */
    g.scale.setScalar(k); g.position.copy(grip).multiplyScalar(-k); hold.add(g);
    const palm = new THREE.Vector3(...this.palm).multiplyScalar(1 / this.scale / ws.x).applyQuaternion(_q.copy(wq).invert());   /* (palm offset in body metres, turned into the wrist's frame) */
    hold.position.copy(palm);
    return hold;
  }
  view(id) {
    const o = skClone(this.src.scene); o.scale.setScalar(this.scale);
    o.traverse(m => { if (!m.isMesh) return; m.frustumCulled = false; m.castShadow = false; m.visible = !this.hide.has(m.geometry); m.geometry = this.geo.get(m.geometry) || m.geometry; m.material = this.mats[m.material.name] || this.mats.Swat; });
    const mix = new THREE.AnimationMixer(o), acts = {};
    for (const [k, c] of Object.entries(this.clips)) if (c) acts[k] = mix.clipAction(c);
    for (const k of ['shoot', 'hit', 'death']) if (acts[k]) { acts[k].setLoop(THREE.LoopOnce, 1); acts[k].clampWhenFinished = true; }
    const bones = BEND.map(([n, w]) => [o.getObjectByName(n), w]).filter(b => b[0]), rest = bones.map(b => b[0].quaternion.clone());
    if (this.gun) { const w = o.getObjectByName('WristR'); if (w) w.add(this.gun.clone()); }
    this.scene.add(o);
    const v = { id, o, mix, acts, bones, rest, legs: null, arms: null, whole: null, speed: 0, pitch: 0, px: NaN, pz: NaN, shotT: 0, hitT: 0, hp: NaN, hurt: 0, seen: 0 };
    this.set(v, 'legs', 'idle'); this.set(v, 'arms', 'aim'); if (acts.idle) acts.idle.time = Math.random() * this.clips.idle.duration;   /* (nobody breathes in step) */
    this.views.set(id, v); return v;
  }
  set(v, slot, k) {   /* (one layer cross-fades to a clip; a one-off restarts from its first frame, a loop keeps its step) */
    const was = v[slot]; if (was === k) return; if (was && v.acts[was]) v.acts[was].fadeOut(FADE); v[slot] = k; if (!k || !v.acts[k]) return;
    const a = v.acts[k]; if (k === 'shoot' || k === 'hit' || k === 'death') a.reset(); a.enabled = true; a.setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(FADE).play();
  }
  shot(id) { const v = this.views.get(id); if (v) { v.shotT = SHOT_HOLD; if (v.arms === 'shoot' && v.acts.shoot.time > RECOIL) v.acts.shoot.time = 0; } }   /* (held fire: the recoil kicks again every RECOIL s) */
  hurt(id) { const v = this.views.get(id); if (v && v.whole !== 'death') { v.hitT = HIT_HOLD; if (v.whole === 'hit') v.acts.hit.time = 0; } }
  update(dt, list) {
    const f = ++this.frame;
    for (let i = 0; i < list.length; i++) {
      const p = list[i], v = this.views.get(p.id) || this.view(p.id); v.seen = f;
      v.o.visible = p.seat !== 'fly'; if (!v.o.visible) { v.px = NaN; continue; }
      // how fast, and which way against their facing (forward is -Z at yaw 0, as the camera looks)
      let sp = p.speed, vx = 0, vz = 0;
      if (p.vx !== undefined) { vx = p.vx; vz = p.vz || 0; } else if (Number.isFinite(v.px) && dt > 0) { vx = (p.x - v.px) / dt; vz = (p.z - v.pz) / dt; }
      if (sp === undefined) sp = Math.hypot(vx, vz);
      v.px = p.x; v.pz = p.z; if (!(sp >= 0) || p.seat === 'drive') sp = 0; sp = Math.min(sp, 12);
      v.speed += (sp - v.speed) * ease(SPEED_RATE, dt);
      const yaw = p.yaw || 0, sy = Math.sin(yaw), cy = Math.cos(yaw), fwd = -vx * sy - vz * cy, side = vx * cy - vz * sy;
      if (p.shooting) this.shot(p.id); if (p.hurt > v.hurt || p.hp < v.hp) this.hurt(p.id); v.hurt = p.hurt || 0; v.hp = p.hp ?? NaN;
      v.shotT = Math.max(0, v.shotT - dt); v.hitT = Math.max(0, v.hitT - dt);
      // the whole body: fallen beats a hit; otherwise legs by speed and direction, arms by firing
      const whole = p.fallen ? 'death' : v.hitT > 0 ? 'hit' : null; let legs = 'idle';
      if (v.speed > STILL) legs = Math.abs(side) > Math.abs(fwd) * 1.2 ? (side > 0 ? 'right' : 'left') : fwd < 0 ? 'back' : v.speed < WALK_MAX ? 'walk' : 'run';
      this.set(v, 'whole', whole); this.set(v, 'legs', whole ? null : legs); this.set(v, 'arms', whole ? null : v.shotT > 0 ? 'shoot' : 'aim');
      if (legs !== 'idle' && !whole && v.acts[legs]) v.acts[legs].setEffectiveTimeScale(clamp(v.speed / (STRIDE[legs] * this.k), TS[0], TS[1]));
      for (let j = 0; j < v.bones.length; j++) v.bones[j][0].quaternion.copy(v.rest[j]);   /* (bones a clip leaves alone go back to rest, so the aim never adds up) */
      v.mix.update(dt);
      v.o.position.set(p.x, p.y, p.z); v.o.rotation.y = yaw + Math.PI;
      // the upper body follows the aim: clamped, smoothed, spread down the spine; never while down or in a hit
      const want = whole ? 0 : clamp(p.pitch || 0, -PITCH_MAX, PITCH_MAX); v.pitch += (want - v.pitch) * ease(PITCH_RATE, dt);
      if (Math.abs(v.pitch) > 0.002) for (let j = 0; j < v.bones.length; j++) this.bend(v.bones[j][0], v.o.rotation.y, v.pitch * v.bones[j][1]);
    }
    for (const v of this.views.values()) if (v.seen !== f) this.remove(v.id);   /* (gone from the list: gone from the world) */
  }
  bend(bone, ry, pitch) {   /* (turns one bone up or down in the world around the body's own side axis, on top of the clip's pose) */
    _f.set(Math.sin(ry), 0, Math.cos(ry)); _d.set(Math.sin(ry) * Math.cos(pitch), Math.sin(pitch), Math.cos(ry) * Math.cos(pitch));
    _q.setFromUnitVectors(_f, _d); bone.parent.getWorldQuaternion(_pq); _pi.copy(_pq).invert(); _q.multiply(_pq).premultiply(_pi); bone.quaternion.premultiply(_q);
  }
  remove(id) { const v = this.views.get(id); if (!v) return; this.scene.remove(v.o); v.mix.stopAllAction(); v.mix.uncacheRoot(v.o); this.views.delete(id); }
  dispose() { for (const id of [...this.views.keys()]) this.remove(id); }
  get(id) { return this.views.get(id) || null; }
  stats() {   /* (what one crew member costs: triangles and draw calls, gun included; every mesh here is one material, one draw) */
    let tris = 0, draws = 0; const add = o => { if (!o.isMesh || this.hide.has(o.geometry)) return; const g = this.geo.get(o.geometry) || o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; draws++; };
    this.src.scene.traverse(add); if (this.gun) this.gun.traverse(add); return { tris, draws };
  }
}
Object.assign(Crew.prototype, { gunFlip: 1, gunRoll: 0, gunTilt: 0, grip: [-0.12, 0.18], palm: [0, 0.04, 0.03] });   /* (tuned by eye in mockups/crew.html) */
