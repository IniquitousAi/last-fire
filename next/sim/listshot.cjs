// node next/sim/listshot.cjs: a real browser run that opens the in-game checklist from the pause menu (Esc, CHECKLIST) and photographs it,
// so the checklist's own marks can be SEEN where a player meets them. Needs the "Last Fire" preview server on 8092.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const path = require('path'), fs = require('fs');
(async () => { const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8092/next/?shot'); await p.waitForTimeout(2500); await p.click('#solo'); await p.waitForFunction(() => window.__lf && __lf.g && __lf.g.ready, null, { timeout: 60000 }); await p.waitForTimeout(1500);
  await p.keyboard.press('Escape'); await p.waitForTimeout(600); await p.click('#openList'); await p.waitForTimeout(1500);
  const txt = await p.evaluate(() => document.getElementById('listBody').innerText); const serves = (txt.match(/serves [BCA],/g) || []).length;
  await p.screenshot({ path: path.join(__dirname, '..', 'playtests', 'checklist', 'list-spine.png') });
  const out = `${serves >= 69 ? 'PASS' : 'FAIL'}  the in-game checklist shows what every item serves  (${serves} rows say serves B, C or A)\n${errs.length ? 'FAIL  page errors: ' + errs[0] : 'PASS  no errors in the page'}\n`;
  fs.writeFileSync(path.join(__dirname, '..', 'playtests', 'checklist', 'test-listshot.txt'), out); console.log(out); await b.close(); })();
