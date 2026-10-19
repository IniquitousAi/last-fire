// Earth's rain (EARTH.md step 2): one instanced set of thin streaks in a box that travels with you, every drop moved in the vertex shader
// from time and its own seed (no CPU work per drop). Pale violet-white, a little slant from the wind, faint unless a light is near: the
// streaks catch the lamps, as rain does at night. Only drawn on Earth.
import * as THREE from 'three';

export class Rain {
  constructor(scene, n = 2600) {
    const g = new THREE.InstancedBufferGeometry(); g.copy(new THREE.PlaneGeometry(0.012, 0.55)); g.instanceCount = n;
    const seed = new Float32Array(n * 4); for (let i = 0; i < n; i++) seed.set([Math.random(), Math.random(), Math.random(), 0.75 + Math.random() * 0.5], i * 4);
    g.setAttribute('seed', new THREE.InstancedBufferAttribute(seed, 4));
    this.mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uAmt: { value: 0 }, uWind: { value: new THREE.Vector2(0.9, 0.3) } },
      vertexShader: `attribute vec4 seed; uniform float uT; uniform vec3 uCam; uniform vec2 uWind; varying float vA;
        void main() {
          const float B = 36.0, H = 24.0; float fall = 11.0 * seed.w;   // (a raindrop falls at about 9 to 13 m/s)
          vec3 p = vec3(seed.x * B - B * 0.5, mod(seed.z * H - uT * fall, H) - H * 0.35, seed.y * B - B * 0.5);
          p.xz += uWind * (p.y / fall);   // (the slant the wind gives it)
          vec3 base = vec3(floor(uCam.x / B) * B, uCam.y, floor(uCam.z / B) * B); vec3 w = p + base; w.x += B * step(w.x, uCam.x - B * 0.5) - B * step(uCam.x + B * 0.5, w.x); w.z += B * step(w.z, uCam.z - B * 0.5) - B * step(uCam.z + B * 0.5, w.z);
          vec3 toCam = normalize(vec3(uCam.x - w.x, 0.0, uCam.z - w.z)), side = vec3(toCam.z, 0.0, -toCam.x);   // (each streak turns to face you around the up axis)
          vec3 dir = normalize(vec3(uWind.x / fall, -1.0, uWind.y / fall));
          w += side * position.x - dir * position.y;
          float d = distance(w, uCam); vA = smoothstep(26.0, 6.0, d) * smoothstep(0.4, 1.5, d);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: `uniform float uAmt; varying float vA; void main() { gl_FragColor = vec4(vec3(0.78, 0.76, 0.95) * 0.22 * uAmt * vA, 1.0); }` });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.visible = false; scene.add(this.mesh);
  }
  update(t, cam, amount) { this.mat.uniforms.uT.value = t; this.mat.uniforms.uCam.value.copy(cam.position); this.mat.uniforms.uAmt.value = amount; this.mesh.visible = amount > 0.01; }
}
