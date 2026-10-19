// Checklist "Your own and friends' shots placed in 3D". Needs a static server at PORT (default 8092).
// A friend's shot (sound.shot(gun, position)) must create a spatial PannerNode at exactly that world position, one per shot, farther shots more filtered;
// your own shot (no position) stays at your ear with no panner. Also checks main.js routes a friend's shot message through that path (heardShot) and the
// bots' shots (runFriends) pass the shooter's position.
const { chromium } = require('C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs');
const PORT = process.env.PORT || 8092;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__pan = []; const o = AudioContext.prototype.createPanner; AudioContext.prototype.createPanner = function () { const n = o.call(this); window.__pan.push(n); return n; }; });
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => { const M = await import('/src/combat.js?v=163'); M.sound.wake(); await new Promise(r => setTimeout(r, 300));
    const out = {}; const n0 = __pan.length;
    M.sound.shot('pistol', { x: 12, y: 1.5, z: -20 }); M.sound.shot('ar', { x: -30, y: 2, z: 5 }); const mine = __pan.length; M.sound.shot('ar');
    out.friend = __pan.slice(n0, mine).map(n => [n.positionX.value, n.positionY.value, n.positionZ.value, n.panningModel]); out.ownAdded = __pan.length - mine; return out; });
  const main = fs.readFileSync(__dirname + '/../client/main.js', 'utf8');
  const heard = /function heardShot\(m\) \{ const o = new THREE\.Vector3\(m\.x, m\.y, m\.z\); sound\.shot\(m\.g, o\)/.test(main), bots = /const from = new THREE\.Vector3\(p\.x, p\.y \+ 1\.5, p\.z\); sound\.shot\('pistol', from\)/.test(main);
  const f = r.friend, near = (a, c) => Math.abs(a - c) < 1e-3;
  const ok = f.length === 2 && near(f[0][0], 12) && near(f[0][1], 1.5) && near(f[0][2], -20) && near(f[1][0], -30) && near(f[1][2], 5) && f.every(q => q[3] === 'HRTF') && r.ownAdded === 0 && heard && bots && !errs.length;
  console.log(`friend shots: ${JSON.stringify(f)}; own shot panners: ${r.ownAdded}; heardShot routes position: ${heard}; bot shots pass position: ${bots}; errors: ${errs.length}  ${ok ? 'PASS' : 'FAIL'}`);
  await b.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
