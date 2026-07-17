const fs = require('fs');
let content = fs.readFileSync('c:/Users/enesp/talkinbio/ROADMAP.md', 'utf8');

const phaseR = `## Faz R — Takım & Büyüme Kaynakları (Sürekli, Paralel)

Ürün (Faz 1-3) ve Pazarlama (Faz S-P) süreçlerinin altından kalkabilmek ve uluslararası ölçeklenmeyi (Faz 7) sağlayabilmek için çekirdek takımın ve stratejik partnerlerin kurgulanması.

### R.1 Lokal Geliştirme Partnerleri
- **Erken Aşama:** Ukrayna ve Kazakistan (Rusça bölgesi) için ürünün büyümesini, müşteri diyaloglarını ve satışını üstlenecek yerel (local) partnerlerle anlaşılması.
- **Global Genişleme (Faz 7'ye paralel):** Arapça, İspanyolca ve Portekizce dilleri için; özellikle MENA ve Latin Amerika (LatAm) bölgelerinden o kültürün dinamiklerine hakim "Country Manager" vari yerel partnerlerin bulunması. Müşteri destek ve go-to-market süreçlerinin doğrudan bu partnerler aracılığıyla yerelleştirilmesi.

### R.2 Çekirdek Mühendislik ve AI Uzmanlığı
- **İhtiyaç:** Faz 2'deki Agent Çekirdeği Refactor'ü ve Faz 3'teki pazarlama asistanı (Marketing Agent) geçişi için, Vercel AI SDK ve LLM prompt mühendisliği (caching, context diyet) konularında uzman, gerektiğinde danışmanlık/yarı zamanlı destek alınabilecek bir AI/Next.js mühendisi.
- **Hedef:** Kurucunun üzerindeki teknik yükü hafifletip, kurucunun Faz P (Problem Görüşmeleri) ve bizzat yürüteceği müşteri onboarding süreçlerine tam ağırlık verebilmesini sağlamak.

### Kabul Kriterleri
- [ ] Ukrayna ve Kazakistan pazarında ürün satışını/desteğini üstlenecek ilk partnerlerle anlaşıldı.
- [ ] Çekirdek teknik yükü hafifletecek AI/Next.js uzmanı/danışmanı ile çalışılmaya başlandı.`;

content = content.replace(/(## Faz P — Customer Operations[\s\S]*?---\n\n)/, '$1' + phaseR + '\n\n---\n\n');

fs.writeFileSync('c:/Users/enesp/talkinbio/ROADMAP.md', content, 'utf8');
