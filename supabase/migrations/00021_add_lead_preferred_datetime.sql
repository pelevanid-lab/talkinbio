-- Structured appointment request field (Faz 1.5) — not a calendar integration, just a text hint.
alter table public.leads add column preferred_datetime text;
