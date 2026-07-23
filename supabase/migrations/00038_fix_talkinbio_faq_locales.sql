-- Fixes the reserved "talkinbio" demo business's FAQ block. Its content had been hand-edited
-- through the admin panel at some point using a buggy path that did `{...oldStringValue, en: ...}`
-- on plain-string question/answer fields — that spreads a string into numeric-index char keys
-- (e.g. {"0":"S","1":"a",...}) instead of replacing it, and left "tr" (and always "ru") unset for
-- two of the three items. The FAQ renderer falls back to the raw (object) value when
-- item.question/answer[locale] is missing, so those items only rendered correctly in English —
-- Turkish (the primary language) and Russian were broken. Other pages (e.g. ulianapehlivan)
-- don't have this problem because their FAQ data was written entirely through the addFAQ agent
-- tool, which always saves fully locale-keyed {tr, en, ru} items.
--
-- This restores the real live copy (recovered from the corrupted row's char-spread keys and its
-- surviving "en" values — Starter/Pro/Business pricing, actual setup time) with clean {tr, en, ru}
-- keys on every item, translating what was missing.
update public.blocks
set content = '{
  "tr": {"title": "Sıkça Sorulanlar"},
  "en": {"title": "FAQ."},
  "ru": {"title": "Часто задаваемые вопросы"},
  "layoutVariant": "accordion",
  "items": [
    {
      "question": {"tr": "Saule nedir?", "en": "What is Saule?", "ru": "Что такое Saule?"},
      "answer": {
        "tr": "Saule, işletmenizin dijital resepsiyon asistanıdır. Ziyaretçilerin sorularını yanıtlar ve ilgilenenler hakkında bilgi toplar; tıpkı şu anda sizinle konuşuyormuş gibi.",
        "en": "Saule is your business''s digital front desk assistant. It answers visitors'' questions and gathers information on those interested — just like it''s talking to you right now.",
        "ru": "Saule — цифровой ресепшн-ассистент вашего бизнеса. Она отвечает на вопросы посетителей и собирает информацию о заинтересованных — точно так же, как сейчас общается с вами."
      }
    },
    {
      "question": {"tr": "Fiyatı nedir?", "en": "What is the price?", "ru": "Сколько это стоит?"},
      "answer": {
        "tr": "Starter $9/ay (200 kredi), Pro $29/ay (700 kredi), Business $79/ay (1.800 kredi). Yıllık ödemede %20 indirim var. Fiyatlar dolara sabittir; TL karşılığı güncel kurdan hesaplanır. Ücretsiz deneme yok — erken erişim kontenjanı sınırlı ve ücretlidir.",
        "en": "Starter $9/month (200 credits), Pro $29/month (700 credits), Business $79/month (1,800 credits). There''s a 20% discount on annual payments. Prices are fixed in dollars; the Turkish Lira equivalent will be calculated using the current exchange rate. No free trial — early access is limited and subject to a fee.",
        "ru": "Starter $9/мес (200 кредитов), Pro $29/мес (700 кредитов), Business $79/мес (1800 кредитов). При годовой оплате скидка 20%. Цены зафиксированы в долларах; эквивалент в турецких лирах рассчитывается по актуальному курсу. Бесплатной пробной версии нет — ранний доступ ограничен и платный."
      }
    },
    {
      "question": {"tr": "Kurulumu ne kadar sürer?", "en": "How long does the installation take?", "ru": "Сколько времени занимает установка?"},
      "answer": {
        "tr": "Yaklaşık 10 dakika — Beiwe adlı kurulum asistanımızla sohbet ederek sayfanı oluşturabilirsin.",
        "en": "In about 10 minutes — you can create your page by chatting with our setup assistant, Beiwe.",
        "ru": "Около 10 минут — вы можете создать свою страницу, пообщавшись с нашим ассистентом по настройке Beiwe."
      }
    }
  ]
}'::jsonb
where business_id = '11111111-1111-1111-1111-111111111111'::uuid
  and type = 'faq';
