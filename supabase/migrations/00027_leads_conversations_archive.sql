-- İşletme sahibi kendi lead/konuşma kayıtlarını arşivleyebilsin ya da kalıcı olarak silebilsin.
alter table public.leads add column is_archived boolean default false;
alter table public.conversations add column is_archived boolean default false;

-- leads tablosunda zaten "for all" policy var (00001), silme/güncelleme dahil.
-- conversations'ta yalnızca SELECT vardı; arşivleme (update) ve silme (delete) için ekleniyor.
-- messages.conversation_id "on delete cascade" olduğundan bir konuşma silinince mesajları da gider.
create policy "Owners can update their business conversations" on public.conversations for update using (
    auth.uid() in (select owner_id from public.businesses where id = public.conversations.business_id)
);
create policy "Owners can delete their business conversations" on public.conversations for delete using (
    auth.uid() in (select owner_id from public.businesses where id = public.conversations.business_id)
);
