// The Last Fire (his big ask, 2026-10-19: "make the fire the coolest thing ever", never normal fire colors; the core you build around).
// Logic, not decoration: a fire that eats light and burns hotter than any natural one is a plasma. Hot things shift from orange through
// white toward blue, and electrified gases glow violet and pink (argon, neon), so this one is a white core, a magenta body, violet and deep
// blue at the edges. A real volume: rays marched through rising, folded noise inside a box, so it has depth you can see into, not a cone.
// It answers the world: crackles you hear make it flare (sound and sight agree), its level makes it taller, starving it turns it deep blue.
import * as THREE from 'three';

const VERT = `varying vec3 vO; varying vec3 vCam;
void main(){ vO = position; vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `precision highp float; varying vec3 vO; varying vec3 vCam; uniform float uT, uFuel, uPulse, uLevel, uSteps;
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm2(vec3 p){ return 0.62 * n3(p) + 0.38 * n3(p * 2.07 + vec3(1.7, 0.0, 3.1)); }   // (two octaves are enough for the folds)
float fbm(vec3 p){ float a = 0.55, s = 0.0; for (int i = 0; i < 4; i++) { s += a * n3(p); p = p * 2.07 + vec3(1.7, 0.0, 3.1); a *= 0.5; } return s; }
// density: a tapering column of folded, rising noise; tongues break off near the top
float dens(vec3 p){
  float h = p.y + 0.5; if (h < 0.0 || h > 1.0) return 0.0; h = clamp(h, 0.0, 1.0);
  vec3 q = vec3(p.x * 4.6, p.y * 3.4 - uT * 2.1, p.z * 4.6);
  q.xz += (vec2(fbm2(q * 0.6 + uT * 0.3), fbm2(q * 0.6 - uT * 0.23)) - 0.5) * (0.9 + h * 2.2);   // (the higher, the wilder: tongues lick sideways near the top)   // (domain warp: the folds that make it read as fire, not smoke)
  float n = fbm(q), r = length(p.xz) / 0.5, width = mix(0.95, 0.12, pow(h, 0.85)) * (0.82 + 0.18 * uFuel);
  float body = 1.0 - smoothstep(width * 0.55, width, r);
  return body * smoothstep(0.4, 0.7, n + body * 0.24 - h * 0.3) * smoothstep(0.0, 0.06, h);   // (a tighter threshold: separate tongues and gaps, not a smooth beam)
}
// heat to color: white core, magenta body, violet, then deep blue at the coldest edge (never orange)
vec3 ramp(float t){
  vec3 c = mix(vec3(0.05, 0.08, 0.6), vec3(0.45, 0.22, 1.0), smoothstep(0.0, 0.3, t));
  c = mix(c, vec3(1.0, 0.25, 0.85), smoothstep(0.25, 0.6, t));
  return mix(c, vec3(1.0, 0.9, 1.0), smoothstep(0.78, 1.0, t));
}
void main(){
  vec3 ro = vCam, rd = normalize(vO - vCam);
  vec3 inv = 1.0 / rd, t0 = (-0.5 - ro) * inv, t1 = (0.5 - ro) * inv, tmin = min(t0, t1), tmax = max(t0, t1);
  float a = max(max(max(tmin.x, tmin.y), tmin.z), 0.0), b = min(min(tmax.x, tmax.y), tmax.z); if (b <= a) discard;
  const int N = 40; float steps = uSteps, stepL = (b - a) / steps, T = 1.0; vec3 col = vec3(0.0);   // (fewer steps up close, where it fills the screen: the frame rate is part of the look)
  float jitter = h3(vec3(gl_FragCoord.xy, uT)) * stepL;   // (a little noise in where each ray starts hides the steps)
  for (int i = 0; i < N; i++) { if (float(i) >= steps) break;
    vec3 p = ro + rd * (a + jitter + stepL * float(i)); float d = dens(p); if (d < 0.01) continue;
    float h = p.y + 0.5, heat = clamp(d * d * (1.15 - h * 1.0) * (0.7 + 0.4 * uFuel) + uPulse * 0.18, 0.0, 1.0);
    vec3 e = ramp(heat) * d * (1.6 + uLevel * 0.12) * (0.55 + 0.45 * uFuel);
    col += e * T * stepL * 3.6; T *= exp(-d * stepL * 6.0); if (T < 0.03) break;
  }
  gl_FragColor = vec4(col, 1.0 - T);
}`;

export class FireCore {
  constructor(scene) {
    this.u = { uT: { value: 0 }, uFuel: { value: 1 }, uPulse: { value: 0 }, uLevel: { value: 0 }, uSteps: { value: 40 } };
    this.vol = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide }));
    this.vol.frustumCulled = false; this.vol.renderOrder = 5;
    // the base: a dark forge ring, black metal, with two hairlines of light (the core you build around)
    this.base = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x0c0d12, roughness: 0.35, metalness: 0.85 });
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.5, 0.42, 48, 1, true), metal); bowl.position.y = 0.21;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x050508, emissive: 0x2a0a40, emissiveIntensity: 1 })); floor.position.y = 0.05;
    this.lines = [0.43, 0.08].map((y, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(i ? 1.52 : 1.27, 0.012, 6, 96), new THREE.MeshBasicMaterial({ color: i ? 0xb026ff : 0xff2a8d })); m.rotation.x = Math.PI / 2; m.position.y = y; return m; });
    this.base.add(bowl, floor, ...this.lines); scene.add(this.base, this.vol);
    this.pulse = 0;
  }
  place(x, y, z) { this.base.position.set(x, y, z); this.x = x; this.y = y; this.z = z; }
  flare(k = 1) { this.pulse = Math.min(1.5, this.pulse + k); }   // (a crackle you hear: the flame answers)
  update(t, dt, level, fuel, camDist = 10) {   // (fuel 0..1: how fed it is)
    this.u.uSteps.value = Math.round(16 + 24 * Math.min(1, Math.max(0, (camDist - 3) / 12)));
    this.pulse = Math.max(0, this.pulse - dt * 3.5); const lit = fuel > 0;
    const hgt = lit ? 5.2 + level * 1.8 + fuel * 1.0 : 0.7, wid = lit ? 2.4 + level * 0.35 : 1.0;   // (each level it stands taller: the core grows with what you feed it)
    this.vol.scale.set(wid, hgt, wid); this.vol.position.set(this.x, this.y + 0.15 + hgt / 2, this.z);
    Object.assign(this.u.uT, { value: t }); this.u.uFuel.value = lit ? Math.max(0.15, fuel) : 0.05; this.u.uPulse.value = this.pulse; this.u.uLevel.value = level;
    this.lines[0].material.color.setRGB(1.0, 0.31 + this.pulse * 0.3, 0.85); return this.pulse;
  }
}
