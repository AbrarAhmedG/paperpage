# PaperPage v1 — "Sketch to Site" Design Spec

**Date:** 2026-07-14
**Status:** Approved design → ready for implementation planning
**Supersedes:** The Figma-URL-ingestion premise in `CLAUDE.md` (to be rewritten during implementation).

---

## 1. Product Vision

**Sketch to Site.** A user hand-draws a rough page layout (pen/pencil on paper) with their ideas, photographs it, and uploads the image. The app interprets the sketch with AI vision and produces a real, editable web page. The user refines it in a visual WYSIWYG page builder — colors, fonts, sections, real images — then exports production HTML/CSS they can host anywhere.

Tagline direction: *"From a napkin sketch to a live page."*

**In scope for v1:**
- Email/password accounts with saved, persistent projects
- Sketch photo upload → AI-generated editable page
- Visual refinement in a GrapesJS-based editor (color, font, spacing, sections)
- Replacing image placeholders with the user's own uploaded images
- Export as a portable, self-hostable HTML/CSS `.zip`

**Explicitly out of v1 (future sub-projects):**
- Figma export (phase 2 — the structured IR below makes this tractable)
- AI chat iteration ("chat with your UI")
- Version history / Git-like project versions
- Multi-page sites
- Teams / collaboration
- OAuth / magic-link auth

---

## 2. Key Decisions (with rationale)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **AI vision** interprets the sketch (Gemini Vision), one-shot — **no chat** | Highest interpretation quality; "no chat" preserved (analysis only, not conversation) |
| D2 | **GrapesJS** as the WYSIWYG editor | Mature drag-and-drop page builder; native style manager (color/font/spacing) and native HTML/CSS export match the exact feature list |
| D3 | Generated pages are **plain semantic HTML + CSS**, not Tailwind | GrapesJS's style manager edits CSS properties on elements; plain HTML/CSS is what its panels operate on cleanly. (The app's own UI still uses Tailwind.) |
| D4 | **Accounts + saved projects in v1** (Supabase Auth + Postgres) | Product requirement — persistence from day one |
| D5 | **HTML/CSS export in v1; Figma export = phase 2** | HTML/CSS export is near-free with GrapesJS; Figma export is the hardest single piece and is de-risked by shipping later |
| D6 | Generation uses **Approach B — structured JSON IR → deterministic renderer** | Rigidly consistent, section-structured output; HTML is safe by construction; the IR also makes phase-2 Figma export far easier |
| D7 | **B1 — one-way render.** IR generates the page once; GrapesJS then owns the HTML/CSS. IR stored as seed, not bidirectionally synced | Avoids the editor-sync trap; low risk |
| D8 | **In-editor image upload included in v1** (GrapesJS asset manager → Supabase Storage) | Makes exported sites genuinely usable |
| D9 | **Email/password auth only** in v1 | Zero external config; fastest path |
| D10 | Remove the old Figma-PAT `IntegrationWizard` and Figma-ingestion routes | No longer part of the product |

---

## 3. Architecture

Reuses the existing **Next.js 16 App Router + Supabase + Gemini** stack.

```
┌─────────────── Browser (Next.js client) ───────────────┐
│  Auth pages  │  Dashboard (my projects)  │  Studio       │
│                                          │  ├ Uploader   │
│                                          │  ├ GrapesJS   │
│                                          │  └ Export     │
└──────┬───────────────────┬───────────────────┬──────────┘
       │                   │                   │
   Supabase Auth      /api/generate        /api/projects
   (SSR client)       (server, Gemini)     (server, CRUD)
       │                   │                   │
       ▼                   ▼                   ▼
  Supabase Auth      Gemini Vision API    Supabase Postgres
                     (GEMINI_API_KEY)      + Storage (images)
                                           + Row Level Security
```

**Core data flow:**
1. User uploads a sketch image → stored in **Supabase Storage** (`sketches/{user_id}/…`).
2. Client calls **`POST /api/generate`** with the image → server calls **Gemini Vision** with a strict `responseSchema` → returns a typed **Layout IR**.
3. Server validates the IR (Zod), runs the **deterministic renderer** → `{ html, css }`, persists `{ ir, html, css }` to the project.
4. `{ html, css }` loads into **GrapesJS**; the user edits visually.
5. Debounced autosave → **`PATCH /api/projects/[id]`** persists current GrapesJS HTML/CSS (RLS-scoped to the user).
6. Export → GrapesJS emits final HTML/CSS → images bundled → **downloadable `.zip`**.

**Security posture:**
- Gemini runs **server-side only** (`GEMINI_API_KEY`); the key never reaches the browser.
- All DB tables and Storage buckets are **RLS-scoped to `auth.uid()`**; server routes use the **user-scoped** Supabase server client so RLS applies as defense-in-depth.
- Generated HTML is **safe by construction** (emitted by our renderer, never raw model HTML) — no `<script>`, no untrusted URLs.

---

## 4. Generation Pipeline (Approach B / B1)

