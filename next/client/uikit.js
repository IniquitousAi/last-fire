// The screens' look from his concept sheets, taken through the North Star (2026-10-19): black, crimson, violet, cold gray; blue is ours, red is the
// dark. Thin sharp steel lines on black. Neon means saturated, never a glowing blob: no glow or halo anywhere here (taste rule 3), no orange, gold,
// rust, olive or mint. One file so the pieces stay together: the loading screen, steel frames and cut-corner keys, the two-chevron crosshair, the
// cracked-visor damage overlay, the day and night dial, and the colors the compass uses.
export const COL = { steel: '#8c92a8', steelDim: '#4a4f63', black: '#05060b', ours: '#3b6bff', dark: '#ff3b5c', crimson: '#c4143c', violet: '#7b5cff', text: '#eef0f8' };
const CSS = `
/* ---- keys: the long cut-corner key with hatch marks and an inset box (sheet 11:10) */
.key, .bk { border: 0 !important; border-radius: 0 !important; clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  background: linear-gradient(${COL.steel}, ${COL.steel}) top left / calc(100% - 12px) 1px no-repeat, linear-gradient(${COL.steel}, ${COL.steel}) bottom right / calc(100% - 12px) 1px no-repeat,
    repeating-linear-gradient(135deg, ${COL.steelDim} 0 1px, transparent 1px 5px) left center / 30px 100% no-repeat, #0b0d13 !important; text-align: left; padding-left: 40px !important; box-shadow: none !important; }
.key:hover, .key:focus-visible, .bk:focus-visible, .bk.on { background: linear-gradient(${COL.ours}, ${COL.ours}) top left / calc(100% - 12px) 1px no-repeat, linear-gradient(${COL.ours}, ${COL.ours}) bottom right / calc(100% - 12px) 1px no-repeat,
    repeating-linear-gradient(135deg, ${COL.ours} 0 1px, transparent 1px 5px) left center / 30px 100% no-repeat, #0b0d13 !important; }
/* (the small build keys in play are narrower so the HUD stays under 6 percent) */
.bk { padding: 4px 8px 3px 22px !important; min-width: 0 !important; }
.bk { background-size: calc(100% - 12px) 1px, calc(100% - 12px) 1px, 16px 100%, auto !important; }
#build .bk { flex: none; white-space: nowrap; font-size: 14px !important; padding: 3px 6px 3px 20px !important; } #build .bk small { font-size: 11px !important; line-height: 1.15; } #build .bk:not(.on) small { max-width: 4.6em; overflow: hidden; }   /* (only the picked key shows its whole line; the rest show their cost: six keys fit under the 6 percent HUD rule) */
/* ---- HUD panels get a thin steel double line (drawn as svg by uikit.js; the svg itself is never a box) */
.stl { position: absolute; left: -10px; top: -8px; width: calc(100% + 20px); height: calc(100% + 16px); pointer-events: none; overflow: visible; }
body #fireHud, body #hp, body #ammo, body #phase { padding: 8px 14px 7px; }
body #hp { width: 200px; box-sizing: border-box; }
/* ---- the loading screen */
#loadscr { position: fixed; inset: 0; z-index: 60; background: #000; transition: opacity .5s; } #loadscr canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
#loadscr.gone { opacity: 0; pointer-events: none; }
#loadscr .lt { position: absolute; left: 0; right: 0; top: 50%; text-align: center; font: 300 clamp(26px, 4vh, 40px) "Barlow Condensed", sans-serif; letter-spacing: .7em; text-indent: .7em; color: ${COL.text}; }
#loadscr .bar { position: absolute; left: 50%; top: calc(50% + 46px); width: min(300px, 40vw); height: 2px; margin-left: calc(min(300px, 40vw) / -2); background: ${COL.steelDim}; }
#loadscr .bar i { display: block; height: 100%; width: 0; background: ${COL.text}; transition: width .25s; }
#loadscr .ln { position: absolute; left: 50%; top: calc(50% + 62px); transform: translateX(-50%); font: 400 14px "Barlow Condensed", sans-serif; letter-spacing: .2em; color: ${COL.steel}; white-space: nowrap; }
/* ---- damage: a cracked visor with a red frosted edge, never a glow */
#crack { position: fixed; inset: 0; z-index: 8; pointer-events: none; opacity: 0; }
#crack .frost { position: absolute; inset: 0; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); -webkit-mask: radial-gradient(ellipse at center, transparent 58%, #000 100%); mask: radial-gradient(ellipse at center, transparent 58%, #000 100%); background: radial-gradient(ellipse at center, transparent 55%, rgba(196,20,60,.5) 100%); }
#crack canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
#hurt, #loading { display: none !important; }
/* ---- the day and night dial, in the phase corner */
body #phase { padding-left: 64px; min-height: 40px; } #phase .dial { position: absolute; left: 12px; top: 50%; width: 44px; height: 44px; margin-top: -22px; }
/* ---- the compass: red is the dark, blue is ours */
#compass .fire { color: ${COL.ours} !important; } #compass .fire::before { border-top-color: ${COL.ours} !important; }
`;
const rng = s => () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
const NS = 'http://www.w3.org/2000/svg';

