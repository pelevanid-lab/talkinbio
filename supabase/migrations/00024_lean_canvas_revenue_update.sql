-- Gelir Kalemleri kutusunu fiyatlama kararı (2026-07-17) ile güncelle.
-- Fiyatlar dolara sabit; TL tahsilat güncel kur üzerinden yapılır.
-- Daha önce kanvasta "açık soru" olarak bırakılan fiyat modeli bu migration ile kapanır.
UPDATE lean_canvas
SET
  data = jsonb_set(
    data,
    '{revenueStreams}',
    '[
      "Starter $9/ay → 200 kredi (yıllık %20 indirim: $7,2/ay)",
      "Pro $29/ay → 700 kredi (yıllık %20 indirim: $23,2/ay)",
      "Business $79/ay → 1.800 kredi (yıllık %20 indirim: $63,2/ay)",
      "Ek kredi paketi: $5 → 100 kredi (birim pahalı — plana yükseltme teşviki)",
      "Fiyatlar dolara sabit; TL tahsilat güncel kur üzerinden (karar 2026-07-17)",
      "Kredi devri: kullanılmayan krediler devreder, bakiye tavanı 2 aylık kota",
      "Kredi bitince asistan kapanmaz — sayfa + mesaj bırak modu yaşar (ücretsiz katman efekti)",
      "Birim ekonomi: $0,045/kredi; Starter marjı %69 (tipik kullanım), en dar senaryo %11 (yalnızca güncelleme)"
    ]'::jsonb
  ),
  updated_at = now()
WHERE id = 1;

-- Eğer henüz kayıt yoksa (ilk kurulum) boş satır oluştur ve güncelle
INSERT INTO lean_canvas (id, data)
SELECT 1, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM lean_canvas WHERE id = 1);

UPDATE lean_canvas
SET
  data = jsonb_set(
    data,
    '{revenueStreams}',
    '[
      "Starter $9/ay → 200 kredi (yıllık %20 indirim: $7,2/ay)",
      "Pro $29/ay → 700 kredi (yıllık %20 indirim: $23,2/ay)",
      "Business $79/ay → 1.800 kredi (yıllık %20 indirim: $63,2/ay)",
      "Ek kredi paketi: $5 → 100 kredi (birim pahalı — plana yükseltme teşviki)",
      "Fiyatlar dolara sabit; TL tahsilat güncel kur üzerinden (karar 2026-07-17)",
      "Kredi devri: kullanılmayan krediler devreder, bakiye tavanı 2 aylık kota",
      "Kredi bitince asistan kapanmaz — sayfa + mesaj bırak modu yaşar (ücretsiz katman efekti)",
      "Birim ekonomi: $0,045/kredi; Starter marjı %69 (tipik kullanım), en dar senaryo %11 (yalnızca güncelleme)"
    ]'::jsonb
  ),
  updated_at = now()
WHERE id = 1
  AND (data->'revenueStreams' IS NULL OR data->'revenueStreams' = '[]'::jsonb);
