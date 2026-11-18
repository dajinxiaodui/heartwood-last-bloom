// config.js — every tunable number for Heartwood: Last Bloom lives here:
// arena size, the guardian, the Heart Tree, enemy archetypes, the eight
// waves and the scoring table. Other modules import from this file only;
// nothing else hard-codes balance numbers.

export const VIEW = { width: 1280, height: 720 };

export const TREE = {
  x: VIEW.width / 2,
  y: VIEW.height / 2,
  radius: 34,          // trunk footprint; enemies stop and chew at this range
  canopyRadius: 92,    // drawn crown of leaves above the trunk
  maxHp: 100,
};

export const PLAYER = {
  radius: 14,
  speed: 265,          // px per second
  maxHp: 100,
  fireInterval: 0.16,  // seconds between seeds while the mouse is held
  bulletSpeed: 640,
  bulletDamage: 1,
  bulletRadius: 5,
  contactInvuln: 0.6,  // seconds of grace after an enemy touches the guardian
};

export const PICKUP = {
  radius: 11,
  lifetime: 9,         // seconds before an unclaimed spark fades
  dropChance: 0.22,
  healTreeAmount: 18,
  shieldSeconds: 10,
  overchargeSeconds: 8,
};

// Enemy archetypes. `score` is paid on kill; `treeDps` is the damage per
// second dealt to the tree while chewing; `touch` is the one-off damage to
// the guardian on contact.
export const ENEMIES = {
  crawler:  { radius: 15, hp: 3,  speed: 52,  score: 20,  treeDps: 5,  touch: 8,  color: '#b388ff' },
  dart:     { radius: 10, hp: 2,  speed: 118, score: 30,  treeDps: 4,  touch: 6,  color: '#ff7eb6' },
  splitter: { radius: 17, hp: 4,  speed: 44,  score: 40,  treeDps: 5,  touch: 8,  color: '#7ee787' },
  mite:     { radius: 8,  hp: 1,  speed: 132, score: 10,  treeDps: 3,  touch: 4,  color: '#a5d6a7' },
  brute:    { radius: 26, hp: 14, speed: 30,  score: 120, treeDps: 12, touch: 16, color: '#ff9e64' },
  maw:      { radius: 52, hp: 160, speed: 16, score: 1500, treeDps: 20, touch: 24, color: '#ff5577' },
};

// The eight waves. Each entry lists spawn groups; the wave is cleared when
// every group is exhausted and no enemy remains on the field.
export const WAVES = [
  { groups: [{ type: 'crawler', count: 6, interval: 1.5 }] },
  { groups: [{ type: 'crawler', count: 8, interval: 1.2 }, { type: 'dart', count: 3, interval: 2.2 }] },
  { groups: [{ type: 'crawler', count: 8, interval: 1.0 }, { type: 'splitter', count: 3, interval: 2.6 }] },
  { groups: [{ type: 'dart', count: 8, interval: 1.1 }, { type: 'crawler', count: 8, interval: 1.1 }, { type: 'brute', count: 1, interval: 6 }] },
  { groups: [{ type: 'splitter', count: 5, interval: 2.0 }, { type: 'dart', count: 6, interval: 1.4 }, { type: 'crawler', count: 10, interval: 0.9 }] },
  { groups: [{ type: 'brute', count: 2, interval: 7 }, { type: 'dart', count: 10, interval: 1.0 }, { type: 'crawler', count: 10, interval: 0.8 }] },
  { groups: [{ type: 'splitter', count: 6, interval: 1.8 }, { type: 'brute', count: 2, interval: 8 }, { type: 'dart', count: 12, interval: 0.9 }] },
  { groups: [{ type: 'maw', count: 1, interval: 1 }, { type: 'crawler', count: 8, interval: 2.5 }, { type: 'dart', count: 6, interval: 3.0 }] },
];

export const SCORE = {
  waveClearBonus: 100,   // multiplied by the wave number
  winTreeBonusPerHp: 10, // on victory, each remaining tree HP pays this
};

export const COLORS = {
  bgDeep: '#07131f',
  bgGlow: '#0d2b2a',
  groundRing: 'rgba(126, 231, 135, 0.07)',
  treeTrunk: '#8a5a33',
  treeCanopy: '#2ea86a',
  treeCanopyLight: '#7ee787',
  treeHeart: '#ffd76a',
  player: '#6ae3ff',
  playerCore: '#e8fbff',
  bullet: '#ffe066',
  sparkHeal: '#7ee787',
  sparkShield: '#6ae3ff',
  sparkCharge: '#ffd76a',
  textMain: '#e8f6ee',
  textDim: '#9db8a6',
  danger: '#ff5577',
};
