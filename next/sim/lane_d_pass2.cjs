// Lane D second pass, one browser run (needs a static server at PORT, default 8092; shots go to OUT, default next/playtests/lanes/D/).
//  item 2  near things are real scans, far things strange: textured (image-map) meshes within 10 m of the eye in a camp shot, and strangeAt() grows with distance
//  item 6  walks the camp and Earth and counts box geometries in view (none but instanced kit pieces and shader volumes)
//  items 8, 11 (pad)  a fake controller cycles every gun and aims with LT; the sight is centered within 2 px
//  item 9  walking: two frames 0.5 s apart, the horizon at the same pixel row (strip saved)
//  item 10 a learned friend's shot is a tracer in 3D at the friend's muzzle, with a spatial sound there (photographed)
const { chromium } = require('C:/Users/danie/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const PORT = process.env.PORT || 8092, OUT = process.env.OUT || 'next/playtests/lanes/D/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1223/chrome-win64/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.addInitScript(() => { const btn = () => ({ pressed: false, value: 0 }); window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), mapping: 'standard', id: 'gate pad' }; navigator.getGamepads = () => [window.__pad];
    window.__pan = []; const o = AudioContext.prototype.createPanner; AudioContext.prototype.createPanner = function () { const n = o.call(this); window.__pan.push(n); return n; }; });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  let fails = 0; const say = (ok, name, detail) => { if (!ok) fails++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  (' + detail + ')'); };
  const press = async (i, ms = 150) => { await p.evaluate(i => { __pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(ms); await p.evaluate(i => { __pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(200); };
  const at = (x, z, tx, tz, pitch = 0.02) => p.evaluate(([x, z, tx, tz, pitch]) => { const m = __lf.me; m.x = x; m.z = z; m.y = __lf.g.land(x, z); m.yaw = Math.atan2(-(tx - x), -(tz - z)); m.pitch = pitch; }, [x, z, tx, tz, pitch]);
  await p.goto(`http://localhost:${PORT}/next/?shot`); await p.waitForTimeout(2500); await p.click('#solo');
  await p.waitForFunction(() => window.__lf && __lf.me && __lf.g && __lf.g.ready, null, { timeout: 280000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { for (const b of window.__pad.buttons) { b.pressed = false; b.value = 0; } }); await p.mouse.move(500, 450); await p.mouse.click(500, 450); await p.waitForTimeout(400);

  // ---- helpers run in the page: what is in view
  await p.evaluate(() => { window.__view = (maxD, onlyIn) => { const cam = __lf.camera, V = cam.position.constructor, M = cam.matrixWorldInverse.constructor, pm = new M().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse), v = new V(), out = [];
      __lf.scene.updateMatrixWorld(true);
      __lf.scene.traverse(o => { if (!o.isMesh) return; for (let q = o; q; q = q.parent) if (!q.visible) return; const geos = o.geometry, mats = Array.isArray(o.material) ? o.material : [o.material], inst = o.isInstancedMesh ? o.count : 1;
        for (let i = 0; i < inst; i++) { if (o.isInstancedMesh) { const m = new M(); o.getMatrixAt(i, m); m.premultiply(o.matrixWorld); v.setFromMatrixPosition(m); } else v.setFromMatrixPosition(o.matrixWorld); const d = v.distanceTo(cam.position); if (d > maxD) continue;
          const c = v.clone().applyMatrix4(pm); if (onlyIn && (c.z > 1 || Math.abs(c.x) > 1.15 || Math.abs(c.y) > 1.15)) continue; out.push({ type: geos.type, inst: !!o.isInstancedMesh, d, shader: mats.some(m => m && m.isShaderMaterial), tex: mats.some(m => m && m.map && m.map.image && !m.map.isCanvasTexture), name: (o.name || (mats[0] && mats[0].name) || '') + ' ' + (geos.parameters ? [geos.parameters.width, geos.parameters.height, geos.parameters.depth].map(n => n && +n.toFixed(2)).join('x') : '') + ' c' + ((mats[0] && mats[0].color) ? mats[0].color.getHexString() : '') + ' p' + (o.parent && o.parent.type) + ' ' + (o.parent && o.parent.name || '') }); } });
      return out; }; });

  // ---- item 2: near things are real scans
  await at(8, 12, 21, 0, 0.0); await p.waitForTimeout(2500);
  const near = await p.evaluate(() => __view(10, true).filter(o => o.type !== 'PlaneGeometry' || o.tex || true));
  const scans = near.filter(o => o.tex).length, plain = near.filter(o => !o.tex && !o.shader).length;
  say(near.length >= 10 && scans / Math.max(1, scans + plain) >= 0.6, 'near things (within 10 m, in view) are real scans', `${scans} with scan textures, ${plain} plain-colored, share ${(100 * scans / Math.max(1, scans + plain)).toFixed(0)}%`);
  const far = await p.evaluate(async () => { const I = await import('/next/core/immersion.js?v=170'), ks = [0, 60, 150, 300, 450, 600, 900].map(d => I.strangeAt(d, 0)); return { ks, disc: ks.map(k => I.skyOf(k).disc), stars: ks.map(k => I.skyOf(k).stars) }; });
  const inc = a => a.every((v, i) => i === 0 || v >= a[i - 1] - 1e-9) && a[a.length - 1] > a[0] + 0.2;
  say(far.ks[0] === 0 && inc(far.ks) && far.ks[far.ks.length - 1] >= 0.99 && inc(far.disc) && far.stars[0] > far.stars[far.stars.length - 1], 'far things get stranger with distance (strangeAt, sky disc grows, stars thin)', 'k ' + far.ks.map(k => k.toFixed(2)).join(' '));

  // ---- item 6: walk the camp and Earth, count box geometries in view
  const stops = [[0, 5, -8, -9], [8, 12, 21, 0], [-2, -4, 0, -20], [-3, 9, -7, 13.5], [10, 3, 18, -8], [-12, 4, -20, 0], [0, 6020, 0, 6060], [0, 6030, 0, 6060], [30, 6110, 0, 6040], [-27, 5950, -27, 5923], [60, 6000, 90, 6050], [5, 6012, 0, 6035]];
  let boxes = [], seen = 0;
  for (const [x, z, tx, tz] of stops) { await at(x, z, tx, tz, 0.05); await p.waitForTimeout(1800); const v = await p.evaluate(() => __view(160, true)); seen += v.length; for (const o of v) if (o.type === 'BoxGeometry' && !o.inst && !o.shader) boxes.push(`${o.name || '?'} at ${o.d.toFixed(0)} m near ${x},${z}`); }
  say(boxes.length === 0 && seen > 100, 'walking the camp and Earth: no code boxes in view (instanced kit pieces and shader volumes aside)', `${stops.length} stops, ${seen} things in view, ${boxes.length} boxes${boxes.length ? ': ' + [...new Set(boxes)].slice(0, 6).join('; ') : ''}`);

  // ---- items 8 and 11 on the pad: cycle every gun, aim with LT, sight centered
  await at(0, 5, -8, -30, 0.6); await p.waitForTimeout(500);
  const seenGuns = new Set(); const centroid = async () => { const png = (await p.screenshot()).toString('base64');
    return p.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const x0 = img.width / 2 - 22, y0 = img.height / 2 - 22, d = g.getImageData(x0, y0, 44, 44).data; let sx = 0, sy = 0, n = 0; for (let y = 0; y < 44; y++) for (let x = 0; x < 44; x++) { const i = (y * 44 + x) * 4, r = d[i], gg = d[i + 1], bb = d[i + 2]; if (r > 170 && gg < 120 && bb > 90 && r - gg > 90) { sx += x; sy += y; n++; } }
      return n < 6 ? null : { x: x0 + sx / n + 0.5 - img.width / 2, y: y0 + sy / n + 0.5 - img.height / 2 }; }, png); };
  const rows = [];
  for (let k = 0; k < 6; k++) { const gun = await p.evaluate(() => __lf.gunKey()); if (seenGuns.has(gun)) break; seenGuns.add(gun);
    await p.evaluate(() => { __pad.buttons[6] = { pressed: true, value: 1 }; }); await p.waitForTimeout(1800);
    let off; if (gun === 'ar' || gun === 'rail') { const c = await centroid(); off = c ? { x: c.x, y: c.y } : null; } else { const s = await p.evaluate(() => __lf.sight()); off = s ? { x: s.x, y: s.y } : null; }
    rows.push([gun, off]); await p.evaluate(() => { __pad.buttons[6] = { pressed: false, value: 0 }; }); await p.waitForTimeout(500); await press(3); }
  say(['pistol', 'shotgun', 'lmg', 'ar', 'rail'].every(g => seenGuns.has(g)), 'the pad (Y) cycles through every gun', [...seenGuns].join(', '));
  say(rows.length >= 5 && rows.every(([g, o]) => o && Math.abs(o.x) <= 2 && Math.abs(o.y) <= 2), 'aimed with LT on the pad, every gun\'s sight is centered within 2 px', rows.map(([g, o]) => g + ' ' + (o ? o.x.toFixed(1) + ',' + o.y.toFixed(1) : 'none')).join('; '));
  await p.evaluate(() => __lf.gun('ar'));

  // ---- item 9: walking, the horizon holds its row
  await p.evaluate(() => { __lf.aim(false); }); await at(0, -30, 0, -100, 0.0); await p.waitForTimeout(1500);   /* (open moon ground: the hills' edge against the sky is the horizon) */
  await p.keyboard.down('KeyW'); await p.waitForTimeout(700); const f0 = await p.evaluate(async () => { const src = __lf.renderer.domElement; await new Promise(r => requestAnimationFrame(r)); const c = document.createElement('canvas'); c.width = 800; c.height = 440; const g = c.getContext('2d'); g.drawImage(src, 50, 40, 800, 440, 0, 0, 800, 440); window.__f0 = g.getImageData(0, 0, 800, 440); return true; });
  await p.screenshot({ path: OUT + 'walk-0.png' }); await p.waitForTimeout(450);
  const shift = await p.evaluate(async () => { const src = __lf.renderer.domElement; await new Promise(r => requestAnimationFrame(r)); const c = document.createElement('canvas'); c.width = 800; c.height = 440; const g = c.getContext('2d'); g.drawImage(src, 50, 40, 800, 440, 0, 0, 800, 440); const B = g.getImageData(0, 0, 800, 440), A = window.__f0; const lum = (D, x, y) => { const i = (y * 800 + x) * 4; return D.data[i] * 0.3 + D.data[i + 1] * 0.59 + D.data[i + 2] * 0.11; };
    const prof = D => { const r = []; for (let y = 0; y < 440; y++) { let t = 0; for (let x = 0; x < 400; x += 2) t += lum(D, x, y); r.push(t / 200); } return r; }, PA = prof(A), PB = prof(B);   /* (one brightness number per pixel row, over the left half where the gun is not: a horizon is a step in this list wherever it sits sideways) */
    let best = 1e18, bd = 0, at0 = 0; for (let dy = -12; dy <= 12; dy++) { let sad = 0, n = 0; for (let y = 30; y < 400; y++) { sad += Math.abs(PA[y] - PB[y + dy]); n++; } sad /= n; if (dy === 0) at0 = sad; if (sad < best) { best = sad; bd = dy; } } return { dy: bd, sad0: at0, best }; });
  await p.screenshot({ path: OUT + 'walk-1.png' }); await p.keyboard.up('KeyW');
  say(Math.abs(shift.dy) <= 1, 'walking: the far scenery and horizon stay on the same pixel rows 0.5 s apart (best vertical shift between frames)', `shift ${shift.dy} px (match error ${shift.sad0.toFixed(1)} at 0, ${shift.best.toFixed(1)} at best)`);

  // ---- item 10: the learned friend's shot is a tracer in 3D, with a spatial sound at the muzzle
  const fr = await p.evaluate(() => { const g = __lf.g; let f = g.players.find(q => q.bot); return f ? { id: f.id, x: f.x, z: f.z } : null; });
  if (!fr) say(false, 'a learned friend is at the fire', 'none (solo has no bot yet)');
  else {
    await p.evaluate(() => { const g = __lf.g, f = g.players.find(q => q.bot), m = __lf.me; g.clock = 0.97; f.torch = true; const K = { id: g.nextId++, kind: 'walker', x: f.x + 9, z: f.z + 4, y: g.land(f.x + 9, f.z + 4), yaw: 0, hp: 9999, max: 9999, sh: 0, sb: 0, cd: 0, dead: false, speed: 0, staged: true }; g.hollow.push(K); const mx = f.x + 4.5, mz = f.z + 2, px = -4 / 9.85, pz = 9 / 9.85, sg = Math.hypot(mx + px * 7 - g.fire.x, mz + pz * 7 - g.fire.z) > Math.hypot(mx - px * 7 - g.fire.x, mz - pz * 7 - g.fire.z) ? 1 : -1; m.x = mx + px * 7 * sg; m.z = mz + pz * 7 * sg; m.y = g.land(m.x, m.z); m.yaw = Math.atan2(-(mx - m.x), -(mz - m.z)); m.pitch = -0.04;   /* (stand beside the line of fire, facing its middle, on the side away from the fire's glow) */ window.__n0 = __pan.length; });
    const got = await p.evaluate(() => new Promise(res => { const t0 = performance.now(), tick = () => { const f = __lf.fx, i = [...f.tlife].findIndex(v => v > 0); if (i >= 0) { f.tlife[i] = 2.5; const fb = __lf.g.players.find(q => q.bot); res({ fp: { x: fb.x, y: fb.y, z: fb.z }, pos: [...f.tpos.slice(i * 6, i * 6 + 6)], pan: __pan.slice(window.__n0).map(n => [n.positionX.value, n.positionY.value, n.positionZ.value]) }); } else if (performance.now() - t0 > 40000) res(null); else requestAnimationFrame(tick); }; tick(); }));
    await p.waitForTimeout(150); await p.screenshot({ path: OUT + 'friend-tracer.png' });
    if (!got) say(false, 'the learned friend shoots and a tracer is drawn', 'no tracer in 40 s');
    else { const fp = got.fp, d0 = Math.hypot(got.pos[0] - fp.x, got.pos[1] - (fp.y + 1.5), got.pos[2] - fp.z), pan = got.pan.some(q => Math.hypot(q[0] - fp.x, q[1] - (fp.y + 1.5), q[2] - fp.z) < 0.8);
      say(d0 < 1.3 && pan, "the learned friend's shot is a tracer in 3D at their muzzle, with a spatial sound there", `tracer starts ${d0.toFixed(2)} m from the muzzle, sound panner at the muzzle: ${pan}`); }
  }
  say(!errs.length, 'no errors in the page', errs.join(' | ').slice(0, 200) || 'none');
  console.log(fails ? fails + ' FAILED' : 'all pass'); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
