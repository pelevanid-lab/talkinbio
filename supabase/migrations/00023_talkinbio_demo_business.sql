-- Faz 1.6: reserved "talkinbio" demo business — on the landing page, Saule answers on
-- Talkinbio's own behalf (dogfooding: the phone mockup's chat is the real product, not a screenshot).
-- Fixed id so the app can reference it via the TALKINBIO_BUSINESS_ID env var without a lookup.
-- Owner is Enes's real Supabase Auth account (enespehlivan@live.com), confirmed via auth.users.
insert into public.businesses (id, owner_id, username, name, category, contact_method, contact_value, primary_language, is_published, saule_settings)
select
  '11111111-1111-1111-1111-111111111111'::uuid,
  '51ace037-2985-4351-b82b-fe4a85f6469a'::uuid,
  'talkinbio',
  'Talkinbio',
  'SaaS / Dijital Asistan',
  'email',
  'hello@talkinbio.com',
  'tr',
  true,
  '{"personalityTone": "friendly", "leadCaptureEnabled": false, "appointmentEnabled": false}'::jsonb
where not exists (select 1 from public.businesses where username = 'talkinbio');

-- About
insert into public.blocks (business_id, type, title, content, "order", is_visible)
select '11111111-1111-1111-1111-111111111111'::uuid, 'about', 'Hakkında',
  '{
    "tr": {"title": "Hakkında", "text": "Talkinbio, küçük işletmelerin sosyal medyadan gelen müşteri sorularını 7/24 yanıtlayan, randevu ve iletişim bilgisi toplayan bir dijital asistan — Saule — ile kendi işletme sayfasını dakikalar içinde kurmasını sağlar. Şu an konuştuğun Saule, gerçek ürünün ta kendisi: merak ettiğin her şeyi sorabilirsin."},
    "en": {"title": "About", "text": "Talkinbio helps small businesses launch their own page in minutes, backed by Saule — a digital assistant that answers customer questions from social media 24/7 and captures appointment and contact info. The Saule you are talking to right now is the real product — ask anything you are curious about."},
    "ru": {"title": "О нас", "text": "Talkinbio помогает малому бизнесу за считанные минуты запустить свою страницу с цифровым ассистентом Saule, который круглосуточно отвечает на вопросы клиентов из соцсетей и собирает заявки на запись и контакты. Saule, с которой вы сейчас общаетесь — настоящий продукт, спрашивайте всё, что вас интересует."},
    "layoutVariant": "standard"
  }'::jsonb,
  1, true
where exists (select 1 from public.businesses where id = '11111111-1111-1111-1111-111111111111'::uuid)
on conflict (business_id, singleton_key) do nothing;

-- Services (capability highlights — no pricing tiers, since billing isn't live yet)
insert into public.blocks (business_id, type, title, content, "order", is_visible)
select '11111111-1111-1111-1111-111111111111'::uuid, 'services', 'Neler Yapabilir',
  '{
    "tr": {"title": "Neler Yapabilir"},
    "en": {"title": "What It Can Do"},
    "ru": {"title": "Что она умеет"},
    "layoutVariant": "grid-cards",
    "items": [
      {
        "tr": {"title": "7/24 Müşteri Sohbeti", "description": "Ziyaretçileriniz sorularını sorar, Saule anında ve doğru yanıtlar verir."},
        "en": {"title": "24/7 Customer Chat", "description": "Visitors ask questions, Saule answers instantly and accurately."},
        "ru": {"title": "Чат с клиентами 24/7", "description": "Посетители задают вопросы, Saule отвечает мгновенно и точно."}
      },
      {
        "tr": {"title": "Randevu & İletişim Toplama", "description": "İlgilenen müşterilerin bilgilerini toplar, siz sadece geri dönüş yaparsınız."},
        "en": {"title": "Appointments & Contact Capture", "description": "Collects interested customers'' info so you only need to follow up."},
        "ru": {"title": "Заявки и контакты", "description": "Собирает данные заинтересованных клиентов — вам остаётся только связаться с ними."}
      },
      {
        "tr": {"title": "Kolay Yönetim Paneli", "description": "İçeriğinizi ve Saule''nin bildiklerini dakikalar içinde güncelleyin."},
        "en": {"title": "Easy Management Panel", "description": "Update your content and what Saule knows in minutes."},
        "ru": {"title": "Простая панель управления", "description": "Обновляйте контент и знания Saule за считанные минуты."}
      }
    ]
  }'::jsonb,
  2, true
where exists (select 1 from public.businesses where id = '11111111-1111-1111-1111-111111111111'::uuid)
on conflict (business_id, singleton_key) do nothing;

-- FAQ (single-language block, per addFAQ convention — written in the business's primary language)
insert into public.blocks (business_id, type, title, content, "order", is_visible)
select '11111111-1111-1111-1111-111111111111'::uuid, 'faq', 'Sıkça Sorulanlar',
  '{
    "tr": {"title": "Sıkça Sorulanlar"},
    "en": {"title": "Sıkça Sorulanlar"},
    "ru": {"title": "Sıkça Sorulanlar"},
    "layoutVariant": "chips",
    "items": [
      {"question": "Saule nedir?", "answer": "Saule, işletmenizin dijital ön masa asistanı. Ziyaretçilerinizin sorularını yanıtlar, ilgilenenlerin bilgilerini toplar — tıpkı şu an seninle konuştuğu gibi."},
      {"question": "Fiyatı ne olacak?", "answer": "Şu anda erken erişim aşamasındayız ve ücretsiz. Erişim talebi bırakırsan sana en kısa sürede ulaşırız."},
      {"question": "Kurulumu ne kadar sürer?", "answer": "Birkaç dakika — Beiwe adlı kurulum asistanımızla sohbet ederek sayfanı oluşturabilirsin."}
    ]
  }'::jsonb,
  3, true
where exists (select 1 from public.businesses where id = '11111111-1111-1111-1111-111111111111'::uuid)
on conflict (business_id, singleton_key) do nothing;

-- Sales-scenario knowledge notes (Faz 1.4 knowledge base, used here for the demo's sales guidance)
insert into public.saule_knowledge (business_id, title, content)
select '11111111-1111-1111-1111-111111111111'::uuid, 'Fiyatlandırma',
  'Fiyat sorulduğunda: Talkinbio şu anda erken erişim aşamasında ve ücretsiz. Bunu söyle ve ziyaretçiyi isim/e-posta bırakarak erişim talebinde bulunmaya yönlendir.'
where exists (select 1 from public.businesses where id = '11111111-1111-1111-1111-111111111111'::uuid)
  and not exists (select 1 from public.saule_knowledge where business_id = '11111111-1111-1111-1111-111111111111'::uuid and title = 'Fiyatlandırma');

insert into public.saule_knowledge (business_id, title, content)
select '11111111-1111-1111-1111-111111111111'::uuid, 'Ürün Kapsamı',
  'Talkinbio iki agent sunar: Beiwe (sayfa kurulum asistanı) ve Saule (müşteri karşılama asistanı — şu an konuşulan asistan). Şu an WhatsApp/Instagram DM''den doğrudan otomatik yanıt yok; ig.me/wa.me yönlendirme linkleri kullanılıyor, bu kanallar yol haritasında yakında geliyor.'
where exists (select 1 from public.businesses where id = '11111111-1111-1111-1111-111111111111'::uuid)
  and not exists (select 1 from public.saule_knowledge where business_id = '11111111-1111-1111-1111-111111111111'::uuid and title = 'Ürün Kapsamı');
