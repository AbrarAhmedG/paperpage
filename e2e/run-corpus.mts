/**
 * Sketch regression corpus: re-runs every known-tricky sketch through the
 * LIVE prompt + validation + renderer and asserts the fixes stay fixed.
 *
 *   npm run test:corpus        (requires .env.local with the vision key)
 *
 * Each entry costs one vision API call per run — run on demand after prompt
 * or renderer changes, not in CI. Add a new entry whenever a user sketch
 * exposes a fidelity bug: drop the image in e2e/corpus/ and assert the
 * property that the fix guarantees.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import Anthropic from '@anthropic-ai/sdk';
import { LAYOUT_PROMPT } from '../lib/prompt';
import { validateIR, type PageIR } from '../utils/ir/schema';
import { renderPage } from '../utils/renderer';

const here = dirname(fileURLToPath(import.meta.url));

// tsx does not auto-load .env.local
for (const line of readFileSync(join(here, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
}

type Entry = {
  name: string;
  image: string;
  /** Return a list of failure messages; empty = pass. */
  assert: (ir: PageIR, html: string) => string[];
};

const roles = (ir: PageIR) => ir.sections.map((s) => s.role);
const allElements = (ir: PageIR) => ir.sections.flatMap((s) => s.elements);

const ENTRIES: Entry[] = [
  {
    // IMG_2876 (2026-07-16): partners logo strip collapsed into one slider
    // image; "Footer" leaked as a visible heading.
    name: 'partners-strip',
    image: join(here, 'corpus', 'partners-strip.jpeg'),
    assert: (ir, html) => {
      const fails: string[] = [];
      const imgs = ir.sections.map((s) => s.elements.filter((e) => e.type === 'image').length);
      if (Math.max(...imgs) < 4) fails.push(`no section has >=4 images (logo strip); per-section: ${imgs.join(',')}`);
      if (!roles(ir).includes('nav')) fails.push('missing nav section');
      if (!roles(ir).includes('hero')) fails.push('missing hero section');
      if (!roles(ir).includes('footer')) fails.push('missing footer section');
      if (/>\s*Footer\s*</.test(html)) fails.push('"Footer" rendered as visible copy');
      if (!/pp-logochip|pp-logos/.test(html)) fails.push('no logo chips rendered for the partner strip');
      return fails;
    },
  },
  {
    // Synthetic E2E fixture: nav / hero with two headline strokes + button /
    // three cards / footer with social circles.
    name: 'fixture-basic',
    image: join(here, 'fixtures', 'sketch.png'),
    assert: (ir, html) => {
      const fails: string[] = [];
      if (ir.sections.length < 3) fails.push(`only ${ir.sections.length} sections`);
      if (!roles(ir).includes('hero')) fails.push('missing hero section');
      if (!roles(ir).includes('footer')) fails.push('missing footer section');
      if (!allElements(ir).some((e) => e.type === 'button')) fails.push('no button captured');
      if (/>\s*(Footer|Header|Nav)\s*</i.test(html)) fails.push('region label rendered as visible copy');
      return fails;
    },
  },
];

async function interpret(imagePath: string): Promise<PageIR> {
  const jpeg = await sharp(readFileSync(imagePath))
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY });
  const res = await client.messages.create({
    model: process.env.AI_MODEL || 'claude-sonnet-5',
    max_tokens: 8192,
    system: LAYOUT_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpeg.toString('base64') } },
          { type: 'text', text: 'Interpret this hand-drawn website sketch and return the layout JSON.' },
        ],
      },
    ],
  });
  const block = res.content.find((b) => b.type === 'text');
  const text = block && 'text' in block ? block.text : '';
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const parsed = JSON.parse(start !== -1 && end > start ? raw.slice(start, end + 1) : raw);
  const result = validateIR(parsed);
  if (!result.ok) throw new Error(`IR invalid: ${result.error}`);
  return result.ir;
}

let failed = 0;
for (const entry of ENTRIES) {
  try {
    const ir = await interpret(entry.image);
    const { html } = renderPage(ir);
    const fails = entry.assert(ir, html);
    if (fails.length === 0) {
      console.log(`PASS  ${entry.name}`);
    } else {
      failed++;
      console.log(`FAIL  ${entry.name}`);
      for (const f of fails) console.log(`      - ${f}`);
    }
  } catch (e) {
    failed++;
    console.log(`ERROR ${entry.name}: ${e instanceof Error ? e.message : e}`);
  }
}
console.log(failed === 0 ? `\nAll ${ENTRIES.length} corpus sketches pass.` : `\n${failed}/${ENTRIES.length} corpus sketches FAILED.`);
process.exit(failed === 0 ? 0 : 1);
