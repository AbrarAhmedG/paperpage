# PaperPage

**AI-powered "Sketch to Site" SaaS.** A user photographs a hand-drawn page sketch, uploads it, and PaperPage uses Google Gemini Vision to interpret it into a typed JSON layout, renders clean semantic HTML/CSS, and lets the user refine the page visually in a GrapesJS editor — then export a portable, self-hostable HTML/CSS `.zip`.

Tagline: **"From a napkin sketch to a live page."**

---

## Executive Summary

PaperPage turns a rough hand drawing into a real, editable web page. Flow: **upload a sketch photo → Gemini Vision → typed Layout IR → deterministic renderer → GrapesJS visual editor → HTML/CSS `.zip` export.** Accounts and saved projects are backed by Supabase (email/password auth, Postgres, Storage), all Row-Level-Security-scoped to the signed-in user.

> This supersedes the original Figma-URL-ingestion premise. The design source of truth is `docs/superpowers/specs/2026-07-14-sketch-to-site-design.md`; the implementation plan is `docs/superpowers/plans/2026-07-14-sketch-to-site.md`.

---

## Core Technology Stack

| Domain | Technology | Purpose |
|---|---|---|
| Framework | **Next.js 16.2** (App Router, Turbopack) | SSR, API routes, app structure |
| Runtime | **React 19.2** | Component layer |
| Language | **TypeScript 5.4** | `strict: false`, `strictNullChecks: true` |
| App styling | **Tailwind CSS 3.4** | The app's own UI (Aurora Glassmorphism). NOT used in generated pages. |
| DB / Auth / Storage | **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) | Postgres, email/password auth, private Storage buckets, RLS |
| AI vision | **Provider-agnostic** (`lib/gemini.ts`) | Sketch → Layout IR. Default: Groq (free, OpenAI-compatible). Optional: **Claude** via `@anthropic-ai/sdk` (`AI_PROVIDER=anthropic`, best fidelity, paid). |
| Visual editor | **GrapesJS** | WYSIWYG page builder (style/block/layer/asset/device managers) |
| Validation | **Zod** | Validates the Layout IR before rendering |
| Export | **JSZip** | Bundles HTML/CSS + images into a downloadable `.zip` |
| Image processing | **sharp** | Server-side downscale of the uploaded sketch before Gemini |
| Hosting | **Vercel** (app) + **Supabase Cloud** (DB/Storage) | Serverless edge + managed Postgres |

---

## Generation Pipeline (Approach B / B1)

The highest-value, highest-risk piece. **One-way render:** the IR generates the page once as a seed; after that, **GrapesJS owns the HTML/CSS** (no bidirectional sync) — with one critical exception: **the renderer's theme CSS never enters GrapesJS's style model.** GrapesJS re-serializes parsed CSS through browser longhands, which silently drops `var()`/`color-mix()` shorthands, `@keyframes` and `@import`. `utils/editor/css.ts` (`prepareEditorCss`) therefore splits a project's stylesheet at a `/* pp:user-styles */` marker: the base (renderer) part rides along verbatim as GrapesJS `protectedCss` (injected into the canvas and prepended to `getCss()`), wrapped in `@layer pp-base` so un-layered user rules always win the cascade, with `@import` lines hoisted above the layer. GrapesJS parses only the user-rule tail. The editor also re-applies `pp-page` to the wrapper on every load (GrapesJS strips `<body>` attributes), so exports keep the theme scope.

1. **Upload** — client sends a sketch photo to `POST /api/generate` (multipart).
2. **Store** — `sharp` downscales it (≤1600px, JPEG); saved to Storage at `sketches/{user_id}/{projectId}/original.jpg`.
3. **Interpret** — `lib/gemini.ts` calls Gemini Vision with a strict JSON `responseSchema` (mirrors the Zod schema, low temperature) → raw Layout IR. The route injects a **random curated palette preset** (`utils/ir/palettes.ts`, 12 presets; `lib/prompt.ts` `buildLayoutPrompt`) as the default palette so repeated generations vary in color — colors drawn/written on the sketch still win.
4. **Validate** — `utils/ir/schema.ts` `validateIR()` (Zod). Invalid → one automatic retry → `422`.
5. **Render** — `utils/renderer.ts` `renderPage(ir)` → `{ html, css }`. Deterministic, **safe by construction** (all text HTML-escaped, no `<script>`, no untrusted URLs — no sanitizer needed). Modern-SaaS visual system: curated inline icon set, palette-derived **mesh placeholders**, a **hardcoded curated photo allowlist** (Unsplash) for hero/gallery slots, eyebrow labels, gradient CTA panel, and a responsive grid that collapses 3→2→1. All image URLs are authored in the renderer (never model-supplied), so the no-untrusted-URLs guarantee holds.
6. **Persist** — `{ sketch_path, ir, html, css }` saved to the `projects` row; returns `{ ir, html, css }`.

