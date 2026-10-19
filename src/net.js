// Two players, browser to browser (WebRTC through PeerJS's free broker: it only introduces the two browsers; the game itself flows directly).
// The host picks a 4-letter room code; the other player types it. Messages are small JSON objects.
const PREFIX = 'lastfire-v1-';

export function roomCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; return Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join(''); }

export class Net {
  constructor(onMessage, onStatus) { this.peer = null; this.conn = null; this.onMessage = onMessage; this.onStatus = onStatus; this.host = false; }
  hostGame(code) {
    this.host = true;
    this.peer = new window.Peer(PREFIX + code);
    this.peer.on('open', () => this.onStatus(`Room ${code} is open. Send Dalton the code.`));
    this.peer.on('error', e => this.onStatus(e.type === 'unavailable-id' ? 'That room code is taken: start again for a new one.' : 'Connection trouble: ' + e.type));
    this.peer.on('connection', c => { if (this.conn) { c.close(); return; } this.attach(c); });
  }
  joinGame(code) {
    this.host = false;
    this.peer = new window.Peer();
    this.peer.on('open', () => { this.onStatus(`Joining room ${code}...`); this.attach(this.peer.connect(PREFIX + code.toUpperCase(), { reliable: true })); });
    this.peer.on('error', e => this.onStatus(e.type === 'peer-unavailable' ? `No room ${code}: check the code, or ask the host to start one.` : 'Connection trouble: ' + e.type));
  }
  attach(c) {
    this.conn = c;
    c.on('open', () => { this.onStatus('Connected.'); this.onMessage({ t: 'joined' }); });
    c.on('data', d => this.onMessage(typeof d === 'string' ? JSON.parse(d) : d));
    c.on('close', () => { this.conn = null; this.onStatus('The other player left.'); this.onMessage({ t: 'left' }); });
  }
  send(m) { if (this.conn && this.conn.open) this.conn.send(JSON.stringify(m)); }
  get live() { return !!(this.conn && this.conn.open); }
}
