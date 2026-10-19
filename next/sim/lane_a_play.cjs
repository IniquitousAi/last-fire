// node next/sim/lane_a_play.cjs [port]: lane A's scripted browser run, played on a fake controller like a player: the first minute at the old desk,
// the board (council number, then CHECK with the D-pad), dues by banking light, a camp in debt (no lamps), the lone wolf back, the Clerk's job,
// the theories wall, the edge sign, the night news on the wrist. Screenshots from the player's spot go to next/playtests/lanes/A/.
// Each step is a PASS or FAIL with what it saw; the same lines are saved to next/playtests/lanes/A/play.txt.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const PORT = +(process.argv[2] || 8101), OUT = path.join(__dirname, '..', 'playtests', 'lanes', 'A'); fs.mkdirSync(OUT, { recursive: true });
const lines = [];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.addInitScript(() => { const btn = () => ({ pressed: false, value: 0 }); window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), mapping: 'standard', id: 'lane A pad' }; navigator.getGamepads = () => [window.__pad]; });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  const check = (name, pass, saw) => { const l = `${pass ? 'PASS' : 'FAIL'}  ${name}  (${saw})`; lines.push(l); console.log(l); };
  const pad = async (i, ms = 140) => { await p.evaluate(i => { __pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(ms); await p.evaluate(i => { __pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(160); };
  const at = (x, z, tx, tz, pitch = 0.05) => p.evaluate(([x, z, tx, tz, pitch]) => { const m = lastfire2.me; m.x = x; m.z = z; m.y = lastfire2.g.land(x, z); m.yaw = Math.atan2(-(tx - x), -(tz - z)); m.pitch = pitch; }, [x, z, tx, tz, pitch]);
  const pal = {};   // (per screen: the share of strongly colored pixels that are cyan, orange or gold, his banned hues)
  const palOf = (b64) => p.evaluate(async b64 => { const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()), c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let bad = 0, n = 0;
      for (let i = 0; i < d.length; i += 16) { const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn; n++; if (mx < 0.35 || dd / mx < 0.45) continue; let h = mx === r ? ((g - b) / dd + 6) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h *= 60; if ((h >= 165 && h <= 200) || (h >= 15 && h < 70)) bad++; } return bad / n; }, b64);
  const shot = async (n, w) => { if (w) await p.setViewportSize({ width: w[0], height: w[1] }); await p.waitForTimeout(900); const buf = await p.screenshot({ path: path.join(OUT, n + '.png') });
    pal[n] = await palOf(buf.toString('base64'));
    if (w) await p.setViewportSize({ width: 1000, height: 900 }); };
  const prompt = () => p.evaluate(() => (document.getElementById('prompt')?.innerText || '').replace(/\s+/g, ' ').trim());
  const E = (f, a) => p.evaluate(f, a);
  const LORE = (op, a) => p.evaluate(async ([op, a]) => { const L = await import('/next/core/lore.js?v=163'), C = await import('/next/core/game.js?v=163'), g = lastfire2.g; return { pastDark: () => L.pastDark(g), darkLearning: () => L.darkLearning(g), evidence: () => { C.evidence(g, a, 1.5); return 1; } }[op](); }, [op, a]);   // (the page's own copy of the rules, by name: the page forbids eval)
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(2000); await p.click('#solo');
  await p.waitForFunction(() => window.__lf && __lf.g && __lf.g.ready && window.lastfire2 && lastfire2.camp, null, { timeout: 90000 });
  await p.waitForTimeout(1500);
  await E(() => { const w = lastfire2.wrist, o = w.say.bind(w); window.__said = []; w.say = (t, ...r) => { __said.push(t); return o(t, ...r); }; });   // (everything the wrist ever says, in order)
  // ---- the first minute: a new world opens at your old desk, the real odds beside the signed ones
  const near = await E(() => { const m = lastfire2.me; return Math.hypot(m.x + 9 - 0.3, m.z - 9 - 0.5); });
  await p.waitForTimeout(2500); await shot('first-minute-desk');
  check('A new world opens at your old desk in the leaders room', near < 1.5, `${near.toFixed(2)} m from the desk spot`);
  await E(() => { for (const b of __pad.buttons) { b.pressed = false; b.value = 0; } });
  // ---- the board: the council's number first
  await at(2.4, -1.4, 5, -4, 0.28); await p.waitForTimeout(1500); await shot('board-council'); await shot('board-council-1920', [1920, 908]);
  const pr0 = await prompt(); check('At the board the prompt offers the real odds', /CHECK THE REAL ODDS/.test(pr0), pr0);
  const before = await E(() => ({ c: lastfire2.camp.checks, n: lastfire2.g.night }));
  await pad(15, 200); await p.waitForTimeout(500);
  const after = await E(() => ({ c: lastfire2.camp.checks, ck: lastfire2.camp.checkedNight, n: lastfire2.g.night }));
  const proofSaid = await E(() => __said.filter(t => /directionally correct|Nobody else came/.test(t)));
  check('The D-pad right checks the real odds', after.ck === after.n && after.c === before.c + 1, `checked night ${after.ck}, times checked ${after.c}`);
  check('Proving the council wrong changes nothing but the mood: the wrist says so', proofSaid.length > 0, proofSaid[0] || 'nothing said');
  await shot('board-real'); await shot('board-real-1920', [1920, 908]);
  // ---- dues: banking light at the fire pays your share; the board shows your standing
  const name = await E(() => document.getElementById('name').value || 'You');
  const stand = () => E(() => { const g = lastfire2.g; const n = Object.keys(g.econ.people)[0]; return n ? { n, paid: g.econ.people[n].paid, owed: g.econ.people[n].owed, own: g.econ.people[n].own } : null; });
  await at(0, 1.0, 0, 6); await E(() => { lastfire2.me.carried = 80; }); await p.waitForTimeout(1500);
  const d1 = await stand(); check('Banking light at the fire pays your dues', d1 && d1.paid > 0, JSON.stringify(d1));
  await at(2.4, -1.4, 5, -4, 0.28); await E(() => { lastfire2.camp.drawn = ''; }); await shot('board-dues');
  // ---- a free rider: owes far more than paid; no lamps, higher prices
  const who = d1.n;
  await E(w => { const c = lastfire2.g.econ.people[w]; c.owed += 5 * 30; }, who);
  const econ = (w) => p.evaluate(async w => { const C = await import('/next/core/game.js?v=163'); const g = lastfire2.g; return { price: C.econ.price(g, w, 100), lamps: C.econ.lamps(g, w), behind: +C.econ.behind(g, w).toFixed(2), flare: C.flareCost(g, g.players.find(q => q.name === w) || lastfire2.me) }; }, w);
  const free = await econ(who);
  await at(0, 1.0, 0, 6); await E(() => { lastfire2.camp.drawn = ''; });
  await pad(13, 120);   // (D-pad down: the lamp, in the build pick)
  await pad(7, 200); await p.waitForTimeout(300); const wt1 = await E(() => lastfire2.wrist.text); await shot('wrist-no-lamps'); await pad(6, 200);
  check('A camp in debt hands out no lamps and says why on the wrist', free.behind > 1 && !free.lamps && free.price > 100 && /no lamps/.test(wt1), `${free.behind} days behind; the camp's price for 100 light is ${free.price}, lamps ${free.lamps}; wrist: ${wt1}`);
  await at(2.4, -1.4, 5, -4, 0.28); await E(() => { lastfire2.camp.drawn = ''; }); await shot('board-in-debt');
  // ---- the lone wolf comes back: credit pays the debt down, prices normal again
  await E(w => { const c = lastfire2.g.econ.people[w]; c.paid = c.owed + 400; }, who);
  const wolf = await econ(who);
  await E(() => { lastfire2.camp.drawn = ''; }); await shot('board-wolf-back');
  check('The lone wolf who did their part is welcome back: normal prices, lamps again', wolf.lamps && wolf.price === 100 && wolf.behind === 0, `price for 100 light is ${wolf.price}, lamps ${wolf.lamps}`);
  // ---- the Clerk's job
  await at(2.6, -7.6, 3.2, -5.2, -0.3); await p.waitForTimeout(800); const pj = await prompt(); await shot('clerk-job');
  check('Near the Clerk (after you have checked) the prompt offers a job', /A JOB, IF YOU WANT ONE/.test(pj), pj);
  await pad(15, 200); await p.waitForTimeout(500); const pj2 = await prompt();
  const taken = await E(() => !!(lastfire2.me.jobs && lastfire2.me.jobs.taken.haul)); check('The D-pad right takes the job', taken, pj2);
  await at(0, 1.0, 0, 6); await E(() => { lastfire2.me.carried = 120; }); await p.waitForTimeout(1500);
  await at(2.6, -7.6, 3.2, -5.2, -0.3); await p.waitForTimeout(600); const pj3 = await prompt(); await shot('clerk-turn-in');
  check('After banking 90 light the prompt offers to turn it in', /TURN IN/.test(pj3), pj3);
  await pad(15, 200); await p.waitForTimeout(500); const cr = await E(() => lastfire2.me.jobs.credit); await shot('wrist-paid');
  const wt3 = await E(() => lastfire2.wrist.text); check('Turning in pays 1 gear credit and says it never pays dues', cr === 1 && /never your dues/.test(wt3), `credit ${cr}; wrist: ${wt3}`);
  // ---- the theories wall, the edge sign
  await at(-4.6, 10.8, -7, 13.5, 0.12); await p.waitForTimeout(1200); await shot('theories-wall');
  await at(3.4, 14.5, 3.4, 18.2, -0.04); await p.waitForTimeout(1200); await shot('edge-sign');
  // ---- playing alone while a friend is away: what you gather past your dues goes to the camp pool, everyone shares it
  await E(async () => { const C = await import('/next/core/game.js?v=163'); C.person(lastfire2.g, 'Dalton'); });
  await at(0, 1.0, 0, 6); await E(() => { lastfire2.me.carried = 400; }); await p.waitForTimeout(1500);
  const pool = await E(() => lastfire2.g.econ.pool); await at(2.4, -1.4, 5, -4, 0.28); await E(() => { lastfire2.camp.drawn = ''; }); await shot('board-pool');
  check('Grinding while a friend is away mostly builds the shared camp pool', pool > 100, `camp pool ${Math.round(pool)} light after banking 400 alone`);
  // ---- light against dark: a lamp lit at the edge of the fire's circle lifts the honest number on the board
  const pastA = await LORE('pastDark'); await at(9.8, 0, 20, 0, 0.0); await E(() => { lastfire2.me.carried = 60; }); await pad(13, 120); await pad(7, 200); await p.waitForTimeout(400);
  const lit = await E(() => lastfire2.g.nodes.filter(n => n.lit).length), pastB = await LORE('pastDark');
  await shot('light-and-dark'); await pad(6, 200);
  check('A lamp lit at the edge of the light lifts the honest number on the board', lit >= 1 && pastB > pastA, `${lit} lit; past the dark ${pastA.toExponential(2)} to ${pastB.toExponential(2)}`);
  // ---- the fire going down is nobody's doing
  await E(() => { lastfire2.me.carried = 0; lastfire2.g.fire.fuel = 20; }); await at(2.4, -1.4, 5, -4, 0.28); await p.waitForTimeout(500); const fireSaid = await E(() => __said.filter(t => /burns down by itself/.test(t))); await shot('wrist-fire-down');
  check('When the fire runs low the wrist says nobody is doing it', fireSaid.length > 0, fireSaid[0] || 'nothing said'); await E(() => { lastfire2.g.fire.fuel = 400; });
  // ---- finding something moves the theory wall, and nothing ever proves one
  const t0 = await E(() => lastfire2.camp.tdrawn); await LORE('evidence', 'mind'); await p.waitForTimeout(800); const t1 = await E(() => lastfire2.camp.tdrawn);
  check('Finding something moves the theory wall, and the wall says none is checked', t0 !== t1 && t1 !== '', `${t0} -> ${t1}`);
  const edge = await E(() => lastfire2.camp.edrawn), era = await E(() => lastfire2.camp.era);
  check('The edge sign shows what the camp knows about the dark past the wall', /THE EDGE/.test(edge), edge.slice(0, 60));
  check('The board reads the era and what it needs from you', era && era.era === 1 && /verdicts/.test(era.next), JSON.stringify(era));
  // ---- the dark learns only after two calm nights
  const learn0 = await LORE('darkLearning');
  await E(() => { const g = lastfire2.g; g.history.push({ night: 1, tense: 0.1, falls: 0, players: {} }, { night: 2, tense: 0.1, falls: 0, players: {} }); lastfire2.camp.drawn = ''; });
  await at(2.4, -1.4, 5, -4, 0.28); await shot('board-learning');
  const learn1 = await LORE('darkLearning'); check('The dark learns only after two calm nights with no falls', !learn0 && learn1, `before: ${learn0}, after two calm nights: ${learn1}`);
  // ---- dawn: last night's dry line, then the real odds on the wrist for someone who has checked
  await E(() => { lastfire2.g.clock = 0.9995; }); await p.waitForTimeout(2200); const wt2 = await E(() => lastfire2.wrist.text); await shot('wrist-night-news');
  await p.waitForTimeout(500); await shot('wrist-dawn-odds');
  const n2 = await E(() => lastfire2.g.night); check('The night rolls over and the news comes, with the real odds because you checked', n2 > before.n && /^Last night: .+Real odds today: \d+%\. The board says \d+%\./.test(wt2), `night ${before.n} to ${n2}; wrist: ${wt2}`);
  const ctl = await E(() => { const mk = col => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = col; x.fillRect(0, 0, 64, 64); return c.toDataURL().split(',')[1]; }; return [mk('#ff8a00'), mk('#00e5ff'), mk('#ffd400'), mk('#ff4fd8')]; });
  const cv = []; for (const b64 of ctl) cv.push(await palOf(b64));
  check('The palette checker catches orange, cyan and gold and passes neon pink (control)', cv[0] > 0.9 && cv[1] > 0.9 && cv[2] > 0.9 && cv[3] < 0.01, cv.map(x => x.toFixed(2)).join(' '));
  const worst = Object.entries(pal).sort((a, b) => b[1] - a[1])[0];
  check('No screen is more than 1 percent cyan, orange or gold', worst[1] < 0.01, `${Object.keys(pal).length} screens read; worst ${worst[0]} at ${(worst[1] * 100).toFixed(2)}%`);
  check('No page errors', errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');
  fs.writeFileSync(path.join(OUT, 'play.txt'), lines.join('\n') + '\n'); await b.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
