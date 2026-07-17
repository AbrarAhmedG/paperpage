# Palette Variety + Sample-Sketch Pool — Design

Date: 2026-07-17 · Status: approved

## Problem

1. **Every generated page uses the same color scheme.** A pencil sketch carries no
   color signal, and the prompt only says "choose a modern vibrant palette" — vision
   models converge on the same indigo/violet nearly every time.
2. **The uploader always shows the same single sample sketch** (`public/sample-sketch.png`,
   fetched by "Try a sample sketch"; the dropzone shows one static SVG doodle).

## Decisions (user-approved)

- **Color:** curated presets with a random default per generation. The server picks one
  of ~12 hand-curated palettes at random and injects it into the prompt as the default;
  the sketch's own colors (colored ink, written color names, recognizable brand) always
  win when present. Regenerating the same sketch yields a different scheme each time.
- **Samples:** 12 synthetic hand-drawn-style sketches (same SVG→sharp technique as the
  E2E fixture), a random one per visit to the upload screen; the dropzone preview shows
  the exact sketch the "Try a sample sketch" button will use.

## Design

### 1. Palette variety

- **`utils/ir/palettes.ts`** — `PALETTE_PRESETS`: ~12 presets
  `{ name, palette: { primary, secondary, background, surface, text } }` spanning
  distinct moods (ocean, forest, sunset-coral, royal-violet, teal, ruby, citrus, rose,
  lime, espresso, navy-gold, indigo-classic). All 6-digit hex, light backgrounds,
  dark text — each must pass the existing Zod palette schema (locking test).
  `pickPalettePreset(rng = Math.random)` — RNG injectable for tests.
- **`lib/prompt.ts`** — internally becomes a template with a swappable palette rule.
  `LAYOUT_PROMPT` (the free-choice rule) stays exported and byte-stable in meaning —
  the diagnostic harness and corpus keep using it unchanged. New
  `buildLayoutPrompt(preset)` swaps in: *use EXACTLY these hexes UNLESS the sketch
  itself specifies colors — the sketch always wins.*
- **`lib/gemini.ts`** — `callGeminiVision(image, system = LAYOUT_PROMPT)`: optional
  system-prompt param threaded to both provider paths; existing callers unchanged.
- **`app/api/generate/route.ts`** — picks one random preset per request (stable across
  that request's internal retries) and passes `buildLayoutPrompt(preset)`.

### 2. Sample-sketch pool

- **`scripts/make-samples.mjs`** — run-once generator (committed, like
  `e2e/make-sketch.mjs`) drawing 12 sketches into `public/samples/sample-*.png`.
  Page types double as a vocabulary showcase: SaaS landing, portfolio gallery,
  restaurant + contact form, pricing columns + comparison table, blog grid +
  pagination, contact page, agency testimonials + partner-logo strip, startup stats
  row, travel image slider, conference schedule table + signup form, product store
  grid + search, gym features + quote.
- **`components/studio/samples.ts`** — manifest `{ file, label }[]` (locking test:
  every entry exists under `public/samples/`, files unique).
- **`components/studio/Uploader.tsx`** — chooses a random manifest entry in a mount
  `useEffect` (not in render — avoids SSR hydration mismatch). The dropzone's static
  SVG doodle is replaced by a preview `<img>` of the chosen sample; "Try a sample
  sketch" fetches that same file. `public/sample-sketch.png` is retired.

## Non-goals

- No palette picker UI / regenerate-with-new-colors button (regenerate already re-rolls).
- No per-click sample cycling (per-visit was chosen); no user-supplied sample photos.
- Fonts stay model-chosen from the existing curated allowlist.

## Verification

- Unit (TDD, red-first): preset validity vs Zod schema; `buildLayoutPrompt` embeds the
  hint hexes + override clause while `LAYOUT_PROMPT` keeps free choice; manifest files
  exist on disk.
- Visual: eyeball each generated PNG (Read as image); redraw any that look ambiguous.
- Live: 2–3 diag runs (sample sketch + palette hint) to confirm the model honors the
  injected default; zero-API Playwright probe of the uploader; one full E2E run.
- Docs: CLAUDE.md directory/structure + implemented-features updates.
