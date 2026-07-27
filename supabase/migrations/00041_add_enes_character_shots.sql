alter table public.character_shots drop constraint character_shots_character_id_check;
alter table public.character_shots add constraint character_shots_character_id_check check (character_id in ('saule', 'beiwe', 'enes'));
