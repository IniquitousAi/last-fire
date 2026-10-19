// Feel beats number (his words: feeling real matters more than being real; taste rule 80). Every number a player can feel has a feel check beside
// it: what it should feel like, and the band the number may sit in for that feel to hold. When a number and a feel disagree, the feel wins and
// the override is written in FEEL_LOG with who felt it. sim/feel_test.mjs checks every row against the live value.
// FEEL: [table, key, what it should feel like, low, high]
export const FEEL = [
  ['CAR', 'speed', 'fast enough to outrun a walker with a story to tell, slow enough that a wall is a decision', 12, 24],
  ['CAR', 'lamp', 'headlights that show the next hundred steps, not the horizon', 10, 20],
  ['CAR', 'roof', 'a roof lamp is a rifle for light: longer than the headlights', 16, 30],
  ['TORCH', 'r', 'your flashlight reaches the next shape, not the one after', 14, 26],
  ['FLARE', 'life', 'long enough to finish a thought, short enough to feel spent', 8, 16],
  ['FLARE', 'r', 'a flare lights a room, not a field', 5, 9],
  ['FLARE', 'reach', 'you can throw it past the edge of your own light', 12, 22],
  ['SENSE', 'far', 'in full light they see you from across a yard', 24, 40],
  ['SENSE', 'life', 'a noise is remembered about two breaths', 1, 4],
  ['TRACER', 'life', 'a tracer lingers a third of a second, long enough to see where it went', 0.25, 0.5],
  ['TRACER', 'every', 'one in four is light: often enough to read, rare enough to mean something', 3, 6],
  ['SLAM', 'min', 'a short drop is only a stumble', 30, 70],
  ['SLAM', 'max', 'a long drop hurts but is not a verdict', 90, 140],
  ['WALLS', 'half', 'a community small enough to cross in half a minute', 30, 70],
  ['WALLS', 'h', 'a wall you look up at, not over', 20, 40],
  ['WALLS', 'gate', 'a gate wide enough for the truck', 6, 10],
  ['EARTH', 'stay', 'two and a half minutes to be somewhere you do not belong', 120, 200],
  ['EARTH', 'light', 'the lander lamp holds a circle you can sprint across in two seconds', 7, 12],
  ['FLOOD_WARN', 'FLOOD_WARN', 'a good crew sees the gap choose, then has time to act, not time to relax', 2, 4],
  ['SHIP', 'hover', 'it rests a body-height above the ground, not a house', 2, 5],
  ['SHIP', 'damp', 'critically damped: it settles with no bounce', 0.9, 1.1],
  ['SHIP', 'top', 'the top speed is the reason for the ship', 200, 500],
  ['CAMP', 'priceCap', 'debt is punished, never fatal', 1.5, 3],
  ['CAMP', 'powerCurve', 'strength grows, slower each time: a fourth root', 0.15, 0.4],
  ['CAMP', 'soloShare', 'playing without friends gives most of the haul to the camp', 0.6, 0.95],
  ['DAY', 'DAY', 'a day is five minutes: long enough for a trip, short enough to feel the dusk coming', 240, 420],
  ['DIRECTOR', 'relax', 'the lull after a peak is long enough to breathe', 3, 10],
];
// tables whose numbers are felt only as a whole, and the measure that stands for the feel
export const FEEL_VIA = {
  KINDS: 'felt as how a walker, runner, shard, face, watcher and giant behave: sim/director.mjs holds the tension band 0.25 to 0.70',
  NODE: 'felt as how far a lamp or relay lights the ground: core/game.js lightAt, seen in every screenshot of a lit camp',
  PARTS: 'felt as weight on your back: speedOf, a 60 kg frame slows you to about two thirds',
  CAMP: 'felt as prices and morale on the board: sim/camp_sim.mjs picked the knobs, 75 versions, 9 rules',
  FIRE_COST: 'felt as how long a night of banking the next fire level takes: sim/economy.mjs',
  SENSE: 'felt as being noticed: sim/breach.mjs and the sight rules from 7 Days to Die',
  PULL: 'felt as aim assist on a controller: the pad gate in sim/basics.cjs',
  REACT: 'felt as the half second you get to answer a hit: sim/director.mjs',
  DIRECTOR: 'felt as tension rising and falling: sim/director.mjs flow band',
  EARTH_DARK: 'felt as how hard Earth pushes: sim/drop.mjs, a perfect player holds tension 0.68',
  DUES: 'felt as the board line each person owes: sim/camp_sim.mjs',
  SOLID_AT: 'felt as shapes that appear only in light: sim/light_rule.mjs',
  SHIP: 'felt in the cockpit: sim/ship.mjs measures the settle, the bank and the top speed',
  CAR: 'felt in the truck: sim/truckbuild.mjs',
  TORCH: 'felt as the reach of the flashlight', FLARE: 'felt as the reach of a thrown flare', SLAM: 'felt as the weight of a landing', TRACER: 'felt as the line a round leaves',
  WALLS: 'felt as the size of the community', EARTH: 'felt as the size of the landing site', FLOOD_WARN: 'felt as the warning before a breach',
};
// where feel overruled a number: [knob, the number first, the number now, what was felt, when]. Each is checked against the code that holds it.
export const FEEL_LOG = [
  { knob: 'camp lamp intensity', was: 6, now: 3, felt: 'the papers under it blew out to white and flashed his eyes', when: '2026-10-19', file: 'client/camp.js', has: 'PointLight(0xdfe6ff, 3, 9, 1.6)' },
  { knob: 'ship damping', was: 0.4, now: 1.0, felt: 'it bobbed and he found that confusing; no bounce', when: '2026-10-19', file: 'core/ship.js', has: 'damp: 1.0' },
  { knob: 'EARTH_DARK perMinute', was: 14, now: 7, felt: 'a perfect player was tense at 0.71; 7 brought it to 0.68 and back 95%', when: '2026-10-19', file: 'core/game.js', has: 'perMinute: 7' },
  { knob: 'board brightness', was: 'full white', now: 'a hair under bloom threshold', felt: 'a halo behind the big numbers', when: '2026-10-19', file: 'client/camp.js', has: 'color: 0xc4c4c4' },
];
