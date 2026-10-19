// node next/sim/nightshot.cjs <tag>: the camp and Earth at night with the dark on, photographed from the player's spot after it has had time to come.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core'), path = require('path'), tag = process.argv[2] || '';
(async () => { const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 908 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8092/next/?shot'); await p.waitForTimeout(2500); await p.click('#solo'); await p.waitForFunction(() => window.__lf && __lf.g && __lf.g.ready, null, { timeout: 90000 });
  for (const [n, earth] of [['camp-night', false], ['earth-night', true]]) {
    await p.evaluate(e => { const g = __lf.g, m = __lf.me; if (e) { g.earth = { t: 1e6, n: 1, site: 'city', found: { parts: 0, cells: 0 } }; m.x = 5; m.z = 6015; } else { m.x = 2; m.z = 8; } m.y = g.land(m.x, m.z); g.clock = 0.8; g.holdDay = true; m.hp = 100; }, earth);
    await p.waitForTimeout(16000); const k = await p.evaluate(() => { const g = __lf.g, m = __lf.me; const near = g.hollow.filter(k => !k.dead).sort((a, b) => Math.hypot(a.x - m.x, a.z - m.z) - Math.hypot(b.x - m.x, b.z - m.z))[0]; if (near) { m.yaw = Math.atan2(-(near.x - m.x), -(near.z - m.z)); m.pitch = 0; m.hp = 100; } return g.hollow.filter(k => !k.dead).length; });
    await p.waitForTimeout(900); await p.screenshot({ path: path.join(__dirname, '..', 'playtests', 'checklist', n + tag + '.png') }); console.log(n, k, 'alive'); }
  console.log(JSON.stringify({ errs })); await b.close(); })();
