// Knowledge is the crew's shared currency, always labeled how sure it is (his words; LORE.md). Three labels, never blurred:
//  guess    : nobody has proof (a robot's estimate, a rumor, the council's number)
//  reasoned : worked out from what really happened (3 or more of your own trips or nights)
//  checked  : measured by someone in the crew themselves (10 or more trips, or a thing taken apart by hand)
// The board and the wrist both print the label next to the number, so a number never travels without it.
export const LABELS = ['guess', 'reasoned', 'checked'];
export const NEED = { reasoned: 3, checked: 10 };
export function labelFor(evidence, tookApart = false) { return tookApart || evidence >= NEED.checked ? 'checked' : evidence >= NEED.reasoned ? 'reasoned' : 'guess'; }
// a number with its label, the way the wrist and the board print it
export const labeled = (text, evidence, tookApart) => `${text} (${labelFor(evidence, tookApart)})`;
