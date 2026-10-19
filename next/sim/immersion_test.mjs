// node next/sim/immersion_test.mjs: the immersion lane's rule tests, one section per checklist task (lane C, 2026-10-19). Every line is
// PASS or FAIL with the number it saw. Deterministic: fixed seeds, no Math.random in the rules.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as G from '../core/game.js';
import { SHIP } from '../core/ship.js';
import { CAMP } from '../core/camp.js';
import { pickFresh } from '../core/lines.js';
import { strangeAt, skyOf, fogAt, edgeOf, consequences, spiresNear, STRANGE } from '../core/immersion.js';
import { awareStep, POOLS, AWARE } from '../core/awareness.js';
import { ERAS, LESSONS } from '../core/lessons.js';
import { REASONS, LORE_LINES } from '../core/reasons.js';
import { FEEL, FEEL_VIA, FEEL_LOG } from '../core/feel.js';
import { MIRROR, ORDINARY, mirrorDay, SIGNS, signLine } from '../core/mirror.js';
import { labelFor, labeled, LABELS } from '../core/knowledge.js';
import { PLACED } from '../core/placed.js';
const here = path.dirname(fileURLToPath(import.meta.url)), next = path.join(here, '..'), read = f => fs.readFileSync(path.join(next, f), 'utf8');
const seeded = s => () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
let fail = 0; const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${got})`); if (!ok) fail++; };
const TABLES = { KINDS: G.KINDS, NODE: G.NODE, PARTS: G.PARTS, CAR: G.CAR, CAMP, FIRE_COST: G.FIRE_COST, SLAM: G.SLAM, TORCH: G.TORCH, FLARE: G.FLARE, SENSE: G.SENSE, TRACER: G.TRACER, PULL: G.PULL, REACT: G.REACT,
  DIRECTOR: G.DIRECTOR, FLOOD_WARN: { FLOOD_WARN: G.FLOOD_WARN }, EARTH_DARK: G.EARTH_DARK, DUES: G.DUES, SOLID_AT: { SOLID_AT: G.SOLID_AT }, WALLS: G.WALLS, EARTH: G.EARTH, SHIP, DAY: { DAY: G.DAY } };

// ---- 61: camp people never repeat a line while fresh ones remain
{ const pool = ['a', 'b', 'c', 'd', 'e'], st = {}, rnd = seeded(5), said = []; for (let i = 0; i < 200; i++) said.push(pickFresh(st, pool, rnd));
  const win = []; for (let i = 0; i + 5 <= said.length; i++) win.push(new Set(said.slice(i, i + 5)).size);
  check('lines never repeat while fresh ones remain: every run of 5 has 5 different lines', win.every(n => n === 5), `${win.length} windows, fewest different ${Math.min(...win)}`);
  const st2 = {}, got = []; const grow = ['x1']; for (let i = 0; i < 6; i++) { got.push(pickFresh(st2, grow, rnd)); if (i === 2) grow.push('new'); }
  check('a line added later is said before any old line repeats', got[3] === 'new', got.join(','));
  check('with one line only it repeats (nothing fresh remains)', pickFresh({}, ['only']) === 'only', 'ok'); }
{ const src = read('client/camp.js'); check('camp people use pickFresh for what they say', /pickFresh\(/.test(src) && /from '..\/core\/lines\.js/.test(src), 'client/camp.js'); }

// ---- 26: the sky and far land get stranger the farther out
{ let mono = true, prev = -1; for (let d = 0; d <= 900; d += 10) { const k = strangeAt(d, 0); if (k < prev - 1e-12) mono = false; prev = k; }
  check('strangeness never falls as you go farther out (Moon, 0 to 900 m)', mono, 'monotone'); let monoE = true; prev = -1; for (let d = 0; d <= 900; d += 10) { const k = strangeAt(G.EARTH.x + d, G.EARTH.z); if (k < prev - 1e-12) monoE = false; prev = k; }
  check('same on Earth, measured from the landing site', monoE, 'monotone');
  check('inside the walls (50 m) and at the fire: 0', strangeAt(G.EARTH.x + 50, G.EARTH.z) === 0 && strangeAt(10, 0) === 0, 'k=0');
  check('past 600 m: exactly 1', strangeAt(700, 0) === 1, 'k=1');
  const near = spiresNear(0, 0, 999).filter(p => Math.hypot(p.x, p.z) < 250).length, far = spiresNear(0, 0, 999).filter(p => Math.hypot(p.x, p.z) > 450).length, again = JSON.stringify(spiresNear(0, 0, 999)) === JSON.stringify(spiresNear(0, 0, 999)), onEarth = spiresNear(G.EARTH.x, G.EARTH.z, 999).every(p => p.z > 3000);
  check('far-land spires: few near home, many far out, the same every time, and none float between worlds', far > near * 3 && again && onEarth, `${near} within 250 m, ${far} past 450 m`);
  const a = skyOf(0), b = skyOf(1); check('the ringed disc is bigger, more tilted and has fewer stars the farther out', b.disc > a.disc && b.tilt > a.tilt && b.stars < a.stars, `disc ${a.disc.toFixed(2)} -> ${b.disc.toFixed(2)}, stars ${a.stars} -> ${b.stars}`);
  const src = read('client/strange.js'); check('client/strange.js draws the disc from skyOf and the far land from strangeAt', /skyOf\(/.test(src) && /strangeAt\(/.test(src), 'client/strange.js'); }

// ---- 67: fog at dusk, the dark's edge moving, rain on Earth
{ const f = c => fogAt(c, true); check('fog is 1 by day, builds over dusk, 1.9x at night on Earth, thins at dawn', f(0.3) === 1 && f(0.59) > f(0.57) && f(0.57) > 1 && Math.abs(f(0.8) - 1.9) < 1e-9 && f(0.985) < f(0.8), `day ${f(0.3)}, dusk ${f(0.57).toFixed(2)} ${f(0.59).toFixed(2)}, night ${f(0.8)}, dawn ${f(0.985).toFixed(2)}`);
  check('Moon fog tops out lower than Earth', fogAt(0.8, false) < fogAt(0.8, true), `${fogAt(0.8, false)} vs ${fogAt(0.8, true)}`);
  const g = G.newGame(1), seq = []; for (const c of [0.3, 0.56, 0.6, 0.8, 0.975, 0.99]) { g.clock = c; seq.push([edgeOf(g, true).r, edgeOf(g, false).r]); }
  check('Earth edge: 170 m by day, 70 m at night, moving in over dusk', seq[0][0] === 170 && seq[3][0] === 70 && seq[1][0] < 170 && seq[1][0] > seq[2][0], seq.map(s => s[0].toFixed(0)).join(' > '));
  check('Moon edge is the Tide: far by day, close to the light at night', seq[0][1] > 100 && seq[3][1] < 30, `${seq[0][1].toFixed(0)} m by day, ${seq[3][1].toFixed(0)} m at night`);
  const m = read('client/main.js'), im = read('client/immersion.js'); check('immersion.js applies fogAt to the fog and draws the edge from edgeOf; main.js calls it every frame', /fogAt\(/.test(im) && /edgeOf\(/.test(im) && /immersion\.update\(/.test(m), 'client/immersion.js, client/main.js');
  check('rain exists on Earth only (client/rain.js, drawn when onEarth)', /rain\.update\(/.test(m) && /const e = C\.onEarth\(me\)/.test(m), 'rain.update scaled by the Earth flag'); }

// ---- 65: at least 3 visible consequences of last night the next day
{ const outs = []; for (const seed of [1, 2, 3, 4, 5]) { const g = G.newGame(seed), a = G.addPlayer(g, 1, 'A'), b = G.addPlayer(g, 2, 'B'); a.x = 22; a.z = 5; b.x = -22; b.z = 5; g.clock = 0.5;
    const n0 = g.night; for (let i = 0; i < 4000 && g.night === n0; i++) { for (const p of [a, b]) if (p.ember) { p.ember = false; p.hp = 100; p.x = p === a ? 22 : -22; p.z = 5; } G.step(g, 0.1); }
    const c = consequences(g); outs.push(c.length); if (seed === 1) console.log('       e.g.', c.map(x => x.kind + ': ' + x.text).join(' | ')); }
  check('after a real night, at least 3 different consequences are visible next morning (5 seeds)', outs.every(n => n >= 3), `counts ${outs.join(',')}`);
  check('immersion.js says the first three through the wrist at dawn', /consequences\(/.test(read('client/immersion.js')), 'client/immersion.js'); }

// ---- 27: hyper-awareness moments
{ const st = {}, rnd = seeded(3), lines = []; let t = 0;
  for (; t < 40; t += 0.5) { const r = awareStep(st, { dt: 0.5, moved: 0, hp: 100, lookingAtFire: false, earth: false, lit: 1, phase: 'day' }, rnd); if (r) { lines.push([t, r]); break; } }
  check('standing still 25 s makes you notice it (and not before)', lines.length === 1 && lines[0][0] >= AWARE.still && lines[0][1].kind === 'still', lines.map(l => l[0] + 's ' + l[1].kind).join());
  let n = 0, last = -999, gaps = []; const st2 = {}; for (let s = 0; s < 3000; s += 0.5) { const r = awareStep(st2, { dt: 0.5, moved: 0, hp: 20, lookingAtFire: true, earth: true, lit: 0, phase: 'night' }, rnd); if (r) { n++; if (last > -999) gaps.push(s - last); last = s; } }
  check('never more than one a 90 s, even when every trigger is true', gaps.every(g => g >= AWARE.gap - 0.01), `${n} moments in 3000 s, shortest gap ${Math.min(...gaps)} s`);
  const all = Object.values(POOLS).flat(); check('every line is plain: no dashes, no emoji, 3 or more lines in every pool', all.every(l => !/[–—]/.test(l)) && Object.values(POOLS).every(p => p.length >= 3), `${all.length} lines`);
  const st3 = {}, kinds = []; for (let s = 0; s < 4000; s += 0.5) { const r = awareStep(st3, { dt: 0.5, moved: 0, hp: 20, lookingAtFire: false, earth: false, lit: 1, phase: 'day' }, rnd); if (r) kinds.push(r.line); }
  check('hurt lines do not repeat while fresh ones remain', kinds.slice(0, 3).length === 3 && new Set(kinds.slice(0, 3)).size === 3, kinds.length + ' lines');
  check('immersion.js sends them to the wrist', /awareStep\(/.test(read('client/immersion.js')), 'client/immersion.js'); }

// ---- 38: each era teaches one lesson by play, never text
{ check('seven eras, seven different lessons', ERAS.length === 7 && new Set(ERAS.map(e => e.teaches)).size === 7 && ERAS.every(e => LESSONS.includes(e.teaches)), ERAS.map(e => e.teaches).join(', '));
  const rule = e => { const [f, name] = e.rule.split('#'); return read(f).includes(name); }; check('every era\'s rule really exists in the code', ERAS.every(rule), ERAS.filter(e => !rule(e)).map(e => e.id).join() || 'all 7');
  const g = G.newGame(3); G.addPlayer(g, 1, 'A'); g.clock = 0.2; const f0 = g.fire.fuel; for (let i = 0; i < 1000; i++) G.step(g, 0.1); check('entropy: with no feeding the fire only loses fuel (100 s)', g.fire.fuel < f0, `${f0} -> ${g.fire.fuel.toFixed(1)}`);
  const pw = x => Math.pow(x, CAMP.powerCurve), steps = [1, 2, 3, 4, 5].map(i => pw(i * 100) - pw((i - 1) * 100)); check('diminishing returns: each next 100 light buys less power', steps.every((s, i) => i === 0 || s < steps[i - 1]), steps.map(s => s.toFixed(2)).join(' > '));
  const ks = [0, 100, 200, 400, 800].map(d => strangeAt(d, 0)); check('scale: farther out is stranger, strictly until the cap', ks[0] < ks[1] && ks[1] < ks[2] && ks[2] < ks[3] && ks[3] <= ks[4], ks.map(k => k.toFixed(2)).join(' < '));
  check('suspense: the dark chooses its gap a fixed 2.5 s before it pours', G.FLOOD_WARN === 2.5, G.FLOOD_WARN + ' s');
  const st = {}; let first = null; for (let t = 0; t < 40 && !first; t += 0.5) first = awareStep(st, { dt: 0.5, moved: 0, hp: 100, lookingAtFire: false, earth: false, lit: 1, phase: 'day' }, seeded(1)); check('existential dread: standing still long enough makes you notice yourself noticing', !!first, first ? first.kind : 'none');
  check('psychological payoff: all 7 hours of the ordinary day have a flipped twin', ORDINARY.every(([id]) => MIRROR.some(m => m.id === id)), ORDINARY.length + ' of ' + ORDINARY.length);
  const used = fs.readdirSync(path.join(next, 'client')).filter(f => f.endsWith('.js')).some(f => /core\/lessons\.js/.test(read('client/' + f))); check('nothing on screen shows the lesson: no client file imports eras.js', !used, 'text-free'); }

// ---- 40: the mirror realm
{ let ok = true; for (let c = 0; c < 1; c += 0.01) if (!mirrorDay(c)) ok = false; check('every moment of the day has a flipped activity', ok, 'clock 0 to 1');
  check('the day is a clean cover: each activity starts where the last ended', MIRROR.every((m, i) => i === 0 || Math.abs(m.from - MIRROR[i - 1].to) < 1e-9), MIRROR.map(m => m.id).join(' > '));
  check('the four flips he asked for: commute into the dark, shifts at the fire, school for the maze, smiling signs', /dark/.test(MIRROR[1].flips) && /fire/.test(MIRROR[2].flips) && /maze/.test(MIRROR[4].flips) && /signs/.test(MIRROR[5].flips), 'all four');
  check('signs read differently at night than by day', SIGNS.some((s, i) => signLine(i, 0.3) !== signLine(i, 0.8)), signLine(1, 0.3) + ' / ' + signLine(1, 0.8));
  const src = read('client/mirror.js'); check('client/mirror.js places the smiling signs', /signLine\(/.test(src), 'client/mirror.js'); }

// ---- 48: every mechanic has a lore reason and every lore line a mechanic
{ const bad = []; for (const [t, tab] of Object.entries(TABLES)) { if (t === 'DAY') continue; const keys = Array.isArray(tab) ? tab.map((_, i) => String(i)) : Object.keys(tab); const lore = REASONS[t]; if (!lore) { bad.push(t + ' (no table)'); continue; } for (const k of keys) if (!lore[k]) bad.push(t + '.' + k); for (const k of Object.keys(lore)) if (!keys.includes(k)) bad.push(t + '.' + k + ' (no such rule)'); }
  let n = 0; for (const [t, tab] of Object.entries(TABLES)) if (t !== 'DAY') n += Array.isArray(tab) ? tab.length : Object.keys(tab).length;
  check(`every one of the ${n} rule numbers in ${Object.keys(TABLES).length - 1} tables has a lore reason, and every reason has a rule`, bad.length === 0, bad.slice(0, 6).join(', ') || 'none missing');
  const bad2 = LORE_LINES.filter(([, ref]) => { const [f, name] = ref.split('#'); try { return !read(f).includes(name); } catch (e) { return true; } }); check(`every one of ${LORE_LINES.length} lore lines points at a rule that exists`, bad2.length === 0, bad2.map(l => l[1]).join() || 'all found'); }

// ---- 39, 50: feel beats number, feel checks beside every number
{ const miss = [], out = []; for (const [t, k, , lo, hi] of FEEL) { const tab = t === 'DAY' ? { DAY: G.DAY } : TABLES[t]; const v = tab && tab[k]; if (typeof v !== 'number') miss.push(t + '.' + k); else if (v < lo || v > hi) out.push(`${t}.${k}=${v} outside ${lo}..${hi}`); }
  check(`${FEEL.length} numbers each have a feel check that the live value sits inside`, !miss.length && !out.length, [...miss, ...out].join('; ') || 'all in band');
  const uncovered = Object.keys(TABLES).filter(t => t !== 'DAY' && !FEEL.some(f => f[0] === t) && !FEEL_VIA[t]); check('every rule table has a per-number feel check or a named feel measure', uncovered.length === 0, uncovered.join() || `${Object.keys(FEEL_VIA).length} tables named`);
  const measures = Object.values(FEEL_VIA).map(v => (v.match(/sim\/[a-z_]+\.(mjs|cjs)/) || [])[0]).filter(Boolean), gone = measures.filter(f => !fs.existsSync(path.join(next, f))); check('every named feel measure is a robot test that exists', gone.length === 0, `${measures.length} named, missing: ${gone.join() || 'none'}`);
  const stale = FEEL_LOG.filter(l => !read(l.file).includes(l.has)); check('where feel overruled a number, the code holds the felt value (4 logged)', stale.length === 0, stale.map(l => l.knob).join() || 'all 4 held'); }

// ---- 59: knowledge labeled checked / reasoned / guess
{ check('labels: 0-2 trips guess, 3-9 reasoned, 10+ checked, a thing taken apart is checked', labelFor(2) === 'guess' && labelFor(3) === 'reasoned' && labelFor(9) === 'reasoned' && labelFor(10) === 'checked' && labelFor(0, true) === 'checked', 'edges 2 3 9 10');
  const g = G.newGame(1); g.sites = { city: { trips: 2 }, depot: { trips: 5, parts: 5, cells: 5 }, reservoir: { trips: 12, parts: 12, cells: 12 } };
  const l = ['city', 'depot', 'reservoir'].map(k => G.siteOdds(g, k).label); check('the game\'s site odds use the same three labels at the same edges', l[0].startsWith('guess') && l[1] === 'reasoned' && l[2] === 'checked', l.join(' / '));
  check('a labeled number prints its label', labeled('81%', 4) === '81% (reasoned)', labeled('81%', 4));
  const camp = read('client/camp.js'), main = read('client/main.js'); check('the board prints the label beside its odds and the wrist prints it as its header', /\$\{o\.label\}/.test(camp) && /wrist\.say\(t, s, head\)/.test(main), 'camp.js draw(), main.js say()'); }

// ---- 68: every placed object has a reason
{ const srcs = fs.readdirSync(path.join(next, 'client')).filter(f => f.endsWith('.js')).map(f => read('client/' + f)).join('\n');
  const used = new Set([...srcs.matchAll(/['"`]((?:kit|c|m|fp|zombie|camp)\/[A-Za-z0-9_-]+\.glb)['"`]/g)].map(m => m[1])); const phDirs = fs.readdirSync(path.join(next, '..', 'assets', 'ph')); for (const d of phDirs) if (srcs.includes(d)) used.add('ph:' + d);
  const noReason = [...used].filter(u => !PLACED[u]), unused = Object.keys(PLACED).filter(k => !used.has(k));
  check(`all ${used.size} placed models have a reason and a story, and no reason is for something absent`, !noReason.length && !unused.length && Object.values(PLACED).every(p => p.why.length > 20 && p.story.length > 10), `without a reason: ${noReason.join() || 'none'}; unused: ${unused.join() || 'none'}`); }

// ---- 63: HUD under 6% of the screen in play (measured in a real browser by sim/immersion_run.cjs, read here)
{ const run = JSON.parse(read('playtests/lanes/C/immersion_run.json')), hs = run.steps.filter(x => /^hud share/.test(x.name)); check('HUD covers under 6% of the screen in play at 1000x900 and 1920x908, carrying light too', hs.length === 4 && hs.every(x => x.pct < 6), hs.map(x => x.pct + '%').join(', ')); }
console.log(fail ? `\n${fail} FAILED` : '\nall immersion tests pass'); process.exit(fail ? 1 : 0);
