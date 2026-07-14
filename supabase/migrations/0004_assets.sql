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
