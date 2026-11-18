// Hand-in program for the best-game-01 entry "Heartwood: Last Bloom".
//
// The game itself is the static site in game/ (open game/index.html in a
// desktop browser, it runs fully offline). This program assembles the
// submission: it copies game/ and screenshots/ into the output directory
// and writes dossier.json there with the vendored make.fun library.
//
// Run it with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Without MAKEFUN_OUTPUT_DIR the output goes to /output (the grader's mount).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The caps below mirror the scorer's gate so an oversized entry fails here,
// at build time, instead of at judging time.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('wrote', join(outDir, 'dossier.json'));
