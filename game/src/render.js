// Ember Pact — the table: DOM rendering, card motion and feedback.
// Re-renders the dynamic areas from state.js; the browser's CSS does the
// sliding, flipping and snapping. One render call redraws the whole table,
// so the game state is always the single source of truth.

import { SUITS } from './cards.js';
import { START_HP } from './state.js';

let seenUids = new Set();
let lastEventSeen = null;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function suitBadge(suit) {
  const s = SUITS[suit];
  const b = el('span', 'suit-badge');
  b.style.background = s.color;
  b.textContent = s.glyph;
  return b;
}

export function cardElement(card, opts = {}) {
  const def = SUITS[card.suit];
  const c = el('div', `card suit-${card.suit}`);
  c.dataset.uid = card.uid;
  if (opts.playable === false) c.classList.add('disabled');
  if (opts.selected) c.classList.add('selected');
  if (!seenUids.has(card.uid)) c.classList.add('just-played');
  seenUids.add(card.uid);

  const cost = el('div', 'cost', String(card.cost));
  cost.style.background = def.dark;
  c.appendChild(cost);
  const art = el('div', 'art', def.glyph);
  art.style.color = def.color;
  c.appendChild(art);
  c.appendChild(el('div', 'name', card.name));
  c.appendChild(el('div', 'text', card.text));
  if (card.guard) c.appendChild(el('div', 'guard', 'GUARD'));
  if (card.kind === 'creature') {
    const stats = el('div', 'stats');
    stats.appendChild(el('span', 'atk', `⚔ ${card.attack}`));
    stats.appendChild(el('span', 'hp', `♥ ${card.health}`));
    c.appendChild(stats);
  } else {
    const stats = el('div', 'stats');
    stats.appendChild(el('span', 'spell-tag', 'SPELL'));
    c.appendChild(stats);
  }
  if (opts.onClick) c.addEventListener('click', () => opts.onClick(card));
  return c;
}

function cardBackElement() {
  const c = el('div', 'card card-back');
  c.appendChild(el('div', 'art', '✦'));
  c.appendChild(el('div', 'name', 'Ember Pact'));
  return c;
}

function vitals(container, side, label) {
  container.innerHTML = '';
  const who = el('div', 'who');
  who.appendChild(el('span', 'who-name', label));
  who.appendChild(suitBadge(side.board.length ? side.board[0].suit : 'flame'));
  container.appendChild(who);
  const hp = el('div', 'hpbar');
  const fill = el('div', 'hpfill');
  fill.style.width = `${(side.hp / START_HP) * 100}%`;
  hp.appendChild(fill);
  hp.appendChild(el('span', 'hptext', `${side.hp} / ${START_HP}`));
  container.appendChild(hp);
  const meta = el('div', 'meta');
  meta.appendChild(el('span', 'energy', `⬢ ${side.energy} / ${side.energyCap}`));
  if (side.shield > 0) meta.appendChild(el('span', 'shield', `◆ Shield ${side.shield}`));
  meta.appendChild(el('span', 'deck', `Deck ${side.deck.length}`));
  container.appendChild(meta);
}

function floatText(table, text, kind) {
  const f = el('div', `floater ${kind}`, text);
  f.style.left = `${45 + Math.random() * 10}%`;
  f.style.top = '38%';
  table.appendChild(f);
  setTimeout(() => f.remove(), 1200);
}

export function render(game, hooks) {
  const table = document.getElementById('table');
  const title = document.getElementById('title-screen');
  const end = document.getElementById('end-screen');
  title.classList.toggle('hidden', game.phase !== 'title');
  table.classList.toggle('hidden', game.phase === 'title');
  end.classList.toggle('hidden', game.phase !== 'won' && game.phase !== 'lost');
  if (game.phase === 'title') return;

  if (game.phase === 'won' || game.phase === 'lost') {
    document.getElementById('end-title').textContent = game.phase === 'won' ? 'VICTORY' : 'DEFEAT';
    document.getElementById('end-title').className = game.phase === 'won' ? 'win' : 'lose';
    document.getElementById('end-sub').textContent =
      game.phase === 'won'
        ? `The enemy hero falls on turn ${game.turn}. The pact is yours.`
        : `Your hero falls on turn ${game.turn}. The embers scatter.`;
    document.getElementById('end-screen').classList.add('show');
  }

  // Opponent: vitals, face-down hand, board.
  vitals(document.getElementById('enemy-vitals'), game.enemy, 'Rook, the Cinder Warden');
  const eHand = document.getElementById('enemy-hand');
  eHand.innerHTML = '';
  game.enemy.hand.forEach(() => eHand.appendChild(cardBackElement()));
  const eBoard = document.getElementById('enemy-board');
  eBoard.innerHTML = '';
  game.enemy.board.forEach((card) => eBoard.appendChild(cardElement(card)));

  // Player: board, hand, vitals.
  const pBoard = document.getElementById('player-board');
  pBoard.innerHTML = '';
  game.player.board.forEach((card) => pBoard.appendChild(cardElement(card)));
  const pHand = document.getElementById('player-hand');
  pHand.innerHTML = '';
  game.player.hand.forEach((card, i) => {
    const playable = game.phase === 'player' && game.player.energy >= card.cost;
    const node = cardElement(card, { playable, onClick: playable ? hooks.onPlayCard : null });
    node.title = `${card.name} — press ${i + 1} to play`;
    pHand.appendChild(node);
  });
  vitals(document.getElementById('player-vitals'), game.player, 'You, the Pact-Bearer');

  // Turn + log.
  document.getElementById('turn-label').textContent = `Turn ${game.turn}`;
  const log = document.getElementById('log');
  log.innerHTML = '';
  game.log.slice(-6).forEach((line) => log.appendChild(el('div', 'log-line', line)));
  const endBtn = document.getElementById('end-turn');
  endBtn.disabled = game.phase !== 'player';
  endBtn.textContent = game.phase === 'enemy' ? 'Enemy turn…' : 'End Turn (Space)';

  // One-shot feedback from the last event.
  if (game.lastEvent && game.lastEvent !== lastEventSeen) {
    lastEventSeen = game.lastEvent;
    const ev = game.lastEvent;
    if (ev.type === 'hero-hit' && ev.amount > 0) {
      table.classList.remove('shake');
      void table.offsetWidth;
      table.classList.add('shake');
      floatText(table, `-${ev.amount}`, ev.side === 'player' ? 'dmg-you' : 'dmg-foe');
    }
    if (ev.type === 'resonance') {
      const banner = document.getElementById('resonance');
      banner.textContent = `${SUITS[ev.suit].glyph} ${SUITS[ev.suit].name} Resonance!`;
      banner.style.background = SUITS[ev.suit].color;
      banner.classList.remove('show');
      void banner.offsetWidth;
      banner.classList.add('show');
    }
  }
}

export function resetRenderState() {
  seenUids = new Set();
  lastEventSeen = null;
}
