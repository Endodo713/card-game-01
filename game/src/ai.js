// Ember Pact — the opponent. Readable by design: it plays one card at a
// time, most expensive first, and every play is written to the log, so the
// player can see what it is doing and plan around it.

import { playCard, canPlay, strikeBoard, nextTurn, beginTurn } from './state.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pick the most expensive card the AI can afford. Creatures first when the
// costs tie, so its board is the threat you have to answer — and the log
// shows every play, so nothing it does is hidden.
function pickCard(game) {
  const playable = game.enemy.hand.filter((c) => canPlay(game, game.enemy, c));
  if (playable.length === 0) return null;
  playable.sort((a, b) => b.cost - a.cost || (a.kind === 'creature' ? -1 : 1));
  return playable[0];
}

export async function takeEnemyTurn(game, onUpdate) {
  if (game.phase !== 'enemy') return;
  // The AI's own turn start: fresh energy, a draw, and a fresh resonance count.
  beginTurn(game, game.enemy);
  onUpdate();

  await sleep(650);
  let guard = 0;
  while (game.phase === 'enemy' && guard < 12) {
    guard += 1;
    const card = pickCard(game);
    if (!card) break;
    playCard(game, game.enemy, card.uid);
    onUpdate();
    await sleep(650);
    if (game.phase !== 'enemy') return; // the game ended mid-turn
  }

  await sleep(500);
  if (game.phase !== 'enemy') return;
  strikeBoard(game, game.enemy, game.player);
  onUpdate();
  if (game.phase !== 'enemy') return;
  await sleep(600);
  nextTurn(game);
  onUpdate();
}
