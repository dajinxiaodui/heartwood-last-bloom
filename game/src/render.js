// render.js — everything drawn to the canvas, in painter's order:
// ground, tree, pickups, globs, enemies, guardian, bullets, particles,
// floating texts, HUD, banner, and the full-screen state overlays.
// Reads world state; never mutates it.

import { COLORS, ENEMIES, PLAYER, TREE, VIEW, WAVES } from './config.js';
import { isMuted } from './audio.js';

export function drawScene(ctx, state) {
  ctx.save();
  if (state.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawGround(ctx, state);
  drawPickups(ctx, state);
  drawTree(ctx, state);
  drawGlobs(ctx, state);
  drawEnemies(ctx, state);
  drawPlayer(ctx, state);
  drawBullets(ctx, state);
  drawParticles(ctx, state);
  drawTexts(ctx, state);
  ctx.restore();

  drawHud(ctx, state);
  if (state.banner && state.mode === 'playing') drawBanner(ctx, state);
  if (state.mode === 'title') drawTitle(ctx, state);
  if (state.mode === 'paused') drawPaused(ctx, state);
  if (state.mode === 'won') drawEnd(ctx, state, true);
  if (state.mode === 'lost') drawEnd(ctx, state, false);
}

function drawGround(ctx, state) {
  const g = ctx.createRadialGradient(TREE.x, TREE.y, 60, TREE.x, TREE.y, 620);
  g.addColorStop(0, COLORS.bgGlow);
  g.addColorStop(0.55, '#0a2030');
  g.addColorStop(1, COLORS.bgDeep);
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, VIEW.width + 40, VIEW.height + 40);

  // Concentric clearing rings, like ripples in the grove floor.
  ctx.strokeStyle = COLORS.groundRing;
  ctx.lineWidth = 2;
  for (const r of [120, 210, 300, 390]) {
    ctx.beginPath();
    ctx.arc(TREE.x, TREE.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Scattered grass flecks, fixed positions so the ground does not swim.
  ctx.fillStyle = 'rgba(126, 231, 135, 0.13)';
  for (let i = 0; i < 70; i++) {
    const x = ((i * 197) % VIEW.width);
    const y = ((i * 311) % VIEW.height);
    ctx.fillRect(x, y, 3, 6 + (i % 3) * 3);
  }
  // The dark the enemies come from: heavy vignette at the edges.
  const v = ctx.createRadialGradient(TREE.x, TREE.y, 320, TREE.x, TREE.y, 760);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(-20, -20, VIEW.width + 40, VIEW.height + 40);
  void state;
}

function drawTree(ctx, state) {
  const { hp, hurtT } = state.tree;
  const sway = Math.sin(state.time * 0.9) * 3;
  const health = hp / 100;

  // Roots.
  ctx.strokeStyle = COLORS.treeTrunk;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  for (const a of [0.5, 1.2, 2.2, 3.4, 4.4, 5.5]) {
    ctx.beginPath();
    ctx.moveTo(TREE.x, TREE.y + 16);
    ctx.quadraticCurveTo(
      TREE.x + Math.cos(a) * 26, TREE.y + 22,
      TREE.x + Math.cos(a) * 46, TREE.y + 30 + Math.sin(a) * 8,
    );
    ctx.stroke();
  }
  // Trunk.
  const trunk = ctx.createLinearGradient(TREE.x - 20, 0, TREE.x + 20, 0);
  trunk.addColorStop(0, '#6e4525');
  trunk.addColorStop(0.5, COLORS.treeTrunk);
  trunk.addColorStop(1, '#5d3a1f');
  ctx.fillStyle = trunk;
  ctx.beginPath();
  ctx.moveTo(TREE.x - 17, TREE.y + 26);
  ctx.quadraticCurveTo(TREE.x - 10, TREE.y - 20, TREE.x - 4 + sway * 0.3, TREE.y - 52);
  ctx.lineTo(TREE.x + 4 + sway * 0.3, TREE.y - 52);
  ctx.quadraticCurveTo(TREE.x + 10, TREE.y - 20, TREE.x + 17, TREE.y + 26);
  ctx.closePath();
  ctx.fill();
  // Branches.
  ctx.strokeStyle = COLORS.treeTrunk;
  ctx.lineWidth = 6;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(TREE.x + sway * 0.3, TREE.y - 44);
    ctx.quadraticCurveTo(TREE.x + s * 30, TREE.y - 66, TREE.x + s * 52 + sway, TREE.y - 74);
    ctx.stroke();
  }
  // Canopy: layered leaf blobs that thin and grey as the tree takes damage.
  const blobs = [
    [0, -96, 46], [-44, -78, 36], [44, -78, 36], [-24, -112, 34], [26, -114, 34], [0, -72, 38],
  ];
  for (const [bx, by, br] of blobs) {
    const leaf = ctx.createRadialGradient(TREE.x + bx + sway - 8, TREE.y + by - 8, 4, TREE.x + bx + sway, TREE.y + by, br);
    const alive = health > 0.25 ? COLORS.treeCanopyLight : '#9db8a6';
    leaf.addColorStop(0, alive);
    leaf.addColorStop(1, COLORS.treeCanopy);
    ctx.globalAlpha = 0.35 + health * 0.6;
    ctx.fillStyle = leaf;
    ctx.beginPath();
    ctx.arc(TREE.x + bx + sway, TREE.y + by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The heart fruit: a pulsing golden core in the crown.
  const pulse = 1 + Math.sin(state.time * 2.4) * 0.12;
  const heart = ctx.createRadialGradient(TREE.x + sway, TREE.y - 88, 2, TREE.x + sway, TREE.y - 88, 20 * pulse);
  heart.addColorStop(0, '#fff3c4');
  heart.addColorStop(0.4, COLORS.treeHeart);
  heart.addColorStop(1, 'rgba(255, 215, 106, 0)');
  ctx.fillStyle = heart;
  ctx.beginPath();
  ctx.arc(TREE.x + sway, TREE.y - 88, 20 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // Hurt flash.
  if (hurtT > 0) {
    ctx.globalAlpha = Math.min(0.5, hurtT * 4);
    ctx.fillStyle = COLORS.danger;
    ctx.beginPath();
    ctx.arc(TREE.x, TREE.y - 40, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    const grow = 1 - (e.spawnT / 0.45) * 0.55;
    const r = e.radius * grow;
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.flashT > 0) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 18;
    } else {
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = e.flashT > 0 ? '#ffffff' : e.color;
    if (e.type === 'dart') {
      const a = Math.atan2(TREE.y - e.y, TREE.x - e.x);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(r * 1.3, 0);
      ctx.lineTo(-r, r * 0.85);
      ctx.lineTo(-r * 0.4, 0);
      ctx.lineTo(-r, -r * 0.85);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'splitter') {
      for (const s of [-0.45, 0.45]) {
        ctx.beginPath();
        ctx.arc(r * s, 0, r * 0.72, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'brute') {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + state.time * 0.4;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'maw') {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // A mouth that opens as it nears the tree.
      const open = 0.35 + Math.sin(state.time * 3) * 0.1;
      ctx.fillStyle = '#2b0a14';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.25, r * 0.5, r * open, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9ec';
      for (const ex of [-0.38, 0.38]) {
        ctx.beginPath();
        ctx.arc(r * ex, -r * 0.3, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // crawler & mite: a spiky grub.
      ctx.beginPath();
      const spikes = 8;
      for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2 + state.time * 1.5;
        const rr = i % 2 === 0 ? r : r * 0.72;
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // HP ticks for the tough enemies.
    if ((e.type === 'brute' || e.type === 'splitter') && e.hp < e.maxHp) {
      bar(ctx, e.x - e.radius, e.y - e.radius - 12, e.radius * 2, 5, e.hp / e.maxHp, e.color);
    }
  }
}

function drawPlayer(ctx, state) {
  if (state.mode === 'title') return;
  const p = state.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invulnT > 0 && Math.floor(state.time * 14) % 2 === 0) ctx.globalAlpha = 0.35;
  // Aim wand.
  ctx.rotate(p.aim);
  ctx.fillStyle = '#c98d54';
  ctx.fillRect(8, -2.5, 16, 5);
  ctx.fillStyle = COLORS.bullet;
  ctx.beginPath();
  ctx.arc(25, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(-p.aim);
  // Body: a glowing guardian orb with a bright core.
  const body = ctx.createRadialGradient(-4, -5, 2, 0, 0, PLAYER.radius + 4);
  body.addColorStop(0, COLORS.playerCore);
  body.addColorStop(0.55, COLORS.player);
  body.addColorStop(1, 'rgba(106, 227, 255, 0.15)');
  ctx.shadowColor = COLORS.player;
  ctx.shadowBlur = 16;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Overcharge aura.
  if (p.chargeT > 0) {
    ctx.strokeStyle = COLORS.sparkCharge;
    ctx.globalAlpha *= 0.7 + Math.sin(state.time * 10) * 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // Shield bubble.
  if (p.shieldT > 0) {
    ctx.save();
    ctx.strokeStyle = COLORS.sparkShield;
    ctx.globalAlpha = 0.55 + Math.sin(state.time * 5) * 0.2;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBullets(ctx, state) {
  for (const b of state.bullets) {
    ctx.save();
    ctx.shadowColor = COLORS.bullet;
    ctx.shadowBlur = 10;
    ctx.fillStyle = b.charged ? '#fff3c4' : COLORS.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawGlobs(ctx, state) {
  for (const g of state.globs) {
    ctx.save();
    ctx.shadowColor = ENEMIES.maw.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = ENEMIES.maw.color;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPickups(ctx, state) {
  const styles = {
    heal: { color: COLORS.sparkHeal, label: '+' },
    shield: { color: COLORS.sparkShield, label: '◯' },
    charge: { color: COLORS.sparkCharge, label: '✦' },
  };
  for (const pk of state.pickups) {
    const s = styles[pk.pickupKind];
    const bob = Math.sin(pk.t * 3.2) * 3;
    const blink = pk.life < 2 ? (Math.floor(pk.t * 8) % 2 === 0 ? 0.35 : 1) : 1;
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    ctx.globalAlpha = blink;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(0, 0, pk.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#07131f';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.label, 0, 1);
    ctx.restore();
  }
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const lifeLeft = 1 - p.t / p.life;
    ctx.globalAlpha = Math.max(0, lifeLeft);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * lifeLeft + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx, state) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of state.texts) {
    ctx.globalAlpha = Math.max(0, 1 - t.t / t.life);
    ctx.font = `bold ${t.size}px system-ui, sans-serif`;
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

function drawHud(ctx, state) {
  if (state.mode === 'title') return;
  ctx.textBaseline = 'alphabetic';
  // Score and wave, top-left.
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.textMain;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(String(state.score).padStart(6, '0'), 22, 40);
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`WAVE ${Math.min(state.waveIndex + 1, WAVES.length)} / ${WAVES.length}`, 22, 62);
  const remaining = state.spawnQueue.length + state.enemies.length;
  ctx.fillText(state.mode === 'playing' ? `${remaining} blight remain` : '', 22, 82);

  // Tree health, top-centre — the number that matters most.
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('HEARTWOOD', TREE.x, 26);
  const treeColor = state.tree.hp > 50 ? COLORS.treeCanopyLight : state.tree.hp > 25 ? COLORS.treeHeart : COLORS.danger;
  bar(ctx, TREE.x - 150, 32, 300, 12, state.tree.hp / 100, treeColor);

  // Guardian health, bottom-left; effect timers beside it.
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('GUARDIAN', 22, VIEW.height - 40);
  bar(ctx, 22, VIEW.height - 34, 190, 10, state.player.hp / PLAYER.maxHp, COLORS.player);
  let tx = 224;
  if (state.player.shieldT > 0) {
    ctx.fillStyle = COLORS.sparkShield;
    ctx.fillText(`AEGIS ${state.player.shieldT.toFixed(0)}s`, tx, VIEW.height - 24);
    tx += 86;
  }
  if (state.player.chargeT > 0) {
    ctx.fillStyle = COLORS.sparkCharge;
    ctx.fillText(`OVERBLOOM ${state.player.chargeT.toFixed(0)}s`, tx, VIEW.height - 24);
  }

  // Boss health, bottom-centre.
  const maw = state.enemies.find((e) => e.type === 'maw');
  if (maw) {
    ctx.textAlign = 'center';
    ctx.fillStyle = ENEMIES.maw.color;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('THE BLIGHT MAW', TREE.x, VIEW.height - 40);
    bar(ctx, TREE.x - 170, VIEW.height - 34, 340, 10, maw.hp / maw.maxHp, ENEMIES.maw.color);
  }

  // Sound state, top-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(isMuted() ? 'SOUND OFF (M)' : 'SOUND ON (M)', VIEW.width - 22, 30);
}

function drawBanner(ctx, state) {
  const b = state.banner;
  const fadeIn = Math.min(1, b.t / 0.25);
  const fadeOut = Math.min(1, (b.life - b.t) / 0.5);
  ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut));
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.textMain;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(b.title, TREE.x, 120);
  if (b.sub) {
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(b.sub, TREE.x, 152);
  }
  ctx.globalAlpha = 1;
}

function veil(ctx, alpha) {
  ctx.fillStyle = `rgba(3, 8, 14, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawTitle(ctx, state) {
  veil(ctx, 0.45);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.treeHeart;
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText('✦  H E A R T W O O D  ✦', TREE.x, 168);
  ctx.fillStyle = COLORS.textMain;
  ctx.font = 'bold 74px Georgia, serif';
  ctx.fillText('LAST BLOOM', TREE.x, 240);
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMain;
  ctx.fillText('The blight comes for the Heart Tree in eight waves.', TREE.x, 300);
  ctx.fillText('You are the Grove Guardian. It does not get past you.', TREE.x, 328);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('WASD / arrows — move        Mouse — aim        Hold click — fire seeds of light', TREE.x, 560);
  ctx.fillText('Catch fallen sparks:  + heals the tree   ◯ raises Aegis   ✦ triggers Overbloom', TREE.x, 588);
  ctx.fillText('P — pause        M — mute        R — restart', TREE.x, 616);
  const pulse = 0.65 + Math.sin(state.time * 3) * 0.35;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = COLORS.treeHeart;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', TREE.x, 668);
  ctx.globalAlpha = 1;
}

function drawPaused(ctx, state) {
  veil(ctx, 0.55);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.textMain;
  ctx.font = 'bold 48px Georgia, serif';
  ctx.fillText('PAUSED', TREE.x, VIEW.height / 2);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('Press P to return to the grove', TREE.x, VIEW.height / 2 + 38);
  void state;
}

function drawEnd(ctx, state, won) {
  veil(ctx, won ? 0.5 : 0.66);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? COLORS.treeHeart : COLORS.danger;
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText(won ? 'THE GROVE BLOOMS AGAIN' : 'THE LAST BLOOM FALLS', TREE.x, 218);
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMain;
  ctx.fillText(
    won ? 'The Maw is unmade and the canopy drinks the dawn.' : `The blight took the grove on wave ${state.waveIndex + 1}.`,
    TREE.x, 262,
  );
  const accuracy = state.shotsFired ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
  const rows = [
    ['FINAL SCORE', state.score],
    ['BLIGHT FELLED', state.kills],
    ['ACCURACY', `${accuracy}%`],
    ['HEARTWOOD LEFT', `${Math.ceil(state.tree.hp)} / 100`],
  ];
  ctx.font = '600 18px system-ui, sans-serif';
  rows.forEach(([label, value], i) => {
    const y = 330 + i * 34;
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(label, TREE.x - 16, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textMain;
    ctx.fillText(String(value), TREE.x + 16, y);
  });
  ctx.textAlign = 'center';
  const pulse = 0.65 + Math.sin(state.time * 3) * 0.35;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = COLORS.treeHeart;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('PRESS R TO PLAY AGAIN', TREE.x, 520);
  ctx.globalAlpha = 1;
}