### Layout IR (`utils/ir/schema.ts`)
`Page { theme{ palette{primary,secondary,background,surface,text}, fonts{heading,body}, spacing }, sections[]{ id, role, layout{columns,align}, elements[]{type,text?,level?,variant?,label?,...} } }`. Roles: nav/hero/features/gallery/cta/text/footer/testimonials/pricing/stats/contact (unknown roles salvage to `text`, never failing the page). Element types include form (field labels in `items`, submit label in `text`), quote (`text` + `label` attribution), stat (`text` value + `label` caption), table (pipe-delimited rows in `items`). Fonts come from a curated Google Fonts allowlist (unknown fonts coerce to `Inter`); palette colors are validated 6-digit hex; enums are interpolated into the prompt so they stay in sync. `utils/ir/sanity.ts` `irLooksSane()` lets `/api/generate` spend its retry on a valid-but-thin result (a thin final attempt is still accepted).

---

## Design System: "Aurora Glassmorphism" (app UI only)

- **Aurora backgrounds** — radial mint (`#2dd4bf`) + gold (`#facc15`) mesh, exposed as `bg-aurora-gradient`.
- **Frosted glass** — `bg-surface` / `bg-white/40` + `backdrop-blur-xl`; subtle `border-border` / `border-white/30`; `shadow-glass`.
- Tokens in `tailwind.config.ts`: `mint` (50/400/500), `gold` (50/400/500), `surface`, `border`, `bg-aurora-gradient`, `shadow-glass`.

> Generated pages use **plain semantic HTML + CSS** (classed `pp-*` elements, CSS custom properties), never Tailwind — this is what GrapesJS's style manager edits cleanly and what exports portably.

---

## Routes

| Path | Type | Purpose |
|---|---|---|
| `/` | Page | Marketing landing; CTA → `/signup` |
| `/login`, `/signup` | Page | Supabase email/password (custom forms) |
| `/dashboard` | Page | List / create / open / delete projects; sign out |
| `/studio/[projectId]` | Page | Two-state studio: upload sketch → GrapesJS edit |
| `/api/projects` | GET/POST | List / create projects |
| `/api/projects/[id]` | GET/PATCH/DELETE | Load / autosave (name/html/css) / delete (+ storage cleanup) |
| `/api/generate` | POST | `{projectId, image}` → store sketch, Gemini→IR→render, persist, return `{ir,html,css}` |
| `/api/assets` | GET/POST | List / upload project images (signed URLs) |