// a cut-corner polygon path in a w by h box, inset by o, corner cut c
const cut = (w, h, o, c) => `${o + c},${o} ${w - o},${o} ${w - o},${h - o - c} ${w - o - c},${h - o} ${o},${h - o} ${o},${o + c}`;
function frame(el) {
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'stl'); el.style.position = 'fixed'; el.prepend(svg);
  const draw = () => { const w = el.offsetWidth + 20, h = el.offsetHeight + 16; if (w < 30 || h < 20) return; svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const stud = (x, y) => `<path d="M${x} ${y - 3}L${x + 3} ${y}L${x} ${y + 3}L${x - 3} ${y}Z" fill="${COL.steel}"/>`;
    svg.innerHTML = `<polygon points="${cut(w, h, 1, 9)}" fill="rgba(5,6,11,.45)" stroke="${COL.steel}" stroke-width="1"/><polygon points="${cut(w, h, 5, 6)}" fill="none" stroke="${COL.steelDim}" stroke-width="1"/>${stud(10, 1)}${stud(w - 1, h - 10)}`; };
  new ResizeObserver(draw).observe(el); draw();
  new MutationObserver(() => { for (const n of el.keep) if (!n.isConnected) el.prepend(n); }).observe(el, { childList: true }); el.keep = [svg];   // (main.js rewrites these boxes' html: the frame and dial are put back)
}
function dialSvg() {
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'dial'); s.setAttribute('viewBox', '-22 -22 44 44'); return s;
}
const arc = (a0, a1, r) => { const p = a => [Math.sin(a) * r, -Math.cos(a) * r], [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };

export class UI {
  constructor(consts) {
    this.k = consts;   // { DUSK_AT, NIGHT_AT, DAWN_AT } from core/game.js
    document.head.append(Object.assign(document.createElement('style'), { textContent: CSS }));
    for (const id of ['fireHud', 'hp', 'ammo', 'phase']) { const el = document.getElementById(id); if (el) frame(el); }
    this.crosshair(); this.buildCrack(); this.buildLoad(); this.buildDial();
    this.flash = 0; this.heal = 0; this.total = 0; this.shown = false; addEventListener('resize', () => { this.drawLoad(); this.drawCrack(); });
  }
  // ---- (3) the crosshair: two thin chevrons and a dot, white on a dark edge so it reads on any ground
  crosshair() {
    const c = document.getElementById('cross'); if (!c) return; const L = 'M -11 -6 L -5 0 L -11 6', R = 'M 11 -6 L 5 0 L 11 6';
    c.innerHTML = `<svg viewBox="-12 -12 24 24"><g fill="none" stroke-linecap="square"><g stroke="#000" stroke-opacity=".6" stroke-width="3"><path d="${L}"/><path d="${R}"/><circle r="1.6" fill="#000" fill-opacity=".6"/></g><g stroke="#fff" stroke-width="1.2"><path d="${L}"/><path d="${R}"/></g><circle r="1.1" fill="#fff"/></g></svg>`;
  }
  // ---- (1) the loading screen: stars over black pines, red corruption sparks in the bottom corners, a cut-corner frame, LOADING over a thin bar
  buildLoad() {
    const d = this.load = document.createElement('div'); d.id = 'loadscr'; d.hidden = true; d.innerHTML = '<canvas></canvas><div class="lt">LOADING</div><div class="bar"><i></i></div><div class="ln"></div>'; document.body.append(d);
    this.lc = d.querySelector('canvas'); this.lbar = d.querySelector('.bar i'); this.lln = d.querySelector('.ln');
  }
  drawLoad() {
    const c = this.lc; if (!c) return; const W = c.width = innerWidth, H = c.height = innerHeight, g = c.getContext('2d'), r = rng(7); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#05030c'); sky.addColorStop(0.6, '#150a24'); sky.addColorStop(0.85, '#3a1030'); sky.addColorStop(1, '#4a1030'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / 2600; i++) { const x = r() * W, y = r() * H * 0.8, b = 0.25 + r() * 0.75; g.fillStyle = `rgba(238,240,248,${(b * b).toFixed(2)})`; const s = r() < 0.06 ? 2 : 1; g.fillRect(x | 0, y | 0, s, s); }
    for (let layer = 0; layer < 3; layer++) { const base = H * (0.8 + layer * 0.07), n = Math.ceil(W / (26 - layer * 5)), col = ['#07040b', '#040207', '#000'][layer]; g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
      for (let i = 0; i <= n; i++) { const x = i * W / n, th = (60 + r() * 70) * (1 - layer * 0.15) * H / 900, w = W / n * 0.9; g.lineTo(x - w / 2, base); g.lineTo(x, base - th); g.lineTo(x + w / 2, base); } g.lineTo(W, H); g.closePath(); g.fill(); }
    for (const sx of [0, 1]) for (let i = 0; i < 170; i++) { const x = (sx ? W - 1 : 0) + (sx ? -1 : 1) * Math.pow(r(), 1.8) * W * 0.16, y = H - Math.pow(r(), 1.6) * H * 0.22, a = 0.3 + r() * 0.7; g.fillStyle = `rgba(255,59,92,${a.toFixed(2)})`; const q = r() < 0.25 ? 4 : 2; g.fillRect(x | 0, y | 0, q, q); }
    const m = Math.round(Math.min(W, H) * 0.045), c1 = 22; g.strokeStyle = COL.steel; g.lineWidth = 1; for (const [o, col] of [[m, COL.steel], [m + 6, COL.steelDim]]) { g.strokeStyle = col; g.beginPath(); g.moveTo(o + c1, o); g.lineTo(W - o, o); g.lineTo(W - o, H - o - c1); g.lineTo(W - o - c1, H - o); g.lineTo(o, H - o); g.lineTo(o, o + c1); g.closePath(); g.stroke(); }
    g.fillStyle = COL.steel; for (const [x, y] of [[m + c1 / 2, m + c1 / 2 - 0], [W - m - c1 / 2, H - m - c1 / 2]]) { g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 4, y); g.lineTo(x, y + 4); g.lineTo(x - 4, y); g.closePath(); g.fill(); }
  }
  show() { this.shown = true; this.total = 0; this.load.hidden = false; this.load.classList.remove('gone'); this.drawLoad(); this.progress(0, 'lighting the fire'); }
  // real progress: the tiles the world still has to build (the first count seen is the whole job)
  progress(frac, text) { this.lbar.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%'; if (text) this.lln.textContent = text; }
  tiles(left) { if (!this.shown) return; this.total = Math.max(this.total, left); this.progress(this.total ? 1 - left / this.total : 0, `building the ground, ${left} tiles left`); }
  done() { if (!this.shown) return; this.shown = false; this.progress(1, 'ready'); this.load.classList.add('gone'); setTimeout(() => { this.load.hidden = true; }, 600); }
  // ---- (4) damage: hurt cracks the visor with a red frosted edge; it fades as you heal
  buildCrack() {
    const d = this.crack = document.createElement('div'); d.id = 'crack'; d.innerHTML = '<div class="frost"></div><canvas></canvas>'; document.body.append(d); this.cc = d.querySelector('canvas'); this.drawCrack();
  }
  drawCrack() {
    const c = this.cc; if (!c) return; const W = c.width = innerWidth, H = c.height = innerHeight, g = c.getContext('2d'), r = rng(11); g.clearRect(0, 0, W, H); g.lineCap = 'round';
    for (const [ix, iy] of [[0.14, 0.2], [0.82, 0.12], [0.9, 0.78], [0.2, 0.86]]) { const cx = ix * W, cy = iy * H, spokes = 7 + (r() * 4 | 0);
      for (let s = 0; s < spokes; s++) { let a = (s / spokes) * Math.PI * 2 + r() * 0.5, x = cx, y = cy, len = (0.07 + r() * 0.18) * Math.min(W, H); const seg = 6; g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < seg; k++) { a += (r() - 0.5) * 0.6; const l = len / seg; x += Math.cos(a) * l; y += Math.sin(a) * l; g.lineTo(x, y); if (r() < 0.25) { g.moveTo(x, y); const bx = x + Math.cos(a + 0.9) * l * 1.6, by = y + Math.sin(a + 0.9) * l * 1.6; g.lineTo(bx, by); g.moveTo(x, y); } }
        g.strokeStyle = 'rgba(238,240,248,.75)'; g.lineWidth = 1; g.stroke(); g.strokeStyle = 'rgba(196,20,60,.6)'; g.lineWidth = 3; g.globalCompositeOperation = 'destination-over'; g.stroke(); g.globalCompositeOperation = 'source-over'; }
      g.fillStyle = 'rgba(238,240,248,.9)'; g.beginPath(); g.arc(cx, cy, 2.5, 0, 7); g.fill(); }
  }
  hit(dmg) { this.flash = Math.min(1, this.flash + 0.25 + dmg / 40); }
  frame(dt, hp) {   // (the visor stays cracked while you are hurt and clears as the light comes back; a fresh hit flashes it harder)
    this.flash = Math.max(0, this.flash - dt * 1.4); const base = Math.max(0, Math.min(1, (70 - hp) / 55)); const a = Math.max(base, this.flash * 0.9);
    if (Math.abs(a - (this.lastA ?? -1)) > 0.004) { this.lastA = a; this.crack.style.opacity = a.toFixed(3); }
  }
  // ---- (5) the day and night dial: the lit half is blue (ours), the dark half is red; a thin needle is the hour
  buildDial() {
    const ph = document.getElementById('phase'); if (!ph) return; this.dial = dialSvg(); ph.prepend(this.dial); ph.keep.push(this.dial); const k = this.k, A = Math.PI * 2, d1 = k.NIGHT_AT * A;
    this.dial.innerHTML = `<path d="${arc(0.02, d1 - 0.02, 17)}" fill="none" stroke="${COL.ours}" stroke-width="3"/><path d="${arc(d1 + 0.02, A - 0.02, 17)}" fill="none" stroke="${COL.dark}" stroke-width="3"/><circle r="11" fill="none" stroke="${COL.steelDim}" stroke-width="1"/><line id="needle" x1="0" y1="0" x2="0" y2="-14" stroke="${COL.text}" stroke-width="1.2"/><path d="M0 -22 L2.5 -19 L0 -16 L-2.5 -19Z" fill="${COL.steel}"/>`;
    this.needle = this.dial.querySelector('#needle');
  }
  clock(c) { if (this.needle) this.needle.setAttribute('transform', `rotate(${((c % 1) * 360).toFixed(1)})`); }
}
