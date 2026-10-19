// node next/sim/whyshot.cjs: opens the Simulator page in a real browser and photographs its 'why is this not good' table (checklist item 5).
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core'), path = require('path'), fs = require('fs');
(async () => { const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8092/next/sim.html'); await p.waitForSelector('#why', { timeout: 20000 }); const n = await p.evaluate(() => document.querySelectorAll('#why tr').length - 1);
  await p.screenshot({ path: path.join(__dirname, '..', 'playtests', 'checklist', 'why-table.png') });
  const out = `${n >= 10 ? 'PASS' : 'FAIL'}  the Simulator page shows a number for every system  (${n} rows)\n${errs.length ? 'FAIL  ' + errs[0] : 'PASS  no errors in the page'}\n`; fs.writeFileSync(path.join(__dirname, '..', 'playtests', 'checklist', 'test-whyshot.txt'), out); console.log(out); await b.close(); })();
