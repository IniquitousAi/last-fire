// The Hollow: what the night is made of. One rule drives them all: light. They keep out of firelight and burn at its edge, unmake walls that
// stand in the dark, are drawn to big fires from far away, and daylight burns them off. Four kinds, each its own instanced mesh; only the host
// simulates them. They walk with swinging limbs (done on the graphics card from one number per Hollow), and never bob.
import * as THREE from 'three';
import { mergeGeometries } from './merge.js';

export const MAX = 240;

// limb ids: 0 the body, 1 and 2 the legs, 3 and 4 the arms; each limb swings round its own pivot height
function part(w, h, d, x, y, z, c, limb = 0, pivot = 0, rx = 0) {
  const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z); const n = g.attributes.position.count;
  const col = new Float32Array(n * 3), lb = new Float32Array(n), pv = new Float32Array(n);
  for (let i = 0; i < n; i++) { col.set(c, i * 3); lb[i] = limb; pv[i] = pivot; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('limb', new THREE.BufferAttribute(lb, 1)); g.setAttribute('pivot', new THREE.BufferAttribute(pv, 1)); return g;
}
const PLATE = [0.36, 0.38, 0.44], SKIN = [0.035, 0.035, 0.05], ASH = [0.09, 0.09, 0.12], EYE = [3.0, 2.8, 3.8], RED = [4.0, 0.5, 0.9];   // (eyes above 1: a faint light, the only thing you see far off)
const SHAPES = {
  hollow: () => mergeGeometries([part(0.36, 1.1, 0.22, 0, 1.45, 0, SKIN), part(0.3, 0.38, 0.3, 0, 2.2, 0.02, SKIN),
    part(0.12, 1.1, 0.14, -0.1, 0.55, 0, SKIN, 1, 1.1), part(0.12, 1.1, 0.14, 0.1, 0.55, 0, SKIN, 2, 1.1),
    part(0.09, 1.25, 0.09, -0.26, 1.35, 0.25, SKIN, 3, 1.95, -0.5), part(0.09, 1.25, 0.09, 0.26, 1.35, 0.25, SKIN, 4, 1.95, -0.5),
    part(0.07, 0.035, 0.02, -0.07, 2.24, 0.175, EYE), part(0.07, 0.035, 0.02, 0.07, 2.24, 0.175, EYE),
    part(0.36, 0.16, 0.36, 0, 2.38, 0.02, PLATE, 5), part(0.42, 0.62, 0.07, 0, 1.6, 0.14, PLATE, 6)]),
  shade: () => mergeGeometries([part(0.34, 0.34, 1.0, 0, 0.85, 0, ASH), part(0.26, 0.26, 0.3, 0, 0.95, 0.6, ASH),   // (runs low on all fours, long arms in front)
    part(0.1, 0.8, 0.1, -0.16, 0.4, -0.38, ASH, 1, 0.8), part(0.1, 0.8, 0.1, 0.16, 0.4, -0.38, ASH, 2, 0.8),
    part(0.08, 0.95, 0.08, -0.2, 0.47, 0.38, ASH, 3, 0.95), part(0.08, 0.95, 0.08, 0.2, 0.47, 0.38, ASH, 4, 0.95),
    part(0.05, 0.03, 0.02, -0.06, 1.0, 0.76, EYE), part(0.05, 0.03, 0.02, 0.06, 1.0, 0.76, EYE),
    part(0.3, 0.08, 0.3, 0, 1.12, 0.6, PLATE, 5), part(0.4, 0.08, 0.8, 0, 1.05, 0, PLATE, 6)]),
  warden: () => mergeGeometries([part(0.95, 1.3, 0.6, 0, 2.0, 0, SKIN), part(0.42, 0.42, 0.42, 0, 2.85, 0.12, SKIN),   // (huge, slow, pulls walls down)
    part(0.3, 1.35, 0.32, -0.27, 0.68, 0, SKIN, 1, 1.35), part(0.3, 1.35, 0.32, 0.27, 0.68, 0, SKIN, 2, 1.35),
    part(0.24, 1.7, 0.26, -0.66, 1.65, 0.1, SKIN, 3, 2.55), part(0.24, 1.7, 0.26, 0.66, 1.65, 0.1, SKIN, 4, 2.55),
    part(0.09, 0.04, 0.02, -0.1, 2.9, 0.34, RED), part(0.09, 0.04, 0.02, 0.1, 2.9, 0.34, RED),
    part(0.52, 0.2, 0.52, 0, 3.12, 0.12, PLATE, 5), part(1.05, 0.95, 0.1, 0, 2.1, 0.33, PLATE, 6)]),
  snuffer: () => mergeGeometries([part(0.5, 0.06, 0.5, 0, 0, 0, ASH, 0, 0, 0.785), part(0.06, 0.9, 0.06, 0, 0, 0, ASH),   // (a floating shard that eats firelight)
    part(0.9, 0.05, 0.05, 0, 0, 0, ASH), part(0.05, 0.05, 0.9, 0, 0, 0, ASH), part(0.16, 0.16, 0.16, 0, 0, 0, EYE), part(0.3, 0.3, 0.3, 0, 0, 0, PLATE, 6)]),   // (the core shows only once its shell is shot off)
};
// per kind: hit spheres [height, radius, damage multiplier, 0 head or 1 body], speed, bite, attack wait, first round, health multiplier,
// and armor: [helmet base, helmet per round, chest base, chest per round, chest from round]
export const KINDS = {
  hollow:  { hits: [[2.2, 0.26, 2.5, 0], [1.4, 0.4, 1, 1]], speed: [1.8, 1.4], bite: 14, wait: 1.0, from: 1, hp: 1, armor: [40, 12, 50, 15, 3] },
  shade:   { hits: [[0.95, 0.24, 2.5, 0], [0.85, 0.42, 1, 1]], speed: [5.2, 0.8], bite: 8, wait: 0.6, from: 3, hp: 0.45, armor: [20, 6, 30, 8, 3] },
  warden:  { hits: [[2.85, 0.32, 2.0, 0], [2.0, 0.72, 1, 1]], speed: [1.25, 0.2], bite: 34, wait: 1.6, from: 5, hp: 6, armor: [150, 40, 250, 60, 1] },
  snuffer: { hits: [[0, 0.55, 1, 1]], speed: [3.2, 0.6], bite: 0, wait: 1, from: 4, hp: 0.7, armor: [0, 0, 60, 15, 1] },
};
const ORDER = Object.keys(KINDS);

