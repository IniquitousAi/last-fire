// The Rift, drawn (his vision picture, ref/vision-2026-10-19.jpg, and his words in ANSWERS.md): the north gate of Earth's wall is a mouth into
// another dimension, black, with crimson and violet smoke and faint galaxy dust moving inside it; the corruption creeps out of it as glowing
// cracks in the ground and spreads across the land outside the walls (green, clean patches left between); inside, a black plain cracked
// everywhere, a deep crimson dark, and the console nobody understands. The rules are core/rift.js.
import * as THREE from 'three';
import { RIFT, EARTH } from '../core/game.js?v=174';
import { WILDS } from '../core/wilds.js?v=174';

// the corruption in the ground: glowing cracks, crimson to violet, strongest at the mouth and in the Rift, patchy outside the walls
const VEINS = `
float lfCorrupt(vec3 w) { if (w.z < 3000.0) return 0.0; if (w.z > 8500.0) return 1.0;
  float out0 = smoothstep(56.0, 78.0, max(abs(w.x), abs(w.z - 6000.0)));                       /* (outside the walls) */
  float patchy = smoothstep(0.38, 0.62, gn(vec3(w.xz * 0.011, 3.0)));                            /* (green, uncorrupted pockets survive between) */
  float mouth = 1.0 - smoothstep(3.0, 40.0, length(w.xz - vec2(${RIFT.x.toFixed(1)}, ${RIFT.z.toFixed(1)})));   /* (it devours outward from the Rift) */
  float clean = 1.0 - smoothstep(${(WILDS.green.r - 8).toFixed(1)}, ${WILDS.green.r.toFixed(1)}, length(w.xz - vec2(${(EARTH.x + WILDS.green.dx).toFixed(1)}, ${(EARTH.z + WILDS.green.dz).toFixed(1)})));   /* (the calm green patch of the Wilds, core/wilds.js: no corruption inside it) */
  return max(mouth, out0 * patchy * 0.85) * (1.0 - clean); }
vec2 lfH2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float lfEdge(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;   /* (cell edges: the distance between the nearest two cell centers, F2 - F1: a cracked-mud network) */
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), o = lfH2(i + g); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return d2 - d1; }
float lfCrack(vec3 w) { vec2 q = w.xz + (vec2(gn(vec3(w.xz * 0.21, 1.0)), gn(vec3(w.xz * 0.21, 4.0))) - 0.5) * 2.4 + (vec2(gn(vec3(w.xz * 1.6, 2.0)), gn(vec3(w.xz * 1.6, 8.0))) - 0.5) * 0.35;   /* (warped twice: wandering, then jagged) */
  float e1 = lfEdge(q * 0.16), e2 = lfEdge(q * 0.55 + 7.3), a1 = fwidth(e1) * 1.2 + 0.002, a2 = fwidth(e2) * 1.2 + 0.004, wv = 0.003 + 0.007 * gn(vec3(w.xz * 0.35, 3.0));
  float alive = smoothstep(0.22, 0.42, gn(vec3(w.xz * 0.06, 5.0)));   /* (not every crack burns: the network breaks up) */
  float big = (1.0 - smoothstep(wv, wv + a1, e1)) * alive + (1.0 - smoothstep(0.0, 0.045, e1)) * 0.14 * alive;   /* (a thin hot core, a faint warmth around it) */
  float small = (1.0 - smoothstep(0.02, 0.02 + a2, e2)) * smoothstep(0.5, 0.72, gn(vec3(w.xz * 0.09, 6.0)));
  return max(big, small * 0.6); }
`;
export function riftGround(groundMat, uT) {   // (wraps the ground shader once more, after the look: it only adds; it moves nothing)
  const prev = groundMat.onBeforeCompile, key0 = groundMat.customProgramCacheKey();
  groundMat.onBeforeCompile = (sh, r) => { prev.call(groundMat, sh, r); sh.uniforms.uRT = uT;
    let f = sh.fragmentShader; f = f.replace('void main() {', 'uniform float uRT;\n' + VEINS + '\nvoid main() {');
    f = f.replace('#include <color_fragment>', '#include <color_fragment>\n float lfC = lfCorrupt(vW); diffuseColor.rgb *= 1.0 - 0.55 * lfC;   /* (corrupted soil is burnt dark) */');
    f = f.replace('#include <aomap_fragment>', `#include <aomap_fragment>
      if (lfC > 0.001) { float ck = lfCrack(vW); vec3 vc = gn(vec3(vW.xz * 0.025, 7.0)) > 0.5 ? vec3(1.0, 0.06, 0.12) : vec3(0.5, 0.12, 1.0);   /* (red or violet, never blended into pink: his picture) */
        float pulse = 0.72 + 0.28 * sin(uRT * 1.2 + gn(vec3(vW.xz * 0.05, 2.0)) * 6.28); totalEmissiveRadiance += vc * ck * lfC * pulse * 1.15; }`);
    sh.fragmentShader = f; };
  groundMat.customProgramCacheKey = () => key0 + '|rift'; groundMat.needsUpdate = true;
}

