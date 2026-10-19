// Three HUD looks on the same live numbers (his note, 2026-10-19: "all the ui is basic and not immersive"). He flips them in the
// Tab menu and keeps one; the rule is three rough versions, he picks. VISOR: a helmet's edges, tilted corners that sway with your
// aim, a compass with the fire on it. QUIET: numbers show only when they change or matter, the rest is the world. GLASS: Vigil's black glass.
export const LOOKS = [
  ['visor', 'VISOR', "a helmet's edges and a compass to the fire"],
  ['quiet', 'QUIET', 'numbers show only when they change'],
  ['glass', 'GLASS', "Vigil's black glass"],
];
const CSS = `
body.look-visor #fireHud { left: 52px; top: 50px; transform-origin: left center; transform: perspective(700px) rotateY(16deg) translate(var(--sx), var(--sy)); }
body.look-visor #phase { right: 52px; top: 50px; transform-origin: right center; transform: perspective(700px) rotateY(-16deg) translate(var(--sx), var(--sy)); }
body.look-visor #hp { left: 52px; bottom: 50px; transform-origin: left center; transform: perspective(700px) rotateY(16deg) translate(var(--sx), var(--sy)); }
body.look-visor #ammo { right: 52px; bottom: 44px; transform-origin: right center; transform: perspective(700px) rotateY(-16deg) translate(var(--sx), var(--sy)); }
body.look-visor #hp div { height: 3px; background: #ffffff14; } body.look-visor #hp i { background: linear-gradient(90deg, #ff4f6d, #ff6fb1); }
body.look-visor #fireHud b, body.look-visor #phase b { font-weight: 400; letter-spacing: .14em; } body.look-visor #light span { letter-spacing: .2em; font-size: 13px; }
body.look-visor #light { transform: translateX(-50%) translate(var(--sx), var(--sy)); }
#visor { position: fixed; inset: 0; pointer-events: none; display: none; } body.look-visor #visor { display: block; }
#compass { position: fixed; left: 50%; top: 12px; width: 460px; height: 34px; margin-left: -230px; overflow: hidden; pointer-events: none; display: none;
  -webkit-mask: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent); mask: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent); }
body.look-visor #compass { display: block; } body.look-visor #guide { top: 52px !important; }
#compass i { position: absolute; top: 0; width: 1px; height: 7px; background: #a3a6bb; } #compass i.big { height: 12px; background: #eef0f8; }
#compass b { position: absolute; top: 13px; font: 400 14px "Barlow Condensed", sans-serif; color: #a3a6bb; transform: translateX(-50%); letter-spacing: .1em; }
#compass .fire { position: absolute; top: 0; transform: translateX(-50%); text-align: center; color: #b9a8ff; font: 400 14px "Barlow Condensed", sans-serif; letter-spacing: .08em; white-space: nowrap; }
#compass .fire::before { content: ''; display: block; width: 0; height: 0; margin: 0 auto 1px; border: 6px solid transparent; border-top-color: #b9a8ff; border-bottom: 0; }
body.look-quiet #fireHud, body.look-quiet #phase, body.look-quiet #ammo, body.look-quiet #light, body.look-quiet #hp, body.look-quiet #build { opacity: 0; transition: opacity .8s; }
body.look-quiet .fresh { opacity: 1 !important; transition: opacity .2s !important; }
body.look-glass #fireHud, body.look-glass #phase, body.look-glass #ammo, body.look-glass #hp, body.look-glass #light { background: #05060be0; border-radius: 10px; padding: 10px 16px 9px; text-shadow: none; }
body.look-glass #fireHud::after, body.look-glass #phase::after, body.look-glass #ammo::after, body.look-glass #hp::after, body.look-glass #light::after { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none;
  background: linear-gradient(90deg, #29e6ff, #8f7bff, #ff5fd2); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); }
body.look-glass #hp { width: 232px; } body.look-glass #light { bottom: 18px; min-width: 300px; } body.look-glass #fireHud, body.look-glass #phase { top: 16px; }
body.look-glass #fireHud { left: 16px; } body.look-glass #phase { right: 16px; } body.look-glass #ammo { right: 16px; bottom: 16px; } body.look-glass #hp { left: 16px; bottom: 16px; }
body.look-glass #build { bottom: 112px; }
body[class*=look-] #fps { top: auto; bottom: 1px; left: 50%; transform: translateX(-50%); font-size: 12px; }
`;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export class HudLook {
  constructor(get, set) {
    this.get = get; this.set = set; this.sx = 0; this.sy = 0; this.vx = 0; this.vy = 0; this.sig = {}; this.at = {};
    document.head.append(Object.assign(document.createElement('style'), { textContent: CSS }));
    const hud = document.getElementById('hud');
    // the visor's edges: four thin lines of colored light bending in at the corners, like the inside of a helmet
    this.visor = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); this.visor.id = 'visor'; this.visor.setAttribute('preserveAspectRatio', 'none'); this.visor.setAttribute('viewBox', '0 0 1000 1000');
    this.visor.innerHTML = `<defs><linearGradient id="vg" x1="0" x2="1"><stop offset="0" stop-color="#29e6ff"/><stop offset=".5" stop-color="#8f7bff"/><stop offset="1" stop-color="#ff5fd2"/></linearGradient></defs>
      <g fill="none" stroke="url(#vg)" stroke-width="1.2" vector-effect="non-scaling-stroke" opacity=".55">
      <path d="M 18 200 Q 22 40 180 26" vector-effect="non-scaling-stroke"/><path d="M 982 200 Q 978 40 820 26" vector-effect="non-scaling-stroke"/>
      <path d="M 18 800 Q 22 960 180 974" vector-effect="non-scaling-stroke"/><path d="M 982 800 Q 978 960 820 974" vector-effect="non-scaling-stroke"/></g>`;
    this.compass = Object.assign(document.createElement('div'), { id: 'compass' });
    this.ticks = []; for (let d = 0; d < 360; d += 15) { const big = d % 90 === 0, t = document.createElement('i'); if (big) t.className = 'big'; this.compass.append(t); this.ticks.push([d, t]); if (big) { const b = document.createElement('b'); b.textContent = ['N', 'E', 'S', 'W'][d / 90]; this.compass.append(b); this.ticks.push([d, b]); } }
    this.fire = Object.assign(document.createElement('div'), { className: 'fire' }); this.compass.append(this.fire);
    hud.append(this.visor, this.compass);
    addEventListener('mousemove', e => { if (document.pointerLockElement) { this.vx += e.movementX; this.vy += e.movementY; } });
    this.apply(get() || 'visor');
  }
  apply(name) { this.name = name; document.body.classList.remove(...LOOKS.map(l => 'look-' + l[0])); document.body.classList.add('look-' + name); this.set(name); }
  update(dt, me, g, C, gun) {
    if (!me || !g) return;
    if (this.name === 'visor') {   // (the corners lag a hair behind your aim, the way a helmet sits on a head; the compass keeps the fire in view)
      const k = Math.min(1, dt * 7); this.sx += (-Math.max(-14, Math.min(14, this.vx * 0.6)) - this.sx) * k; this.sy += (-Math.max(-9, Math.min(9, this.vy * 0.6)) - this.sy) * k; this.vx = 0; this.vy = 0;
      document.documentElement.style.setProperty('--sx', this.sx.toFixed(1) + 'px'); document.documentElement.style.setProperty('--sy', this.sy.toFixed(1) + 'px');
      const px = 460 / (Math.PI * 0.9);   // (the strip shows about 160 degrees)
      for (const [d, el] of this.ticks) { el.style.left = (230 + wrap(me.yaw - d * Math.PI / 180) * px) + 'px'; }
      const dx = g.fire.x - me.x, dz = g.fire.z - me.z, dist = Math.hypot(dx, dz), h = Math.atan2(-dx, -dz), rel = wrap(me.yaw - h);
      this.fire.style.left = (230 + Math.max(-1.35, Math.min(1.35, rel)) * px) + 'px'; this.fire.textContent = dist < 3 ? 'FIRE' : `FIRE ${Math.round(dist)} m`;
    }
    if (this.name === 'quiet') {   // (each number shows for four seconds after it changes, and whenever it matters: hurt, at the fire, carrying light)
      const now = performance.now(), am = gun(), near = Math.hypot(me.x - g.fire.x, me.z - g.fire.z) < C.fireRadius(g.fire);
      const sig = { fireHud: g.fire.level + ':' + Math.floor(g.fire.light / 10), phase: C.phase(g.clock), light: Math.floor(me.carried), ammo: am, hp: Math.ceil(me.hp / 5), build: Math.floor(me.carried / 5) };
      const keep = { fireHud: near || g.fire.fuel < 60, light: me.carried > 0, hp: me.hp < 100, build: me.carried > 0 };
      for (const k in sig) { if (this.sig[k] !== sig[k]) { this.sig[k] = sig[k]; this.at[k] = now; } const on = keep[k] || now - (this.at[k] || 0) < 4000, el = document.getElementById(k); if (el && el.classList.contains('fresh') !== on) el.classList.toggle('fresh', on); }
    }
  }
}
