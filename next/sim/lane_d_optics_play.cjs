// Checklist 23, played in a real browser. Needs a static server at PORT (default 8092).
// A fake controller picks a MIRROR with Select (cycles mirror, lens, prism) and places it with RT; the keyboard picks a LENS with B and the mouse places it.
// The torch is on in the dark; the test checks the pieces exist, the bent beam lights ground off the torch's own line, the light was paid, and takes a screenshot.
const { chromium } = require('C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const PORT = process.env.PORT || 8092, OUT = process.env.OUT || 'next/playtests/lanes/D/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 908 } });
  await ctx.addInitScript(() => { const btn = () => ({ pressed: false, value: 0 }); window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), mapping: 'standard', id: 'gate pad' }; navigator.getGamepads = () => [window.__pad]; });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  const press = async i => { await p.evaluate(i => { __pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(150); await p.evaluate(i => { __pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(200); };
  let fails = 0; const say = (ok, name, detail) => { if (!ok) fails++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  (' + detail + ')'); };
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(2500); await p.click('#solo');
  await p.waitForFunction(() => window.__lf && __lf.me && __lf.g && __lf.g.ready, null, { timeout: 280000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { for (const b of window.__pad.buttons) { b.pressed = false; b.value = 0; } }); await p.mouse.move(960, 450); await p.mouse.click(960, 450); await p.waitForTimeout(400);
  // out in the dark, facing -z, with light to spend and the torch on
  await p.evaluate(() => { const m = __lf.me, g = __lf.g; m.x = g.fire.x + 70; m.z = g.fire.z; m.y = g.land(m.x, m.z); m.yaw = 0; m.pitch = -0.28; m.carried = 100; g.clock = 0.97; });
  await p.keyboard.press('KeyV'); await p.waitForTimeout(400);
  const st = () => p.evaluate(() => ({ n: (__lf.g.optics || []).length, kinds: (__lf.g.optics || []).map(o => o.kind), carried: __lf.me.carried, torch: __lf.me.torch, pick: (document.querySelector('#build .bk.on') || {}).textContent || '' }));
  await press(8); const s1 = await st(); say(/MIRROR/.test(s1.pick), 'Select on the pad picks the mirror', s1.pick.slice(0, 40));
  await press(7); const s2 = await st(); say(s2.n === 1 && s2.kinds[0] === 'mirror' && s2.carried === 92, 'RT places it and pays 8 light', `${s2.n} piece, carried ${s2.carried}`);
  // the mirror stands about where the aim hit the ground; step back so the torch line passes through it, then read the bent beam
  const mir = await p.evaluate(() => { const o = __lf.g.optics[0], m = __lf.me; m.x = o.x + 0; m.z = o.z + 8; m.yaw = 0; m.pitch = -0.05; return { x: o.x, z: o.z, yaw: o.yaw }; });
  await p.waitForTimeout(600);
  const bent = await p.evaluate(async () => { const C = await import('/next/core/game.js?v=167'); const g = __lf.g, m = __lf.me; g.optics[0].yaw = 3 * Math.PI / 4; m.torch = true; const bs = C.opticBeams(g, C.TORCH); const b0 = bs[0]; if (!b0) return { n: 0 };
    const px = b0.x + b0.dx * 6, pz = b0.z + b0.dz * 6, off = C.lightAt(g, px, pz); g.optics.length = 1; const on = C.lightAt(g, px, pz); const save = g.optics.splice(0); const base = C.lightAt(g, px, pz); g.optics.push(...save); return { n: bs.length, on, base, off }; });
  say(bent.n >= 1 && bent.on > 0.05 && bent.base === 0, 'the torch beam bends off the mirror and lights ground it never reached', `beams ${bent.n}, lit ${bent.on && bent.on.toFixed(2)} with the mirror, ${bent.base} without`);
  await p.evaluate(() => { __lf.me.yaw = 0.25; __lf.me.pitch = -0.12; }); await p.waitForTimeout(1800); await p.screenshot({ path: OUT + 'optics-mirror.png' });
  // keyboard and mouse: B picks the next piece (lens), a click places it
  await p.evaluate(() => { const m = __lf.me; m.x = __lf.g.fire.x + 70; m.z = __lf.g.fire.z + 30; m.y = __lf.g.land(m.x, m.z); m.yaw = 0; m.pitch = -0.28; }); await p.waitForTimeout(300);
  await p.keyboard.press('KeyB'); await p.waitForTimeout(200); const s3 = await st(); say(/LENS/.test(s3.pick), 'B on the keyboard picks the next piece (lens)', s3.pick.slice(0, 40));
  await p.waitForTimeout(500); if (!(await p.evaluate(() => !!document.pointerLockElement))) { await p.mouse.click(960, 450); await p.waitForTimeout(400); }   /* (the screenshot dropped the lock; a click takes it back, as for a player) */ await p.mouse.move(960, 450); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(400); const s4 = await st(); say(s4.n === 2 && s4.kinds[1] === 'lens' && s4.carried === 80, 'a click places the lens and pays 12 light', `${s4.n} pieces, carried ${s4.carried}`);
  await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(300); const s5 = await st(); say(s5.n === 2 && s5.carried === 80, 'clicking on a piece turns it instead of buying another (free)', `${s5.n} pieces, carried ${s5.carried}`);
  say(!errs.length, 'no errors in the page', errs.join(' | ') || 'none');
  console.log(fails ? fails + ' FAILED' : 'all optics play checks pass'); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
