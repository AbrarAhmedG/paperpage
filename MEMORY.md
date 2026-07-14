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

## 6. Current state

- All 24 plan tasks implemented + committed; on GitHub `master` (and `feature/sketch-to-site-v1`).
  Latest commits include the Groq swap (`2a9839d`) and model config (`5294b6b`).
- Build passes, 19/19 unit tests pass.
- Groq vision call **verified working** at the API level.
- Dev server smoke test **passed** (routing, middleware, auth guards).
- **Not yet confirmed:** a full in-browser signup → create → upload → **Generate** → edit → export
  run by the user (the last live step). AI side is proven; remaining is the user driving the UI.

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
