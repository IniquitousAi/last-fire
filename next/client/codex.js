// The CODEX: one honest place (in the pause menu) where a player can read what play never says out loud. Four lists, plain words, from the
// game's own tables, never retyped: what each rule is and why it is in the world (core/reasons.js), what each era teaches (core/lessons.js), the
// feel check beside each number (core/feel.js), and what checked, reasoned and guess mean (core/knowledge.js). Steel-thin lines on black, no glow.
import * as G from '../core/game.js?v=179';
import { SHIP } from '../core/ship.js?v=179';
import { CAMP } from '../core/camp.js?v=179';
import { REASONS } from '../core/reasons.js?v=179';
import { ERAS } from '../core/lessons.js?v=179';
import { PLACED } from '../core/placed.js?v=179';
import { FEEL } from '../core/feel.js?v=179';
import { LABELS, NEED } from '../core/knowledge.js?v=179';

const TABLES = { KINDS: G.KINDS, NODE: G.NODE, PARTS: G.PARTS, CAR: G.CAR, CAMP, FIRE_COST: G.FIRE_COST, SLAM: G.SLAM, TORCH: G.TORCH, FLARE: G.FLARE, SENSE: G.SENSE, TRACER: G.TRACER, PULL: G.PULL, REACT: G.REACT,
  DIRECTOR: G.DIRECTOR, FLOOD_WARN: { FLOOD_WARN: G.FLOOD_WARN }, EARTH_DARK: G.EARTH_DARK, DUES: G.DUES, SOLID_AT: { SOLID_AT: G.SOLID_AT }, WALLS: G.WALLS, EARTH: G.EARTH, SHIP };
const TITLE = { KINDS: 'The dark\'s shapes', NODE: 'Relays and lamps', PARTS: 'Truck parts', CAR: 'The truck', CAMP: 'The camp and its dues', FIRE_COST: 'Growing the fire', SLAM: 'Landing hard', TORCH: 'Your flashlight', FLARE: 'Flares', SENSE: 'How the dark notices you', TRACER: 'Tracer rounds',
  PULL: 'Aim help on a controller', REACT: 'The half second after a hit', DIRECTOR: 'How the night paces itself', FLOOD_WARN: 'The warning before a breach', EARTH_DARK: 'How hard Earth pushes', DUES: 'What each person owes', SOLID_AT: 'Light makes the dark real', WALLS: 'The walls', EARTH: 'The landing site', SHIP: 'The ship' };
const ERA_NAME = { scavenged: 'Scavenged', light: 'Light', community: 'The community', wilds: 'The Wilds', rift: 'The Rift', darktech: 'The dark\'s own tech', mirror: 'The mirror realm' };
const MEANS = { guess: 'nobody has proof: a robot\'s estimate or a rumor', reasoned: `worked out from what really happened, from ${NEED.reasoned} or more of your own trips`, checked: `measured by someone in the crew, ${NEED.checked} or more trips, or taken apart by hand` };
const esc = x => String(x).replace(/[<&>]/g, c => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' })[c]);
const val = v => typeof v === 'number' ? (Number.isInteger(v) ? v : +v.toFixed(3)) : Array.isArray(v) ? '' : typeof v === 'object' && v ? '' : esc(v);

const STYLE = `<style>.cx h3 { font: 500 22px "Barlow Condensed", sans-serif; letter-spacing: .16em; color: #eef0f8; margin: 22px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #4a4f63; } .cx h4 { font: 500 16px "Barlow Condensed", sans-serif; letter-spacing: .14em; color: #8c92a8; margin: 14px 0 2px; }
 .cx .r { display: grid; grid-template-columns: 120px 1fr; gap: 10px; padding: 3px 0 3px 10px; border-left: 1px solid #4a4f63; font-size: 15px; line-height: 1.25; } .cx .r b { font-weight: 500; color: #eef0f8; } .cx .r span { color: #b9bccb; } .cx .r small { display: block; color: #8c92a8; font-size: 13px; }
 .cx p { color: #b9bccb; font-size: 15px; margin: 4px 0; } .cx .lb { color: #eef0f8; }</style>`;

export function codexHtml() {
  let n = 0, out = `${STYLE}<div class="cx"><p>What the game never says out loud, in one place. Every line here is read from the game's own rules, so it cannot drift.</p>`;
  out += '<h3>THE RULES, AND WHY THEY ARE IN THE WORLD</h3>';
  for (const [t, tab] of Object.entries(TABLES)) { const why = REASONS[t]; if (!why) continue; out += `<h4>${esc(TITLE[t] || t)}</h4>`;
    for (const k of Array.isArray(tab) ? tab.map((_, i) => String(i)) : Object.keys(tab)) { if (!why[k]) continue; n++; const v = val(tab[k]); out += `<div class="r"><b>${esc(t === 'FIRE_COST' ? 'level ' + k : k)}${v !== '' ? ' ' + v : ''}</b><span>${esc(why[k])}</span></div>`; } }
  out += '<h3>WHY EACH THING STANDS WHERE IT DOES</h3><p>Every object in the camp has a reason and a story.</p>';
  for (const [u, P] of Object.entries(PLACED)) out += `<div class="r"><b>${esc(u.replace(/^(ph:|[a-z]+\/)/, '').replace(/\.glb$/, '').replace(/[_-]/g, ' '))}</b><span>${esc(P.why)}<small>${esc(P.story)}</small></span></div>`;
  out += '<h3>WHAT EACH ERA TEACHES</h3><p>Never as text in play: you learn it by doing it. This is the one place it is written down.</p>';
  for (const e of ERAS) out += `<div class="r"><b>${esc(ERA_NAME[e.id] || e.id)}</b><span>teaches <span class="lb">${esc(e.teaches)}</span><small>${esc(e.stuff)}. ${esc(e.proof)}.</small></span></div>`;
  out += '<h3>HOW IT SHOULD FEEL, BESIDE THE NUMBER</h3><p>When a number and the feel disagree, the feel wins.</p>';
  for (const [t, k, feel] of FEEL) { const tab = t === 'DAY' ? { DAY: G.DAY } : TABLES[t], v = tab && tab[k]; out += `<div class="r"><b>${esc(t === k ? t : t + ' ' + k)} ${val(v)}</b><span>${esc(feel)}</span></div>`; }
  out += '<h3>HOW SURE A NUMBER IS</h3><p>A number never travels without one of these three words.</p>';
  for (const l of LABELS) out += `<div class="r"><b>${l}</b><span>${esc(MEANS[l])}</span></div>`;
  return out + `<p class="note">${n} rules listed.</p></div>`;
}
