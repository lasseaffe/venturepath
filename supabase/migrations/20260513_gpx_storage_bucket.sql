-- VenturePath · GPX Storage Bucket (Spec 0)
-- Apply with service role. Public read gated by pro_paths.is_curated.
-- Object naming convention: <pro_path_id>.gpx at bucket root.

insert into storage.buckets (id, name, public)
  values ('gpx', 'gpx', false)
  on conflict (id) do nothing;

drop policy if exists "gpx_public_read_curated" on storage.objects;
create policy "gpx_public_read_curated"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'gpx'
    and exists (
      select 1 from pro_paths p
      where p.id::text = split_part(name, '.', 1)
        and p.is_curated = true
    )
  );

drop policy if exists "gpx_architect_write" on storage.objects;
create policy "gpx_architect_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gpx'
    and exists (
      select 1 from pro_paths p
      where p.id::text = split_part(name, '.', 1)
        and p.architect_id = auth.uid()
    )
  );
