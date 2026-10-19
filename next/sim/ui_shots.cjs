// node next/sim/ui_shots.cjs [port]: screenshots of the screens' look (loading, steel HUD frames and keys, chevron crosshair, cracked visor, day and
// night dial, compass colors) at 1000x900 and 1920x908, into next/playtests/lanes/A/ui/. Also checks the loading bar's progress is real.
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const PORT = +(process.argv[2] || 8092), OUT = path.join(__dirname, '..', 'playtests', 'lanes', 'A', 'ui'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(), errs = [], out = []; p.on('pageerror', e => errs.push(e.message));
  const W = [[1000, 900, '1000'], [1920, 908, '1920']];
  const shot = async n => { for (const [w, h, t] of W) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(700); await p.screenshot({ path: path.join(OUT, `${n}-${t}.png`) }); } await p.setViewportSize({ width: 1000, height: 900 }); };
  const line = (n, ok, saw) => { const l = `${ok ? 'PASS' : 'FAIL'}  ${n}  (${saw})`; out.push(l); console.log(l); };
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(2500);
  await p.evaluate(() => { const o = document.getElementById('solo'); o.click(); });
  const seen = []; for (let i = 0; i < 40; i++) { const r = await p.evaluate(() => { const l = document.getElementById('loadscr'); return l && !l.hidden && !l.classList.contains('gone') ? [parseInt(l.querySelector('.bar i').style.width) || 0, l.querySelector('.ln').textContent] : null; }); if (r) { if (seen.length === 0) await p.screenshot({ path: path.join(OUT, 'loading-live-1000.png') }); seen.push(r); } else if (seen.length) break; await p.waitForTimeout(60); }
  await p.waitForFunction(() => window.__lf && __lf.g && __lf.g.ready, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  const pcts = seen.map(x => x[0]); line('The loading bar shows real progress while the world builds', seen.length > 1 && Math.max(...pcts) > Math.min(...pcts) && pcts.every((v, i) => i === 0 || v >= pcts[i - 1]), `${seen.length} readings, ${pcts.join(',')}%, last: ${seen.length ? seen[seen.length - 1][1] : ''}`);
  // the loading screen again, held open at 62 percent, at both sizes
  await p.evaluate(() => { const l = document.getElementById('loadscr'); l.hidden = false; l.classList.remove('gone'); l.querySelector('.bar i').style.transition = 'none'; l.querySelector('.bar i').style.width = '62%'; l.querySelector('.ln').textContent = 'building the ground, 31 tiles left'; window.dispatchEvent(new Event('resize')); });
  await shot('loading'); await p.evaluate(() => { const l = document.getElementById('loadscr'); l.hidden = true; });
  await p.evaluate(() => { for (const b of document.querySelectorAll('#hud button')) if (/SKIP THE GUIDE/.test(b.textContent)) b.click(); __lf.g.holdDay = true; __lf.g.clock = 0.3; const m = __lf.me; m.x = 2.4; m.z = -1.4; m.y = __lf.g.land(2.4, -1.4); m.yaw = Math.atan2(-(5 - 2.4), -(-4 + 1.4)); m.pitch = 0.2; });
  await shot('hud-day');
  await p.evaluate(() => { __lf.me.carried = 40; }); await p.waitForTimeout(500); await shot('hud-keys'); await p.evaluate(() => { __lf.me.carried = 0; });
  await p.evaluate(() => { __lf.g.clock = 0.75; }); await p.waitForTimeout(900); await shot('hud-night-dial');
  const dial = await p.evaluate(() => { const n = document.querySelector('#phase #needle'); return n ? n.getAttribute('transform') : null; }); line('The dial needle follows the clock', /rotate\(2[67]\d/.test(dial || ''), String(dial));
  await p.evaluate(() => { __lf.me.hp = 25; __lf.me.calm = -999; __lf.me.hurtT = 99; }); await p.waitForTimeout(300); await shot('damage');
  await p.evaluate(() => { __lf.me.hp = 25; __lf.me.calm = -999; __lf.me.hurtT = 99; }); const op = await p.evaluate(() => +document.getElementById('crack').style.opacity); line('Low health cracks the visor', op > 0.5, `opacity ${op}`);
  await p.evaluate(() => { __lf.me.hurtT = 0; __lf.me.hp = 100; }); await p.waitForTimeout(1800); const op2 = await p.evaluate(() => +document.getElementById('crack').style.opacity); line('The cracks fade as you heal', op2 < 0.05, `opacity ${op2}`);
  const cross = await p.evaluate(() => document.querySelectorAll('#cross path').length + ':' + document.querySelectorAll('#cross circle').length); line('The crosshair is two chevrons and a dot', cross === '4:2', cross + ' paths:circles (each drawn twice, dark edge under white)');
  const cc = await p.evaluate(() => { const f = getComputedStyle(document.querySelector('#compass .fire')).color, pg = document.querySelector('#compass i.ping'); return [f, pg ? getComputedStyle(pg).backgroundColor : 'none', getComputedStyle(document.querySelector('#compass i.breach')).borderTopColor]; });
  line('On the compass the fire (ours) is blue and the dark (pings, breach) is red', cc[0] === 'rgb(59, 107, 255)' && /rgb\(255, 59, 92\)/.test(cc[1] + cc[2]), cc.join(' | '));
  await p.screenshot({ path: path.join(OUT, 'crosshair-zoom.png'), clip: { x: 450, y: 400, width: 100, height: 100 } });
  line('No page errors', errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');
  fs.writeFileSync(path.join(OUT, 'ui.txt'), out.join('\n') + '\n'); await b.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