function walkMaterial() {   // the swing: each limb turns round its pivot by sin(stride) times how hard it is moving
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float limb; attribute float pivot; attribute vec2 gait; attribute vec2 armor;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if ((limb == 5.0 && armor.x < 0.5) || (limb == 6.0 && armor.y < 0.5)) transformed = vec3(0.0);   // (a broken plate is gone)
        if (limb > 0.5 && limb < 4.5) { float side = (limb == 1.0 || limb == 4.0) ? 1.0 : -1.0; float a = sin(gait.x) * gait.y * side * (limb > 2.5 ? 0.7 : 0.55);
          float dy = transformed.y - pivot, c = cos(a), s = sin(a); transformed.y = pivot + dy * c - transformed.z * s; transformed.z = dy * s + transformed.z * c; }`);
  };
  return m;
}

export class Hollow {
  constructor(scene) {
    this.meshes = {}; this.gaits = {}; this.armors = {};
    for (const kind of ORDER) {
      const geo = SHAPES[kind](), gait = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 2), 2); gait.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('gait', gait);
      const arm = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 2), 2); arm.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('armor', arm); this.armors[kind] = arm;
      const mesh = new THREE.InstancedMesh(geo, walkMaterial(), MAX); mesh.count = 0; mesh.frustumCulled = false; mesh.castShadow = kind === 'warden'; scene.add(mesh);
      this.meshes[kind] = mesh; this.gaits[kind] = gait;
    }
    this.z = []; this.next = 1; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.s = new THREE.Vector3(1, 1, 1); this.p = new THREE.Vector3();
  }
  // which kind comes next, by round: the walker always, the runner from round 3, the shard from 4, the giant from 5 (one in twelve)
  pick(round) {
    const r = Math.random();
    if (round >= 5 && r < 0.08) return 'warden';
    if (round >= 4 && r < 0.17) return 'snuffer';
    if (round >= 3 && r < 0.4) return 'shade';
    return 'hollow';
  }
  spawn(world, near, speedUp, round, baseHp) {
    if (this.z.length >= MAX) return null;
    const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 20, kind = this.pick(round), K = KINDS[kind];
    const x = Math.max(2, Math.min(157, near.x + Math.cos(a) * d)), z = Math.max(2, Math.min(157, near.z + Math.sin(a) * d));
    const k = { kind, x, y: world.height(Math.floor(x), Math.floor(z)), z, vy: 0, yaw: 0, hp: baseHp * K.hp, max: baseHp * K.hp, ah: K.armor[0] + K.armor[1] * round, ab: round >= K.armor[4] ? K.armor[2] + K.armor[3] * round : 0, cd: 0, id: this.next++, speed: (K.speed[0] + Math.random() * K.speed[1]) * speedUp, dig: 0, walk: Math.random() * 6, moving: 0 };
    this.z.push(k); return k;
  }
  // light at a point: 1 inside a fire's circle, falling to 0 at its edge; a carried torch counts too
  static lightAt(lights, x, y, z) {
    let L = 0; for (const f of lights) { const d = Math.hypot(f.x - x, f.y - y, f.z - z); if (d < f.r) L = Math.max(L, 1 - d / f.r); } return L;
  }
  // host only: every Hollow goes for what draws it most, keeps out of light, burns in it and by day. The shard instead hunts fires and eats their fuel.
  step(dt, world, players, lights, daylight, hurt, fires, drain) {
    for (const k of this.z) {
      const K = KINDS[k.kind]; k.moving = 0;
      if (daylight > 0.25) { k.hp -= dt * 40 * daylight; continue; }   // (morning burns them off: they stand and fade)
      if (k.kind === 'snuffer') {   // (it floats at one steady height over the land, goes for the nearest burning fire, and drinks it)
        let best = null, bd = 1e9; fires.forEach((f, i) => { if (f.fuel <= 0) return; const d = (f.x - k.x) ** 2 + (f.z - k.z) ** 2; if (d < bd) { bd = d; best = i; } });
        if (best === null) continue; const f = fires[best], dx = f.x - k.x, dz = f.z - k.z, d = Math.hypot(dx, dz) || 1;
        k.yaw += dt * 2.2;
        if (d > 1.6) { k.x += dx / d * k.speed * dt; k.z += dz / d * k.speed * dt; k.moving = 1; } else drain(best, dt * 6);
        k.y += ((world.height(Math.floor(k.x), Math.floor(k.z)) + 2.6) - k.y) * Math.min(1, dt * 2);
        continue;
      }
      const lit = Hollow.lightAt(lights, k.x, k.y + 1, k.z);
      if (lit > 0.15) k.hp -= dt * 55 * lit * (k.kind === 'warden' ? 0.35 : 1);   // (the edge of a fire hurts; the giant shrugs most of it off)
      let target = null, bd = 1e9;
      for (const p of players) { if (p.dead) continue; const d = (p.x - k.x) ** 2 + (p.z - k.z) ** 2; if (d < bd) { bd = d; target = p; } }
      for (const f of lights) if (f.big) { const d = ((f.x - k.x) ** 2 + (f.z - k.z) ** 2) * 0.6; if (d < bd) { bd = d; target = f; } }   // (a big fire calls them from farther than a person does)
      if (!target) continue;
      let dx = target.x - k.x, dz = target.z - k.z; const d = Math.sqrt(dx * dx + dz * dz) || 1; dx /= d; dz /= d;
      const ahead = Hollow.lightAt(lights, k.x + dx * 1.5, k.y + 1, k.z + dz * 1.5);
      if (ahead > 0.2 && k.kind !== 'warden') { const side = (k.id % 2 ? 1 : -1); [dx, dz] = [dx * 0.2 + dz * side, dz * 0.2 - dx * side]; }   // (light ahead: they circle the edge; the giant walks in)
      k.yaw = Math.atan2(dx, dz);
      const reach = k.kind === 'warden' ? 1.9 : 1.2;
      if (target.isPlayer && d < reach) { if ((k.cd -= dt) <= 0 && Math.abs(target.y - k.y) < 2.4) { hurt(target, K.bite, k); k.cd = K.wait; } continue; }
      const vx = dx * k.speed * dt, vz = dz * k.speed * dt, fx = k.x + dx * 0.7, fz = k.z + dz * 0.7;
      const block = world.solid(fx, k.y + 0.5, fz), above = world.solid(fx, k.y + 1.5, fz);
      if (!block) { k.x += vx; k.z += vz; k.moving = 1; }
      else if (!above && k.vy === 0) k.vy = 6.4;   // (one block up is a step)
      else if (Hollow.lightAt(lights, fx, k.y + 1, fz) < 0.1 || k.kind === 'warden') {   // (a wall in the dark comes apart; a lit wall holds, except against the giant)
        k.dig += dt * (k.kind === 'warden' ? 4 : 1); k.moving = 0.6;
        if (k.dig > 2.8) { for (const h of [0.5, 1.5, 2.5]) { const bx = Math.floor(fx), by = Math.floor(k.y + h), bz = Math.floor(fz); if (world.get(bx, by, bz) !== 12) world.set(bx, by, bz, 0); } k.dig = 0; }
      }
      k.vy -= 22 * dt; k.y += k.vy * dt;
      const ground = world.height(Math.floor(k.x), Math.floor(k.z)); if (k.y <= ground) { k.y = ground; k.vy = 0; }
    }
    this.z = this.z.filter(k => k.hp > 0);
  }
  // drawing: position, facing and the stride only (no bob, no sway: his 'the characters bob', 2026-10-18)
  draw(dt) {
    const n = {}; for (const kind of ORDER) n[kind] = 0;
    for (const k of this.z) {
      const kind = k.kind || 'hollow', i = n[kind]++, mesh = this.meshes[kind], gait = this.gaits[kind];
      if (k.px !== undefined) { const moved = Math.hypot(k.x - k.px, k.z - k.pz); k.walk = (k.walk || 0) + moved * 2.6; k.amp = (k.amp || 0) + ((moved > 0.0005 ? 1 : (k.moving || 0)) - (k.amp || 0)) * Math.min(1, dt * 8); }
      k.px = k.x; k.pz = k.z;
      gait.setXY(i, k.walk || 0, k.amp || 0); this.armors[kind].setXY(i, k.ah > 0 ? 1 : 0, k.ab > 0 ? 1 : 0);
      this.e.set(0, k.yaw, 0); this.q.setFromEuler(this.e); this.p.set(k.x, k.y, k.z); mesh.setMatrixAt(i, this.m.compose(this.p, this.q, this.s));
    }
    for (const kind of ORDER) { const mesh = this.meshes[kind]; mesh.count = n[kind]; mesh.instanceMatrix.needsUpdate = true; this.gaits[kind].needsUpdate = true; this.armors[kind].needsUpdate = true; }
  }
  // a hit: a plate takes most of a blow and wears down (piercing guns get more through and wear it faster); a blow that breaks a plate
  // is spent on the plate, so nothing armored dies to one shot. Returns what happened, for the hit marker and the points.
  damage(k, part, dmg, ap) {
    const key = part ? 'ab' : 'ah';
    if (k[key] > 0) {
      const through = dmg * (0.25 + 0.75 * ap); k[key] -= dmg * (0.6 + ap);
      if (k[key] <= 0) { k[key] = 0; k.hp -= Math.min(through, (k.max || k.hp) * 0.5); return { armor: true, broke: true }; }
      k.hp -= through; return { armor: true, broke: false };
    }
    k.hp -= dmg; return { armor: false, broke: false };
  }
  glide(dt) { const f = Math.min(1, dt * 12); for (const k of this.z) if (k.tx !== undefined) { k.x += (k.tx - k.x) * f; k.y += (k.ty - k.y) * f; k.z += (k.tz - k.z) * f; let d = k.tyaw - k.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); k.yaw += d * f; } }
  hit(origin, dir, max = 60) {   // the first one a shot passes through (the head counts more)
    let best = null, bt = max;
    for (const k of this.z) for (const [hy, r, mult, part] of KINDS[k.kind || 'hollow'].hits) {
      const cx = k.x - origin.x, cy = k.y + hy - origin.y, cz = k.z - origin.z, t = cx * dir.x + cy * dir.y + cz * dir.z;
      if (t < 0 || t > bt) continue;
      if (cx * cx + cy * cy + cz * cz - t * t < r * r) { bt = t; best = { k, mult, t, part }; }
    }
    return best;
  }
  pack() { const a = []; for (const k of this.z) a.push(k.id, ORDER.indexOf(k.kind), Math.round(k.x * 100) / 100, Math.round(k.y * 100) / 100, Math.round(k.z * 100) / 100, Math.round(k.yaw * 100) / 100, (k.ah > 0 ? 1 : 0) | (k.ab > 0 ? 2 : 0)); return a; }
  unpack(a) {   // (the guest keeps each Hollow's stride between updates, so legs swing smoothly; anything malformed is dropped)
    if (!Array.isArray(a) || a.length > MAX * 7) return;
    const old = new Map(this.z.map(k => [k.id, k])), z = [];
    for (let i = 0; i + 6 < a.length; i += 7) {
      const [id, t, x, y, zz, yaw, pl] = a.slice(i, i + 7); if (![id, t, x, y, zz, yaw, pl].every(Number.isFinite) || !ORDER[t]) continue;
      let k = old.get(id); if (!k) k = { id, walk: 0, amp: 0, x, y, z: zz, yaw };   // (new ones appear where they are; known ones glide to where they are now)
      Object.assign(k, { kind: ORDER[t], tx: x, ty: y, tz: zz, tyaw: yaw, hp: 1, ah: pl & 1, ab: pl & 2 }); z.push(k);
    }
    this.z = z;
  }
}
