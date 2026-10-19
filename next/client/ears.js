// Ears: Daniel talks out loud while he plays; each spoken stretch goes to his own PC (127.0.0.1:8093, voice/game_ears.py in
// vibe-lab), is turned into words there, and reaches Claude. Nothing leaves his PC. On anyone else's PC the ping fails and the
// mic is never asked for. His words, 2026-10-19: "a loop of me playing a video game and talking out loud. And that's the whole gig."
const EARS = 'http://127.0.0.1:8093';
const START = 0.035, QUIET_MS = 1200, MAX_MS = 30000, MIN_MS = 600;   // (speech level to start, silence that ends a stretch, longest stretch)

export async function startEars(version) {
  try {
    const r = await fetch(EARS + '/ping', { signal: AbortSignal.timeout(1500) });
    if (!r.ok) return null;
  } catch { return null; }   // (not his PC, or the ears are off: the game plays exactly as before)

  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
  catch { return null; }

  const dot = document.createElement('div');   // (a small honest sign the mic is on: bottom left, out of the way)
  dot.style.cssText = 'position:fixed;left:14px;bottom:12px;z-index:50;font:12px/1 "JetBrains Mono",Consolas,monospace;letter-spacing:.08em;color:#ff2a8d;pointer-events:none;opacity:.8';
  dot.textContent = '● MIC';
  document.body.appendChild(dot);

  const ctx = new AudioContext(), an = ctx.createAnalyser(); an.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(an);
  const buf = new Float32Array(an.fftSize);
  let rec = null, chunks = [], began = 0, lastLoud = 0;

  const send = async (blob, ms) => {
    if (ms < MIN_MS) return;
    try { await fetch(EARS + '/hear', { method: 'POST', body: blob, headers: { 'X-Game-Version': String(version || '') } }); } catch {}
  };
  const stop = () => {
    if (!rec) return;
    const r = rec, ms = performance.now() - began; rec = null;
    r.onstop = () => send(new Blob(chunks, { type: r.mimeType }), ms);
    r.stop();
  };

  setInterval(() => {
    if (ctx.state === 'suspended') ctx.resume();
    an.getFloatTimeDomainData(buf);
    let s = 0; for (const v of buf) s += v * v;
    const level = Math.sqrt(s / buf.length), now = performance.now();
    if (level > START) lastLoud = now;
    if (!rec && level > START) {
      chunks = []; rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.start(); began = now;
      dot.style.opacity = '1';
    } else if (rec && (now - lastLoud > QUIET_MS || now - began > MAX_MS)) {
      stop(); dot.style.opacity = '.8';
    }
  }, 50);
  return { stop };
}
