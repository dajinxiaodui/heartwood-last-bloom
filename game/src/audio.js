// audio.js — all sound is synthesised with WebAudio; there are no audio
// files. A tiny helper builds oscillators with envelopes, and each game
// event gets a named function here so world.js never touches the API.
//
// The context is created lazily on the first user gesture (startGame),
// which is what browsers require. M toggles `muted`.

let ctx = null;
let master = null;
let musicTimer = null;
let muted = false;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  startMusic();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

export function isMuted() {
  return muted;
}

// One enveloped tone. `slideTo` bends the pitch over the note's life,
// which is what makes the blips feel alive instead of beepy.
function tone(freq, { type = 'sine', dur = 0.12, vol = 0.2, slideTo = null, delay = 0 } = {}) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst({ dur = 0.18, vol = 0.25, delay = 0 } = {}) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
}

export const sfx = {
  shoot()      { tone(720 + Math.random() * 120, { type: 'triangle', dur: 0.07, vol: 0.07, slideTo: 320 }); },
  hit()        { tone(220, { type: 'square', dur: 0.05, vol: 0.05, slideTo: 140 }); },
  kill()       { noiseBurst({ dur: 0.16, vol: 0.16 }); tone(180, { type: 'sawtooth', dur: 0.16, vol: 0.08, slideTo: 60 }); },
  bruteKill()  { noiseBurst({ dur: 0.3, vol: 0.28 }); tone(120, { type: 'sawtooth', dur: 0.3, vol: 0.14, slideTo: 40 }); },
  playerHurt() { tone(300, { type: 'sawtooth', dur: 0.18, vol: 0.16, slideTo: 90 }); },
  treeHurt()   { tone(90, { type: 'sine', dur: 0.22, vol: 0.3, slideTo: 55 }); },
  pickup()     { tone(660, { type: 'sine', dur: 0.09, vol: 0.14 }); tone(990, { type: 'sine', dur: 0.14, vol: 0.14, delay: 0.07 }); },
  waveStart()  { tone(392, { type: 'triangle', dur: 0.16, vol: 0.16 }); tone(523, { type: 'triangle', dur: 0.22, vol: 0.16, delay: 0.12 }); },
  waveClear()  { tone(523, { type: 'triangle', dur: 0.12, vol: 0.14 }); tone(659, { type: 'triangle', dur: 0.12, vol: 0.14, delay: 0.1 }); tone(784, { type: 'triangle', dur: 0.2, vol: 0.14, delay: 0.2 }); },
  bossWarn()   { tone(98, { type: 'sawtooth', dur: 0.5, vol: 0.22, slideTo: 65 }); tone(98, { type: 'sawtooth', dur: 0.5, vol: 0.22, delay: 0.55, slideTo: 65 }); },
  win()        { [523, 659, 784, 1046].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.3, vol: 0.16, delay: i * 0.14 })); },
  lose()       { [392, 330, 262, 196].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.34, vol: 0.16, delay: i * 0.16 })); },
};

// A slow pentatonic arpeggio over a soft pad — the grove at night.
// Scheduled with lookahead-free simplicity: one step every 240 ms.
const ARP = [262, 330, 392, 494, 392, 330, 294, 330];
let arpStep = 0;
function startMusic() {
  if (musicTimer) return;
  musicTimer = setInterval(() => {
    if (!ctx || muted || ctx.state !== 'running') return;
    const f = ARP[arpStep % ARP.length];
    tone(f, { type: 'sine', dur: 0.5, vol: 0.045 });
    if (arpStep % 8 === 0) tone(131, { type: 'sine', dur: 1.8, vol: 0.05 });
    arpStep++;
  }, 240);
}
