# 2D Layout + Attractive Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render sketches as faithful 2D CSS-grid layouts with modern, attractive styling and auto-filled placeholder copy, while guiding users on what to upload and degrading gracefully on non-page images.

**Architecture:** Express 2D via explicit grid coordinates on IR elements (`col`/`colSpan`/`row`/`rowSpan`, section `columns` 1–12) — no nested containers. The deterministic renderer places elements on a CSS grid, fills placeholder copy for empty elements, and emits modern responsive CSS. The shared vision prompt is extended to produce grid coordinates + a modern palette. The Uploader guides users; the pipeline always returns a valid editable page.

**Tech Stack:** TypeScript, Zod, Vitest, Next.js (App Router), the existing `@anthropic-ai/sdk` / OpenAI-compatible provider split.

## Global Constraints

- Generated HTML stays **safe-by-construction**: all text HTML-escaped via `esc()`, no `<script>`, no untrusted URLs. New placeholder text and inline styles must not introduce a sink.
- IR is a **generation seed only** — no migration of existing projects (they render from stored `html`/`css`).
- Structure/placement come **only from the sketch**; styling + placeholder copy are layered on top — never invent sections or semantic content.
- Grid columns are **1-indexed** (CSS-grid native).
- `npm test` and `npm run build` must be green after each task.
- Spec: `docs/superpowers/specs/2026-07-15-2d-layout-attractive-rendering-design.md`.

---

### Task 1: IR grid coordinates + wider columns + section background

**Files:**
- Modify: `utils/ir/schema.ts` (elementSchema, sectionSchema)
- Test: `utils/ir/schema.test.ts`

**Interfaces:**
- Produces: `Element` gains optional `col?, colSpan?, row?, rowSpan?: number`; `Section.layout.columns` range `1..12`; `Section.background?: 'default'|'surface'|'primary'|'gradient'|'dark'`.
- Consumes: existing `normKey`, `elementType`, `sectionRole` helpers.

- [ ] **Step 1: Write failing tests** in `utils/ir/schema.test.ts`:

```ts
import { validateIR } from './schema';

function base(extra: any) {
  return {
    theme: { palette: { primary: '#111111', secondary: '#222222', background: '#ffffff', surface: '#f8fafc', text: '#0f172a' }, fonts: { heading: 'Inter', body: 'Inter' }, spacing: 'normal' },
    sections: [{ id: 's', role: 'hero', layout: { columns: 2, align: 'start' }, elements: [{ type: 'image', ...extra }] }],
  };
}

it('coerces and keeps grid coordinates on elements', () => {
  const r = validateIR(base({ col: '2', colSpan: '2', row: 1, rowSpan: '1' }));
  expect(r.ok).toBe(true);
  if (r.ok) {
    const el = r.ir.sections[0].elements[0];
    expect(el.col).toBe(2);
    expect(el.colSpan).toBe(2);
    expect(el.row).toBe(1);
  }
});

it('drops invalid grid coordinates rather than failing', () => {
  const r = validateIR(base({ col: 'left', colSpan: 0 }));
  expect(r.ok).toBe(true);
  if (r.ok) {
    const el = r.ir.sections[0].elements[0];
    expect(el.col).toBeUndefined();
  }
});

it('accepts up to 12 columns and clamps higher values', () => {
  const ok = validateIR({ ...base({}), sections: [{ id: 's', role: 'hero', layout: { columns: 12, align: 'start' }, elements: [{ type: 'image' }] }] });
  expect(ok.ok).toBe(true);
  const hi = validateIR({ ...base({}), sections: [{ id: 's', role: 'hero', layout: { columns: 99, align: 'start' }, elements: [{ type: 'image' }] }] });
  expect(hi.ok).toBe(true);
  if (hi.ok) expect(hi.ir.sections[0].layout.columns).toBe(1); // out-of-range -> catch default
});

it('salvages unknown background to default', () => {
  const r = validateIR({ ...base({}), sections: [{ id: 's', role: 'hero', background: 'neon', layout: { columns: 1, align: 'start' }, elements: [{ type: 'image' }] }] });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.ir.sections[0].background).toBe('default');
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- schema` → FAIL (fields missing / columns max 4).

