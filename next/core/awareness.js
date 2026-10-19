// Hyper-awareness: rare dry moments that make you notice how aware you are (his words: the existential dread of noticing yourself noticing).
// Never a tutorial, never frequent: one at most every 90 s of play, only when the moment is true (you really have stood still, really have
// walked that far, really are hurt). The line goes to the wrist. Plain words, no dashes, never the same line while a fresh one remains.
import { pickFresh } from './lines.js';

export const AWARE = { gap: 90, still: 25, stepMarks: [300, 1000, 3000], hurt: 30, fireLook: 12 };
export const POOLS = {
  still: ['You have been standing still. You are aware that you are standing still. It does not help.', 'Nothing is happening to you. You are watching it not happen.', 'You noticed you stopped. Now you are noticing the noticing.'],
  steps: ['That was another few hundred steps. Nobody counted but you.', 'Your legs have been doing this without being told. You were told that just now.', 'You have walked a long way to stay in the same small light.'],
  hurt: ['Your pulse is the loudest thing out here. It was always that loud.', 'You can hear yourself being alive. It is not a comfort.', 'Your own breathing is very interesting to you right now.'],
  fire: ['You are looking at the fire. The fire does not know.', 'You have been watching the flame instead of the dark. The dark noticed.', 'The fire is the only thing here that is certain of itself.'],
  earth: ['This is the sky you grew up under. It never asked you.', 'Somewhere under all that dark, this was a normal Tuesday.', 'You are standing on the thing everyone wrote their memories on.'],
  dark: ['In the dark your own light is the only proof you are here.', 'The edge of the light is the edge of what you are sure of.', 'You are the brightest thing for a long way. That is not the good news it sounds like.'],
};
// st: this player's memory ({}); ctx: { dt, moved (m this frame), hp, lookingAtFire, earth, lit (0..1 light where you stand), phase }
export function awareStep(st, ctx, rnd = Math.random) {
  st.cool = Math.max(0, (st.cool === undefined ? 40 : st.cool) - ctx.dt); st.steps = (st.steps || 0) + ctx.moved; st.still = ctx.moved < 0.01 * ctx.dt * 60 ? (st.still || 0) + ctx.dt : 0;
  st.fireT = ctx.lookingAtFire ? (st.fireT || 0) + ctx.dt : 0; st.pools = st.pools || {};
  if (st.cool > 0) return null;
  let kind = null;
  if (ctx.hp < AWARE.hurt) kind = 'hurt';
  else if (ctx.earth && !st.sawEarth) { kind = 'earth'; st.sawEarth = true; }
  else if (st.still >= AWARE.still) kind = 'still';
  else if (st.fireT >= AWARE.fireLook) kind = 'fire';
  else if ((st.mark || 0) < AWARE.stepMarks.length && st.steps >= AWARE.stepMarks[st.mark || 0]) { kind = 'steps'; st.mark = (st.mark || 0) + 1; }
  else if (ctx.phase === 'night' && ctx.lit < 0.05 && ctx.dt > 0) { st.darkT = (st.darkT || 0) + ctx.dt; if (st.darkT > 20) { kind = 'dark'; st.darkT = 0; } }
  if (!kind) return null;
  st.cool = AWARE.gap; st.still = 0; st.fireT = 0; st.count = (st.count || 0) + 1;
  return { kind, line: pickFresh(st.pools[kind] = st.pools[kind] || {}, POOLS[kind], rnd) };
}
