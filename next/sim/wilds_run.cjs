// node next/sim/wilds_run.cjs [port] [shots]: Earth at 1920x908 headless, frames counted over 6 s at three spots (before/after numbers for the forest work),
// and, with "shots", screenshots of the small details up close in the camp. Log: next/playtests/lanes/C/wilds_run.json.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs'), path = require('path'); const PORT = +(process.argv[2] || 8103), SHOTS = process.argv[3] === 'shots', OUT = path.join(__dirname, '..', 'playtests', 'lanes', 'C'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 908 } })).newPage(), errs = [], log = { port: PORT, fps: {}, at: new Date().toISOString() }; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(2500); await p.click('#solo'); await p.waitForFunction(() => window.__lf && __lf.me && __lf.g && __lf.g.ready, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { __lf.g.holdDay = true; const b = [...document.querySelectorAll('#hud button')].find(x => /SKIP THE GUIDE/.test(x.textContent)); if (b) b.click(); });
  const put = (x, z, tx, tz, pitch = 0.05) => p.evaluate(([x, z, tx, tz, pitch]) => { const m = __lf.me; m.x = x; m.z = z; m.y = __lf.g.land(x, z); m.yaw = Math.atan2(-(tx - x), -(tz - z)); m.pitch = pitch; }, [x, z, tx, tz, pitch]);
  const fps = () => p.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 6000) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); }));
  await p.evaluate(() => { __lf.g.clock = 0.8; });
  for (const [n, x, z, tx, tz] of [['earth gate', 0, 6030, 0, 6060], ['earth outside', 30, 6110, 0, 6040], ['earth deep', 0, 6200, 100, 6100]]) { await put(x, z, tx, tz); await p.waitForTimeout(2500); log.fps[n] = await fps(); console.log(n, log.fps[n], 'fps'); }
  if (SHOTS) {
    await p.evaluate(() => { __lf.g.clock = 0.3; __lf.g.night = 7; __lf.g.fire.level = 2; });
    await put(0, 9, 0, 21, -0.38); await p.waitForTimeout(2500); await p.screenshot({ path: path.join(OUT, 'details-boot-prints.png') });
    { const f = Math.atan2(-5, 4), sx = Math.sin(f), sz = Math.cos(f); await put(5 + sx * 1.4, -4 + sz * 1.4, 5 + sx * 0.09, -4 + sz * 0.09 - 0, -0.08); await p.evaluate(() => { __lf.me.pitch = -0.28; }); } await p.waitForTimeout(2500); await p.screenshot({ path: path.join(OUT, 'details-tally.png') });
    await put(0, 7.5, 0, 0, -0.75); await p.waitForTimeout(2500); await p.screenshot({ path: path.join(OUT, 'details-scorch.png') });
  }
  log.errs = errs; console.log('errors', JSON.stringify(errs)); fs.writeFileSync(path.join(OUT, SHOTS ? 'wilds_run.json' : 'wilds_run_baseline.json'), JSON.stringify(log, null, 1)); await b.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
