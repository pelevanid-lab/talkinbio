-- Optional display title shown at the top of the public page, separate from `name`
-- (which is the internal workspace name used e.g. for the chat assistant label).
-- Falls back to `name` wherever it's blank.
alter table public.businesses add column if not exists page_title text;
