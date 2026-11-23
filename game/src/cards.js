// Ember Pact — card definitions: the suits and the whole deck.
// Suits are told apart by colour AND shape, never by text alone:
//   Flame ▲ red, Tide ● blue, Thorn ◆ green, Storm ★ amber.

export const SUITS = {
  flame: { name: 'Flame', glyph: '▲', color: '#e5484d', dark: '#8f1d22', bg: '#fdeceb' },
  tide: { name: 'Tide', glyph: '●', color: '#3e8fd9', dark: '#155a94', bg: '#e9f3fd' },
  thorn: { name: 'Thorn', glyph: '◆', color: '#43a85a', dark: '#1e6b31', bg: '#e9f7ec' },
  storm: { name: 'Storm', glyph: '★', color: '#e8a13c', dark: '#8a5c10', bg: '#fdf3e0' },
};

// One card definition. kind: 'creature' | 'spell'.
// Creatures stay on the board and strike at the end of their owner's turn.
// effect: an on-play effect id, resolved by state.js.
export const CARD_DEFS = [
  { id: 'cinder-pup', name: 'Cinder Pup', suit: 'flame', kind: 'creature', cost: 1, attack: 2, health: 1, text: 'A small spark that bites.' },
  { id: 'ash-hound', name: 'Ash Hound', suit: 'flame', kind: 'creature', cost: 2, attack: 3, health: 2, text: 'Runs ahead of the fire.' },
  { id: 'ember-drake', name: 'Ember Drake', suit: 'flame', kind: 'creature', cost: 4, attack: 5, health: 4, text: 'Its wings are still burning.' },
  { id: 'tide-sprite', name: 'Tide Sprite', suit: 'tide', kind: 'creature', cost: 1, attack: 1, health: 2, text: 'Draw a card.', effect: 'draw1' },
  { id: 'coral-guard', name: 'Coral Guard', suit: 'tide', kind: 'creature', cost: 2, attack: 1, health: 4, text: 'Guard. Stands in the way.', guard: true },
  { id: 'deep-leviathan', name: 'Deep Leviathan', suit: 'tide', kind: 'creature', cost: 5, attack: 6, health: 6, text: 'The tide itself, given teeth.' },
  { id: 'thorn-sprout', name: 'Thorn Sprout', suit: 'thorn', kind: 'creature', cost: 1, attack: 1, health: 3, text: 'Heal 2.', effect: 'heal2' },
  { id: 'bark-warden', name: 'Bark Warden', suit: 'thorn', kind: 'creature', cost: 3, attack: 2, health: 5, text: 'Guard. Roots hold the line.', guard: true },
  { id: 'oak-ancient', name: 'Oak Ancient', suit: 'thorn', kind: 'creature', cost: 5, attack: 4, health: 7, text: 'Heal 3.', effect: 'heal3' },
  { id: 'spark-imp', name: 'Spark Imp', suit: 'storm', kind: 'creature', cost: 1, attack: 2, health: 1, text: 'Deal 1 to the enemy.', effect: 'ping1' },
  { id: 'gale-falcon', name: 'Gale Falcon', suit: 'storm', kind: 'creature', cost: 3, attack: 4, health: 3, text: 'Faster than the thunder.' },
  { id: 'tempest-lord', name: 'Tempest Lord', suit: 'storm', kind: 'creature', cost: 6, attack: 7, health: 7, text: 'The storm answers to him.' },
  { id: 'fireball', name: 'Fireball', suit: 'flame', kind: 'spell', cost: 2, text: 'Deal 3 to the enemy hero.', effect: 'hero3' },
  { id: 'soothing-rain', name: 'Soothing Rain', suit: 'tide', kind: 'spell', cost: 2, text: 'Heal 5. Draw a card.', effect: 'heal5draw1' },
  { id: 'root-snare', name: 'Root Snare', suit: 'thorn', kind: 'spell', cost: 2, text: 'Deal 2 to all enemy creatures.', effect: 'board2' },
  { id: 'lightning', name: 'Lightning', suit: 'storm', kind: 'spell', cost: 4, text: 'Deal 4 to the enemy hero.', effect: 'hero4' },
];

// Resonance: playing a second card of the same suit in one turn triggers the bonus.
export const RESONANCE = {
  flame: { text: 'Flame Resonance: +3 damage to the enemy hero.' },
  tide: { text: 'Tide Resonance: draw a card.' },
  thorn: { text: 'Thorn Resonance: +4 shield.' },
  storm: { text: 'Storm Resonance: +2 embers this turn.' },
};

// Build a 30-card deck: 2 copies of each creature (24) + spells (6).
export function buildDeck() {
  const deck = [];
  for (const def of CARD_DEFS) {
    const copies = def.kind === 'creature' ? 2 : def.id === 'fireball' || def.id === 'lightning' ? 2 : 1;
    for (let i = 0; i < copies; i++) deck.push(def.id);
  }
  return deck;
}

export function defOf(id) {
  return CARD_DEFS.find((d) => d.id === id);
}

// Fisher-Yates with an injectable random source (seeded for ?shot= states).
export function shuffle(deck, rand) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// Tiny seeded RNG (mulberry32) so screenshot states are deterministic.
export function seededRand(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
