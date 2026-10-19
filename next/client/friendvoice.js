// How a learned friend talks, worked out from how they play (his idea, 2026-10-19: "based on how he plays, he probably speaks like this").
// Their recorded habits pick a manner; real events pick the moment; a line is never repeated while a fresh one is left. Reasoned, not
// copied from anyone: when real recorded words exist for a person, they replace these.
export function manner(style) {
  if (style.aim >= 0.72) return 'sharp';      // (hits most of what they aim at: few words, exact)
  if (style.roam >= 18) return 'bold';        // (roams far from the fire: loud about risk)
  if (style.together >= 0.6) return 'loyal';  // (sticks close to someone: talks about the team)
  return 'careful';                           // (stays near the light: dry, worried, right)
}
const LINES = {
  kill: {
    sharp: ['One.', 'Down.', 'That one had a face. Had.', 'Clean.'],
    bold: ['Did you see that? Tell me you saw that.', 'Come get some more, I have time.', 'That is what the dark gets for walking in a straight line.'],
    loyal: ['Got it. You are clear.', 'That one was heading for you. Not anymore.', 'Watching your side.'],
    careful: ['It got close. Too close.', 'Okay. Okay. Next one.', 'That is one less thing in the dark. There are more things in the dark.'],
  },
  bank: {
    sharp: ['Light is in.', 'Banked. Fire eats.'], bold: ['Fed the fire. Going back out.', 'Brought it home. Barely needed to.'],
    loyal: ['Banked. Bring yours in too.', 'Fire is fed. You good?'], careful: ['Banked it before anything could take it.', 'In the fire. Where it is safe. Ish.'],
  },
  hurt: {
    sharp: ['Hit.', 'Took one.'], bold: ['That tickled. Mostly.', 'Bleeding a little. Worth it.'],
    loyal: ['I am hit, stay with me.', 'Taking damage, cover me a second.'], careful: ['I said it was too close.', 'Ow. That is why I stay by the fire.'],
  },
  dusk: {
    sharp: ['Dusk.', 'Here it comes.'], bold: ['Finally. I was getting bored.', 'Light them up.'],
    loyal: ['Stick together tonight.', 'Back to back when it rolls in.'], careful: ['Everyone near the light. Please.', 'The council says ninety-two. I say stay close.'],
  },
  youFell: {
    sharp: ['You are down. Coming.', 'Hold on. Getting you.'], bold: ['Get up, get up, I am not doing this alone.', 'Hold on, I am dragging you home.'],
    loyal: ['I have you. Hang on.', 'Not leaving you out there.'], careful: ['Oh no. Okay. I can do this.', 'Getting you. Do not move. Not that you can.'],
  },
};
export class FriendVoice {
  constructor(say, own) { this.say = say; this.own = own; this.heard = new Set(); this.quiet = 0; }   // (own: the person's own typed words, when they gave any)
  speak(p, event) {   // (one line at most every 6 s per friend: a friend who never stops talking is not a friend)
    if ((p.voiceT || 0) > 0) return; const mine = this.own && this.own(p); if (mine) { p.voiceT = 6; this.say(p.name, mine); return; } const m = manner(p.style), pool = (LINES[event] || {})[m]; if (!pool) return;
    const fresh = pool.filter(l => !this.heard.has(p.id + l)), line = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
    this.heard.add(p.id + line); p.voiceT = 6; this.say(p.name, line);
  }
  update(players, dt) { for (const p of players) if (p.bot) p.voiceT = Math.max(0, (p.voiceT || 0) - dt); }
}