**Endpoint:** `POST /api/generate` — body `{ projectId, image }`.

1. Store the uploaded image to Supabase Storage.
2. Call Gemini Vision with a strict **`responseSchema`** (JSON mode, low temperature) → typed **Layout IR**.
3. **Validate** the IR against a Zod schema. Invalid → one automatic retry → structured error.
4. Run the deterministic renderer: `renderPage(ir) → { html, css }`.
5. Persist `{ ir, html, css }` to the project row; return `{ ir, html, css }`.

### 4.1 Layout IR schema

```
Page {
  theme: {
    palette: { primary, secondary, background, surface, text },
    fonts:   { heading, body },        // from a curated Google Fonts set
    spacing: "compact" | "normal" | "roomy"
  },
  sections: Section[]                  // ordered
}

Section {
  id,
  role: "nav" | "hero" | "features" | "gallery" | "cta" | "text" | "footer" | ...,
  layout: { columns: 1..4, align },
  elements: Element[]
}

Element {
  type: "heading" | "paragraph" | "button" | "image" | "list" | "input" | "logo" | "divider",
  text?, level? (h1..h4), variant?, ...
}
```

Gemini infers section **roles** from the sketch, fills legible text, inserts readable placeholder copy where handwriting is unclear, and selects a clean palette + font pairing from the curated set.

### 4.2 Renderer (`utils/renderer.ts`)

Deterministic TypeScript module:
- One template per section role + element type → clean semantic HTML (`<section data-region="…">`, classed elements GrapesJS can style).
- `theme` → CSS custom properties (`:root { --color-primary: … }`) + a curated **Google Fonts** `<link>`.
- Emits only safe markup — no scripts, no untrusted URLs — so no HTML sanitization step is needed.

### 4.3 Source-of-truth model (B1)

After generation, **GrapesJS's HTML/CSS is authoritative.** The IR is stored as an immutable generation seed (useful for re-rendering and phase-2 Figma export) but is **not** bidirectionally synced with manual edits.

### 4.4 Guardrails

- **Zod validation** of the IR (deterministic reject + one retry).
- **Image limits:** accept jpg/png/webp/heic, max ~10 MB; **server-side downscale** (sharp) before sending to Gemini to cut latency/cost.
- **Latency/UX:** generation ~5–20s → explicit loading state, ~30s timeout, one retry, structured error messages.

---

## 5. Studio & Editor

The old 3-column `/studio` shell is replaced by a focused two-state studio at `/studio/[projectId]`. GrapesJS is client-only and **dynamically imported** (no SSR).

### 5.1 Upload state (no page generated yet)
- Drag-and-drop zone + file picker for the sketch photo.
- Thumbnail preview of the chosen sketch.
- **Generate** button → `POST /api/generate` → loading state → transitions to Edit state on success.
- Error state with retry.

### 5.2 Edit state (GrapesJS)
- **Top bar:** editable project name · autosave status ("Saving…/Saved ✓") · **Export** button · back to dashboard.
- **Canvas:** the rendered page, live-editable.
- **Layer manager:** section tree (our `data-region` sections show as named, reorderable blocks).
- **Style manager (core refine UX):** curated sectors for non-technical users —
  - Typography: font-family (curated Google Fonts dropdown), size, weight, line-height, color
  - Background: color/surface
  - Spacing: padding/margin sliders
  - Border/radius (light)
  - Developer-oriented default sectors are hidden.
- **Block manager:** curated palette of section/element blocks (hero, features, CTA, button, heading, …) matching the IR roles, so users can *add* sections.
- **Asset manager:** wired to Supabase Storage so users upload/replace real images (see §6.3).
- **Device manager:** desktop-first with a mobile-preview toggle (editing stays desktop-first in v1).

### 5.3 Configuration & persistence
- Init GrapesJS with `{ components: html, style: css }` from `/api/generate`.
- **Built-in remote storage disabled** — persistence is owned by the app.
- Curated **font list** injected into the canvas so picks render identically in-editor and on export.
- **Autosave:** debounced GrapesJS change listener → `PATCH /api/projects/[id]`.

---

## 6. Data Model, Auth & Persistence (Supabase)

### 6.1 Client setup (new — none exists today)
`@supabase/supabase-js` + `@supabase/ssr`, with:
- `lib/supabase/client.ts` — browser client
- `lib/supabase/server.ts` — cookie-based server client (user-scoped, so RLS applies)

### 6.2 Tables (all RLS-scoped to `auth.uid()`)
```
profiles        id (→ auth.users), email, created_at
projects        id, user_id, name,
                sketch_path,            -- Storage path to original sketch
                ir      jsonb,          -- Layout IR seed
                html    text,           -- current GrapesJS HTML (source of truth)
                css     text,           -- current GrapesJS CSS
                created_at, updated_at
project_assets  id, project_id, user_id, storage_path, filename, created_at
```
No version history in v1 (single current state); versioning is a clean phase-2 add.

