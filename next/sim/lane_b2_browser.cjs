// node next/sim/lane_b2_browser.cjs [stage]   Lane B2 browser run (PORT env, default 8112; serve the repo root with python -m http.server).
//  perfect : item 16 PLAYED. The real client at ?perfectcrew=SEED plays 12 nights with the perfect crew (the robot of sim/lane_b.mjs in both seats),
//            through the real frame loop, core and camera. Writes playtests/lanes/B2/16-perfect-run.txt and a dawn-of-night-12 picture.
//  habits  : item 20 SEEN. A recorded player (a robot hand plays 6 nights in the real client), then DEV, FRIEND VS YOU: the habits next to each other and the match.
//  daemon  : item 22 SEEN. DEV, THE DAEMON: the daemon's result on the real recorded world (next/daemon/learned.json), its refusal and gain against noise.
//  export  : DEV, EXPORT NIGHTS saves the recorded nights as a file (checked: the download loads as a world with the same nights).
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 8112, BASE = `http://localhost:${PORT}/next/`, OUT = path.join(__dirname, '..', 'playtests', 'lanes', 'B2');
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2], SEED = +(process.env.SEED || 1);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { const btn = () => ({ pressed: false, value: 0 }); window.__pad = { connected: false, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), mapping: 'standard', id: 'none' }; });
  await ctx.route('**/peerjs*', r => r.abort());
  const errs = []; let fail = 0; const check = (name, ok, saw) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${saw})`); if (!ok) fail++; };
  const open = async url => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(url); await p.waitForTimeout(2000); return p; };
  const start = async p => { await p.fill('#name', 'Daniel'); await p.click('#solo'); await p.waitForFunction(() => window.lastfire2 && lastfire2.g && lastfire2.g.ready && lastfire2.me, null, { timeout: 120000 }); await p.waitForTimeout(1500); };
  const shot = async (p, name) => { await p.screenshot({ path: path.join(OUT, name + '.png') }); console.log('  shot', name + '.png'); };

  // ---------------------------------------------------------------- item 16: the perfect crew, 12 nights, in the real client
  if (!only || only === 'perfect') {
    console.log('\n== perfect crew, 12 nights, real client');
    const all = [`Last Fire, ?perfectcrew=SEED: the real browser client (headless Chromium 1000x900, GPU renderer on) plays 12 nights with the perfect crew.`,
      `Both seats are the robot of sim/lane_b.mjs (client/friend.js perfectThink): the player's seat is driven by it, since nobody is at the keys; the rest is the client's own frame loop, camera, HUD and core.`, `10 world steps of 0.1 s per frame. run ${new Date().toISOString()}`, ''];
    for (const seed of (process.env.SEEDS || '1,2,3').split(',').map(Number)) {
      const p = await open(`${BASE}?perfectcrew=${seed}&x=10`); await start(p); const lines = [`--- seed ${seed}`];
      const read = () => p.evaluate(() => { const g = lastfire2.g, me = lastfire2.me; return { night: g.night, done: g.history.length, falls: g.stats.falls, lost: g.stats.lostNights || 0, level: g.fire.level, kills: g.stats.kills, banked: Math.round(g.stats.banked || 0), t: Math.round(g.t), clock: +g.clock.toFixed(3), hp: Math.round(me.hp), seed: g.seed, mates: g.players.filter(q => !q.ember).length }; });
      let seen = 0, shotDone = false, s = await read(); const t0 = Date.now();
      while (Date.now() - t0 < 25 * 60 * 1000) {
        await p.waitForTimeout(400); s = await read();
        while (seen < s.done) { seen++; const h = await p.evaluate(i => lastfire2.g.history[i], seen - 1); const L = `night ${String(seen).padStart(2)} done  falls so far ${s.falls}  fire level ${s.level}  kills ${s.kills}  tense ${h && h.tense !== undefined ? (+h.tense).toFixed(2) : '?'}  night falls ${h ? h.falls : '?'}  (${((Date.now() - t0) / 1000).toFixed(0)} s real)`; console.log('  ' + L); lines.push(L); }
        if (s.done >= 11 && s.night === 12 && s.clock > 0.9 && !shotDone) await p.evaluate(() => { window.__perf.x = 1; });
        if (s.done >= 12 && !shotDone) { await p.evaluate(() => { window.__perf.x = 0; }); shotDone = true; await p.waitForTimeout(500); const d = await read(); lines.push(`DAWN OF NIGHT 12: night counter ${d.night}, clock ${d.clock}, fire level ${d.level}, both players up (${d.mates} of 2), falls ${d.falls}, lost nights ${d.lost}, kills ${d.kills}`); await shot(p, `16-dawn-night-12-seed${seed}`); break; }
      }
      const d = await read(); lines.push(`ended: nights recorded ${d.done}, falls ${d.falls}, lost nights ${d.lost}, ${((Date.now() - t0) / 1000).toFixed(0)} s real`, ''); all.push(...lines);
      check(`seed ${seed}: the perfect crew held 12 of 12 nights in the real client with zero falls`, d.done >= 12 && d.falls === 0 && d.lost === 0, `${d.done} nights, ${d.falls} falls, ${d.lost} lost, fire level ${d.level}`);
      await p.close();
    }
    fs.writeFileSync(path.join(OUT, '16-perfect-run.txt'), all.join('\n') + '\n');
  }
  // ---------------------------------------------------------------- items 20 and 22 (SEEN) and EXPORT NIGHTS, from the DEV menu with real clicks
  if (!only || only === 'dev') {
    console.log('\n== DEV: FRIEND VS YOU, THE DAEMON, EXPORT NIGHTS');
    const p = await open(`${BASE}?shot`); await start(p);
    // a recorded player: a robot hand plays 6 nights in the real client (the same hand sim/export_worlds.cjs uses); the page records them like anyone's
    const r = await p.evaluate(async nights => {
      const v = (document.querySelector('script[src*="main.js"]').src.match(/v=(\d+)/) || [])[1], C = await import(`/next/core/game.js?v=${v}`), F = await import(`/next/client/friend.js?v=${v}`), g = lastfire2.g, me = lastfire2.me;
      g.holdDay = false; g.clock = 0.5; me.style = { name: 'Daniel', roam: 8, greed: 8, bankAt: 12, aim: 0.7, together: 0.7, blind: 3 }; me.r = C.stream(g.seed, 'autoplay-me'); me.homeX = g.fire.x + 6; me.homeZ = g.fire.z + 2; me.x = g.fire.x + 3; me.z = g.fire.z;
      let guard = 0; const start = g.night; while (g.night < start + nights && guard++ < 200000) { F.think(g, me, me.r, 0.1); me.hp = 100; C.step(g, 0.1); }
      return { night: g.night, recorded: g.history.length, players: Object.keys(g.history[0].players) };
    }, 6);
    console.log('  the real client recorded', JSON.stringify(r)); await p.waitForTimeout(800);
    const openDev = async () => { if (await p.evaluate(() => document.getElementById('dev').hidden)) { if (await p.evaluate(() => document.getElementById('paused').hidden)) { await p.mouse.click(500, 450); await p.keyboard.press('Escape'); await p.waitForTimeout(400); } await p.evaluate(() => document.getElementById('openDev').click()); await p.waitForTimeout(300); } };
    const press = async re => { await p.evaluate(src => [...document.querySelectorAll('#devBody button')].find(b => new RegExp(src).test(b.innerText)).click(), re.source); };
    await openDev(); const items = await p.evaluate(() => [...document.querySelectorAll('#devBody button')].map(b => b.firstChild.textContent));
    check('the DEV list has EXPORT NIGHTS, FRIEND VS YOU and THE DAEMON', ['EXPORT NIGHTS', 'FRIEND VS YOU', 'THE DAEMON'].every(n => items.includes(n)), items.join(' | '));
    // FRIEND VS YOU
    await press(/^FRIEND VS YOU/); await p.waitForSelector('#matchNum', { timeout: 60000 }); await p.waitForTimeout(500);
    const hv = await p.evaluate(() => ({ text: document.getElementById('devViewBody').innerText.replace(/\s+/g, ' '), match: parseInt(document.getElementById('matchNum').textContent), shown: !document.getElementById('devView').hidden }));
    console.log('  page:', hv.text.slice(0, 600));
    check('FRIEND VS YOU shows the recorded player and the learned friend side by side with a match number', hv.shown && /recorded player/.test(hv.text) && /learned friend/.test(hv.text) && hv.match >= 0 && hv.match <= 100 && /roams from the fire/.test(hv.text) && /hits/.test(hv.text) && /banks at/.test(hv.text), `match ${hv.match}%`);
    check('the match is high enough to pass the certifier (the friend plays like the recorded player)', hv.match >= 60 && /PASS/.test(hv.text), `${hv.match}%, ${/PASS/.test(hv.text) ? 'certifier PASS' : 'certifier FAIL'}`);
    await shot(p, '20-friend-vs-you'); await p.evaluate(() => document.getElementById('devViewBack').click()); await p.waitForTimeout(300);
    check('BACK returns to the DEV list', await p.evaluate(() => !document.getElementById('dev').hidden && document.getElementById('devView').hidden), 'dev open, view closed');
    // THE DAEMON
    await press(/^THE DAEMON/); await p.waitForFunction(() => /REFUSED|CERTIFIED|not written/.test(document.getElementById('devViewBody').innerText), null, { timeout: 20000 }); await p.waitForTimeout(400);
    const dv = await p.evaluate(() => document.getElementById('devViewBody').innerText.replace(/\s+/g, ' ')); console.log('  page:', dv.slice(0, 700));
    check("THE DAEMON shows the real recorded world's result: the honest refusal with its gain against noise", /REFUSED: not fair in every run/.test(dv) && /gain against noise: -0\.126 against noise 0\.279/.test(dv) && /5 recorded nights/.test(dv), dv.slice(dv.indexOf('verdict'), dv.indexOf('verdict') + 120));
    await shot(p, '22-the-daemon'); await p.evaluate(() => document.getElementById('devViewBack').click()); await p.waitForTimeout(300);
    // EXPORT NIGHTS: a real download that is a loadable world with the same nights
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), press(/^EXPORT NIGHTS/)]);
    const f = path.join(OUT, 'export-' + dl.suggestedFilename()); await dl.saveAs(f); const w = JSON.parse(fs.readFileSync(f, 'utf8'));
    check('EXPORT NIGHTS downloads the world as a file with all 6 recorded nights', /^lastfire-nights-.*-6n\.json$/.test(dl.suggestedFilename()) && Array.isArray(w.history) && w.history.length === 6, `${dl.suggestedFilename()}, ${fs.statSync(f).size} bytes, ${w.history.length} nights`);
    console.log('  after export, the game is back:', await p.evaluate(() => document.getElementById('dev').hidden && document.getElementById('paused').hidden));
    check('no stray "[object Promise]" text anywhere on the page', !(await p.evaluate(() => document.body.innerText)).includes('[object'), 'clean');
    check('no errors in the page', errs.length === 0, errs.slice(0, 2).join(' | ') || 'none'); await p.close();
  }
  await b.close();
  console.log(fail ? `\n${fail} FAIL` : '\nall PASS'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
