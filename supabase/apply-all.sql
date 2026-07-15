-- PaperPage v1 — full schema + storage setup.
-- Paste this whole file into the Supabase SQL Editor and Run ONCE.
-- (Safe on a fresh project. Re-running will error on the create policy lines — that's expected; it means they already exist.)

-- ============================================================
-- 0001_profiles.sql
-- ============================================================
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

-- ============================================================
-- 0002_projects.sql
-- ============================================================
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

-- ============================================================
-- 0003_storage_sketches.sql
-- ============================================================
insert into storage.buckets (id, name, public)
values ('sketches', 'sketches', false)
on conflict (id) do nothing;

create policy "Sketch objects readable by owner"
  on storage.objects for select
  using (bucket_id = 'sketches' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Sketch objects insertable by owner"
  on storage.objects for insert
  with check (bucket_id = 'sketches' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Sketch objects updatable by owner"
  on storage.objects for update
  using (bucket_id = 'sketches' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'sketches' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Sketch objects deletable by owner"
  on storage.objects for delete
  using (bucket_id = 'sketches' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 0004_assets.sql
-- ============================================================
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

