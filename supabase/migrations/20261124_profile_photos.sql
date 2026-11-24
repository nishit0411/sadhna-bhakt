-- Profile photos
-- Run once in Supabase → SQL Editor. Safe to re-run. Adds a column and a
-- storage bucket; does not change or delete any existing data.
--
-- Storage layout: avatars/<user id>/<timestamp>.webp
-- The app resizes every photo in the browser to 256×256 WebP (~15–40 KB)
-- before upload, so 1,000 devotees ≈ 40 MB — far inside the free 1 GB.

-- 1. Where the photo's public URL is kept
alter table public.profiles add column if not exists avatar_url text;

-- 2. Bucket: public read (photos show in <img> without signed URLs),
--    max 1 MB per file, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Who may write: each signed-in user only inside their own folder
--    (avatars/<their id>/...). Admins may also remove any photo.
--    Reading is public because the bucket is public.
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own_or_admin" on storage.objects;
create policy "avatars_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
