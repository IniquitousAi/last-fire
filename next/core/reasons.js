// Lore first, then merged with the mechanics, each relying on the other (his words, 2026-10-19). Two directions, both checked by sim/lore_test.mjs:
//  REASONS: every number-table in the rules has a lore reason for every key (a mechanic with no reason fails the test).
//  LORE_LINES: every line of the lore (LORE.md) points at the rule that makes it true (a lore line with no rule fails the test).
// The reasons are for the developer and the codex, never printed as a tutorial.
export const REASONS = {
  KINDS: { walker: 'the dark wearing the tall shape the eye is built to fear', runner: 'the low shape that reaches you before the thought does', shard: 'the dark drinking light the way it drinks everything', face: 'the face in the wall: the dark wearing a person so the person looks back', watcher: 'it only moves when nobody looks: the dark is a thing you cannot be sure about', giant: 'what the fire wakes when it gets proud' },
  NODE: { relay: 'light carried on a chain of people who agreed to stand there', lamp: 'a lamp is a promise the camp made to one corner of the dark' },
  PARTS: { frame: 'the old world left the bones of its roads', axle: 'what carries weight is always the first thing to be stolen', engine: 'power that is not light, found, not made', wheel: 'four things the dark never learned to hate', battery: 'a cell of the old light, still warm', cab: 'a roof to keep the crew together' },
  CAR: { speed: 'a truck outruns the dark for a while', back: 'reverse is slow because every retreat is', turn: 'a wide turn: nothing out here is nimble', seats: 'a seat is a job, and every job is a person you owe', store: 'what the truck carries is what the camp believes in', ram: 'the truck is the heaviest argument you have', lamp: 'headlights are the only thing that decides what is real ahead', roof: 'the big lamp a friend aims is trust in a beam' },
  CAMP: { burnPerDay: 'the fire eats light every day it lights you, and someone has to feed it', priceStep: 'debts make everything cost more: that is what debts are', priceCap: 'the camp punishes, never locks anyone out', lanternDebt: 'one day behind and the camp will not hand you a lantern', soloShare: 'when friends are gone you gather for the camp first', powerCurve: 'each next bit of strength costs more: even the dark knows it' },
  FIRE_COST: { 0: 'the first fire needs nothing: it is the reason you are here', 1: 'the second ring of light, the first cost', 2: 'growing the fire wakes something', 3: 'a bigger fire is a louder invitation', 4: 'now it can be seen from the wall', 5: 'the last level: as big as a fire gets' },
  SLAM: { max: 'a hard landing breaks what is under you', min: 'a small drop is only a stumble', r0: 'the shock hits closest first', r1: 'and thins out with distance' },
  TORCH: { r: 'a flashlight beam is light you carry, so what it touches commits to a shape', cos: 'a narrow beam is a decision about where to look', s: 'a torch is weaker than a fire, on purpose' },
  FLARE: { cost: 'a flare is light you chose to spend', life: 'it burns out, as everything here does', r: 'its circle is small', reach: 'you can only throw it so far', pull: 'the dark goes to the brightest thing', burn: 'what the dark does to a lit thing' },
  SENSE: { far: 'they see you from far in light', near: 'and only up close in the dark', alert: 'once they know, they stay on you', noise: 'every gun has a voice, and the dark has ears', scale: 'sound travels, but not as far as fear', life: 'a noise lasts a moment, then it is only a memory', crouch: 'a crouched person is a quieter person', drift: 'they lose you, and go where you were' },
  TRACER: { every: 'every fourth round is light', life: 'it burns a third of a second', width: 'a line of light you can stand next to', len: 'long enough to show what is out there' },
  PULL: { cone: 'the suit leans your aim toward what you mean', max: 'only within sight', k: 'a little help, never the whole thing' },
  REACT: { window: 'a half second to answer the dark', bars: 'the dark gives you warning in thirds' },
  DIRECTOR: { hurt: 'the dark notices when you bleed', near: 'and when it is close', alone: 'and when you are alone', decay: 'it lets you breathe', peak: 'then comes back', relax: 'the lull is part of the plan', r: 'this is how close is close' },
  FLOOD_WARN: { FLOOD_WARN: 'the dark chooses its gap, and a good crew sees it choose' },
  EARTH_DARK: { base: 'Earth is where the dark was always going to start', perPlayer: 'more of you, more of it', perMinute: 'the longer you stay, the more it comes', every: 'in pulses, like breathing' },
  DUES: { perPerson: 'everyone the fire lights owes the fire' },
  SOLID_AT: { SOLID_AT: 'the dark has no shape of its own: light makes it commit to one' },
  WALLS: { half: 'the walls were white once and are black now: they hold a community the shape of a hundred meters', h: 'tall enough to hide what is out there from the people in here', t: 'thick enough to be a wall and not a rumor', gate: 'four gates, because even a wall has to let someone out' },
  EARTH: { x: 'the landing site is a place on a map nobody keeps', z: 'it is far from the Moon camp, which is the point', stay: 'the lander leaves when its time is up, with or without you', light: 'the lander lamp is the only light you start with', reach: 'a relay from the lander reaches this far', cells: 'what the old world left behind to be found' },
  SHIP: { mass: 'a ship is a thing you can only hold with both hands', hover: 'it rests above the dust as if the ground were not trusted', reach: 'its thrusters feel the ground a long way down', k: 'springs that settle in one breath', damp: 'no bounce: nothing here bounces back', climb: 'up is the direction away', ceil: 'there is a ceiling to leaving', thrust: 'push', lift: 'lift', drag: 'the air resists on Earth', dragQ: 'and more the faster you go', grip: 'it drifts, because nothing holds', turn: 'the nose swings, then settles', bank: 'it leans into a turn the way a person does', nose: 'it dips when it pushes', gravity: 'the Moon pulls gently', half: 'four thrusters, four corners', top: 'the top speed of getting away' },
};
// every line of LORE.md with the rule that makes it true: [the lore, "file#thing"]
export const LORE_LINES = [
  ['Every survivor has a theory, and all of them could be wrong', 'core/game.js#THEORIES'],
  ['Nothing happens to the ones it takes: they simply stop being anywhere (a form, in triplicate)', 'core/game.js#CAMP_OUT'],
  ['Every morning the odds go up on a board; the leaders soften them', 'client/camp.js#odds'],
  ['The truth is on the board only if someone goes and checks', 'client/camp.js#check'],
  ['Raising the number is the game: what you build nudges the decimal up', 'client/camp.js#past'],
  ['The game grows in eras, each deeper into the lore', 'core/eras.js#ERAS'],
  ['Light makes the dark real', 'core/game.js#SOLID_AT'],
  ['The humor lives in paperwork, signs and the board footnotes', 'client/camp.js#footnote'],
  ['The dark comes on your first night', 'core/game.js#DUSK_AT'],
  ['The walls were white once and are black now', 'core/game.js#WALLS'],
  ['The dark sits beyond the rim by day and presses to the light by night', 'core/game.js#tideRadius'],
  ['You are the brightest thing for a long way: your health is your glow', 'core/game.js#glowOf'],
  ['Knowledge is labeled checked, reasoned or guess', 'core/knowledge.js#labelFor'],
  ['Hyper-awareness: the game notices you noticing', 'core/awareness.js#awareStep'],
  ['An ordinary day, flipped where it is cool', 'core/mirror.js#mirrorDay'],
  ['The sky and far land get stranger the farther out', 'core/immersion.js#strangeAt'],
];
