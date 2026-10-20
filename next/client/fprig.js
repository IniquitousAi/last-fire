// The Blender-made first-person rifle (tools/blender/rifle_fp.py): our own gun and arms on one 43-bone rig, with its own clips (idle, ads,
// fire, reload_tac, reload_empty). Its camera empty sits at the rig root looking down -Z, so the rig hangs straight off the view camera.
// Test only for now (?fp in the address): it stands in for the M4 and the old arms, to be judged against them before it replaces anything.
export class FpRig {
  constructor(T, vcam, gltf) {
    this.T = T; this.adsW = 0; this.root = gltf.scene; this.root.visible = false; vcam.add(this.root);
    this.root.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (/glow/.test(o.material.name)) this.glow = (this.glow || []).concat(o.material); } });
    this.mix = new T.AnimationMixer(this.root); const clip = n => gltf.animations.find(a => a.name === n);
    this.a = {}; for (const n of ['idle', 'ads', 'reload', 'reload_tac', 'reload_empty', 'charge']) { const c = clip(n); if (c) this.a[n] = this.mix.clipAction(c); }
    const fc = clip('fire');   // (the shot adds only its kick on top of the pose you are in: played whole, it was keyed from the hip and pulled the aimed gun down to it every shot, his words 2026-10-20)
    if (fc) this.a.fire = this.mix.clipAction(T.AnimationUtils.makeClipAdditive(fc.clone()), undefined, T.AdditiveAnimationBlendMode);
    for (const n of ['fire', 'reload', 'reload_tac', 'reload_empty', 'charge']) if (this.a[n]) { this.a[n].setLoop(T.LoopOnce, 1); this.a[n].clampWhenFinished = false; }
    this.a.idle.play(); this.a.ads.play(); this.a.ads.paused = true; this.a.ads.setEffectiveWeight(0);   /* (the aimed pose holds still: the sight must not drift off center, tested in sim/lane_d_sights.cjs) */ this.busy = null;
    this.mix.addEventListener('finished', e => { if (e.action === this.busy) { this.busy = null; this.base(1); } });
  }
  base(w) { this.a.idle.setEffectiveWeight(w * (1 - this.adsW)); this.a.ads.setEffectiveWeight(w * this.adsW); }
  fire() { if (this.busy || !this.a.fire) return; const f = this.a.fire; f.reset().setEffectiveWeight(1 - 0.5 * this.adsW).play(); this.flash = 0.06; }   /* (half the kick when aimed: the sight stays on target) */
  reload(empty, secs) { const r = this.a[empty ? 'reload_empty' : 'reload_tac'] || this.a.reload; if (!r) return; this.a.fire.stop(); r.reset(); r.timeScale = r.getClip().duration / secs; r.setEffectiveWeight(1).play(); this.busy = r; this.base(0); }
  charge() { const c = this.a.charge; if (c) c.reset().setEffectiveWeight(1).play(); }   // (the rail's cage spins up)
  update(dt, on, ads, kick, ch = 0) {
    this.root.visible = on; if (!on) return; this.adsW = ads * ads * (3 - 2 * ads); if (!this.busy) this.base(1);
    const h = 1 - this.adsW; this.root.position.set(0.015 * h, -0.025 * h, -0.07 * h + kick * 0.03 * (1 - this.adsW * 0.6));   /* (at the hip the rig sits a little further out and lower: in Blender it filled half the screen; aimed, it is exactly the file's pose so the sight stays centered) */ this.root.rotation.x = kick * 0.04 * (1 - this.adsW * 0.7);
    if (this.glow) { this.flash = Math.max(0, (this.flash || 0) - dt); for (const m of this.glow) if (m.emissiveIntensity !== undefined) m.emissiveIntensity = 1 + ch * 2.5 + (this.flash > 0 ? 3 : 0);   /* (the rails brighten as the charge builds, flash on the shot) */ }
    this.mix.update(dt);
  }
}
