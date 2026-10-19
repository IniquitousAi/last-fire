// The optics you can see: a mirror, a lens or a prism on a street-lamp stand (the real scan), and the faint bent beams between them.
// Rules are in core/optics.js; this only draws what the core says (g.optics and C.opticBeams). Rough: a thin disc, a lens and a prism of glass.
export class OpticsView {
  constructor(THREE, scene, models, land) {
    this.T = THREE; this.scene = scene; this.models = models; this.land = land; this.views = new Map(); this.pool = [];
    const c = document.createElement('canvas'); c.width = 128; c.height = 1; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(110,130,255,0.5)'); gr.addColorStop(1, 'rgba(110,130,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 1);
    this.tex = new THREE.CanvasTexture(c); this.beamMat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    this.glass = new THREE.MeshStandardMaterial({ color: 0x8fa8ff, transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0.2, emissive: 0x1a2a66, emissiveIntensity: 0.6 });
    this.metal = new THREE.MeshStandardMaterial({ color: 0xc4ceff, roughness: 0.06, metalness: 1, emissive: 0x1a2a66, emissiveIntensity: 0.5, side: THREE.DoubleSide });
  }
  make(o) {
    const T = this.T, grp = new T.Group(), head = new T.Group(); head.position.y = 1.2;
    const lp = this.models.lamppost; if (lp) { const post = lp.scene.clone(), b = new T.Box3().setFromObject(post), k = 1.15 / (b.max.y - b.min.y); post.scale.setScalar(k); post.position.y = -b.min.y * k; grp.add(post); }
    let m; if (o.kind === 'mirror') m = new T.Mesh(new T.CircleGeometry(0.34, 28), this.metal); else if (o.kind === 'lens') { m = new T.Mesh(new T.SphereGeometry(0.3, 24, 16), this.glass); m.scale.set(1, 1, 0.28); } else { m = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 0.6, 3), this.glass); m.rotation.x = Math.PI / 2; }
    head.add(m); grp.add(head); grp.userData.head = head; return grp;
  }
  update(g, C) {
    const live = new Set(), T = this.T;
    for (const o of g.optics || []) { live.add(o.id); let v = this.views.get(o.id); if (!v) { v = this.make(o); this.views.set(o.id, v); this.scene.add(v); }
      v.position.set(o.x, this.land(o.x, o.z), o.z); v.userData.head.rotation.y = o.yaw + Math.PI; }
    for (const [id, v] of this.views) if (!live.has(id)) { this.scene.remove(v); this.views.delete(id); }
    const bs = (g.optics && g.optics.length) ? C.opticBeams(g, C.TORCH) : [];
    while (this.pool.length < bs.length) { const m = new T.Mesh(new T.PlaneGeometry(1, 0.1), this.beamMat); m.rotation.order = 'YXZ'; m.frustumCulled = false; this.scene.add(m); this.pool.push(m); }
    this.pool.forEach((m, i) => { const b = bs[i]; m.visible = !!b; if (!b) return; const len = b.r * 0.85, y = this.land(b.x, b.z) + 1.2;
      m.scale.set(len, Math.max(4, Math.tan(Math.acos(b.cos)) * len * 10), 1); m.position.set(b.x + b.dx * len / 2, y, b.z + b.dz * len / 2); m.rotation.set(-Math.PI / 2, Math.atan2(-b.dz, b.dx), 0); });   // (a flat fan on the beam's line, fading out along its length)
  }
}
