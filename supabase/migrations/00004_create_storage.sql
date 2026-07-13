-- Create the storage bucket for media files
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Policy to allow anyone to view media files
create policy "Public Access to media"
on storage.objects for select
using ( bucket_id = 'media' );

-- Policy to allow authenticated users to upload media files
create policy "Authenticated users can upload media"
on storage.objects for insert
with check ( bucket_id = 'media' and auth.role() = 'authenticated' );

-- Policy to allow authenticated users to update/delete their own uploads
create policy "Users can update own media"
on storage.objects for update
using ( bucket_id = 'media' and auth.uid() = owner );

create policy "Users can delete own media"
on storage.objects for delete
using ( bucket_id = 'media' and auth.uid() = owner );
