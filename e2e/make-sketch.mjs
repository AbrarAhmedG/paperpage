// Renders e2e/fixtures/sketch.png — a synthetic hand-drawn page sketch
// (nav / hero / three cards / footer, with handwritten region labels) used
// by the full-flow E2E test. Run once: node e2e/make-sketch.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'fixtures', 'sketch.png');

const ink = '#3f4a58';
const label = `font-family="Segoe Print, Comic Sans MS, cursive" fill="${ink}"`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="1500" viewBox="0 0 1100 1500">
  <rect width="1100" height="1500" fill="#fbfaf7"/>
  <g fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <!-- nav: logo box + three menu strokes -->
    <path d="M42 52 q 80 -6 156 2 q 6 24 -2 50 q -78 5 -152 -1 q -6 -26 -2 -51 Z"/>
    <path d="M700 78 q 40 -5 84 2"/>
    <path d="M810 76 q 40 -3 84 3"/>
    <path d="M920 78 q 40 -5 84 2"/>
    <!-- hero: big frame, two headline strokes, sub stroke, button -->
    <path d="M42 150 q 500 -10 1016 4 q 10 200 -4 408 q -505 10 -1010 -4 q -10 -205 -2 -408 Z"/>
    <path d="M290 270 q 250 -10 520 4" stroke-width="8"/>
    <path d="M330 330 q 210 -8 440 4" stroke-width="8"/>
    <path d="M390 392 q 150 -6 320 3"/>
    <path d="M470 440 q 75 -8 158 2 q 8 26 -2 54 q -78 6 -154 -2 q -7 -27 -2 -54 Z"/>
    <!-- three cards: frame + icon circle + title + two text strokes -->
    <path d="M42 660 q 150 -8 316 4 q 10 190 -4 396 q -155 8 -310 -4 q -8 -195 -2 -396 Z"/>
    <circle cx="200" cy="760" r="44"/>
    <path d="M110 862 q 88 -8 184 3" stroke-width="6"/>
    <path d="M96 920 q 100 -6 210 3"/>
    <path d="M110 970 q 88 -7 182 2"/>
    <path d="M392 664 q 155 -10 316 2 q 8 194 -2 398 q -158 6 -312 -2 q -8 -196 -2 -398 Z"/>
    <circle cx="550" cy="762" r="44"/>
    <path d="M460 864 q 88 -6 184 2" stroke-width="6"/>
    <path d="M446 922 q 102 -8 210 4"/>
    <path d="M460 970 q 88 -5 182 3"/>
    <path d="M742 660 q 152 -6 316 4 q 10 192 -2 398 q -160 8 -312 -4 q -10 -196 -2 -398 Z"/>
    <circle cx="900" cy="760" r="44"/>
    <path d="M810 862 q 88 -8 184 2" stroke-width="6"/>
    <path d="M796 920 q 100 -7 210 2"/>
    <path d="M810 970 q 90 -6 182 3"/>
    <!-- footer: frame + copyright stroke + three social circles -->
    <path d="M42 1160 q 505 -8 1016 2 q 8 90 -2 186 q -508 8 -1012 -2 q -8 -92 -2 -186 Z"/>
    <path d="M90 1252 q 130 -6 270 3"/>
    <circle cx="880" cy="1252" r="26"/>
    <circle cx="950" cy="1250" r="26"/>
    <circle cx="1020" cy="1252" r="26"/>
  </g>
  <!-- handwritten region labels + logo/button text -->
  <text x="70" y="92" font-size="30" ${label}>LOGO</text>
  <text x="480" y="482" font-size="30" ${label}>Sign up</text>
  <text x="990" y="140" font-size="26" ${label}>nav</text>
  <text x="980" y="200" font-size="26" ${label}>hero</text>
  <text x="46" y="646" font-size="26" ${label}>3 cards</text>
  <text x="46" y="1150" font-size="26" ${label}>footer</text>
</svg>`;

mkdirSync(join(here, 'fixtures'), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(out);
console.log('wrote', out);
