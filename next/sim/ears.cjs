// node next/sim/ears.cjs <sentence.wav>: the talk-while-you-play loop, end to end. A real browser opens the game with a fake mic that plays
// the wav, one click starts the ears, and the words must land in vibe-lab/twin/data/voice-notes.jsonl through the local Whisper (8093).
// Needs the "Last Fire" preview server (8092) and voice/game_ears.py running. Rows it causes are removed again.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const NOTES = 'C:/Users/danie/Desktop/projects/vibe-lab/twin/data/voice-notes.jsonl';
(async () => {
  const wav = process.argv[2]; if (!wav) { console.log('FAIL: give a wav'); process.exit(1); }
  const before = fs.existsSync(NOTES) ? fs.readFileSync(NOTES, 'utf8') : '';
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + wav, '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8092/next/'); await p.waitForTimeout(2500);
  await p.mouse.click(500, 880);   // (a click anywhere starts the ears; the bottom edge is empty menu space)
  let got = '';
  for (let t = 0; t < 40 && !got; t++) {
    await p.waitForTimeout(1000);
    const now = fs.existsSync(NOTES) ? fs.readFileSync(NOTES, 'utf8') : '';
    if (now.length > before.length) got = now.slice(before.length);
  }
  const mic = await p.evaluate(() => [...document.querySelectorAll('div')].some(d => d.textContent === '● MIC'));
  await b.close();
  fs.writeFileSync(NOTES, before);   // (the test's own words are not his)
  const text = got.split('\n').filter(Boolean).map(l => JSON.parse(l).text).join(' | ');
  console.log(`${mic ? 'PASS' : 'FAIL'} the MIC sign shows`);
  console.log(`${text ? 'PASS' : 'FAIL'} words reached the notes: ${text || '(nothing in 40 s)'}`);
  console.log(`${errs.length ? 'FAIL' : 'PASS'} no page errors${errs.length ? ': ' + errs[0] : ''}`);
  process.exit(mic && text && !errs.length ? 0 : 1);
})();
