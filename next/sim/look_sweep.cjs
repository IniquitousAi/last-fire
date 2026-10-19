// node next/sim/look_sweep.cjs <port> <tag> [look]: every screen from the player's spot, for the AAA look pass (read by eye, then sim/lookmatch.py on the Rift ones).
// Screens: title, camp dusk, camp night, camp fight, the edge, the Rift (mouth and inside), pause menu, CODEX. At 1000x900 and 1920x1080.
// Writes next/playtests/look/sweep-<tag>/<screen>-<width>.png (+ rift-*.png for lookmatch). look = '' (dev light, default) or 3.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const PORT = +(process.argv[2] || 8111), TAG = process.argv[3] || 'x', LOOK = process.argv[4] || '', OUT = path.join(__dirname, '..', 'playtests', 'look', 'sweep-' + TAG); fs.mkdirSync(OUT, { recursive: true });
const SIZES = [[1000, 900], [1920, 1080]];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  const snap = async n => { for (const [w, h] of SIZES) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(900); await p.screenshot({ path: path.join(OUT, `${n}-${w}.png`) }); } await p.setViewportSize({ width: 1000, height: 900 }); };
  await p.goto(`http://localhost:${PORT}/next/?shot${LOOK ? '&look=' + LOOK : ''}`); await p.waitForTimeout(2500); await snap('title');
  await p.click('#solo'); await p.waitForFunction(() => window.__lf && __lf.g && __lf.g.ready, null, { timeout: 90000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { for (const x of document.querySelectorAll('#hud button')) if (/SKIP THE GUIDE/.test(x.textContent)) x.click(); });
  const put = (x, z, tx, tz, clock, pitch) => p.evaluate(([x, z, tx, tz, clock, pitch]) => { const g = __lf.g, m = __lf.me; g.holdDay = true; g.clock = clock; m.x = x; m.z = z; m.y = g.land(x, z); m.yaw = Math.atan2(-(tx - x), -(tz - z)); m.pitch = pitch; m.hp = 100; }, [x, z, tx, tz, clock, pitch]);
  await put(2.4, -1.4, 5, 4, 0.58, 0.05); await p.waitForTimeout(2500); await snap('camp-dusk');
  await put(2.4, -1.4, 5, 4, 0.8, 0.05); await p.waitForTimeout(12000); await snap('camp-night');
  const n = await p.evaluate(() => { const g = __lf.g, m = __lf.me; const k = g.hollow.filter(h => !h.dead).sort((a, c) => Math.hypot(a.x - m.x, a.z - m.z) - Math.hypot(c.x - m.x, c.z - m.z))[0]; if (k) { m.yaw = Math.atan2(-(k.x - m.x), -(k.z - m.z)); m.pitch = 0.0; } return g.hollow.filter(h => !h.dead).length; });
  console.log('alive in the fight shot:', n); await p.waitForTimeout(800); await snap('fight');
  await put(3.4, 14.5, 3.4, 22, 0.58, -0.02); await p.waitForTimeout(2500); await snap('edge');
  await p.evaluate(() => { const g = __lf.g; if (!g.earth) g.earth = { t: 1e6, n: 1, site: 'city', found: { parts: 0, cells: 0 } }; });
  for (const [nm, x, z, tx, tz, clock, pitch] of [['rift-mouth-night', 2, 6022, 0, 6060, 0.8, 0.12], ['rift-mouth-day', 2, 6022, 0, 6060, 0.3, 0.12], ['rift-outside-veins', 20, 6075, 60, 6120, 0.8, 0.02], ['rift-inside', 0, 9004, 0, 9026, 0.8, -0.02], ['rift-console', 3, 9020, 0, 9026, 0.8, -0.2]]) { await put(x, z, tx, tz, clock, pitch); await p.waitForTimeout(3500); await snap(nm); }
  await put(2.4, -1.4, 5, 4, 0.3, 0.05); await p.waitForTimeout(1500);
  await p.keyboard.press('Escape'); await p.waitForTimeout(700); await snap('pause');
  await p.click('#openCodex'); await p.waitForTimeout(700); await snap('codex');
  console.log(JSON.stringify({ errs: errs.slice(0, 5) })); await b.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
