-- setup_messages (00009_add_business_theme.sql) only ever got a SELECT policy — the comment
-- there assumed all writes went through the API route's service-role key. But
-- EditorClient.tsx's archiveCurrentAndNewSession() (used by the manual "Bloğu Düzenle" save
-- flow, among others) inserts a system message directly from the browser with the anon key,
-- which RLS silently rejects with 403 since no INSERT policy exists for authenticated users.
-- The block save itself already succeeded by the time this runs, but the 403 then throws,
-- surfacing a false "Kaydedilirken hata oluştu" alert on every manual block save — including
-- ones that actually worked (e.g. media position changes), which reads to the owner as "this
-- setting doesn't work" even when it did.
create policy "Owners can insert their own setup messages" on public.setup_messages for insert
with check (
    auth.uid() in (select owner_id from public.businesses where id = public.setup_messages.business_id)
);
