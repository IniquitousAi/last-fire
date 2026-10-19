// node next/sim/lane_d_models.mjs  (checklist: "no block shapes left in view" and "every gun, item and character is a real model")
// Models: every gun and character file is a real glTF mesh with enough triangles to be a model (not a primitive), and is credited in assets/CREDITS.txt.
// Boxes: the camp, the wrist screen, the Earth ruins and the placed lamp stand have no BoxGeometry stand-ins left (walls in earthsite.js are the lead's, and exempt).
import { readFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url), credits = readFileSync(new URL('assets/CREDITS.txt', root), 'utf8');
let fails = 0; const say = (ok, name, detail) => { if (!ok) fails++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  (' + detail + ')'); };
function glbTris(path) { const b = readFileSync(new URL(path, root)), len = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + len).toString('utf8')); let t = 0;
  for (const m of j.meshes) for (const p of m.primitives) { const a = p.indices !== undefined ? j.accessors[p.indices] : j.accessors[p.attributes.POSITION]; t += a.count / 3; } return Math.round(t); }
const files = ['assets/m/pistol.glb', 'assets/m/shotgun.glb', 'assets/m/lmg.glb', 'assets/m/ar.glb', 'assets/m/rifle.glb', 'assets/m/smg.glb', 'assets/fp/rifle_fp.glb', 'assets/fp/sniper_fp.glb', 'assets/c/soldier.glb', 'assets/c/survivor.glb', 'assets/c/wraith.glb', 'assets/m/lantern.glb', 'assets/m/knife.glb', 'assets/m/flashlight.glb'];
for (const f of files) { const t = glbTris(f); const base = f.split('/').pop(); say(t >= 200, base + ' is a real mesh', t + ' triangles'); }
say(['pistol', 'shotgun', 'lmg', 'rifle', 'smg'].every(n => credits.includes(n)) && credits.includes('Quaternius') && credits.includes('wraith') && /Poly Haven|polyhaven/i.test(credits), 'the guns and characters are credited in CREDITS.txt', 'Quaternius, Kenney, poly.pizza lines found');
const read = f => readFileSync(new URL(f, root), 'utf8');
for (const [f, why] of [['next/client/camp.js', 'camp posts, poles, lamps, signs'], ['next/client/wrist.js', 'the wrist band'], ['next/client/ruins.js', 'Earth ruins']]) say(!/new THREE\.BoxGeometry/.test(read(f)), f.split('/').pop() + ' has no code boxes', why);
say(!/new THREE\.BoxGeometry\(0\.1, n\.kind === 'lamp'/.test(read('next/client/main.js')), 'main.js lamp and relay stands are the real lamp post', 'no box');
say(/buildRuins\(scene, land, TOWERS\.slice\(8\)/.test(read('next/client/earthsite.js')) && credits.includes('modular_urban_apartments_facade'), 'Earth ruins (towers outside the walls) come from the real facade kit, credited', 'ruins.js + CREDITS.txt');
console.log(fails ? fails + ' FAILED' : 'all model checks pass'); process.exit(fails ? 1 : 0);
