// Last Fire: three proven render recipes to compare, behind ?look=1, ?look=2 and ?look=3. With no ?look this returns null and the game is
// exactly as it was. Each recipe is copied from what the best real-time renderers ship, not hand-tuned from zero:
//   1. PBR + HDRI: the full Poly Haven / ambientCG texture sets at 2K (color, normal, roughness, AO) on the ground, world-space PBR detail on
//      every untextured prop (Ben Golus's whiteout triplanar), image-based light from a real night-sky HDRI (three's PMREM), 4x MSAA on the
//      post chain (three's EffectComposer has none by default, so every edge was raw), 16x anisotropic filtering.
//   2. Look 1 plus the pmndrs / three.js "realism" stack: N8AO ambient occlusion (N8python, ISC), SMAA anti-aliasing (Jimenez et al., three's
//      SMAAPass), AgX tone mapping (Blender 4's default), bloom only on true HDR emitters (threshold 1.0, the Unreal / pmndrs default).
//   3. A cinematic night (Cyberpunk 2077 night, The Last of Us exteriors): look 2's stack with Khronos PBR Neutral tone mapping (keeps neon
//      hues), a faint violet moon key so normal maps read everywhere, wet patches with real specular, true blacks (no lifted shadows), a
//      light filmic contrast, finer grain, no edge color split, a thinner rim and 25% less fog.
// Every value is a variable below; the HUD is DOM and never touched.

const TEX = '../assets/tex/';
const RECIPES = {
  1: { name: 'PBR + HDRI', env: 0.45, msaa: 0, ao: null, smaa: true, tone: 'ACES', exposure: 1.0, bloom: null, clean: false, fogK: 1, rim: 0.7, moon: 0, wet: false },
  2: { name: 'PBR + N8AO + SMAA + AgX', env: 0.45, msaa: 0, ao: { aoRadius: 1.4, distanceFalloff: 0.5, intensity: 2.6 }, smaa: true, tone: 'AgX', exposure: 1.0, bloom: { threshold: 1.0, strength: 0.55, radius: 0.55 }, clean: false, punchy: true, fogK: 1, rim: 0.7, moon: 0, wet: false },
  3: { name: 'Cinematic night', env: 0.4, msaa: 0, ao: { aoRadius: 1.8, distanceFalloff: 0.6, intensity: 3.2 }, smaa: true, tone: 'Neutral', exposure: 1.15, bloom: { threshold: 1.1, strength: 0.5, radius: 0.75 }, clean: true, fogK: 0.75, rim: 0.35, moon: 0.22, wet: true },
};

