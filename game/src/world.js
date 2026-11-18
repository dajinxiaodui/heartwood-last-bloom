// world.js — the game rules. Owns the state object and advances it one
// fixed step at a time: wave flow, spawning, movement, combat, pickups,
// scoring and win/lose. Rendering (render.js) only reads this state.

import { COLORS, ENEMIES, PICKUP, PLAYER, SCORE, TREE, VIEW, WAVES } from './config.js';
import { burst, makeBullet, makeEnemy, makeGlob, makePickup, makeText, mote, stepParticles, stepTexts } from './entities.js';
import { sfx } from './audio.js';

export function createWorld(rng = Math.random) {
  return {
    rng,
    mode: 'title',           // title | playing | paused | won | lost
    time: 0,
    player: {
      x: TREE.x, y: TREE.y + 150,
      hp: PLAYER.maxHp,
      fireCd: 0, invulnT: 0, shieldT: 0, chargeT: 0,
      aim: -Math.PI / 2, moving: false,
    },
    tree: { hp: TREE.maxHp, hurtT: 0, chewSfxT: 0 },
    waveIndex: 0,
    wavePhase: 'announce',   // announce | active | cleared
    phaseT: 0,
    spawnQueue: [],          // [{ type, at }] seconds into the active phase
    waveClock: 0,
    enemies: [],
    bullets: [],
    globs: [],
    pickups: [],
    particles: [],
    texts: [],
    score: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    shake: 0,
    banner: null,            // { title, sub, t, life }
    bossActive: false,
    moteT: 0,
  };
}

export function startRun(state) {
  const fresh = createWorld(state.rng);
  fresh.mode = 'playing';
  Object.assign(state, fresh);
  beginWave(state, 0);
}

function beginWave(state, index) {
  state.waveIndex = index;
  state.wavePhase = 'announce';
  state.phaseT = 0;
  state.waveClock = 0;
  state.spawnQueue = [];
  let cursor = 0.5;
  for (const group of WAVES[index].groups) {
    for (let i = 0; i < group.count; i++) {
      state.spawnQueue.push({ type: group.type, at: cursor });
      cursor += group.interval;
    }
    cursor += 1.2; // a breath between groups
  }
  const isBoss = index === WAVES.length - 1;
  state.banner = {
    title: isBoss ? 'THE BLIGHT MAW STIRS' : `WAVE ${index + 1}`,
    sub: isBoss ? 'Bring it down — the grove blooms or dies tonight' : waveHint(index),
    t: 0, life: 2.4,
  };
  if (isBoss) sfx.bossWarn(); else sfx.waveStart();
}

function waveHint(index) {
  return [
    'Crawlers creep from the dark',
    'Something quicker joins the hunt',
    'Splitters — they multiply when cut',
    'A brute lumbers in',
    'The grove strains; hold the centre',
    'Brutes in pairs. Spend your sparks well',
    'Everything, all at once',
    '',
  ][index] ?? '';
}

function spawnPoint(state) {
  // Enemies arrive from just outside a random edge, never on top of corners.
  const side = Math.floor(state.rng() * 4);
  const m = 30;
  if (side === 0) return { x: m + state.rng() * (VIEW.width - 2 * m), y: -24 };
  if (side === 1) return { x: m + state.rng() * (VIEW.width - 2 * m), y: VIEW.height + 24 };
  if (side === 2) return { x: -24, y: m + state.rng() * (VIEW.height - 2 * m) };
  return { x: VIEW.width + 24, y: m + state.rng() * (VIEW.height - 2 * m) };
}

function addShake(state, amount) {
  state.shake = Math.min(14, state.shake + amount);
}