### 6.3 Storage buckets (private, path-prefixed by user id, RLS policies)
- `sketches/{user_id}/…` — original uploads
- `assets/{user_id}/{project_id}/…` — user images placed in pages

**Portable export:** self-hosted exports must not depend on Supabase, so on export the referenced images are **bundled into the `.zip`** and their URLs rewritten to **relative paths** (`./assets/…`). In-editor preview uses **signed URLs**. An exported site therefore works anywhere with zero backend dependency.

### 6.4 API routes (App Router, server, auth-required)
| Route | Purpose |
|-------|---------|
| `POST /api/projects` | Create project → returns id |
| `GET /api/projects` | List current user's projects |
| `GET /api/projects/[id]` | Load project into studio |
| `PATCH /api/projects/[id]` | Autosave name / html / css |
| `DELETE /api/projects/[id]` | Delete project (+ its storage) |
| `POST /api/generate` | `{projectId, image}` → store sketch, Gemini→IR→render, save, return `{ir,html,css}` |
| `POST /api/assets` | Upload user image → Storage → return signed URL |
| `GET /api/assets?projectId=` | List project assets |

### 6.5 App routes & protection
- `/login`, `/signup` — Supabase email/password (custom forms).
- `/dashboard` — list/create/open/delete projects.
- `/studio/[projectId]` — the editor (upload → edit states).
- **Middleware** guards `/dashboard` and `/studio/*`; unauthenticated → `/login`.
- `/` marketing page stays; CTA now routes to `/signup`.

---

## 7. Build Order (backbone for the implementation plan)

1. **Foundation** — Supabase client (`lib/supabase/*`), email/password auth, middleware guards, `profiles` + RLS, `/login` + `/signup`, dashboard skeleton.
2. **Project CRUD** — `projects` table + RLS, `/api/projects*`, dashboard list/create/delete.
3. **Generation core (highest risk — spike first)** — IR Zod schema, `renderer.ts`, `/api/generate` (Gemini Vision structured output + sketch → Storage). Prove `sketch → IR → clean HTML/CSS` in isolation before wiring UI.
4. **Studio editor** — GrapesJS wrapper (dynamic import), upload state, edit state, curated panels/fonts, debounced autosave.
5. **Assets** — `assets` bucket + `project_assets`, `/api/assets`, GrapesJS asset manager wiring.
6. **Export** — GrapesJS HTML/CSS → bundle referenced images → `.zip` download (client-side, JSZip).
7. **Cleanup** — remove old Figma wizard/dead code, rewrite `CLAUDE.md`.

---

## 8. File Structure (new / changed)

```
app/
  page.tsx                      # marketing, CTA → /signup
  login/page.tsx  signup/page.tsx
  dashboard/page.tsx
  studio/[projectId]/page.tsx   # replaces old 3-col studio
  api/
    projects/route.ts           # GET list, POST create
    projects/[id]/route.ts      # GET, PATCH, DELETE
    generate/route.ts
    assets/route.ts
  middleware.ts
components/
  auth/AuthForm.tsx
  dashboard/ProjectCard.tsx
  studio/{Uploader,Editor,ExportButton}.tsx
lib/
  supabase/{client,server}.ts
  gemini.ts
utils/
  ir/schema.ts                  # Zod IR schema
  renderer.ts                   # IR → {html, css}
  export/bundle.ts              # zip + image bundling

REMOVE:
  components/IntegrationWizard.tsx
  app/api/integrations/**
  app/studio/{layout,page}.tsx  (old 3-column shell)
  utils/exportEcosystem.ts
```

---

## 9. Dependencies & Environment

**New dependencies:**
- `@supabase/supabase-js`, `@supabase/ssr`
- `@google/generative-ai` (Gemini Vision, structured output via `responseSchema`)
- `grapesjs`
- `zod`
- `jszip`
- `sharp` (server-side image downscale)

**Environment variables** (already declared in `.env.local`, sufficient as-is):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

No service-role key required — the user-scoped server client (anon key + cookies) keeps RLS in force.

---

## 10. Success Criteria (v1 done when…)

1. A new user can sign up with email/password and land on an empty dashboard.
2. They create a project, upload a photo of a hand-drawn sketch, and within ~30s see a coherent, section-structured page rendered in the editor.
3. They can change colors, fonts, and spacing, reorder/add sections, and replace image placeholders with their own uploaded images — all visually.
4. Edits autosave and survive a page refresh / re-login.
5. They export a `.zip` of portable HTML/CSS (with bundled images) that opens correctly as a static site with no Supabase dependency.
6. The old Figma-ingestion code paths are removed and `CLAUDE.md` reflects the new product.

---

## 11. Phase 2 & Beyond (not in v1)

- **Figma export** — leverage the stored Layout IR to build a Figma file/plugin pipeline.
- **AI chat iteration** — "chat with your UI" edits.
- **Version history** — `project_versions` table, Git-like restore.
- **Real image upload polish, multi-page sites, teams, OAuth/magic-link auth.**
