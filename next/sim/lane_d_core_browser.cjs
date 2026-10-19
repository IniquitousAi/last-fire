// Checklist 52, "Browser first; core/ stays separate for a Godot port". Needs a static server at PORT (use --bind 127.0.0.1).
// 1. The same night, run through core/ headless in node and inside the browser page (same module, same seed taken from the live game): the ground, the fire and the
//    whole night's log must be identical. 2. core/ never leaks client/ (or src/, three.js, the DOM) into itself: no import leaves core/ except the files in core/.
// Saves the browser's shot of that seed at the first event of the night (dusk) and the two logs to OUT for the side-by-side picture.
const { chromium } = require('C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 8092, OUT = process.env.OUT || 'next/playtests/lanes/D/';
let fails = 0; const say = (ok, name, detail) => { if (!ok) fails++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  (' + detail + ')'); };
// ---- no leaks from client/ into core/
const coreDir = path.join(__dirname, '..', 'core'), bad = [], files = fs.readdirSync(coreDir).filter(f => f.endsWith('.js'));
for (const f of files) { const src = fs.readFileSync(path.join(coreDir, f), 'utf8').split('\n');
  src.forEach((line, i) => { const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, ''); const m = code.match(/^\s*(?:import|export)\b[^'"]*from\s*['"]([^'"]+)['"]/) || code.match(/\bimport\s*\(\s*['"]([^'"]+)['"]/) || code.match(/^\s*import\s*['"]([^'"]+)['"]/);
    if (m && !/^\.\/[A-Za-z0-9_]+\.js(\?v=\d+)?$/.test(m[1])) bad.push(`${f}:${i + 1} imports ${m[1]}`);
    if (/(?<![.\w])(document|localStorage|sessionStorage|navigator|requestAnimationFrame|THREE|AudioContext|XMLHttpRequest)\b|(?<![.\w'"])window\s*[.[]/.test(code.replace(/(['"`]).*?\1/g, ''))) bad.push(`${f}:${i + 1} touches the browser: ${code.trim().slice(0, 60)}`); }); }
say(bad.length === 0 && files.length >= 10, 'core/ imports only core/ files and touches no browser or three.js globals', `${files.length} files checked${bad.length ? '; ' + bad.slice(0, 4).join('; ') : ''}`);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(2500); await p.click('#solo');
  await p.waitForFunction(() => window.__lf && __lf.me && __lf.g && __lf.g.ready, null, { timeout: 280000 }); await p.waitForTimeout(2500);
  const seed = await p.evaluate(() => __lf.g.seed);
  const node = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'lane_d_core_run.mjs'), String(seed)], { encoding: 'utf8', maxBuffer: 1 << 24 }));
  const web = await p.evaluate(async seed => (await import('/next/sim/lane_d_core_run.mjs')).run(seed), seed);
  // the live browser game's own ground must be the same ground the headless core computes
  const live = await p.evaluate(probes => probes.map(([x, z]) => +__lf.g.land(x, z).toFixed(6)), node.probes);
  say(Number.isInteger(seed), 'the live browser game has a seed', String(seed));
  say(JSON.stringify(live) === JSON.stringify(node.probes.map(q => q[2])), "the browser game's ground matches core/ run headless in node (5 spots)", `node ${node.probes.map(q => q[2]).join(', ')}; browser ${live.join(', ')}`);
  say(JSON.stringify(node) === JSON.stringify(web), 'the same night through core/ is identical in node and in the browser (ground, fire, kills, falls, whole log)', `${node.logLines} log lines, hash ${node.logHash} in both; ${node.kills} kills, ${node.falls} falls`);
  // the browser's picture of that seed at the night's first event (dusk)
  await p.evaluate(() => { const g = __lf.g, m = __lf.me; g.clock = 0.52; m.x = 6; m.z = 12; m.y = g.land(m.x, m.z); m.yaw = Math.atan2(-(0 - m.x), -(0 - m.z)); m.pitch = 0.05; }); await p.waitForTimeout(3500);
  await p.screenshot({ path: OUT + 'core-browser-shot.png' }); fs.writeFileSync(OUT + 'core-vs-browser.json', JSON.stringify({ seed, node, web }, null, 1));
  say(!errs.length, 'no errors in the page', errs.join(' | ').slice(0, 200) || 'none');
  console.log(fails ? fails + ' FAILED' : 'all pass'); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
