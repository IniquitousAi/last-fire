// Checklist "Wrist screen and tech grow by era". Needs a static server at PORT (default 8092).
// Era 1 (Scavenged): words only (no map pixels). Era 2 (Light): a map appears (blue ring pixels in the right third). Era 3 (the dark's own): map plus schematic and scan line (more blue pixels). Eras come from era_state.json via camp.era.
// The screen's colors must be deep blue and never cyan (no pixel with green close to blue). Takes a screenshot per era (SHOT_PREFIX) for SEEN.
const { chromium } = require('C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const PORT = process.env.PORT || 8092, PRE = process.env.SHOT_PREFIX || 'wrist-era';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 908 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(2500); await p.click('#solo');
  await p.waitForFunction(() => window.__lf && __lf.me && __lf.g && __lf.g.ready, null, { timeout: 280000 }); await p.waitForTimeout(2500);
  const res = []; let fails = 0;
  for (const [night, i] of [[1, 0], [2, 1], [3, 2]]) {
    await p.evaluate(n => { __lf.camp.era = { era: n }; __lf.wrist.text = ''; __lf.wrist.say('Stand at the board and check it. It costs nothing.', 6, 'the clerk'); }, night); await p.waitForTimeout(1500);
    const st = await p.evaluate(() => { const c = __lf.wrist.c, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let right = 0, blue = 0, cyan = 0;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const k = (y * c.width + x) * 4, r = d[k], g = d[k + 1], bl = d[k + 2], a = d[k + 3]; if (a < 100) continue; if (bl > 170 && bl > r * 1.4 && bl > g * 1.4 && x > c.width * 0.68) right++; if (bl > 170 && bl > r * 1.4 && bl > g * 1.4) blue++; if (g > 150 && bl > 150 && Math.abs(g - bl) < 40 && r < 120) cyan++; }
      return { era: __lf.wrist.era, right, blue, cyan }; });
    await p.screenshot({ path: `next/playtests/lanes/D/${PRE}${i}.png` }); res.push(st); console.log(`era ${night}: era ${st.era}, map-side blue pixels ${st.right}, blue ${st.blue}, cyan ${st.cyan}`);
  }
  const ok = res[0].era === 0 && res[1].era === 1 && res[2].era === 2 && res[0].right < 600 && res[1].right > 1200 && res[2].right > res[1].right + 150 && res.every(r => r.cyan === 0 && r.blue > 100) && !errs.length;
  console.log(ok ? 'PASS' : 'FAIL', 'errors', errs.length); await b.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
