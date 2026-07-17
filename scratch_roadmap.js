const fs = require('fs');
let content = fs.readFileSync('c:/Users/enesp/talkinbio/ROADMAP.md', 'utf8');

const phaseS = `## Faz S — Marketing (Sürekli, Paralel)

Talkinbio'nun görünürlüğünü, arama motoru otoritesini ve sosyal kanıtını inşa eden yapı taşı. Yalnızca organik trafik değil, aynı zamanda işletmelerin kendi müşterilerini çekeceği "vitrin" (Linktree büyüme modeli) işlevini de içerir.

### S.1 SEO ve Büyüme Temelleri
- **Sitemap & Otomatik İndeksleme:** Yayınlanan her yeni işletme profili (\`is_published = true\`) sitemap'e otomatik olarak eklenir. 
- **Locale-Bazlı Metadata (i18n):** Türkçe, İngilizce ve Rusça dilleri için özel \`title\` ve \`description\` tagleri üretilir. Hreflang etiketleriyle arama motorlarına doğru dil versiyonları sunulur.
- **Marka Araması Optimizasyonu:** Google Search Console ve Bing Webmaster entegrasyonu; marka (Talkinbio) aramalarında logo ve doğru site açıklaması (site-links) çıkartılması.
- **Microdata & JSON-LD:**
  - \`Organization\` şeması (Talkinbio'nun kendi kurumsal otoritesi için).
  - \`LocalBusiness\` şeması (Kullanıcıların kendi sayfalarının Google yerel aramalarda çıkması için — ürüne doğrudan satış argümanıdır).

### S.2 İçerik ve Otorite İnşası
- **Örnek Müşteri Hikayeleri:** Ücretli pilotların (\`Faz P\`) başarı hikayelerinin blog formatında yayınlanması.
- **Kullanım Senaryoları (Use Cases):** "Kuaförler için AI", "Danışmanlar için Randevu Asistanı" gibi sektörel dikey açılış sayfaları (Landing Page'ler) hazırlanması.
- **Backlink Stratejisi:** Dizinler, Product Hunt lansmanı ve indie-hacker forumlarında aktif görünürlük.

### S.3 Dönüşüm Oranı Optimizasyonu (CRO)
- **A/B Testleri:** Landing page üzerindeki "Erken Erişim" butonlarının yerleşimi ve metinlerinin dönüşüme etkisinin ölçülmesi.
- **Saule İmzası:** Müşterilerin widget'larında yer alan "Saule ile konuşuyorsunuz" imzasından gelen trafiğin (UTM parametreleri ile) ölçümlenmesi ve viral büyüme katsayısının (K-factor) izlenmesi.

### Kabul Kriterleri
- [ ] Zengin sonuç testi (Rich Results Test) tüm şemaları doğruluyor.
- [ ] Yayınlanan her profil sitemap'te yer alıyor ve Search Console'da indeksleniyor.
- [ ] UTM ile gelen trafik ve widget imzası dönüşümleri admin panelinde izlenebiliyor.`;

const phaseP = `## Faz P — Customer Operations (Sürekli, Paralel)

Mühendislik işlerinden bağımsız, Çekim Gücü (Traction) Yol Haritasının kalbini oluşturan ve "Müşteri ödemeye hazır mı?" riskini test eden operasyonel aşama. Ürün geliştirmeyi beklemek yerine, erken aşama manuel operasyonlarla döngüyü tamamlar.

### P.1 Problem Görüşmeleri & Geri Bildirim Döngüsü
- **Hedef Kitle Teması:** Sürekli olarak hedef segmentle (randevu bazlı, DM'den müşteri alan hizmet verenler) görüşmeler yapılması.
- **Kanıt Toplama:** Çözüm göstermeden, yaşanan mevcut DM yükünün ve kaçan potansiyel müşterilerin acı noktasının dinlenmesi.
- **Fiyat Testi:** Görüşme sonunda doğrudan "$9/ay öder miydin?" sorusuyla fiyat hassasiyetinin ölçülmesi ve Pivot Günlüğü'ne işlenmesi.

### P.2 Ücretli Pilot (Concierge Onboarding)
- **Ücretsiz Deneme YOK:** Ürünün gerçek değerini test etmek için ilk günden ücret alınması. 
- **Manuel Tahsilat & Kurulum:** Fatura altyapısı (Stripe/Iyzico) hazır olana kadar tahsilatların manuel yapılması.
- **Birlikte Kurulum:** İlk 10 müşterinin Beiwe kurulumunun doğrudan ekibimiz eşliğinde (Concierge Onboarding) 10 dakika içinde yapılması.
- **Değer İspatı:** 30 günün sonunda müşteriye "gerçekte kaç lead toplandığı" ve "zaman tasarrufu" metrikleriyle ROI (Yatırım Getirisi) gösterimi.

### P.3 Sürekli Denetim ve Ritim
- **Ayna-Odası Kuralı:** Mühendislik illüzyonuna düşmemek için her ay sorulan kritik soru: "Bu ay hangi varsayım GERÇEK müşteriyle test edildi?"
- **Haftalık Gözden Geçirme:** Pilot işletmelerin Saule üzerinden aldıkları konuşma transkriptlerinin ve lead verilerinin kalitesinin haftalık olarak incelenmesi.

### Kabul Kriterleri
- [ ] 20 problem görüşmesi tamamlandı, bulgular pivot günlüğüne eklendi.
- [ ] İlk 10 ücretli pilot işletme yayında ve ödemeleri manuel olarak tahsil edildi.
- [ ] "Müşteri para öder mi?" varsayımı (Çekim Gücü Aşama 1) kesin olarak Doğrulandı/Çürütüldü olarak işaretlendi.`;

content = content.replace(/## Faz S — SEO & marka temelleri[\s\S]*?(?=## Faz P)/, phaseS + '\n\n---\n\n');
content = content.replace(/## Faz P — Pilot & müşteri geliştirme[\s\S]*?(?=---|\n## Faz 3)/, phaseP + '\n\n---\n\n');

fs.writeFileSync('c:/Users/enesp/talkinbio/ROADMAP.md', content, 'utf8');
