// Sights test (checklist: "Sights dead center on every gun, steady"). Needs a static server at PORT (default 8092) serving the repo root.
// Held guns (pistol, shotgun, lmg): the sight point (top center of the gun) must land within 2 px of the screen center, and stay within 1 px over 2 s aimed.
// Blender rigs (M4, rail): the pink reticle pixels in the middle of the screen must center within 2 px of the screen center, and stay within 1 px over 2 s.
const { chromium } = require('C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const PORT = process.env.PORT || 8092, W = 1000, H = 900;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(2500); await p.click('#solo');
  await p.waitForFunction(() => window.__lf && __lf.me && __lf.g && __lf.g.ready, null, { timeout: 280000 }); await p.waitForTimeout(2500);
  let fails = 0; const say = (ok, name, detail) => { if (!ok) fails++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  (' + detail + ')'); };
  // look at open sky so no scene reticle-colored pixel is behind the sights
  await p.evaluate(() => { __lf.me.pitch = 0.6; });
  const centroid = async () => { const png = (await p.screenshot()).toString('base64');
    return p.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const x0 = img.width / 2 - 22, y0 = img.height / 2 - 22, d = g.getImageData(x0, y0, 44, 44).data; let sx = 0, sy = 0, n = 0;
      for (let y = 0; y < 44; y++) for (let x = 0; x < 44; x++) { const i = (y * 44 + x) * 4, r = d[i], gg = d[i + 1], bb = d[i + 2]; if (r > 170 && gg < 120 && bb > 90 && r - gg > 90) { sx += x; sy += y; n++; } }
      return n < 6 ? null : { x: x0 + sx / n + 0.5 - img.width / 2, y: y0 + sy / n + 0.5 - img.height / 2, n }; }, png); };
  for (const k of ['pistol', 'shotgun', 'lmg']) {
    await p.evaluate(k => { __lf.gun(k); __lf.aim(true); }, k); await p.waitForTimeout(1800);
    const xs = [], ys = []; for (let i = 0; i < 20; i++) { const s = await p.evaluate(() => __lf.sight()); if (s) { xs.push(s.x); ys.push(s.y); } await p.waitForTimeout(100); }
    const rng = a => Math.max(...a) - Math.min(...a), mx = xs.reduce((a, c) => a + c, 0) / xs.length, my = ys.reduce((a, c) => a + c, 0) / ys.length;
    say(xs.length >= 18 && Math.abs(mx) <= 2 && Math.abs(my) <= 2, k + ' sight center within 2 px of screen center', `off x ${mx.toFixed(2)} y ${my.toFixed(2)} px`);
    say(xs.length >= 18 && rng(xs) <= 1 && rng(ys) <= 1, k + ' sight steady over 2 s aimed', `range x ${rng(xs).toFixed(2)} y ${rng(ys).toFixed(2)} px`);
  }
  for (const k of ['ar', 'rail']) {
    await p.evaluate(k => { __lf.gun(k); __lf.aim(true); }, k); await p.waitForTimeout(2200);
    const pts = []; for (let i = 0; i < 6; i++) { const c = await centroid(); if (c) pts.push(c); await p.waitForTimeout(350); }
    if (!pts.length) { say(false, k + ' reticle pixels found', 'none (no sight drawn)'); continue; }
    const mx = pts.reduce((a, c) => a + c.x, 0) / pts.length, my = pts.reduce((a, c) => a + c.y, 0) / pts.length, rx = Math.max(...pts.map(q => q.x)) - Math.min(...pts.map(q => q.x)), ry = Math.max(...pts.map(q => q.y)) - Math.min(...pts.map(q => q.y));
    say(Math.abs(mx) <= 2 && Math.abs(my) <= 2, k + ' reticle center within 2 px of screen center', `off x ${mx.toFixed(2)} y ${my.toFixed(2)} px over ${pts.length} frames`);
    say(rx <= 1 && ry <= 1, k + ' reticle steady over 2 s aimed', `range x ${rx.toFixed(2)} y ${ry.toFixed(2)} px`);
  }
  {   // (his report 2026-10-20: "shooting makes your aim down sights go to hip fire": every shot snapped the aimed M4 to the hip)
    await p.evaluate(() => { __lf.gun('ar'); __lf.aim(true); }); await p.waitForTimeout(2200);
    const pts = []; let miss = 0;
    for (let i = 0; i < 8; i++) { await p.evaluate(() => { __lf.refill(); __lf.fire(); }); await p.waitForTimeout(60); const c = await centroid(); if (c) pts.push(c); else miss++; }
    const far = pts.length ? Math.max(...pts.map(q => Math.hypot(q.x, q.y))) : Infinity;
    say(miss === 0 && far <= 14, 'M4 stays aimed while firing (reticle on screen center every shot)', `${8 - miss} of 8 shots kept the sight, farthest ${far.toFixed(1)} px off`);
  }
  say(!errs.length, 'no errors in the page', errs.join(' | ') || 'none');
  console.log(fails ? fails + ' FAILED' : 'all sight checks pass'); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