export function applyLook(n, ctx) {
  if (!RECIPES[n]) return null; const R = { ...RECIPES[n] };
  const OFF = new Set((new URLSearchParams(location.search).get('lfoff') || '').split(','));   // (testing only: ?lfoff=msaa,detail,env,ground,ao,smaa switches parts off to time them)
  for (const k of ['wet', 'clean', 'bloom']) if (OFF.has(k)) R[k] = k === 'bloom' ? null : false;
  const { THREE, renderer, scene, camera, composer, renderPass, bloom, grade, groundMat } = ctx;
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (f, srgb) => { const t = new THREE.TextureLoader().load(TEX + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const stats = { look: n, name: R.name, detailed: 0, env: false, passes: [] };

  // ---- the rim (every mesh's violet edge, main.js): thinner in the cinematic look
  if (R.rim !== 0.7) THREE.ShaderChunk.emissivemap_fragment = THREE.ShaderChunk.emissivemap_fragment.replace('rimF * rimD * 0.7', 'rimF * rimD * ' + R.rim.toFixed(2));

  // ---- the ground: the full 2K PBR sets, at the same world scale the game already used (0.22 and 0.15 repeats a meter). Packed offline to
  // halve the reads: AO baked into the color (as mix(1, ao, 0.85)), roughness in the normal map's blue (z is rebuilt). Only the set a pixel
  // shows is read: the two stones blend in a narrow band, so most pixels read 2 textures, not 4
  const G = { uRock: tex('lf_gray_rocks_colao_2k.jpg', true), uGN: tex('lf_gray_rocks_nrm_rough_2k.jpg'), uDark: tex('lf_rock035_colao_2k.jpg', true), uRN: tex('lf_rock035_nrm_rough_2k.jpg') };
  const prevGround = groundMat.onBeforeCompile;
  if (!OFF.has('ground')) groundMat.onBeforeCompile = (sh, r) => {
    prevGround(sh, r);
    for (const k in G) sh.uniforms[k] = { value: G[k] };
    let f = sh.fragmentShader;
    f = f.replace('uniform sampler2D uRock, uDark;', 'uniform sampler2D uRock, uDark, uGN, uRN;');
    // the old ground multiplied the photo by three octaves of value noise (1.7 and 7 cycles a meter): that smear over the real stone was the mud
    f = f.replace(/diffuseColor\.rgb \*= 0\.55 \+ gn\(vW \* 0\.35\) \* 0\.35 \+ gn\(vW \* 1\.7\) \* 0\.3 \+ gn\(vW \* 7\.0\) \* 0\.2;/, 'diffuseColor.rgb *= 0.8 + gn(vW * 0.35) * 0.3;');
    f = f.replace(/vec3 rk = mix\(texture2D\(uRock, vW\.xz \* 0\.22\)\.rgb, texture2D\(uDark, vW\.xz \* 0\.15\)\.rgb \* 1\.3, smoothstep\(0\.35, 0\.65, gn\(vW \* 0\.05\)\)\);/, `
      float gM = smoothstep(0.35, 0.65, gn(vW * 0.05)); vec2 gU1 = vW.xz * 0.22, gU2 = vW.xz * 0.15, d1x = dFdx(gU1), d1y = dFdy(gU1), d2x = dFdx(gU2), d2y = dFdy(gU2);
      vec3 rk = vec3(0.0); vec4 gNR = vec4(0.0);
      if (gM < 0.999) { float w = 1.0 - gM; rk += textureGrad(uRock, gU1, d1x, d1y).rgb * w; gNR += textureGrad(uGN, gU1, d1x, d1y) * w; }
      if (gM > 0.001) { rk += textureGrad(uDark, gU2, d2x, d2y).rgb * 1.3 * gM; gNR += textureGrad(uRN, gU2, d2x, d2y) * gM; }
      vec3 gTN = vec3(gNR.xy * 2.0 - 1.0, 0.0); gTN.z = sqrt(max(0.0, 1.0 - dot(gTN.xy, gTN.xy))); float gRg = gNR.b;
      float gWet = ${R.wet ? 'smoothstep(0.5, 0.62, gn(vW * 0.21))' : '0.0'};`);
    f = f.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(clamp(gRg * 1.05, 0.6, 1.0), 0.28, gWet);   /* (was 0.35 and 0.08: the bumpy stone under a lamp glittered into a bright patch at spawn, his eyes 2026-10-19) */');
    f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec3 gWN = normalize((vec4(normal, 0.0) * viewMatrix).xyz); vec3 gT = vec3(gTN.xy * (1.0 - 0.85 * gWet), gTN.z);   /* (a puddle is flat: its stone relief fades) */
      vec3 gN2 = normalize(vec3(gWN.x + gT.x * 0.9, gWN.y * abs(gT.z), gWN.z + gT.y * 0.9));   /* (whiteout blend: tangent +x, bitangent +z, the way the texture is laid) */ normal = normalize((viewMatrix * vec4(gN2, 0.0)).xyz);
      vec3 gLd = normalize(vec3(uLights[0].x - vW.x, 2.2, uLights[0].y - vW.z));
      float gRel = clamp((0.3 + 0.7 * max(dot(gN2, gLd), 0.0)) / (0.3 + 0.7 * max(dot(gWN, gLd), 0.05)), 0.4, 1.8);   /* (the camp's light is painted on as glow; this lets the stone's relief shade it) */`);
    f = f.replace('min(L, 1.4) * 0.8;', 'min(L, 1.4) * 0.8 * gRel;');
    if (!f.includes('gNR') || !f.includes('* gRel;')) console.warn('look ' + n + ': the ground shader in main.js moved; the PBR ground is only partly on');
    sh.fragmentShader = f;
  };
  groundMat.customProgramCacheKey = () => 'lfground' + n; groundMat.needsUpdate = true;

  // ---- props: world-space PBR detail on every untextured standard material (Golus's whiteout triplanar: no UVs needed, no stretching)
  const D = { metal: { c: tex('MetalPlates006_1K-JPG_Color.jpg', true), n: tex('MetalPlates006_1K-JPG_NormalGL.jpg'), r: tex('MetalPlates006_1K-JPG_Roughness.jpg'), s: 0.55, k: 0.9, a: 0.45 },
    stone: { c: tex('concrete_floor_worn_001_diff_1k.jpg', true), n: tex('concrete_floor_worn_001_nor_1k.jpg'), r: tex('concrete_floor_worn_001_rough_1k.jpg'), s: 0.4, k: 0.7, a: 0.4 } };
  function detail(m) {
    const kind = m.metalness >= 0.4 ? 'metal' : 'stone', T = D[kind], prev = m.onBeforeCompile, key0 = m.customProgramCacheKey();
    m.userData.lfd = kind; stats.detailed++;
    m.onBeforeCompile = (sh, r) => { prev.call(m, sh, r);
      sh.uniforms.lfC = { value: T.c }; sh.uniforms.lfN = { value: T.n }; sh.uniforms.lfR = { value: T.r };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLfW;').replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        { vec4 lp = vec4(transformed, 1.0);
        #ifdef USE_BATCHING
          lp = batchingMatrix * lp;
        #endif
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp;
        #endif
          vLfW = (modelMatrix * lp).xyz; }`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLfW; uniform sampler2D lfC, lfN, lfR;').replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec3 wn = normalize((vec4(normal, 0.0) * viewMatrix).xyz); vec3 p = vLfW * ${T.s.toFixed(2)}; vec3 bw = pow(abs(wn), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
          vec2 uX = p.zy, uY = p.xz, uZ = p.xy;
          vec3 nX = texture2D(lfN, uX).xyz * 2.0 - 1.0, nY = texture2D(lfN, uY).xyz * 2.0 - 1.0, nZ = texture2D(lfN, uZ).xyz * 2.0 - 1.0;
          nX.xy *= ${T.k.toFixed(2)}; nY.xy *= ${T.k.toFixed(2)}; nZ.xy *= ${T.k.toFixed(2)};
          nX = vec3(nX.xy + wn.zy, abs(nX.z) * wn.x); nY = vec3(nY.xy + wn.xz, abs(nY.z) * wn.y); nZ = vec3(nZ.xy + wn.xy, abs(nZ.z) * wn.z);
          normal = normalize((viewMatrix * vec4(normalize(nX.zyx * bw.x + nY.xzy * bw.y + nZ.xyz * bw.z), 0.0)).xyz);
          float rg = texture2D(lfR, uX).g * bw.x + texture2D(lfR, uY).g * bw.y + texture2D(lfR, uZ).g * bw.z; roughnessFactor = clamp(roughnessFactor * (0.6 + 0.8 * rg), 0.05, 1.0);
          vec3 lw = vec3(0.2126, 0.7152, 0.0722); float lum = dot(texture2D(lfC, uX).rgb * bw.x + texture2D(lfC, uY).rgb * bw.y + texture2D(lfC, uZ).rgb * bw.z, lw), avg = dot(texture2D(lfC, uY, 12.0).rgb, lw);
          diffuseColor.rgb *= mix(1.0, clamp(lum / max(avg, 0.02), 0.45, 1.6), ${T.a.toFixed(2)}); }`);
    };
    m.customProgramCacheKey = () => key0 + '|lfd' + kind; m.needsUpdate = true;
  }
  function detailAll() { scene.traverse(o => { if (!o.isMesh || o.isSkinnedMesh || !o.material) return; for (const m of [].concat(o.material)) if (m.isMeshStandardMaterial && m !== groundMat && !m.map && !m.normalMap && !m.transparent && !m.userData.lfd) detail(m); }); }
  if (!OFF.has('detail')) { setInterval(detailAll, 2000); setTimeout(detailAll, 300); }
  const fixAniso = () => scene.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'roughnessMap']) if (m && m[k] && m[k].anisotropy < aniso) { m[k].anisotropy = aniso; m[k].needsUpdate = true; } });
  setInterval(fixAniso, 3000);

  // ---- image-based light: the Kloppenheim night sky (Poly Haven, CC0) through three's PMREM, as every material's ambient
  if (!OFF.has('env')) import('../../vendor/jsm/loaders/HDRLoader.js').then(({ HDRLoader }) => new HDRLoader().load(TEX + 'kloppenheim_02_puresky_2k.hdr', t => {
    t.mapping = THREE.EquirectangularReflectionMapping; const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(t).texture; t.dispose(); pm.dispose();
    scene.environmentIntensity = R.env; stats.env = true; }));
  if (R.moon && !OFF.has('moon')) { const moon = new THREE.DirectionalLight(0x9a8cff, R.moon); moon.position.set(-0.4, 0.8, 0.45); scene.add(moon); }   // (a faint violet key from high up: shape everywhere, not only in the lamps)

  // ---- tone mapping and bloom
  renderer.toneMapping = { ACES: THREE.ACESFilmicToneMapping, AgX: THREE.AgXToneMapping, Neutral: THREE.NeutralToneMapping }[R.tone]; renderer.toneMappingExposure = R.exposure;
  if (R.bloom) Object.assign(bloom, R.bloom);   // (the old threshold, 0.82, sat under a lit sheet of paper, so text under a lamp bled a halo)

  // ---- the grade, cleaned (look 3): multiply the violet into the shadows instead of adding it (added light lifts the blacks to gray),
  // a gentle filmic contrast around middle gray, a third of the grain, and no color split at the lens edge except in slow time
  // AgX alone lifts a night scene to milky gray (its toe is built for daylight), so look 2 takes Blender's own fix, the "AgX Punchy" look:
  // more saturation and a contrast power, here before the tone curve; and no added light in the shadows
  if (R.punchy) { let f = grade.material.fragmentShader;
    f = f.replace('c += vec3(0.010, 0.0, 0.024) * (1.0 - smoothstep(0.0, 0.12, l));', '{ float pl = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = max(mix(vec3(pl), c, 1.3), 0.0); c = 0.18 * pow(c / 0.18, vec3(1.2)); }');
    grade.material.fragmentShader = f; grade.material.needsUpdate = true; }
  if (R.clean) { let f = grade.material.fragmentShader;
    f = f.replace('c += vec3(0.010, 0.0, 0.024) * (1.0 - smoothstep(0.0, 0.12, l));', 'c *= mix(vec3(0.9, 0.86, 1.12), vec3(1.0), smoothstep(0.0, 0.25, l)); c = 0.18 * pow(max(c, 0.0) / 0.18, vec3(1.1));');
    f = f.replace('* 0.018 *', '* 0.006 *').replace('(0.004 + 0.012 * uS)', '(0.012 * uS)');
    grade.material.fragmentShader = f; grade.material.needsUpdate = true; }

  // ---- anti-aliasing and ambient occlusion
  if (R.msaa && !OFF.has('msaa')) { composer.renderTarget1.samples = R.msaa; }   // (only the target the scene is drawn into: the RenderPass writes renderTarget1; the passes after it stay single-sample)
  if (R.smaa && !OFF.has('smaa')) import('../../vendor/jsm/postprocessing/SMAAPass.js').then(({ SMAAPass }) => { composer.addPass(new SMAAPass()); stats.passes = composer.passes.map(p => p.constructor.name); });
  if (R.ao && !OFF.has('ao')) import('../../vendor/jsm/postprocessing/N8AO.js').then(({ N8AOPass }) => {
    const pr = renderer.getPixelRatio(), ao = new N8AOPass(scene, camera, innerWidth * pr, innerHeight * pr);
    Object.assign(ao.configuration, R.ao, { gammaCorrection: false, halfRes: true, depthAwareUpsampling: true, aoSamples: 8, denoiseSamples: 4, denoiseRadius: 12, color: new THREE.Color(0, 0, 0) });
    const i = composer.passes.indexOf(renderPass); composer.removePass(renderPass); composer.insertPass(ao, Math.max(0, i)); stats.passes = composer.passes.map(p => p.constructor.name); });
  stats.passes = composer.passes.map(p => p.constructor.name);
  return { fogK: R.fogK, info: () => ({ ...stats, tone: R.tone, exposure: renderer.toneMappingExposure, samples: composer.renderTarget1.samples, aniso }) };
}
