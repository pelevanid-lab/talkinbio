-- Bug: "Talepler" sayfasında lead silinemiyor. Kanıtlandı: canlı DB'de leads
-- tablosunun SELECT/UPDATE'i çalışıyor ama DELETE sessizce 0 satır etkiliyor
-- (RLS hatasız 200 dönüyor, silinen satır yok). 00001'deki tek "for all" policy
-- ile canlı DB'deki policy'nin DELETE komutunu artık kapsamadığı görülüyor
-- (muhtemelen Supabase Studio üzerinden policy düzenlenirken drift oluştu).
-- Conversations tablosundaki (00027) gibi komut bazında ayrı policy'lere bölünüyor
-- ki tek bir komutun devre dışı kalması diğerlerini sessizce etkilemesin.
drop policy if exists "Owners can view and manage their business leads" on public.leads;

create policy "Owners can view their business leads" on public.leads for select using (
    auth.uid() in (select owner_id from public.businesses where id = public.leads.business_id)
);
create policy "Owners can insert their business leads" on public.leads for insert with check (
    auth.uid() in (select owner_id from public.businesses where id = public.leads.business_id)
);
create policy "Owners can update their business leads" on public.leads for update using (
    auth.uid() in (select owner_id from public.businesses where id = public.leads.business_id)
);
create policy "Owners can delete their business leads" on public.leads for delete using (
    auth.uid() in (select owner_id from public.businesses where id = public.leads.business_id)
);
