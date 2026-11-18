// shots.js — deterministic staged scenes for screenshots.
// Loading index.html with ?shot=play&seed=1 (see shots.json) arranges a
// fixed, representative moment instead of a live game, so the hand-in
// screenshots always show the real HUD, enemies and effects. Nothing here
// runs in normal play.

import { TREE } from './config.js';
import { burst, makeEnemy, makeBullet, makeGlob, makePickup } from './entities.js';

function place(state, type, x, y, hp) {
  const e = makeEnemy(type, x, y, state.rng);
  e.spawnT = 0;
  if (hp !== undefined) e.hp = hp;
  state.enemies.push(e);
  return e;
}

export function setupShot(state, name) {
  if (name === 'title') {
    state.mode = 'title';
    return;
  }
  if (name === 'play') {
    state.mode = 'playing';
    state.waveIndex = 2;
    state.wavePhase = 'active';
    state.score = 1450;
    state.kills = 23;
    state.tree.hp = 76;
    state.player.hp = 82;
    state.player.x = TREE.x - 170;
    state.player.y = TREE.y + 60;
    state.player.shieldT = 6;
    place(state, 'crawler', 880, 210);
    place(state, 'crawler', 940, 300);
    place(state, 'dart', 300, 180);
    place(state, 'splitter', 1010, 470, 2);
    place(state, 'crawler', 240, 520);
    place(state, 'brute', 1050, 140, 9);
    place(state, 'dart', 760, 560);
    state.spawnQueue = [{ type: 'crawler', at: 30 }, { type: 'dart', at: 33 }];
    const aim = Math.atan2(210 - state.player.y, 880 - state.player.x);
    for (let i = 0; i < 3; i++) {
      state.bullets.push(makeBullet(state.player.x + Math.cos(aim) * (50 + i * 60), state.player.y + Math.sin(aim) * (50 + i * 60), aim, false));
    }
    const pk = makePickup(520, 470, () => 0.5); // shield spark
    pk.pickupKind = 'shield';
    state.pickups.push(pk);
    burst(state.particles, 940, 300, '#b388ff', 8, 130, 3);
    return;
  }
  if (name === 'boss') {
    state.mode = 'playing';
    state.waveIndex = 7;
    state.wavePhase = 'active';
    state.score = 8640;
    state.kills = 96;
    state.tree.hp = 54;
    state.player.hp = 63;
    state.player.x = TREE.x - 60;
    state.player.y = TREE.y + 190;
    state.player.chargeT = 5;
    state.bossActive = true;
    place(state, 'maw', 930, 300, 96);
    place(state, 'crawler', 830, 470);
    place(state, 'crawler', 1010, 180);
    place(state, 'dart', 350, 240);
    state.spawnQueue = [{ type: 'crawler', at: 30 }];
    state.globs.push(makeGlob(700, 330, Math.PI));
    const aim = Math.atan2(300 - state.player.y, 930 - state.player.x);
    for (let i = 0; i < 3; i++) {
      state.bullets.push(makeBullet(state.player.x + Math.cos(aim) * (50 + i * 60), state.player.y + Math.sin(aim) * (50 + i * 60), aim, true));
    }
    burst(state.particles, 900, 330, '#ff5577', 12, 170, 3.5);
    return;
  }
  if (name === 'end') {
    state.mode = 'won';
    state.waveIndex = 7;
    state.score = 12480;
    state.kills = 121;
    state.shotsFired = 640;
    state.shotsHit = 402;
    state.tree.hp = 37;
    state.player.hp = 58;
    state.player.x = TREE.x - 300;
    state.player.y = TREE.y + 190;
    burst(state.particles, TREE.x, TREE.y - 60, '#ffd76a', 40, 220, 4);
    return;
  }
  state.mode = 'title';
}
