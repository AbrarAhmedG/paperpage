# PaperPage v1 "Sketch to Site" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship PaperPage v1 — upload a hand-drawn sketch photo → Gemini Vision → typed JSON Layout IR → deterministic HTML/CSS renderer → GrapesJS visual editor → portable HTML/CSS `.zip` export, with Supabase email/password accounts and saved projects.

**Architecture:** Next.js 16 App Router + React 19 + TypeScript. Gemini Vision runs server-side only and returns a Zod-validated Layout IR; a deterministic TypeScript renderer converts the IR to safe-by-construction semantic HTML/CSS (Approach B/B1 — the IR seeds the page once, then GrapesJS owns the HTML/CSS). Supabase provides Auth, Postgres, and Storage, all RLS-scoped to `auth.uid()` via a user-scoped cookie-based server client. Export bundles referenced images and rewrites their URLs to relative paths so the exported site has zero backend dependency.

**Tech Stack:** Next.js 16.2, React 19.2, TypeScript 5.4 (`strict: false`, `strictNullChecks: true`), Tailwind 3.4 (app UI only — generated pages are plain HTML/CSS), Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Google Gemini (`@google/generative-ai`), GrapesJS, Zod, JSZip, sharp. Vitest for unit tests.

## Global Constraints

- **Approach B/B1:** IR generates the page once; GrapesJS then owns the HTML/CSS. Store the IR as an immutable seed — **no bidirectional sync**.
- **Gemini server-side only.** `GEMINI_API_KEY` never reaches the browser. Only `/api/generate` (and `lib/gemini.ts`) may import the Gemini SDK.
- **Generated HTML is safe by construction** — emitted only by our renderer, never raw model HTML. No `<script>`, no untrusted URLs. No HTML sanitizer needed.
- **RLS everywhere.** All DB tables and Storage buckets are RLS-scoped to `auth.uid()`. Server routes use the **user-scoped** Supabase server client (anon key + cookies), never a service-role key.
- **Generated pages are plain semantic HTML + CSS**, NOT Tailwind. The app's own UI uses Tailwind. GrapesJS-friendly: `<section data-region="…">`, classed elements.
- **v1 scope only.** HTML/CSS export only. Do NOT build: Figma export, AI chat, version history, multi-page, teams, OAuth/magic-link. These are phase 2.
- **App Router only.** Do not add files to `pages/`. API routes are `app/api/**/route.ts` exporting named verb functions. Client components declare `'use client'`.
- **Import alias:** `@/lib/...`, `@/utils/...`, `@/components/...` (Next default TS path handling).
- **Image limits:** accept jpg/png/webp/heic, max ~10 MB; server-side downscale with sharp before sending to Gemini.
- **Palette/fonts** come from a curated set (see Task 10). Fonts are a curated Google Fonts list, injected identically in-editor and on export.
- **TypeScript config is already `strict: false` / `strictNullChecks: true`** — match existing code style. Do not enable full strict mode.

---

## File Structure

**Created:**
- `vitest.config.ts` — Vitest config (node environment, `@/` alias).
- `lib/supabase/client.ts` — browser Supabase client.
- `lib/supabase/server.ts` — cookie-based server Supabase client (user-scoped).
- `lib/supabase/middleware.ts` — session-refresh helper for middleware.
- `lib/gemini.ts` — server-only Gemini Vision wrapper.
- `middleware.ts` — route guard for `/dashboard` and `/studio/*`.
- `utils/ir/schema.ts` — Zod Layout IR schema + inferred types + curated palettes/fonts.
- `utils/renderer.ts` — deterministic `renderPage(ir) → { html, css }`.
- `utils/export/bundle.ts` — asset-URL extraction/rewrite + `.zip` builder.
- `app/login/page.tsx`, `app/signup/page.tsx` — auth pages.
- `app/dashboard/page.tsx` — project list/create/delete.
- `app/studio/[projectId]/page.tsx` — editor (upload → edit states).
- `app/api/projects/route.ts` — GET list, POST create.
- `app/api/projects/[id]/route.ts` — GET, PATCH, DELETE.
- `app/api/generate/route.ts` — sketch → Gemini → IR → render → persist.
- `app/api/assets/route.ts` — POST upload image, GET list.
- `components/auth/AuthForm.tsx` — shared email/password form.
- `components/dashboard/ProjectCard.tsx` — one project tile.
- `components/studio/Uploader.tsx` — sketch upload state.
- `components/studio/Editor.tsx` — GrapesJS wrapper (dynamic import, client-only).
- `components/studio/ExportButton.tsx` — triggers zip export.
- `supabase/migrations/0001_profiles.sql` … `0004_storage.sql` — schema + RLS.
- `.env.example` — documents required env vars.

**Modified:**
- `package.json` — add dependencies + `test` script.
- `app/page.tsx` — retarget CTA `/studio` → `/signup`, update marketing copy.
- `app/layout.tsx` — update metadata copy.
- `CLAUDE.md` — rewritten to the new product (final task).

**Removed:**
- `components/IntegrationWizard.tsx`
- `app/api/integrations/**` (and `app/api/chat/route.ts`)
- `app/studio/layout.tsx`, `app/studio/page.tsx` (old 3-column shell)
- `utils/exportEcosystem.ts`

---

## Phase 0 — Repo & Tooling Setup

### Task 0: Dependencies, Vitest, env template

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `.env.example`

**Interfaces:**
- Produces: `npm test` script (Vitest run mode), `@/` alias resolvable in tests, all runtime deps installed.

- [ ] **Step 1: Install runtime dependencies**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr @google/generative-ai grapesjs zod jszip sharp
```
Expected: packages added to `dependencies`, no peer-dep errors that block install.

- [ ] **Step 2: Install dev dependencies (Vitest)**

Run:
```bash
npm install -D vitest vite-tsconfig-paths @vitejs/plugin-react jsdom
```
Expected: added to `devDependencies`.

- [ ] **Step 3: Add the `test` script**

In `package.json` `scripts`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
  },
});
```

- [ ] **Step 5: Create `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-key
```

- [ ] **Step 6: Sanity test that Vitest + alias work**

Create `vitest.sanity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('tooling', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```
Run: `npm test`
Expected: PASS (1 test). Then delete `vitest.sanity.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts .env.example .gitignore
git commit -m "chore: add v1 dependencies, vitest, env template"
```

---

## Phase 1 — Foundation (Auth)

### Task 1: Supabase clients

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

**Interfaces:**
- Produces:
  - `createClient(): SupabaseClient` (browser) from `@/lib/supabase/client`
  - `async createClient(): Promise<SupabaseClient>` (server, reads cookies) from `@/lib/supabase/server`

> Note: These wrap network/cookie state, so they are verified by usage in later tasks rather than unit-tested in isolation. TDD resumes at Task 6 (pure logic) and Task 10 (renderer/schema). Steps here are create + typecheck + commit.

- [ ] **Step 1: Browser client — `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Server client — `lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware refreshes the session.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from these two files.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts
git commit -m "feat: add Supabase browser and server clients"
```

### Task 2: Middleware session refresh + route guard

**Files:**
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`

**Interfaces:**
- Consumes: env vars from Task 0.
- Produces: `async updateSession(request: NextRequest): Promise<NextResponse>` from `@/lib/supabase/middleware`. Unauthenticated requests to `/dashboard` or `/studio/*` redirect to `/login`.

- [ ] **Step 1: `lib/supabase/middleware.ts`**

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/dashboard', '/studio'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + '/'));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}
```

- [ ] **Step 2: `middleware.ts`**

```ts
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification (dev server)**

Run: `npm run dev`, then in a browser visit `http://localhost:3000/dashboard` while logged out.
Expected: redirected to `/login`. (This route exists after Task 4; until then, expect a redirect to `/login` which 404s — acceptable at this step.)

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/middleware.ts middleware.ts
git commit -m "feat: add auth middleware guarding /dashboard and /studio"
```

### Task 3: `profiles` table + RLS + auto-insert trigger

**Files:**
- Create: `supabase/migrations/0001_profiles.sql`

**Interfaces:**
- Produces: `profiles(id uuid pk → auth.users, email text, created_at timestamptz)` with RLS; a trigger inserts a profile row on new-user signup.

> Migrations are applied by the operator in the Supabase SQL editor (or `supabase db push`). "Test" = run the SQL and confirm no error + policies exist.

- [ ] **Step 1: Write `supabase/migrations/0001_profiles.sql`**

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Apply and verify**

In the Supabase SQL editor, run the file contents.
Expected: no error. Verify in Table editor that `profiles` exists with RLS enabled and two policies.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_profiles.sql
git commit -m "feat: add profiles table with RLS and signup trigger"
```

### Task 4: Auth form + `/login` + `/signup`

**Files:**
- Create: `components/auth/AuthForm.tsx`
- Create: `app/login/page.tsx`
- Create: `app/signup/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/client`.
- Produces: `<AuthForm mode="login" | "signup" />`. On success, `router.push('/dashboard')`.

> UI + auth network flow — verified manually against Supabase. No unit test.

