// node next/sim/hit_effects.cjs [port=8092]: the hit-feel test (his v163 complaint: "no depth and immersion to shooting the enemies").
// Plays the real client at 1920x908 headless and checks, per shot: (1) every hit that took health spawned its effects in that same frame,
// (2) the particle pool never passes its cap (and does wrap), (3) a shot into a shape standing out of every light puffs gray smoke and takes
// no health and throws no ichor, (4) a killed body dissolves into motes, (5) the body jerks (a bone offset) when hit.
// Writes playtests/checklist/test-hit_effects.txt and screenshots to playtests/lanes/E/.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core'), fs = require('fs'), path = require('path');
const PORT = process.argv[2] || 8092, OUT = path.join(__dirname, '..', 'playtests', 'lanes', 'E');
(async () => { const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 908 } })).newPage(), errs = [], res = []; p.on('pageerror', e => errs.push(e.message));
  const check = (name, pass, saw) => { res.push(!!pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (${saw})`); };
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(2500); await p.click('#solo');
  await p.waitForFunction(() => window.__lf && __lf.me && __lf.g && __lf.g.ready, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  await p.mouse.click(960, 450); await p.waitForTimeout(300);
  const setup = await p.evaluate(async () => { const C = await import(location.pathname.replace(/\/$/, '') + '/core/game.js?v=' + (document.querySelector('script[type=module]')?.src.match(/v=(\d+)/) || [0, 172])[1]); window.__C = C; const g = __lf.g, m = __lf.me;
    g.clock = C.NIGHT_AT + 0.05; g.fire.level = 3; g.fire.fuel = 5000; g.hollow = []; m.x = -4; m.z = 7; m.y = g.land(-4, 7); m.hp = 1e9;
    window.__add = (kind, x, z, hp) => { const K = C.KINDS[kind]; const k = { id: g.nextId++, kind, x, z, y: g.land(x, z), yaw: 0, hp: hp || K.hp * 20, max: hp || K.hp * 20, sh: 0, sb: 0, cd: 99, dead: false, speed: 0.01, staged: true }; g.hollow.push(k); return k; };
    window.__aim = k => { const hy = C.KINDS[k.kind].hits.find(h => h[3] === 1)[0], dx = k.x - m.x, dz = k.z - m.z, dy = k.y + hy - (m.y + 1.6); m.yaw = Math.atan2(-dx, -dz); m.pitch = Math.atan2(dy, Math.hypot(dx, dz)); };
    window.__samples = []; const tick = () => { const k = g.hollow[0]; window.__samples.push({ f: __lf.impact.frame, ev: __lf.impact.events.length, hp: k ? k.hp : null, live: __lf.impact.live, spawned: __lf.impact.spawned }); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    return { ok: !!__lf.impact }; });
  check('the effects system exists on the page', setup.ok, 'impact + creatures on __lf');
  // ---- 1. a solid body in the light, shot at full auto
  await p.evaluate(() => { const k = __add('walker', -4, 1.5); __aim(k); window.__k = k; window.__samples.length = 0; });
  await p.waitForTimeout(700); await p.mouse.move(960, 450);
  const fireFor = async ms => { await p.evaluate(() => { window.__fireT = setInterval(() => { __lf.refill(); __lf.fire(); __aim(__k); }, 30); }); await p.waitForTimeout(ms); await p.evaluate(() => clearInterval(window.__fireT)); };
  // each shot is fired and measured in the same JavaScript turn, so "in that same frame" is literal: health drop and the new effects must arrive together
  const A = await p.evaluate(async () => { let drops = 0, bad = 0, ichor = 0; const t0 = performance.now();
    for (let i = 0; i < 60; i++) { __lf.refill(); __aim(__k); const hp0 = __k.hp, e0 = __lf.impact.events.length, s0 = __lf.impact.spawned; __lf.fire(); const dropped = __k.hp < hp0 - 0.01, grew = __lf.impact.events.slice(e0).filter(e => e[1] === 'ichor').length, sp = __lf.impact.spawned - s0;
      if (dropped) { drops++; ichor += grew; if (grew < 1 || sp < 12) bad++; } await new Promise(r => setTimeout(r, 30)); }
    const S = __samples; return { drops, bad, ichor, maxLive: Math.max(...S.map(s => s.live)), spawned: __lf.impact.spawned }; });
  await p.screenshot({ path: path.join(OUT, 'hit-mid.png') });
  check('every hit that took health spawned its effects in that same frame', A.drops > 0 && A.bad === 0, `${A.drops} hits took health, ${A.bad} without a burst of 12 or more particles in the same turn, ${A.ichor} ichor bursts`);
  check('the particle pool never passes its cap', A.maxLive <= 480, `most alive at once ${A.maxLive} of 480, ${A.spawned} spawned (the ring wraps: ${A.spawned > 480})`);
  const W = await p.evaluate(async () => { const I = __lf.impact, s0 = I.spawned; for (let i = 0; i < 60; i++) I.ichor({ x: 0, y: 1, z: 1 }, { x: 0, y: 0, z: -1 }, true, true, true); await new Promise(r => setTimeout(r, 100)); return { spawned: I.spawned - s0, live: I.live, cap: 480 }; });
  check('a flood of hits wraps the ring and still holds the cap', W.spawned > 960 && W.live <= W.cap, `${W.spawned} spawned in one turn, ${W.live} alive after`);
  // ---- 2. the neck snaps on a head hit: the offset bone differs from the animation's
  const J = await p.evaluate(async () => { const v = __lf.creatures.seenRef.get(__k.id); if (!v) return { err: 'no visual' }; __lf.creatures.hit(__k.id, { x: __k.x, y: __k.y + 2.2, z: __k.z }, { x: 0, y: 0, z: -1, clone() { return { x: 0, y: 0, z: -1 }; } }, { head: true }); const q0 = v.b2.quaternion.clone();
    await new Promise(r => setTimeout(r, 60)); const q1 = v.b2.quaternion.clone(); return { moved: q0.angleTo(q1) }; });
  check('a head hit snaps the neck (bone offset on top of the animation)', J.moved > 0.05, J.err || `neck moved ${J.moved.toFixed(2)} rad in 60 ms`);
  // ---- 3. smoke: the same walker out of every light
  await p.evaluate(() => { __lf.g.hollow = []; const k = __add('walker', -4, -45); __aim(k); window.__k = k; window.__e0 = __lf.impact.events.length; window.__hp0 = k.hp; });
  await p.waitForTimeout(600); await fireFor(600);
  const S = await p.evaluate(() => { const ev = __lf.impact.events.slice(__e0); return { puff: ev.filter(e => e[1] === 'puff').length, ichor: ev.filter(e => e[1] === 'ichor').length, hp: __k.hp, hp0: __hp0, solid: __C.solid(__lf.g, __k) }; });
  await p.screenshot({ path: path.join(OUT, 'hit-smoke.png') });
  check('out of the light: shots puff gray smoke, throw no ichor, take no health', !S.solid && S.puff > 0 && S.ichor === 0 && S.hp === S.hp0, `${S.puff} puffs, ${S.ichor} ichor, health ${S.hp}/${S.hp0}, solid ${S.solid}`);
  // ---- 4. a kill dissolves into motes and the body falls the way the shot went
  await p.evaluate(() => { __lf.g.hollow = []; }); await p.waitForTimeout(4200);   // (the bodies cleared above finish dissolving first)
  await p.evaluate(() => { const k = __add('walker', -4, 1.5, 60); __aim(k); window.__k = k; window.__e0 = __lf.impact.events.length; window.__s0 = __lf.impact.spawned; });
  await p.waitForTimeout(700); await fireFor(300); await p.waitForTimeout(450); await p.screenshot({ path: path.join(OUT, 'hit-fall.png') }); await p.waitForTimeout(1900); await p.screenshot({ path: path.join(OUT, 'hit-dissolve.png') }); await p.waitForTimeout(1500);
  const K = await p.evaluate(() => ({ dead: !__lf.g.hollow.includes(__k), dissolve: __lf.impact.events.slice(__e0).filter(e => e[1] === 'dissolve').length, spawned: __lf.impact.spawned - __s0 }));
  check('a kill dissolves into rising motes', K.dead && K.dissolve === 1 && K.spawned > 40, `dead ${K.dead}, dissolve events ${K.dissolve}, ${K.spawned} particles spawned`);
  check('no errors in the page', errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');
  const fails = res.filter(x => !x).length, txt = `${fails ? 'FAIL' : 'PASS'}  hit effects: ${res.length - fails} of ${res.length}\n`; console.log(txt); fs.mkdirSync(path.join(__dirname, '..', 'playtests', 'checklist'), { recursive: true }); fs.writeFileSync(path.join(__dirname, '..', 'playtests', 'checklist', 'test-hit_effects.txt'), txt); await b.close(); process.exit(fails ? 1 : 0); })().catch(e => { console.log('FAIL', e.message); process.exit(1); });
