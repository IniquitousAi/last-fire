# Last Fire: innovation ideas for every part of the game (2026-10-19)

Written by the research worker. Ideas only: nothing here is built or decided. Every idea grows from the one rule the game already has (light makes the dark real) and from his answers in ANSWERS.md. Nothing is copied from another game's mechanics; where a famous game is named, it is named only for the feeling or the research behind it.

How each idea is written: **Idea** (one sentence). **Logic** (why it makes sense in this world). **Feeling** (what it creates). **Robot test** (how a simulator in `sim/` could check it). **Label** (checked, reasoned or guess, with the source). One idea per part is marked RECOMMENDED.

Label rule used here: **checked** means a published study or a developer's own talk shows the effect directly. **reasoned** means the idea is worked out from a checked finding or from the game's own rules, but nobody has tested this exact use. **guess** means taste and logic only.

## The ten best, in order

| # | The idea | Part | Why it ranks here |
| --- | --- | --- | --- |
| 1 | **Tracers are light.** Every tracer round lights what it flies past for a split second, so your own fire makes smoke solid along its path. | Combat | Turns the core rule into the gun feel itself. Violence and light become one skill. Nothing plays like it. |
| 2 | **Shadows are the dark too.** Every lamp casts real shadows, and inside a shadow the dark stays smoke, even in the middle of your camp. | Light and fire | Makes placing light true geometry (his "clever engineering") with zero new UI. |
| 3 | **The dark wears what you looked at.** The masks it picks come from the things your camera lingered on. It never says so. | Enemies | "The dark learns you", "unsettling" and "never says" in one rule, with data the game already records. |
| 4 | **Stake your own odds.** Before a trip you post your guess on the board, and the camp keeps your score for how often your guesses come true. | Odds board | The curiosity spine (his pick B) made playable: being right is a skill that grows, and knowledge stays honest. |
| 5 | **The half-lit first enemy.** The first one you ever meet stands half in a lamp's beam: your shot passes through its dark half and cracks its lit half. | Onboarding | Teaches the whole game in three seconds with no words. Valve-style show, not tell. |
| 6 | **The cold is in your hands.** No warmth meter: the longer you are out of light, the more your aim shakes and your breath fogs; light and the truck's cab stop it. | Warmth | A thing in the world does the meter's job (his favorite kind), and coming back to light becomes a real pleasure. |
| 7 | **Take it apart to learn it.** You never get a recipe: you find a dead machine on Earth, strip it, and what you learned is a "reasoned" blueprint until your rebuilt one runs, then "checked". | Building | Building, knowledge labels and Earth trips become one loop. |
| 8 | **Your body gets faster at what you repeat.** Reloads, climbs and bolting parts on speed up with practice, on a curve that flattens. No levels, no points. | Progression | His exact words: repetition is fine "when I get faster at it". Infinite, diminishing, never resets. |
| 9 | **Sound is sharp only in light.** In the dark everything is muffled and smeared; light a place and it snaps into crisp, crunchy sound. | Sound | Sound sets the mood and sells the hits (his two picks), and it rewards light without a single icon. |
| 10 | **The learned friend makes his mistakes.** The copy of an offline friend misses where he misses, panics where he panics, and carries too much like he does. | Learned friend | "You cannot tell it is not him" only works if it is as flawed as him. Perfect bots feel fake. |

---

## 1. The light and the fire

