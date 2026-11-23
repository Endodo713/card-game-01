// Ember Pact — sound. Every sound is a generated WebAudio tone: no audio
// files, no network, nothing to download. The context starts on the first
// user gesture, as browsers require.

let ctx = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ensureCtx();
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

export const sfx = {
  click() { tone(660, 0.07, 'triangle', 0.08); },
  play() { tone(392, 0.1, 'triangle', 0.12); tone(523, 0.12, 'triangle', 0.12, 0.07); },
  hit() { tone(180, 0.16, 'sawtooth', 0.1); tone(90, 0.2, 'square', 0.08, 0.02); },
  heal() { tone(523, 0.12, 'sine', 0.09); tone(659, 0.14, 'sine', 0.09, 0.08); },
  resonance() { tone(523, 0.1, 'triangle', 0.1); tone(659, 0.1, 'triangle', 0.1, 0.08); tone(784, 0.16, 'triangle', 0.1, 0.16); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.13)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.26, 'sine', 0.11, i * 0.15)); },
};
