# Sketch → 2D Layout + Attractive Rendering — Design Spec

**Date:** 2026-07-15
**Status:** Approved (brainstorming) — pending implementation plan
**Supersedes for the renderer/IR:** the flat-section model in `2026-07-14-sketch-to-site-design.md`

---

## 1. Problem & Goal

Today the generation pipeline reads a sketch into a **flat vertical stack** of sections. Even when the AI correctly identifies side-by-side regions (e.g. a media player on the left and a chat box on the right), the renderer stacks everything top-to-bottom, so the output does not resemble the sketch's real 2D structure. The output is also visually plain, and empty boxes in a sketch render as empty (no visible heading/body), so a page looks unfinished.

**Goals:**
1. **Faithful 2D layout** — render side-by-side regions, spans, and grids as drawn (approach C, via explicit grid coordinates).
2. **Attractive by default** — modern palette, spacing, cards, hover states, responsive collapse.
3. **Auto-filled placeholder copy** — empty elements render as styled headings / body / buttons (lorem-ipsum), so every page looks complete.
4. **Input guidance & graceful handling** — the user may upload *any* image; guide them toward good sketches and never hard-fail on a bad one.

**Non-goal:** inventing page *content* or *sections* not in the sketch. Structure and placement come only from the drawing; styling and placeholder filler are layered on top.

---

## 2. Layout IR changes (`utils/ir/schema.ts`)

Full 2D is expressed with **explicit grid coordinates on elements**, not nested containers — equally expressive for page layouts, far more reliable for the model to produce, and trivial to validate (flat, no recursion).

### Element (new optional fields)
| Field | Type | Meaning | Salvage |
|---|---|---|---|
| `col` | int ≥ 1 | 1-indexed start column | coerce int, clamp to `[1, columns]`, else undefined |
| `colSpan` | int ≥ 1 | columns spanned (default 1) | coerce, clamp to `[1, columns]` |
| `row` | int ≥ 1 | 1-indexed start row (optional; else auto-flow) | coerce, drop if invalid |
| `rowSpan` | int ≥ 1 | rows spanned (default 1) | coerce, clamp small |

All optional. An element with **no** placement auto-flows into the grid (preserves behavior for weak models / simple sketches / old IR).

### Section
- `layout.columns`: widen from **1–4 → 1–12** (finer control for proportions like 300×100 vs 125×125). Salvage clamps `[1, 12]`, default 1.
- `background?`: new optional enum `'default' | 'surface' | 'primary' | 'gradient' | 'dark'` for visual rhythm. Salvage: unknown → `'default'`.

### Compatibility
No migration needed. The IR is a **generation seed**; existing projects render from their stored `html`/`css`. Only new generations and unit tests exercise the new fields. Old flat IR (no `col`/`row`) auto-flows and renders as before.

---

## 3. Renderer changes (`utils/renderer.ts`)

### Grid placement
- A section renders as CSS grid: `display: grid; grid-template-columns: repeat(<columns>, 1fr); gap: …`.
- Each element with placement gets an inline `grid-column: <col> / span <colSpan>` (and `grid-row` when `row`/`rowSpan` present). Unplaced elements auto-flow.
- **Responsive:** `@media (max-width: 768px)` collapses every section to a single column (`grid-template-columns: 1fr`) so pages are mobile-usable.
- `columns == 1` keeps today's simple stacked output.

### Modern, attractive styling (generated CSS)
- Modern type scale + line-height; generous section padding driven by `spacing`.
- Image/media and grid cells styled as **cards**: `border-radius`, soft `box-shadow`, `object-fit: cover`.
- Buttons get hover/active states; primary/secondary/ghost variants refreshed.
- Section `background` variants map to CSS: `surface` (tinted), `primary` (brand tint), `gradient` (hero-style mesh), `dark` (inverted text). Applied via `.pp-bg-<variant>`.
- Modernized default palettes (see §5).

### Placeholder auto-fill (deterministic, renderer-side)
When an element has **no** sketch text, the renderer fills neutral placeholder copy so the element is visible and styled:
| Element | Placeholder |
|---|---|
| `heading` (lvl 1) | e.g. "Your Headline Goes Here" |
| `heading` (lvl 2–4) | short section title placeholder |
| `paragraph` | 1–2 lorem-ipsum sentences |
| `list` (no items) | 3 lorem list items |
| `button` | "Learn More" |
| `input` | existing placeholder behavior |

