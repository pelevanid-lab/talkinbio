-- Referans ses kaydının deşifresini (whisper çıktısı) kalıcı olarak sakla.
--
-- Sebep: F5-TTS'e `ref_text` vermek zorunlu değil ama dil doğru anlaşılsın ve model
-- halüsinasyon görmesin diye kritik. Bugüne kadar bu deşifre HER ses üretiminde
-- yeniden hesaplanıyordu — referans hiç değişmediği hâlde her "Seslendir" tıklaması
-- önce whisper'ı, sonra f5-tts'i çağırıyordu. Yani her üretimde iki kuyruk işi,
-- iki bekleme, iki fatura kalemi.
--
-- Deşifre artık referans yüklenirken bir kez yapılıp buraya yazılıyor; üretim
-- yalnızca f5-tts çağırıyor.
--
-- NULL bırakılabilir: eskiden yüklenmiş referanslarda bu alan boş olacak, o durumda
-- kod eski davranışa (üretim anında whisper) düşer.

ALTER TABLE public.character_profiles
  ADD COLUMN IF NOT EXISTS voice_ref_text text;
