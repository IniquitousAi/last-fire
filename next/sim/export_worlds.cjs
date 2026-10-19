// node next/sim/export_worlds.cjs [nights]: the real client plays a recorded world, and the daemon's folder gets it.
// The browser (headless, 1000x900, fake pad) starts PLAY ALONE, two learned friends join, and the REAL client state (its own core, its own friend.js
// robots) is stepped through some nights faster than real time; the pause menu's save (the page's own saveNow) writes the world to localStorage; this
// script copies that world JSON into next/daemon/worlds/ (the folder tools/daemon.mjs reads) and runs the daemon once on it. PORT env (default 8102).
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const PORT = process.env.PORT || 8102, NIGHTS = +(process.argv[2] || 4), DIR = path.join(__dirname, '..', 'daemon', 'worlds');
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.addInitScript(() => { const btn = () => ({ pressed: false, value: 0 }); window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), mapping: 'standard', id: 'robot pad' }; navigator.getGamepads = () => [window.__pad]; });
  await ctx.route('**/peerjs*', r => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('page error', e.message));
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(2500); await p.fill('#name', 'Daniel'); await p.click('#solo');
  await p.waitForFunction(() => window.lastfire2 && lastfire2.g && lastfire2.g.ready && lastfire2.me, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  const r = await p.evaluate(async nights => {
    const v = (document.querySelector('script[src*="main.js"]').src.match(/v=(\d+)/) || [])[1], C = await import(`/next/core/game.js?v=${v}`), F = await import(`/next/client/friend.js?v=${v}`), g = lastfire2.g, me = lastfire2.me;
    g.holdDay = false; g.clock = 0.5; const mk = (id, name, style) => { const q = C.addPlayer(g, id, name); q.bot = true; q.style = style; q.r = C.stream(g.seed, 'friend-' + id); const a = id; q.homeX = g.fire.x + Math.cos(a) * Math.min(style.roam, 30); q.homeZ = g.fire.z + Math.sin(a) * Math.min(style.roam, 30); return q; };
    mk(90, 'Dalton', { name: 'Dalton', roam: 9, greed: 8, bankAt: 12, aim: 0.65, together: 0.8, blind: 4 }); mk(91, 'Rex', { name: 'Rex', roam: 22, greed: 18, bankAt: 28, aim: 0.5, together: 0.3, blind: 1 });
    me.style = { name: 'Daniel', roam: 8, greed: 8, bankAt: 12, aim: 0.7, together: 0.7, blind: 3 }; me.r = C.stream(g.seed, 'autoplay-me'); me.homeX = g.fire.x + 6; me.homeZ = g.fire.z + 2; me.x = g.fire.x + 3; me.z = g.fire.z; let guard = 0; const start = g.night;
    while (g.night < start + nights && guard++ < 200000) { for (const q of g.players) if (q.bot || q === me) F.think(g, q, q.r, 0.1); me.hp = 100; C.step(g, 0.1); }
    return { night: g.night, recorded: g.history.length, level: g.fire.level, falls: g.stats.falls };
  }, NIGHTS);
  console.log('the real client played', JSON.stringify(r));
  await p.evaluate(() => dispatchEvent(new Event('pagehide'))); await p.waitForTimeout(500);
  const w = await p.evaluate(() => { const l = JSON.parse(localStorage.getItem('lastfire2-worlds') || '[]')[0]; return l ? { id: l.id, data: localStorage.getItem('lastfire2-w-' + l.id) } : null; });
  await b.close();
  if (!w || !w.data) { console.log('FAIL: the page saved no world'); process.exit(1); }
  const file = path.join(DIR, `browser-${w.id}.json`); fs.writeFileSync(file, w.data); console.log('wrote', path.relative(process.cwd(), file), `(${w.data.length} bytes, ${JSON.parse(w.data).history.length} recorded nights)`);
  const out = execFileSync('node', [path.join(__dirname, '..', 'tools', 'daemon.mjs'), '--once', '--dir', DIR, '--out', path.join(__dirname, '..', 'daemon', 'learned.json')], { encoding: 'utf8', timeout: 900000 });
  console.log(out); fs.writeFileSync(path.join(__dirname, '..', 'playtests', 'lanes', 'B', 'daemon-run.txt'), `the real client's saved world, learned by the daemon\n${out}`);
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
