// node next/sim/codex_run.cjs [port]: a browser run on the FAKE CONTROLLER ONLY (no mouse, no keys): menu, play, Start opens the pause menu, the D-pad finds
// CODEX, A opens it, the right stick scrolls it through every list, B goes back; then a hangout (two learned friends joined through DEV by the pad)
// against a solo night in the dark; then the boot-print path walked with the left stick. Shots and the log go to next/playtests/lanes/C/.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs'), path = require('path'); const PORT = +(process.argv[2] || 8103), OUT = path.join(__dirname, '..', 'playtests', 'lanes', 'C'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.addInitScript(() => { const btn = () => ({ pressed: false, value: 0 }); window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), mapping: 'standard', id: 'codex pad' }; navigator.getGamepads = () => [window.__pad]; });
  const p = await ctx.newPage(), errs = [], log = { at: new Date().toISOString(), steps: [] }; p.on('pageerror', e => errs.push(e.message));
  const step = (name, data) => { log.steps.push({ name, ...data }); console.log(name.padEnd(36), JSON.stringify(data).slice(0, 220)); };
  const press = async (i, ms = 140) => { await p.evaluate(i => { __pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(ms); await p.evaluate(i => { __pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(160); };
  const axes = (a) => p.evaluate(a => { __pad.axes = a; }, a), shot = async f => { await p.waitForTimeout(600); await p.screenshot({ path: path.join(OUT, f) }); };
  const focusText = () => p.evaluate(() => (document.activeElement && document.activeElement.textContent || '').trim().slice(0, 40));
  const padTo = async (word) => { for (let i = 0; i < 40; i++) { if ((await focusText()).startsWith(word)) return true; await press(13, 80); } return false; };
  await p.goto(`http://localhost:${PORT}/next/?shot&noenemies`); await p.waitForTimeout(2500);
  { let at = ''; for (let i = 0; i < 14 && at !== 'solo'; i++) { await press(13, 80); at = await p.evaluate(() => document.activeElement && document.activeElement.id); } step('menu: PLAY ALONE by the D-pad', { ok: at === 'solo' }); } await press(0);
  await p.waitForFunction(() => window.__lf && __lf.g && __lf.g.ready, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { __lf.g.holdDay = true; __lf.g.clock = 0.3; const b = [...document.querySelectorAll('#hud button')].find(x => /SKIP THE GUIDE/.test(x.textContent)); if (b) b.click(); });
  // ---- the codex on the pad
  await press(9); const paused = await p.evaluate(() => !document.getElementById('paused').hidden); step('Start opens the pause menu', { paused });
  const found = await padTo('CODEX'); step('D-pad finds CODEX', { found }); await press(0); await p.waitForTimeout(500);
  const info = await p.evaluate(() => ({ open: !document.getElementById('codex').hidden, rows: document.querySelectorAll('#codexBody .r').length, sections: [...document.querySelectorAll('#codexBody h3')].map(h => h.textContent) })); step('A opens the CODEX', info);
  await shot('codex-1-rules.png');
  const where = {}; for (const [i, h] of info.sections.entries()) { await p.evaluate(i => { const el = document.querySelectorAll('#codexBody h3')[i], pn = document.getElementById('codexPanel'); pn.scrollTop = el.offsetTop - 70; }, i); await p.waitForTimeout(250); }   // (jump check only; the shots below use the stick)
  await p.evaluate(() => { document.getElementById('codexPanel').scrollTop = 0; }); const tops = [];
  for (let k = 0; k < 140; k++) { await axes([0, 0, 0, 0.9]); await p.waitForTimeout(110); const st = await p.evaluate(() => { const pn = document.getElementById('codexPanel'), hs = [...document.querySelectorAll('#codexBody h3')]; const cur = hs.filter(h => h.offsetTop - pn.scrollTop < 200 && h.offsetTop - pn.scrollTop > -10)[0]; return { y: pn.scrollTop, h: cur ? cur.textContent : '' }; });
    if (st.h && !tops.includes(st.h)) { tops.push(st.h); await axes([0, 0, 0, 0]); const f = 'codex-' + (tops.length + 1) + '.png'; await shot(f); where[st.h] = f; } }
  await axes([0, 0, 0, 0.9]); await p.waitForTimeout(3500); await axes([0, 0, 0, 0]); await shot('codex-labels.png'); where['HOW SURE (end of the list)'] = 'codex-labels.png';
  await axes([0, 0, 0, 0]); step('the right stick scrolled through every list', { sections: tops, shots: where });
  await press(1); await p.waitForTimeout(400); step('B goes back to the pause menu', { back: await p.evaluate(() => document.getElementById('codex').hidden && !document.getElementById('paused').hidden) });
  await press(9); await p.waitForTimeout(400);
  // ---- a hangout (two learned friends by the pad) against a solo night
  await p.evaluate(() => { __lf.g.clock = 0.4; __lf.me.x = 3; __lf.me.z = 4; __lf.me.y = __lf.g.land(3, 4); __lf.me.yaw = Math.PI; __lf.me.pitch = -0.05; });   // (looking along the camp, fire beside)
  await press(9); await padTo('DEV'); await press(0); await p.waitForTimeout(300); const devOk = await padTo('A LEARNED FRIEND'); await press(0); await p.waitForTimeout(600);
  await press(9); await padTo('DEV'); await press(0); await p.waitForTimeout(300); await padTo('A LEARNED FRIEND'); await press(0); await p.waitForTimeout(1500);
  const crew = await p.evaluate(() => __lf.g.players.map(q => (q.bot ? 'friend ' : 'you ') + Math.round(Math.hypot(q.x - __lf.g.fire.x, q.z - __lf.g.fire.z)) + ' m')); step('friends joined by the pad (DEV)', { devOk, crew });
  await p.evaluate(() => { const g = __lf.g, me = __lf.me; g.clock = 0.45; g.fire.fuel = 400; const ps = g.players.filter(q => q.bot); ps.forEach((q, i) => { q.x = me.x - 3 + i * 3.2; q.z = me.z - 6; q.y = g.land(q.x, q.z); q.yaw = 0; }); me.yaw = Math.atan2(-(ps[0].x - me.x), -(ps[0].z - me.z)); me.pitch = -0.02; });
  await p.waitForTimeout(1800); await shot('hangout-friends.png'); const glowWith = await p.evaluate(() => +__lf.g.players.length);
  step('hangout: friends beside the fire', { players: glowWith });
  await p.evaluate(() => { const g = __lf.g; g.players = g.players.filter(q => !q.bot); const me = __lf.me; g.clock = 0.75; g.holdDay = true; me.x = g.fire.x + 26; me.z = g.fire.z + 4; me.y = g.land(me.x, me.z); me.yaw = Math.atan2(-(g.fire.x - me.x - 40), -(g.fire.z - me.z)); me.pitch = 0; });
  await p.waitForTimeout(2500); await shot('solo-dark.png'); step('solo: alone at the dark edge at night', { players: await p.evaluate(() => __lf.g.players.length), light: await p.evaluate(() => +(__lf.g.nodes.length)) });
  // ---- the boot-print path walked with the left stick (60 on the pad)
  await p.evaluate(() => { const g = __lf.g, me = __lf.me; g.clock = 0.3; me.x = 0; me.z = 4; me.y = g.land(0, 4); me.yaw = Math.PI; me.pitch = -0.3; });   // (yaw PI looks along +z: toward the gate)
  const z0 = await p.evaluate(() => __lf.me.z); await axes([0, -1, 0, 0]); await p.waitForTimeout(3500); await axes([0, 0, 0, 0]); await p.waitForTimeout(500); const z1 = await p.evaluate(() => __lf.me.z);
  await shot('details-pad-walk.png'); step('walking the boot-print path with the left stick', { from_z: +z0.toFixed(1), to_z: +z1.toFixed(1), moved: +(z1 - z0).toFixed(1) });
  step('errors', { errs }); log.errs = errs; fs.writeFileSync(path.join(OUT, 'codex_run.json'), JSON.stringify(log, null, 1)); await b.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
