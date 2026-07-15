-- Add source_username to leads table
alter table public.leads
add column source_username text;
