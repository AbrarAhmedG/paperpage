-- Capture the user's name at signup: stored in auth user_metadata by the
-- client and mirrored into profiles by the signup trigger.
alter table public.profiles add column if not exists full_name text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data->>'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