- [ ] **Step 3: Implement.** In `utils/ir/schema.ts`:

Add to `elementSchema` object (alongside existing fields):

```ts
  col: z.coerce.number().int().min(1).optional().catch(undefined),
  colSpan: z.coerce.number().int().min(1).optional().catch(undefined),
  row: z.coerce.number().int().min(1).optional().catch(undefined),
  rowSpan: z.coerce.number().int().min(1).optional().catch(undefined),
```

Change `columns` max in `sectionSchema.layout` from `.max(4)` to `.max(12)`.

Add a background enum + field. Near the other consts:

```ts
export const SECTION_BACKGROUNDS = ['default', 'surface', 'primary', 'gradient', 'dark'] as const;
const sectionBackground = z
  .preprocess((v) => (v == null ? 'default' : String(v).toLowerCase()), z.enum(SECTION_BACKGROUNDS))
  .catch('default');
```

Add to `sectionSchema` object: `background: sectionBackground,`.

- [ ] **Step 4: Run tests** — `npm test -- schema` → PASS (and existing schema tests stay green).

- [ ] **Step 5: Commit**

```bash
git add utils/ir/schema.ts utils/ir/schema.test.ts
git commit -m "feat(ir): grid coordinates on elements, columns 1-12, section background"
```

---

### Task 2: Renderer grid placement + responsive + background variant

**Files:**
- Modify: `utils/renderer.ts` (renderSection, CSS)
- Test: `utils/renderer.test.ts`

**Interfaces:**
- Consumes: `Element.col/colSpan/row/rowSpan`, `Section.layout.columns`, `Section.background` from Task 1.
- Produces: sections render as CSS grid; each element wrapped in `<div class="pp-cell" style="grid-column:…">`; section carries `pp-bg-<background>` class and `--pp-cols`.

- [ ] **Step 1: Write failing tests** — append to `utils/renderer.test.ts`:

```ts
it('renders a section as a CSS grid with the requested column count', () => {
  const g: PageIR = { ...ir, sections: [{ id: 'g', role: 'hero', background: 'gradient', layout: { columns: 4, align: 'start' }, elements: [
    { type: 'image', alt: 'video', col: 1, colSpan: 2, rowSpan: 2 },
    { type: 'paragraph', text: 'chat', col: 3, colSpan: 2 },
  ] }] };
  const { html, css } = renderPage(g);
  expect(css).toContain('grid-template-columns: repeat(var(--pp-cols)');
  expect(html).toContain('--pp-cols:4');
  expect(html).toContain('grid-column:1 / span 2');
  expect(html).toContain('pp-bg-gradient');
});

it('collapses to a single column on small screens', () => {
  const { css } = renderPage(ir);
  expect(css).toContain('@media (max-width: 768px)');
  expect(css).toContain('grid-template-columns: 1fr');
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- renderer` → FAIL.

- [ ] **Step 3: Implement.** In `utils/renderer.ts`:

Add a clamp helper and placement builder above `renderSection`:

```ts
const clampInt = (n: number | undefined, lo: number, hi: number): number | undefined =>
  n == null ? undefined : Math.min(Math.max(Math.trunc(n), lo), hi);

function placementStyle(el: Element, columns: number): string {
  const parts: string[] = [];
  const col = clampInt(el.col, 1, columns);
  if (col != null) {
    const span = clampInt(el.colSpan ?? 1, 1, columns - col + 1) ?? 1;
    parts.push(`grid-column:${col} / span ${span}`);
  } else if (el.colSpan && columns > 1) {
    parts.push(`grid-column: span ${clampInt(el.colSpan, 1, columns)}`);
  }
  const row = clampInt(el.row, 1, 100);
  if (row != null) {
    const rspan = clampInt(el.rowSpan ?? 1, 1, 100) ?? 1;
    parts.push(`grid-row:${row} / span ${rspan}`);
  } else if (el.rowSpan) {
    parts.push(`grid-row: span ${clampInt(el.rowSpan, 1, 100)}`);
  }
  return parts.length ? ` style="${parts.join(';')}"` : '';
}
```

