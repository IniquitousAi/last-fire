// node next/sim/forest_run.cjs [port] [label]: the forest from the player's spot at night on Earth (outside the walls, the green patch, the hazard bog)
// and frames counted over 6 s at three spots, at 1920x908 headless. Shots: next/playtests/lanes/C/forest-<name>.png; log: forest_run-<label>.json.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs'), path = require('path'); const PORT = +(process.argv[2] || 8103), LABEL = process.argv[3] || 'after', OUT = path.join(__dirname, '..', 'playtests', 'lanes', 'C'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 908 } })).newPage(), errs = [], log = { port: PORT, label: LABEL, fps: {}, at: new Date().toISOString() }; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push('console: ' + m.text().slice(0, 160)); });
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(2500); await p.click('#solo'); await p.waitForFunction(() => window.__lf && __lf.me && __lf.g && __lf.g.ready, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { __lf.g.holdDay = true; const b = [...document.querySelectorAll('#hud button')].find(x => /SKIP THE GUIDE/.test(x.textContent)); if (b) b.click(); __lf.g.clock = 0.8; });
  const E = { x: 0, z: 6000 };
  const put = (x, z, tx, tz, pitch = 0.03) => p.evaluate(([x, z, tx, tz, pitch]) => { const m = __lf.me; m.x = x; m.z = z; m.y = __lf.g.land(x, z); m.yaw = Math.atan2(-(tx - x), -(tz - z)); m.pitch = pitch; }, [x, z, tx, tz, pitch]);
  const fps = () => p.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 6000) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); }));
  const shot = async (n) => { await p.waitForTimeout(3500); await p.screenshot({ path: path.join(OUT, `forest-${n}${LABEL === 'after' ? '' : '-' + LABEL}.png`) }); };
  await put(E.x + 70, E.z + 30, E.x + 120, E.z + 20); await shot('outside-night');
  log.fps['outside the walls'] = await fps();
  await put(E.x + 150, E.z - 95, E.x + 150, E.z - 125); await shot('green-patch'); log.fps['green patch'] = await fps();
  await put(E.x - 135, E.z + 150, E.x - 135, E.z + 120); await shot('hazard-bog'); log.fps['hazard bog'] = await fps();
  await put(E.x + 5, E.z - 66, E.x + 5, E.z - 140, 0.06); await p.waitForTimeout(2500); log.fps['north road'] = await fps();
  // same page, same spot, forest on and off, four times each, interleaved: the cost of the forest itself
  await put(E.x + 70, E.z + 30, E.x + 120, E.z + 20); await p.waitForTimeout(1500); const on = [], off = [];
  for (let i = 0; i < 3; i++) { await p.evaluate(() => { window.__noforest = false; }); await p.waitForTimeout(800); on.push(await fps()); await p.evaluate(() => { window.__noforest = true; }); await p.waitForTimeout(800); off.push(await fps()); }
  await p.evaluate(() => { window.__noforest = false; }); log.forestOn = on; log.forestOff = off;
  await p.evaluate(() => { __lf.g.clock = 0.3; }); await put(E.x + 70, E.z + 30, E.x + 120, E.z + 20); await shot('outside-day');
  log.forest = await p.evaluate(() => (window.__imm || []).filter(x => x[0] === 'forest').map(x => x[1])); log.errs = errs; console.log(JSON.stringify(log)); fs.writeFileSync(path.join(OUT, `forest_run-${LABEL}.json`), JSON.stringify(log, null, 1)); await b.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
