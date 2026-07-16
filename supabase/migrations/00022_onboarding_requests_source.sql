-- Track which channel produced an access request (Faz 1.6): 'form' (request-access page) vs 'saule' (landing demo chat)
alter table public.onboarding_requests add column if not exists source text default 'form';
