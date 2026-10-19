// Combat the Call of Duty Zombies way: guns that each feel different, points for every hit, wall-buys and perks at the base, rounds each night.
import * as THREE from 'three';

// rpm = rounds a minute; head = the headshot multiplier; spread in radians (aiming cuts it to a third); recoil kicks the view up
export const GUNS = {
  pistol:  { name: 'M1911',   dmg: 40,  head: 2.5, rpm: 420, auto: false, mag: 8,  reserve: 64,  reload: 1.4, spread: 0.010, recoil: 0.022, price: 0,    pitch: 1.0 },
  smg:     { name: 'MP-5',    dmg: 32,  head: 2.0, rpm: 780, auto: true,  mag: 30, reserve: 180, reload: 2.1, spread: 0.022, recoil: 0.011, price: 1000, pitch: 1.35 },
  shotgun: { name: 'Olympia', dmg: 34,  head: 1.6, rpm: 80,  auto: false, mag: 2,  reserve: 40,  reload: 2.6, spread: 0.075, recoil: 0.085, price: 1250, pitch: 0.6, pellets: 8 },
  rifle:   { name: 'M14',     dmg: 120, head: 3.0, rpm: 300, auto: false, mag: 8,  reserve: 96,  reload: 2.3, spread: 0.004, recoil: 0.045, price: 1500, pitch: 0.8 },
  lmg:     { name: 'RPK',     dmg: 55,  head: 2.0, rpm: 600, auto: true,  mag: 45, reserve: 270, reload: 3.4, spread: 0.03,  recoil: 0.016, price: 3500, pitch: 0.75 },
};
export const PERKS = {
  iron:  { name: 'Iron Will',   price: 2500, says: 'take 2.5 times the hits' },
  quick: { name: 'Quick Hands', price: 3000, says: 'reload twice as fast' },
  fleet: { name: 'Fleet Foot',  price: 2000, says: 'run longer and faster' },
};
export const POINTS = { hit: 10, kill: 60, head: 100 };   // (CoD Zombies' own numbers)

// sounds, made here with the browser's audio: a shot is a burst of filtered noise, a hit a short high tick
let ac = null;
function ctx() { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; }
function noise(dur) { const a = ctx(), b = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5); return b; }
export const sound = {
  shot(pitch = 1, vol = 0.5) { const a = ctx(), s = a.createBufferSource(); s.buffer = noise(0.28); const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400 * pitch; const g = a.createGain(); g.gain.value = vol;
    const o = a.createOscillator(); o.frequency.setValueAtTime(140 * pitch, a.currentTime); o.frequency.exponentialRampToValueAtTime(40, a.currentTime + 0.12); const og = a.createGain(); og.gain.setValueAtTime(vol * 0.9, a.currentTime); og.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.14);
    s.connect(f).connect(g).connect(a.destination); o.connect(og).connect(a.destination); s.start(); o.start(); o.stop(a.currentTime + 0.15); },
  hit(head) { const a = ctx(), o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = head ? 2200 : 1500; g.gain.setValueAtTime(0.08, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.05); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.06); },
  click() { const a = ctx(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 900; g.gain.setValueAtTime(0.05, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.03); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.04); },
  round() { const a = ctx(); for (const [t, f] of [[0, 55], [0.5, 49], [1.0, 41]]) { const o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, a.currentTime + t); g.gain.linearRampToValueAtTime(0.35, a.currentTime + t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + t + 0.9); o.connect(g).connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 1); } },
  buy() { const a = ctx(); for (const [t, f] of [[0, 660], [0.08, 990]]) { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.08, a.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + t + 0.12); o.connect(g).connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.13); } },
};

// a sign in the world (a wall-buy or a perk machine): text drawn once on a canvas
function signTexture(lines, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#05060b'; g.fillRect(0, 0, 512, 256); g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(8, 8, 496, 240);
  g.fillStyle = color; g.font = '400 74px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText(lines[0], 256, 112);
  g.fillStyle = '#f1f2f8'; g.font = '400 44px "JetBrains Mono", monospace'; g.fillText(lines[1], 256, 186);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function makeStation(kind, key, x, y, z, yaw) {
  const isGun = kind === 'gun', item = isGun ? GUNS[key] : PERKS[key], color = isGun ? '#39e6ff' : '#ff6fb1';
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw;
  const post = new THREE.Mesh(new THREE.BoxGeometry(isGun ? 1.6 : 1.1, isGun ? 1.0 : 2.0, 0.3), new THREE.MeshStandardMaterial({ color: isGun ? 0x2a2b33 : 0x1d1424, roughness: 0.7, metalness: 0.3 }));
  post.position.y = isGun ? 1.4 : 1.0; post.castShadow = true; post.receiveShadow = true;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(isGun ? 1.5 : 1.0, isGun ? 0.75 : 0.5), new THREE.MeshBasicMaterial({ map: signTexture([item.name, String(item.price)], color) }));
  sign.position.set(0, isGun ? 1.4 : 1.5, 0.16); g.add(post, sign);
  if (!isGun) { const lamp = new THREE.PointLight(0xff6fb1, 2.2, 6, 2); lamp.position.set(0, 2.3, 0.6); g.add(lamp); }
  g.userData = { kind, key, price: item.price, label: isGun ? `${item.name} for ${item.price} (ammo ${Math.floor(item.price / 2)})` : `${item.name} for ${item.price}: ${item.says}` };
  return g;
}
