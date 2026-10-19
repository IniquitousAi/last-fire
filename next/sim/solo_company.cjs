// node next/sim/solo_company.cjs: solo is the main case (AUDIT-2026-10-19: "never remind me I'm alone; just as good solo as with friends").
// A real browser run on a fake controller: start solo with the D-pad and A, then live through dusk into the night and check that the learned
// friend is there, keeps the camp near you, speaks from what really happens, and that nothing on screen ever says you are alone.
// Needs the "Last Fire" preview server on 8092. Writes playtests/solo_company.txt and a screenshot.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs'), path = require('path'), OUT = path.join(__dirname, '..', 'playtests');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.addInitScript(() => { const btn = () => ({ pressed: false, value: 0 }); window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), mapping: 'standard', id: 'robot pad' }; navigator.getGamepads = () => [window.__pad]; localStorage.clear(); localStorage.setItem('lastfire2', JSON.stringify({ guided: 1 })); });   // (a returning player: past the tutorial, whose held day would keep the dusk away)
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  const press = async i => { await p.evaluate(i => { __pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(90); await p.evaluate(i => { __pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(120); };
  await p.goto('http://localhost:8092/next/?shot'); await p.waitForTimeout(2500);
  for (let i = 0; i < 12 && !(await p.evaluate(() => document.activeElement && document.activeElement.id === 'solo')); i++) await press(13);
  const byPad = await p.evaluate(() => document.activeElement && document.activeElement.id === 'solo'); if (byPad) await press(0); else await p.click('#solo');
  await p.waitForFunction(() => window.__lf && __lf.g && __lf.g.ready, null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const R = [], ok = (name, pass, what) => { R.push(`${pass ? 'PASS' : 'FAIL'}  ${name}  (${what})`); };
  const bot = await p.evaluate(() => { const b = __lf.g.players.find(q => q.bot); return b ? b.name : null; });
  ok('a learned friend is at your fire from the first minute', !!bot, bot || 'none');
  await p.evaluate(() => { const g = __lf.g; g.clock = 0.53; g.holdDay = false; });   // (just before dusk: the friend speaks when the dusk comes)
  const BAD = /\b(alone|by yourself|no one here|nobody here|on your own|lonely)\b/i, seen = new Set(); let near = 0, n = 0, heard = 0, bad = '';
  for (let s = 0; s < 45; s++) { await p.waitForTimeout(1000);
    const r = await p.evaluate(() => { const g = __lf.g, b = g.players.find(q => q.bot), me = __lf.me, vis = [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && e.offsetParent !== null && getComputedStyle(e).opacity !== '0').map(e => e.innerText || '').join(' | ');
      return { d: b ? Math.hypot(b.x - me.x, b.z - me.z) : 999, df: b ? Math.hypot(b.x - g.fire.x, b.z - g.fire.z) : 999, text: vis, phase: g.clock }; });
    n++; if (r.d < 35) near++; const m = r.text.match(/heard\s+·\s+[^|]+/gi); if (m) for (const x of m) seen.add(x); if (!bad && BAD.test(r.text)) bad = r.text.match(BAD)[0]; }
  heard = await p.evaluate(() => __lf.heard);
  ok('the friend keeps the camp near you', near / n >= 0.9, `${near} of ${n} seconds within 35 m`);
  ok('the friend speaks from what happens (dusk, banking, kills)', heard >= 1, heard + ' lines on the wrist in 45 s');
  ok('nothing on screen says you are alone', !bad, bad ? 'said "' + bad + '"' : '45 s of screen text read');
  ok('started on the controller', byPad, byPad ? 'D-pad and A reached PLAY' : 'needed a click');
  await p.evaluate(() => { const g = __lf.g, b = g.players.find(q => q.bot), me = __lf.me; if (b) { const a = Math.atan2(b.z - g.fire.z, b.x - g.fire.x); me.x = b.x - Math.cos(a) * 5; me.z = b.z - Math.sin(a) * 5; me.y = g.land(me.x, me.z); me.yaw = Math.atan2(-(b.x - me.x), -(b.z - me.z)); me.pitch = -0.05; }   /* (stand 5 m from the friend, toward the fire, and look at them) */ });
  await p.waitForTimeout(800); await p.screenshot({ path: path.join(OUT, 'checklist', 'solo-company.png') });
  ok('no errors in the page', !errs.length, errs[0] || 'none');
  const out = R.join('\n') + `\n\n${R.filter(x => x.startsWith('PASS')).length} of ${R.length} pass  (solo_company, ${new Date().toISOString().slice(0, 16)})\n`;
  fs.writeFileSync(path.join(OUT, 'checklist', 'test-solo_company.txt'), out); console.log(out); await b.close(); process.exit(R.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
