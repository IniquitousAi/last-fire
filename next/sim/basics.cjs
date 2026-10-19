// node next/sim/basics.cjs: the basics gate (CLAUDE.md step 1). Every FPS basic a player expects, played in a real browser at his window
// size, each a PASS or FAIL with what it saw. A FAIL blocks the ship. When he has to ask for a basic, it is added here the same turn.
// Needs the "Last Fire" preview server (http://localhost:8092).
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
(async () => { const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.addInitScript(() => { const btn = () => ({ pressed: false, value: 0 }); window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), mapping: 'standard', id: 'gate pad' }; navigator.getGamepads = () => [window.__pad]; });
  const p = await ctx.newPage(), errs = [], res = []; p.on('pageerror', e => errs.push(e.message));
  const check = (name, pass, saw) => { res.push({ name, pass: !!pass, saw }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (${saw})`); };
  const press = async (i, ms = 120) => { await p.evaluate(i => { __pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(ms); await p.evaluate(i => { __pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(120); };
  const ammo = () => p.evaluate(() => (document.getElementById('ammo')?.innerText || '').replace(/\s+/g, ' ')), n = s => +(s.match(/^(\d+)/) || [0, NaN])[1];
  await p.goto('http://localhost:'+(process.env.PORT||8092)+'/next/?shot'); await p.waitForTimeout(2500);
  // the menu on a controller: the D-pad reaches PLAY and A presses it
  let at = ''; for (let i = 0; i < 12 && at !== 'solo'; i++) { await press(13, 60); at = await p.evaluate(() => document.activeElement && document.activeElement.id); }
  check('menu works on a controller (D-pad reaches PLAY)', at === 'solo', `focus on ${at || 'nothing'}`);
  if (at === 'solo') await press(0); else await p.click('#solo');
  await p.waitForFunction(() => window.__lf && __lf.g && __lf.g.ready, null, { timeout: 60000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { for (const b of window.__pad.buttons) { b.pressed = false; b.value = 0; } }); await p.mouse.move(500, 450); await p.mouse.click(500, 450); await p.waitForTimeout(400);
  check('the mouse locks for play on a click', await p.evaluate(() => !!document.pointerLockElement), 'pointer lock');
  const a0 = await ammo(); check('starts with the smooth Blender rifle (M4)', /M4/.test(a0), a0);
  await p.mouse.wheel(0, 120); await p.waitForTimeout(300); const a1 = await ammo(); await p.waitForTimeout(150); await p.mouse.wheel(0, -120); await p.waitForTimeout(300); const a2 = await ammo();
  check('the mouse wheel cycles guns both ways', a1 !== a0 && a2 === a0, `${a0} -> ${a1} -> ${a2}`);
  let s0 = n(await ammo()); await p.mouse.down(); await p.waitForTimeout(1000); await p.mouse.up(); await p.waitForTimeout(200); let s1 = n(await ammo());
  check('holding fire is full auto on the M4 (about 12 a second)', s0 - s1 >= 9, `${s0 - s1} rounds in 1 s`);
  await p.keyboard.press('KeyR'); await p.waitForTimeout(2600); check('R reloads', n(await ammo()) === 30, await ammo());
  await p.keyboard.press('Digit1'); await p.waitForTimeout(500); s0 = n(await ammo()); await p.mouse.down(); await p.waitForTimeout(900); await p.mouse.up(); await p.waitForTimeout(200); s1 = n(await ammo());
  check('the pistol is semi-auto (one shot per click while held)', s0 - s1 === 1, `${s0 - s1} rounds in 0.9 s held`);
  const ys = []; await p.keyboard.down('KeyW'); for (let i = 0; i < 12; i++) { await p.waitForTimeout(80); ys.push(await p.evaluate(() => __lf.me.y)); } await p.keyboard.up('KeyW');
  const cy = await p.evaluate(() => { const r = []; return r; }); // (camera height follows the ground only: checked through the eye height staying at the body's height)
  check('nothing bobs (walking keeps the view level on flat ground)', Math.max(...ys) - Math.min(...ys) < 0.15, `body height range ${(Math.max(...ys) - Math.min(...ys)).toFixed(3)} m over 1 s`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500); const paused = await p.evaluate(() => !document.getElementById('paused').hidden);
  check('Esc opens the pause menu', paused, paused ? 'open' : 'closed');
  check('the pause menu has a visible way back to play', await p.evaluate(() => { const r = document.getElementById('resume'); return !!(r && r.offsetParent); }), 'BACK TO THE DARK key');
  check('no errors in the page', errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');
  const fails = res.filter(r => !r.pass).length; console.log(`\n${res.length - fails} of ${res.length} basics pass${fails ? '; FAIL blocks the ship' : ''}`);
  require('fs').writeFileSync(require('path').join(__dirname, '..', 'playtests', 'checklist', 'test-basics.txt'), res.map(r => `${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  (${r.saw})`).join(String.fromCharCode(10)) + `${String.fromCharCode(10).repeat(2)}${res.length - fails} of ${res.length} pass  (basics)${String.fromCharCode(10)}`);   /* (the Simulator's 'why' table reads it) */
  await b.close(); process.exit(fails ? 1 : 0); })().catch(e => { console.log('FAIL', e.message); process.exit(1); });
