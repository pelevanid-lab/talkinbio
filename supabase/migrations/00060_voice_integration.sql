
-- Add tracking for voice interactions to conversations (chat_sessions)
alter table public.conversations
  add column if not exists has_voice_interaction boolean default false;
