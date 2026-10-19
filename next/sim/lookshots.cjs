// node next/sim/lookshots.cjs <tag>: screenshots of Earth's wall and the Rift from the player's spot at night and day, for sim/lookmatch.py (items 1 and 56).
const { chromium } = require('C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const OUT = 'C:/Users/danie/Desktop/projects/survival/next/playtests/rift/', tag = process.argv[2] || '';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => { const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 908 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8092/next/?shot' + (process.argv[3] || '')); await p.waitForTimeout(2500); await p.click('#solo');
  await p.waitForFunction(() => window.__lf && __lf.me && __lf.g && __lf.g.ready, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const g = __lf.g, m = __lf.me; m.x = 11; m.z = -13; })
  const spots = [['mouth-night', 2, 6022, 0, 6060, 0.8, 0.12], ['mouth-day', 2, 6022, 0, 6060, 0.3, 0.12], ['outside-veins', 20, 6075, 60, 6120, 0.8, 0.02], ['inside', 0, 9004, 0, 9026, 0.8, -0.02], ['console', 3, 9020, 0, 9026, 0.8, -0.2]];
  for (const [n, x, z, tx, tz, clock, pitch] of spots) { await p.evaluate(([x, z, tx, tz, clock, pitch]) => { const g = __lf.g, m = __lf.me; if (!g.earth) g.earth = { t: 1e6, n: 1, site: 'city', found: { parts: 0, cells: 0 } }; g.clock = clock; g.holdDay = true; m.x = x; m.z = z; m.y = g.land(x, z); m.yaw = Math.atan2(-(tx - x), -(tz - z)); m.pitch = pitch; }, [x, z, tx, tz, clock, pitch]); await p.waitForTimeout(3500); await p.screenshot({ path: OUT + n + tag + '.png' }); console.log(n, await p.evaluate(() => document.getElementById('prompt').innerText)); }
  console.log(JSON.stringify({ errs: errs.filter(e => !/X4122|X3595|404/.test(e)).slice(0, 5) })); await b.close(); })().catch(e => console.log('FAIL', e.message));
