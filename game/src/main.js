// Ember Pact — boot and input: buttons, keyboard, and the turn loop.
// A ?shot= URL renders a deterministic state for screenshots; otherwise a
// fresh shuffled game starts from the title screen.

import { newGame, startGame, playCard, endPlayerTurn } from './state.js';
import { takeEnemyTurn } from './ai.js';
import { render, resetRenderState } from './render.js';
import { sfx, unlockAudio, toggleMute, isMuted } from './sound.js';
import { gameForShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 1);

let game = shot ? gameForShot(shot, seed) : newGame(Math.random);
window.__game = game;

const hooks = {
  onPlayCard(card) {
    if (game.phase !== 'player') return;
    if (playCard(game, game.player, card.uid)) {
      sfx.play();
      render(game, hooks);
      maybeEnemyTurn();
    }
  },
};

function maybeEnemyTurn() {
  if (game.phase === 'enemy') {
    takeEnemyTurn(game, () => {
      render(game, hooks);
      if (game.phase === 'won') sfx.win();
      if (game.phase === 'lost') sfx.lose();
    });
  }
}

function endTurn() {
  if (game.phase !== 'player') return;
  sfx.click();
  endPlayerTurn(game);
  render(game, hooks);
  maybeEnemyTurn();
}

function begin() {
  unlockAudio();
  sfx.play();
  resetRenderState();
  game = newGame(Math.random);
  window.__game = game;
  startGame(game);
  render(game, hooks);
}

document.getElementById('play-btn').addEventListener('click', begin);
document.getElementById('again-btn').addEventListener('click', begin);
document.getElementById('end-turn').addEventListener('click', endTurn);
document.getElementById('mute-btn').addEventListener('click', (e) => {
  const m = toggleMute();
  e.currentTarget.textContent = m ? '🔇 Sound off' : '🔊 Sound on';
});

document.addEventListener('keydown', (e) => {
  if (game.phase === 'title') {
    if (e.key === 'Enter') begin();
    return;
  }
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); endTurn(); return; }
  if (e.key === 'm' || e.key === 'M') { document.getElementById('mute-btn').click(); return; }
  const n = Number(e.key);
  if (n >= 1 && n <= 7) {
    const card = game.player.hand[n - 1];
    if (card) hooks.onPlayCard(card);
  }
});

// Title-screen shortcuts need no game running; the table renders below.
if (shot === 'play' || shot === 'win' || shot === 'loss') {
  if (shot === 'win') sfx.win();
  if (shot === 'loss') sfx.lose();
}
render(game, hooks);
