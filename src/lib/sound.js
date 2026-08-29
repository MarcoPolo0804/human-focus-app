let audioCtx = null;

// Must be called from a user gesture (e.g. a click handler) so the browser's
// autoplay policy allows audio to play later, when the timer actually ends.
export function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(ctx, freq, startTime, duration, volume) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

export function playAlarm() {
  const ctx = audioCtx;
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(ctx, 660, now, 0.35, 0.2);
  tone(ctx, 880, now + 0.18, 0.35, 0.2);
  tone(ctx, 1046.5, now + 0.36, 0.5, 0.2);
}
