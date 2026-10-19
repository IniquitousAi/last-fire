// node next/sim/fps_enemies.cjs: frame rate on Earth at night with the dark on (?enemies) against off, at 1920x908 headless; the dark is
// filled to its cap first. Writes playtests/checklist/test-fps_enemies.txt.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core'), fs = require('fs'), path = require('path');
(async () => { const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] }); const out = [];
  for (const q of ['', '&enemies', '', '&enemies']) { const p = await (await b.newContext({ viewport: { width: 1920, height: 908 } })).newPage();
    await p.goto('http://localhost:8092/next/?shot' + q); await p.waitForTimeout(2500); await p.click('#solo'); await p.waitForFunction(() => window.__lf && __lf.g && __lf.g.ready, null, { timeout: 90000 });
    await p.evaluate(() => { const g = __lf.g, m = __lf.me; g.earth = { t: 1e6, n: 1, site: 'city', found: { parts: 0, cells: 0 } }; g.clock = 0.8; g.holdDay = true; m.x = 8; m.z = 6020; m.y = g.land(8, 6020); m.yaw = Math.PI; m.hp = 1e9; });
    await p.waitForTimeout(14000); const n = await p.evaluate(() => __lf.g.hollow.filter(k => !k.dead).length);
    const fps = await p.evaluate(() => new Promise(r => { let k = 0; const t0 = performance.now(); const f = () => { k++; if (performance.now() - t0 < 5000) requestAnimationFrame(f); else r(k / 5); }; requestAnimationFrame(f); }));
    out.push({ on: !!q, n, fps }); console.log(q ? 'enemies' : 'off', n, 'alive', fps, 'fps'); await p.close(); }
  const avg = on => { const a = out.filter(o => o.on === on).map(o => o.fps); return a.reduce((s, x) => s + x, 0) / a.length; }, on = avg(true), off = avg(false), n = Math.max(...out.filter(o => o.on).map(o => o.n));
  const txt = `${on >= off * 0.9 ? 'PASS' : 'FAIL'}  the dark on screen costs at most 10% of the frame rate  (${on.toFixed(0)} fps with ${n} alive, ${off.toFixed(0)} fps without, same machine and minute)\n`; fs.writeFileSync(path.join(__dirname, '..', 'playtests', 'checklist', 'test-fps_enemies.txt'), txt); console.log(txt); await b.close(); })();
