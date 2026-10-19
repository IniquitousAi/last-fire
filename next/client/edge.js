// The dark's edge, moving (his pick: light and weather, "the dark's edge moving"). A low wall of dark mist around home whose radius comes from
// core/immersion.js edgeOf: far out by day, pulled in over dusk, pressed close at night, drawn back at dawn. One open cylinder, no lights, no glow:
// it is only darker air, thickest near the ground, drifting slowly, and thin enough that shapes behind it still read.
import * as THREE from 'three';

export class Edge {
  constructor(scene) {
    this.mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, uniforms: { uT: { value: 0 }, uA: { value: 0 } },
      vertexShader: 'varying vec2 vUv; varying vec3 vP; void main() { vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uT, uA; varying vec2 vUv; varying vec3 vP;
        float h(float x) { return fract(sin(x * 127.1) * 43758.5453); }
        float n(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h(i), h(i + 1.0), f); }
        void main() { float a = vUv.x * 6.2831; float drift = n(a * 3.0 + uT * 0.05) * 0.6 + n(a * 9.0 - uT * 0.08) * 0.4;
          float up = 1.0 - vUv.y; float body = smoothstep(0.0, 0.7, up) * (0.35 + 0.65 * drift);
          gl_FragColor = vec4(vec3(0.03, 0.015, 0.06), body * 0.34 * uA); }` });
    this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 96, 1, true).translate(0, 0.5, 0), this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 2; this.mesh.visible = false; scene.add(this.mesh);
  }
  update(t, edge, y, h = 16) { this.mat.uniforms.uT.value = t; this.mesh.position.set(edge.x, y - 1, edge.z); this.mesh.scale.set(edge.r, h, edge.r); this.mat.uniforms.uA.value = 1; this.mesh.visible = true; }
}
