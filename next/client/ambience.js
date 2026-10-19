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
    this.crack = noise(0.05, 'white');
  }
  update(dt, cam, fire, lightHere, alive) {
    if (!this.ac) return; const ac = this.ac, L = ac.listener;
    const fx = -Math.sin(cam.rotation.y), fz = -Math.cos(cam.rotation.y);
    if (L.positionX) { L.positionX.value = cam.position.x; L.positionY.value = cam.position.y; L.positionZ.value = cam.position.z; L.forwardX.value = fx; L.forwardY.value = 0; L.forwardZ.value = fz; L.upY.value = 1; } else { L.setPosition(cam.position.x, cam.position.y, cam.position.z); L.setOrientation(fx, 0, fz, 0, 1, 0); }
    this.master.gain.setTargetAtTime(this.vol(), ac.currentTime, 0.2);
    if (this.fireP.positionX) { this.fireP.positionX.value = fire.x; this.fireP.positionY.value = fire.y + 0.8; this.fireP.positionZ.value = fire.z; }
    this.roarG.gain.setTargetAtTime(alive ? 0.55 : 0.05, ac.currentTime, 0.4);
    this.t += dt; this.windF.frequency.setTargetAtTime(300 + 220 * (0.5 + 0.5 * Math.sin(this.t * 0.23) * Math.sin(this.t * 0.071)), ac.currentTime, 0.5);
    this.windG.gain.setTargetAtTime(0.06 + 0.32 * (1 - lightHere), ac.currentTime, 0.8);   // (in the light the wind is far away; in the dark it is all around you)
    if (alive && Math.random() < dt * 9) {   // (a crackle: a short bright snap, each one a little different)
      const s = ac.createBufferSource(); s.buffer = this.crack; s.playbackRate.value = 0.6 + Math.random() * 1.2; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800 + Math.random() * 2600; bp.Q.value = 2;
      const g = ac.createGain(); g.gain.value = 0.25 + Math.random() * 0.5; s.connect(bp).connect(g).connect(this.fireP); s.start();
    }
  }
}