- [ ] **Step 1: `components/auth/AuthForm.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const fn = isSignup
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error } = await fn;
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="relative min-h-screen bg-slate-50 overflow-hidden text-slate-800 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-aurora-gradient z-0 pointer-events-none" />
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-md p-8 rounded-2xl bg-surface backdrop-blur-xl border border-border shadow-glass"
      >
        <h1 className="text-3xl font-extrabold mb-6">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-xl bg-white/70 border border-border outline-none focus:ring-2 focus:ring-mint-400"
        />
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-4 py-3 rounded-xl bg-white/70 border border-border outline-none focus:ring-2 focus:ring-mint-400"
        />
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          {loading ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}
        </button>
        <p className="text-sm text-slate-500 mt-4 text-center">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <Link href={isSignup ? '/login' : '/signup'} className="text-mint-500 font-medium">
            {isSignup ? 'Log in' : 'Sign up'}
          </Link>
        </p>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: `app/login/page.tsx`**

```tsx
import AuthForm from '@/components/auth/AuthForm';

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
```

- [ ] **Step 3: `app/signup/page.tsx`**

```tsx
import AuthForm from '@/components/auth/AuthForm';

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
```

- [ ] **Step 4: Manual verification**

With real Supabase env vars set and email confirmation disabled (or auto-confirm) in Supabase Auth settings, run `npm run dev`, visit `/signup`, create an account.
Expected: redirected to `/dashboard` (which 404s until Task 5 — acceptable). Confirm a row appears in `auth.users` and `profiles`.

- [ ] **Step 5: Commit**

```bash
git add components/auth/AuthForm.tsx app/login/page.tsx app/signup/page.tsx
git commit -m "feat: add email/password login and signup"
```

### Task 5: Dashboard skeleton + sign-out

**Files:**
- Create: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: server `createClient()`.
- Produces: a server component that reads the current user and renders a shell with a sign-out affordance. (Project list arrives in Task 9.)

- [ ] **Step 1: `app/dashboard/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-800">
      <div className="absolute inset-0 bg-aurora-gradient z-0 pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <header className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-extrabold">Your projects</h1>
          <span className="text-sm text-slate-500">{user.email}</span>
        </header>
        <p className="text-slate-500">No projects yet.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Manual verification**

Log in, land on `/dashboard`, see your email and "No projects yet."
Expected: renders; logging out (via a later control) or clearing cookies bounces you to `/login`.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add dashboard skeleton"
```

---

## Phase 2 — Project CRUD

### Task 6: `projects` table + RLS, and a URL-safe name helper (TDD)

**Files:**
- Create: `supabase/migrations/0002_projects.sql`
- Create: `utils/projects/name.ts`
- Test: `utils/projects/name.test.ts`

**Interfaces:**
- Produces:
  - `projects(id uuid pk, user_id uuid → auth.users, name text, sketch_path text, ir jsonb, html text, css text, created_at, updated_at)` with owner-scoped RLS.
  - `normalizeProjectName(raw: string): string` — trims, collapses whitespace, falls back to `"Untitled project"` when empty, caps at 80 chars.

- [ ] **Step 1: Write the failing test — `utils/projects/name.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeProjectName } from './name';

