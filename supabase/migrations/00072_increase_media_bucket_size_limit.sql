-- Raise the 'media' storage bucket's per-object size cap to 300MB, matching the client-side
-- check in MediaUploader.tsx. The bucket was created (00004_create_storage.sql) with no
-- file_size_limit, which means Supabase falls back to the project's global Storage upload
-- limit (Dashboard → Project Settings → Storage) — that global setting is a separate hard
-- ceiling this migration cannot change, and must be raised to >= 300MB there too or large
-- uploads will still be rejected with "The object exceeded the maximum allowed size".
update storage.buckets
set file_size_limit = 314572800 -- 300 * 1024 * 1024 bytes
where id = 'media';
