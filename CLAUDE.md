# PaperPage

**AI-powered design-to-code SaaS platform.** Ingests Figma design links, parses node metadata, and leverages Google Gemini to generate pixel-perfect React + Tailwind code. Built for non-technical users through a visual interface, while AST-level code modifications execute securely server-side.

Tagline: **"From Figma to Code. In one breath."**

---

## Executive Summary

PaperPage bridges visual design and frontend engineering. Users paste a Figma frame URL, chat with their UI in natural language, and export production-ready React components — with Shadcn/UI support, brand-voice tone swapping, and 1-click Vercel staging deploys.

---

## Core Technology Stack

| Domain | Technology | Purpose |
|---|---|---|
| Frontend Framework | **Next.js 16.2** (App Router) | SSR, secure API routing, React app structure |
| Runtime | **React 19.2** | Component layer |
| Language | **TypeScript 5.4** | `strict: false`, `strictNullChecks: true` |
| Styling | **Tailwind CSS 3.4** + PostCSS + Autoprefixer | Utility-first, powers the Aurora Glassmorphism system |
| Database & Auth | **Supabase** (PostgreSQL) | Relational state, auth, encrypted key storage (planned) |
| AI Processing | **Google Gemini API** | Translates design layouts → structured frontend code |
| Design Ingestion | **Figma REST API** | Node tree, bounding boxes, color styles; `/v1/me` for PAT validation |
| Frontend Hosting | **Vercel** | Serverless edge for Next.js + API routes |
| Database Hosting | **Supabase Cloud** | Managed PostgreSQL with real-time listeners |

> The blueprint originally targeted Next.js 14; this repo runs on **Next.js 16.2**. All App Router patterns still apply.

---

## Design System: "Aurora Glassmorphism"

Ultra-modern, lightweight, premium aesthetic.

- **Organic Aurora Backgrounds** — radial CSS mesh gradients combining soft mint (`#2dd4bf`) and gold (`#facc15`), exposed as `bg-aurora-gradient`.
- **Frosted Glass Panels** — translucent surfaces (`bg-white/40`, `bg-surface`) + `backdrop-blur-xl` for depth.
- **Subtle Borders** — thin semi-transparent white borders (`border-white/30`, `border-border`) for glass-edge feel.
- **Shadows** — `shadow-glass`, `shadow-glass-hover` for elevated glass panels.

### Tailwind Tokens (`tailwind.config.ts`)

- `mint`: `50 #f0fdfa`, `400 #2dd4bf`, `500 #14b8a6` (primary accent)
- `gold`: `50 #fefce8`, `400 #facc15`, `500 #eab308`
- `surface`: `rgba(255,255,255,0.4)`
- `border`: `rgba(255,255,255,0.3)`
- `bg-aurora-gradient`: dual radial mint + gold mesh
- `shadow-glass`, `shadow-glass-hover`

---

## Feature Breakdown

### 1. Public Marketing Funnel — `/`
- Hero with bold value proposition over animated Aurora background.
- Feature grid (Visual Spacing Engine, AI Tone Swapper, Shadcn/UI Native) in Glassmorphic cards.
- CTA routes into `/studio`.

### 2. "Everyman" 1-Minute Integration Wizard — `IntegrationWizard.tsx`
- Deep-links to `figma.com/settings/developers` for 1-click PAT retrieval.
- Real-time validation via `/api/integrations/verify-figma` → Figma `/v1/me`.
- Secure storage: verified keys encrypted in Supabase user row (planned) — never left in browser console.

### 3. Multi-Panel Studio Canvas — `/studio`

Three-column grid `[300px_1fr_320px]`:

- **Left — Input Lounge:** `IntegrationWizard` + Figma Live URL input (drag-and-drop planned).
- **Center — Live Viewport Emulator:** isolated `<iframe>` using `srcDoc` to render generated HTML/Tailwind safely (prevents style bleed + XSS).
- **Right — Design Studio Accordion:** visual modifier panels — spacing sliders, color-wheel palette pickers — structural edits without CSS.

### 4. AI-Driven Iteration ("Chat with your UI")
- Chat bar beneath the Live Viewport.
- Contextual API captures current code state + plain-text prompt (e.g., "Make this dark mode").
- Gemini processes prompt + layout tree, rewrites targeted sections, returns updated code to the iframe.

### 5. Export Ecosystem
- **Shadcn/UI Toggle** — mutates system prompt so AI emits `shadcn/ui` primitives instead of raw HTML.
- **Tone & Copy Swapper** — extracts text nodes, translates into a brand voice (e.g., "Enterprise SaaS", "Web3"), maps back into the layout.
- **1-Click Staging Deploy** — packages raw code string, pushes to a live Vercel deployment URL via the Vercel API (`handleStagingDeployment` in `utils/exportEcosystem.ts`).

---

## Routes