// the mouth: an opening into a darkness that moves (swirling crimson and violet smoke, galaxy dust); the same shader, cold gray, is the way back
const MOUTH_VS = 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const MOUTH_FS = `varying vec2 vU; uniform float uT; uniform vec3 uA, uB; uniform float uDust;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
  void main(){ vec2 p = (vU - 0.5) * vec2(2.2, 2.0); float t = uT * 0.07;
    vec2 q = vec2(fbm(p * 1.6 + vec2(0.0, t)), fbm(p * 1.6 + vec2(5.2, -t * 1.3)));
    float s = fbm(p * 2.2 + q * 2.4 + vec2(t * 0.6, -t)), s2 = fbm(p * 3.1 - q * 1.7 + vec2(-t, t * 0.4));
    vec3 c = vec3(0.004, 0.0, 0.008);
    float ws = smoothstep(0.58, 0.7, s) * (1.0 - smoothstep(0.7, 0.86, s)), ws2 = smoothstep(0.6, 0.72, s2) * (1.0 - smoothstep(0.72, 0.88, s2));   /* (only the edges of the smoke burn: thin wisps on black) */
    c += uA * ws * 0.75 + uB * ws2 * 0.6;   /* (two smokes that never quite mix) */
    float st = step(0.9975, h(floor(vU * vec2(160.0, 560.0)))) * (0.5 + 0.5 * sin(uT * 2.0 + h(floor(vU * 90.0)) * 40.0));
    c += vec3(0.8, 0.75, 1.0) * st * uDust * (1.0 - smoothstep(0.4, 0.8, s));   /* (faint galaxy dust deep inside) */
    float edge = smoothstep(0.0, 0.06, vU.x) * smoothstep(1.0, 0.94, vU.x);   /* (the wall's own black at its sides) */
    gl_FragColor = vec4(c * edge, 1.0); }`;
function mouth(a, b, dust) { return new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) }, uDust: { value: dust } }, vertexShader: MOUTH_VS, fragmentShader: MOUTH_FS, side: THREE.DoubleSide, fog: false }); }

const smokeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();