Rewrite `renderSection`:

```ts
function renderSection(section: Section): string {
  const cols = section.layout.columns;
  const bg = section.background ?? 'default';
  const cells = section.elements
    .map((el) => `<div class="pp-cell"${placementStyle(el, cols)}>${renderElement(el)}</div>`)
    .join('\n      ');
  return `  <section data-region="${section.role}" class="pp-section pp-${section.role} pp-bg-${bg}" data-align="${section.layout.align}" style="--pp-cols:${cols}">
    <div class="pp-container">
      ${cells}
    </div>
  </section>`;
}
```

In the CSS string, replace the `.pp-container` rule and the old `.pp-features/.pp-gallery` grid rule with:

```css
.pp-container { display: grid; grid-template-columns: repeat(var(--pp-cols), 1fr); gap: 1.5rem; max-width: 1100px; margin: 0 auto; align-items: start; }
.pp-cell { min-width: 0; }
@media (max-width: 768px) { .pp-container { grid-template-columns: 1fr; } }
```

Add background-variant CSS (append to the CSS string):

```css
.pp-bg-surface { background: var(--pp-surface); }
.pp-bg-primary { background: color-mix(in srgb, var(--pp-primary) 10%, var(--pp-background)); }
.pp-bg-gradient { background: radial-gradient(1200px 400px at 20% -10%, color-mix(in srgb, var(--pp-primary) 22%, transparent), transparent), radial-gradient(1000px 400px at 90% 0%, color-mix(in srgb, var(--pp-secondary) 22%, transparent), transparent), var(--pp-background); }
.pp-bg-dark { background: var(--pp-text); color: var(--pp-background); }
```

- [ ] **Step 4: Run tests** — `npm test -- renderer` → PASS; existing renderer tests (escaping, no-script, placeholder-not-black, data-region, palette vars, fonts) stay green.

- [ ] **Step 5: Commit**

```bash
git add utils/renderer.ts utils/renderer.test.ts
git commit -m "feat(renderer): CSS-grid placement, responsive collapse, section backgrounds"
```

---

### Task 3: Placeholder auto-fill for empty elements

**Files:**
- Modify: `utils/renderer.ts` (renderElement + a placeholder helper)
- Test: `utils/renderer.test.ts`

**Interfaces:**
- Consumes: `Element` from Task 1.
- Produces: empty `heading`/`paragraph`/`list`/`button` render non-empty escaped placeholder copy.

- [ ] **Step 1: Write failing tests** — append to `utils/renderer.test.ts`:

```ts
it('fills placeholder copy for empty elements', () => {
  const p: PageIR = { ...ir, sections: [{ id: 'p', role: 'text', layout: { columns: 1, align: 'start' }, elements: [
    { type: 'heading', level: 2 },
    { type: 'paragraph' },
    { type: 'button' },
    { type: 'list' },
  ] }] };
  const { html } = renderPage(p);
  expect(html).toMatch(/<h2 class="pp-heading">[^<]+<\/h2>/);      // non-empty heading
  expect(html).toMatch(/<p class="pp-paragraph">[^<]+<\/p>/);      // non-empty paragraph
  expect(html).toContain('<li>');                                  // list has items
  expect(html.toLowerCase()).not.toContain('<script');            // still safe
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- renderer` → FAIL (empty heading/paragraph render empty).

- [ ] **Step 3: Implement.** In `utils/renderer.ts`, add placeholders + use them in `renderElement`:

