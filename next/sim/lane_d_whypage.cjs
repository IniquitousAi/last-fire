// Checklist "The Simulator page answers 'why is this not good' with a number for every system". Needs a static server at PORT (default 8092).
// Opens next/sim.html, runs WHY IS THIS NOT GOOD, and passes when it has a row per system (6), each with a real number in "measured now" and "how far off".
const { chromium } = require('C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const PORT = process.env.PORT || 8092;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/next/sim.html`); await p.waitForTimeout(1500);
  const sec = p.locator('section.test', { hasText: 'WHY IS THIS NOT GOOD' }); await sec.locator('button').click();
  await p.waitForFunction(() => [...document.querySelectorAll('section.test')].some(s => /WHY IS THIS NOT GOOD/.test(s.textContent) && /in line, in/.test(s.querySelector('.say').textContent)), null, { timeout: 280000 });
  const rows = await sec.locator('tr').evaluateAll(trs => trs.slice(1).map(tr => [...tr.children].map(td => td.textContent)));
  rows.forEach(r => console.log(r.join(' | ')));
  const ok = rows.length === 6 && rows.every(r => /\d/.test(r[1]) && r[3].length > 0 && /yes|no/.test(r[4])) && !errs.length;
  await sec.scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.screenshot({ path: (process.env.SHOT || 'why.png') }); console.log(`${rows.length} systems with a number each; errors: ${errs.length}  ${ok ? 'PASS' : 'FAIL'}`); await b.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