describe('normalizeProjectName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeProjectName('  My   Site  ')).toBe('My Site');
  });
  it('falls back for empty input', () => {
    expect(normalizeProjectName('   ')).toBe('Untitled project');
  });
  it('caps length at 80 chars', () => {
    expect(normalizeProjectName('a'.repeat(200)).length).toBe(80);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- name.test.ts`
Expected: FAIL — cannot find module `./name`.

- [ ] **Step 3: Implement — `utils/projects/name.ts`**

```ts
export function normalizeProjectName(raw: string): string {
  const cleaned = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Untitled project';
  return cleaned.slice(0, 80);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- name.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write `supabase/migrations/0002_projects.sql`**

```sql
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled project',
  sketch_path text,
  ir jsonb,
  html text,
  css text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Projects selectable by owner"
  on public.projects for select using (auth.uid() = user_id);
create policy "Projects insertable by owner"
  on public.projects for insert with check (auth.uid() = user_id);
create policy "Projects updatable by owner"
  on public.projects for update using (auth.uid() = user_id);
create policy "Projects deletable by owner"
  on public.projects for delete using (auth.uid() = user_id);

create index if not exists projects_user_id_idx on public.projects(user_id);
```

- [ ] **Step 6: Apply the migration in Supabase SQL editor**

Expected: no error; `projects` visible with 4 policies and RLS enabled.

- [ ] **Step 7: Commit**

```bash
git add utils/projects/name.ts utils/projects/name.test.ts supabase/migrations/0002_projects.sql
git commit -m "feat: add projects table with RLS and name normalizer"
```

### Task 7: `POST /api/projects` (create) + `GET /api/projects` (list)

**Files:**
- Create: `app/api/projects/route.ts`

**Interfaces:**
- Consumes: server `createClient()`, `normalizeProjectName`.
- Produces:
  - `POST /api/projects` body `{ name?: string }` → `201 { id: string }` or `401`.
  - `GET /api/projects` → `200 { projects: ProjectSummary[] }` where `ProjectSummary = { id, name, sketch_path, updated_at }`, newest first.

- [ ] **Step 1: `app/api/projects/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeProjectName } from '@/utils/projects/name';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, sketch_path, updated_at')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = normalizeProjectName(body?.name ?? '');

  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: user.id, name })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
```

- [ ] **Step 2: Manual verification**

With dev server running and logged in, in the browser console:
```js
await (await fetch('/api/projects', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name: 'Test' }) })).json();
await (await fetch('/api/projects')).json();
```
Expected: POST returns `{ id }`; GET returns `{ projects: [{ id, name: 'Test', ... }] }`. Logged out → 401.

- [ ] **Step 3: Commit**

```bash
git add app/api/projects/route.ts
git commit -m "feat: add project create and list API"
```

### Task 8: `GET`/`PATCH`/`DELETE /api/projects/[id]`

**Files:**
- Create: `app/api/projects/[id]/route.ts`

**Interfaces:**
- Consumes: server `createClient()`, `normalizeProjectName`.
- Produces:
  - `GET /api/projects/[id]` → `200 { project: Project }` (full row) or `404`.
  - `PATCH /api/projects/[id]` body `{ name?, html?, css? }` → `200 { ok: true }`. Sets `updated_at = now()`.
  - `DELETE /api/projects/[id]` → `200 { ok: true }`, and removes the project's Storage objects under `sketches/{user_id}/{id}` and `assets/{user_id}/{id}`.
- Note: RLS makes cross-user access return no rows → treated as 404.

- [ ] **Step 1: `app/api/projects/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeProjectName } from '@/utils/projects/name';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ project: data });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === 'string') patch.name = normalizeProjectName(body.name);
  if (typeof body.html === 'string') patch.html = body.html;
  if (typeof body.css === 'string') patch.css = body.css;

  const { error } = await supabase.from('projects').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Best-effort storage cleanup (RLS-scoped).
  for (const bucket of ['sketches', 'assets']) {
    const prefix = `${user.id}/${id}`;
    const { data: files } = await supabase.storage.from(bucket).list(prefix);
    if (files?.length) {
      await supabase.storage.from(bucket).remove(files.map((f) => `${prefix}/${f.name}`));
    }
  }

  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Manual verification**

Using an id from Task 7, in the console:
```js
const id = 'PASTE_ID';
await (await fetch(`/api/projects/${id}`)).json();
await (await fetch(`/api/projects/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name:'Renamed' }) })).json();
await (await fetch(`/api/projects/${id}`, { method:'DELETE' })).json();
```
Expected: GET returns the full row; PATCH `{ ok: true }` and GET shows the new name; DELETE `{ ok: true }` and subsequent GET → 404.

- [ ] **Step 3: Commit**

```bash
git add "app/api/projects/[id]/route.ts"
git commit -m "feat: add project get/patch/delete API"
```

### Task 9: Dashboard list/create/delete UI + ProjectCard + sign-out

**Files:**
- Create: `components/dashboard/ProjectCard.tsx`
- Create: `components/dashboard/DashboardClient.tsx`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `/api/projects` (GET/POST), `/api/projects/[id]` (DELETE), `createClient()` (browser, for sign-out).
- Produces: interactive dashboard — "New project" creates a project and navigates to `/studio/[id]`; each card links to the studio and can be deleted.

- [ ] **Step 1: `components/dashboard/ProjectCard.tsx`**

```tsx
'use client';

import Link from 'next/link';

export type ProjectSummary = {
  id: string;
  name: string;
  sketch_path: string | null;
  updated_at: string;
};

export default function ProjectCard({
  project,
  onDelete,
}: {
  project: ProjectSummary;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="p-6 rounded-2xl bg-surface backdrop-blur-lg border border-border shadow-glass flex flex-col">
      <Link href={`/studio/${project.id}`} className="flex-1">
        <h3 className="text-lg font-bold mb-1">{project.name}</h3>
        <p className="text-xs text-slate-500">
          Updated {new Date(project.updated_at).toLocaleDateString()}
        </p>
      </Link>
      <button
        onClick={() => onDelete(project.id)}
        className="mt-4 self-start text-sm text-red-600 hover:underline"
      >
        Delete
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `components/dashboard/DashboardClient.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ProjectCard, { type ProjectSummary } from './ProjectCard';

export default function DashboardClient({ initial }: { initial: ProjectSummary[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>(initial);
  const [creating, setCreating] = useState(false);

  async function createProject() {
    setCreating(true);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Untitled project' }),
    });
    setCreating(false);
    if (!res.ok) return;
    const { id } = await res.json();
    router.push(`/studio/${id}`);
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    setProjects((p) => p.filter((x) => x.id !== id));
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <header className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-extrabold">Your projects</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={createProject}
            disabled={creating}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'New project'}
          </button>
          <button onClick={signOut} className="text-sm text-slate-500 hover:underline">
            Sign out
          </button>
        </div>
      </header>

      {projects.length === 0 ? (
        <p className="text-slate-500">No projects yet. Create your first one.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={deleteProject} />
          ))}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Rewrite `app/dashboard/page.tsx` to load projects server-side**

```tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/dashboard/DashboardClient';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, sketch_path, updated_at')
    .order('updated_at', { ascending: false });

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-800">
      <div className="absolute inset-0 bg-aurora-gradient z-0 pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <DashboardClient initial={projects ?? []} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Manual verification**

Log in → "New project" → redirected to `/studio/<id>` (404 until Task 14 — acceptable). Return to `/dashboard`; the project appears. Delete it; it disappears. Sign out → `/login`.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/ProjectCard.tsx components/dashboard/DashboardClient.tsx app/dashboard/page.tsx
git commit -m "feat: wire dashboard list/create/delete and sign-out"
```

---

## Phase 3 — Generation Core (highest risk — spike first)

> Prove `sketch → IR → clean HTML/CSS` in isolation (Tasks 10–11 are pure and fully TDD'd) before wiring Gemini (Task 12) and the route (Task 13).

### Task 10: Layout IR Zod schema + curated palettes/fonts (TDD)

**Files:**
- Create: `utils/ir/schema.ts`
- Test: `utils/ir/schema.test.ts`

**Interfaces:**
- Produces:
  - `pageIRSchema: z.ZodType<PageIR>` and inferred types `PageIR`, `Section`, `Element`, `Theme`.
  - `CURATED_FONTS: readonly string[]`, `CURATED_PALETTES` (named palettes), exported for reuse by the renderer and Gemini prompt.
  - `SECTION_ROLES`, `ELEMENT_TYPES` const tuples.
  - `validateIR(input: unknown): { ok: true; ir: PageIR } | { ok: false; error: string }`.

- [ ] **Step 1: Write the failing test — `utils/ir/schema.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { validateIR, pageIRSchema, CURATED_FONTS } from './schema';

const validIR = {
  theme: {
    palette: { primary: '#14b8a6', secondary: '#facc15', background: '#ffffff', surface: '#f8fafc', text: '#0f172a' },
    fonts: { heading: 'Poppins', body: 'Inter' },
    spacing: 'normal',
  },
  sections: [
    {
      id: 's1',
      role: 'hero',
      layout: { columns: 1, align: 'center' },
      elements: [
        { type: 'heading', level: 1, text: 'Welcome' },
        { type: 'paragraph', text: 'Subtitle here' },
        { type: 'button', text: 'Get started', variant: 'primary' },
      ],
    },
  ],
};

describe('pageIRSchema', () => {
  it('accepts a well-formed IR', () => {
    const r = validateIR(validIR);
    expect(r.ok).toBe(true);
  });

  it('rejects an unknown section role', () => {
    const bad = { ...validIR, sections: [{ ...validIR.sections[0], role: 'carousel' }] };
    const r = validateIR(bad);
    expect(r.ok).toBe(false);
  });

  it('rejects a non-hex palette color', () => {
    const bad = JSON.parse(JSON.stringify(validIR));
    bad.theme.palette.primary = 'red';
    expect(validateIR(bad).ok).toBe(false);
  });

  it('coerces an unknown font to a curated fallback via parse', () => {
    const bad = JSON.parse(JSON.stringify(validIR));
    bad.theme.fonts.heading = 'Comic Sans MS';
    const parsed = pageIRSchema.parse(bad);
    expect(CURATED_FONTS).toContain(parsed.theme.fonts.heading);
  });

  it('requires at least one section', () => {
    const bad = { ...validIR, sections: [] };
    expect(validateIR(bad).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- schema.test.ts`
Expected: FAIL — cannot find module `./schema`.

- [ ] **Step 3: Implement — `utils/ir/schema.ts`**

```ts
import { z } from 'zod';

export const CURATED_FONTS = ['Inter', 'Poppins', 'Roboto', 'Lora', 'Montserrat', 'Merriweather'] as const;

export const CURATED_PALETTES = {
  mintGold: { primary: '#14b8a6', secondary: '#facc15', background: '#ffffff', surface: '#f8fafc', text: '#0f172a' },
  slate: { primary: '#0f172a', secondary: '#38bdf8', background: '#ffffff', surface: '#f1f5f9', text: '#0f172a' },
} as const;

export const SECTION_ROLES = [
  'nav', 'hero', 'features', 'gallery', 'cta', 'text', 'footer',
] as const;

export const ELEMENT_TYPES = [
  'heading', 'paragraph', 'button', 'image', 'list', 'input', 'logo', 'divider',
] as const;

const hexColor = z.string().regex(/^#([0-9a-fA-F]{6})$/, 'must be a 6-digit hex color');

// Unknown fonts are coerced to a safe curated default rather than rejected.
const curatedFont = z.string().transform((f) => ((CURATED_FONTS as readonly string[]).includes(f) ? f : 'Inter'));

const elementSchema = z.object({
  type: z.enum(ELEMENT_TYPES),
  text: z.string().max(600).optional(),
  level: z.number().int().min(1).max(4).optional(),
  variant: z.enum(['primary', 'secondary', 'ghost']).optional(),
  items: z.array(z.string().max(200)).max(20).optional(),
  placeholder: z.string().max(120).optional(),
  alt: z.string().max(200).optional(),
});

const sectionSchema = z.object({
  id: z.string().min(1).max(64),
  role: z.enum(SECTION_ROLES),
  layout: z.object({
    columns: z.number().int().min(1).max(4),
    align: z.enum(['start', 'center', 'end']).default('start'),
  }),
  elements: z.array(elementSchema).min(1).max(30),
});

const themeSchema = z.object({
  palette: z.object({
    primary: hexColor,
    secondary: hexColor,
    background: hexColor,
    surface: hexColor,
    text: hexColor,
  }),
  fonts: z.object({ heading: curatedFont, body: curatedFont }),
  spacing: z.enum(['compact', 'normal', 'roomy']),
});

export const pageIRSchema = z.object({
  theme: themeSchema,
  sections: z.array(sectionSchema).min(1).max(20),
});

export type Element = z.infer<typeof elementSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type PageIR = z.infer<typeof pageIRSchema>;

export function validateIR(input: unknown): { ok: true; ir: PageIR } | { ok: false; error: string } {
  const r = pageIRSchema.safeParse(input);
  if (r.success) return { ok: true, ir: r.data };
  return { ok: false, error: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- schema.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add utils/ir/schema.ts utils/ir/schema.test.ts
git commit -m "feat: add Layout IR Zod schema with curated fonts/palettes"
```

### Task 11: Deterministic renderer (TDD)

**Files:**
- Create: `utils/renderer.ts`
- Test: `utils/renderer.test.ts`

**Interfaces:**
- Consumes: `PageIR`, `CURATED_FONTS`, `SECTION_ROLES` from `@/utils/ir/schema`.
- Produces: `renderPage(ir: PageIR): { html: string; css: string }`.
  - HTML: one `<section data-region="{role}" class="pp-section pp-{role}">` per section; elements rendered to semantic tags with `pp-` classes GrapesJS can style; images as `<img class="pp-image" data-pp-asset="1" ...>` with a neutral placeholder `src`.
  - CSS: `:root` custom properties from `theme.palette`; spacing scale from `theme.spacing`; a Google Fonts `<link>`-equivalent `@import` for the two curated fonts; base rules for each `pp-` class.
  - No `<script>` tags, no external URLs except the Google Fonts `@import` and inline SVG data-URI placeholder.

- [ ] **Step 1: Write the failing test — `utils/renderer.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { renderPage } from './renderer';
import type { PageIR } from './ir/schema';

const ir: PageIR = {
  theme: {
    palette: { primary: '#14b8a6', secondary: '#facc15', background: '#ffffff', surface: '#f8fafc', text: '#0f172a' },
    fonts: { heading: 'Poppins', body: 'Inter' },
    spacing: 'normal',
  },
  sections: [
    {
      id: 's1',
      role: 'hero',
      layout: { columns: 1, align: 'center' },
      elements: [
        { type: 'heading', level: 1, text: 'Welcome <script>alert(1)</script>' },
        { type: 'button', text: 'Go', variant: 'primary' },
        { type: 'image', alt: 'Hero shot' },
      ],
    },
    {
      id: 's2',
      role: 'footer',
      layout: { columns: 3, align: 'start' },
      elements: [{ type: 'paragraph', text: 'Contact us' }],
    },
  ],
};

describe('renderPage', () => {
  it('emits a section per IR section with data-region', () => {
    const { html } = renderPage(ir);
    expect(html).toContain('data-region="hero"');
    expect(html).toContain('data-region="footer"');
  });

  it('renders a heading at the requested level', () => {
    const { html } = renderPage(ir);
    expect(html).toContain('<h1');
    expect(html).toContain('Welcome');
  });

  it('escapes HTML in text (safe by construction)', () => {
    const { html } = renderPage(ir);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('never emits a script tag', () => {
    const { html } = renderPage(ir);
    expect(html.toLowerCase()).not.toContain('<script');
  });

  it('emits image placeholders tagged for the asset manager', () => {
    const { html } = renderPage(ir);
    expect(html).toContain('data-pp-asset="1"');
    expect(html).toContain('alt="Hero shot"');
  });

  it('emits CSS custom properties from the palette', () => {
    const { css } = renderPage(ir);
    expect(css).toContain('--pp-primary: #14b8a6');
    expect(css).toContain('--pp-text: #0f172a');
  });

  it('imports both curated fonts', () => {
    const { css } = renderPage(ir);
    expect(css).toContain('Poppins');
    expect(css).toContain('Inter');
    expect(css).toContain('fonts.googleapis.com');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- renderer.test.ts`
Expected: FAIL — cannot find module `./renderer`.

- [ ] **Step 3: Implement — `utils/renderer.ts`**

```ts
import type { PageIR, Section, Element } from './ir/schema';

function esc(s: string | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Neutral inline SVG placeholder — no external request, safe by construction.
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="100%" height="100%" fill="%23e2e8f0"/><text x="50%" y="50%" fill="%2394a3b8" font-family="sans-serif" font-size="24" text-anchor="middle" dominant-baseline="middle">Image</text></svg>',
  );

function renderElement(el: Element): string {
  switch (el.type) {
    case 'heading': {
      const lvl = Math.min(Math.max(el.level ?? 2, 1), 4);
      return `<h${lvl} class="pp-heading">${esc(el.text)}</h${lvl}>`;
    }
    case 'paragraph':
      return `<p class="pp-paragraph">${esc(el.text)}</p>`;
    case 'button': {
      const v = el.variant ?? 'primary';
      return `<a class="pp-button pp-button--${v}" href="#">${esc(el.text) || 'Button'}</a>`;
    }
    case 'image':
      return `<img class="pp-image" data-pp-asset="1" src="${PLACEHOLDER}" alt="${esc(el.alt)}" />`;
    case 'list': {
      const items = (el.items ?? []).map((i) => `<li>${esc(i)}</li>`).join('');
      return `<ul class="pp-list">${items}</ul>`;
    }
    case 'input':
      return `<input class="pp-input" type="text" placeholder="${esc(el.placeholder) || 'Enter text'}" />`;
    case 'logo':
      return `<span class="pp-logo">${esc(el.text) || 'Logo'}</span>`;
    case 'divider':
      return `<hr class="pp-divider" />`;
    default:
      return '';
  }
}

function renderSection(section: Section): string {
  const inner = section.elements.map(renderElement).join('\n      ');
  return `  <section data-region="${section.role}" class="pp-section pp-${section.role}" data-cols="${section.layout.columns}" data-align="${section.layout.align}">
    <div class="pp-container">
      ${inner}
    </div>
  </section>`;
}

const SPACING_SCALE: Record<PageIR['theme']['spacing'], string> = {
  compact: '2rem',
  normal: '4rem',
  roomy: '6rem',
};

export function renderPage(ir: PageIR): { html: string; css: string } {
  const { theme } = ir;
  const sections = ir.sections.map(renderSection).join('\n');
  const html = `<body class="pp-page">\n${sections}\n</body>`;

  const fontParam = [theme.fonts.heading, theme.fonts.body]
    .map((f) => `family=${f.replace(/ /g, '+')}:wght@400;600;700`)
    .join('&');

  const css = `@import url('https://fonts.googleapis.com/css2?${fontParam}&display=swap');

:root {
  --pp-primary: ${theme.palette.primary};
  --pp-secondary: ${theme.palette.secondary};
  --pp-background: ${theme.palette.background};
  --pp-surface: ${theme.palette.surface};
  --pp-text: ${theme.palette.text};
  --pp-space: ${SPACING_SCALE[theme.spacing]};
  --pp-font-heading: '${theme.fonts.heading}', sans-serif;
  --pp-font-body: '${theme.fonts.body}', sans-serif;
}

* { box-sizing: border-box; }
.pp-page { margin: 0; background: var(--pp-background); color: var(--pp-text); font-family: var(--pp-font-body); line-height: 1.6; }
.pp-section { padding: var(--pp-space) 1.5rem; }
.pp-container { max-width: 1100px; margin: 0 auto; }
.pp-hero { text-align: center; background: var(--pp-surface); }
.pp-heading { font-family: var(--pp-font-heading); font-weight: 700; margin: 0 0 1rem; }
.pp-paragraph { margin: 0 0 1rem; }
.pp-button { display: inline-block; padding: 0.75rem 1.5rem; border-radius: 0.75rem; text-decoration: none; font-weight: 600; }
.pp-button--primary { background: var(--pp-primary); color: #fff; }
.pp-button--secondary { background: var(--pp-secondary); color: var(--pp-text); }
.pp-button--ghost { background: transparent; border: 1px solid var(--pp-primary); color: var(--pp-primary); }
.pp-image { max-width: 100%; height: auto; border-radius: 0.75rem; display: block; }
.pp-list { padding-left: 1.25rem; }
.pp-input { width: 100%; padding: 0.75rem 1rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; }
.pp-logo { font-family: var(--pp-font-heading); font-weight: 700; font-size: 1.25rem; }
.pp-divider { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
.pp-footer { background: var(--pp-surface); font-size: 0.9rem; }
.pp-features .pp-container, .pp-gallery .pp-container { display: grid; gap: 1.5rem; }
`;

  return { html, css };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- renderer.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add utils/renderer.ts utils/renderer.test.ts
git commit -m "feat: add deterministic IR renderer (safe HTML/CSS)"
```

### Task 12: Gemini Vision wrapper + image downscale

**Files:**
- Create: `lib/gemini.ts`

**Interfaces:**
- Consumes: `GEMINI_API_KEY`, `pageIRSchema` roles/fonts/palettes for the prompt.
- Produces:
  - `async downscaleImage(buffer: Buffer, mimeType: string): Promise<{ data: string; mimeType: string }>` — sharp resize to max 1600px longest edge, re-encode to JPEG, return base64.
  - `async callGeminiVision(image: { data: string; mimeType: string }): Promise<unknown>` — one Gemini Vision call with JSON `responseSchema`, low temperature; returns the parsed JSON object (validation happens in the route).
- Server-only: this module imports `@google/generative-ai` and must never be imported by a client component.

> Verified end-to-end in Task 13 against a real sketch. This step is create + typecheck + commit.

- [ ] **Step 1: `lib/gemini.ts`**

```ts
import 'server-only';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import sharp from 'sharp';
import { SECTION_ROLES, ELEMENT_TYPES, CURATED_FONTS } from '@/utils/ir/schema';

export async function downscaleImage(
  buffer: Buffer,
  _mimeType: string,
): Promise<{ data: string; mimeType: string }> {
  const out = await sharp(buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return { data: out.toString('base64'), mimeType: 'image/jpeg' };
}

// JSON responseSchema mirrors utils/ir/schema.ts (Gemini's schema dialect).
const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    theme: {
      type: SchemaType.OBJECT,
      properties: {
        palette: {
          type: SchemaType.OBJECT,
          properties: {
            primary: { type: SchemaType.STRING },
            secondary: { type: SchemaType.STRING },
            background: { type: SchemaType.STRING },
            surface: { type: SchemaType.STRING },
            text: { type: SchemaType.STRING },
          },
          required: ['primary', 'secondary', 'background', 'surface', 'text'],
        },
        fonts: {
          type: SchemaType.OBJECT,
          properties: {
            heading: { type: SchemaType.STRING, enum: [...CURATED_FONTS] },
            body: { type: SchemaType.STRING, enum: [...CURATED_FONTS] },
          },
          required: ['heading', 'body'],
        },
        spacing: { type: SchemaType.STRING, enum: ['compact', 'normal', 'roomy'] },
      },
      required: ['palette', 'fonts', 'spacing'],
    },
    sections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          role: { type: SchemaType.STRING, enum: [...SECTION_ROLES] },
          layout: {
            type: SchemaType.OBJECT,
            properties: {
              columns: { type: SchemaType.INTEGER },
              align: { type: SchemaType.STRING, enum: ['start', 'center', 'end'] },
            },
            required: ['columns', 'align'],
          },
          elements: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                type: { type: SchemaType.STRING, enum: [...ELEMENT_TYPES] },
                text: { type: SchemaType.STRING },
                level: { type: SchemaType.INTEGER },
                variant: { type: SchemaType.STRING, enum: ['primary', 'secondary', 'ghost'] },
                items: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                placeholder: { type: SchemaType.STRING },
                alt: { type: SchemaType.STRING },
              },
              required: ['type'],
            },
          },
        },
        required: ['id', 'role', 'layout', 'elements'],
      },
    },
  },
  required: ['theme', 'sections'],
} as const;

const PROMPT = `You are a web layout interpreter. Look at this photo of a hand-drawn website page sketch.
Produce a structured page layout as JSON matching the provided schema.
Rules:
- Infer each section's role (nav, hero, features, gallery, cta, text, footer) from the drawing.
- Order sections top-to-bottom as drawn.
- Fill in legible, sensible placeholder copy where handwriting is unclear. Keep copy short and realistic.
- Choose 6-digit hex colors for a clean, modern palette (light background).
- Pick a heading font and body font ONLY from the allowed font list.
- Use "normal" spacing unless the sketch is clearly dense or airy.`;

export async function callGeminiVision(image: { data: string; mimeType: string }): Promise<unknown> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      // @ts-expect-error responseSchema typing is looser than our const object
      responseSchema,
    },
  });

  const result = await model.generateContent([
    { text: PROMPT },
    { inlineData: { data: image.data, mimeType: image.mimeType } },
  ]);
  const text = result.response.text();
  return JSON.parse(text);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Install `server-only` if missing: `npm install server-only`.)

- [ ] **Step 3: Commit**

```bash
git add lib/gemini.ts package.json package-lock.json
git commit -m "feat: add server-only Gemini Vision wrapper with image downscale"
```

### Task 13: `POST /api/generate` (sketch → Storage → Gemini → IR → render → persist)

**Files:**
- Create: `supabase/migrations/0003_storage_sketches.sql`
- Create: `app/api/generate/route.ts`

**Interfaces:**
- Consumes: server `createClient()`, `downscaleImage`, `callGeminiVision`, `validateIR`, `renderPage`.
- Produces: `POST /api/generate` — multipart form-data `{ projectId: string, image: File }` → stores the sketch to `sketches/{user_id}/{projectId}/original.jpg`, generates IR (one automatic retry on validation failure), renders, persists `{ sketch_path, ir, html, css }`, returns `200 { ir, html, css }`. Errors: `401`, `400` (bad image/too large), `422` (IR invalid after retry), `504` (timeout).

- [ ] **Step 1: Create the `sketches` bucket + RLS — `supabase/migrations/0003_storage_sketches.sql`**

```sql
insert into storage.buckets (id, name, public)
values ('sketches', 'sketches', false)
on conflict (id) do nothing;

create policy "Sketch objects readable by owner"
  on storage.objects for select
  using (bucket_id = 'sketches' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Sketch objects insertable by owner"
  on storage.objects for insert
  with check (bucket_id = 'sketches' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Sketch objects deletable by owner"
  on storage.objects for delete
  using (bucket_id = 'sketches' and (storage.foldername(name))[1] = auth.uid()::text);
```

Apply it in the Supabase SQL editor. Expected: no error; `sketches` bucket exists, private, with 3 policies.

- [ ] **Step 2: `app/api/generate/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { downscaleImage, callGeminiVision } from '@/lib/gemini';
import { validateIR } from '@/utils/ir/schema';
import { renderPage } from '@/utils/renderer';

export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const projectId = form?.get('projectId');
  const image = form?.get('image');
  if (typeof projectId !== 'string' || !(image instanceof File)) {
    return NextResponse.json({ error: 'projectId and image are required' }, { status: 400 });
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image exceeds 10 MB' }, { status: 400 });
  }
  if (!ALLOWED.includes(image.type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
  }

  const buffer = Buffer.from(await image.arrayBuffer());

  // 1. Store the original sketch.
  const sketchPath = `${user.id}/${projectId}/original.jpg`;
  const downscaled = await downscaleImage(buffer, image.type);
  const { error: upErr } = await supabase.storage
    .from('sketches')
    .upload(sketchPath, Buffer.from(downscaled.data, 'base64'), {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // 2 + 3. Gemini → IR, validate, one retry.
  let ir = null;
  let lastError = 'unknown';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGeminiVision(downscaled);
      const result = validateIR(raw);
      if (result.ok) {
        ir = result.ir;
        break;
      }
      lastError = result.error;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  if (!ir) {
    return NextResponse.json({ error: `Could not interpret sketch: ${lastError}` }, { status: 422 });
  }

  // 4. Render.
  const { html, css } = renderPage(ir);

  // 5. Persist (RLS ensures the project belongs to this user).
  const { error: saveErr } = await supabase
    .from('projects')
    .update({ sketch_path: sketchPath, ir, html, css, updated_at: new Date().toISOString() })
    .eq('id', projectId);
  if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 });

  return NextResponse.json({ ir, html, css });
}
```

- [ ] **Step 3: End-to-end verification (the spike payoff)**

With real env vars and a created project id, run `npm run dev`. Take/download a photo of a simple hand-drawn sketch (hero + features + footer). From the browser console on `/dashboard`:
```js
const id = 'PASTE_PROJECT_ID';
const f = document.createElement('input'); f.type='file';
f.onchange = async () => {
  const fd = new FormData();
  fd.append('projectId', id);
  fd.append('image', f.files[0]);
  const r = await fetch('/api/generate', { method:'POST', body: fd });
  console.log(r.status, await r.json());
};
f.click();
```
Expected: `200` with `{ ir, html, css }`; `html` contains `data-region="hero"`; the `projects` row now has `ir/html/css`; the sketch appears in the `sketches` bucket. **Do not proceed to Phase 4 until this round-trip works.**

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_storage_sketches.sql app/api/generate/route.ts
git commit -m "feat: add /api/generate sketch-to-page pipeline"
```

---

## Phase 4 — Studio Editor

### Task 14: Studio page shell + Uploader (upload state)

**Files:**
- Create: `components/studio/Uploader.tsx`
- Create: `app/studio/[projectId]/page.tsx`

**Interfaces:**
- Consumes: server `createClient()` (load project), `/api/generate`.
- Produces:
  - `app/studio/[projectId]/page.tsx` — server component: loads the project, redirects to `/login` if unauthenticated, 404s if the project is missing. Renders upload state when `html` is empty, otherwise the editor (Task 15).
  - `<Uploader projectId onGenerated={(data) => …} />` — drag/drop + file picker, thumbnail preview, Generate button → `POST /api/generate`, loading + error/retry states.

- [ ] **Step 1: `components/studio/Uploader.tsx`**

```tsx
'use client';

import { useState, useRef } from 'react';

export default function Uploader({
  projectId,
  onGenerated,
}: {
  projectId: string;
  onGenerated: (data: { html: string; css: string }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function choose(f: File | null) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  async function generate() {
    if (!file) return;
    setStatus('loading');
    setError(null);
    const fd = new FormData();
    fd.append('projectId', projectId);
    fd.append('image', file);
    try {
      const res = await fetch('/api/generate', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setError(data.error ?? 'Generation failed');
        return;
      }
      onGenerated({ html: data.html, css: data.css });
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Network error');
    }
  }

  return (
    <div className="max-w-xl mx-auto py-16">
      <h1 className="text-3xl font-extrabold mb-2">Upload your sketch</h1>
      <p className="text-slate-500 mb-8">Photograph a hand-drawn page layout, then generate your site.</p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          choose(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer border-2 border-dashed border-border rounded-2xl bg-surface backdrop-blur-lg p-10 text-center"
      >
        {preview ? (
          <img src={preview} alt="Sketch preview" className="max-h-64 mx-auto rounded-xl" />
        ) : (
          <p className="text-slate-500">Drag & drop a photo here, or click to choose</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      <button
        onClick={generate}
        disabled={!file || status === 'loading'}
        className="mt-6 w-full py-3 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-50"
      >
        {status === 'loading' ? 'Generating your page… (this can take ~20s)' : 'Generate'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `app/studio/[projectId]/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import StudioClient from '@/components/studio/StudioClient';

export default async function StudioPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (!project) notFound();

  return <StudioClient project={project} />;
}
```

- [ ] **Step 3: `components/studio/StudioClient.tsx` (state switch; Editor lands in Task 15)**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Uploader from './Uploader';

type Project = {
  id: string;
  name: string;
  html: string | null;
  css: string | null;
};

export default function StudioClient({ project }: { project: Project }) {
  const [html, setHtml] = useState<string | null>(project.html);
  const [css, setCss] = useState<string | null>(project.css);
  const hasPage = !!html;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
          ← Dashboard
        </Link>
        <span className="font-semibold">{project.name}</span>
        <span />
      </div>
      {hasPage ? (
        <div className="p-6">Editor loads here (Task 15).</div>
      ) : (
        <Uploader
          projectId={project.id}
          onGenerated={({ html, css }) => {
            setHtml(html);
            setCss(css);
          }}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 4: Manual verification**

Create a project → land on `/studio/[id]` upload state → pick a sketch → Generate → on success the placeholder "Editor loads here" appears.
Expected: works end-to-end against `/api/generate`.

- [ ] **Step 5: Commit**

```bash
git add components/studio/Uploader.tsx components/studio/StudioClient.tsx "app/studio/[projectId]/page.tsx"
git commit -m "feat: add studio upload state and page shell"
```

### Task 15: GrapesJS Editor (edit state, curated panels/fonts)

**Files:**
- Create: `components/studio/Editor.tsx`
- Modify: `components/studio/StudioClient.tsx`

**Interfaces:**
- Consumes: `grapesjs` (dynamic import, client-only), initial `{ html, css }`.
- Produces: `<Editor projectId name html css onSave={(html, css) => void} onDirty={() => void} />` — GrapesJS initialized with `{ components: html, style: css }`, built-in remote storage disabled, curated style-manager sectors (Typography, Background, Spacing, Border), curated font-family options = `CURATED_FONTS`, curated block manager, layer manager, device manager (desktop + mobile). Emits `onDirty` on change (autosave wiring is Task 16). Injects the curated Google Fonts link into the canvas so picks render identically.

> GrapesJS is a browser library; verified manually. This task creates the wrapper and proves the canvas renders the generated page.

- [ ] **Step 1: `components/studio/Editor.tsx`**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { CURATED_FONTS } from '@/utils/ir/schema';

export default function Editor({
  html,
  css,
  onChange,
  editorRef,
}: {
  html: string;
  css: string;
  onChange: () => void;
  editorRef: React.MutableRefObject<any>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let editor: any;
    let disposed = false;

    (async () => {
      const grapesjs = (await import('grapesjs')).default;
      await import('grapesjs/dist/css/grapes.min.css');
      if (disposed || !containerRef.current) return;

      const fontOptions = CURATED_FONTS.map((f) => ({ id: f, label: f, value: `'${f}', sans-serif` }));

      editor = grapesjs.init({
        container: containerRef.current,
        height: 'calc(100vh - 49px)',
        fromElement: false,
        storageManager: false, // app owns persistence
        components: html,
        style: css,
        deviceManager: {
          devices: [
            { name: 'Desktop', width: '' },
            { name: 'Mobile', width: '375px' },
          ],
        },
        styleManager: {
          sectors: [
            {
              name: 'Typography',
              open: true,
              properties: [
                { property: 'font-family', type: 'select', defaults: `'Inter', sans-serif`, options: fontOptions },
                'font-size',
                'font-weight',
                'line-height',
                { property: 'color', type: 'color' },
                'text-align',
              ],
            },
            { name: 'Background', open: false, properties: [{ property: 'background-color', type: 'color' }] },
            { name: 'Spacing', open: false, properties: ['padding', 'margin'] },
            { name: 'Border', open: false, properties: ['border-radius', 'border'] },
          ],
        },
        blockManager: {
          blocks: [
            { id: 'heading', label: 'Heading', content: '<h2 class="pp-heading">New heading</h2>' },
            { id: 'paragraph', label: 'Text', content: '<p class="pp-paragraph">New paragraph text.</p>' },
            { id: 'button', label: 'Button', content: '<a class="pp-button pp-button--primary" href="#">Button</a>' },
            {
              id: 'hero',
              label: 'Hero',
              content:
                '<section data-region="hero" class="pp-section pp-hero"><div class="pp-container"><h1 class="pp-heading">Headline</h1><p class="pp-paragraph">Supporting text</p><a class="pp-button pp-button--primary" href="#">Get started</a></div></section>',
            },
            {
              id: 'features',
              label: 'Features',
              content:
                '<section data-region="features" class="pp-section pp-features"><div class="pp-container"><h2 class="pp-heading">Features</h2></div></section>',
            },
            {
              id: 'cta',
              label: 'CTA',
              content:
                '<section data-region="cta" class="pp-section pp-cta"><div class="pp-container"><h2 class="pp-heading">Ready?</h2><a class="pp-button pp-button--primary" href="#">Start now</a></div></section>',
            },
          ],
        },
      });

      // Inject curated fonts into the canvas so picks render identically to export.
      const fontParam = CURATED_FONTS.map((f) => `family=${f.replace(/ /g, '+')}:wght@400;600;700`).join('&');
      editor.Canvas.getDocument()?.head?.insertAdjacentHTML(
        'beforeend',
        `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fontParam}&display=swap">`,
      );

      editor.on('update', onChange);
      editor.on('component:update', onChange);
      editor.on('style:update', onChange);

      editorRef.current = editor;
    })();

    return () => {
      disposed = true;
      try {
        editor?.destroy();
      } catch {}
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} />;
}
```

- [ ] **Step 2: Wire the editor into `StudioClient.tsx`**

Replace the `hasPage ?` branch placeholder. Add a dynamic import (GrapesJS must not SSR) and an `editorRef`:

```tsx
'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Uploader from './Uploader';

const Editor = dynamic(() => import('./Editor'), { ssr: false });

type Project = { id: string; name: string; html: string | null; css: string | null };

export default function StudioClient({ project }: { project: Project }) {
  const [html, setHtml] = useState<string | null>(project.html);
  const [css, setCss] = useState<string | null>(project.css);
  const editorRef = useRef<any>(null);
  const hasPage = !!html;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
          ← Dashboard
        </Link>
        <span className="font-semibold">{project.name}</span>
        <span />
      </div>
      {hasPage ? (
        <Editor
          html={html!}
          css={css!}
          editorRef={editorRef}
          onChange={() => {
            /* autosave wired in Task 16 */
          }}
        />
      ) : (
        <Uploader
          projectId={project.id}
          onGenerated={({ html, css }) => {
            setHtml(html);
            setCss(css);
          }}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 3: Manual verification**

Open a project that already has generated HTML/CSS. The GrapesJS canvas renders the page; selecting an element shows the curated Typography/Background/Spacing/Border sectors; the block manager lists Hero/Features/CTA/etc.; the mobile device toggle works.
Expected: the generated page is fully visible and editable.

- [ ] **Step 4: Commit**

```bash
git add components/studio/Editor.tsx components/studio/StudioClient.tsx
git commit -m "feat: add GrapesJS editor with curated panels and fonts"
```

### Task 16: Debounced autosave + editable name + status (TDD for the debounce util)

**Files:**
- Create: `utils/debounce.ts`
- Test: `utils/debounce.test.ts`
- Modify: `components/studio/StudioClient.tsx`

**Interfaces:**
- Produces:
  - `debounce<T extends (...args: any[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void`.
  - StudioClient autosave: on GrapesJS change → debounce 1200ms → `PATCH /api/projects/[id]` with current `editor.getHtml()` + `editor.getCss()`; a status indicator shows `Saving…` / `Saved ✓`; the project name is editable inline and also PATCHed.

- [ ] **Step 1: Write the failing test — `utils/debounce.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  it('calls once after the delay for rapid calls', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 200);
    d('a');
    d('b');
    d('c');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- debounce.test.ts`
Expected: FAIL — cannot find module `./debounce`.

- [ ] **Step 3: Implement — `utils/debounce.ts`**

```ts
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- debounce.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Wire autosave + name editing into `StudioClient.tsx`**

Add near the top of the component body (inside `StudioClient`):

```tsx
  const [name, setName] = useState(project.name);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const save = useRef(
    debounce(async (payload: Record<string, string>) => {
      setSaveState('saving');
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSaveState('saved');
    }, 1200),
  ).current;

  function handleEditorChange() {
    const editor = editorRef.current;
    if (!editor) return;
    save({ html: editor.getHtml(), css: editor.getCss() });
  }

  function handleNameChange(next: string) {
    setName(next);
    save({ name: next });
  }
```

Add `import { debounce } from '@/utils/debounce';` at the top. Replace the top bar's `<span className="font-semibold">{project.name}</span>` with an editable input + status:

```tsx
        <div className="flex items-center gap-3">
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="font-semibold bg-transparent border-b border-transparent focus:border-slate-300 outline-none text-center"
          />
          <span className="text-xs text-slate-400 w-16">
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : ''}
          </span>
        </div>
```

And pass `onChange={handleEditorChange}` to `<Editor />` instead of the empty handler.

- [ ] **Step 6: Manual verification**

Edit an element (e.g. change a heading's color), wait ~1.5s → "Saving…" then "Saved ✓". Refresh the page → the edit persists. Change the project name → it persists and shows on the dashboard.
Expected: autosave and name edits survive refresh.

- [ ] **Step 7: Commit**

```bash
git add utils/debounce.ts utils/debounce.test.ts components/studio/StudioClient.tsx
git commit -m "feat: add debounced autosave and editable project name"
```

---

## Phase 5 — Assets (in-editor image upload)

### Task 17: `assets` bucket + `project_assets` table + RLS

**Files:**
- Create: `supabase/migrations/0004_assets.sql`

**Interfaces:**
- Produces: `project_assets(id, project_id → projects, user_id → auth.users, storage_path, filename, created_at)` with owner-scoped RLS; a private `assets` Storage bucket with owner-scoped policies keyed on the first path segment (`{user_id}`).

- [ ] **Step 1: Write `supabase/migrations/0004_assets.sql`**

```sql
create table if not exists public.project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  created_at timestamptz not null default now()
);

alter table public.project_assets enable row level security;

create policy "Assets selectable by owner"
  on public.project_assets for select using (auth.uid() = user_id);
create policy "Assets insertable by owner"
  on public.project_assets for insert with check (auth.uid() = user_id);
create policy "Assets deletable by owner"
  on public.project_assets for delete using (auth.uid() = user_id);

create index if not exists project_assets_project_idx on public.project_assets(project_id);

insert into storage.buckets (id, name, public)
values ('assets', 'assets', false)
on conflict (id) do nothing;

create policy "Asset objects readable by owner"
  on storage.objects for select
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Asset objects insertable by owner"
  on storage.objects for insert
  with check (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Asset objects deletable by owner"
  on storage.objects for delete
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Apply and verify**

Run in the Supabase SQL editor. Expected: `project_assets` table (RLS + 3 policies) and private `assets` bucket (3 object policies) exist.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0004_assets.sql
git commit -m "feat: add assets bucket and project_assets table with RLS"
```

### Task 18: `POST /api/assets` (upload) + `GET /api/assets` (list)

**Files:**
- Create: `app/api/assets/route.ts`

**Interfaces:**
- Consumes: server `createClient()`.
- Produces:
  - `POST /api/assets` — form-data `{ projectId, file }` → uploads to `assets/{user_id}/{projectId}/{uuid-filename}`, inserts a `project_assets` row, returns `201 { id, storage_path, filename, url }` where `url` is a signed URL (1-week TTL).
  - `GET /api/assets?projectId=` → `200 { assets: { id, filename, storage_path, url }[] }` with fresh signed URLs.

- [ ] **Step 1: `app/api/assets/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SIGNED_TTL = 60 * 60 * 24 * 7; // 1 week

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const projectId = form?.get('projectId');
  const file = form?.get('file');
  if (typeof projectId !== 'string' || !(file instanceof File)) {
    return NextResponse.json({ error: 'projectId and file are required' }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${user.id}/${projectId}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from('assets')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: row, error: dbErr } = await supabase
    .from('project_assets')
    .insert({ project_id: projectId, user_id: user.id, storage_path: storagePath, filename: safeName })
    .select('id, storage_path, filename')
    .single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const { data: signed } = await supabase.storage.from('assets').createSignedUrl(storagePath, SIGNED_TTL);
  return NextResponse.json({ ...row, url: signed?.signedUrl }, { status: 201 });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = new URL(req.url).searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const { data: rows, error } = await supabase
    .from('project_assets')
    .select('id, filename, storage_path')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const assets = await Promise.all(
    (rows ?? []).map(async (r) => {
      const { data: signed } = await supabase.storage.from('assets').createSignedUrl(r.storage_path, SIGNED_TTL);
      return { ...r, url: signed?.signedUrl };
    }),
  );
  return NextResponse.json({ assets });
}
```

- [ ] **Step 2: Manual verification**

With a project id, in the console upload an image via a `FormData` POST to `/api/assets` (same pattern as Task 13), then `GET /api/assets?projectId=<id>`.
Expected: POST → `201 { id, url, ... }` and the signed `url` opens the image; GET lists it. The row is in `project_assets` and the object is in the `assets` bucket.

- [ ] **Step 3: Commit**

```bash
git add app/api/assets/route.ts
git commit -m "feat: add asset upload and list API with signed URLs"
```

### Task 19: Wire GrapesJS asset manager to Supabase Storage

**Files:**
- Modify: `components/studio/Editor.tsx`

**Interfaces:**
- Consumes: `/api/assets` (GET/POST), `projectId`.
- Produces: GrapesJS Asset Manager that lists the project's uploaded images (signed URLs) and uploads new ones through `/api/assets`; selecting an asset sets the selected `<img>`'s `src`. `projectId` is now a prop on `<Editor>`.

- [ ] **Step 1: Add `projectId` to `Editor` props and configure the asset manager**

In `Editor.tsx`, extend the props:

```tsx
export default function Editor({
  projectId,
  html,
  css,
  onChange,
  editorRef,
}: {
  projectId: string;
  html: string;
  css: string;
  onChange: () => void;
  editorRef: React.MutableRefObject<any>;
}) {
```

In the `grapesjs.init({ ... })` config, add an `assetManager` block:

```tsx
        assetManager: {
          upload: false, // we handle uploads via custom logic below
          autoAdd: true,
        },
```

After `editor = grapesjs.init(...)`, load existing assets and hook uploads:

```tsx
      // Load existing project assets into the manager.
      try {
        const res = await fetch(`/api/assets?projectId=${projectId}`);
        if (res.ok) {
          const { assets } = await res.json();
          editor.AssetManager.add((assets ?? []).map((a: any) => ({ type: 'image', src: a.url, name: a.filename })));
        }
      } catch {}

      // Route the asset manager's file input through /api/assets.
      editor.AssetManager.getConfig().uploadFile = async (e: any) => {
        const files: FileList = e.dataTransfer ? e.dataTransfer.files : e.target.files;
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.append('projectId', projectId);
          fd.append('file', file);
          const res = await fetch('/api/assets', { method: 'POST', body: fd });
          if (res.ok) {
            const a = await res.json();
            editor.AssetManager.add({ type: 'image', src: a.url, name: a.filename });
          }
        }
      };
```

- [ ] **Step 2: Pass `projectId` from `StudioClient.tsx`**

Update the `<Editor ... />` usage to include `projectId={project.id}`.

- [ ] **Step 3: Manual verification**

In the editor, double-click an image placeholder (or open the Asset Manager), upload a real image → it appears in the manager and, when selected, replaces the placeholder `src`. Refresh → the manager still lists the uploaded image.
Expected: real images upload to Storage and render in-canvas via signed URLs.

- [ ] **Step 4: Commit**

```bash
git add components/studio/Editor.tsx components/studio/StudioClient.tsx
git commit -m "feat: wire GrapesJS asset manager to Supabase Storage"
```

---

## Phase 6 — Export

### Task 20: Export bundle utilities (TDD)

**Files:**
- Create: `utils/export/bundle.ts`
- Test: `utils/export/bundle.test.ts`

**Interfaces:**
- Produces:
  - `extractAssetUrls(html: string, css: string): string[]` — collects `<img src>` and CSS `url(...)` references that are http(s) or blob/signed URLs (ignores the inline `data:` placeholder).
  - `rewriteAssetUrls(html: string, css: string, mapping: Record<string, string>): { html: string; css: string }` — replaces each original URL with its mapped relative path.
  - `buildFilenameMap(urls: string[]): Record<string, string>` — assigns each URL a unique `./assets/<n>-<basename>` relative path (deterministic, collision-free).
  - `buildSiteZip(input: { html: string; css: string; assets: { relativePath: string; blob: Blob }[] }): Promise<Blob>` — assembles `index.html` (linking `styles.css`), `styles.css`, and `assets/*` into a zip Blob using JSZip. (Impure — verified via the ExportButton in Task 21.)

- [ ] **Step 1: Write the failing test — `utils/export/bundle.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { extractAssetUrls, rewriteAssetUrls, buildFilenameMap } from './bundle';

const html =
  '<img src="https://x.supabase.co/storage/v1/object/sign/assets/a.png?token=1" />' +
  '<img src="data:image/svg+xml;utf8,placeholder" />';
const css = '.hero { background: url("https://x.supabase.co/storage/v1/object/sign/assets/b.jpg?token=2"); }';

describe('extractAssetUrls', () => {
  it('collects remote urls and ignores data URIs', () => {
    const urls = extractAssetUrls(html, css);
    expect(urls).toContain('https://x.supabase.co/storage/v1/object/sign/assets/a.png?token=1');
    expect(urls).toContain('https://x.supabase.co/storage/v1/object/sign/assets/b.jpg?token=2');
    expect(urls.some((u) => u.startsWith('data:'))).toBe(false);
  });
});

describe('buildFilenameMap', () => {
  it('assigns unique relative paths', () => {
    const urls = extractAssetUrls(html, css);
    const map = buildFilenameMap(urls);
    const paths = Object.values(map);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((p) => p.startsWith('./assets/'))).toBe(true);
  });
});

describe('rewriteAssetUrls', () => {
  it('replaces originals with relative paths', () => {
    const urls = extractAssetUrls(html, css);
    const map = buildFilenameMap(urls);
    const out = rewriteAssetUrls(html, css, map);
    expect(out.html).toContain(map[urls[0]]);
    expect(out.html).not.toContain('token=1');
    expect(out.css).toContain(map[urls.find((u) => u.includes('b.jpg'))!]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- bundle.test.ts`
Expected: FAIL — cannot find module `./bundle`.

- [ ] **Step 3: Implement — `utils/export/bundle.ts`**

```ts
import JSZip from 'jszip';

const URL_RE = /https?:\/\/[^\s"')]+/g;

export function extractAssetUrls(html: string, css: string): string[] {
  const found = new Set<string>();
  for (const src of [html, css]) {
    const matches = src.match(URL_RE) ?? [];
    for (const m of matches) {
      if (m.includes('fonts.googleapis.com') || m.includes('fonts.gstatic.com')) continue;
      found.add(m);
    }
  }
  return [...found];
}

function basename(url: string): string {
  const path = url.split('?')[0];
  const name = path.substring(path.lastIndexOf('/') + 1) || 'image';
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function buildFilenameMap(urls: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  urls.forEach((url, i) => {
    map[url] = `./assets/${i}-${basename(url)}`;
  });
  return map;
}

export function rewriteAssetUrls(
  html: string,
  css: string,
  mapping: Record<string, string>,
): { html: string; css: string } {
  let outHtml = html;
  let outCss = css;
  for (const [original, relative] of Object.entries(mapping)) {
    outHtml = outHtml.split(original).join(relative);
    outCss = outCss.split(original).join(relative);
  }
  return { html: outHtml, css: outCss };
}

export async function buildSiteZip(input: {
  html: string;
  css: string;
  assets: { relativePath: string; blob: Blob }[];
}): Promise<Blob> {
  const zip = new JSZip();
  const document = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Exported with PaperPage</title>
<link rel="stylesheet" href="styles.css" />
</head>
${input.html}
</html>`;
  zip.file('index.html', document);
  zip.file('styles.css', input.css);
  const assetsFolder = zip.folder('assets')!;
  for (const a of input.assets) {
    const name = a.relativePath.replace('./assets/', '');
    assetsFolder.file(name, a.blob);
  }
  return zip.generateAsync({ type: 'blob' });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- bundle.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add utils/export/bundle.ts utils/export/bundle.test.ts
git commit -m "feat: add export bundle utilities (url extract/rewrite/zip)"
```

### Task 21: ExportButton (client-side zip download)

**Files:**
- Create: `components/studio/ExportButton.tsx`
- Modify: `components/studio/StudioClient.tsx`

**Interfaces:**
- Consumes: `editorRef` (GrapesJS instance), `extractAssetUrls`, `buildFilenameMap`, `rewriteAssetUrls`, `buildSiteZip`.
- Produces: `<ExportButton editorRef name />` — reads current `editor.getHtml()/getCss()`, fetches each referenced image as a Blob, rewrites URLs to `./assets/…`, builds the zip, triggers a browser download of `<name>.zip`.

- [ ] **Step 1: `components/studio/ExportButton.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { extractAssetUrls, buildFilenameMap, rewriteAssetUrls, buildSiteZip } from '@/utils/export/bundle';

export default function ExportButton({
  editorRef,
  name,
}: {
  editorRef: React.MutableRefObject<any>;
  name: string;
}) {
  const [busy, setBusy] = useState(false);

  async function onExport() {
    const editor = editorRef.current;
    if (!editor) return;
    setBusy(true);
    try {
      const html: string = editor.getHtml();
      const css: string = editor.getCss();

      const urls = extractAssetUrls(html, css);
      const map = buildFilenameMap(urls);

      const assets = [];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          assets.push({ relativePath: map[url], blob });
        } catch {
          // Skip an image that fails to fetch rather than failing the whole export.
        }
      }

      const rewritten = rewriteAssetUrls(html, css, map);
      const zip = await buildSiteZip({ html: rewritten.html, css: rewritten.css, assets });

      const a = document.createElement('a');
      a.href = URL.createObjectURL(zip);
      a.download = `${name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'site'}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onExport}
      disabled={busy}
      className="px-4 py-2 rounded-xl bg-mint-500 text-white font-semibold disabled:opacity-50"
    >
      {busy ? 'Exporting…' : 'Export .zip'}
    </button>
  );
}
```

- [ ] **Step 2: Add the Export button to the studio top bar (edit state only)**

In `StudioClient.tsx`, import `ExportButton` and render it in the top bar's right slot when `hasPage`:

```tsx
        {hasPage ? <ExportButton editorRef={editorRef} name={name} /> : <span />}
```

(Replace the trailing empty `<span />` in the top bar with this conditional.)

- [ ] **Step 3: Manual verification (Success Criterion #5)**

In a project with a replaced real image, click Export → a `<name>.zip` downloads. Unzip it; open `index.html` directly in a browser (no server).
Expected: the page renders correctly, fonts load, and images resolve from `./assets/…` with **no Supabase or network dependency** for the bundled images.

- [ ] **Step 4: Commit**

```bash
git add components/studio/ExportButton.tsx components/studio/StudioClient.tsx
git commit -m "feat: add portable HTML/CSS zip export"
```

---

## Phase 7 — Cleanup & Docs

### Task 22: Remove old Figma-ingestion code + retarget marketing

**Files:**
- Delete: `components/IntegrationWizard.tsx`
- Delete: `app/api/integrations/verify-figma/route.ts` (and the empty `app/api/integrations/` tree)
- Delete: `app/api/chat/route.ts`
- Delete: `app/studio/layout.tsx`, `app/studio/page.tsx` (old 3-column shell)
- Delete: `utils/exportEcosystem.ts`
- Modify: `app/page.tsx` (CTA → `/signup`, new copy)
- Modify: `app/layout.tsx` (metadata copy)

**Interfaces:**
- Produces: a codebase with no dead Figma-PAT/chat paths; the marketing CTA routes to `/signup`.

- [ ] **Step 1: Delete the dead files**

Run:
```bash
git rm components/IntegrationWizard.tsx app/api/integrations/verify-figma/route.ts app/api/chat/route.ts app/studio/layout.tsx app/studio/page.tsx utils/exportEcosystem.ts
```
(If any path is already gone, remove it from the command.) Then ensure no empty `app/api/integrations/` directory remains.

- [ ] **Step 2: Confirm nothing still imports the removed modules**

Run: `git grep -nE "IntegrationWizard|exportEcosystem|verify-figma|api/chat" -- '*.ts' '*.tsx'`
Expected: no matches (empty output). Fix any stragglers.

- [ ] **Step 3: Retarget `app/page.tsx`**

Update the hero to the new product and point the CTA at `/signup`:
```tsx
        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
          From a napkin sketch<br />
          <span className="text-mint-500">to a live page.</span>
        </h1>

        <p className="text-xl text-slate-500 max-w-2xl mb-10">
          Photograph a hand-drawn layout. Our AI turns it into a real, editable web page you can
          refine visually and export as clean HTML/CSS.
        </p>

        <div>
          <Link href="/signup" className="px-8 py-4 rounded-xl bg-slate-900 text-white font-semibold shadow-lg hover:shadow-xl transition-all inline-block hover:-translate-y-1">
            Start free
          </Link>
        </div>
```
Also replace the three feature titles with: `Sketch to Site`, `Visual Refinement`, `Portable Export`, and the "PaperPage Studio is Active" badge text with `Sketch to Site — now in v1`.

- [ ] **Step 4: Update `app/layout.tsx` metadata**

```tsx
export const metadata = {
  title: 'PaperPage — Sketch to Site',
  description: 'Turn a hand-drawn sketch into an editable, exportable web page.',
};
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: build succeeds with no references to removed files. Then `npm test` → all unit tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Figma-ingestion code, retarget marketing to signup"
```

### Task 23: Rewrite `CLAUDE.md` to the new product

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: `CLAUDE.md` describing the "Sketch to Site" product: pipeline (sketch → Gemini Vision → IR → renderer → GrapesJS → zip), the routes/tables/buckets actually built, the new dependencies, and an accurate Implementation Status (v1 features Implemented; phase-2 items listed as out of scope). Remove all Figma-PAT ingestion, `/api/chat`, `IntegrationWizard`, and `exportEcosystem` references.

- [ ] **Step 1: Rewrite `CLAUDE.md`**

Replace the file so it documents, at minimum:
- Product = "Sketch to Site" (photo of a hand-drawn sketch → editable page → HTML/CSS zip). Remove the Figma-URL premise.
- Architecture per spec §3 (Next.js 16 App Router, Supabase Auth/Postgres/Storage, Gemini Vision server-side, Approach B/B1 one-way render).
- Routes table: `/`, `/login`, `/signup`, `/dashboard`, `/studio/[projectId]`, and APIs `/api/projects`, `/api/projects/[id]`, `/api/generate`, `/api/assets`.
- Data model: `profiles`, `projects`, `project_assets` (+ `sketches`/`assets` buckets), all RLS-scoped to `auth.uid()`.
- Generation pipeline: IR Zod schema (`utils/ir/schema.ts`), deterministic renderer (`utils/renderer.ts`), safe-by-construction HTML.
- Dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `@google/generative-ai`, `grapesjs`, `zod`, `jszip`, `sharp`; `GEMINI_API_KEY` server-only.
- Directory structure reflecting the files created in this plan.
- Conventions: App Router only; generated pages are plain HTML/CSS (not Tailwind); Gemini server-side only; RLS via user-scoped server client; GrapesJS dynamically imported/client-only.
- Implementation Status: v1 (this plan) Implemented; Figma export / AI chat / version history explicitly Phase 2.
- Keep the Maintenance Note (this file is the master spec; keep it in sync).

- [ ] **Step 2: Sanity check**

Run: `git grep -nE "IntegrationWizard|exportEcosystem|verify-figma|Figma link|Figma-to-Code" -- CLAUDE.md`
Expected: no stale Figma-ingestion references remain (mentions of Figma *export as phase 2* are fine).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md for Sketch to Site v1"
```

---

## Final Verification (maps to spec §10 Success Criteria)

- [ ] **SC1 — Signup → empty dashboard:** New email/password signup lands on an empty `/dashboard`.
- [ ] **SC2 — Sketch → page ≤ ~30s:** Create project, upload a hand-drawn sketch photo, see a coherent section-structured page in the editor within ~30s.
- [ ] **SC3 — Visual refine:** Change colors/fonts/spacing, reorder/add sections, replace an image placeholder with an uploaded image — all visually.
- [ ] **SC4 — Persistence:** Edits autosave and survive a page refresh / re-login.
- [ ] **SC5 — Portable export:** Export a `.zip` of HTML/CSS with bundled images that opens as a static site with no Supabase dependency.
- [ ] **SC6 — Cleanup:** Old Figma-ingestion paths removed; `CLAUDE.md` reflects the new product.
- [ ] **Full suite green:** `npm test` (unit) passes and `npm run build` succeeds.

---

## Self-Review Notes (author checklist — completed during planning)

- **Spec coverage:** D1–D10 and §4–§9 map to tasks — Gemini/IR/renderer (T10–13), GrapesJS curated editor (T15–16), assets (T17–19), export (T20–21), auth/RLS (T1–4, migrations T3/T6/T13/T17), cleanup+docs (T22–23). Phase-2 items (Figma export, chat, versions) intentionally have no tasks.
- **Placeholders:** None — every code step contains complete code; migration SQL is full; UI verification steps are explicit console/browser procedures (GrapesJS/network flows aren't unit-testable, so they use manual verification rather than fake tests, while all pure logic — name, schema, renderer, debounce, bundle — is TDD'd).
- **Type consistency:** `PageIR`/`renderPage`/`validateIR`/`callGeminiVision`/`downscaleImage`/`buildSiteZip`/`debounce`/`normalizeProjectName` names and signatures are used identically across producing and consuming tasks. `editorRef` is threaded from StudioClient → Editor → ExportButton consistently.
