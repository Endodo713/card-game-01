// Ember Pact — the rules: turns, energy, resonance, combat, win and loss.
// Pure logic, no DOM here. render.js draws whatever this module holds.

import { buildDeck, defOf, shuffle, RESONANCE } from './cards.js';

export const START_HP = 30;
export const MAX_HAND = 7;
export const MAX_ENERGY = 10;

let uid = 1;

export function newCardInstance(defId) {
  const def = defOf(defId);
  return { uid: uid++, defId, name: def.name, suit: def.suit, kind: def.kind, cost: def.cost, attack: def.attack ?? 0, health: def.health ?? 0, maxHealth: def.health ?? 0, guard: !!def.guard, effect: def.effect ?? null, text: def.text };
}

function newSide(isAI, rand) {
  const deck = shuffle(buildDeck(), rand);
  const side = { isAI, hp: START_HP, shield: 0, energy: 0, energyCap: 3, deck, hand: [], board: [], fatigue: 0 };
  for (let i = 0; i < 3; i++) drawCard(side);
  return side;
}

export function drawCard(side) {
  if (side.hand.length >= MAX_HAND) return null;
  if (side.deck.length === 0) {
    side.fatigue += 1;
    damageHero(side, side.fatigue, null);
    return null;
  }
  const card = newCardInstance(side.deck.pop());
  side.hand.push(card);
  return card;
}

export function newGame(rand) {
  uid = 1;
  return {
    rand,
    player: newSide(false, rand),
    enemy: newSide(true, rand),
    turn: 1,
    phase: 'title', // title | player | enemy | won | lost
    suitsPlayed: [],
    log: ['Welcome to Ember Pact. Reduce the enemy hero to 0.'],
    lastEvent: null,
  };
}

export function startGame(game) {
  game.phase = 'player';
  beginTurn(game, game.player);
}

export function beginTurn(game, side) {
  side.energyCap = Math.min(3 + (game.turn - 1), MAX_ENERGY);
  side.energy = side.energyCap;
  if (game.turn > 1 || side.isAI) drawCard(side);
  game.suitsPlayed = []; // a fresh count every turn, for both duelists
}

export function endPlayerTurn(game) {
  if (game.phase !== 'player') return;
  strikeBoard(game, game.player, game.enemy);
  if (game.phase !== 'player') return; // someone won during the strike
  game.phase = 'enemy';
  game.log.push('Enemy turn.');
}

// Creatures strike at the end of their owner's turn. Guards absorb first,
// so a Guard on the enemy board must be chewed through before the hero bleeds.
export function strikeBoard(game, attacker, defender) {
  for (const creature of attacker.board.slice()) {
    if (creature.health <= 0) continue;
    let dmg = creature.attack;
    const guards = defender.board.filter((c) => c.guard && c.health > 0).sort((a, b) => a.health - b.health);
    for (const guard of guards) {
      if (dmg <= 0) break;
      const hit = Math.min(dmg, guard.health);
      guard.health -= hit;
      dmg -= hit;
      game.log.push(`${creature.name} hits ${guard.name} for ${hit}.`);
    }
    if (dmg > 0) damageHero(defender, dmg, game);
    if (defender.hp <= 0) {
      finishGame(game, attacker.isAI ? 'lost' : 'won');
      return;
    }
    attacker.board = attacker.board.filter((c) => c.health > 0);
    defender.board = defender.board.filter((c) => c.health > 0);
  }
}

export function damageHero(side, amount, game) {
  let left = amount;
  if (side.shield > 0) {
    const absorbed = Math.min(side.shield, left);
    side.shield -= absorbed;
    left -= absorbed;
  }
  side.hp = Math.max(0, side.hp - left);
  if (game) game.lastEvent = { type: 'hero-hit', side: side.isAI ? 'enemy' : 'player', amount: left };
}

function healHero(side, amount) {
  side.hp = Math.min(START_HP, side.hp + amount);
}

function resolveEffect(game, side, foe, effect) {
  switch (effect) {
    case 'draw1': drawCard(side); game.log.push(`${side.isAI ? 'Enemy' : 'You'} draw a card.`); break;
    case 'heal2': healHero(side, 2); break;
    case 'heal3': healHero(side, 3); break;
    case 'heal5draw1': healHero(side, 5); drawCard(side); break;
    case 'ping1': damageHero(foe, 1, game); break;
    case 'hero3': damageHero(foe, 3, game); break;
    case 'hero4': damageHero(foe, 4, game); break;
    case 'board2':
      for (const c of foe.board) c.health -= 2;
      foe.board = foe.board.filter((c) => c.health > 0);
      break;
    default: break;
  }
}

function triggerResonance(game, side, foe, suit) {
  const count = game.suitsPlayed.filter((s) => s === suit).length;
  if (count !== 2) return; // fires on the second card of a suit in the turn
  const name = side.isAI ? 'Enemy' : 'You';
  if (suit === 'flame') { damageHero(foe, 3, game); game.log.push(`${name} trigger Flame Resonance: +3 to the enemy hero.`); }
  if (suit === 'tide') { drawCard(side); game.log.push(`${name} trigger Tide Resonance: draw a card.`); }
  if (suit === 'thorn') { side.shield += 4; game.log.push(`${name} trigger Thorn Resonance: +4 shield.`); }
  if (suit === 'storm') { side.energy = Math.min(side.energy + 2, MAX_ENERGY + 2); game.log.push(`${name} trigger Storm Resonance: +2 embers.`); }
  game.lastEvent = { type: 'resonance', suit };
}

export function canPlay(game, side, card) {
  return game.phase === (side.isAI ? 'enemy' : 'player') && side.energy >= card.cost;
}

export function playCard(game, side, cardUid) {
  const idx = side.hand.findIndex((c) => c.uid === cardUid);
  if (idx < 0) return false;
  const card = side.hand[idx];
  if (!canPlay(game, side, card)) return false;
  side.energy -= card.cost;
  side.hand.splice(idx, 1);
  game.suitsPlayed.push(card.suit);
  const foe = side.isAI ? game.player : game.enemy;
  const who = side.isAI ? 'Enemy' : 'You';
  if (card.kind === 'creature') {
    side.board.push(card);
    game.log.push(`${who} play ${card.name} (${card.attack}/${card.health}).`);
  } else {
    game.log.push(`${who} cast ${card.name}.`);
  }
  if (card.effect) resolveEffect(game, side, foe, card.effect);
  if (foe.hp <= 0 || side.hp <= 0) {
    finishGame(game, foe.hp <= 0 ? (side.isAI ? 'lost' : 'won') : (side.isAI ? 'won' : 'lost'));
    return true;
  }
  triggerResonance(game, side, foe, card.suit);
  if (foe.hp <= 0 || side.hp <= 0) {
    finishGame(game, foe.hp <= 0 ? (side.isAI ? 'lost' : 'won') : (side.isAI ? 'won' : 'lost'));
  }
  return true;
}

export function finishGame(game, result) {
  game.phase = result;
  game.log.push(result === 'won' ? 'Victory! The enemy hero falls.' : 'Defeat. Your hero falls.');
}

export function nextTurn(game) {
  game.turn += 1;
  game.phase = 'player';
  beginTurn(game, game.player);
}