export function updateWorld(state, dt, input) {
  state.time += dt;
  if (state.banner) {
    state.banner.t += dt;
    if (state.banner.t >= state.banner.life) state.banner = null;
  }
  state.shake = Math.max(0, state.shake - 30 * dt);
  stepParticles(state.particles, dt);
  stepTexts(state.texts, dt);

  // Ambient fireflies keep every screen — title included — alive.
  state.moteT -= dt;
  if (state.moteT <= 0) {
    state.moteT = 0.22;
    mote(state.particles, state.rng() * VIEW.width, VIEW.height * (0.3 + state.rng() * 0.7), '#ffe9a3');
  }

  if (state.mode !== 'playing') return;

  updateWaveFlow(state, dt);
  updatePlayer(state, dt, input);
  updateBullets(state, dt);
  updateEnemies(state, dt);
  updateGlobs(state, dt);
  updatePickups(state, dt);
  resolveCombat(state);

  if (state.tree.hp <= 0 || state.player.hp <= 0) {
    state.mode = 'lost';
    state.tree.hp = Math.max(0, state.tree.hp);
    state.player.hp = Math.max(0, state.player.hp);
    addShake(state, 12);
    burst(state.particles, TREE.x, TREE.y, COLORS.danger, 46, 260, 4);
    sfx.lose();
  }
}

function updateWaveFlow(state, dt) {
  state.phaseT += dt;
  if (state.wavePhase === 'announce') {
    if (state.phaseT >= 1.6) {
      state.wavePhase = 'active';
      state.phaseT = 0;
      state.waveClock = 0;
    }
    return;
  }
  if (state.wavePhase === 'active') {
    state.waveClock += dt;
    while (state.spawnQueue.length && state.spawnQueue[0].at <= state.waveClock) {
      const { type } = state.spawnQueue.shift();
      const p = spawnPoint(state);
      state.enemies.push(makeEnemy(type, p.x, p.y, state.rng));
      if (type === 'maw') state.bossActive = true;
    }
    if (!state.spawnQueue.length && state.enemies.length === 0) {
      const bonus = SCORE.waveClearBonus * (state.waveIndex + 1);
      state.score += bonus;
      makeText(state.texts, TREE.x, TREE.y - 130, `WAVE CLEAR  +${bonus}`, COLORS.treeCanopyLight, 20);
      if (state.waveIndex === WAVES.length - 1) {
        state.mode = 'won';
        state.score += Math.round(state.tree.hp) * SCORE.winTreeBonusPerHp;
        burst(state.particles, TREE.x, TREE.y - 40, COLORS.treeHeart, 60, 240, 4);
        sfx.win();
      } else {
        state.wavePhase = 'cleared';
        state.phaseT = 0;
        sfx.waveClear();
      }
    }
    return;
  }
  // cleared: a short breather, then the next wave announces itself
  if (state.phaseT >= 2.2) beginWave(state, state.waveIndex + 1);
}

function updatePlayer(state, dt, input) {
  const p = state.player;
  const mv = input.move;
  p.moving = mv.x !== 0 || mv.y !== 0;
  p.x += mv.x * PLAYER.speed * dt;
  p.y += mv.y * PLAYER.speed * dt;

  // The trunk is solid: slide around it instead of walking through.
  const dx = p.x - TREE.x;
  const dy = p.y - TREE.y;
  const dist = Math.hypot(dx, dy);
  const minDist = TREE.radius + PLAYER.radius - 2;
  if (dist < minDist && dist > 0.01) {
    p.x = TREE.x + (dx / dist) * minDist;
    p.y = TREE.y + (dy / dist) * minDist;
  }
  p.x = Math.max(PLAYER.radius, Math.min(VIEW.width - PLAYER.radius, p.x));
  p.y = Math.max(PLAYER.radius, Math.min(VIEW.height - PLAYER.radius, p.y));

  p.aim = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);
  p.fireCd -= dt;
  p.invulnT = Math.max(0, p.invulnT - dt);
  p.shieldT = Math.max(0, p.shieldT - dt);
  p.chargeT = Math.max(0, p.chargeT - dt);

  if (input.mouse.down && p.fireCd <= 0) {
    const charged = p.chargeT > 0;
    p.fireCd = charged ? PLAYER.fireInterval * 0.5 : PLAYER.fireInterval;
    const bx = p.x + Math.cos(p.aim) * (PLAYER.radius + 6);
    const by = p.y + Math.sin(p.aim) * (PLAYER.radius + 6);
    state.bullets.push(makeBullet(bx, by, p.aim, charged));
    state.shotsFired++;
    burst(state.particles, bx, by, COLORS.bullet, 2, 60, 2);
    sfx.shoot();
  }
}