Route protection: `proxy.ts` (Next 16's rename of the `middleware` convention; exports `proxy()`) guards `/dashboard` and `/studio/*` (unauthenticated → `/login`).

---

## Data Model (Supabase Postgres — RLS-scoped to `auth.uid()`)

Migrations live in `supabase/migrations/` and are applied by the operator (Supabase SQL editor or CLI).

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id → auth.users`, `email`, `full_name`, `created_at` | Auto-created by a `handle_new_user()` signup trigger; `full_name` mirrors the auth `user_metadata.full_name` captured on the signup form |
| `projects` | `id`, `user_id`, `name`, `sketch_path`, `ir jsonb`, `html`, `css`, `created_at`, `updated_at` | `html`/`css` are the source of truth after generation; `ir` is the seed |
| `project_assets` | `id`, `project_id`, `user_id`, `storage_path`, `filename`, `created_at` | One row per uploaded image |

**Storage buckets** (private, path-prefixed by user id, owner-scoped policies):
- `sketches/{user_id}/{projectId}/…` — original uploads (has select/insert/**update**/delete policies; update is required because the route uploads with `upsert`).
- `assets/{user_id}/{projectId}/…` — user images placed in pages.

**Portable export:** on export, referenced image URLs are rewritten to relative `./assets/…` paths and the images are bundled into the `.zip`, so an exported site has **zero backend dependency**. This covers both Supabase signed URLs and the renderer's curated hero/gallery photos (an allowlist verified to send permissive CORS, so the client-side exporter can fetch and bundle them). In-editor preview uses signed URLs.

---

## Project Directory Structure

```
paperpage/
├── app/
│   ├── layout.tsx                       # root <html>/<body>, metadata
│   ├── page.tsx                         # marketing landing (CTA → /signup)
│   ├── globals.css
│   ├── login/page.tsx  signup/page.tsx  # auth pages (render AuthForm)
│   ├── dashboard/page.tsx               # server load → DashboardClient
│   ├── studio/[projectId]/page.tsx      # server load → StudioClient
│   └── api/
│       ├── projects/route.ts            # GET list, POST create
│       ├── projects/[id]/route.ts       # GET, PATCH, DELETE
│       ├── generate/route.ts            # sketch → Gemini → IR → render → persist
│       └── assets/route.ts              # GET list, POST upload
├── components/
│   ├── auth/AuthForm.tsx                # email/password form
│   ├── landing/SketchToSiteVisual.tsx   # hero before/after (sketch → rendered page), pure SVG/CSS
│   ├── dashboard/{ProjectCard,DashboardClient}.tsx
│   └── studio/{Uploader,Editor,StudioClient,ExportButton}.tsx + samples.ts (sample-sketch manifest + .test.ts)
├── lib/
│   ├── supabase/{client,server,middleware}.ts
│   └── gemini.ts                        # server-only Gemini Vision wrapper
├── utils/
│   ├── projects/name.ts                 # normalizeProjectName, deriveProjectName (auto-name from IR) (+ .test.ts)
│   ├── dates.ts                         # formatRelativeDate for dashboard cards (+ .test.ts)
│   ├── studio/progress.ts               # staged generation-wait labels (+ .test.ts)
│   ├── ir/schema.ts                     # Zod Layout IR (+ .test.ts)
│   ├── ir/palettes.ts                   # 12 curated palette presets + pickPalettePreset (+ .test.ts)
│   ├── editor/css.ts                    # protected base CSS split for GrapesJS (+ .test.ts)
│   ├── renderer.ts                      # IR → {html, css} (+ .test.ts)
│   ├── debounce.ts                      # autosave debounce (+ .test.ts)
│   └── export/bundle.ts                 # url extract/rewrite + zip (+ .test.ts)
├── proxy.ts                             # route guard (Next 16 middleware→proxy)
├── e2e/
│   ├── full-flow.spec.ts                # Playwright E2E: auth→upload→generate→edit→export standalone
│   ├── run-corpus.mts                   # sketch regression corpus runner (npm run test:corpus)
│   ├── corpus/                          # known-tricky user sketches + assertions in run-corpus.mts
│   ├── make-sketch.mjs                  # regenerates fixtures/sketch.png (synthetic hand-drawn sketch)
│   └── fixtures/sketch.png
├── public/samples/sample-*.png          # 12-sketch "Try a sample sketch" pool (random per visit)
├── scripts/make-samples.mjs             # regenerates public/samples/ (seeded, deterministic)
├── playwright.config.ts                 # E2E config (prod server on :3000, 1 worker, no retries)
├── supabase/migrations/000{1..5}_*.sql  # profiles, projects, sketches bucket, assets, profile full_name
├── vitest.config.ts                     # unit tests (@/ alias via vite-tsconfig-paths)
├── tailwind.config.ts                   # Aurora tokens
└── tsconfig.json                        # @/* path alias → ./*
```

---

## Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# Vision AI (server-side only; never reaches the browser). See .env.example.
AI_API_KEY=...               # default: Groq (free, OpenAI-compatible)
# AI_PROVIDER=anthropic      # switch to Claude (paid); then set:
# ANTHROPIC_API_KEY=sk-ant-...   AI_MODEL=claude-opus-4-8
```

No service-role key: server routes use the **user-scoped** Supabase server client (anon key + cookies) so RLS stays in force. See `.env.example`.

---

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — Next.js lint
- `npm test` — Vitest (unit tests: name, IR schema, renderer, debounce, bundle)
- `npm run test:watch` — Vitest watch mode
- `npm run test:corpus` — sketch regression corpus (`e2e/run-corpus.mts`): re-runs every known-tricky sketch in `e2e/corpus/` through the LIVE prompt + validation + renderer and asserts past fidelity fixes still hold. One vision API call per sketch per run — run on demand after prompt/renderer changes, not in CI. Add an entry whenever a user sketch exposes a bug.
- `npm run test:e2e` — Playwright full-flow E2E against the production build (`npm run build` first; starts `npm start` itself). Drives auth → new project → upload `e2e/fixtures/sketch.png` → generate (one real vision API call) → GrapesJS edit + autosave → export `.zip` → asserts the export is standalone. Uses a fixed throwaway account (`pp-e2e@example.com`, override via `E2E_EMAIL`/`E2E_PASSWORD`); requires Supabase email confirmation disabled. Test projects are deleted on completion.

---

## Conventions

- **App Router only.** Do not add files to `pages/`. API routes are `app/api/**/route.ts` exporting named verb functions.
- Client components declare `'use client'` (all `components/**` interactive files). GrapesJS is **dynamically imported, client-only** (`ssr: false`), because it's browser-only.
- **Generated pages are plain HTML/CSS (`pp-*` classes + CSS variables), not Tailwind.** The app's own UI uses Tailwind.
- **Gemini runs server-side only** (`lib/gemini.ts` starts with `import 'server-only'`); never import it into a client component.
- **RLS everywhere.** All tables/buckets are owner-scoped; server routes use the user-scoped server client as defense-in-depth. Never trust a client-supplied `user_id`.
- Generated HTML is **safe by construction** — emitted only by `utils/renderer.ts`, all text escaped, no scripts/untrusted URLs.
- Import alias `@/...` (configured via `tsconfig.json` `paths` and `vite-tsconfig-paths` for tests).
- Iframe/canvas rendering is sandboxed by GrapesJS; export bundles images to relative paths for a backend-free static site.

---

## Current Implementation Status

**Implemented (v1)**
- Email/password auth (`/login`, `/signup` with name capture → `user_metadata.full_name` + `profiles.full_name`), signup-trigger `profiles`, middleware route guards. Dashboard header shows an initials avatar + name (email fallback for pre-name accounts; `utils/user.ts`).
- Project CRUD (`/api/projects*`) + dashboard: brand header, project cards with live mini-previews (sandboxed `iframe srcdoc` of the generated page), sketch thumbnails (signed URLs) for not-yet-generated uploads, Generated/No-page-yet badges, inline rename, hover-delete with inline confirm (optimistic + revert on failure), relative timestamps, empty-state CTA. `POST /api/generate` auto-names never-renamed projects from the page's hero heading.
- Generation pipeline: IR Zod schema, deterministic renderer, server-only Gemini Vision wrapper, `POST /api/generate` (sketch → Storage → IR → render → persist, with validation + one retry).
- Studio: sketch uploader (aurora/glass upload state, example-sketch dropzone with drag-over feedback, "Try a sample sketch" one-click demo drawing from a 12-sketch pool — a random sample previews in the dropzone each visit, `components/studio/samples.ts` + `public/samples/`, regenerated by `scripts/make-samples.mjs` — staged generation progress, banner errors), GrapesJS editor with curated style/block/layer/device managers and curated Google Fonts, debounced autosave, editable project name.
- Rich sketch vocabulary: contact forms, testimonial quotes, stat rows, tables (schema + prompt + renderer), plus partner-logo strips and structural-label suppression; sketch regression corpus (`npm run test:corpus`) locks fidelity fixes against prompt drift.
- Palette variety: 12 curated presets (`utils/ir/palettes.ts`); `/api/generate` injects a random one per generation as the prompt's default palette (`buildLayoutPrompt`), so regenerating yields fresh professional color schemes while sketch-specified colors still win.
- Assets: `assets` bucket + `project_assets`, `/api/assets`, GrapesJS asset manager wired to Supabase Storage (signed URLs).
- Export: client-side `.zip` of portable HTML/CSS with images bundled to relative paths.
- Aurora Glassmorphism theme tokens.
- Full-flow Playwright E2E (`npm run test:e2e`) covering SC3/SC5 plumbing end to end.

**Phase 2 (explicitly NOT in v1)**
- **Figma export** — the stored Layout IR is designed to make this tractable later.
- **AI chat iteration** ("chat with your UI").
- **Version history** (Git-like project versions).
- Multi-page sites, teams/collaboration, OAuth/magic-link auth.

---

## Maintenance Note

**This file is the master project reference and must be kept in sync with the codebase.** When adding routes, components, tables, buckets, env vars, or dependencies — or shifting architecture — update the relevant section here in the same change. When a Phase-2 item ships, move it into "Implemented."
