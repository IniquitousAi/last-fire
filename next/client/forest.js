// The Wilds' forest (core/wilds.js): black dead pines and bare trees outside Earth's walls, one calm patch of live green trees. Trees are grown by
// ez-tree (vendor/ez-tree, MIT): a few pine variants and a leafless dead one, each baked ONCE, then every trunk of the core's TREES list is drawn
// as an instance of its variant (branches and needles are two InstancedMeshes per variant). Positions, scale and lean come from the core (the same
// list pushOut and the robots use). Rooted: each trunk is sunk a little into g.land, never floating. Near-black bark and needles, so against the sky
// they read as the black silhouettes of his north star; only the green patch keeps dark green needles. LOD: inside 90 m the full tree, 90 to 240 m
// the same bark only (no needle cards), past 240 m nothing; the instance sets are rebuilt when you have moved 25 m. Drawn only on Earth.
import * as THREE from 'three';
import { Tree } from '../../vendor/ez-tree/ez-tree.es.js';
import { TREES, EARTH } from '../core/game.js?v=174';
import { WILDS } from '../core/wilds.js?v=174';

const BARK = 0x06070b, NEEDLE = 0x090a10, GREEN = 0x2b6a3c;
// variant recipes: preset to start from, seed, and what to change; each kind of core tree picks among its variants by its place in the list
const RECIPES = {
  deadpine: [['Pine Small', 11], ['Pine Medium', 12], ['Pine Large', 13], ['Pine Medium', 14]],
  bare: [['Pine Medium', 21, { noLeaves: true }], ['Pine Small', 22, { noLeaves: true }]],
  live: [['Pine Medium', 31, { green: true }], ['Pine Small', 32, { green: true }]],
};

function bake(preset, seed, o = {}) {
  const t = new Tree(); t.loadPreset(preset); const op = t.options; op.seed = seed; op.bark.textured = false; op.bark.tint = BARK; op.bark.flatShading = true; op.leaves.tint = o.green ? GREEN : NEEDLE;
  if (o.noLeaves) op.leaves.count = 0; else if (o.far) op.leaves.count = 0; else op.leaves.count = Math.max(1, Math.round(op.leaves.count * 0.85));   // (needle cards are most of the triangles: most near, none far)
  if (o.far) { op.branch.levels = Math.min(op.branch.levels, 1); op.branch.children[0] = Math.min(op.branch.children[0], 4); op.branch.sections[0] = 4; op.branch.sections[1] = 3; op.branch.segments[0] = 4; op.branch.segments[1] = 3; }   // (a far tree is a trunk and a few limbs: a silhouette in the fog)
  else { op.branch.levels = Math.min(op.branch.levels, 2); op.branch.children[0] = Math.min(op.branch.children[0], 6); op.branch.children[1] = Math.min(op.branch.children[1], 4); const S = { 0: 8, 1: 5, 2: 3 }, G = { 0: 6, 1: 4, 2: 3 }; for (const k of [0, 1, 2]) { op.branch.sections[k] = Math.min(op.branch.sections[k], S[k]); op.branch.segments[k] = Math.min(op.branch.segments[k], G[k]); } }
  t.generate();
  const br = t.branchesMesh.geometry, lf = t.leavesMesh.geometry, lm = t.leavesMesh.material;
  br.computeBoundingBox(); const box = br.boundingBox.clone(); if (lf.attributes.position.count) { lf.computeBoundingBox(); box.union(lf.boundingBox); }
  let tr = 0; { const P = br.attributes.position; for (let i = 0; i < P.count; i++) if (P.getY(i) < box.min.y + 0.3) tr = Math.max(tr, Math.hypot(P.getX(i), P.getZ(i))); }   // (the trunk's radius at the foot: collision must match what you see)
  return { tr, br, lf: lf.attributes.position.count ? lf : null, map: lm.map || null, h: box.max.y - box.min.y, y0: box.min.y, tris: (br.index ? br.index.count / 3 : 0) + (lf.index ? lf.index.count / 3 : 0) };
}

export class Forest {
  constructor(scene, land) {
    this.land = land; this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group); this.at = { x: 1e9, z: 1e9 }; this.sets = []; this.stats = { variants: 0, tris: 0 };
    const barkM = new THREE.MeshStandardMaterial({ color: BARK, roughness: 1, metalness: 0, flatShading: true });
    for (const [kind, recipes] of Object.entries(RECIPES)) {
      const mine = TREES.filter(t => t.kind === kind); recipes.forEach(([preset, seed, opt], v) => {
        let b; try { b = bake(preset, seed, opt); } catch (e) { console.warn('tree variant', kind, v, e); return; }
        let f; try { f = bake(preset, seed, { ...opt, far: true }); } catch (e) { f = b; }
        const list = mine.filter((_, i) => i % recipes.length === v), cap = list.length, sc = WILDS.kinds[kind].h / b.h, fsc = WILDS.kinds[kind].h / f.h;
        const mk = (geo, mat, far) => { const im = new THREE.InstancedMesh(geo, mat, cap); im.count = 0; im.frustumCulled = false; this.group.add(im); return im; };
        const leafM = b.lf ? new THREE.MeshStandardMaterial({ color: opt && opt.green ? GREEN : NEEDLE, map: b.map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 }) : null;
        this.sets.push({ list, sc, fsc, y0: b.y0, fy0: f.y0, near: mk(b.br, barkM), far: mk(f.br, barkM), leaves: b.lf ? mk(b.lf, leafM) : null }); this.stats.variants++; this.stats.tris += b.tris; (this.stats.v = this.stats.v || []).push(`${kind}${v}:h${b.h.toFixed(0)} r${b.tr.toFixed(2)} sc${sc.toFixed(2)} foot${(b.tr * sc).toFixed(2)}m tris${b.tris} far${f.tris}`);
      });
    }
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.s = new THREE.Vector3(); this.p = new THREE.Vector3();
  }
  rebuild(me) {
    const { m, q, e, s, p } = this; this.at = { x: me.x, z: me.z };
    for (const V of this.sets) { let nn = 0, nf = 0;
      for (const t of V.list) { const d = Math.hypot(t.x - me.x, t.z - me.z); if (d > 240) continue; e.set(t.lean, t.ry, t.lean * 0.6); q.setFromEuler(e); s.setScalar(t.sc * V.sc); p.set(t.x, this.land(t.x, t.z) - t.sink - V.y0 * t.sc * V.sc, t.z); m.compose(p, q, s);
        if (d <= 90) { V.near.setMatrixAt(nn, m); if (V.leaves) V.leaves.setMatrixAt(nn, m); nn++; } else { s.setScalar(t.sc * V.fsc); p.y = this.land(t.x, t.z) - t.sink - V.fy0 * t.sc * V.fsc; m.compose(p, q, s); V.far.setMatrixAt(nf++, m); } }
      V.near.count = nn; V.far.count = nf; if (V.leaves) V.leaves.count = nn; V.near.instanceMatrix.needsUpdate = V.far.instanceMatrix.needsUpdate = true; if (V.leaves) V.leaves.instanceMatrix.needsUpdate = true; }
  }
  update(me) {
    const on = me.z > 3000 && Math.hypot(me.x - EARTH.x, me.z - EARTH.z) < WILDS.to + 120; this.group.visible = on && !window.__noforest; if (!on) return;   // (window.__noforest: the test's switch for a same-page fps comparison)
    if (Math.hypot(me.x - this.at.x, me.z - this.at.z) > 25) this.rebuild(me);
  }
}