function updateBullets(state, dt) {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > VIEW.width + 20 || b.y < -20 || b.y > VIEW.height + 20) {
      state.bullets.splice(i, 1);
    }
  }
}

function updateEnemies(state, dt) {
  const tree = state.tree;
  tree.hurtT = Math.max(0, tree.hurtT - dt);
  tree.chewSfxT -= dt;
  for (const e of state.enemies) {
    e.flashT = Math.max(0, e.flashT - dt);
    e.spawnT = Math.max(0, e.spawnT - dt);
    const dx = TREE.x - e.x;
    const dy = TREE.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const chewRange = TREE.radius + e.radius * 0.7;
    if (dist > chewRange) {
      const wobble = Math.sin(state.time * 2.2 + e.wobbleSeed) * 14;
      const nx = dx / dist;
      const ny = dy / dist;
      e.x += (nx * e.speed + -ny * wobble) * dt;
      e.y += (ny * e.speed + nx * wobble) * dt;
    } else {
      // Chewing the tree: damage over time, a shake, drifting splinters.
      tree.hp -= e.treeDps * dt;
      tree.hurtT = 0.12;
      e.chewT += dt;
      if (tree.chewSfxT <= 0) {
        tree.chewSfxT = 0.45;
        addShake(state, 2.5);
        sfx.treeHurt();
        burst(state.particles, TREE.x + (e.x - TREE.x) * 0.4, TREE.y + (e.y - TREE.y) * 0.4, '#c98d54', 3, 70, 2.5);
      }
    }
    if (e.type === 'maw') updateMaw(state, e, dt);
  }
}

function updateMaw(state, e, dt) {
  e.spitT -= dt;
  if (e.spitT <= 0) {
    e.spitT = 2.8;
    const p = state.player;
    state.globs.push(makeGlob(e.x, e.y, Math.atan2(p.y - e.y, p.x - e.x)));
  }
  e.broodT -= dt;
  if (e.broodT <= 0) {
    e.broodT = 6;
    for (let i = 0; i < 2; i++) {
      const a = state.rng() * Math.PI * 2;
      state.enemies.push(makeEnemy('crawler', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, state.rng));
    }
    burst(state.particles, e.x, e.y, ENEMIES.crawler.color, 10, 120, 3);
  }
}

function updateGlobs(state, dt) {
  const p = state.player;
  for (let i = state.globs.length - 1; i >= 0; i--) {
    const g = state.globs[i];
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.life -= dt;
    let dead = g.life <= 0;
    if (!dead && Math.hypot(g.x - p.x, g.y - p.y) < g.radius + PLAYER.radius) {
      dead = true;
      hurtPlayer(state, g.damage);
      burst(state.particles, g.x, g.y, ENEMIES.maw.color, 8, 120, 3);
    }
    if (dead) state.globs.splice(i, 1);
  }
}

function hurtPlayer(state, amount) {
  const p = state.player;
  if (p.invulnT > 0) return;
  if (p.shieldT > 0) {
    burst(state.particles, p.x, p.y, COLORS.sparkShield, 8, 130, 2.5);
    return;
  }
  p.hp -= amount;
  p.invulnT = PLAYER.contactInvuln;
  addShake(state, 5);
  sfx.playerHurt();
  burst(state.particles, p.x, p.y, COLORS.danger, 10, 150, 3);
}