Filler lives in the renderer (deterministic, safe-by-construction, still HTML-escaped), **not** in the model — the model transcribes real labels and leaves the rest empty; the renderer makes the page look complete. This deliberately separates *honest transcription* from *visual completeness*.

---

## 4. Prompt changes (`lib/gemini.ts`)

Instruct the model to:
- **Place elements on a grid**: set `layout.columns` and each element's `col` / `colSpan` / `row` to match the drawing's 2D arrangement. Columns are **1-indexed** (`col: 1` = leftmost), matching CSS grid so the renderer passes values straight through. Side-by-side → different columns; wide banners → `colSpan`.
- **Transcribe, don't invent**: use labels that are drawn; leave `text` empty when the sketch has none (the renderer fills placeholders) — keeps the anti-hallucination guarantee.
- **Choose a modern, attractive palette** (still validated 6-digit hex) and set section `background` for rhythm (e.g. hero `gradient`, alternating `surface`).

Applies to both provider paths (the prompt is shared); JSON-mode (OpenAI-compat) and Claude both consume it.

---

## 5. Palette & visual defaults

- Refresh the built-in `CURATED_PALETTES` toward modern, attractive schemes (e.g. indigo/violet, teal/slate, warm neutral) used as fallbacks and salvage defaults.
- The emitted CSS ships sensible modern defaults so even a minimal IR looks polished.

---

## 6. Input scope & user guidance (the "any sketch" concern)

**Decision: guide + fail gracefully — do NOT hard-restrict.** We cannot reliably detect arbitrary image content client-side, and hard blocking frustrates users. Instead:

### In-product guidance (`components/studio/Uploader.tsx`)
- Clear instructions on the upload surface: *"Upload a photo or scan of a hand-drawn **web-page layout** — boxes for sections, lines for text, labels like 'nav', 'hero', 'AD', 'footer'."*
- A short **tips** line: good lighting, high contrast, one page, keep labels legible.
- Optional example thumbnail(s) of a good sketch.
- Keep existing constraints: image types + size (sharp downscale already enforced server-side).

### Graceful model handling
- The pipeline **always returns a valid, editable page**. The prompt instructs: if the image is clearly **not** a web-page layout, return the closest reasonable **single starter section** (a hero + a paragraph) rather than erroring or hallucinating a full site.
- No new hard error path. A weird upload yields a minimal editable page the user can build on, plus a non-blocking hint in the studio (e.g. *"This didn't look like a page sketch — here's a starter layout to edit."*). Detecting "starter/fallback" can be as simple as the model returning a single generic section; the UI hint is best-effort and optional for v1.

**Rationale:** maximizes success for real sketches, degrades softly for everything else, and sets expectations up front instead of policing uploads.

---

## 7. Testing (TDD)

**Schema (`utils/ir/schema.test.ts`):**
- `col`/`colSpan`/`row`/`rowSpan` coerced from strings, clamped to range, invalid → dropped.
- `layout.columns` accepts up to 12; clamps out-of-range.
- `background` accepts known values; unknown → `'default'`.
- Existing role/element/hex/font salvage tests remain green.

**Renderer (`utils/renderer.test.ts`):**
- Emits `grid-template-columns: repeat(N, 1fr)` for a multi-column section.
- An element with `col`/`colSpan` emits `grid-column: <col> / span <colSpan>`.
- Empty `heading`/`paragraph`/`list`/`button` render placeholder text (non-empty, escaped).
- Responsive `@media (max-width: 768px)` present.
- Section `background` variant emits its class.
- Existing tests stay green: HTML escaping / no `<script>`, placeholder-image not double-encoded (black-box regression), data-region per section, palette CSS vars, fonts imported.

---

## 8. Out of scope (YAGNI for this iteration)

- Nested container recursion (grid coordinates cover page layouts without it).
- Server-side image-content classification / hard upload rejection.
- Multi-page sites, template themes, per-element typography overrides.
- Migrating/regenerating existing projects (they own their stored HTML/CSS).

---

## 9. Success criteria

1. The radio-station sketch renders with the media player and chat box **side by side**, ads in a grid, footer row — recognizably matching the drawing.
2. Empty boxes render as **styled headings/body/buttons** with placeholder copy; no empty regions.
3. The page looks **modern and attractive** (palette, cards, spacing, hover) and **collapses cleanly on mobile**.
4. A non-page-layout upload yields a **minimal editable starter page**, never a hard error, with upload guidance shown before the fact.
5. `npm test` green (new + existing); `npm run build` clean; generated HTML remains safe-by-construction.
