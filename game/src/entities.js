// entities.js — plain-object factories for everything that moves:
// enemies, bullets, enemy globs, pickups, particles and floating texts.
// No behaviour lives here beyond construction and particle integration;
// world.js owns the rules, render.js owns the drawing.

import { ENEMIES, PICKUP } from './config.js';

export function makeEnemy(type, x, y, rng) {
  const base = ENEMIES[type];
  return {
    kind: 'enemy',
    type,
    x, y,
    hp: base.hp,
    maxHp: base.hp,
    radius: base.radius,
    speed: base.speed * (0.9 + rng() * 0.2),
    score: base.score,
    treeDps: base.treeDps,
    touch: base.touch,
    color: base.color,
    flashT: 0,        // white hit-flash timer
    spawnT: 0.45,     // grows in over this many seconds
    chewT: rng() * 0.5,
    wobbleSeed: rng() * Math.PI * 2,
    spitT: 2 + rng() * 1.5,   // maw only: seconds until the next glob
    broodT: 5,                // maw only: seconds until the next brood spawn
  };
}

export function makeBullet(x, y, angle, charged) {
  return {
    kind: 'bullet',
    x, y,
    vx: Math.cos(angle) * 640,
    vy: Math.sin(angle) * 640,
    radius: charged ? 7 : 5,
    damage: charged ? 2 : 1,
    charged,
    life: 1.4,
  };
}

export function makeGlob(x, y, angle) {
  return {
    kind: 'glob',
    x, y,
    vx: Math.cos(angle) * 210,
    vy: Math.sin(angle) * 210,
    radius: 7,
    damage: 10,
    life: 4,
  };
}

const PICKUP_KINDS = [
  { kind: 'heal', until: 0.4 },
  { kind: 'shield', until: 0.7 },
  { kind: 'charge', until: 1.0 },
];

export function makePickup(x, y, rng) {
  const roll = rng();
  const kind = PICKUP_KINDS.find((p) => roll <= p.until).kind;
  return {
    kind: 'pickup',
    pickupKind: kind,
    x, y,
    radius: PICKUP.radius,
    t: 0,
    life: PICKUP.lifetime,
  };
}

// A radial burst of sparks, used for deaths, hits and pickups.
export function burst(particles, x, y, color, count, speed = 160, size = 3) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    particles.push({
      kind: 'particle',
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      t: 0,
      life: 0.35 + Math.random() * 0.4,
      color,
      size: size * (0.6 + Math.random() * 0.8),
    });
  }
}

// A slow rising mote — fireflies and ambient pollen that keep the
// clearing alive even between waves.
export function mote(particles, x, y, color) {
  particles.push({
    kind: 'particle',
    x, y,
    vx: (Math.random() - 0.5) * 14,
    vy: -8 - Math.random() * 16,
    t: 0,
    life: 2.5 + Math.random() * 2.5,
    color,
    size: 1.6 + Math.random() * 1.6,
  });
}

export function makeText(texts, x, y, text, color, size = 15) {
  texts.push({ kind: 'text', x, y, text, color, size, t: 0, life: 0.9 });
}

export function stepParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += dt;
    if (p.t >= p.life) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.4 * dt;
    p.vy *= 1 - 2.4 * dt;
  }
}

export function stepTexts(texts, dt) {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.t += dt;
    t.y -= 34 * dt;
    if (t.t >= t.life) texts.splice(i, 1);
  }
}
