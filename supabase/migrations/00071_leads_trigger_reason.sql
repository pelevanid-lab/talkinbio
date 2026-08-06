-- Lead formu artık iki farklı sebepten açılabiliyor: Saule bir soruya cevap bulamadığında
-- (veya kredi bittiğinde) YA DA ziyaretçi gerçekten etkileşimdeyken proaktif olarak davet
-- edildiğinde (bkz. checkLeadPromptThreshold — 5 tıklama + 2 başarılı cevap eşiği). Bu ikisi
-- analiz sayfasında ayrı ayrı raporlanabilsin diye — özet metnini örüntü eşleştirmeyle
-- ayrıştırmak yerine (kırılgan, dile bağımlı) — yapılandırılmış bir sütun ekleniyor.
alter table public.leads add column trigger_reason text;
-- 'no_match' | 'credits_exhausted' | 'proactive' | null (eski kayıtlar / Instagram DM gibi
-- bu akıştan geçmeyen yollar için null — "diğer" olarak raporlanır, hata değildir)
