-- Beiwe "new chat" was client-side only until the first message landed, so a session
-- started and abandoned (no message sent) would vanish on reload and the previous
-- session would resurface. This adds a real archive flag and lets sessions be
-- persisted the moment they're created, not just on first message.
alter table public.setup_sessions add column if not exists is_archived boolean default false;
