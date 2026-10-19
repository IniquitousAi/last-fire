// JOB ONE (his words, 2026-10-19): an AI plays the whole game, tutorial to end game. This robot plays the real client with a fake controller
// only, reading what a player reads (the guide's words, the prompt, the wrist) and seeing what a player sees (?autoplay's window.__eyes:
// the line of light and the shapes inside the frame). Every place it gets stuck, lost or bored is written down with a screenshot.
// Run: node next/sim/autoplay.cjs [minutes]   (the game must be served at http://localhost:8092, the "Last Fire" preview server)
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const MAX_MIN = +(process.argv[2] || 12), OUT = path.join(__dirname, '..', 'playtests', 'autoplay', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'));
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.addInitScript(() => { const btn = () => ({ pressed: false, value: 0 }); window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), mapping: 'standard', id: 'robot pad' }; navigator.getGamepads = () => [window.__pad]; localStorage.clear(); });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  const T0 = Date.now(), now = () => +((Date.now() - T0) / 1000).toFixed(1), log = [], stages = [], notes = new Set();
  let shot = 0; const snap = async (why) => { const f = `${String(++shot).padStart(2, '0')}-${why.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.png`; await p.screenshot({ path: path.join(OUT, f) }); return f; };
  const note = async (kind, what) => { const key = kind + what.replace(/\d+/g, '#'); if (notes.has(key)) return; notes.add(key); const f = await snap(kind + '-' + what); log.push({ t: now(), kind, what, shot: f }); console.log(`[${now()}s] ${kind.toUpperCase()}: ${what}`); };
  const pad = (f, a) => p.evaluate(f, a), sticks = (lx, ly, rx, ry) => pad(([a, b, c, d]) => { __pad.axes = [a, b, c, d]; }, [lx, ly, rx, ry]);
  const press = async (i, ms = 150) => { await pad(i => { __pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(ms); await pad(i => { __pad.buttons[i] = { pressed: false, value: 0 }; }, i); };
  const hold = (i, on) => pad(([i, on]) => { __pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; }, [i, on]);
  const read = () => p.evaluate(() => { const gd = document.getElementById('guide'), t = id => (document.getElementById(id)?.innerText || '').replace(/\s+/g, ' ').trim();
    return { goal: gd && !gd.hidden ? (gd.children[0]?.innerText || '').replace(/\s+/g, ' ').trim() : '', dist: gd && !gd.hidden ? parseFloat(gd.children[1]?.innerText) : NaN, prompt: t('prompt'), eyes: window.__eyes, fps: t('fps') }; });

  await p.goto('http://localhost:8092/next/?autoplay'); await p.waitForTimeout(2500);
  // the menu: a player clicks SOLO (menus are clicked, taste 9). The pad cannot reach the menu yet: written down, not worked around.
  for (let i = 0; i < 12 && !(await p.evaluate(() => document.activeElement && document.activeElement.id === 'solo')); i++) { await press(13, 80); await p.waitForTimeout(120); }
  if (await p.evaluate(() => document.activeElement && document.activeElement.id === 'solo')) { await press(0, 80); console.log(`[${now()}s] menu: SOLO picked with the D-pad and A`); }
  else { await note('pad', 'the D-pad cannot reach SOLO on the menu: needed a mouse click'); await p.click('#solo'); }
  await p.waitForFunction(() => window.__eyes, null, { timeout: 60000 }); await p.waitForTimeout(1500); await press(0, 60);   // (any button wakes the pad)

  let stage = { name: 'start', t: now() }, lastGoal = '', bestDist = Infinity, bestAt = now(), nightAt = 0, fired = 0, kills = 0;
  const enter = async (name) => { stage.end = now(); stage.secs = +(stage.end - stage.t).toFixed(1); stages.push(stage); stage = { name, t: now() }; bestDist = Infinity; bestAt = now(); console.log(`[${now()}s] STAGE: ${name}`); await snap('stage-' + name); };
  // steer: the line of light in frame means turn onto it and walk; out of frame means turn on the spot until it shows (a player's look-around)
  // a person walking into a desk steps sideways and tries again: no closer for 1.5 s while walking means a 0.9 s side step, alternating sides
  const walk = { d: Infinity, t: 0, side: 1, until: 0 };
  const steer = async (e, dist) => { const lvl = Math.max(-1, Math.min(1, e.pitch * 3));
    if (Date.now() < walk.until) return sticks(walk.side, -0.6, 0, lvl);
    if (!e.beam) return sticks(0, 0, 0.55, lvl); const x = e.beam[0], turn = Math.max(-1, Math.min(1, x * 1.6)), go = Math.abs(x) < 0.35;
    if (go && dist > 0) { if (dist < walk.d - 0.3) { walk.d = dist; walk.t = Date.now(); } else if (Date.now() - walk.t > 1500) { walk.side = -walk.side; walk.until = Date.now() + 900; walk.t = Date.now() + 900; walk.d = dist; } }
    return sticks(0, go ? -1 : 0, turn, lvl); };
  // fight: aim at the nearest solid shape in frame (aim assist does the rest), fire when on it; else look around slowly; pick up motes close by
  const fight = async (e) => { const solid = e.shapes.filter(s => s.solid).sort((a, b) => a.d - b.d)[0], mote = e.motes.sort((a, b) => a.d - b.d)[0];
    if (solid) { const [x, y] = solid.s, on = Math.abs(x) < 0.04 && Math.abs(y) < 0.08; await sticks(0, 0, Math.max(-1, Math.min(1, x * 2.2)), Math.max(-1, Math.min(1, -y * 2.2))); await hold(6, solid.d > 8); await hold(7, on); if (on) fired++; return; }
    await hold(7, false); await hold(6, false);
    if (mote && mote.d < 18) { const x = mote.s[0]; return sticks(0, Math.abs(x) < 0.3 ? -1 : 0, Math.max(-1, Math.min(1, x * 1.6)), 0); }
    return sticks(0, 0, 0.25, 0); };

  const deadline = T0 + MAX_MIN * 60000;
  while (Date.now() < deadline) {
    const r = await read(), e = r.eyes; if (!e) { await p.waitForTimeout(200); continue; }
    if (r.goal !== lastGoal) { if (r.goal) await enter(r.goal.replace(/^\d+ \/ \d+\s*/, '')); lastGoal = r.goal; }
    if (e.ember) { await note('died', `fell during "${stage.name}" (${e.phase})`); }
    if (e.lost > (stage.lost0 ?? (stage.lost0 = e.lost))) { stage.lost0 = e.lost; await note('died', `everyone fell, the night was lost during "${stage.name}" at ${Math.round(now() - stage.t)} s in, health was the only bar (${e.hp})`); }
    const g = r.goal;
    if (/Read your form|Check the real odds/.test(g)) {
      if (r.dist > 2.5) await steer(e, r.dist); else { await sticks(0, 0, 0, 0); await press(15); await p.waitForTimeout(1200);
        const r2 = await read(); if (r2.goal === r.goal && /Check the real odds/.test(g)) { await note('pad', 'at the board, the use button (D-pad right) does not CHECK; only B (crouch) does'); await press(1); await p.waitForTimeout(800); } }
    } else if (/Walk to the gate/.test(g)) await steer(e, r.dist);
    else if (/Stand by the fire/.test(g)) {
      if (r.dist > 3) await steer(e, r.dist); else { await sticks(0, 0, 0, 0); const t = now() - stage.t; if (t > 25) await note('bored', `standing at the fire waiting for dusk: ${Math.round(t)} s so far, nothing to do (BRING THE DUSK is a click-only key)`); }
    } else if (/Bring the light/.test(g)) await steer(e, r.dist);
    else if (/lander down to Earth/.test(g)) { if (/DROP TO EARTH/.test(r.prompt)) { await sticks(0, 0, 0, 0); await press(15); await p.waitForTimeout(2500); await enter('Earth'); } else await steer(e, r.dist); }
    else if (/Build a relay/.test(g)) { await sticks(0, 0, 0, 0); await press(14); await p.waitForTimeout(700); const r2 = await read(); if (/Left click to place/.test(r2.prompt)) { await note('pad', 'relay placing says "Left click to place": no controller way to place it'); await hold(7, true); await p.waitForTimeout(150); await hold(7, false); } await p.waitForTimeout(800); }
    else if (e.phase === 'night' || /shoot|Hold the light/.test(g)) { if (!nightAt) { nightAt = now(); await enter('the first night'); } if (now() - (fight.shotAt || 0) > 5 && now() - nightAt < 60) { fight.shotAt = now(); await snap(`night-${Math.round(now() - nightAt)}s-hp${e.hp}`); } await fight(e); }
    else if (!g) { if (stage.name !== 'after the guide') await enter('after the guide');
      // after the guide nothing says where to go: the robot looks for any F prompt by walking out from the fire and turning
      if (/DROP TO EARTH/.test(r.prompt)) { await press(15); await p.waitForTimeout(1500); await enter('Earth'); }
      else { await sticks(0, -1, 0.35, 0); if (now() - stage.t > 40) await note('lost', 'after the guide nothing says what to do next or where the drop to Earth is'); } }
    // stuck: the distance to the line of light has not improved in 20 s
    if (r.dist > 0 && r.dist < bestDist - 0.5) { bestDist = r.dist; bestAt = now(); } else if (r.dist > 3 && now() - bestAt > 20) await note('stuck', `"${stage.name}": ${r.dist} m from the line of light and not getting closer for 20 s`);
    if (stage.name === 'Earth' && now() - stage.t > 30) break;
    await p.waitForTimeout(100);
  }
  await enter('end'); await sticks(0, 0, 0, 0);
  const fps = (await read()).fps, result = { minutes: +((Date.now() - T0) / 60000).toFixed(1), reached: stages.map(s => s.name).filter(n => n !== 'start' && n !== 'end'), stages: stages.map(s => ({ name: s.name, secs: s.secs })), findings: log, fired, errors: errs, fps };
  fs.writeFileSync(path.join(OUT, 'run.json'), JSON.stringify(result, null, 1));
  console.log(JSON.stringify({ out: OUT, reached: result.reached.length, stages: result.stages, findings: log.map(l => l.kind + ': ' + l.what), errors: errs.slice(0, 5), fps }, null, 1));
  await b.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
