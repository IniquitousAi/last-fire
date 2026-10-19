// node next/sim/lightrule_seen.cjs: checklist item 7 in a real browser (?enemies). On Earth at night, a creature out of every light is smoke
// that shots pass through; a flare lands by it and it commits to a shape. Photographs both from the player's spot.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core'), fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'playtests', 'checklist');
(async () => { const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 908 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); const R = [], ok = (n, v, w) => R.push(`${v ? 'PASS' : 'FAIL'}  ${n}  (${w})`);
  await p.goto('http://localhost:8092/next/?shot&enemies'); await p.waitForTimeout(2500); await p.click('#solo'); await p.waitForFunction(() => window.__lf && __lf.g && __lf.g.ready, null, { timeout: 90000 });
  const k0 = await p.evaluate(() => { const g = __lf.g, m = __lf.me; g.earth = { t: 1e6, n: 1, site: 'city', found: { parts: 0, cells: 0 } }; g.clock = 0.8; g.holdDay = true; m.x = -6; m.z = 6008; m.y = g.land(-6, 6008); m.yaw = Math.atan2(-(4 - -6), -(6015 - 6008)); m.pitch = 0.02; m.hp = 100;
    g.hollow.length = 0; const x = 4, z = 6015; g.hollow.push({ id: 9999, kind: 'walker', earth: true, x, z, y: g.land(x, z), yaw: Math.PI, hp: 1e6, max: 1e6, sh: 0, sb: 0, cd: 99, dead: false, speed: 0 }); return true; });
  const hold = () => p.evaluate(() => { const k = __lf.g.hollow.find(k => k.id === 9999); if (k) { k.x = 4; k.z = 6015; k.speed = 0; k.cd = 99; } });
  for (let i = 0; i < 20; i++) { await hold(); await p.waitForTimeout(100); }
  const dark = await p.evaluate(() => { const g = __lf.g, k = g.hollow.find(k => k.id === 9999); return { solid: !!(k && window.__lf && (g.solidAt ?? 0.02) < 1 && k && (function () { return null; })()), light: 0 }; });
  const s0 = await p.evaluate(async () => { const C = await import('/next/core/game.js?v=' + (document.querySelector('script[src*=\"main.js\"]').src.match(/v=(\d+)/) || [0, 0])[1]); const g = __lf.g, k = g.hollow.find(k => k.id === 9999); return { solid: C.solid(g, k), light: +C.lightAt(g, k.x, k.z).toFixed(3), ng: +C.lightAt(g, k.x, k.z, true).toFixed(3), who: g.players.map(q => [q.name, +q.x.toFixed(1), +q.z.toFixed(1), !!q.torch]), fl: (g.flares || []).length, nodes: g.nodes.filter(n => n.z > 3000).length }; });
  console.log(JSON.stringify(s0));
  await p.screenshot({ path: path.join(OUT, 'lightrule-dark.png') });
  await p.evaluate(() => { const g = __lf.g; (g.flares = g.flares || []).push({ x: 3, z: 6013.5, t: 12, earth: true }); });
  for (let i = 0; i < 15; i++) { await hold(); await p.waitForTimeout(100); }
  const s1 = await p.evaluate(async () => { const C = await import('/next/core/game.js?v=' + (document.querySelector('script[src*=\"main.js\"]').src.match(/v=(\d+)/) || [0, 0])[1]); const g = __lf.g, k = g.hollow.find(k => k.id === 9999); return { solid: C.solid(g, k), light: +C.lightAt(g, k.x, k.z).toFixed(3) }; });
  await p.screenshot({ path: path.join(OUT, 'lightrule-lit.png') });
  ok('out of every light the creature is smoke (shots pass through)', !s0.solid, `light ${s0.light}`); ok('a flare by it and it commits to a shape you can kill', s1.solid, `light ${s1.light}`); ok('no errors in the page', !errs.length, errs[0] || 'none');
  const out = R.join('\n') + `\n\n${R.filter(x => x.startsWith('PASS')).length} of ${R.length} pass  (light rule, seen)\n`; fs.writeFileSync(path.join(OUT, 'test-lightrule_seen.txt'), out); console.log(out); await b.close(); })().catch(e => { console.log('FAIL', e.message); process.exit(1); });
