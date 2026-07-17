// Generates the "Try a sample sketch" pool: 12 synthetic hand-drawn page
// sketches (same wobbly-ink SVG→sharp technique as e2e/make-sketch.mjs) into
// public/samples/. Each covers a different page type so the pool doubles as a
// showcase of the sketch vocabulary (forms, quotes, stats, tables, logo strips,
// sliders). Deterministic per-sketch RNG: re-running reproduces identical PNGs.
// Run once after edits: node scripts/make-samples.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'samples');

const W = 1100;
const ink = '#3f4a58';
const FONT = `font-family="Segoe Print, Comic Sans MS, cursive" fill="${ink}" stroke="none"`;

// mulberry32 — tiny seeded PRNG so each sketch's wobble is stable across runs.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let R = Math.random;
const j = (n = 6) => (R() - 0.5) * 2 * n; // hand wobble

// --- hand-drawn primitives -------------------------------------------------
const box = (x, y, w, h, sw = 4) =>
  `<path stroke-width="${sw}" d="M${x} ${y} q ${w / 2} ${j()} ${w + j(3)} ${j(3)} q ${j()} ${h / 2} ${j(3)} ${h + j(3)} q ${-w / 2} ${j()} ${-w + j(3)} ${j(3)} q ${j()} ${-h / 2} ${j(3)} ${-h + j(3)} Z"/>`;
const line = (x, y, len, sw = 4, o = 1) =>
  `<path stroke-width="${sw}" opacity="${o}" d="M${x} ${y} q ${len / 2} ${j(5)} ${len} ${j(3)}"/>`;
const circ = (cx, cy, r) => `<circle cx="${cx + j(2)}" cy="${cy + j(2)}" r="${r + j(1.5)}"/>`;
const txt = (x, y, size, s) => `<text x="${x}" y="${y}" font-size="${size}" ${FONT}>${s}</text>`;

// image placeholder: frame + mountain + sun (the glyph the prompt recognizes)
const imageBox = (x, y, w, h) =>
  box(x, y, w, h) +
  `<path stroke-width="3.5" d="M${x + 0.12 * w} ${y + 0.82 * h} L${x + 0.38 * w} ${y + 0.42 * h} L${x + 0.55 * w} ${y + 0.64 * h} L${x + 0.68 * w} ${y + 0.44 * h} L${x + 0.88 * w} ${y + 0.82 * h}"/>` +
  circ(x + 0.76 * w, y + 0.24 * h, 0.055 * w);

// --- composite pieces ------------------------------------------------------
const nav = (label = true, menuXs = [700, 810, 920]) =>
  box(42, 44, 150, 54) +
  txt(70, 84, 26, 'LOGO') +
  menuXs.map((x) => line(x, 74, 84)).join('') +
  (label ? txt(1014, 40, 22, 'nav') : '');

const searchBox = () =>
  box(830, 44, 220, 52, 3.5) + circ(1010, 66, 11) + `<path stroke-width="3.5" d="M1018 75 l 13 13"/>`;

const footer = (y, h = 180) =>
  txt(46, y - 10, 24, 'footer') +
  box(42, y, 1016, h) +
  line(90, y + h / 2 + 6, 260) +
  circ(880, y + h / 2, 26) +
  circ(950, y + h / 2, 26) +
  circ(1020, y + h / 2, 26);

const field = (x, y, w, label) => txt(x + 4, y - 10, 24, label) + box(x, y, w, 52, 3.5);
const btn = (x, y, w, label) => box(x, y, w, 56, 4) + txt(x + 24, y + 38, 26, label);

// card: frame + round icon + title stroke + two text strokes
const iconCard = (x, y, w = 316, h = 360) =>
  box(x, y, w, h) +
  circ(x + w / 2, y + 96, 44) +
  line(x + 66, y + 196, w - 132, 6) +
  line(x + 50, y + 248, w - 100, 3.5, 0.75) +
  line(x + 66, y + 292, w - 132, 3.5, 0.75);