**A. Shadows are the dark too. RECOMMENDED**
- Idea: every light casts real shadows, and anywhere inside a shadow the dark stays smoke, even in the middle of your lit camp.
- Logic: the rule is "light makes it solid". A shadow is a place light does not reach, so it must follow the rule. A crate in the yard is a hiding place for something you cannot shoot.
- Feeling: you start reading your own camp as geometry. A second lamp on the far side of a wall feels like a smart move, not a purchase.
- Robot test: raycast each light's shadows on the yard; robots place lamps to shrink the shadowed share of the walkable ground per light cell spent. Pass line: the best layout found by robots beats a random one by a clear margin, and no layout reaches zero shadow (so placement always matters).
- Label: reasoned (the game's own rule plus plain optics; real-time shadows are standard in three.js).

**B. The flame is the clock.**
- Idea: the fire's flame height drops as its fuel burns, and that height is the only way to read how long the light has left.
- Logic: a real fire shows its fuel. A number would be the council's number; the flame is the true one.
- Feeling: a glance at the fire tells you if you can risk one more trip. Dread you can see.
- Robot test: a player model that reads only flame height (with human error) must make the same feed decisions as one that reads the true fuel number at least 90% of the time.
- Label: reasoned (diegetic UI research: Dead Space's health on the suit, GDC 2013; Hardspace: Shipbreaker's diegetic UI, GDC 2021).

**C. Borrowed light.**
- Idea: the cells you take down to Earth come out of the fire, so the camp is dimmer while you are gone, and it brightens when you bring more back.
- Logic: light is conserved. Your trip is a loan against the camp's safety.
- Feeling: a tether. The trip is never free, and the return is a visible payback.
- Robot test: compare camp night survival with and without the loan across greedy and careful robots; the loan must change trip length choices without making any night unwinnable for a perfect crew.
- Label: guess.

## 2. Warmth and survival needs (undecided: these are options, not a decision)

**A. The cold is in your hands. RECOMMENDED**
- Idea: no meter; the longer you stay out of light, the more your aim shakes, your breath fogs on the visor and your reload fumbles, and standing in light (the fire, a lamp, the truck's cab) brings your hands back.
- Logic: light is warmth (his founding rule). Cold hands are what cold does to a real body. One cause, one effect, read by feel.
- Feeling: the relief of stepping into light is a real pleasure, because research says thermal pleasure only exists when you go from cold to warm. Not a chore, a reward.
- Robot test: a player model with aim error that grows with time out of light; tune the growth so a skilled robot can still play a whole trip in the dark (his "you could play without lights, with a lot of skill") but loses about a third of its hits.
- Label: reasoned (Cabanac's alliesthesia: a warm stimulus pleases only a cold body, so pleasure comes from the change; via Parkinson and de Dear's review).

**B. One cell on your hip.**
- Idea: your suit's heater, lamp and sprint all draw from one glowing light cell clipped to your hip, which you can see dim when you look down.
- Logic: the camp runs on cells; so does your body. It is the same economy at the smallest scale.
- Feeling: one honest need instead of three annoying ones. Spending a cell on a sprint is a real choice.
- Robot test: robots with three separate needs vs one shared cell; measure decisions per minute (more is better) and "chore" actions per minute (fewer is better).
- Label: guess.

**C. Huddle heat.**
- Idea: players close together lose warmth slower, the same way they already glow brighter together.
- Logic: shared glow already exists in the rules (each friend within 6 m adds to your light). Body heat follows.
- Feeling: you drift toward your friends without being told. Solo, the truck's cab is your huddle.
- Robot test: crews with huddle heat vs without: spread distance and falls per trip. Solo robots must not be worse off than the crew average by more than a set line.
- Label: reasoned (built on the existing glowOf rule in core/game.js).

## 3. Enemies and their masks

**A. The dark wears what you looked at. RECOMMENDED**
- Idea: the masks the dark picks come from the things your camera lingered on during past trips (mannequins, a poster, a coat on a hook), and nothing ever tells you.
- Logic: "one thing, many masks" says it wears the shapes from our heads. Your head is what you looked at. The daemon already records habits (core/habits.js); gaze is one more habit.
- Feeling: slow, unsettling recognition. "Wait, I stared at that." Exactly his "you slowly notice it knows you".
- Robot test: robots with different gaze habits; check the mask mix each crew meets tracks their own gaze log, and that two crews with different habits meet different masks.
- Label: reasoned (agency detection is driven by expectation plus unclear input: the predictive-processing account in Szymanek et al. 2024; the Drivatar shows learned player models work in shipped games).

**B. Raking light grows faces.**
- Idea: faces in walls and rubble only form where light hits a surface at a low angle, so lighting a wall head-on keeps it a wall.
- Logic: low-angle light makes the strongest shadows in texture, which is exactly when real people see faces in patterns.
- Feeling: you learn to distrust certain angles, and you learn a real fact about light.
- Robot test: measure ambushes per minute against lamp angle; robots must learn to place lamps head-on, and the ambush rate must drop for them.
- Label: reasoned (pareidolia and the strange-face illusion grow in dim, low-detail light: Caputo's mirror studies, via Scientific American).

**C. The commit.**
- Idea: when a light flickers, a mask half-commits for a moment, and a shot in that moment cracks it twice as hard.
- Logic: light forces a shape; a flicker forces a rushed one.
- Feeling: a skill window. Flicking your own lamp becomes a fighting technique.
- Robot test: player model with a 250 ms reaction; the window must be hit about a third of the time by a skilled bot and rarely by a random one.
- Label: guess.

## 4. Combat and gun feel

**A. Tracers are light. RECOMMENDED**
- Idea: every tracer round lights what it passes for a split second, so firing into smoke makes the masks along the bullet's path solid for the next shot.
- Logic: a tracer is burning light. The rule says light makes the dark solid. So your own fire is a light source.
- Feeling: full auto down a dark hallway paints it solid and then shreds it. Violence and light become the same skill. A belt mix (more tracers, less damage) becomes a real loadout choice.
- Robot test: robots with tracer ratios from 0 to 1; time to clear a dark room and ammo spent. Pass line: a middle ratio wins (so there is a real choice), and no ratio beats placing lamps outright.
- Label: reasoned (the game's own rule; push-forward combat where the player makes what they need in the fight: Loudy and Campbell, "Embracing Push Forward Combat in DOOM", GDC 2018).

**B. The freeze on the kill.**
- Idea: a lit mask that dies holds its shattered shape in the air for a fraction of a second before it bursts into motes.
- Logic: the dark lets go of the shape all at once; light holds the image a moment.
- Feeling: crunch. Every kill reads.
- Robot test: not a robot job for taste, but a script can check that the freeze length scales with the target's size and never stacks past a cap during hordes (frame budget).
- Label: checked (hit stop, sound coherence and camera control are the top drivers of impact feel in reviews: Lin et al. 2022; a pleasant hit stop range exists: Tomizawa and Ishikawa 2024).

**C. Your muzzle is a lamp.**
- Idea: each shot's flash lights the room for a moment, so firing makes nearby masks solid but also shows you to them.
- Logic: flash is light. Light works both ways.
- Feeling: a gunshot is a decision. Silence in the dark is also a decision.
- Robot test: robots that fire freely vs robots that fire in bursts; falls per trip. Pass line: neither style dominates.
- Label: guess.

## 5. Hordes

**A. The horde is a flood, light is the dam. RECOMMENDED**
- Idea: a horde moves as one body of smoke that pools against your light, finds the dimmest gap and pours through it, taking shapes only where it hits light.
- Logic: it is one thing wearing many masks, so it should move like one thing. Smoke flows to the low point.
- Feeling: you see the breach coming as a bulge in the dark, and plugging it with a lamp or your body is the clutch moment.
- Robot test: a flow simulation against robot lamp networks; log where breaches happen. Pass line: breaches happen at the weakest light most of the time (so it is readable), and a perfect crew can always see one coming at least two seconds before.
- Label: reasoned (the Left 4 Dead director's dramatic pacing goal, Booth AIIDE 2009, is the feeling; the flow is ours).

**B. The horde breaks.**
- Idea: kill enough masks fast enough and the rest lose their nerve, drop their shapes and flee as smoke.
- Logic: shapes cost the dark effort; a fast loss makes the cost not worth it.
- Feeling: the "I don't give a fuck" play style gets its payoff: raw aggression ends a fight early.
- Robot test: break threshold tuned so aggressive robots end hordes earlier than careful ones, but take more damage.
- Label: guess.

**C. The horde carries what it took.**
- Idea: a horde is full of the light it stole from Earth's dead, so a bigger horde drops more motes.
- Logic: the motes rule already exists (a Hollow bursts into the light it stole).
- Feeling: greed. A huge horde is a jackpot you have to survive.
- Robot test: reward per minute against risk per minute for fighting vs avoiding a horde; both paths must pay within a set ratio.
- Label: reasoned (built on the die() rule in core/game.js).

## 6. Building

**A. Take it apart to learn it. RECOMMENDED**
- Idea: you never get a recipe: you find a dead machine on Earth (a generator, a pump), strip it piece by piece, and what you learned is a "reasoned" blueprint until the one you rebuild at camp actually runs, then it is "checked".
- Logic: nobody knows how the old world worked anymore. Knowledge is the crew's currency, labeled checked, reasoned or guess (his answer). Reverse engineering is how you would really learn.
- Feeling: you earned the machine twice. Research says we love what we build, but only when it works, so the moment it runs is the payoff.
- Robot test: robots with and without strip-down knowledge; build success rate and time. A "reasoned" blueprint should fail sometimes (a set share), "checked" never.
- Label: checked for the attachment (Norton, Mochon and Ariely 2012: labor raises value only when the task is completed); reasoned for the loop.

**B. Wiring is the build.**
- Idea: every machine has a power budget you route by hand: the truck's battery can feed the headlamps, the cab heater or the winch, not all at once.
- Logic: real machines trade power. Light, warmth and work all draw from one battery.
- Feeling: clever engineering: the same truck plays differently by how you wired it.
- Robot test: robots search all wirings for a trip; pass line: no single wiring wins every trip type.
- Label: guess.

**C. Parts with a past.**
- Idea: every part has a condition and an origin (a bus wheel, worn), and mismatched parts fit with a known cost (it wobbles at speed).
- Logic: a dead city has whatever it had. Nothing is a clean "part".
- Feeling: every truck is a story of where its parts came from.
- Robot test: the truck's top speed and wear rate as a function of part mix; check no mix is useless and none is strictly best.
- Label: guess.

## 7. Vehicles

**A. Seats are jobs. RECOMMENDED**
- Idea: each of the four seats does something: the driver drives, the roof seat aims the big lamp, the back seat fires, the last one keeps the engine alive; solo, you climb between seats while the truck rolls.
- Logic: the headlamp already makes the dark solid (CAR.lamp in the rules). A lamp worth aiming needs a person.
- Feeling: the crew is a machine. Solo, it is frantic and heroic, never empty.
- Robot test: crews of 1 to 4 running the same route; time and losses. Pass line: solo is slower but finishes about as often (his "just as good solo").
- Label: reasoned (built on CAR in core/game.js).

**B. Ramming only hits what is lit.**
- Idea: smoke passes through the grille; only masks in the headlamps' beam take the hit.
- Logic: the rule again: dark is smoke, light is solid.
- Feeling: driving with lights off is stealth; lights on is a battering ram. A real switch.
- Robot test: route survival with lights on and off; both must have a use.
- Label: reasoned (the game's own rule).

**C. The truck's engine is a voice.**
- Idea: the engine's sound is built from its parts, and it keeps every dent, so every crew's truck sounds and looks like its own life.
- Logic: the world remembers everything (his answer); a truck is part of the world.
- Feeling: attachment. It is "your" truck the way a camp person is a person.
- Robot test: a script checks each part mix gives a different sound fingerprint.
- Label: guess.

## 8. Storage and weight

**A. Light shows through your pack. RECOMMENDED**
- Idea: carried cells glow through bags and the truck's bed and draw the dark, unless you build a shielded box, which is heavy but hides the glow.
- Logic: the rules already say carriers glow and the dark hunts the glow. A shield is just physics.
- Feeling: a real trade every trip: carry fast and visible, or heavy and hidden.
- Robot test: robots with and without the box; cells brought home and falls. Pass line: the box helps careful robots and slows greedy ones.
- Label: reasoned (glowOf and greed in core/game.js; loss aversion makes the carried load feel real: Tomé et al., "Risking Treasure").

**B. Weight in the body.**
- Idea: a heavy load also makes your footsteps louder, your turns slower, your breathing heavier and your view a little lower.
- Logic: weight is felt by the whole body, not only in speed.
- Feeling: you feel how much you are carrying without a number.
- Robot test: a script checks every load level changes at least four body signals and that turn speed never drops under a playable floor.
- Label: reasoned (Dead Space remake's breath and voice follow the body's state: EA Motive, A.L.I.V.E.).

**C. Load high, tip over.**
- Idea: where weight sits on the truck matters: stacked high, it tips on a hard turn.
- Logic: center of mass.
- Feeling: packing the truck is a small puzzle with real stakes.
- Robot test: physics runs of loading patterns; tip rate per turn speed.
- Label: guess.

## 9. The camp and its people

**A. People go out, and some do not come back. RECOMMENDED**
- Idea: camp people take their own trips on the true odds, and when one does not come back, the form is filled out in triplicate and their bunk stays empty; gear you give them raises their odds.
- Logic: "most come back" (LORE.md). The odds are real, so they must sometimes come true.
- Feeling: stakes you did not choose, and the dry humor of the form. Giving away your good gun is a real act of care.
- Robot test: run a year of camp days; losses must match the posted odds within error, and giving gear must raise survival measurably.
- Label: reasoned (the odds board's rule; reactive lines after loss work in Hades: Kasavin and Korb, GDC 2021).

**B. Gossip drifts.**
- Idea: what you did reaches people who were not there, and each retelling bends the numbers a bit, so the camp's story about you drifts from the log.
- Logic: ego and softened numbers are the villain (lore 11 and 12). Rumors are softened numbers.
- Feeling: being right, alone. You can check the log and correct it, and nobody cares.
- Robot test: a script follows a story through the camp and checks the drift grows with the number of retellings.
- Label: guess.

**C. Routines you can break.**
- Idea: every person has a daily route (fire shift, board, bunk) that shifts when you change the camp, and they say so.
- Logic: people live from the event log (IMMERSION.md).
- Feeling: the camp feels lived in, and you see your effect on it.
- Robot test: move a lamp, replay a day; at least one person's route and line must change.
- Label: reasoned (IMMERSION.md: at least 3 visible consequences a day).

## 10. The economy and dues

**A. Your bunk shows your dues. RECOMMENDED**
- Idea: the fire's light reaches each person's bunk by what they put in, so a free rider sleeps in a dim corner and everyone can see it.
- Logic: the fire is a commons; light is the receipt. "We know if you do or don't" (his words), shown, not said.
- Feeling: soft social pressure with no rule. The lone wolf's bunk stays bright for days after a big stoke.
- Robot test: the existing camp robots (sim/camp_sim.mjs) check bunk light matches contribution and that the lone wolf back after 21 days is still lit.
- Label: reasoned (Ostrom's principles: monitoring by the users themselves; tested as game rules in an adapted Catan, Smith 2023).

**B. Sanctions in steps, on paper.**
- Idea: missed dues bring a note on your bunk first, then a form, then higher prices, then no lanterns; each step is a real piece of paper.
- Logic: the camp runs on paperwork (lore 19).
- Feeling: dry humor and fairness. One slip is a warning, never a punishment.
- Robot test: free riders must feel each step in order; honest players who miss one day must never reach step two.
- Label: checked (graduated sanctions keep cooperation better than harsh ones: Ostrom's fifth principle; Couto, Pacheco and Santos model).

**C. Knowledge pays dues.**
- Idea: a note on the research computer that turns from reasoned to checked counts as dues.
- Logic: his answer: all work can lead to knowledge, and research is a real job.
- Feeling: the thinker is as welcome as the fighter.
- Robot test: a research-only robot must be able to pay dues, but slower than a worker (so it is not an exploit).
- Label: reasoned (ANSWERS.md, merging the lore).

## 11. The Earth trips

**A. Pick the site by its odds. RECOMMENDED**
- Idea: the lander's board lists landing sites with honest odds (truck parts 40%, reasoned; light cells 70%, guess), and every trip makes those odds sharper.
- Logic: the camp lives by odds; the trips should too. Knowledge turns guesses into checked numbers.
- Feeling: choosing a drop is a bet you understand. Coming back with what the odds said feels like being right.
- Robot test: robots that pick by odds vs at random; parts per trip. The odds shown must match outcomes over many trips.
- Label: reasoned (calibration research, see part 18).

**B. Feed the lander.**
- Idea: the lander's engines idle on light, and you can spend cells into it to buy more time down there.
- Logic: the 150 s stay is fuel, not magic.
- Feeling: greed against the clock, and you can see the clock in its glow.
- Robot test: cells spent on time vs cells brought home; extra time must never pay for itself fully.
- Label: guess.

**C. A foothold that fades.**
- Idea: a relay left on Earth survives to the next trip, dimmer each time, so you can build a slow frontier.
- Logic: the world remembers; the dark eats light slowly (entropy).
- Feeling: unfinished business that pulls you back (one of his four reasons to return).
- Robot test: frontier growth rate over 20 trips; it must grow, then flatten (diminishing returns).
- Label: reasoned (Zeigarnik and Ovsiankina: interrupted tasks are remembered and resumed; replication is mixed, so weak).

## 12. Progression

**A. Your body gets faster at what you repeat. RECOMMENDED**
- Idea: every action you do (reload, climb, bolt on a wheel, aim the roof lamp) gets a little faster with practice, on a curve that flattens and never resets.
- Logic: this is how real skill works, and it is his own rule: repetition is fine "when I get faster at it".
- Feeling: you feel yourself improving without a number; the grinder is faster, the casual is not left behind because the curve flattens.
- Robot test: robots playing 1, 10 and 100 hours; the gap between them must shrink over time (catch up), and no action is ever slower than at the start.
- Label: checked (the power law of practice: Newell and Rosenbloom 1981, from prior knowledge, not searched this session).

**B. The number is the level.**
- Idea: each new era opens only when the honest odds on the board cross a line.
- Logic: lore 18: raising the number is the game.
- Feeling: progress that means something in the story.
- Robot test: era timing across player types; it must land in a target range for both grinders and casuals.
- Label: reasoned (LORE.md).

**C. Gear wears into you.**
- Idea: a gun you use a lot takes your grip marks and handles a little better for you only.
- Logic: worn tools fit the hand.
- Feeling: attachment; giving that gun to a camp person costs something.
- Robot test: handling gain caps small; swapping guns must still be worth it sometimes.
- Label: guess.

## 13. Death and loss

**A. Your Ember shows how you fell. RECOMMENDED**
- Idea: an Ember holds the last ten seconds as a light trace on the ground (where you walked, where it came from), so whoever picks it up sees what killed you.
- Logic: an Ember is light, and light records. Unfair deaths are his top reason to quit; seeing the cause makes each one explainable.
- Feeling: "oh, that is what happened" instead of "that was cheap". Learning, not anger.
- Robot test: the robots' why_falls.mjs already sorts deaths by cause; every fall must produce a trace that names a cause a perfect player could have avoided.
- Label: reasoned (meaningful permadeath depends on the death making sense: Carter and Allison on DayZ).

**B. The loss goes on the board.**
- Idea: the odds drop by what was really lost, and the footnote names it.
- Logic: his answer: a loss drops the number by what was really lost.
- Feeling: honest weight. Dry humor in the footnote.
- Robot test: the odds change must equal the simulated value of what was lost.
- Label: reasoned (ANSWERS.md).

**C. The dark wears your gear.**
- Idea: the gun you dropped on Earth shows up on the next trip, carried by a mask.
- Logic: it learns you, and it takes what you leave.
- Feeling: a personal hunt, and a reason to go back.
- Robot test: dropped items reappear within a set number of trips and can be won back.
- Label: guess.

## 14. Co-op and solo

**A. The world keeps your friends. RECOMMENDED**
- Idea: when you log in alone, everything friends did since you last played is in the world: the relay they built, their scuffs on the truck, a note on the board in their name, people talking about them.
- Logic: the world remembers everything; friends are part of the world.
- Feeling: never alone. The camp is full of them even when they sleep (his top solo need).
- Robot test: replay a friend's session, then a solo login; count traces visible within the first minute (at least 3).
- Label: reasoned (social entities cut loneliness, but only when they show agency: VR study via Nweon; Sunami's dissertation on social surrogacy, mixed).

**B. Talk with light.**
- Idea: flash your lamp at a spot to point; flash twice to say "come"; the learned friend and camp people answer the same signals.
- Logic: the crew lives by light. No text chat needed in the world.
- Feeling: wordless teamwork that works the same with friends or alone.
- Robot test: a signal set robots can learn; time to group up with and without it.
- Label: checked for the feeling (Journey's wordless cooperation built connection: Jenova Chen's talk, via Destructoid); reasoned for ours.

**C. Roles from weight.**
- Idea: no classes; what you carry decides your role, and a crew sorts itself.
- Logic: weight already slows you (speedOf).
- Feeling: one fights, one builds, by choice.
- Robot test: crews settle into mixed loads over time without being told.
- Label: guess.

## 15. The learned friend

**A. It makes his mistakes. RECOMMENDED**
- Idea: the copy of an offline friend misses where he misses, panics where he panics, and overloads where he does, learned from his recorded habits.
- Logic: "you cannot tell it is not him". Perfect play is the giveaway; flaws are the disguise.
- Feeling: he is with you, and that is the dread.
- Robot test: a judge robot tries to tell the real friend's recorded trips from the copy's; pass line: it guesses right no more often than a coin.
- Label: checked that it works in a shipped game (Forza's Drivatar learns real players' driving and races in others' games while they are offline; it filters out joke driving); reasoned for ours.

**B. It brings back what it found.**
- Idea: the friend's copy does real work while he is away, and when he logs in, a camp person tells him what "he" did.
- Logic: the camp only knows what happened, not who was real.
- Feeling: for him, odd and funny; for you, a partner.
- Robot test: the copy's work must follow the low-impact solo rule (camp.js: hours past your friends mostly build the shared camp).
- Label: reasoned (Drivatar rewards offline performance; core/camp.js).

**C. The one tell.**
- Idea: the copy never stops to check the odds board, because checking is the one thing that takes caring.
- Logic: lore: the truth is there only for whoever cares enough to check.
- Feeling: a chill for the one who notices. Never said.
- Robot test: none needed; it is a rule, not a number.
- Label: guess (optional; it breaks "cannot tell" on purpose, so it is his call).

## 16. Sound

**A. Sound is sharp only in light. RECOMMENDED**
- Idea: in the dark everything is muffled and smeared, as if the smoke drinks it; light a place and its sounds snap into crisp, close detail, including every hit.
- Logic: the dark is smoke; smoke absorbs. Light makes things real, and real things sound real.
- Feeling: lighting a room is satisfying to the ear. Hits crunch where you fight well.
- Robot test: a script checks every sound passes through a filter driven by lightAt() at the listener and the source.
- Label: reasoned (sound coherence is a top driver of impact feel: Lin et al. 2022; the Dead Space remake shapes audio by material and space: EA Motive).

**B. Your breath is your health.**
- Idea: your breathing and heartbeat show how hurt, cold and loaded you are.
- Logic: a body would know.
- Feeling: you feel your state instead of reading it.
- Robot test: every state change must change the breath track within a second.
- Label: checked (Dead Space remake's A.L.I.V.E. system ties breath, heart and voice to state: EA Motive).

**C. The murmur counts the living.**
- Idea: the camp's background murmur is made of one voice per living person, so when someone is lost, it thins.
- Logic: the camp is its people.
- Feeling: grief you hear before you know.
- Robot test: murmur voices must equal the camp's head count.
- Label: guess.

## 17. UI and HUD

**A. One light is your health. RECOMMENDED**
- Idea: your own glow dims as you are hurt, so you, your friends and the dark can all see how close you are to falling.
- Logic: you are light; losing health is losing light. The dark already hunts by glow.
- Feeling: no bar on screen, and a friend runs to you because they saw you go dim.
- Robot test: robots must be able to read a friend's health from glow alone within a set error; the HUD audit (under 6% of the screen) passes.
- Label: reasoned (diegetic health: Dead Space, Ignacio, GDC 2013; removing the HUD raised immersion in expert players: Iacovides et al., UCL).

**B. The wrist screen.**
- Idea: the only screen is on your wrist, and you raise your arm to look, which takes time in a fight.
- Logic: lore 8: better tech shows the odds anywhere.
- Feeling: info has a cost; glancing is a risk.
- Robot test: robots that check the wrist more often must take more hits.
- Label: reasoned (LORE.md; Hardspace: Shipbreaker, GDC 2021).

**C. The HUD fades with skill.**
- Idea: any on-screen hint fades away once you have shown you no longer need it.
- Logic: the HUD only shows what your body would know, and you learn.
- Feeling: the screen gets cleaner as you get better.
- Robot test: track hint use; each hint must vanish for a player model after it is used correctly several times.
- Label: checked for experts (Iacovides et al., UCL); reasoned for ours.

## 18. The odds board and knowledge labels

**A. Stake your own odds. RECOMMENDED**
- Idea: before a trip you post your own guess on the board ("we bring back 3 parts, 60%"), and the camp keeps a score of how often your guesses come true.
- Logic: the game is about honest odds and checking. Being well calibrated is the skill the whole lore praises.
- Feeling: being right is its own reward, and you get measurably better at it (the curiosity machine, his pick B).
- Robot test: robots with good and bad calibration; the score must separate them clearly within about 20 trips.
- Label: checked (calibration feedback improved forecasters, plain outcome feedback did not: Benson and Önkal; training cut overconfidence: Moore et al. 2017, Good Judgment).

**B. A guess can fail.**
- Idea: a blueprint, a site or a tactic marked "guess" works only sometimes; "reasoned" usually; "checked" always.
- Logic: the labels mean something only if they change outcomes.
- Feeling: checking is worth the time.
- Robot test: failure rates per label must match a set ladder.
- Label: reasoned (his labels, ANSWERS.md).

**C. Footnotes cite the log.**
- Idea: every footnote under the odds names a real event from yesterday.
- Logic: the board is honest by rule.
- Feeling: dry humor that is also proof.
- Robot test: every footnote must point to a log line.
- Label: reasoned (IMMERSION.md).

## 19. Lore delivery

**A. Theories with odds. RECOMMENDED**
- Idea: each camp person has their theory of what happened, pinned on a wall with its own odds, and what you find on Earth moves those odds, but no theory ever reaches "checked".
- Logic: lore 1: nobody knows; every survivor has a theory, all could be wrong.
- Feeling: mystery that moves, never solved, always closer.
- Robot test: a script checks each find moves at least one theory, and none passes a set ceiling.
- Label: reasoned (LORE.md; Hades' reactive dialogue shows lore can live in reactions: Kasavin and Korb, GDC 2021).

**B. The frozen Tuesday.**
- Idea: every Earth site is one moment of an ordinary day, frozen: cups on tables, a microwave door open at 0:00.
- Logic: the mirror realm of an ordinary Earth day (his ramble).
- Feeling: eerie, quiet, close to home.
- Robot test: every placed object carries a reason field (IMMERSION.md rule).
- Label: reasoned.

**C. The forms.**
- Idea: lore lives in paperwork you find (disappearance forms, quota slips), each with a deadpan line.
- Logic: lore 19.
- Feeling: dry dark humor in passing, never a wall of text.
- Robot test: none; his eyes.
- Label: reasoned.

## 20. Onboarding

**A. The half-lit first enemy. RECOMMENDED**
- Idea: the first one you ever meet stands half in a lamp's beam, so your first shot passes through its dark half and cracks its lit half.
- Logic: the core rule shown in one image.
- Feeling: understanding without words, in about three seconds. You feel clever, not taught.
- Robot test: a player model with no knowledge must learn "aim at the lit part" within its first encounter in most runs.
- Label: checked for the method (Half-Life 2's Ravenholm saw blade teaches by staging; Valve's design process slides, GDC 2006, and Game Maker's Toolkit).

**B. A head start on the truck.**
- Idea: on your first day, the truck's frame is already in the bay, left by someone who did not come back.
- Logic: the camp had people before you; one of them started it.
- Feeling: momentum. You finish someone's work.
- Robot test: new robots with and without the frame; share that finish the truck.
- Label: checked (head-start loyalty cards were completed more often: Nunes and Drèze 2006).

**C. Watch it done first.**
- Idea: your first trip, a camp person goes down with you and does each thing once, then stops.
- Logic: people teach people in a camp.
- Feeling: never lost, never lectured.
- Robot test: time to first part carried with and without.
- Label: reasoned (Valve playtesting: watch silently, fix what confuses).

---

## What I searched (2026-10-19)

1. Diegetic interfaces and immersion: GDC 2021 "Cutting Apart The Diegetic Interface" (Hardspace: Shipbreaker); Dead Space UI (GDC 2013); Iacovides et al., UCL, on HUD removal and expert immersion.
2. DOOM push-forward combat: Loudy and Campbell, GDC 2018.
3. Game feel and juice: Lin et al. 2022 (arXiv 2208.06155); Tomizawa and Ishikawa 2024 (hit stop); Waterloo haptic juice study, CHI 2021.
4. Pacing directors: Booth, "The AI Systems of Left 4 Dead", AIIDE 2009.
5. The IKEA effect: Norton, Mochon and Ariely 2012.
6. Solo play and loneliness: Sunami's dissertation (University of Delaware) on social surrogacy; a 75-person VR study on social entities; Whitfield 2026 (Murray State).
7. The peak-end rule: Kahneman 1993 (cold water study).
8. Thermal pleasure: Cabanac's alliesthesia; Parkinson and de Dear's review.
9. Faces in the dark: Caputo's strange-face illusion and Troxler fading (Scientific American).
10. Wordless co-op: Jenova Chen on Journey (Destructoid, GDC Vault listing).
11. Loss and permadeath: Tomé et al., "Risking Treasure" (loss aversion in games); Carter and Allison on DayZ; Bowie-Wilson, MIT.
12. Reactive narrative: Kasavin and Korb, "Breathing Life into Greek Myth: The Dialogue of Hades", GDC 2021.
13. Commons and sanctions: Ostrom's principles; Fehr and Gächter 2000; Couto, Pacheco and Santos; Smith 2023 (Ostrom rules in Catan).
14. Calibration: Good Judgment Project (Mellers 2014, Moore 2017); Benson and Önkal on calibration feedback.
15. Teaching without tutorials: Valve's GDC 2006 design process slides; Half-Life 2 Ravenholm analyses.
16. Body-state audio: EA Motive on the Dead Space remake's A.L.I.V.E. system.
17. Player clones: Forza's Drivatar (Turn 10, Microsoft Research Cambridge).
18. Unfinished business: Zeigarnik and Ovsiankina (replication is mixed).
19. Agency detection: Barrett's HADD; Maij et al. 2019; Szymanek et al. 2024 (foggy VR forest, threat effect not confirmed).
20. Weapon sound: an ITU thesis on Valorant gun sounds (perceived power from sound); no strong controlled study found.
21. Head starts: Nunes and Drèze 2006, endowed progress.

Not searched, from prior knowledge: the power law of practice (Newell and Rosenbloom 1981). Gaps: no controlled study was found on gun sound and perceived power, or on the Left 4 Dead director's real effect on players (a 2024 arXiv paper says it was never measured).
