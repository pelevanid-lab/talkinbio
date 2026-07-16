-- Conversation metadata for owner-facing transcript view (Faz 1.1)
alter table public.conversations add column last_message_at timestamptz;
alter table public.conversations add column is_read boolean default false;
alter table public.conversations add column is_preview boolean default false; -- used starting Faz 1.7

-- Backfill last_message_at from existing messages
update public.conversations c
set last_message_at = (
  select max(m.created_at) from public.messages m where m.conversation_id = c.id
);