// ruled table grid with r rows × c cols
function tableGrid(x, y, w, h, rows, cols) {
  let s = box(x, y, w, h);
  for (let r = 1; r < rows; r++) s += line(x + 6, y + (h / rows) * r, w - 12, 3);
  for (let c = 1; c < cols; c++)
    s += `<path stroke-width="3" d="M${x + (w / cols) * c} ${y + 4} q ${j(4)} ${h / 2} ${j(3)} ${h - 8}"/>`;
  return s;
}

// --- the twelve sketches ---------------------------------------------------
const SKETCHES = [
  {
    name: 'sample-01-saas',
    seed: 101,
    height: 1420,
    draw: () => [
      nav(),
      txt(980, 140, 24, 'hero'),
      box(42, 150, 1016, 400),
      line(90, 260, 470, 8),
      line(90, 322, 400, 8),
      line(90, 384, 330, 4, 0.7),
      btn(90, 432, 170, 'Sign up'),
      imageBox(640, 200, 370, 300),
      txt(46, 646, 24, '3 features'),
      iconCard(42, 660),
      iconCard(392, 660),
      iconCard(742, 660),
      footer(1180),
    ],
  },
  {
    name: 'sample-02-portfolio',
    seed: 202,
    height: 1150,
    draw: () => [
      nav(),
      line(300, 210, 500, 8),
      line(400, 268, 300, 4, 0.7),
      txt(46, 326, 24, 'gallery'),
      imageBox(42, 340, 316, 240),
      imageBox(392, 340, 316, 240),
      imageBox(742, 340, 316, 240),
      imageBox(42, 615, 316, 240),
      imageBox(392, 615, 316, 240),
      imageBox(742, 615, 316, 240),
      footer(920),
    ],
  },
  {
    name: 'sample-03-restaurant',
    seed: 303,
    height: 1720,
    draw: () => [
      nav(),
      txt(980, 140, 24, 'hero'),
      box(42, 150, 1016, 330),
      line(90, 250, 460, 8),
      line(90, 310, 320, 4, 0.7),
      btn(90, 360, 220, 'Book a table'),
      imageBox(660, 185, 350, 260),
      txt(90, 580, 38, 'Our menu'),
      ...[640, 695, 750, 805, 860].map((y) => circ(102, y - 8, 7) + line(126, y - 6, 380)),
      imageBox(660, 620, 350, 260),
      txt(90, 990, 32, 'Contact'),
      field(90, 1040, 420, 'Name'),
      field(90, 1140, 420, 'Email'),
      txt(94, 1230, 24, 'Message'),
      box(90, 1240, 420, 130, 3.5),
      btn(90, 1400, 150, 'Send'),
      footer(1510),
    ],
  },
  {
    name: 'sample-04-pricing',
    seed: 404,
    height: 1480,
    draw: () => [
      nav(),
      line(300, 205, 500, 8),
      txt(46, 258, 24, 'pricing'),
      ...[
        [42, '$9'],
        [392, '$29'],
        [742, '$99'],
      ].map(
        ([x, price]) =>
          box(x, 270, 316, 520) +
          line(x + 90, 340, 140, 6) +
          txt(x + 110, 452, 56, price) +
          line(x + 60, 510, 200, 3.5, 0.75) +
          line(x + 60, 560, 200, 3.5, 0.75) +
          line(x + 60, 610, 200, 3.5, 0.75) +
          btn(x + 80, 680, 160, 'Choose'),
      ),
      txt(46, 866, 24, 'compare'),
      tableGrid(42, 880, 1016, 320, 4, 4),
      txt(70, 935, 24, 'Feature'),
      txt(340, 935, 24, 'Basic'),
      txt(596, 935, 24, 'Pro'),
      txt(846, 935, 24, 'Max'),
      ...[1015, 1095, 1175].flatMap((y) => [
        line(70, y - 20, 150, 3.5, 0.75),
        txt(350, y, 26, '✓'),
        txt(604, y, 26, '✓'),
        txt(858, y, 26, '✓'),
      ]),
      footer(1250),
    ],
  },
  {
    name: 'sample-05-blog',
    seed: 505,
    height: 1300,
    draw: () => [
      nav(false, [560, 670]),
      searchBox(),
      line(90, 200, 420, 8),
      ...[42, 392, 742].flatMap((x, i) => [
        imageBox(x, 260, 316, 190),
        txt(x + 110, 370, 28, `blog ${i + 1}`),
        line(x + 30, 495, 200, 5),
        line(x + 30, 535, 250, 3.5, 0.7),
      ]),
      ...[42, 392, 742].flatMap((x, i) => [
        imageBox(x, 610, 316, 190),
        txt(x + 110, 720, 28, `blog ${i + 4}`),
        line(x + 30, 845, 200, 5),
        line(x + 30, 885, 250, 3.5, 0.7),
      ]),
      ...[470, 540, 610].map((x, i) => box(x, 940, 56, 48, 3.5) + txt(x + 20, 974, 26, String(i + 1))),
      footer(1060),
    ],
  },
  {
    name: 'sample-06-contact',
    seed: 606,
    height: 1000,
    draw: () => [
      nav(),
      txt(90, 220, 46, 'Contact us'),
      field(90, 290, 420, 'Name'),
      field(90, 390, 420, 'Email'),
      txt(94, 480, 24, 'Message'),
      box(90, 490, 420, 130, 3.5),
      btn(90, 650, 150, 'Send'),
      imageBox(600, 270, 410, 320),
      txt(770, 620, 26, 'map'),
      footer(770),
    ],
  },
  {
    name: 'sample-07-testimonials',
    seed: 707,
    height: 1360,
    draw: () => [
      nav(),
      line(200, 220, 600, 8),
      line(300, 280, 400, 4, 0.7),
      btn(460, 330, 180, 'Hire us'),
      txt(46, 446, 24, 'testimonials'),
      ...[42, 392, 742].map(
        (x) =>
          box(x, 460, 316, 360) +
          txt(x + 34, 546, 64, '&#8220;') +
          line(x + 40, 580, 230, 3.5, 0.8) +
          line(x + 40, 620, 200, 3.5, 0.8) +
          line(x + 40, 660, 215, 3.5, 0.8) +
          circ(x + 70, 745, 26) +
          line(x + 115, 750, 120, 4),
      ),
      txt(90, 940, 30, 'Partners'),
      txt(56, 1020, 40, '&lt;'),
      ...[120, 285, 450, 615, 780].map((x) => box(x, 965, 145, 70, 3.5)),
      txt(1000, 1020, 40, '&gt;'),
      circ(520, 1085, 6),
      circ(555, 1085, 6),
      circ(590, 1085, 6),
      footer(1140),
    ],
  },
  {
    name: 'sample-08-startup',
    seed: 808,
    height: 1330,
    draw: () => [
      nav(),
      line(150, 225, 700, 8),
      line(250, 290, 500, 8),
      line(330, 350, 380, 4, 0.7),
      btn(370, 405, 170, 'Start'),
      btn(580, 405, 170, 'Demo'),
      txt(46, 576, 24, 'stats'),
      ...[
        [42, '500+'],
        [306, '99%'],
        [570, '24/7'],
        [834, '12k'],
      ].map(([x, v]) => txt(x + 50, 680, 56, v) + line(x + 44, 720, 160, 3.5, 0.7)),
      box(42, 830, 1016, 200),
      line(300, 912, 480, 6),
      btn(455, 950, 190, 'Join now'),
      footer(1100),
    ],
  },
  {
    name: 'sample-09-travel',
    seed: 909,
    height: 1250,
    draw: () => [
      nav(),
      line(300, 205, 480, 8),
      line(380, 262, 320, 4, 0.7),
      txt(46, 312, 24, 'slider'),
      txt(52, 545, 48, '&lt;'),
      imageBox(120, 320, 860, 400),
      txt(1005, 545, 48, '&gt;'),
      circ(520, 762, 7),
      circ(552, 762, 7),
      circ(584, 762, 7),
      ...[42, 300, 558, 816].map((x) => imageBox(x, 805, 226, 150)),
      footer(1010),
    ],
  },
  {
    name: 'sample-10-conference',
    seed: 1010,
    height: 1490,
    draw: () => [
      nav(),
      txt(280, 240, 54, 'DevConf 2026'),
      line(330, 295, 400, 4, 0.7),
      btn(450, 345, 200, 'Register'),
      txt(46, 476, 24, 'schedule'),
      tableGrid(42, 490, 1016, 330, 5, 3),
      txt(80, 535, 26, 'Time'),
      txt(440, 535, 26, 'Room A'),
      txt(780, 535, 26, 'Room B'),
      ...['9:00', '10:30', '12:00', '2:00'].map((t, i) => txt(80, 620 + i * 66, 26, t)),
      ...[0, 1, 2, 3].flatMap((i) => [
        line(420, 612 + i * 66, 220, 3.5, 0.75),
        line(760, 612 + i * 66, 220, 3.5, 0.75),
      ]),
      txt(90, 920, 32, 'Sign up'),
      field(90, 970, 420, 'Name'),
      field(90, 1070, 420, 'Email'),
      btn(90, 1160, 190, 'Register'),
      footer(1280),
    ],
  },
  {
    name: 'sample-11-store',
    seed: 1111,
    height: 1240,
    draw: () => [
      nav(false, [560, 670]),
      searchBox(),
      txt(90, 218, 46, 'Shop'),
      ...[42, 392, 742].flatMap((x) => [
        imageBox(x, 260, 316, 200),
        line(x + 30, 505, 180, 5),
        txt(x + 30, 555, 34, '$20'),
        box(x + 190, 515, 100, 46, 3.5),
        txt(x + 212, 548, 24, 'Buy'),
      ]),
      ...[42, 392, 742].flatMap((x) => [
        imageBox(x, 620, 316, 200),
        line(x + 30, 865, 180, 5),
        txt(x + 30, 915, 34, '$35'),
        box(x + 190, 875, 100, 46, 3.5),
        txt(x + 212, 908, 24, 'Buy'),
      ]),
      footer(1000),
    ],
  },
  {
    name: 'sample-12-gym',
    seed: 1212,
    height: 1480,
    draw: () => [
      nav(),
      txt(980, 140, 24, 'hero'),
      box(42, 150, 1016, 380),
      line(90, 260, 460, 8),
      line(90, 322, 380, 8),
      line(90, 382, 300, 4, 0.7),
      btn(90, 432, 210, 'Join today'),
      imageBox(620, 190, 400, 300),
      iconCard(42, 590, 316, 320),
      iconCard(392, 590, 316, 320),
      iconCard(742, 590, 316, 320),
      box(200, 970, 700, 220),
      txt(234, 1056, 64, '&#8220;'),
      line(240, 1090, 500, 3.5, 0.8),
      line(240, 1130, 440, 3.5, 0.8),
      circ(272, 1155, 24),
      line(312, 1160, 150, 4),
      footer(1250),
    ],
  },
];

mkdirSync(outDir, { recursive: true });
for (const s of SKETCHES) {
  R = mulberry32(s.seed);
  const body = s.draw().join('\n    ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${s.height}" viewBox="0 0 ${W} ${s.height}">
  <rect width="${W}" height="${s.height}" fill="#fbfaf7"/>
  <g fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    ${body}
  </g>
</svg>`;
  const file = join(outDir, `${s.name}.png`);
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log('wrote', file);
}
