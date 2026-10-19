// The eras (his words, 2026-10-19): Earth starts primitive-modern (scavenge what is around you), then light, then the dark's own tech, and each
// era teaches one thing by play and never by text. This file holds no on-screen words: only which lesson, which rule teaches it, and the
// number that proves the rule really does teach it (sim/immersion_test.mjs measures each). Nothing in client/ imports it.
export const LESSONS = ['entropy', 'diminishing returns', 'scale', 'existential dread', 'logic', 'suspense', 'psychological payoff'];
export const ERAS = [
  { id: 'scavenged', stuff: 'what the old world left: an assault rifle, a fire axe, a wreck to strip', teaches: 'entropy', rule: 'core/game.js#f.fuel', proof: 'the fire loses fuel every second and only banked light puts it back' },
  { id: 'light', stuff: 'light you carry, bank and spend', teaches: 'diminishing returns', rule: 'core/camp.js#powerCurve', proof: 'each next 100 light spent on yourself buys less power than the last' },
  { id: 'community', stuff: 'the walled camp, its dues and its board', teaches: 'logic', rule: 'core/camp.js#payDues', proof: 'standing is exactly paid minus owed, and prices follow it' },
  { id: 'wilds', stuff: 'open Earth past the walls', teaches: 'scale', rule: 'core/immersion.js#strangeAt', proof: 'the sky and land get stranger the farther out, never the other way' },
  { id: 'rift', stuff: 'the console inside the wall and its waves', teaches: 'suspense', rule: 'core/game.js#FLOOD_WARN', proof: 'the dark chooses its gap a fixed time before it pours through' },
  { id: 'darktech', stuff: 'the dark learns the shapes you fear', teaches: 'existential dread', rule: 'core/awareness.js#awareStep', proof: 'standing still long enough makes you notice yourself noticing' },
  { id: 'mirror', stuff: 'an ordinary day, flipped where it is cool', teaches: 'psychological payoff', rule: 'core/mirror.js#mirrorDay', proof: 'every hour of the ordinary day has a flipped twin you can walk into' },
];
