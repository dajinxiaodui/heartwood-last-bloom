// main.js — entry point. Wires the canvas, input, world and renderer
// together, runs the fixed-step loop, and translates one-shot keys and
// clicks into state changes (start, pause, restart, mute). Also handles
// the ?shot= staged-scene mode used for the hand-in screenshots.

import { VIEW } from './config.js';
import { attachInput, drainPressed, getMouse, moveVector } from './input.js';
import { createWorld, startRun, updateWorld } from './world.js';
import { drawScene } from './render.js';
import { initAudio, toggleMute } from './audio.js';
import { setupShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

attachInput(canvas);

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');

// Small deterministic PRNG so staged scenes and any seeded run reproduce.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seed = Number(params.get('seed') ?? 1);
const state = createWorld(shotName ? mulberry32(seed) : Math.random);

function currentInput() {
  return { move: moveVector(), mouse: getMouse() };
}

function startIfIdle() {
  initAudio();
  if (state.mode === 'title' || state.mode === 'won' || state.mode === 'lost') {
    startRun(state);
  }
}

canvas.addEventListener('pointerdown', startIfIdle);

function handleKeys() {
  for (const code of drainPressed()) {
    if (code === 'Enter' || code === 'Space') startIfIdle();
    else if (code === 'KeyM') toggleMute();
    else if (code === 'KeyP') {
      if (state.mode === 'playing') state.mode = 'paused';
      else if (state.mode === 'paused') state.mode = 'playing';
    } else if (code === 'KeyR') {
      if (state.mode !== 'title') {
        initAudio();
        startRun(state);
      }
    }
  }
}

if (shotName) {
  // Staged scene: settle it with a few neutral steps, draw once, and tell
  // the screenshot harness the frame is ready.
  document.documentElement.classList.add('shot');
  setupShot(state, shotName);
  const neutral = { move: { x: 0, y: 0 }, mouse: { x: state.player.x + 200, y: state.player.y - 60, down: false } };
  state.player.aim = Math.atan2(neutral.mouse.y - state.player.y, neutral.mouse.x - state.player.x);
  // Boss scene settles for fewer steps so its staged bullets stay mid-flight
  // and the Maw is not caught in a white hit-flash on the captured frame.
  const settleSteps = shotName === 'boss' ? 10 : 24;
  for (let i = 0; i < settleSteps; i++) updateWorld(state, 1 / 60, neutral);
  drawScene(ctx, state);
  window.__shotReady = true;
} else {
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 120;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25; // tab-switch hiccup: never teleport the world
    handleKeys();
    if (state.mode !== 'paused') {
      acc += dt;
      while (acc >= STEP) {
        updateWorld(state, STEP, currentInput());
        acc -= STEP;
      }
    }
    drawScene(ctx, state);
  }
  requestAnimationFrame(frame);
}
