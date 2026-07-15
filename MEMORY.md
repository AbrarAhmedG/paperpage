# PaperPage — Session Memory (2026-07-14)

A running record of what was built and decided. For the product spec see `CLAUDE.md`; for the
task-by-task build ledger see `.superpowers/sdd/progress.md`.

---

## 1. What this project is

**PaperPage v1 — "Sketch to Site."** Upload a photo of a hand-drawn page sketch → AI vision
converts it to a typed JSON layout (IR) → a deterministic renderer produces clean semantic
HTML/CSS → the user refines it in a GrapesJS visual editor → export a portable HTML/CSS `.zip`.
Accounts + saved projects via Supabase (email/password).

Spec: `docs/superpowers/specs/2026-07-14-sketch-to-site-design.md`
Plan: `docs/superpowers/plans/2026-07-14-sketch-to-site.md`

---

## 2. What we did today

1. **Planning** — turned the approved design spec into a 24-task implementation plan (TDD, bite-sized).
2. **Git** — initialized the repo (it wasn't one), added a real `.gitignore`, baseline commit.
3. **Build** — implemented all 24 tasks on branch `feature/sketch-to-site-v1`:
   - Tasks 0–13 via subagent-driven development (fresh implementer + independent reviewer per task).
   - Tasks 14–23 implemented directly (a Claude/Anthropic monthly **spend limit** was hit, which
     blocked spawning more subagents — so those were self-reviewed, still with `tsc` + tests + commits).
4. **Verification** — `npm run build` passes (all 10 routes compile); `npm test` = 19/19 unit tests pass.
5. **Deploy to GitHub** — merged branch → `master` (fast-forward), pushed both branches to
   `https://github.com/AbrarAhmedG/paperpage`. Confirmed **no secrets** were pushed (`.env.local` untracked).
6. **Live bring-up + debugging** with real accounts (Supabase, Gemini, GitHub, Groq):
   - Smoke-tested the running dev server: `/`, `/login`, `/signup` = 200; `/dashboard` = 307→/login
     (middleware guard works); `/api/projects` = 401 (auth guard works); `/api/generate` GET = 405.
   - Hit and resolved several real issues (see §5).
7. **Swapped the AI provider** from paid Gemini to **free Groq** (see §4).

---

## 3. Architecture / stack (as built)

- Next.js 16.2 (App Router, Turbopack) + React 19.2 + TypeScript (`strict:false`, `strictNullChecks:true`).
- Tailwind 3.4 for the **app UI only**. Generated pages are plain semantic HTML/CSS (`pp-*` classes).
- Supabase: Auth (email/password), Postgres, private Storage buckets — all RLS-scoped to `auth.uid()`,
  accessed via the **user-scoped** cookie server client (anon key, no service-role key).
- Vision AI: **provider-agnostic OpenAI-compatible** call in `lib/gemini.ts` (default = Groq).
- Zod validates the IR; deterministic renderer (`utils/renderer.ts`) emits safe-by-construction HTML.
- GrapesJS (dynamic import, client-only) is the editor; JSZip does the export; sharp downscales the sketch.

Key files: `lib/supabase/{client,server,middleware}.ts`, `lib/gemini.ts`, `middleware.ts`,
`utils/ir/schema.ts`, `utils/renderer.ts`, `utils/export/bundle.ts`, `utils/debounce.ts`,
`components/studio/{Uploader,Editor,StudioClient,ExportButton}.tsx`,
`app/api/{projects,projects/[id],generate,assets}/route.ts`, `supabase/migrations/000{1..4}_*.sql`.

---

## 4. AI provider: Gemini → Groq (important)

- Original code used Google Gemini (`gemini-2.5-flash`). Problems on a fresh key:
  - `gemini-2.5-flash` is **blocked for new API keys** (404 "no longer available to new users").
  - `gemini-2.0-flash` returned **quota `limit: 0`** — Google no longer grants a free tier here; it
    requires **billing**. User did not want a paid service.
- **Resolution:** rewrote `lib/gemini.ts` to call any **OpenAI-compatible** vision endpoint, defaulting
  to **Groq (free, no card)**. The prompt now describes the exact IR JSON shape (no provider-native
  schema needed); output is still Zod-validated + one retry.
- **Verified working end-to-end** against the user's Groq key with a synthetic sketch:
  HTTP 200, valid layout JSON, 5 sections (nav/hero/features/footer/text), allowed font, valid spacing.
- **Config (env vars, in `.env.local`):**
  - `AI_API_KEY` = Groq key (from https://console.groq.com/keys). **Required.**
  - `AI_BASE_URL` (default `https://api.groq.com/openai/v1`), `AI_MODEL`
    (default `meta-llama/llama-4-scout-17b-16e-instruct`, which IS available on the user's key).
  - Same code works for OpenRouter or local Ollama by changing `AI_BASE_URL`/`AI_MODEL` (see `.env.example`).

---

## 5. Issues hit and fixed today

- **tsconfig `@/*` alias missing** — the plan assumed "Next default" but Next doesn't provide it; added
  `"paths": { "@/*": ["./*"] }` (commit `ccb0ee9`). Needed for both build and Vitest.
- **Task 13 plan bugs (found in review, fixed `f477847`):** (1) the `sketches` bucket was missing an
  UPDATE storage policy while the route uploads with `upsert` → retrying a failed generation would 500;
  added the UPDATE policy. (2) `/api/generate` returned a false 200 when the persist affected 0 rows;
  now returns 404 on a no-op persist.
- **`let ir = null` / `const assets = []`** didn't typecheck under `strictNullChecks`; added minimal
  type annotations (behavior unchanged).
- **Turbopack "unexpected error"** in dev — caused by **two `next dev` servers running on the same
  folder** corrupting the `.next` cache. Fix: run only ONE dev server; clear `.next` if it recurs.
- **Stale `/studio/[id]` 404** — an old browser URL for a project not in the current account. Not a bug;
  use `/dashboard` to open/create a fresh project.
- **AI provider** — see §4.

---

## 6. Current state (updated after full E2E, 2026-07-15)

- All plan tasks implemented + committed; on GitHub `master`.
- Clean **production build passes**; **21/21 unit tests pass**.
- **Full backend E2E: 23/23 passed** against the production build (`next build && next start`), driving
  real API routes with a real Supabase session: auth+RLS, create project, **generate (sketch → Groq →
  IR → render → persist, 200, 4-section page)**, persistence, autosave (PATCH), asset upload + signed
  URL, delete cleanup. Auth, RLS, Storage, Groq, the IR schema, and the renderer are all verified working.
- **Schema resilience fix (`04c8b01`):** generation was 422ing because the free Groq model emitted
  element types outside the strict enum. `utils/ir/schema.ts` now salvages off-label element types
  (alias map + `paragraph` fallback), maps role synonyms, coerces variant/align/level/columns/spacing,
  and expands shorthand hex — while still rejecting truly-unknown roles / non-hex colors (tests intact).
- **Still UI-manual (not in the E2E):** the GrapesJS editor interactions and the client-side `.zip`
  export (browser-only). Export bundle logic is unit-tested (3/3) and the generated HTML is verified.

### ⚠️ Turbopack DEV is flaky on this machine
`next dev` (Turbopack) intermittently 404s API routes here — Next warns "**Slow filesystem detected**"
because the project is on the `E:` drive, and Turbopack's on-demand compile + cache corrupts under that.
Symptoms: routes 404 that clearly exist; "unexpected Turbopack error"; corrupted `.next/dev/types`.
Workarounds: (a) for reliable local runs use **`npm run build && npm run start`** (production mode
pre-compiles everything — this is what the passing E2E used); (b) if dev misbehaves, stop it,
`rm -rf .next`, restart; (c) ideally move the project to a fast local drive (e.g. `C:`).
Production/Vercel is unaffected — the production build compiles all routes cleanly.

---

## 7. Operational notes (read before running)

- **Run exactly ONE `npm run dev`.** Two on the same folder corrupt the Turbopack cache and split ports
  (3000 vs 3001). If it happens: kill all node/next processes on 3000/3001, then start one.
- **Restart the dev server after editing `.env.local`.** Next only reads env at startup (source-file
  changes hot-reload, but env vars do NOT).
- **Supabase setup is required.** Run `supabase/apply-all.sql` in the Supabase SQL Editor (creates the
  3 tables + 2 storage buckets + RLS + signup trigger). Turn OFF email confirmation in Supabase Auth
  (Authentication → Sign In / Providers → Email) so signup works instantly.
  - `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` currently has a trailing `/` — harmless but tidy it up.

---

## 8. Pending / to-do (not blockers to running, but before "done")

- **User to confirm the live flow** end-to-end in the browser (signup → generate → edit → autosave →
  asset upload → export `.zip` opens standalone) = spec success criteria SC1–SC6.
- **Final whole-branch code review** — was blocked by the Anthropic spend limit; run once restored.
- **Belated independent review of Tasks 14–23** (self-reviewed during the spend limit).
- **Minor findings roll-up** (in `.superpowers/sdd/progress.md`): API routes return raw
  `error.message` (info-disclosure), UPDATE RLS policies on `profiles`/`projects` lack `with check`,
  a few a11y nits, dashboard fetch error-handling gaps.
- **Housekeeping:** rename `middleware.ts` → `proxy.ts` (Next 16.2 deprecation warning);
  un-track `.claude/settings.local.json` (it got committed; no secrets, just tidier).
- **Remove the unused `@google/generative-ai` dependency** now that Groq is the provider (optional).

---

## 9. Accounts / services in play

- **GitHub:** https://github.com/AbrarAhmedG/paperpage (default branch `master`).
- **Supabase:** project `tdzlulhrredjvmfwlnpg` (email/password auth, Postgres, Storage). Keys in `.env.local`.
- **Groq:** free vision API (key in `.env.local` as `AI_API_KEY`).
- **Gemini:** created but NOT used (no free tier / requires billing).
- Secret values live ONLY in `.env.local` (gitignored) — never commit them.

---

## SESSION 2 (2026-07-15) — quality, security, editor, journey

Continued from `c87d67a`; all work committed + pushed to `origin/master` (**HEAD `b0ddebe`**, docs at `9e…`).
**40/40 unit tests, clean production build.** AI provider switched to **Claude** (`AI_PROVIDER=anthropic`,
`AI_MODEL=claude-sonnet-5`, ~1¢/sketch) via the official `@anthropic-ai/sdk` in `lib/gemini.ts`;
free Groq (OpenAI-compatible) remains the default fallback when `AI_PROVIDER` is unset.

### What shipped (22 commits, `66c42df`..`653be51`)
1. **Fidelity** — OpenAI-compatible JSON mode + prompt rework; fixed the double-encoded image
   placeholder that rendered as a **black box**.
2. **Claude provider** — real Anthropic SDK Messages API with vision (not an OpenAI shim);
   requires an Anthropic API key (console.anthropic.com — NOT a claude.ai subscription).
3. **2D-grid layout + attractive rendering** — elements carry `col/colSpan/row/rowSpan`, columns
   1–12, section `background`. Renderer groups consecutive same-column elements into stacked cells
   (**fixes overlap/"broken"**), horizontal nav bar, gradient placeholders, auto color rhythm by
   role, gradient buttons, scroll/entrance animations (`animation-timeline: view()`, reduced-motion
   safe), professional CSS. Spec+plan in `docs/superpowers/{specs,plans}/2026-07-15-*`.
4. **Detail capture** — added `tabs` and `video` element types (+ aliases); prompt now captures
   every component exhaustively and **invents labels** for unlabeled buttons/tabs/links.
5. **Alignment fix** — renderer honors `data-align` (center/end) on cells/buttons/tabs (was ignored).
6. **Editor** — categorized blocks (Layout/Content/Sections), plugins (grapesjs-blocks-basic,
   -plugin-forms, -plugin-export code-view), modern **dark theme** (`components/studio/editor-theme.css`),
   Tabs/Video blocks, undo/redo, Tablet device.
7. **Security** — API routes now return generic errors via `lib/apiError.ts` (no raw Supabase
   messages); added `WITH CHECK` to the `projects`/`profiles` UPDATE RLS policies. Migration
   `supabase/migrations/0005_rls_with_check.sql` — **APPLIED to the DB by the operator**.
8. **Auth journey** — landing is an auth-aware server component (smart "Start" → dashboard if
   logged in, else `/login` which has Sign-up); guard bounces logged-in users off `/login|/signup`
   and preserves `?next=`; richer home page (nav, how-it-works, features, footer); back-to-home on
   auth screens.
9. **Housekeeping** — `middleware.ts` → `proxy.ts` (Next 16), dropped unused `@google/generative-ai`,
   un-tracked `.claude/settings.local.json`.

### QA (this session, automated — all passed)
Route/guard matrix; landing content; **real-Claude generation output assertions** (grid, alignment,
gradient placeholder/button, animations, color rhythm, safe HTML — 12/12); **live Supabase auth+RLS**
(tenant isolation + **WITH CHECK owner-reassign blocked, error `42501`**). Two throwaway QA users
`paperpage-qa-a@example.com` / `paperpage-qa-b@example.com` were created — delete in Supabase if desired.

### NOT verified (no browser automation available)
GrapesJS editor interactions, rendered visuals (colors/animations), client-side `.zip` export standalone.

### Ops gotcha learned
Stopping a server's npm wrapper can leave the child `next` process **holding the port** → EADDRINUSE
and an **old build keeps serving** (this caused a `/dashboard`→`/login` 404 on a stale `:3000`). Free
the port with `Get-NetTCPConnection -LocalPort N -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }`,
then run ONE fresh `npm run build && npm start`. Turbopack dev stays flaky on the E: drive.
