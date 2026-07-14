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
