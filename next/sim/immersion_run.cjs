// node next/sim/immersion_run.cjs [port]: a scripted browser run through lane C's pieces, in a real browser at his window (1000x900) and his full
// screen (1920x908). It plays: stands still until the game notices it, stands by the Clerk until three fresh lines are heard, watches the fog build
// through dusk, runs a night into the morning after, walks to Earth's smiling sign and out to the strange far land, and measures the HUD.
// Screenshots go to next/playtests/lanes/C/; the log is next/playtests/lanes/C/immersion_run.json (the PLAYED proof). Serve the repo root first.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const PORT = +(process.argv[2] || 8103), OUT = path.join(__dirname, '..', 'playtests', 'lanes', 'C'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(), errs = [], log = { at: new Date().toISOString(), steps: [] }; p.on('pageerror', e => errs.push(e.message));
  const step = (name, data) => { log.steps.push({ name, ...data }); console.log(name.padEnd(34), JSON.stringify(data).slice(0, 260)); };
  const shot = async f => { await p.screenshot({ path: path.join(OUT, f) }); return f; };
  const put = (x, z, tx, tz, pitch = 0.05) => p.evaluate(([x, z, tx, tz, pitch]) => { const m = __lf.me; m.x = x; m.z = z; m.y = __lf.g.land(x, z); m.yaw = Math.atan2(-(tx - x), -(tz - z)); m.pitch = pitch; }, [x, z, tx, tz, pitch]);
  const clock = c => p.evaluate(c => { __lf.g.clock = c; }, c), fog = () => p.evaluate(() => +__lf.scene.fog.density.toFixed(4));
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(2500); await p.click('#solo');
  await p.waitForFunction(() => window.__lf && __lf.me && __lf.g && __lf.g.ready, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { __lf.g.holdDay = true; });   // (the guide holds the day for a new player; the run sets the clock itself)

  // ---- HUD share of the screen, in play, at both sizes (63)
  const hudShare = () => p.evaluate(() => { const hud = document.getElementById('hud'), W = innerWidth, H = innerHeight, S = 2, w = Math.ceil(W / S), h = Math.ceil(H / S), m = new Uint8Array(w * h), seen = [];
    const fill = (r) => { if (r.width < 1 || r.height < 1 || r.width > W * 0.9 || r.height > H * 0.9) return; for (let y = Math.max(0, Math.floor(r.top / S)); y < Math.min(h, Math.ceil(r.bottom / S)); y++) for (let x = Math.max(0, Math.floor(r.left / S)); x < Math.min(w, Math.ceil(r.right / S)); x++) m[y * w + x] = 1; };
    for (const el of hud.querySelectorAll('*')) { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 || el.id === 'hurt' || el.id === 'loading' || el.closest('[hidden]') || el.closest('svg') && el.id !== 'cross' && !el.closest('#cross')) continue;
      const bg = cs.backgroundColor.match(/[\d.]+/g) || [], boxed = (bg.length === 4 ? +bg[3] > 0.05 : bg.length >= 3 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none');
      if (el.id === 'cross') { fill(el.getBoundingClientRect()); seen.push('cross'); continue; }
      if (boxed && !el.closest('.vc')) { fill(el.getBoundingClientRect()); seen.push(el.id || el.className || el.tagName); continue; }   // (a visible panel, bar or key counts as its whole box)
      for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) fill(r); seen.push(el.id || el.tagName); } }   // (loose text counts as the lines it really occupies)
    let n = 0; for (const v of m) n += v; return { pct: +(100 * n / (w * h)).toFixed(2), seen: [...new Set(seen)].join(',') }; });
  await p.evaluate(() => { const b = [...document.querySelectorAll('#hud button')].find(x => /SKIP THE GUIDE/.test(x.textContent)); if (b) b.click(); __lf.g.holdDay = true; }); await p.mouse.move(500, 300);   // (a player past the tutorial: the guide is a first-minute helper, not play)
  await clock(0.3); await p.waitForTimeout(1500); const h1 = await hudShare(); await shot('hud-1000x900.png'); step('hud share 1000x900 (day, camp)', h1);
  await p.evaluate(() => { __lf.g.clock = 0.7; }); await p.waitForTimeout(1200); const h1n = await hudShare(); step('hud share 1000x900 (night, camp)', h1n);
  await p.setViewportSize({ width: 1920, height: 908 }); await clock(0.3); await p.waitForTimeout(1500); const h2 = await hudShare(); await shot('hud-1920x908.png'); step('hud share 1920x908 (day, camp)', h2);
  await p.setViewportSize({ width: 1000, height: 900 }); await p.waitForTimeout(500);
  await p.evaluate(() => { __lf.me.carried = 30; }); await p.waitForTimeout(1200); const hc = await hudShare(); step('hud share 1000x900 (carrying light: build keys shown)', hc); await p.evaluate(() => { __lf.me.carried = 0; });
  if (process.env.HUDONLY) { await b.close(); process.exit(0); }

  // ---- fog through dusk (67)
  const dens = {}; for (const c of [0.3, 0.5, 0.57, 0.6, 0.7, 0.99]) { await clock(c); await p.waitForTimeout(500); dens[c] = await fog(); } step('fog density through the day (Moon)', dens);
  await put(0, 8, 0, -30, 0.1); await clock(0.3); await p.waitForTimeout(1200); await shot('moon-day.png'); await clock(0.585); await p.waitForTimeout(1200); await shot('moon-dusk.png'); await clock(0.75); await p.waitForTimeout(1200); await shot('moon-night-edge.png');

  // ---- camp people: stand by the Clerk until fresh lines come (61)
  await clock(0.3); await put(1.2, -3.2, 3.2, -5.2, 0); const lines = []; const t0 = Date.now();
  while (Date.now() - t0 < 60000) { await p.waitForTimeout(2000); const h = await p.evaluate(() => window.__heard || []); lines.length = 0; lines.push(...h); if (new Set(lines).size >= 3) break; }
  await shot('camp-people-line.png'); step('camp people lines (no repeats)', { heard: lines.length, distinct: new Set(lines).size, lines: lines.slice(0, 6) });

  // ---- hyper-awareness: stand still in daylight (27). The first moment waits 40 s, then 25 s of stillness.
  await put(10, 6, 12, 0, 0); await clock(0.3); const a0 = await p.evaluate(() => (window.__imm || []).filter(x => /aware/.test(x[0])).length), s0 = Date.now(); let got = null;
  while (Date.now() - s0 < 75000 && !got) { await p.waitForTimeout(1500); got = await p.evaluate(a0 => (window.__imm || []).filter(x => /aware/.test(x[0])).slice(a0)[0] || null, a0); }
  if (got) await shot('awareness.png'); step('awareness moment', { after_s: +((Date.now() - s0) / 1000).toFixed(1), got });

  // ---- the morning after (65): leave marks, run the clock over dawn
  await p.evaluate(() => { const g = __lf.g; g.marks.push({ k: 'fall', x: 12, z: 3, n: g.night, who: 'R0' }, { k: 'wreck', x: 20, z: 12, n: g.night }); g.history.push({ night: g.night, falls: 1, tense: 0.5, players: { R0: 1 } }); g.clock = 0.9996; __lf.g.holdDay = false; });
  await p.waitForTimeout(3500); await shot('morning-after-1.png'); await p.waitForTimeout(6500); await shot('morning-after-2.png'); const morn = await p.evaluate(() => (window.__imm || []).filter(x => x[0] === 'morning')); step('morning after (lines said)', { n: morn.length, lines: morn.map(m => m[1]) });
  await p.evaluate(() => { __lf.g.holdDay = true; });

  // ---- Earth: the smiling sign, rain, the strange sky and far land (26, 40, 67)
  await clock(0.3); await put(-7, 5947, -7, 5943, 0.1); await p.waitForTimeout(3500); await shot('earth-sign-day.png');
  await clock(0.75); await p.waitForTimeout(1500); await shot('earth-sign-night.png'); const mir = await p.evaluate(() => (window.__imm || []).filter(x => x[0] === 'mirror')); step('mirror realm sign (wrist said)', { lines: mir.map(m => m[1]) });
  await clock(0.3); await put(0, 6020, 0.62 * 100, 6020 + 0.78 * 100, 0.42); await p.waitForTimeout(3000); await shot('earth-sky-near.png');
  await put(0, 6480, 0.62 * 100, 6480 + 0.78 * 100, 0.42); await p.waitForTimeout(3500); await shot('earth-sky-far.png');
  await put(0, 6480, 100, 6480 - 100, 0.0); await p.waitForTimeout(2500); await shot('earth-far-land.png'); await clock(0.8); await put(0, 6230, 0, 6130, 0.0); await p.waitForTimeout(2500); await shot('earth-night-edge.png'); await clock(0.3);
  const sk = await p.evaluate(() => { let disc = 0, spires = 0; __lf.scene.traverse(o => { if (o.isInstancedMesh && o.geometry.type === 'ConeGeometry') spires = o.count; }); return { spires, fog: +__lf.scene.fog.density.toFixed(4) }; }); step('far land spires drawn at 480 m out', sk);
  step('errors', { errs });
  fs.writeFileSync(path.join(OUT, 'immersion_run.json'), JSON.stringify({ ...log, errs }, null, 1)); await b.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
