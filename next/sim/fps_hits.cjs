// node next/sim/fps_hits.cjs [port=8092]: what the hit effects cost. 32 of the dark alive around the fire, full auto fire into them for the whole run, and the
// effects (ichor pool, body jerk, flash) switched off and on in turn inside the SAME page, 10 times each, so the machine's mood cancels out.
// PASS when the median frame rate with them on is at least 90% of with them off. Writes playtests/checklist/test-fps_hits.txt.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core'), fs = require('fs'), path = require('path');
const PORT = process.argv[2] || 8092;
(async () => { const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 908 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(2500); await p.click('#solo');
  await p.waitForFunction(() => window.__lf && __lf.me && __lf.g && __lf.g.ready, null, { timeout: 90000 }); await p.waitForTimeout(3000); await p.mouse.click(960, 450); await p.waitForTimeout(300);
  const n = await p.evaluate(async () => { const C = await import(location.pathname.replace(/\/$/, '') + '/core/game.js?v=' + (document.querySelector('script[type=module]')?.src.match(/v=(\d+)/) || [0, 172])[1]), g = __lf.g, m = __lf.me;
    g.clock = C.NIGHT_AT + 0.05; g.fire.level = 3; g.fire.fuel = 9000; g.hollow = []; m.x = 0; m.z = 12; m.y = g.land(0, 12); m.hp = 1e9;
    const kinds = ['walker', 'runner', 'watcher', 'giant', 'face']; for (let i = 0; i < 32; i++) { const a = i / 32 * 6.283, r = 4 + (i % 4) * 2.5, K = C.KINDS[kinds[i % 5]]; g.hollow.push({ id: g.nextId++, kind: kinds[i % 5], x: Math.cos(a) * r, z: Math.sin(a) * r, y: g.land(Math.cos(a) * r, Math.sin(a) * r), yaw: 0, hp: K.hp * 50, max: K.hp * 50, sh: 0, sb: 0, cd: 99, dead: false, speed: 0.01, staged: true }); }
    window.__hit0 = __lf.creatures.hit.bind(__lf.creatures); window.__ich0 = __lf.impact.ichor.bind(__lf.impact);
    window.__nearest = () => { let best = null, bd = 1e9; for (const k of g.hollow) { const d = Math.hypot(k.x - m.x, k.z - m.z); if (d < bd) { bd = d; best = k; } } return best; };
    setInterval(() => { __lf.refill(); const k = __nearest(); if (!k) return; const hy = C.KINDS[k.kind].hits.find(h => h[3] === 1)[0]; m.yaw = Math.atan2(-(k.x - m.x), -(k.z - m.z)); m.pitch = Math.atan2(k.y + hy - (m.y + 1.6), Math.hypot(k.x - m.x, k.z - m.z)); __lf.fire(); }, 30);
    return g.hollow.length; });
  await p.waitForTimeout(5000);
  const meas = ms => p.evaluate(ms => new Promise(res => { let k = 0, t0 = performance.now(); const f = () => { k++; if (performance.now() - t0 > ms) res(k / ((performance.now() - t0) / 1000)); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), ms);
  const set = on => p.evaluate(on => { __lf.impact.enabled = on; __lf.creatures.hit = on ? __hit0 : () => {}; }, on);
  const ON = [], OFF = []; for (let r = 0; r < 10; r++) { await set(false); OFF.push(await meas(1200)); await set(true); ON.push(await meas(1200)); }
  const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)], on = med(ON), off = med(OFF), shots = await p.evaluate(() => __lf.impact.spawned);
  console.log('off', OFF.map(x => x.toFixed(0)).join(','), '\non ', ON.map(x => x.toFixed(0)).join(','));
  const txt = `${on >= off * 0.9 ? 'PASS' : 'FAIL'}  the hit effects cost at most 10% of the frame rate with ${n} alive and full auto fire  (${on.toFixed(0)} fps on, ${off.toFixed(0)} fps off, medians of 10 alternating 1.2 s runs, ${shots} particles spawned)\n`;
  console.log(txt, errs.slice(0, 2).join(' | ')); fs.mkdirSync(path.join(__dirname, '..', 'playtests', 'checklist'), { recursive: true }); fs.writeFileSync(path.join(__dirname, '..', 'playtests', 'checklist', 'test-fps_hits.txt'), txt); await b.close(); })();
