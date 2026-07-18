-- Faz 4.1 kötüye kullanım koruması: flood ve günlük tavan sorguları join olmadan
-- tek tabloya count atabilsin diye messages'a denormalize business_id eklenir.
alter table public.messages add column business_id uuid references public.businesses(id) on delete cascade;

update public.messages m
set business_id = c.business_id
from public.conversations c
where m.conversation_id = c.id and m.business_id is null;

alter table public.messages alter column business_id set not null;

create index if not exists idx_messages_business_created on public.messages(business_id, created_at);

-- Oturum açma hızı sınırı ve mevcut "aktif konuşmayı bul" sorgusu (run.ts) için.
create index if not exists idx_conversations_business_visitor_created on public.conversations(business_id, visitor_session_id, created_at);
