// The mirror realm (his words: the most stereotypical day on Earth, flipped only where it is cool). A rough playable version: the ordinary day
// is a list of hours; each hour has its flipped twin, and the twin is what the walled community does at that hour of the game's day.
// No jokes in the rules: the humor lives in the signs (client/mirror.js draws them) and the board.
// day: the game's day as 0..1 (clock). ORDINARY is what a person's day looks like; MIRROR is what happens here at the same hour.
export const ORDINARY = [['wake', 'alarm, coffee'], ['commute', 'drive to the office'], ['work', 'a shift at a desk'], ['lunch', 'a sandwich, a break room'], ['school', 'kids learn the maze of a school building'], ['home', 'dinner and a screen'], ['sleep', 'lights out']];
export const MIRROR = [
  { id: 'wake', from: 0.00, to: 0.08, flips: 'the alarm is the dawn horn', does: 'everyone counts heads at the fire', where: 'fire' },
  { id: 'commute', from: 0.08, to: 0.20, flips: 'you drive to work; here you walk out of the gate into the dark', does: 'the day crew commutes outward, toward the wall', where: 'gate' },
  { id: 'work', from: 0.20, to: 0.45, flips: 'a shift at a desk; here a shift at the fire', does: 'shifts at the fire, relays checked, the Clerk laminates', where: 'fire' },
  { id: 'lunch', from: 0.45, to: 0.52, flips: 'a break room; here a ration line', does: 'the ration line forms at the store', where: 'store' },
  { id: 'school', from: 0.52, to: 0.60, flips: 'school teaches the building; here school teaches the maze', does: 'children recite which wall moved today', where: 'hut' },
  { id: 'home', from: 0.60, to: 0.97, flips: 'dinner and a screen; here a screen of smiling signs while the dark presses in', does: 'everyone indoors, the signs say have a nice day', where: 'bunks' },
  { id: 'sleep', from: 0.97, to: 1.01, flips: 'lights out; here lights are the only thing that stay on', does: 'lamps stay lit, someone watches the wall', where: 'wall' },
];
export const mirrorDay = clock => MIRROR.find(m => clock >= m.from && clock < m.to) || MIRROR[MIRROR.length - 1];
// the smiling signs (cheerful lines that read wrong at night); [day line, night line]
export const SIGNS = [['HAVE A NICE DAY', 'HAVE A NICE DAY'], ['YOUR SAFETY IS OUR PRIORITY', 'YOUR SAFETY IS OUR PRIORITY (3RD)'], ['SMILE: YOU ARE BEING COUNTED', 'SMILE: YOU WERE COUNTED'], ['THE GATE IS OPEN FOR YOUR CONVENIENCE', 'THE GATE IS OPEN']];
export const signLine = (i, clock) => SIGNS[i % SIGNS.length][clock >= 0.62 && clock < 0.97 ? 1 : 0];