| Path | Type | Purpose |
|---|---|---|
| `/` | Page | Landing / marketing page with CTA to studio |
| `/studio` | Page | 3-column workspace — inputs, live preview, chat, style sliders |
| `/api/chat` | POST | `{ prompt }` → Gemini mutation → `{ success, updatedHtml }` |
| `/api/integrations/verify-figma` | POST | `{ token }` → Figma `/v1/me` → `{ valid }` |

---

## Database Architecture (Supabase PostgreSQL — planned)

Relational schema for project history and Git-like versioning.

| Table | Purpose | Key Columns |
|---|---|---|
| `users_profiles` | User accounts + encrypted API keys | `id`, `email`, `figma_token_encrypted`, `gemini_user_key_encrypted` |
| `projects` | Top-level container per user | `id`, `user_id`, `name`, `target_framework` |
| `project_versions` | Git-like history of UI mutations | `id`, `project_id`, `version_number`, `raw_code_content`, `prompt_mutation_source` |

Row Level Security (RLS) ensures users only access their own rows.

---

## Project Directory Structure

Next.js App Router — public routes strictly separated from secure background APIs.

```
paperpage/
├── app/
│   ├── layout.tsx                          # Root <html>/<body>, suppressHydrationWarning to avoid extension crashes
│   ├── page.tsx                            # Marketing landing page
│   ├── globals.css                         # Tailwind base layers
│   ├── studio/
│   │   ├── layout.tsx                      # Studio shell (header + Deploy button)
│   │   └── page.tsx                        # Multi-panel UI editor
│   └── api/
│       ├── chat/route.ts                   # Secure Gemini AI proxy
│       └── integrations/
│           └── verify-figma/route.ts       # Proxy for Figma PAT validation
├── components/
│   └── IntegrationWizard.tsx               # Reusable key-input modal
├── utils/
│   └── exportEcosystem.ts                  # Tone swap + deployment helpers
├── pages/                                  # Empty (App Router only; do not use)
├── next.config.mjs
├── tailwind.config.ts                      # Aurora Glassmorphism tokens
├── postcss.config.mjs
├── tsconfig.json                           # `@/*` alias via Next default
└── .env.local                              # Supabase + Gemini keys
```

---

## Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
```

Replace placeholders before running against real services. In production, configure these in Vercel project settings (never commit real keys).

---

## Deployment & Hosting Infrastructure

Serverless — no manual servers (Apache/Nginx). Highly scalable, free for development.

### Frontend & API — Vercel
- GitHub-connected: every `git push` triggers compile + edge deploy.
- Native Next.js compatibility (App Router, server API routes, image optimization) — Next.js is built by Vercel.
- Served on secure HTTPS (e.g., `paperpage.vercel.app`).

### Database & State — Supabase Cloud
- Managed PostgreSQL with Row Level Security so users only see their own project rows.
- Auto-generated REST APIs consumed by Next.js server routes.
- Connection strictly via env vars set in Vercel project settings.

---

## Scripts

- `npm run dev` — start Next.js dev server
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — Next.js lint

---

## Current Implementation Status

Honest snapshot — many blueprint features are UI-only or stubbed.

**Implemented**
- Landing page with Aurora hero, feature grid, CTA to `/studio`.
- Studio 3-column shell (Input Lounge, Viewport iframe with `srcDoc`, Customizer).
- `IntegrationWizard` with real Figma `/v1/me` validation round-trip.
- `/api/chat` and `/api/integrations/verify-figma` route handlers.
- Aurora Glassmorphism theme tokens in Tailwind config.

**Stubbed / Planned**
- `app/api/chat/route.ts` — Gemini call not implemented; returns empty `updatedHtml`.
- `utils/exportEcosystem.ts` — `handleStagingDeployment` only `console.log`s and returns a hard-coded staging URL.
- Supabase — env vars declared, no client instantiated, no `users_profiles` / `projects` / `project_versions` tables created.
- Studio right-column sliders and palette swatches are visual only (no state wiring).
- Figma Frame URL input in `/studio` is not wired to the preview iframe.
- Shadcn/UI toggle, Tone & Copy Swapper — not built.
- Auth flow, key encryption, RLS policies — not built.

---

## Conventions

- App Router only. Do not add files to `pages/`.
- Client components must declare `'use client'` (see `IntegrationWizard.tsx`, `app/studio/page.tsx`).
- API routes live under `app/api/**/route.ts` and export named HTTP verb functions (`POST`, etc.).
- Import alias: `@/components/...`, `@/utils/...` (resolved via Next's default TS path handling).
- `suppressHydrationWarning` on `<body>` swallows browser-extension diffs.
- Never expose user API keys to the browser — always proxy through `/api/*` server routes.
- Iframe rendering uses `srcDoc` to sandbox generated UI from the parent app.

---

## Maintenance Note

**This file is the master project specification and must be kept in sync with the codebase.** When adding routes, components, tables, env vars, or dependencies — or shifting architecture — update the relevant section of this file in the same change. When a stub in "Current Implementation Status" ships, move it from Planned → Implemented.
