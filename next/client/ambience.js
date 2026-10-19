// The sound of the world, made in the browser (no files): the fire crackles from where it is, the wind grows the farther you are from the light.
// One audio context, started on the first click; every sound is placed in the world, so it turns with your head.
export class Ambience {
  constructor(volume) { this.vol = volume; this.ac = null; this.t = 0; }
  start() {
    if (this.ac) return; const A = window.AudioContext || window.webkitAudioContext; if (!A) return; const ac = this.ac = new A();
    const noise = (sec, shape) => { const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = shape === 'brown' ? (last + 0.02 * w) / 1.02 : w; d[i] = shape === 'brown' ? last * 3.5 : w; } return b; };
    this.master = ac.createGain(); this.master.gain.value = this.vol(); this.master.connect(ac.destination);
    // wind: brown noise through a moving low-pass filter, never quite the same twice
    const wind = ac.createBufferSource(); wind.buffer = noise(6, 'brown'); wind.loop = true; this.windF = ac.createBiquadFilter(); this.windF.type = 'lowpass'; this.windF.frequency.value = 380;
    this.windG = ac.createGain(); this.windG.gain.value = 0; wind.connect(this.windF).connect(this.windG).connect(this.master); wind.start();
    // the fire: a low roar and crackles, placed at the fire
    this.fireP = ac.createPanner(); Object.assign(this.fireP, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 2.5, rolloffFactor: 1.2, maxDistance: 120 }); this.fireP.connect(this.master);
    const roar = ac.createBufferSource(); roar.buffer = noise(4, 'brown'); roar.loop = true; const rf = ac.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 220; this.roarG = ac.createGain(); this.roarG.gain.value = 0.5; roar.connect(rf).connect(this.roarG).connect(this.fireP); roar.start();
    // the hum: a low tone and its fifth under the crackle, placed at the fire; each level it rises (the core is bigger, so it sings higher)
    this.hum = [ac.createOscillator(), ac.createOscillator()]; this.humG = ac.createGain(); this.humG.gain.value = 0; this.hum[0].type = 'sine'; this.hum[1].type = 'triangle';
    const hf = ac.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 400; for (const o of this.hum) { o.connect(hf); o.start(); } hf.connect(this.humG).connect(this.fireP);
    this.crack = noise(0.05, 'white'); { const d = this.crack.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] *= Math.exp(-i / (d.length * 0.18)); }   // (each crackle dies away fast, like wood, not a click)
  }
  // a far sound (farsound.js picks what and where): placed in 3D with HRTF, highs gone with distance, a long echo; in the dark the world's muffle smears it
  far(voice, x, y, z, muffle = 0) {
    if (!this.ac) return; const ac = this.ac, t = ac.currentTime, P = ac.createPanner(); Object.assign(P, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 8, rolloffFactor: 0.6, maxDistance: 200 });
    if (P.positionX) { P.positionX.value = x; P.positionY.value = y; P.positionZ.value = z; } else P.setPosition(x, y, z);
    const L = this.ac.listener, d = L.positionX ? Math.hypot(x - L.positionX.value, z - L.positionZ.value) : 60, lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(350, 3200 - d * 22) * (1 - 0.5 * muffle);
    const g = ac.createGain(); g.gain.value = 0; lp.connect(g).connect(P).connect(this.master); const env = (peak, a, hold, rel) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); return a + hold + rel; };
    const noise = sec => { const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), q = b.getChannelData(0); for (let i = 0; i < q.length; i++) q[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; return s; };
    if (voice === 'creak' || voice === 'groan') { const base = voice === 'groan' ? 46 + Math.random() * 10 : 140 + Math.random() * 60, o1 = ac.createOscillator(), o2 = ac.createOscillator(), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = base * 3; bp.Q.value = voice === 'groan' ? 3 : 9;
      for (const [o, k] of [[o1, 1], [o2, 1.012]]) { o.type = 'sawtooth'; o.frequency.setValueAtTime(base * k, t); o.frequency.exponentialRampToValueAtTime(base * k * 0.72, t + 2); o.connect(bp); } bp.connect(lp); const len = env(voice === 'groan' ? 0.16 : 0.07, 0.4, 0.8, 1.2); o1.start(t); o2.start(t); o1.stop(t + len); o2.stop(t + len); }   /* (metal under strain: two detuned tones gliding down; the groan is the same, deeper and wider) */
    else if (voice === 'impact' || voice === 'crack') { const s = noise(0.3), bp = ac.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = voice === 'impact' ? 180 : 1800; s.playbackRate.value = voice === 'impact' ? 0.3 : 0.25; s.connect(bp).connect(lp); env(voice === 'impact' ? 0.5 : 0.12, 0.005, 0.02, voice === 'impact' ? 0.9 : 0.25); s.start(t); }   /* (something heavy landing; a dry snap) */
    else { const sec = voice === 'slide' ? 2.2 : 1.4, s = noise(sec), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.setValueAtTime(voice === 'slide' ? 300 : 400, t); bp.frequency.exponentialRampToValueAtTime(voice === 'slide' ? 220 : 1600, t + sec); s.connect(bp).connect(lp); env(voice === 'slide' ? 0.09 : 0.06, voice === 'slide' ? 0.8 : 0.15, sec * 0.4, 0.6); s.start(t); }   /* (a scrape sweeping up; dust sliding, slow in) */
  }
  update(dt, cam, fire, lightHere, alive) {
    if (!this.ac) return; const ac = this.ac, L = ac.listener;
    const fx = -Math.sin(cam.rotation.y), fz = -Math.cos(cam.rotation.y);
    if (L.positionX) { L.positionX.value = cam.position.x; L.positionY.value = cam.position.y; L.positionZ.value = cam.position.z; L.forwardX.value = fx; L.forwardY.value = 0; L.forwardZ.value = fz; L.upY.value = 1; } else { L.setPosition(cam.position.x, cam.position.y, cam.position.z); L.setOrientation(fx, 0, fz, 0, 1, 0); }
    this.master.gain.setTargetAtTime(this.vol(), ac.currentTime, 0.2);
    if (this.fireP.positionX) { this.fireP.positionX.value = fire.x; this.fireP.positionY.value = fire.y + 0.8; this.fireP.positionZ.value = fire.z; }
    this.roarG.gain.setTargetAtTime(alive ? 0.7 : 0.05, ac.currentTime, 0.4);
    if (this.hum) { const lv = fire.level || 0, f0 = 49 * Math.pow(1.122, lv); this.hum[0].frequency.setTargetAtTime(f0, ac.currentTime, 1.5); this.hum[1].frequency.setTargetAtTime(f0 * 1.5, ac.currentTime, 1.5); this.humG.gain.setTargetAtTime(alive ? 0.05 + lv * 0.012 : 0, ac.currentTime, 0.8); }
    this.t += dt; this.windF.frequency.setTargetAtTime(300 + 220 * (0.5 + 0.5 * Math.sin(this.t * 0.23) * Math.sin(this.t * 0.071)), ac.currentTime, 0.5);
    this.windG.gain.setTargetAtTime(0.06 + 0.32 * (1 - lightHere), ac.currentTime, 0.8);   // (in the light the wind is far away; in the dark it is all around you)
    if (alive && Math.random() < dt * 4) {   // (a crackle: a short bright snap, each one a little different)
      if (this.onCrackle) this.onCrackle();
      const s = ac.createBufferSource(); s.buffer = this.crack; s.playbackRate.value = 0.35 + Math.random() * 0.5; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500 + Math.random() * 900; bp.Q.value = 1.2;
      const g = ac.createGain(); g.gain.value = 0.08 + Math.random() * 0.14; s.connect(bp).connect(g).connect(this.fireP); s.start();
    }
  }
}
