// Combat: guns that each feel different, points for every hit, wall-buys and perks at the base, drops from the dead, rounds each night.
// And the sound: every shot is three layers (the crack, the body, the thump) with a valley echo; the other player's shots come from where
// they stand (left, right, near, far), so you hear Dalton's gun and he hears yours.
import * as THREE from 'three';

// ap = armor piercing, 0 to 1 (how much of a blow gets through a plate, and how fast it wears the plate); rpm = rounds a minute; head = the headshot multiplier; spread in radians (aiming cuts it to a third); recoil kicks the view up
// snd: [crack pitch, body length in seconds, loudness, low thump Hz]
export const GUNS = {
  pistol:  { name: 'M1911',   ap: 0.1, dmg: 40,  head: 2.5, rpm: 420, auto: false, mag: 8,  reserve: 64,  reload: 1.4, spread: 0.010, recoil: 0.022, price: 0,    snd: [1.1, 0.22, 0.8, 150] },
  smg:     { name: 'MP-5',    ap: 0.15, dmg: 32,  head: 2.0, rpm: 780, auto: true,  mag: 30, reserve: 180, reload: 2.1, spread: 0.022, recoil: 0.011, price: 1000, snd: [1.35, 0.16, 0.65, 170] },
  shotgun: { name: 'Olympia', ap: 0.35, dmg: 34,  head: 1.6, rpm: 80,  auto: false, mag: 2,  reserve: 40,  reload: 2.6, spread: 0.075, recoil: 0.085, price: 1250, snd: [0.6, 0.5, 1.0, 70], pellets: 8 },
  rifle:   { name: 'M14',     ap: 0.7, dmg: 120, head: 3.0, rpm: 300, auto: false, mag: 8,  reserve: 96,  reload: 2.3, spread: 0.004, recoil: 0.045, price: 1500, snd: [0.85, 0.38, 1.0, 95] },
  lmg:     { name: 'RPK',     ap: 0.4, dmg: 55,  head: 2.0, rpm: 600, auto: true,  mag: 45, reserve: 270, reload: 3.4, spread: 0.03,  recoil: 0.016, price: 3500, snd: [0.8, 0.3, 0.9, 100] },
};
export const PERKS = {
  iron:  { name: 'Iron Will',   price: 2500, says: 'take 2.5 times the hits' },
  quick: { name: 'Quick Hands', price: 3000, says: 'reload twice as fast' },
  fleet: { name: 'Fleet Foot',  price: 2000, says: 'run longer and faster' },
};
export const POINTS = { hit: 10, kill: 60, head: 100 };   // (CoD Zombies' own numbers)
// drops: one in forty kills leaves one; it lies 30 seconds; whoever walks over it sets it off for both players
export const DROPS = {
  resupply: { name: 'RESUPPLY',   says: 'every gun full',              color: 0x39e6ff },
  double:   { name: 'DOUBLE PAY', says: 'double points for 30 seconds', color: 0x3dff9a },
  oneshot:  { name: 'ONE SHOT',   says: 'one hit kills for 30 seconds', color: 0xff5577 },
  flare:    { name: 'FLARE',      says: 'everything in the dark burns', color: 0xb9a8ff },
  kindling: { name: 'KINDLING',   says: 'every fire +3 minutes',        color: 0xff6fb1 },
};

