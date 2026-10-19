// node next/sim/audio_run.cjs   Lane B audio: the real client at night in a real browser, its WebAudio output tapped (an AnalyserNode fanned off every
// connection to the destination), a spectrogram picture saved (next/playtests/lanes/B/audio-spectrogram.png), and checks that the camp's murmur, the wind,
// the fire's crackle, far sounds, footsteps and hits all appear, and that no sound repeats a clip twice in a row. PORT env (default 8102).
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 8102, OUT = path.join(__dirname, '..', 'playtests', 'lanes', 'B'); fs.mkdirSync(OUT, { recursive: true });
let fail = 0; const check = (name, ok, saw) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${saw})`); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.addInitScript(() => {
    const btn = () => ({ pressed: false, value: 0 }); window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), mapping: 'standard', id: 'robot pad' }; navigator.getGamepads = () => [window.__pad];
    window.__taps = []; const orig = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest, ...a) { const r = orig.call(this, dest, ...a); try { if (dest && dest.constructor && dest.constructor.name === 'AudioDestinationNode') { const c = this.context; if (!c.__tap) { const an = c.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0; c.__tap = an; window.__taps.push(an); } orig.call(this, c.__tap); } } catch (e) {} return r; };
  });
  await ctx.route('**/peerjs*', r => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('page error', e.message));
  await p.goto(`http://localhost:${PORT}/next/?shot&test`); await p.waitForTimeout(2000); await p.fill('#name', 'Robo'); await p.click('#solo');
  await p.waitForFunction(() => window.lastfire2 && lastfire2.g && lastfire2.g.ready && lastfire2.me, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.mouse.click(500, 450); await p.waitForTimeout(500);
  await p.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => /SKIP THE GUIDE/.test(x.innerText)); if (bt) bt.click(); });
  const v = await p.evaluate(() => (document.querySelector('script[src*="main.js"]').src.match(/v=(\d+)/) || [])[1]);
  // one recorder in the page: a row of 128 spectrum bins every 100 ms, tagged with the phase and the ambience's own gains
  await p.evaluate(v => { window.__rows = []; window.__phase = 'start'; window.__vv = v; const buf = new Uint8Array(512);
    setInterval(() => { const row = new Uint8Array(128); for (const an of window.__taps) { an.getByteFrequencyData(buf); for (let i = 0; i < 128; i++) row[i] = Math.max(row[i], buf[i]); } window.__rows.push({ ph: window.__phase, row: Array.from(row), st: window.__amb && window.__amb.state }); }, 100); }, v);
  const phase = async (name, ms, f) => { await p.evaluate(n => { window.__phase = n; }, name); if (f) await f(); await p.waitForTimeout(ms); };
  const stick = (x, y) => p.evaluate(([x, y]) => { __pad.axes = [x, y, 0, 0]; }, [x, y]);
  await p.evaluate(async () => { const S = (await import(`/src/combat.js?v=${window.__vv}`)).sound; S.heard.__log = []; window.__sound = S; const g = lastfire2.g; g.holdDay = true; g.clock = 0.3; g.fire.fuel = 400; });
  // 1. at the camp by day: the murmur, the fire, footsteps on the camp plates
  await phase('camp', 9000, async () => { await p.evaluate(() => { const g = lastfire2.g, me = lastfire2.me; me.x = g.fire.x + 4; me.z = g.fire.z + 2; }); await stick(0, -1); setTimeout(() => stick(0, 0), 1200); });
  await stick(0, 0);
  // 2. out in the dark at night: the wind all around, far sounds from shapes out there, hits
  await phase('dark', 42000, async () => { await p.evaluate(() => { const g = lastfire2.g, me = lastfire2.me; g.holdDay = true; g.clock = 0.75; g.fire.fuel = 400; me.x = g.fire.x + 70; me.z = g.fire.z; for (let i = 0; i < 5; i++) { const a = i * 1.3; g.hollow.push({ id: g.nextId++, kind: 'walker', x: me.x + Math.cos(a) * 60, z: me.z + Math.sin(a) * 60, y: 0, yaw: 0, hp: 1e9, max: 1e9, sh: 0, sb: 0, cd: 0, dead: false, speed: 0 }); } }); await stick(0, -1); });
  for (let i = 0; i < 24; i++) { await p.evaluate(i => { __sound.hit(i % 5 === 0); if (i % 3 === 0) __sound.kill(); }, i); await p.waitForTimeout(250); }
  await stick(0, 0);
  const R = await p.evaluate(() => ({ rows: window.__rows, far: window.__far || [], log: window.__sound.heard.__log }));
  // spectrogram picture, drawn in the page so it needs nothing else
  const png = await p.evaluate(rows => { const W = Math.min(rows.length, 900), H = 128, c = document.createElement('canvas'); c.width = W + 120; c.height = H * 2 + 40; const x = c.getContext('2d'); x.fillStyle = '#05060b'; x.fillRect(0, 0, c.width, c.height);
    const step = rows.length / W; for (let i = 0; i < W; i++) { const r = rows[Math.floor(i * step)].row; for (let j = 0; j < H; j++) { const a = r[j] / 255; x.fillStyle = `rgb(${Math.round(255 * Math.pow(a, 0.8))},${Math.round(79 * a)},${Math.round(216 * Math.pow(a, 0.6))})`; x.fillRect(i, (H - 1 - j) * 2, 1, 2); } }
    x.fillStyle = '#eef0f8'; x.font = '13px sans-serif'; x.fillText('0 Hz', W + 8, H * 2 - 4); x.fillText('~5.5 kHz', W + 8, 14); let last = null; rows.forEach((r, i) => { if (r.ph !== last) { last = r.ph; const px = Math.floor(i / step); x.fillStyle = '#ff4fd8'; x.fillRect(px, 0, 1, H * 2); x.fillStyle = '#eef0f8'; x.fillText(r.ph, px + 4, H * 2 + 22); } });
    return c.toDataURL('image/png'); }, R.rows);
  fs.writeFileSync(path.join(OUT, 'audio-spectrogram.png'), Buffer.from(png.split(',')[1], 'base64')); console.log('  saved audio-spectrogram.png');
  await b.close();
  const rows = R.rows, by = ph => rows.filter(r => r.ph === ph), mean = (rs, lo, hi) => rs.reduce((s, r) => s + r.row.slice(lo, hi).reduce((a, c) => a + c, 0) / (hi - lo), 0) / Math.max(1, rs.length);
  const camp = by('camp'), dark = by('dark'), st = rs => rs.map(r => r.st).filter(Boolean);
  check('the audio tap heard the game (spectrum rows with sound in them)', rows.length > 200 && mean(rows, 0, 128) > 1, `${rows.length} rows, mean level ${mean(rows, 0, 128).toFixed(1)} of 255`);
  const mc = st(camp).map(s => s.murmur), md = st(dark).map(s => s.murmur);
  check('the camp murmur is there inside the camp and gone far out', Math.max(...mc) > 0.03 && Math.max(...md) < 0.01, `murmur gain at camp ${Math.max(...mc).toFixed(3)}, out in the dark ${Math.max(...md).toFixed(4)}`);
  check('the voice bands (400 to 2000 Hz) carry energy at the camp', mean(camp, 9, 46) > 3, `mean level ${mean(camp, 9, 46).toFixed(1)}`);
  const med = a => { const q = [...a].sort((x, y) => x - y); return q[Math.floor(q.length / 2)]; }, wc = st(camp).slice(-40).map(s => s.wind), wd = st(dark).slice(-100).map(s => s.wind);
  check('the wind is far in the light and all around you in the dark', med(wd) > 2 * med(wc) && mean(dark, 1, 9) > 2, `wind gain at the camp ${med(wc).toFixed(2)} vs in the dark ${med(wd).toFixed(2)}; low band level ${mean(dark, 1, 9).toFixed(1)}`);
  let snaps = 0; for (let i = 1; i < rows.length; i++) if (rows[i].row.slice(46, 128).reduce((a, c) => a + c, 0) > rows[i - 1].row.slice(46, 128).reduce((a, c) => a + c, 0) + 400) snaps++;
  check('the fire crackles (bright snaps rise over the roar)', snaps >= 5, `${snaps} bright snaps in ${(rows.length / 10).toFixed(0)} s`);
  const far = R.far, repeats = far.filter((x, i) => far.slice(Math.max(0, i - 4), i).includes(x)).length;
  check('far sounds come from the shapes out there, at least 3 different voices, none repeating within 4', far.length >= 3 && new Set(far).size >= 3 && repeats === 0, `${far.length} sounds: ${far.join(' ')}`);
  const log = R.log, keys = [...new Set(log.map(l => l[0]))]; let twice = 0; const per = {}; for (const k of keys) { const seq = log.filter(l => l[0] === k).map(l => l[1]); per[k] = seq.length; for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) twice++; }
  check('footsteps, hit ticks and kill ticks: no clip twice in a row', twice === 0 && keys.length >= 3 && Object.values(per).every(n => n >= 5), `${JSON.stringify(per)}, ${twice} repeats`);
  console.log(fail ? `\n${fail} FAILED` : '\nall passed'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