export class RiftView {
  constructor(scene, land) {
    this.land = land; const H = 34, g0 = land(RIFT.x, RIFT.z);
    this.out = new THREE.Mesh(new THREE.PlaneGeometry(RIFT.w, H), mouth(0xc0102a, 0x6a1ad0, 1)); this.out.position.set(RIFT.x, g0 + H / 2 - 3, RIFT.z); scene.add(this.out);
    const gi = land(RIFT.in.x, RIFT.in.z); this.back = new THREE.Mesh(new THREE.PlaneGeometry(RIFT.w, H * 0.6), mouth(0x3a4458, 0x5a6078, 0.2)); this.back.position.set(RIFT.in.x, gi + H * 0.3 - 2, RIFT.in.z - 0.6); scene.add(this.back);
    // the smoke it breathes out over the yard, and the same smoke inside: dark sprites drifting low along the ground
    this.smoke = []; const mats = [0x3a0612, 0x22083a, 0x160410].map(c => new THREE.SpriteMaterial({ map: smokeTex, color: c, transparent: true, opacity: 0.55, depthWrite: false }));
    for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(mats[i % 3]), inside = i >= 14; s.userData = { inside, ph: i * 0.618 % 1, sp: 0.6 + (i * 0.37) % 1 * 0.5, sx: ((i * 2.399) % 1 - 0.5) }; s.scale.setScalar(inside ? 14 : 9); scene.add(s); this.smoke.push(s); }
    // inside: dust that hangs in the air, violet and white, barely moving
    const N = 700, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const a = (i * 2.399) % 6.283, r = 6 + ((i * 0.618) % 1) * 60; pos.set([RIFT.console.x + Math.cos(a) * r, 1 + ((i * 0.37) % 1) * 22, RIFT.console.z + Math.sin(a) * r], i * 3); const v = (i * 0.77) % 1; col.set(v < 0.5 ? [0.55, 0.3, 1] : v < 0.8 ? [0.9, 0.2, 0.35] : [0.85, 0.85, 1], i * 3); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false })); scene.add(this.dust);
    // the console: a dark machine half sunk in the cracked floor, one red eye; when it wakes, rings of light turn around it
    const c = new THREE.Group(), gc = land(RIFT.console.x, RIFT.console.z);
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.25, 48, 32), new THREE.MeshStandardMaterial({ color: 0x15161b, metalness: 0.85, roughness: 0.32 })); body.position.y = 0.55;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshBasicMaterial({ color: 0xff1a3c })); eye.position.set(0, 0.85, 1.12);
    const iris = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 8, 40), new THREE.MeshStandardMaterial({ color: 0x0a0a0d, metalness: 0.9, roughness: 0.3 })); iris.position.set(0, 0.85, 1.1);
    this.rings = [0, 1, 2].map(i => { const m = new THREE.Mesh(new THREE.TorusGeometry(2 + i * 0.55, 0.018, 6, 96), new THREE.MeshBasicMaterial({ color: i === 1 ? 0x7a2cff : 0xff1a3c, transparent: true, opacity: 0 })); m.position.y = 0.9 + i * 0.35; m.rotation.x = Math.PI / 2 + (i - 1) * 0.35; c.add(m); return m; });
    c.add(body, eye, iris); c.position.set(RIFT.console.x, gc - 0.15, RIFT.console.z); c.rotation.y = Math.PI; scene.add(c); this.console = c; this.eye = eye;
  }
  update(t, g, me) {
    this.out.material.uniforms.uT.value = t; this.back.material.uniforms.uT.value = t; const inside = me && me.z > 8500;
    for (const s of this.smoke) { const u = s.userData, k = (t * 0.035 * u.sp + u.ph) % 1;
      if (u.inside) { const a = u.ph * 6.283 + t * 0.02 * u.sp, r = 10 + k * 50; s.position.set(RIFT.console.x + Math.cos(a) * r, this.land(s.position.x || RIFT.console.x, s.position.z || RIFT.console.z) + 1.5 + k * 2, RIFT.console.z + Math.sin(a) * r); s.material.opacity = 0.5; }
      else { s.position.set(RIFT.x + u.sx * 14 * (0.3 + k), this.land(RIFT.x, RIFT.z - 2) + 1.2 + k * 2.5, RIFT.z - 1 - k * 22); s.material.opacity = 0.55 * Math.sin(k * Math.PI); } }   /* (it pours out of the mouth and thins as it crawls into the yard) */
    const on = !!(g && g.rift && g.rift.on); for (let i = 0; i < 3; i++) { const r = this.rings[i]; r.material.opacity += ((on ? 0.85 : 0) - r.material.opacity) * 0.05; r.rotation.z = t * (0.25 + i * 0.12) * (i % 2 ? -1 : 1); }
    this.eye.scale.setScalar(on ? 1 + 0.15 * Math.sin(t * 6) : 0.8 + 0.1 * Math.sin(t * 0.8));
    this.dust.visible = this.back.visible = inside; this.out.visible = !inside;
  }
}
