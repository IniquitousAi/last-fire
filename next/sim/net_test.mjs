// node next/sim/net_test.mjs: the host checks every message and locked rooms stay locked (checklist item: "Host checks every message; strangers
// cannot join a locked room"). Runs client/net.js in Node against a fake PeerJS: no network, deterministic.
import { Net, roomCode, cleanCode, CODE_LEN, MAX_PLAYERS } from '../client/net.js';
let fail = 0; const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${got})`); if (!ok) fail++; };
class FakeConn { constructor() { this.h = {}; this.sent = []; this.open = true; this.closed = false; } on(e, f) { this.h[e] = f; return this; } send(s) { this.sent.push(JSON.parse(s)); } close() { this.closed = true; this.open = false; } emit(e, ...a) { this.h[e] && this.h[e](...a); } }
class FakePeer { constructor(id) { this.id = id; this.h = {}; FakePeer.last = this; } on(e, f) { this.h[e] = f; return this; } emit(e, ...a) { this.h[e] && this.h[e](...a); } }
globalThis.window = { Peer: FakePeer };
const inbox = [], notes = []; const net = new Net((m, from) => inbox.push([m, from]), t => notes.push(t)); net.hostGame('ABCDEF');
const join = () => { const c = new FakeConn(); FakePeer.last.emit('connection', c); c.emit('open'); return c; };
const wait = ms => new Promise(r => setTimeout(r, ms));
// room codes
const codes = new Set(); let bad = 0; for (let i = 0; i < 2000; i++) { const c = roomCode(); codes.add(c); if (!/^[A-HJ-NP-Z]{6}$/.test(c)) bad++; }
check('room codes are 6 letters, never I or O, and do not repeat (2000 made)', bad === 0 && codes.size > 1990 && CODE_LEN === 6, `${codes.size} distinct, ${bad} malformed`);
check('a typed code is cleaned to capital letters, 6 at most', cleanCode(' ab-cd ef1gh ') === 'ABCDEF' && cleanCode(null) === '', cleanCode(' ab-cd ef1gh '));
// friends join: stamped by the host, never by themselves
const a = join(); check('first friend joins as player 1', inbox.length === 1 && inbox[0][0].t === 'joined' && inbox[0][1] === 1, JSON.stringify(inbox[0]));
a.emit('data', JSON.stringify({ t: 'in', from: 0, x: 5 })); check('a friend claiming to be the host is stamped as themselves (from 1, not 0)', inbox[1][1] === 1 && inbox[1][0].x === 5, `from ${inbox[1][1]}`);
a.emit('data', JSON.stringify({ t: 'in', from: 3 })); check('and claiming to be player 3 changes nothing', inbox[2][1] === 1, `from ${inbox[2][1]}`);
// garbage is refused before anything reads it
const n0 = inbox.length; for (const junk of ['not json', '[1,2]', '"x"', 'null', JSON.stringify({ t: 'rm -rf' }), JSON.stringify({ t: 'constructor' }), JSON.stringify({ nokind: 1 }), 42, 'x'.repeat(400001)]) a.emit('data', typeof junk === 'number' ? junk : junk);
check('garbage (bad JSON, arrays, strings, unknown kinds, numbers, 400 KB) never reaches the game', inbox.length === n0, `${inbox.length - n0} got through`);
a.emit('data', JSON.stringify({ t: 'in' })); check('a good message right after garbage still passes', inbox.length === n0 + 1, 'passes');
for (let i = 0; i < 45; i++) a.emit('data', 'junk'); check('a browser that keeps sending garbage is dropped (closed)', a.closed && notes.some(t => /Dropped a player/.test(t)), notes.filter(t => /Dropped/.test(t)).length + ' drop notice');
// throwing handler cannot crash the host
const net2 = new Net(() => { throw new Error('boom'); }, () => {}); net2.hostGame('ZZZZZZ'); const c2 = new FakeConn(); FakePeer.last.emit('connection', c2); let threw = false; try { c2.emit('open'); c2.emit('data', JSON.stringify({ t: 'in' })); } catch (e) { threw = true; }
check('a message that makes the game code throw is swallowed, never crashes the host', !threw, threw ? 'threw' : 'safe');
// the room fills: four players at most
const netF = new Net(() => {}, () => {}); netF.hostGame('FULLRM'); const fl = []; for (let i = 0; i < 5; i++) { const c = new FakeConn(); FakePeer.last.emit('connection', c); c.emit('open'); fl.push(c); }
await wait(350); check(`the room holds ${MAX_PLAYERS} at most: the 4th friend is told "full" and closed`, MAX_PLAYERS === 4 && fl.slice(0, 3).every(c => !c.closed) && fl.slice(3).every(c => c.sent.some(m => m.t === 'bye' && m.why === 'full') && c.closed), `${fl.filter(c => c.closed).length} turned away`);
// locked: nobody new, even with the right code
const netL = new Net(() => {}, () => {}); netL.hostGame('LOCKED'); const ok1 = new FakeConn(); FakePeer.last.emit('connection', ok1); ok1.emit('open'); netL.lock(true);
const stranger = new FakeConn(); FakePeer.last.emit('connection', stranger); stranger.emit('open'); await wait(350);
check('LOCKED: a stranger with the right code is told "locked" and closed, never joined', stranger.sent.some(m => m.t === 'bye' && m.why === 'locked') && stranger.closed && !stranger.h.data && netL.count === 1, `count ${netL.count}`);
check('LOCKED: the friend already inside stays', !ok1.closed && netL.count === 1, 'still in');
netL.lock(false); const late = new FakeConn(); FakePeer.last.emit('connection', late); late.emit('open'); check('UNLOCKED: the next friend joins again', netL.count === 2 && !late.closed, `count ${netL.count}`);
netL.kick(2); await wait(350); check('the host can kick someone (told "kicked", closed)', late.sent.some(m => m.why === 'kicked') && late.closed, 'kicked');
console.log(fail ? `\n${fail} FAILED` : '\nall passed'); process.exit(fail ? 1 : 0);
