'use client';

import AdminLayout from '@/components/AdminLayout';
import { Link } from '@/i18n/routing';
import {
  ArrowLeft, Video, ListChecks, AlertTriangle, Lock, Clock, Lightbulb, XCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* DEMO REHBERİ — statik. İlk 10 funnel'ının 3. adımını (kişisel demo)  */
/* açıklıyor. Kod bazında güncellenir. Kaynak: 2026-07-24 sohbeti.      */
/* ------------------------------------------------------------------ */

const oncesi = [
  {
    title: 'Instagram profilinden veri topla',
    body: 'Bio metni, öne çıkan hikâyeler (paketler, danışan yorumları), son gönderiler, varsa linktree/anket içeriği. Fiyatı yazmıyorsa boş bırak — "buraya kendi fiyatın gelecek" dersin.',
  },
  {
    title: 'Beiwe ile sayfayı kur',
    body: 'Hizmetlerini, paketlerini, sıkça sorulan sorularını gir. Marka rengini profil estetiğine yakın seç — bu detay çok etkili, "bana özel yapılmış" hissi verir.',
  },
  {
    title: 'Saule’yi test et',
    body: '3-4 gerçek soru sor: "fiyat ne kadar?", "online mı yüz yüze mi?", "kaç haftalık program?". Yanlış cevap verirse bilgi tabanını düzelt. Kaydı çekmeden önce mutlaka test et — demoda Saule saçmalarsa satış biter.',
  },
];

const sahneler = [
  { sure: '0:00–0:10', ne: 'Yüzün görünsün, ismini söyle: "Selam Elif, konuştuğumuz şeyi senin sayfanla hazırladım, 2 dakikada göstereyim."', neden: 'Yüz = güven. Robot mesaj değil, insan.' },
  { sure: '0:10–0:25', ne: 'Ekranı paylaş, sayfayı aç: "Bu senin sayfan — bio linkinin yerine geçiyor."', neden: 'Sahiplenme anı. Kendi adını görüyor.' },
  { sure: '0:25–1:20', ne: 'Asıl gösteri: Saule’ye ziyaretçi gibi yaz. "Bir danışanın sana soracağı şeyi soruyorum..." → "Fiyatlar ne kadar?" → cevap → "Online mı?" → cevap → "Randevu almak istiyorum" → bilgi topluyor.', neden: 'Ürünün tamamı bu 55 saniye. Konuşuyor, cevaplıyor, lead topluyor.' },
  { sure: '1:20–1:45', ne: 'Yönetim tarafını göster: "Sen sabah buraya bakıyorsun — gece 2’de soru soran kişi burada, adı, ne sorduğu, iletişimi."', neden: '"Sonuç" burası. DM kalabalığı değil, hazır liste.' },
  { sure: '1:45–2:00', ne: 'Kapanış, tekrar yüz: "Beğendiysen kurulumu ben yapıp bio’na koyabilirim. Beğenmediysen hiç dert değil, sil gitsin."', neden: 'Baskısız kapanış, bir sonraki adıma köprü.' },
];

const pratikNotlar = [
  'Araç: Loom en kolayı (ücretsiz sürüm yeterli, link olarak atılıyor, kimin izlediğini görüyorsun — izledi ama cevap vermediyse farklı yaklaşırsın).',
  'Format: Dikey (9:16) çek. Instagram DM’de yatay video kimse izlemiyor, dikey doğal geliyor.',
  'Tek çekim, kusurlu olsun. Cilalı reklam gibi olursa "toplu gönderilmiş" hissi verir. Ufak bir takılma, "şey" demen, samimiyeti artırır. 5 kez çekme, ikincide gönder.',
  'Ses önemli. Sessiz ekran kaydı işe yaramaz — sesin, ismini söylemen, kişiselliğin kanıtı.',
];

const hatalar = [
  { q: 'Ürünü anlatmak', a: '"Talkinbio şöyle bir platform, şu özellikleri var…" Kimse ürünü umursamıyor. Sadece kendi sayfasını görsün.' },
  { q: 'Uzatmak', a: '2 dakika sınır. 4 dakikalık video izlenmiyor, hele DM’de.' },
  { q: 'Test etmeden çekmek', a: 'Saule yanlış cevap verirse tüm güven gider.' },
  { q: 'Herkese aynı videoyu atmak', a: 'Kişiselleştirme yoksa tüm mantık çöker; yöntemin gücü "bu sadece bana yapılmış" hissinde.' },
];

export default function DemoRehberiPage() {
  return (
    <AdminLayout>
      <Link
        href="/admin/continuous-improvement/ilk10"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> İlk 10&#39;a dön
      </Link>

      <div className="space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Video className="w-5 h-5 text-slate-600" />
            <h1 className="text-3xl font-bold text-slate-900">Demo Videosu — Nasıl Yapılır</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Funnel’ın 3. adımı: onun gerçek linki/markasıyla 2 dakikalık kişisel demo. Bu adım tüm satışın en kritik parçası —
            çünkü ikna eden şey mesaj değil, bu 2 dakika.
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">V.1 · 2026-07-24 — statik, kod bazında güncellenir.</p>
        </div>

        {/* Temel fikir */}
        <section className="bg-slate-900 rounded-2xl p-6 text-white">
          <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" /> Temel fikir: anlatma, göster
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Klasik satışta ürünü anlatırsın, karşı taraf kafasında canlandırmaya çalışır. Burada tam tersi: onun kendi işini,
            kendi markasıyla, çalışır halde görüyor. Diyetisyen ekranda kendi adını, kendi paket isimlerini, kendi fiyatını
            görüyor. Hayal gücü değil, <strong className="text-white">sahiplenme duygusu</strong> devreye giriyor. Bu yüzden
            "beğenmezsen sil" diyebiliyorsun — çünkü zaten yapılmış.
          </p>
        </section>

        {/* Kayıttan önce */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-slate-600" /> Kayıttan önce (15-20 dk)
          </h2>
          <p className="text-xs text-slate-500 mb-5">Bunu Beiwe zaten senin için yapıyor, sen hammaddeyi topluyorsun.</p>
          <div className="space-y-3">
            {oncesi.map((o, i) => (
              <div key={o.title} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center justify-center font-mono shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{o.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{o.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2 dakikalık kayıt */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" /> 2 dakikalık kayıt — sahne sahne
          </h2>
          <p className="text-xs text-slate-500 mb-5">Bu, videoda söyleyeceğin/yapacağın şeylerin tam sırası.</p>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
            {sahneler.map((s) => (
              <div key={s.sure} className="p-4 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                <span className="text-xs font-mono font-bold text-slate-400 shrink-0 sm:w-24">{s.sure}</span>
                <div className="flex-1">
                  <p className="text-sm text-slate-800 leading-relaxed">{s.ne}</p>
                  <p className="text-xs text-slate-400 mt-1 italic">{s.neden}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pratik notlar */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4">Pratik notlar</h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <ul className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
              {pratikNotlar.map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="text-slate-300 shrink-0">•</span> {n}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Kritik sınır: demo linki kuralları */}
        <section className="bg-white border-2 border-slate-900 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-900 px-6 py-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-white text-lg">Kritik sınır: gösteriyorsun, teslim etmiyorsun</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              Sayfayı kuruyorsun ama linki ona hemen vermiyorsun. Link elindeyse "sağol, güzelmiş" der, kullanır, ödemez —
              fiilen ücretsiz denemeye döner. Oysa kural net: <strong>ilk 10 müşteri öder, ücretsiz deneme yok.</strong>
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Çözüm linki vermemek değil, <strong>kontrollü vermek.</strong> is_published alanı sayesinde (bkz.{' '}
              <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">src/app/[locale]/[username]/page.tsx</code>)
              yayından kaldırılan sayfa sahibi dışında herkese 404 döner:
            </p>
            <ol className="space-y-2 text-sm text-slate-700 leading-relaxed list-decimal pl-5">
              <li>Demoyu <strong>rastgele/geçici bir slug</strong> ile kur — <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">talkinbio.com/dyt-demo-a7x9</code> gibi. Kendi adıyla olan güzel adres boşta kalsın.</li>
              <li><strong>Yayına al</strong>, linki gönder. Aday tıklar, Saule ile konuşur, kurcalar.</li>
              <li><strong>72 saat sonra elle yayından kaldır.</strong> O andan itibaren link 404 — bio’ya koyduysa bile çalışmaz.</li>
              <li>Ödeme gelince: kendi adıyla slug’ı aç, kalıcı yayına al.</li>
            </ol>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800 leading-relaxed">
                Satış argümanına dönüştür: <em>"Demo 3 gün açık. Kendi adınla kalıcı link ödemeyle birlikte açılıyor."</em>
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Not: Video güveni kurar (yüzün, sesin), link kanıtı verir — ikisi birlikte en güçlüsü. Günde 2-3 demo
              çektiğin için elle kapatmak şu an yük değil; dondurma bitince otomatikleştirilebilir (süreli demo token).
            </p>
          </div>
        </section>

        {/* Ölçek sorunu */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3">Ölçek sorunu (ve çözümü)</h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-700 leading-relaxed">
              Kişi başı ~20-25 dakika. Günde 10 temasın hepsine bunu yapamazsın — zaten yapmamalısın. Loom’u sadece{' '}
              <strong>cevap verenlere</strong> çekiyorsun. Günde 10 temas → 2-3 cevap → 2-3 demo → günde ~1 saat. Bu
              sürdürülebilir.
            </p>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              İlk 3-4 demodan sonra bir kalıp oturur (aynı sıra, aynı cümleler, sadece isim ve içerik değişir). O noktada
              süre 10 dakikaya iner.
            </p>
          </div>
        </section>

        {/* En sık yapılan hatalar */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-slate-600" /> En sık yapılan hatalar
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {hatalar.map((h) => (
              <div key={h.q} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex gap-2">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-900">{h.q}</p>
                  <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{h.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