// ---------------------------------------------------------------- sound
let ac = null, out = null, wet = null, volume = 0.8;
const buf = {};
function ctx() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; comp.connect(ac.destination);
    out = ac.createGain(); out.gain.value = volume; out.connect(comp);
    const verb = ac.createConvolver(), n = Math.floor(ac.sampleRate * 2.4), ir = ac.createBuffer(2, n, ac.sampleRate);   // (the valley's echo: a long soft tail)
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2) * (i < ac.sampleRate * 0.03 ? 0.2 : 1); }
    verb.buffer = ir; wet = ac.createGain(); wet.gain.value = 0.32; wet.connect(verb).connect(out);
    for (const [k, dur, shape] of [['crack', 0.06, 6], ['body', 0.6, 2.2], ['step', 0.09, 3], ['rattle', 0.05, 1.5]]) {   // (made once, not every shot)
      const b = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, shape);
      buf[k] = b;
    }
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
// where a sound goes: straight to the ears, or through a panner at a place in the world (with distant sounds muffled)
function dest(pos, near = 4) {
  const a = ctx(); if (!pos) return { node: out, send: wet };
  const p = a.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = near; p.rolloffFactor = 1.1; p.maxDistance = 400;
  p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z;
  const L = a.listener, dx = pos.x - (L.positionX ? L.positionX.value : 0), dz = pos.z - (L.positionZ ? L.positionZ.value : 0), far = Math.hypot(dx, dz);
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(900, 16000 / (1 + far / 18));
  lp.connect(p); p.connect(out); const send = a.createGain(); send.gain.value = Math.min(1.6, 0.4 + far / 40); p.connect(send).connect(wet);   // (far shots are more echo than crack)
  return { node: lp, send: null };
}
function play(b, d, { rate = 1, gain = 1, type = null, freq = 0, q = 1, at = 0 } = {}) {
  const a = ctx(), s = a.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; const g = a.createGain(); g.gain.value = gain; let n = s;
  if (type) { const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; n.connect(f); n = f; }
  n.connect(g); g.connect(d.node); if (d.send) g.connect(d.send); s.start(a.currentTime + at); return g;
}
function tone(d, f0, f1, dur, gain, type = 'sine', at = 0) {
  const a = ctx(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at; o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(d.node); if (d.send) g.connect(d.send); o.start(t); o.stop(t + dur + 0.02);
}
export const sound = {
  setVolume(v) { volume = v; if (out) out.gain.value = v; },
  wake() { ctx(); },
  // the ears: where you stand and which way you face, every frame
  listen(x, y, z, fx, fy, fz) {
    if (!ac) return; const L = ac.listener;
    if (L.positionX) { L.positionX.value = x; L.positionY.value = y; L.positionZ.value = z; L.forwardX.value = fx; L.forwardY.value = fy; L.forwardZ.value = fz; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
    else { L.setPosition(x, y, z); L.setOrientation(fx, fy, fz, 0, 1, 0); }
  },
  shot(key, pos = null) {   // (pos: a place in the world for the other player's gun; none for your own)
    const [p, len, vol, thump] = GUNS[key].snd, d = dest(pos, 6), j = 0.94 + Math.random() * 0.12;
    play(buf.crack, d, { rate: p * j, gain: vol * 1.1, type: 'highpass', freq: 1400 });
    play(buf.body, d, { rate: (0.55 + p * 0.25) * j * (0.6 / Math.max(0.15, len)) ** 0.3, gain: vol * 0.9, type: 'lowpass', freq: 1800 * p });
    tone(d, thump * 1.6 * j, thump * 0.4, 0.16 + len * 0.3, vol * 0.8);
    if (!pos) play(buf.rattle, d, { rate: 2.2, gain: 0.08, type: 'bandpass', freq: 3200, q: 3, at: 0.05 });   // (the action cycling, close to your ear)
  },
  hit(head) { const d = dest(null); tone(d, head ? 2400 : 1700, head ? 2200 : 1500, 0.05, 0.09, 'square'); },
  plate() { const d = dest(null); tone(d, 3100, 2600, 0.07, 0.06, 'triangle'); tone(d, 4700, 4300, 0.05, 0.03, 'sine'); },   // (a round off armor: a hard ping, not the soft hit tick)
  shatter() { const d = dest(null); play(buf.rattle, d, { rate: 0.9, gain: 0.5, type: 'highpass', freq: 2500 }); tone(d, 1900, 700, 0.18, 0.07, 'triangle'); },
  kill() { const d = dest(null); tone(d, 900, 300, 0.12, 0.08, 'triangle'); },
  click() { const d = dest(null); play(buf.rattle, d, { rate: 3, gain: 0.25, type: 'bandpass', freq: 2600, q: 4 }); },
  magOut() { const d = dest(null); play(buf.rattle, d, { rate: 1.4, gain: 0.35, type: 'bandpass', freq: 1500, q: 2 }); },
  magIn() { const d = dest(null); play(buf.rattle, d, { rate: 1.8, gain: 0.45, type: 'bandpass', freq: 1900, q: 2 }); tone(d, 500, 380, 0.05, 0.05, 'square', 0.05); },
  step(run) { const d = dest(null); play(buf.step, d, { rate: 0.7 + Math.random() * 0.25, gain: run ? 0.22 : 0.13, type: 'lowpass', freq: 700 }); },
  land(n) { const d = dest(null); play(buf.step, d, { rate: 0.5, gain: Math.min(0.5, 0.15 + n * 0.03), type: 'lowpass', freq: 500 }); },
  hurt() { const d = dest(null); tone(d, 110, 50, 0.2, 0.3); },
  groan(pos, deep) { const d = dest(pos, 3), a = ctx(), o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter(), t = a.currentTime, base = deep ? 48 : 82 + Math.random() * 30;
    o.type = 'sawtooth'; o2.type = 'sine'; o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * 0.7, t + 1.1); o2.frequency.value = 5.5; const vg = a.createGain(); vg.gain.value = base * 0.06; o2.connect(vg).connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = deep ? 300 : 520; f.Q.value = 4; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(f).connect(g); g.connect(d.node); o.start(t); o2.start(t); o.stop(t + 1.25); o2.stop(t + 1.25); },
  round() { const d = dest(null); for (const [t, f] of [[0, 55], [0.5, 49], [1.0, 41]]) tone(d, f, f * 0.98, 0.9, 0.35, 'triangle', t); },
  roundEnd() { const d = dest(null); for (const [t, f] of [[0, 41], [0.4, 55], [0.8, 73]]) tone(d, f, f, 0.8, 0.28, 'triangle', t); },
  buy() { const d = dest(null); tone(d, 660, 660, 0.12, 0.08, 'sine'); tone(d, 990, 990, 0.12, 0.08, 'sine', 0.08); },
  drop() { const d = dest(null); for (const [t, f] of [[0, 523], [0.09, 659], [0.18, 784], [0.27, 1046]]) tone(d, f, f, 0.18, 0.09, 'triangle', t); },
  low() { const d = dest(null); tone(d, 1200, 1200, 0.04, 0.03, 'square'); },
};

// ---------------------------------------------------------------- the base: wall-buys and perk machines
function signTexture(lines, color) {   // (drawn once on a canvas)
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#05060b'; g.fillRect(0, 0, 512, 256); g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(8, 8, 496, 240);
  g.fillStyle = color; g.font = '500 78px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.fillText(lines[0], 256, 112);
  g.fillStyle = '#f1f2f8'; g.font = '400 50px "Barlow Condensed", sans-serif'; g.fillText(lines[1], 256, 190);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function makeStation(kind, key, x, y, z, yaw) {
  const isGun = kind === 'gun', item = isGun ? GUNS[key] : PERKS[key], color = isGun ? '#39e6ff' : '#ff6fb1';
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw;
  const post = new THREE.Mesh(new THREE.BoxGeometry(isGun ? 1.6 : 1.1, isGun ? 1.0 : 2.0, 0.3), new THREE.MeshStandardMaterial({ color: isGun ? 0x2a2b33 : 0x1d1424, roughness: 0.7, metalness: 0.3 }));
  post.position.y = isGun ? 1.4 : 1.0; post.castShadow = true; post.receiveShadow = true;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(isGun ? 1.5 : 1.0, isGun ? 0.75 : 0.5), new THREE.MeshBasicMaterial({ map: signTexture([item.name, String(item.price)], color) }));
  sign.position.set(0, isGun ? 1.4 : 1.5, 0.16); g.add(post, sign);
  g.userData = { kind, key, price: item.price, label: isGun ? `${item.name} for ${item.price} (ammo ${Math.floor(item.price / 2)})` : `${item.name} for ${item.price}: ${item.says}` };
  return g;
}
