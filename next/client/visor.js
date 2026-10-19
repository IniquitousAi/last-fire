// Rain on the visor (EARTH.md step 3): a pass over the world image only (the HUD is DOM above the canvas, so it is never touched).
// Two layers of drops, written for Last Fire from the well-known idea (a grid of cells, one drop per cell): small beaded drops that come
// and go, and bigger ones that slide down in jerks and leave a short trail. Each drop bends the view behind it (refraction) and darkens a
// hair at its edge; nothing glows. uAmt is how hard it rains; uWipe clears it for a moment (the wipe button).
import * as THREE from 'three';
export const VisorRain = {
  uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uAmt: { value: 0 }, uWipe: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uT, uAmt, uWipe; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    vec3 beads(vec2 uv, float s, float t){ vec2 a = vec2(uRes.x / uRes.y, 1.0), g = uv * a * s, id = floor(g), f = fract(g) - 0.5; float n = h(id);
      vec2 c = vec2(h(id + 1.7), h(id + 4.3)) - 0.5; vec2 p = f - c * 0.6; float life = fract(t * 0.07 + n * 7.0), on = step(0.45, n) * smoothstep(0.0, 0.08, life) * smoothstep(1.0, 0.6, life);
      float r = 0.16 + 0.1 * h(id + 9.1), d = length(p); float m = smoothstep(r, r * 0.55, d) * on; return vec3(p / r * m, m); }
    vec3 slide(vec2 uv, float s, float t){ vec2 a = vec2(uRes.x / uRes.y, 1.0); vec2 g = uv * a * s; g.y += t * 0.18; vec2 id = floor(g), f = fract(g) - 0.5; float n = h(id);
      float x = (n - 0.5) * 0.6, w = t + n * 6.283, y = -sin(w + sin(w + sin(w) * 0.5)) * 0.4;   // (it slides in jerks, the way water does on glass)
      vec2 p = f - vec2(x, y); p.y *= 1.25; float m = smoothstep(0.11, 0.06, length(p)) * step(0.45, n);
      return vec3(p * 6.0 * m, m); }   /* (no trail: a drawn trail read as a white stick with rings, his eyes would call it a glitch) */
    void main(){
      float amt = uAmt * (1.0 - uWipe); if (amt < 0.01) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      vec3 a = beads(vUv, 9.0, uT), b = slide(vUv, 4.0, uT), c = beads(vUv * 1.7 + 3.1, 14.0, uT + 3.0) * step(0.5, amt);
      float m = clamp((a.z + b.z + c.z) * amt, 0.0, 1.0); vec2 off = (a.xy + b.xy + c.xy) * 0.03 * amt;
      vec3 col = texture2D(tDiffuse, vUv - off).rgb; col *= 1.0 - 0.12 * m * smoothstep(0.4, 1.0, length(a.xy + b.xy));   /* (a thin dark rim where the drop's edge bends the light away) */
      gl_FragColor = vec4(col, 1.0); }`,
};
