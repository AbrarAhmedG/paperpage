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
