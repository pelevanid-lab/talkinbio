-- Karakter ID kısıtlamalarını (check constraint) kaldırır
-- Artık dinamik karakterler (ör. enes2 veya kullanıcıların oluşturdukları) desteklendiği için,
-- karakter ID'sinin sadece belirli ('saule', 'beiwe', 'enes') değerler olmasını zorunlu tutamayız.

ALTER TABLE public.character_shots 
DROP CONSTRAINT IF EXISTS character_shots_character_id_check;

ALTER TABLE public.character_motions 
DROP CONSTRAINT IF EXISTS character_motions_character_id_check;
