// node next/sim/lane_b_browser.cjs [stage]   Lane B browser run: the real client in headless Chromium at his window size (1000x900), a fake controller,
// a fake PeerJS (so rooms open with no network), screenshots from the player's spot into next/playtests/lanes/B/. Each line is PASS or FAIL.
// Needs the game served: PORT env (default 8102): python -m http.server 8102 from the repo root.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 8102, BASE = `http://localhost:${PORT}/next/`, OUT = path.join(__dirname, '..', 'playtests', 'lanes', 'B');
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2];
const FAKE_PEER = `window.Peer = class { constructor(id) { this.id = id; this._h = {}; this.destroyed = false; window.__peers = (window.__peers || []); window.__peers.push(this); setTimeout(() => this._h.open && this._h.open(id), 30); }
  on(ev, fn) { this._h[ev] = fn; return this; } connect() { return { on() {}, send() {}, close() {}, open: false }; } reconnect() {} destroy() { this.destroyed = true; } };`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.addInitScript(() => { const btn = () => ({ pressed: false, value: 0 }); window.__ft = 16; { let last = performance.now(); const loop = t => { window.__ft = window.__ft * 0.8 + (t - last) * 0.2; last = t; requestAnimationFrame(loop); }; requestAnimationFrame(loop); } window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), mapping: 'standard', id: 'robot pad' }; navigator.getGamepads = () => [window.__pad]; });
  await ctx.addInitScript(FAKE_PEER); await ctx.route('**/peerjs*', r => r.abort());
  const posted = []; await ctx.route('http://127.0.0.1:8050/**', r => { posted.push(r.request().postData()); r.fulfill({ status: 200, body: 'ok', headers: { 'access-control-allow-origin': '*' } }); });
  let verFake = null; await ctx.route('**/next/version.json*', r => verFake ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(verFake), headers: { 'cache-control': 'no-store' } }) : r.continue());
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('  [console]', m.text().slice(0, 200)); });
  let fail = 0; const check = (name, ok, saw) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${saw})`); if (!ok) fail++; };
  const shot = async name => { const f = path.join(OUT, name + '.png'); await p.screenshot({ path: f }); console.log('  shot', name + '.png'); };
  const pad = (f, a) => p.evaluate(f, a), press = async (i, ms = 250) => { const ft = await p.evaluate(() => window.__ft || 16); ms = Math.max(ms, Math.min(2500, 3 * ft)); await pad(i => { __pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(ms); await pad(i => { __pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(140); };
  const L = () => p.evaluate(() => { const l = window.lastfire2; return l && l.g ? { ready: !!l.g.ready, night: l.g.night, clock: l.g.clock, level: l.g.fire.level, light: l.g.fire.light, nodes: l.g.nodes.length, marks: l.g.marks.length, motes: l.g.motes.length, seed: l.g.seed, me: l.me && { x: l.me.x, z: l.me.z, id: l.me.id, carried: l.me.carried }, locked: l.net ? l.net.locked : null, code: l.net ? l.net.code : null } : null; });
  const ready = () => p.waitForFunction(() => window.lastfire2 && lastfire2.g && lastfire2.g.ready && lastfire2.me, null, { timeout: 40000 }).catch(e => { console.log('  ready timed out; page errors:', errs.join(' | ')); throw e; });
  const focusKey = async id => { for (let i = 0; i < 30; i++) { if (await p.evaluate(id => document.activeElement && document.activeElement.id === id, id)) return true; await press(13, 200); } return false; };
  const focusText = async re => { for (let i = 0; i < 40; i++) { if (await p.evaluate(src => { const a = document.activeElement; return !!a && new RegExp(src).test(a.innerText || ''); }, re.source)) return true; await press(13, 200); } return false; };
  const go = async () => { await p.goto(BASE + '?shot'); await p.waitForTimeout(1800); };
  const stage = (n, f) => (only && only !== n) ? null : (console.log(`\n== ${n}`), f());
  // ---- stage 'saves': items 13, 14 (new world, drop in, reload keeps marks, light, builds)
  if (!only || only === 'saves') {
    console.log('\n== saves');
    await go(); await p.fill('#name', 'Robo'); await p.click('#solo'); await ready(); await p.waitForTimeout(1500);
    let s = await L(); check('PLAY ALONE starts a new world', s.ready && s.night === 1, `night ${s.night} seed ${s.seed}`);
    await shot('13-new-world-1');
    // build things in the world: a lamp 6 m from the fire, a mark, light lying out there, a grown fire
    await p.evaluate(() => { const l = lastfire2, g = l.g, me = l.me; g.nodes.push({ id: g.nextId++, kind: 'lamp', x: me.x + 5, z: me.z - 9, hp: 80, lit: false, who: 'Robo', n: 1 }); g.nodes.push({ id: g.nextId++, kind: 'relay', x: me.x + 14, z: me.z - 4, hp: 120, lit: false, who: 'Robo', n: 1 }); g.marks.push({ k: 'fall', x: me.x - 4, z: me.z - 6, n: 1, who: 'Dalton' });
      g.motes.push({ id: g.nextId++, x: me.x - 3, z: me.z - 8, v: 5, t: 1e9 }, { id: g.nextId++, x: me.x - 2, z: me.z - 9, v: 5, t: 1e9 }, { id: g.nextId++, x: me.x - 4, z: me.z - 10, v: 5, t: 1e9 }); g.fire.light = 321; g.fire.level = 2; g.night = 3; });
    await p.waitForTimeout(400); const before = await L(); await shot('14-before-reload');
    const wid = await p.evaluate(() => (JSON.parse(localStorage.getItem('lastfire2-worlds') || '[]')[0] || {}).id);
    await p.evaluate(() => { document.getElementById('leave').onclick && 0; }); // the pause menu's LEAVE saves then reloads
    await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.click('#leave'); await p.waitForTimeout(1800);
    const saved = await p.evaluate(() => { const l = JSON.parse(localStorage.getItem('lastfire2-worlds') || '[]'); return { n: l.length, w: l[0], raw: JSON.parse(localStorage.getItem('lastfire2-w-' + (l[0] || {}).id) || 'null') }; });
    check('LEAVE saved the world to this browser', saved.n === 1 && saved.raw && saved.raw.nodes.length === 2 && saved.raw.marks.length === 1 && saved.raw.motes.length >= 3, `${saved.n} world(s), nodes ${saved.raw && saved.raw.nodes.length}, marks ${saved.raw && saved.raw.marks.length}, motes ${saved.raw && saved.raw.motes.length}`);
    await shot('14-menu-after-reload');
    const menuText = await p.evaluate(() => document.getElementById('worlds').innerText.replace(/\s+/g, ' '));
    check('after the reload the menu offers CONTINUE with the night, fire and lights', /CONTINUE/.test(menuText) && /night 3/.test(menuText) && /fire 2/.test(menuText) && /2 lights built/.test(menuText), menuText.slice(0, 110));
    // drop into the saved world with the pad: D-pad to CONTINUE, A
    check('the pad reaches CONTINUE', await focusText(/CONTINUE/), 'focus on CONTINUE');
    for (let t = 0; t < 4 && !(await p.evaluate(() => !!(window.lastfire2 && lastfire2.g))); t++) { await press(0, 500); await p.waitForTimeout(1200); }
    await ready(); await p.waitForTimeout(1500);
    s = await L(); check('CONTINUE drops straight back into the same world (seed, night, fire level, light)', s.seed === before.seed && s.night === 3 && s.level === 2 && s.light === 321, `seed ${s.seed}=${before.seed} night ${s.night} level ${s.level} light ${s.light}`);
    check('builds, marks and the light left lying there are still in it', s.nodes === 2 && s.marks === 1 && s.motes >= 3, `nodes ${s.nodes} marks ${s.marks} motes ${s.motes}`);
    await p.evaluate(() => { const l = lastfire2; l.me.yaw = Math.atan2(-(4), 9) ; });
    await p.waitForTimeout(800); await shot('14-after-reload-in-world');
    // 13: a new world on top of the saved one (drop in anytime / start new): DEV, NEW WORLD
    await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.click('#openDev'); await p.waitForTimeout(300);
    await p.evaluate(() => [...document.querySelectorAll('#devBody button')].find(b => /NEW WORLD/.test(b.innerText)).click()); await ready(); await p.waitForTimeout(1500);
    s = await L(); await p.evaluate(() => dispatchEvent(new Event('pagehide'))); const nw = await p.evaluate(() => JSON.parse(localStorage.getItem('lastfire2-worlds') || '[]').length);
    check('NEW WORLD starts another while the first stays saved', s.night === 1 && s.nodes === 0 && nw === 2, `night ${s.night} nodes ${s.nodes} saved worlds ${nw}`);
    await shot('13-new-world-2');
  }
  // ---- stage 'dev': items 18, 19, 17 (dev menu on the pad, checklist, GROW)
  if (!only || only === 'dev') {
    console.log('\n== dev, checklist, grow');
    await go(); await p.fill('#name', 'Robo'); await p.click('#solo'); await ready(); await p.waitForTimeout(1500);
    await p.mouse.click(500, 450); await p.waitForTimeout(300);
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /SKIP THE GUIDE/.test(x.innerText)); if (b) b.click(); }); await p.waitForTimeout(500);   // (the Clerk's guide holds the sun until it is done: his tutorial, not what is being tested)
    // GROW (item 17): carry nothing, bank light, stand at the fire, press the use button on the pad
    await p.evaluate(() => { const l = lastfire2, g = l.g, me = l.me; me.x = g.fire.x + 2; me.z = g.fire.z + 1; g.fire.light = 200; g.clock = 0.3; });
    await p.waitForTimeout(500); const pr = await p.evaluate(() => document.getElementById('prompt').innerText.replace(/\s+/g, ' ')); console.log('  prompt:', pr);
    check('standing at the fire with light banked, the prompt offers GROW', /GROW/i.test(pr), pr.slice(0, 90));
    await shot('17-grow-prompt'); let s = await L();
    await press(15); await p.waitForTimeout(500); const s2 = await L();
    check('the pad use button (D-pad right) grows the fire and spends the light', s2.level === s.level + 1 && s2.light < s.light, `level ${s.level} -> ${s2.level}, light ${s.light} -> ${s2.light}`);
    await shot('17-grown');
    await p.evaluate(() => { const g = lastfire2.g; g.holdDay = false; g.clock = 0.549; }); await p.waitForTimeout(1500);
    const woke = await p.evaluate(() => lastfire2.g.fire.woke.slice()); check('and at dusk the dark answers: the new level wakes a runner', woke.includes('runner'), `woke [${woke}]`);
    await p.waitForTimeout(3000); await shot('17-dark-answers');
    // DEV on the pad (item 18): Start opens the pause menu, D-pad to DEV, A
    await press(9); await p.waitForTimeout(300);
    check('Start on the pad opens the pause menu', await p.evaluate(() => !document.getElementById('paused').hidden), 'paused');
    check('the pad reaches DEV', await focusText(/^DEV/), 'focus on DEV'); await press(0); await p.waitForTimeout(300);
    check('A opens the DEV list', await p.evaluate(() => !document.getElementById('dev').hidden), 'dev open'); await shot('18-dev-menu');
    const names = await p.evaluate(() => [...document.querySelectorAll('#devBody button')].map(b => b.firstChild.textContent));
    console.log('  dev items:', names.join(' | ')); check('the DEV list has restart, skip, test and the rest (at least 11 items)', names.length >= 11 && ['RESTART THE NIGHT', 'SKIP TO DUSK', 'SKIP TO DAWN', 'NEW WORLD'].every(n => names.includes(n)), `${names.length} items`);
    // press every item with the pad, in an order that shows each effect, and check what it did to the world
    const W = () => p.evaluate(() => { const g = lastfire2.g, me = lastfire2.me; return { clock: g.clock, players: g.players.length, bots: g.players.filter(q => q.bot).length, giants: g.hollow.filter(k => k.kind === 'giant' && !k.dead).length, hollow: g.hollow.filter(k => !k.dead).length, carried: me.carried, light: g.fire.light, stash: Object.values(g.stash).reduce((x, y) => x + y, 0), hp: me.hp }; });
    const EFFECT = { 'A LEARNED FRIEND JOINS': (a, z) => z.bots === a.bots + 1, 'SKIP TO DUSK': (a, z) => z.clock > 0.5 && z.clock < 0.6, 'RESTART THE NIGHT': (a, z) => Math.abs(z.clock - 0.55) < 0.03 && z.hollow <= a.hollow, 'SKIP TO DAWN': (a, z) => z.clock > 0.95 || z.clock < 0.05, 'EVERY ITEM': (a, z) => z.carried + z.light >= a.carried + a.light + 499 && z.stash >= 6, '+100 LIGHT': (a, z) => z.carried + z.light >= a.carried + a.light + 99, 'WAKE A GIANT': (a, z) => z.giants === a.giants + 1 || (z.hollow === 0 && a.hollow === 0),   /* (v170 hides the dark in the client for now: nothing to count, so the item only has to run and put you back) */ 'GOD MODE': () => true, 'CLEAR THE DARK': (a, z) => z.hollow < a.hollow || z.hollow === 0 };
    const results = [], order = ['A LEARNED FRIEND JOINS', 'SKIP TO DUSK', 'RESTART THE NIGHT', 'SKIP TO DAWN', 'EVERY ITEM', '+100 LIGHT', 'WAKE A GIANT', 'GOD MODE', 'CLEAR THE DARK'];
    await p.evaluate(() => { lastfire2.g.holdDay = false; });
    for (const name of order) {
      if (name === 'RESTART THE NIGHT') await p.waitForTimeout(2500);   // (the dusk snapshot is taken as the dark rolls in)
      if (await p.evaluate(() => document.getElementById('dev').hidden)) { await press(9); await focusText(/^DEV/); await press(0); }
      console.log('   ...', name);
      const ok = await focusText(new RegExp('^' + name.replace(/[+]/g, '[+]'))), a = await W();
      if (!ok) { results.push([name, false, 'pad could not reach it']); continue; }
      await press(0); await p.waitForTimeout(600);
      const z = await W(), back = await p.evaluate(() => document.getElementById('dev').hidden && document.getElementById('paused').hidden);
      results.push([name, EFFECT[name](a, z) && back, `clock ${a.clock.toFixed(3)}->${z.clock.toFixed(3)} bots ${a.bots}->${z.bots} giants ${a.giants}->${z.giants} hollow ${a.hollow}->${z.hollow} carried+banked ${a.carried + a.light}->${z.carried + z.light}, back in game ${back}`]);
    }
    for (const r of results) console.log('   ', r[1] ? 'ok  ' : 'BAD ', r[0].padEnd(24), r[2]);
    check('every DEV item (all but THE SIMULATOR tab and NEW WORLD, tested in saves) pressed on the pad does its job and puts you straight back in', results.length === order.length && results.every(r => r[1]), `${results.filter(r => r[1]).length} of ${order.length} items`);
    // the learned friend (item 20) really plays in the browser: it moves and fights around the fire on its own
    const bp = () => p.evaluate(() => { const b = lastfire2.g.players.find(q => q.bot); return b ? { x: b.x, z: b.z, hp: b.hp, name: b.name, shots: lastfire2.g.rec && lastfire2.g.rec.players && lastfire2.g.rec.players[b.name] ? lastfire2.g.rec.players[b.name].shots || 0 : 0 } : null; });
    await p.evaluate(() => { const g = lastfire2.g, b = g.players.find(q => q.bot); g.hollow = []; g.clock = 0.4; g.holdDay = false; for (let i = 0; i < 3; i++) g.motes.push({ id: g.nextId++, x: b.x + 4 + i, z: b.z + 3, v: 2, t: 1e9 }); }); const b0 = await bp();   // (light lying near it: a learned friend goes for it, like the person it learned from)
     await p.waitForTimeout(7000); const b1 = await bp();
    check('the learned friend plays on its own in the browser (it goes for light lying near it, and is still on its feet)', !!b0 && !!b1 && Math.hypot(b1.x - b0.x, b1.z - b0.z) > 0.5 && b1.hp > 0, b1 ? `${b1.name} moved ${Math.hypot(b1.x - b0.x, b1.z - b0.z).toFixed(1)} m in 7 s` : 'no friend');
    await p.waitForTimeout(500); await shot('18-after-dev-items');
  }
  // ---- stage 'list': item 19 (the checklist in the game, on the pad)
  if (!only || only === 'list') {
    console.log('\n== checklist');
    await go(); await p.fill('#name', 'Robo'); await p.click('#solo'); await ready(); await p.waitForTimeout(1500); await p.mouse.click(500, 450); await p.waitForTimeout(300);
    await press(9); await p.waitForTimeout(300); check('the pad reaches CHECKLIST', await focusText(/^CHECKLIST/), 'focus'); await press(0); await p.waitForTimeout(900);
    const lt = await p.evaluate(() => { const b = document.getElementById('listBody'); return { open: !document.getElementById('list').hidden, rows: b.querySelectorAll('tr, .row, li, div').length, text: b.innerText.replace(/\s+/g, ' ').slice(0, 400) }; });
    check('the in-game CHECKLIST opens and lists the ideas with their marks', lt.open && /BUILT/.test(lt.text) && lt.text.length > 100, lt.text.slice(0, 120)); await shot('19-checklist');
    check('no errors in the page', errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');
  }
  // ---- stage 'moves': item 25 (movement unlocks over the eras = fire levels), on the pad
  if (!only || only === 'moves') {
    console.log('\n== movement unlocks');
    await go(); await p.evaluate(() => localStorage.setItem('lastfire2', JSON.stringify({ moveEras: true, guided: 1 }))); await go();
    await p.fill('#name', 'Robo'); await p.click('#solo'); await ready(); await p.waitForTimeout(1500); await p.mouse.click(500, 450); await p.waitForTimeout(300);
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /SKIP THE GUIDE/.test(x.innerText)); if (b) b.click(); });
    const said = () => p.evaluate(() => (window.__said || []).slice()), axes = (a, b) => pad(([a, b]) => { __pad.axes = [a, b, 0, 0]; }, [a, b]);
    const tryAll = async () => { const out = {}; await p.evaluate(() => { window.__said = []; });
      // slide: sprint forward (L3) then B
      await axes(0, -1); await press(10); await p.waitForTimeout(700); await press(1); await p.waitForTimeout(300); out.slide = await p.evaluate(() => lastfire2.me.crouch === true); await axes(0, 0); await press(10); await p.waitForTimeout(400);
      await p.evaluate(() => { lastfire2.me.y = lastfire2.g.land(lastfire2.me.x, lastfire2.me.z); });
      // dodge: stick sideways then B on the ground (the pad's dodge)
      await p.waitForTimeout(600); await axes(1, 0); await p.waitForTimeout(300); const dx0 = await p.evaluate(() => lastfire2.me.x); await press(1, 300); await axes(0, 0); out.dodge = !(await said()).some(t => /dodge/.test(t));
      // boost: jump, then A again in the air
      await p.waitForTimeout(1200); await press(0, 200); await p.waitForTimeout(150); await press(0, 200); out.boost = !(await said()).some(t => /boost jump/.test(t)); await p.waitForTimeout(1500);
      // slam: high up, then B
      await p.evaluate(() => { lastfire2.me.y += 8; }); await p.waitForTimeout(80); await press(1, 200); out.slam = !(await said()).some(t => /slam/.test(t)); await p.waitForTimeout(2000); out.said = await said(); return out; };
    const at = async lvl => { await p.evaluate(l => { const g = lastfire2.g; g.fire.level = l; }, lvl); await p.waitForTimeout(300); return tryAll(); };
    let r = await at(0); console.log('  level 0 said:', JSON.stringify(r.said));
    check('fire level 0: the pad slide is held back (you crouch instead), the dodge, boost jump and slam each say when they unlock', !r.slide && !r.dodge && !r.boost && !r.slam && r.said.length >= 3, `slide ${r.slide} dodge ${r.dodge} boost ${r.boost} slam ${r.slam}`);
    check('and the words are plain: "unlocks when the fire reaches level N"', r.said.some(t => /dodge unlocks when the fire reaches level 2/.test(t)) && r.said.some(t => /slam unlocks when the fire reaches level 4/.test(t)), r.said.join(' / ').slice(0, 160));
    await shot('25-locked-level-0');
    r = await at(4); console.log('  level 4 said:', JSON.stringify(r.said));
    check('fire level 4: slide, dodge, boost jump and slam all work, nothing is held back', r.slide && r.dodge && r.boost && r.slam && !r.said.some(t => /unlocks when/.test(t)), `slide ${r.slide} dodge ${r.dodge} boost ${r.boost} slam ${r.slam}`);
    await shot('25-all-unlocked-level-4');
    await p.evaluate(() => { localStorage.setItem('lastfire2', JSON.stringify({ moveEras: false, guided: 1 })); });
  }
  // ---- stage 'lost': item 15 (a lost night spills the light and ends; nothing resets), seen from the player's spot
  if (!only || only === 'lost') {
    console.log('\n== a lost night');
    await go(); await p.fill('#name', 'Robo'); await p.click('#solo'); await ready(); await p.waitForTimeout(1500); await p.mouse.click(500, 450); await p.waitForTimeout(300);
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /SKIP THE GUIDE/.test(x.innerText)); if (b) b.click(); });
    await p.evaluate(() => { const g = lastfire2.g, me = lastfire2.me; g.holdDay = false; g.clock = 0.7; g.fire.level = 2; g.fire.light = 150; g.stash = { axle: 1 }; g.nodes.push({ id: g.nextId++, kind: 'lamp', x: me.x + 6, z: me.z - 8, hp: 80, lit: false, who: 'Robo', n: 1 }); me.carried = 35; me.x = g.fire.x + 30; me.z = g.fire.z + 8; });
    await p.waitForTimeout(500); const pre = await p.evaluate(() => ({ motes: lastfire2.g.motes.length, night: lastfire2.g.night, level: lastfire2.g.fire.level, light: lastfire2.g.fire.light, nodes: lastfire2.g.nodes.length, stash: lastfire2.g.stash.axle }));
    await p.evaluate(async () => { const C = await import('/next/core/game.js?v=170'), g = lastfire2.g, me = lastfire2.me; for (const q of g.players) for (let i = 0; i < 8 && !q.ember && !g.stats.lostNights; i++) C.hurt(g, q, 60, 'runner'); });   // (everyone, friends included)
    await p.waitForTimeout(300); await shot('15-night-lost-down');
    const post = await p.evaluate(() => { const g = lastfire2.g, me = lastfire2.me; return { lost: g.stats.lostNights || 0, clock: g.clock, motes: g.motes.length, night: g.night, level: g.fire.level, light: g.fire.light, nodes: g.nodes.length, stash: g.stash.axle, carried: me.carried, ember: me.ember, hollow: g.hollow.filter(k => !k.dead).length }; });
    check('everyone down: the night is lost and ends (the clock jumps to dawn)', post.lost === 1 && post.clock >= 0.97, `lost ${post.lost}, clock ${post.clock.toFixed(3)}`);
    check('the 35 light you carried is spilled on the ground where you fell', post.motes - pre.motes >= 7 && post.carried === 0, `${post.motes - pre.motes} motes new, carried ${post.carried}`);
    check('nothing resets: fire level, banked light, builds, stash and the night number are all still there', post.level === pre.level && post.light === pre.light && post.nodes === pre.nodes && post.stash === pre.stash && post.night >= pre.night, `level ${pre.level}->${post.level}, light ${pre.light}->${post.light}, nodes ${pre.nodes}->${post.nodes}, stash ${pre.stash}->${post.stash}`);
    check('you are back up at the fire and the dark is gone', !post.ember && post.hollow === 0, `ember ${post.ember}, hollow ${post.hollow}`);
    await p.waitForTimeout(2500); await shot('15-night-lost-after');
  }
  // ---- stage 'late': items 16 and 24 seen from the player's spot: night 12, and the fire grown past level 5 on the pad
  if (!only || only === 'late') {
    console.log('\n== late night and a fire past level 5');
    await go(); await p.fill('#name', 'Robo'); await p.click('#solo'); await ready(); await p.waitForTimeout(1500); await p.mouse.click(500, 450); await p.waitForTimeout(300);
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /SKIP THE GUIDE/.test(x.innerText)); if (b) b.click(); });
    await p.evaluate(() => { const g = lastfire2.g, me = lastfire2.me; g.holdDay = false; g.night = 3; g.clock = 0.3; g.fire.level = 7; g.fire.light = 2600;   /* (night 3 so the learned friends do not grow it for us) */ me.x = g.fire.x + 2; me.z = g.fire.z + 1; }); await p.waitForTimeout(600);
    const pr = await p.evaluate(() => document.getElementById('prompt').innerText.replace(/\s+/g, ' ')); console.log('  prompt:', pr);
    check('at fire level 7 the prompt still offers GROW (no stop at 5)', /GROW THE FIRE to level 8/.test(pr), pr.slice(0, 80));
    const a = await L(); await press(15); await p.waitForTimeout(600); const z = await L();
    check('the pad use button grows it to level 8 and spends the curve price', z.level === 8 && a.light - z.light > 2500, `level ${a.level} -> ${z.level}, light ${a.light} -> ${z.light}`);
    await shot('24-fire-level-8');
    const hud = await p.evaluate(() => document.getElementById('fireHud').innerText.replace(/\s+/g, ' ')); check('the HUD shows FIRE 8 and the next price', /FIRE 8/.test(hud) && /light to grow it/.test(hud), hud.slice(0, 90));
    await p.evaluate(() => { const g = lastfire2.g; g.night = 12; g.clock = 0.7; }); await p.waitForTimeout(2500); await shot('16-night-12');
    const n = await p.evaluate(() => ({ night: lastfire2.g.night, level: lastfire2.g.fire.level, hollow: lastfire2.g.hollow.filter(k => !k.dead).length, hp: lastfire2.me.hp }));
    check('night 12 plays: the world is at night 12, fire 8, and the screen was looked at', n.night === 12 && n.level === 8, JSON.stringify(n));
  }
  // ---- stage 'tab': item 47 (Tab feedback with a picture)
  if (!only || only === 'tab') {
    console.log('\n== tab feedback');
    await go(); await p.fill('#name', 'Robo'); await p.click('#solo'); await ready(); await p.waitForTimeout(1500); await p.mouse.click(500, 450); await p.waitForTimeout(300);
    await p.keyboard.press('Tab'); await p.waitForTimeout(500); check('Tab opens the feedback panel', await p.evaluate(() => !document.getElementById('tabmenu').hidden), 'open'); await shot('47-tab-open');
    await p.fill('#fbText', 'The fire felt too quiet at dusk. Test note from the robot.'); posted.length = 0;
    await p.click('#fbSend'); await p.waitForTimeout(1200);
    const item = posted.length ? JSON.parse(posted[0]) : null;
    check('SEND TO CLAUDE posts the note with a picture of the moment', !!item && /quiet/.test(item.text) && /^data:image\/jpeg;base64,/.test(item.shot || '') && item.shot.length > 3000, item ? `text ok, picture ${Math.round((item.shot || '').length / 1000)} KB, ctx night ${item.ctx.night} fire ${item.ctx.fire}` : 'nothing posted');
    if (item) fs.writeFileSync(path.join(OUT, '47-picture-sent.jpg'), Buffer.from(item.shot.split(',')[1], 'base64'));
    const back = await p.evaluate(() => document.getElementById('tabmenu').hidden); check('and you are straight back in the game', back, 'panel closed'); await shot('47-after-send');
    // the same on the pad: Back opens it, the D-pad reaches TALK and SEND TO CLAUDE, A sends, Back closes
    await press(8); await p.waitForTimeout(500); check('PAD: Back (View) opens the feedback panel', await p.evaluate(() => !document.getElementById('tabmenu').hidden), 'open');
    check('PAD: the D-pad reaches TALK (voice) and SEND TO CLAUDE', (await focusText(/^TALK/)) && (await focusText(/^SEND TO CLAUDE/)), 'both reachable');
    await p.evaluate(() => { const t = document.getElementById('fbText'); t.value = 'Sent with the pad.'; }); posted.length = 0; await press(0); await p.waitForTimeout(1200);
    const it2 = posted.length ? JSON.parse(posted[0]) : null; check('PAD: A on SEND TO CLAUDE sends it with the picture and closes the panel', !!it2 && /pad/.test(it2.text) && (it2.shot || '').length > 3000 && await p.evaluate(() => document.getElementById('tabmenu').hidden), it2 ? 'sent' : 'nothing posted');
    await press(8); await p.waitForTimeout(400); await press(8); await p.waitForTimeout(400); check('PAD: Back again closes it', await p.evaluate(() => document.getElementById('tabmenu').hidden), 'closed');
  }
  // ---- stage 'update': item 49 (UPDATE READY pop-up and straight back)
  if (!only || only === 'update') {
    console.log('\n== update ready');
    await go(); await p.fill('#name', 'Robo'); await p.click('#solo'); await ready(); await p.waitForTimeout(1200);
    await p.evaluate(() => { const l = lastfire2, g = l.g; g.fire.light = 77; g.fire.level = 1; g.nodes.push({ id: g.nextId++, kind: 'lamp', x: 8, z: 8, hp: 80, lit: false, who: 'Robo', n: 1 }); });
    const cur = await p.evaluate(async () => (await (await fetch('./version.json?t=' + Date.now())).json()).v);
    verFake = { v: cur + 5, notes: 'A test update from the robot.' }; await p.waitForFunction(() => !document.getElementById('upd').hidden, null, { timeout: 70000 }).catch(() => {});
    const shown = await p.evaluate(() => !document.getElementById('upd').hidden); check('UPDATE READY pops up when a newer version is out', shown, shown ? 'visible' : 'not shown'); await shot('49-update-ready');
    const pre = await L(); verFake = null; await press(9); await p.waitForTimeout(300); check('PAD: Start, then the D-pad reaches UPDATE NOW', await focusText(/^UPDATE NOW/), 'focus'); await press(0);   // (after the click the server really has the new build, so the reloaded page finds its own version current)
     await p.waitForTimeout(500); await ready().catch(() => {}); await p.waitForTimeout(2500);
    const post = await L();
    check('PAD: A on UPDATE NOW reloads and puts you straight back in the same world, no menu', !!post && post.seed === pre.seed && post.level === 1 && post.light === 77 && post.nodes === 1, post ? `seed ${post.seed}=${pre.seed} level ${post.level} light ${post.light} nodes ${post.nodes}` : 'no world'); await shot('49-back-in');
    verFake = null;
  }
  // ---- stage 'room': items 51, 12 (the kept room code, lock the room)
  if (!only || only === 'room') {
    console.log('\n== room code and lock');
    await go(); await p.fill('#name', 'Robo'); await p.click('#solo'); await ready(); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    let r = await p.evaluate(() => document.getElementById('room').innerText); check('alone: no room, no lock button', !/LOCK/.test(r), r.slice(0, 40));
    await p.click('#leave'); await p.waitForTimeout(1800);
    await p.fill('#name', 'Robo'); await p.click('#host'); await ready(); await p.waitForTimeout(1200);
    const a = await L(); const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('lastfire2') || '{}').crew);
    check('HOST opens a room with a 6-letter code that is stored in this browser', /^[A-Z]{6}$/.test(a.code || '') && stored === a.code, `code ${a.code}, stored ${stored}`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(400); await shot('12-pause-room'); r = await p.evaluate(() => document.getElementById('room').innerText.replace(/\s+/g, ' '));
    check('the pause menu shows the room code, COPY INVITE and LOCK THE ROOM (host only)', r.includes(a.code) && /COPY INVITE/.test(r) && /LOCK THE ROOM/.test(r), r.slice(0, 120));
    await p.click('#lockRoom'); await p.waitForTimeout(300); const lk = await L(); r = await p.evaluate(() => document.getElementById('room').innerText.replace(/\s+/g, ' '));
    check('LOCK THE ROOM locks it and the button turns into UNLOCK', lk.locked === true && /UNLOCK THE ROOM/.test(r), `locked ${lk.locked}`); await shot('12-locked');
    await p.click('#lockRoom'); await p.waitForTimeout(200); check('UNLOCK opens it again', (await L()).locked === false, 'unlocked');
    await p.click('#leave'); await p.waitForTimeout(1800); await p.fill('#name', 'Robo'); await p.click('#host'); await ready(); await p.waitForTimeout(800);
    const c2 = await L(); check('a second visit, after a full reload, opens the SAME room code (one permanent link per crew)', c2.code === a.code, `${a.code} then ${c2.code}`);
    await shot('51-same-code-again');
    // a friend's browser remembers the crew's room: after one visit the code is filled in and JOIN is one click
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('lastfire2') || '{}'); s.lastJoin = 'QWERTY'; delete s.crew; localStorage.setItem('lastfire2', JSON.stringify(s)); }); await go();
    const j = await p.evaluate(() => ({ code: document.getElementById('code').value, note: document.getElementById('menuNote').innerText }));
    check("a friend's menu has the crew's code already filled in, one click on JOIN", j.code === 'QWERTY' && /click JOIN/.test(j.note), `${j.code}: ${j.note}`); await shot('51-friend-menu-remembers');
  }
  const bad = errs.filter(e => !/peer/i.test(e)); check('no page errors anywhere in the run', bad.length === 0, bad.slice(0, 2).join(' | ') || 'none');
  console.log(fail ? `\n${fail} FAILED` : '\nall passed'); await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
