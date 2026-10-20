// Up to four players, browser to browser (WebRTC through PeerJS's free broker: it only introduces the browsers; the game itself flows directly,
// encrypted by WebRTC). The host is the hub: every friend connects to the host, and the host passes on what the others need to see.
// Safety: a 6-letter room code (191 million of them, drawn from the browser's secure random); four players at most; the host can lock the room;
// the host stamps who sent each message (a friend cannot pretend to be someone else); every message is size-checked and must be one of the
// game's own kinds before anything reads it; a browser that keeps sending garbage is dropped.
const PREFIX = 'lastfire-n1-';   // (the new game's rooms: never mixed with the old game's)
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // (no I or O: nothing to misread)
export const CODE_LEN = 6, MAX_PLAYERS = 4;
const KINDS = new Set(['hello', 'in', 's', 'ev', 'shot', 'bang', 'hit', 'build', 'bye', 'lines', 'fb']);   // (lines: a friend's own words, sent but refused until 2026-10-20; fb: a friend's feedback for the host to pass on)
const MAX_BYTES = 400000;   // (the host's opening message carries the world's edits; nothing else comes near this)

export function roomCode() { const r = new Uint32Array(CODE_LEN); crypto.getRandomValues(r); return Array.from(r, v => LETTERS[v % LETTERS.length]).join(''); }
export function cleanCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, CODE_LEN); }

export class Net {
  // onMessage(m, from): from is the sender's player number (0 is the host), stamped by the host, never taken from the message
  constructor(onMessage, onStatus) { this.peer = null; this.conns = new Map(); this.onMessage = onMessage; this.onStatus = onStatus; this.host = false; this.locked = false; this.nextId = 1; this.me = 0; }
  hostGame(code) {
    this.host = true; this.code = code; this.me = 0;
    this.peer = new window.Peer(PREFIX + code);
    this.peer.on('open', () => this.onStatus(`Room ${code} is open.`));
    this.peer.on('error', e => this.onStatus(e.type === 'unavailable-id' ? 'That room code is taken: start again for a new one.' : 'Connection trouble: ' + e.type));
    this.peer.on('connection', c => {
      if (this.locked || this.conns.size >= MAX_PLAYERS - 1) { c.on('open', () => { c.send(JSON.stringify({ t: 'bye', why: this.locked ? 'locked' : 'full' })); setTimeout(() => c.close(), 300); }); return; }
      const id = this.nextId++; this.wire(c, id);
    });
    this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch (e) {} });   // (the broker dropping never ends the game, only new joins)
  }
  joinGame(code) {
    this.host = false; this.code = code;
    this.peer = new window.Peer();
    this.peer.on('open', () => { this.onStatus(`Joining room ${code}...`); this.wire(this.peer.connect(PREFIX + code, { reliable: true }), 0); });
    this.peer.on('error', e => this.onStatus(e.type === 'peer-unavailable' ? `No room ${code}: check the code, or ask the host to start one.` : 'Connection trouble: ' + e.type));
  }
  wire(c, id) {   // (id: the friend's number on the host's side; 0 on a friend's side, where the only connection is the host)
    let bad = 0; const strike = () => { if (++bad > 40) { this.onStatus('Dropped a player: their game sent too much garbage.'); c.close(); } };
    c.on('open', () => { this.conns.set(id, c); if (this.host) { try { this.onMessage({ t: 'joined' }, id); } catch (e) { console.warn(e); } } else this.onStatus('Connected.'); });
    c.on('data', d => {
      if (typeof d !== 'string' || d.length > MAX_BYTES) return strike();
      let m; try { m = JSON.parse(d); } catch (e) { return strike(); }
      if (!m || typeof m !== 'object' || Array.isArray(m) || !KINDS.has(m.t)) return strike();
      let from = id;
      if (!this.host) { from = Number.isInteger(m.from) && m.from >= 0 && m.from < 64 ? m.from : 0; if (m.t === 'hello' && Number.isInteger(m.you)) this.me = m.you; }
      try { this.onMessage(m, from); } catch (e) { console.warn(e); strike(); }   // (a malformed message can never crash the game)
    });
    c.on('close', () => { if (this.conns.get(id) === c) { this.conns.delete(id); this.onMessage({ t: 'left' }, id); } });
    c.on('error', () => {});
  }
  // a friend sends to the host; the host sends to everyone (or to one, or to all but one), stamping its messages as from 0 unless passing one on
  send(m) { const s = JSON.stringify(m); for (const c of this.conns.values()) if (c.open) c.send(s); }
  sendTo(id, m) { const c = this.conns.get(id); if (c && c.open) c.send(JSON.stringify(m)); }
  relay(m, from) { if (!this.host) return; const s = JSON.stringify({ ...m, from }); for (const [id, c] of this.conns) if (id !== from && c.open) c.send(s); }
  kick(id) { const c = this.conns.get(id); if (c) { c.send(JSON.stringify({ t: 'bye', why: 'kicked' })); setTimeout(() => c.close(), 200); } }
  lock(on) { this.locked = on; }
  get live() { return [...this.conns.values()].some(c => c.open); }
  get count() { return this.conns.size; }
}
