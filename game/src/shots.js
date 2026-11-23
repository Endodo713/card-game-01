// Ember Pact — deterministic screenshot states (?shot=start|play|win|loss).
// Every state is built with the game's own constructors and drawn by the
// same render code as live play, so the screenshots are real renders —
// the title, a busy mid-game table, and both end screens.

import { seededRand } from './cards.js';
import { newGame, startGame, newCardInstance, finishGame } from './state.js';

function midGame(seed) {
  const rand = seededRand(seed);
  const game = newGame(rand);
  startGame(game);
  game.turn = 4;
  // A busy, readable table: full boards, full hands, hurt heroes, a shield.
  game.player.hp = 24;
  game.player.shield = 4;
  game.player.energy = 5;
  game.player.energyCap = 6;
  game.enemy.hp = 19;
  game.enemy.energy = 4;
  game.enemy.energyCap = 6;
  const put = (side, defId, hp) => {
    const c = newCardInstance(defId);
    if (hp !== undefined) { c.health = hp; c.maxHealth = hp; }
    side.board.push(c);
    return c;
  };
  put(game.player, 'bark-warden');
  put(game.player, 'ash-hound');
  put(game.player, 'tide-sprite');
  put(game.enemy, 'coral-guard');
  put(game.enemy, 'ember-drake');
  game.player.hand = ['cinder-pup', 'fireball', 'thorn-sprout', 'gale-falcon', 'soothing-rain'].map((id) => newCardInstance(id));
  game.enemy.hand = ['ash-hound', 'spark-imp', 'lightning', 'bark-warden'].map((id) => newCardInstance(id));
  game.log = [
    'Turn 4. You play Bark Warden (2/5).',
    'Enemy plays Ember Drake (5/4).',
    'You trigger Thorn Resonance: +4 shield.',
    'Your creatures strike for 6.',
  ];
  return game;
}

export function gameForShot(shot, seed) {
  if (shot === 'play') return midGame(seed);
  if (shot === 'win') {
    const game = midGame(seed);
    game.enemy.hp = 0;
    finishGame(game, 'won');
    return game;
  }
  if (shot === 'loss') {
    const game = midGame(seed);
    game.player.hp = 0;
    finishGame(game, 'lost');
    return game;
  }
  return newGame(seededRand(seed)); // 'start' (and default): the title screen
}