```ts
const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
const HEADING_PLACEHOLDER: Record<number, string> = { 1: 'Your Headline Goes Here', 2: 'A Section Heading', 3: 'A Subheading', 4: 'Detail Heading' };
const LIST_PLACEHOLDER = ['First item', 'Second item', 'Third item'];
```

In `renderElement`, change the relevant branches:

```ts
    case 'heading': {
      const lvl = Math.min(Math.max(el.level ?? 2, 1), 4);
      const text = esc(el.text) || esc(HEADING_PLACEHOLDER[lvl] ?? 'Heading');
      return `<h${lvl} class="pp-heading">${text}</h${lvl}>`;
    }
    case 'paragraph':
      return `<p class="pp-paragraph">${esc(el.text) || esc(LOREM)}</p>`;
    case 'button': {
      const v = el.variant ?? 'primary';
      return `<a class="pp-button pp-button--${v}" href="#">${esc(el.text) || 'Learn More'}</a>`;
    }
    case 'list': {
      const src = el.items && el.items.length ? el.items : LIST_PLACEHOLDER;
      const items = src.map((i) => `<li>${esc(i)}</li>`).join('');
      return `<ul class="pp-list">${items}</ul>`;
    }
```

(`logo` and `input` keep their existing fallbacks.)

- [ ] **Step 4: Run tests** — `npm test -- renderer` → PASS. Existing escaping test still passes (placeholders are static, escaped).

- [ ] **Step 5: Commit**

```bash
git add utils/renderer.ts utils/renderer.test.ts
git commit -m "feat(renderer): auto-fill placeholder copy for empty elements"
```

---

### Task 4: Modern attractive styling pass

**Files:**
- Modify: `utils/renderer.ts` (CSS string), `utils/ir/schema.ts` (`CURATED_PALETTES` refresh)
- Test: `utils/renderer.test.ts` (one assertion for a card/hover class)

**Interfaces:**
- Consumes: existing CSS variables (`--pp-primary` etc.), `pp-*` classes.
- Produces: modernized CSS (type scale, cards, hover, hero); refreshed default palettes. No new HTML classes required by other tasks.

- [ ] **Step 1: Write a failing test** — append to `utils/renderer.test.ts`:

```ts
it('emits modern styling hooks (card shadow + button hover)', () => {
  const { css } = renderPage(ir);
  expect(css).toContain('.pp-button:hover');
  expect(css).toContain('box-shadow');
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- renderer` → FAIL (no `:hover`, no `box-shadow` yet).

- [ ] **Step 3: Implement.** In `utils/renderer.ts` CSS string:
  - Add a modern type scale: `.pp-heading` sizes by tag (`h1` clamp, `h2`, `h3`), tighter letter-spacing on headings.
  - `.pp-image` and image-bearing cells: `border-radius: 0.9rem; box-shadow: 0 6px 24px rgba(2,6,23,.08);`.
  - `.pp-button { transition: transform .12s ease, box-shadow .12s ease; }` and `.pp-button:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(2,6,23,.15); }`.
  - `.pp-hero` retains centered treatment; pairs with `pp-bg-gradient`.
  - Comfortable body: `.pp-page { font-size: 1.0625rem; }`, section vertical rhythm from `--pp-space`.

In `utils/ir/schema.ts`, refresh `CURATED_PALETTES` to modern schemes, e.g.:

```ts
export const CURATED_PALETTES = {
  indigo: { primary: '#6366f1', secondary: '#f59e0b', background: '#ffffff', surface: '#f5f6ff', text: '#0f172a' },
  teal: { primary: '#0d9488', secondary: '#f43f5e', background: '#ffffff', surface: '#f0fdfa', text: '#0f172a' },
} as const;
```

- [ ] **Step 4: Run tests** — `npm test` → all green.

- [ ] **Step 5: Commit**

```bash
git add utils/renderer.ts utils/ir/schema.ts
git commit -m "feat(renderer): modern type scale, cards, button hover, refreshed palettes"
```

---

### Task 5: Vision prompt — grid coordinates + palette + leave-empty

