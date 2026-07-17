-- Karar (2026-07-17, Enes): ücretsiz deneme/erken erişim YOK — ilk 10 müşteri öder;
-- tek ücretsiz hesap test kullanıcısıdır (Uliana Pehlivan). Demo işletmenin (00023)
-- "erken erişim ücretsiz" mesajları gerçek fiyatlarla değiştirilir.

-- FAQ bloğundaki "Fiyatı ne olacak?" cevabı güncellenir
update public.blocks
set content = jsonb_set(
  content,
  '{items}',
  '[
    {"question": "Saule nedir?", "answer": "Saule, işletmenizin dijital ön masa asistanı. Ziyaretçilerinizin sorularını yanıtlar, ilgilenenlerin bilgilerini toplar — tıpkı şu an seninle konuştuğu gibi."},
    {"question": "Fiyatı nedir?", "answer": "Starter $9/ay (200 kredi), Pro $29/ay (700 kredi), Business $79/ay (1.800 kredi). Yıllık ödemede %20 indirim var. Fiyatlar dolara sabittir; TL karşılığı güncel kurdan hesaplanır. Ücretsiz deneme yok — erken erişim kontenjanı sınırlı ve ücretlidir."},
    {"question": "Kurulumu ne kadar sürer?", "answer": "Yaklaşık 10 dakika — Beiwe adlı kurulum asistanımızla sohbet ederek sayfanı oluşturabilirsin."}
  ]'::jsonb
)
where business_id = '11111111-1111-1111-1111-111111111111'::uuid and type = 'faq';

-- Bilgi tabanındaki fiyatlandırma notu güncellenir
update public.saule_knowledge
set content = 'Fiyat sorulduğunda net ol: Starter $9/ay → 200 kredi, Pro $29/ay → 700, Business $79/ay → 1.800; yıllık ödemede %20 indirim. Fiyatlar dolara sabittir, TL karşılığı güncel kurdan hesaplanır. ÜCRETSİZ DENEME YOK — bunu dürüstçe söyle, "ücretsiz" vaadi verme. İlgilenen ziyaretçiyi isim/e-posta bırakarak sınırlı erken erişim kontenjanına başvurmaya yönlendir.'
where business_id = '11111111-1111-1111-1111-111111111111'::uuid and title = 'Fiyatlandırma';