function updatePickups(state, dt) {
  const p = state.player;
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pk = state.pickups[i];
    pk.t += dt;
    pk.life -= dt;
    const d = Math.hypot(p.x - pk.x, p.y - pk.y);
    if (d < 110) { // sparks drift toward the guardian
      pk.x += ((p.x - pk.x) / (d || 1)) * 130 * dt;
      pk.y += ((p.y - pk.y) / (d || 1)) * 130 * dt;
    }
    if (d < PLAYER.radius + pk.radius + 4) {
      applyPickup(state, pk);
      state.pickups.splice(i, 1);
    } else if (pk.life <= 0) {
      state.pickups.splice(i, 1);
    }
  }
}

function applyPickup(state, pk) {
  const p = state.player;
  sfx.pickup();
  if (pk.pickupKind === 'heal') {
    state.tree.hp = Math.min(TREE.maxHp, state.tree.hp + PICKUP.healTreeAmount);
    makeText(state.texts, TREE.x, TREE.y - 110, `+${PICKUP.healTreeAmount} HEARTWOOD`, COLORS.sparkHeal, 17);
    burst(state.particles, TREE.x, TREE.y - 30, COLORS.sparkHeal, 16, 130, 3);
  } else if (pk.pickupKind === 'shield') {
    p.shieldT = PICKUP.shieldSeconds;
    makeText(state.texts, p.x, p.y - 28, 'AEGIS BLOOM', COLORS.sparkShield, 16);
    burst(state.particles, p.x, p.y, COLORS.sparkShield, 14, 120, 3);
  } else {
    p.chargeT = PICKUP.overchargeSeconds;
    makeText(state.texts, p.x, p.y - 28, 'OVERBLOOM', COLORS.sparkCharge, 16);
    burst(state.particles, p.x, p.y, COLORS.sparkCharge, 14, 120, 3);
  }
}

function resolveCombat(state) {
  const p = state.player;
  // Bullets vs enemies.
  for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const b = state.bullets[bi];
    let consumed = false;
    for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
      const e = state.enemies[ei];
      if (e.spawnT > 0.25) continue;
      if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
        consumed = true;
        state.shotsHit++;
        e.hp -= b.damage;
        e.flashT = 0.09;
        // Knockback along the bullet's path keeps crowds manageable.
        const kb = e.type === 'brute' || e.type === 'maw' ? 2 : 7;
        e.x += (b.vx / 640) * kb;
        e.y += (b.vy / 640) * kb;
        burst(state.particles, b.x, b.y, e.color, 3, 110, 2.5);
        if (e.hp <= 0) killEnemy(state, ei);
        else sfx.hit();
        break;
      }
    }
    if (consumed) state.bullets.splice(bi, 1);
  }
  // Enemies touching the guardian.
  for (const e of state.enemies) {
    if (e.spawnT > 0.25) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + PLAYER.radius) {
      if (p.shieldT > 0) {
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        e.x += (dx / d) * 26;
        e.y += (dy / d) * 26;
      } else {
        hurtPlayer(state, e.touch);
      }
    }
  }
}

function killEnemy(state, index) {
  const [e] = state.enemies.splice(index, 1);
  state.kills++;
  state.score += e.score;
  makeText(state.texts, e.x, e.y - e.radius, `+${e.score}`, '#ffffff', 13);
  burst(state.particles, e.x, e.y, e.color, e.type === 'maw' ? 70 : 14, e.type === 'maw' ? 300 : 170, 3.5);
  if (e.type === 'brute' || e.type === 'maw') {
    addShake(state, e.type === 'maw' ? 12 : 6);
    sfx.bruteKill();
  } else {
    sfx.kill();
  }
  if (e.type === 'splitter') {
    for (let i = 0; i < 2; i++) {
      const a = state.rng() * Math.PI * 2;
      const mite = makeEnemy('mite', e.x + Math.cos(a) * 14, e.y + Math.sin(a) * 14, state.rng);
      mite.spawnT = 0.15;
      state.enemies.push(mite);
    }
  }
  if (e.type === 'maw') state.bossActive = false;
  if (state.rng() < PICKUP.dropChance && state.pickups.length < 3) {
    state.pickups.push(makePickup(e.x, e.y, state.rng));
  }
}