**Files:**
- Modify: `lib/gemini.ts` (the `PROMPT` template)

**Interfaces:**
- Consumes: `SECTION_ROLES`, `ELEMENT_TYPES`, `CURATED_FONTS` (already imported). No new import required (`SECTION_BACKGROUNDS` optional — inline the literal list to avoid coupling).
- Produces: prompt that yields `col/colSpan/row` + `background` + modern palette; both provider paths use it.

- [ ] **Step 1: Update the JSON-shape block** in `PROMPT` to include the new fields:
  - In the section shape add: `"background": "default|surface|primary|gradient|dark"` and note `"columns": <integer 1-12>`.
  - In the element shape add: `"col": <1-indexed column>`, `"colSpan": <n>`, `"row": <1-indexed row>`.

- [ ] **Step 2: Update the Rules** in `PROMPT`:
  - Add: *"Place elements on a grid to match the drawing's 2D arrangement: set the section's `columns` and each element's `col`/`colSpan`/`row`. Columns are 1-indexed (col 1 = leftmost). Elements drawn side by side get different `col` values; wide banners use `colSpan`."*
  - Add: *"Choose a modern, attractive palette (clean, high-contrast, light background) and set each section's `background` for visual rhythm (e.g. a `gradient` hero, alternating `surface`)."*
  - Keep the existing *"leave text empty when the sketch has none"* rule (the renderer fills placeholders).
  - Add the graceful-fallback rule: *"If the image is clearly NOT a hand-drawn web-page layout, return a single `hero` section with one heading and one paragraph as a starter — do not invent a full site."*

- [ ] **Step 3: Verify build/tests** — `npm run build` clean; `npm test` green (prompt is a string; no unit test, covered by Task 7 live check).

- [ ] **Step 4: Commit**

```bash
git add lib/gemini.ts
git commit -m "feat(prompt): grid coordinates, modern palette, section background, graceful fallback"
```

---

### Task 6: Uploader input guidance

**Files:**
- Modify: `components/studio/Uploader.tsx`

**Interfaces:**
- Consumes: existing Uploader UI. Produces: visible guidance about what to upload; no API/behavior change.

- [ ] **Step 1: Read `components/studio/Uploader.tsx`** to locate the drop-zone / instructions area.

- [ ] **Step 2: Add a guidance block** inside the upload card (adapt to existing markup/classes):

```tsx
<div className="text-sm text-slate-600 space-y-1">
  <p className="font-medium">Upload a photo or scan of a hand-drawn <strong>web-page layout</strong>.</p>
  <p>Use boxes for sections, lines for text, and labels like “nav”, “hero”, “AD”, “footer”.</p>
  <p className="text-slate-500">Tips: good lighting, high contrast, one page, legible labels. Clearer sketches → better results.</p>
</div>
```

- [ ] **Step 3: Verify** — `npm run build` clean; page renders the guidance (Task 7 browser check).

- [ ] **Step 4: Commit**

```bash
git add components/studio/Uploader.tsx
git commit -m "feat(studio): guide users on what kind of sketch to upload"
```

---

### Task 7: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1:** `npm test` → all green.
- [ ] **Step 2:** `npm run build` → clean, all routes compile.
- [ ] **Step 3:** Live pipeline check against the real sketch through the configured provider (Claude), reusing the diagnostic pattern: downscale `Img.jpg`, call with the updated `PROMPT`, `validateIR`, `renderPage`, and assert the HTML contains `grid-template-columns`, at least one `grid-column:` placement, and non-empty headings/paragraphs. Confirm the media/chat regions land side by side.
- [ ] **Step 4:** Report before/after; hand off to the user for the browser smoke test (upload → Generate → view → export `.zip`).

---

## Notes
- Keep all new inline styles limited to the `grid-column`/`grid-row`/`--pp-cols` values computed from validated integers — no untrusted strings reach `style=`.
- If a renderer test for the old `.pp-features/.pp-gallery` grid exists, update it to the new generalized grid assertion.
