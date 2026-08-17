export type TopicLearningElement = {
  title: string;
  caption: string;
  definition: string;
  question: string;
};

export type TopicLearningPlan = {
  elements: [TopicLearningElement, TopicLearningElement, TopicLearningElement];
  examples: Array<{ id: string; values: [string, string, string] }>;
  exampleGroups?: Array<{
    title: string;
    description: string;
    examples: Array<{ id: string; values: [string, string, string] }>;
  }>;
  pattern: {
    title: string;
    body: string;
    steps: Array<{ title: string; description: string }>;
    flow?: string;
  };
  assignment: {
    title: string;
    intro: string;
    questions: string[];
  };
  simulation: {
    intro: string;
    placeholder: string;
    starters: string[];
    modeling?: string;
    criteria?: string[];
  };
};

export const topicLearningPlans: Record<string, TopicLearningPlan> = {
  segmentation: {
    elements: [
      { title: 'İhtiyaç kümesini kur', caption: 'Fonksiyonel, duygusal ve sosyal ilerleme', definition: 'Aynı ürünü arayan herkes aynı şeyi çözmeye çalışmaz. İhtiyaç temelli segmentasyon, müşterileri yaşa veya gelire göre değil; aradıkları fonksiyonel sonuç, hissetmek istedikleri duygu ve taşımak istedikleri sosyal anlam üzerinden gruplar.', question: 'Aynı pazara gelen insanlar hangi fonksiyonel, duygusal ve sosyal ilerlemeleri arıyor?' },
      { title: 'Segment kimliğini bul', caption: 'İhtiyaç grubunun adres pusulası', definition: 'İhtiyaç grubu kurulduktan sonra davranış, kullanım bağlamı, yaşam tarzı ve demografi bu insanları pazarda bulmaya yardım eder. Bu veriler segmenti oluşturmaz; oluşmuş segmenti görünür ve erişilebilir kılar.', question: 'Bu ihtiyaca sahip insanı hangi davranış, bağlam ve ikincil işaretlerle bulabiliriz?' },
      { title: 'Segmenti sağlamlık testinden geçir', caption: 'Kullanılabilir ve yaşayabilir ayrım', definition: 'Her ihtiyaç kümesi segment değildir. Grup ölçülebilir, yeterli, erişilebilir, diğerlerinden farklı tepki veren ve markanın hizmet sunabileceği kadar uygulanabilir olmalıdır.', question: 'Bu ihtiyaç kümesi beş sağlamlık filtresini geçiyor ve gerçekten farklı bir pazarlama kararı gerektiriyor mu?' },
    ],
    examples: [
      { id: 'A', values: ['Esneklik kümesi: Düzeni sürdürmek; kontrolü kaybetmemek; hayatını iyi yöneten biri gibi hissetmek.', 'Teslimat gününü sık değiştiren, duraklatma koşullarını inceleyen ve sabit plana bağlanmaktan kaçınan davranışlarla bulunabilir.', 'Esnek plana diğer gruplardan daha güçlü tepki veriyor mu; erişilebilir ve hizmet verilebilir mi? Geçiyorsa “Plan hayatına uyar” teklifini sınat.'] },
      { id: 'B', values: ['Kontrol kümesi: İçeriği bilmek; belirsizlik yaşamamak; bilinçli seçim yapan biri olmak.', 'İçerik ve porsiyon bilgisini ayrıntılı inceleyen, menüyü karşılaştıran ve uygunluk soruları soran davranışlarla bulunabilir.', 'Şeffaf içerik ve menü seçimine farklı tepki veriyor mu; ölçülebilir ve yeterli mi? Geçiyorsa “İçeriğini gör, seçimini sen yap” teklifini sınat.'] },
      { id: 'C', values: ['Kolaylık kümesi: Planlamadan kurtulmak; zihinsel ferahlık yaşamak; hayatını zahmetsizce düzenlemek.', 'Hazır planı tercih eden, seçim adımlarını kısa tutan ve otomatik devam seçeneğine yönelen davranışlarla bulunabilir.', 'Tam yönetilen plana farklı tepki veriyor mu; marka bunu sürdürebilir mi? Geçiyorsa “Haftayı yeniden planlama” teklifini sınat.'] },
    ],
    exampleGroups: [
      {
        title: 'Haftalık sağlıklı yemek aboneliği',
        description: 'Aynı yemek hizmetine gelen müşterileri, çözmeye çalıştıkları üç farklı işe göre ayır.',
        examples: [
          { id: 'A', values: ['Esneklik kümesi: Düzeni sürdürmek; kontrolü kaybetmemek; hayatını iyi yöneten biri gibi hissetmek.', 'Teslimat gününü sık değiştiren, duraklatma koşullarını inceleyen ve sabit plana bağlanmaktan kaçınan davranışlarla bulunabilir.', 'Esnek plana diğer gruplardan daha güçlü tepki veriyor mu; erişilebilir ve hizmet verilebilir mi? Geçiyorsa “Plan hayatına uyar” teklifini sınat.'] },
          { id: 'B', values: ['Kontrol kümesi: İçeriği bilmek; belirsizlik yaşamamak; bilinçli seçim yapan biri olmak.', 'İçerik ve porsiyon bilgisini ayrıntılı inceleyen, menüyü karşılaştıran ve uygunluk soruları soran davranışlarla bulunabilir.', 'Şeffaf içerik ve menü seçimine farklı tepki veriyor mu; ölçülebilir ve yeterli mi? Geçiyorsa “İçeriğini gör, seçimini sen yap” teklifini sınat.'] },
          { id: 'C', values: ['Kolaylık kümesi: Planlamadan kurtulmak; zihinsel ferahlık yaşamak; hayatını zahmetsizce düzenlemek.', 'Hazır planı tercih eden, seçim adımlarını kısa tutan ve otomatik devam seçeneğine yönelen davranışlarla bulunabilir.', 'Tam yönetilen plana farklı tepki veriyor mu; marka bunu sürdürebilir mi? Geçiyorsa “Haftayı yeniden planlama” teklifini sınat.'] },
        ],
      },
      {
        title: 'Çevrim içi çocuk atölyesi',
        description: 'Aynı yaratıcı atölyeyi değerlendiren ailelerin farklı ilerleme beklentilerini görünür kıl.',
        examples: [
          { id: 'A', values: ['Güvenli ifade kümesi: Kendi sesini bulmak; yargılanma kaygısını azaltmak; fikirlerini paylaşabilen biri olmak.', 'Deneme dersini ve grup büyüklüğünü inceleyen, eğitmen yaklaşımını soran ve güvenli ortam kanıtı arayan davranışlarla bulunabilir.', 'Küçük grup ve deneme dersine farklı tepki veriyor mu? Beş filtreyi geçiyorsa “Önce kendini rahatça ifade et” teklifini sınat.'] },
          { id: 'B', values: ['Gelişim kümesi: Yazma becerisini ilerletmek; gelişimi görmek; üreten biri olarak tanınmak.', 'Eğitmen profilini, geri bildirim yöntemini ve gelişim aşamalarını karşılaştıran davranışlarla bulunabilir.', 'Yapılandırılmış geri bildirime farklı tepki veriyor mu? Beş filtreyi geçiyorsa “Her üretimde ilerlemeyi gör” teklifini sınat.'] },
          { id: 'C', values: ['Kolay katılım kümesi: Nitelikli etkinliğe erişmek; program stresini azaltmak; zamanı iyi kullanan bir aile olmak.', 'Oturum seçeneklerini, kayıt esnekliğini ve ulaşım gerektirmeyen çözümleri araştıran davranışlarla bulunabilir.', 'Modüler programa farklı tepki veriyor mu? Beş filtreyi geçiyorsa “Yaratıcı zamanı hayatına yerleştir” teklifini sınat.'] },
        ],
      },
      {
        title: 'Küçük işletmelere içerik hizmeti',
        description: 'Aynı içerik hizmetini arayan işletmeleri, satın aldıkları asıl değere göre ayır.',
        examples: [
          { id: 'A', values: ['Düzen kümesi: Görünürlüğü sürdürmek; geri kalma kaygısını azaltmak; faal bir marka olarak görünmek.', 'Takvim ve teslim sıklığını soran, düzenli paketleri inceleyen ve paylaşım boşluklarından yakınan davranışlarla bulunabilir.', 'Hazır takvime farklı tepki veriyor mu? Beş filtreyi geçiyorsa “Markan sessiz kalmasın” teklifini sınat.'] },
          { id: 'B', values: ['Marka bütünlüğü kümesi: Kendi sesini korumak; yabancı görünme kaygısını azaltmak; özgün bir marka olarak tanınmak.', 'Örnek metinleri ayrıntılı inceleyen, revizyon isteyen ve marka dili sürecini soran davranışlarla bulunabilir.', 'Ton rehberine farklı tepki veriyor mu? Beş filtreyi geçiyorsa “Dışarıdan destek, içeriden bir ses” teklifini sınat.'] },
          { id: 'C', values: ['Karar kolaylığı kümesi: Süreci devretmek; zihinsel yükü azaltmak; işine hâkim kalmak.', 'Onay akışını, toplantı ihtiyacını ve kendisinden beklenen karar sayısını sorgulayan davranışlarla bulunabilir.', 'Yönetilen sürece farklı tepki veriyor mu? Beş filtreyi geçiyorsa “Her gönderiyi yeniden düşünme” teklifini sınat.'] },
        ],
      },
    ],
    pattern: {
      title: 'İhtiyaçtan pazarlama karmasına ilerle.',
      body: 'İhtiyaç temelli segmentasyon ihtiyaçla başlar; demografiyi yalnızca kimlik ve erişim için kullanır, segmenti ticari ve davranışsal testlerden geçirir ve sonucu pazarlama karmasına taşır.',
      flow: 'İhtiyaç → Kimlik → Çekicilik → Kârlılık → Konumlandırma → Test → 4P',
      steps: [
        { title: 'İhtiyaç grupları', description: 'Fonksiyonel, duygusal ve sosyal faydalara göre kümeleri kur.' },
        { title: 'Segment kimliği', description: 'Grubu bulduran davranış, yaşam tarzı ve demografik ipuçlarını belirle.' },
        { title: 'Çekicilik', description: 'Büyüme, rekabet, erişim ve ölçeklenebilirliği değerlendir.' },
        { title: 'Kârlılık', description: 'Edinme, hizmet verme ve yaşam boyu değer mantığını sınat.' },
        { title: 'Konumlandırma', description: 'Segmente özgü değer önerisi ve fiyat-fayda dengesi kur.' },
        { title: 'Sağlamlık testi', description: 'Teklifin “tam beni anlatıyor” tepkisi üretip üretmediğini dene.' },
        { title: 'Pazarlama karması', description: 'Ürün, fiyat, kanal ve iletişimi segmente göre uyumla.' },
      ],
    },
    assignment: {
      title: 'Tek bir pazarda üç ihtiyaç segmenti kur.',
      intro: 'Kendi ürün kategorini sabit tut; üç ihtiyaç kümesi kur, bu kümeleri pazarda bul ve her birini kullanılabilir segment filtresinden geçir.',
      questions: ['İncelediğin pazar ve üç ihtiyaç kümesi ne?', 'Her kümenin fonksiyonel, duygusal ve sosyal ihtiyacı ne?', 'Her kümeyi hangi davranış, bağlam ve ikincil işaretlerle bulabilirsin?', 'Her küme ölçülebilir, yeterli, erişilebilir, ayrıştırılabilir ve uygulanabilir mi?', 'Filtreyi geçen segment için değer önerisi ve pazarlama karması nasıl değişmeli?'],
    },
    simulation: {
      intro: 'Tek bir ürününü veya pazarını yaz. Claude, ihtiyaç kümelerini çok boyutlu kuracak, segment kimliğini çıkaracak ve her kümeyi kullanılabilirlik testinden geçirecek.',
      placeholder: 'Örn. Haftalık sağlıklı yemek aboneliği sunuyorum...',
      starters: ['Haftalık sağlıklı yemek aboneliği', 'Çevrim içi çocuk atölyesi', 'Küçük işletmelere içerik hizmeti'],
      modeling: 'İlk aşamada fonksiyonel, duygusal ve sosyal ihtiyacı birlikte kur. İkinci aşamada davranış ve kullanım ipuçlarını temel al; demografiyi segmenti oluşturan neden değil, grubu bulmaya yarayan ikincil tanımlayıcı olarak kullan. Üçüncü aşamada segmenti beş kullanılabilirlik kriteriyle sınat. Örüntü ve karar, ihtiyaç grubundan pazarlama karmasına uzanan yedi adımlı süreci izlesin.',
      criteria: ['Ölçülebilir', 'Yeterli', 'Erişilebilir', 'Ayrıştırılabilir', 'Uygulanabilir'],
    },
  },
  targeting: {
    elements: [
      { title: 'Segment değeri', caption: 'Çözmeye değen fırsat', definition: 'Bir grubun büyüklüğünden önce ihtiyacın şiddetini, erişilebilirliğini ve değer üretme olasılığını oku.', question: 'Bu grubun ihtiyacı neden öncelikli?' },
      { title: 'Marka uyumu', caption: 'Kazanma hakkı', definition: 'Yeteneklerin, kanıtların ve çalışma biçimin bu gruba diğerlerinden daha iyi hizmet etmeli.', question: 'Bu müşteriye hizmet etmek için neden biz?' },
      { title: 'Odak tercihi', caption: 'Seçim ve vazgeçiş', definition: 'Hedefleme kaynakları bir grupta yoğunlaştırır; bu yüzden kime öncelik vermediğini de söyler.', question: 'Kime evet derken kime şimdilik hayır diyoruz?' },
    ],
    examples: [
      { id: 'A', values: ['Esnek beslenme planına güçlü ihtiyaç duyan düzensiz programlı çalışanlar.', 'Teslimat gününü değiştirebilen operasyon ve porsiyon planlama yeteneği.', 'Esneklik arayan çalışanlara odaklan; yalnızca düşük fiyat arayanları önceliklendirme.'] },
      { id: 'B', values: ['Uzun programa bağlanmadan çocuğunun ilgisini sınamak isteyen ebeveynler.', 'Kısa deneme dersi ve eğitmen geri bildirimi sunabilme.', 'İlk deneyimde güven arayanlara odaklan; ileri seviye yarışma hazırlığını dışarıda bırak.'] },
      { id: 'C', values: ['İçerik üretiminden çok karar yükünü azaltmak isteyen küçük ekipler.', 'Marka dili, onay ritmi ve içerik planını birlikte yönetme becerisi.', 'Karar desteğine değer veren ekiplere odaklan; yalnızca gönderi adedi satın alanları seçme.'] },
    ],
    pattern: {
      title: 'Çekici pazarı, kazanabileceğin pazarla kesiştir.',
      body: 'En büyük grup her zaman doğru hedef değildir. Güçlü hedef; anlamlı ihtiyacın, erişimin ve markanın kazanma hakkının kesişimidir.',
      steps: [
        { title: 'Değeri tart', description: 'İhtiyacın önemini ve fırsatın niteliğini değerlendir.' },
        { title: 'Erişimi gör', description: 'Gruba nerede ve nasıl ulaşabileceğini belirle.' },
        { title: 'Uyumu kanıtla', description: 'Yeteneğinin bu ihtiyaca neden uygun olduğunu göster.' },
        { title: 'Önceliği seç', description: 'Kaynaklarını yoğunlaştıracağın grubu açıkla.' },
        { title: 'Vazgeçişi yaz', description: 'Şimdilik hizmet etmeyeceğin grubu netleştir.' },
      ],
    },
    assignment: {
      title: 'Üç segment arasından bir hedef seç.',
      intro: 'Aynı pazardaki üç segmenti fırsat, erişim ve marka uyumu açısından karşılaştır; seçimin kadar vazgeçişini de savun.',
      questions: ['Üç aday segment hangileri?', 'Hangisinin ihtiyacı daha kritik?', 'Hangi segmente gerçekten erişebilirsin?', 'Markanın hangi kanıtı kazanma hakkı veriyor?', 'Hangi segmenti neden şimdilik seçmiyorsun?'],
    },
    simulation: { intro: 'İşini ve düşündüğün müşteri gruplarını yaz. Claude, kaynak kısıtları ve pazar gerilimleri içeren bir hedefleme vakası kuracak.', placeholder: 'Örn. Üç farklı müşteri grubuna hizmet verebilecek bir eğitim platformuyum...', starters: ['Yeni açılan yerel işletmeler', 'Çocuğu için atölye arayan ebeveynler', 'Yoğun çalışan profesyoneller'] },
  },
  positioning: {
    elements: [
      { title: 'Referans çerçevesi', caption: 'Hangi seçimin içindeyiz?', definition: 'Müşterinin seni hangi alternatiflerle karşılaştıracağını belirleyen kategori ve kullanım anıdır.', question: 'Müşteri bizi neyin yerine değerlendiriyor?' },
      { title: 'Benzerlik noktası', caption: 'Masaya oturma koşulu', definition: 'Kategoride güvenilir bir seçenek sayılmak için karşılaman gereken temel beklentidir.', question: 'Seçenek sayılmak için neyi sağlamalıyız?' },
      { title: 'Farklılık noktası', caption: 'Tercih nedeni ve kanıt', definition: 'Hedef müşteri için anlamlı, rakipten ayrışan ve gösterebildiğin üstünlüktür.', question: 'Neden bizi seçsin ve buna neden inansın?' },
    ],
    examples: [
      { id: 'A', values: ['Hazır yemek ile evde planlama arasında bir haftalık beslenme çözümü.', 'Lezzet, hijyen ve zamanında teslimat.', 'Program değiştiğinde duraklatılabilen plan; uygulamadaki esnek takvim bunu kanıtlar.'] },
      { id: 'B', values: ['Video içerik ile canlı özel ders arasında bir yaratıcı öğrenme deneyimi.', 'Güvenli ortam ve yetkin eğitmen.', 'Çocuğa özel kısa geri bildirim; deneme dersi sonunda verilen gelişim notu kanıttır.'] },
      { id: 'C', values: ['Serbest içerik üreticisi ile ajans arasında bir marka çalışma sistemi.', 'Düzenli ve kaliteli içerik teslimi.', 'Kurucunun karar yükünü azaltan onay ritmi; sabit karar akışı ve marka rehberi kanıttır.'] },
    ],
    pattern: {
      title: 'Kategoriden açık bir tercih nedenine ilerle.',
      body: 'Konumlandırma, yaratıcı bir cümleden önce müşterinin zihnindeki karşılaştırmayı ve kanıtlanabilir farkı seçme işidir.',
      steps: [
        { title: 'Anı seç', description: 'Ürünün değerlendirildiği kullanım ve karar anını tanımla.' },
        { title: 'Alternatifi gör', description: 'Müşterinin seni neyle karşılaştırdığını yaz.' },
        { title: 'Eşiği karşıla', description: 'Kategorinin temel beklentilerini güvenceye al.' },
        { title: 'Farkı seç', description: 'Tek, anlamlı bir tercih nedenini öne çıkar.' },
        { title: 'Kanıtla', description: 'Vaadi görünür bir özellik veya deneyimle destekle.' },
      ],
    },
    assignment: {
      title: 'Bir tercih nedeni kur ve kanıtla.',
      intro: 'Tek bir hedef segment ve karar anı seç; müşterinin alternatiflerini, kategori eşiğini ve seni seçme nedenini aynı mantıkta birleştir.',
      questions: ['Hedef müşteri hangi anda seçim yapıyor?', 'Seni hangi alternatiflerle karşılaştırıyor?', 'Kategoriye ait temel beklenti ne?', 'Tek anlamlı farklılığın ne?', 'Bu farklılığı hangi somut kanıt taşıyor?'],
    },
    simulation: { intro: 'Ürününü ve hedef müşterini yaz. Claude, rakip isimleri uydurmadan bir seçim sahnesi kurup konumlandırmanı sınayacak.', placeholder: 'Örn. Küçük ekipler için marka dili ve içerik yönetimi hizmeti...', starters: ['Esnek yemek aboneliği', 'Canlı yaratıcı yazarlık atölyesi', 'Butik içerik ve marka hizmeti'] },
  },
  'brand-and-value-proposition': {
    elements: [
      { title: 'Müşteri kazancı', caption: 'Hayatta oluşan ilerleme', definition: 'Özellikten bağımsız olarak müşterinin elde etmek istediği işlevsel, duygusal veya sosyal sonuçtur.', question: 'Müşterinin hayatında ne iyileşiyor?' },
      { title: 'Marka vaadi', caption: 'Üstlenilen değer', definition: 'Markanın hedef müşteri için sürekli üretmeyi seçtiği açık ve ayırt edici kazançtır.', question: 'Hangi değeri tutarlı biçimde üstleniyoruz?' },
      { title: 'İnanma nedeni', caption: 'Vaadi taşıyan kanıt', definition: 'Yetkinlik, süreç, ürün davranışı veya deneyim yoluyla vaadi güvenilir kılan şeydir.', question: 'Müşteri bu söze neden inansın?' },
    ],
    examples: [
      { id: 'A', values: ['Programı değişse de sağlıklı düzenini kaybetmemek.', 'Planın hayatına uyar; hayatın plana uymak zorunda kalmaz.', 'Duraklatma, gün değiştirme ve porsiyon seçimi tek akışta çalışır.'] },
      { id: 'B', values: ['Çocuğunun üretme cesaretini güvenli biçimde görmek.', 'Her çocuk anlatacak bir şey bulabilir.', 'Canlı küçük grup, eğitmen geri bildirimi ve süreç sonunda üretilen metin.'] },
      { id: 'C', values: ['Markasını yönetirken zihinsel alanını geri kazanmak.', 'Markanın sesi düzenli çalışır; her gönderide yeniden karar vermezsin.', 'Onay ritmi, marka dili rehberi ve önceden kurulan içerik sistemi.'] },
    ],
    pattern: {
      title: 'Kazanımdan güvenilir bir marka sözüne ilerle.',
      body: 'Güçlü değer önerisi müşterinin aradığı sonucu, markanın üstlendiği vaadi ve bu vaadin kanıtını tek yapı içinde buluşturur.',
      steps: [
        { title: 'Kazancı bul', description: 'Müşterinin hayatındaki ilerlemeyi açıkla.' },
        { title: 'Bedeli gör', description: 'Bugünkü çözümün yarattığı kayıp ve gerilimi yaz.' },
        { title: 'Vaadi seç', description: 'Markanın sürekli üstleneceği değeri belirle.' },
        { title: 'Kanıtı bağla', description: 'Vaadi ürün ve süreç davranışıyla destekle.' },
        { title: 'Tutarlılığı sınat', description: 'Her temasın aynı sözü taşıyıp taşımadığına bak.' },
      ],
    },
    assignment: {
      title: 'Özellik listesini değer önerisine dönüştür.',
      intro: 'Bir ürününü seç; özellikleri saymadan müşteri kazancını, marka vaadini ve inanma nedenini kur.',
      questions: ['Müşteri hangi ilerlemeyi satın alıyor?', 'Bugünkü alternatifin bedeli ne?', 'Markanın tek cümlelik vaadi ne?', 'Bu vaadi hangi üç kanıt destekliyor?', 'Hangi temas vaadinle bugün çelişiyor?'],
    },
    simulation: { intro: 'Ürününü ve mevcut vaadini yaz. Claude, bir müşterinin inanma ve şüphe anını canlandırarak değer önerini sınayacak.', placeholder: 'Örn. Markamız işletme sahiplerine düzenli sosyal medya içeriği sağlıyor...', starters: ['Yerel kahve markası', 'Çevrim içi eğitim programı', 'B2B içerik hizmeti'] },
  },
  'product-service-and-pricing': {
    elements: [
      { title: 'Çekirdek yarar', caption: 'Satın alınan ilerleme', definition: 'Müşterinin üründen bağımsız olarak çözmek istediği temel iştir.', question: 'Müşteri gerçekte neyi satın alıyor?' },
      { title: 'Teklif sistemi', caption: 'Yararı mümkün kılan bütün', definition: 'Ürün, hizmet, teslimat, destek ve seçeneklerin birlikte oluşturduğu deneyimdir.', question: 'Vaadi hangi parçalar birlikte gerçekleştiriyor?' },
      { title: 'Fiyat mantığı', caption: 'Değer ve fedakârlık sinyali', definition: 'Fiyat yalnızca maliyetin üstü değil; değer algısını, erişimi ve seçim mimarisini belirleyen karardır.', question: 'Müşteri neye karşılık hangi bedeli üstleniyor?' },
    ],
    examples: [
      { id: 'A', values: ['Yoğun haftada beslenme düzenini korumak.', 'Yemek, esnek takvim, teslimat bildirimi ve kolay duraklatma.', 'Esneklik ve zaman tasarrufunu görünür kılan plan seçenekleri.'] },
      { id: 'B', values: ['Çocuğun ilgisini güvenli biçimde denemek ve geliştirmek.', 'Deneme dersi, canlı atölye, eğitmen notu ve devam modülleri.', 'Uzun taahhüt yerine deneyimledikçe ilerleyen modüler ücret.'] },
      { id: 'C', values: ['İçerik karar yükünü azaltmak.', 'Marka rehberi, planlama, üretim, onay ve aylık öğrenme görüşmesi.', 'Gönderi adedi yerine yönetilen karar kapsamını ayıran paketler.'] },
    ],
    pattern: {
      title: 'Vaadi teklifin içine yerleştir.',
      body: 'Ürün, hizmet ve fiyat ayrı kararlar değildir; konumlandırmayı müşterinin yaşayabileceği ve satın alabileceği bir sisteme dönüştürür.',
      steps: [
        { title: 'Yararı seç', description: 'Teklifin çözeceği çekirdek işi tanımla.' },
        { title: 'Sürtünmeyi bul', description: 'Müşterinin değer almasını engelleyen noktaları gör.' },
        { title: 'Sistemi kur', description: 'Ürün, hizmet ve desteği aynı vaade bağla.' },
        { title: 'Seçimi tasarla', description: 'Paket ve seçenekleri karar vermeyi kolaylaştıracak biçimde düzenle.' },
        { title: 'Fiyatı bağla', description: 'Bedeli yaratılan değer ve kullanım mantığıyla ilişkilendir.' },
      ],
    },
    assignment: {
      title: 'Teklifini bir değer sistemi olarak yeniden çiz.',
      intro: 'Bir teklif seç; çekirdek yarardan başlayarak ürün, hizmet, destek, seçenek ve fiyatın aynı sözü taşıyıp taşımadığını incele.',
      questions: ['Çekirdek müşteri yararı ne?', 'Değeri almayı zorlaştıran sürtünme ne?', 'Teklifin hangi parçaları birlikte çalışıyor?', 'Paketler hangi farklı ihtiyacı karşılıyor?', 'Fiyat hangi değeri ve davranışı işaret ediyor?'],
    },
    simulation: { intro: 'Teklifini ve mevcut fiyatlama biçimini yaz. Claude, bir satın alma sahnesinde değer, seçenek ve bedel arasındaki gerilimi canlandıracak.', placeholder: 'Örn. Aylık üç paket halinde sunduğum danışmanlık hizmeti...', starters: ['Abonelik tabanlı yemek hizmeti', 'Modüler çevrim içi eğitim', 'Aylık içerik danışmanlığı'] },
  },
  'channels-and-experience': {
    elements: [
      { title: 'Karar anı', caption: 'Müşterinin ilerlediği temas', definition: 'Müşterinin fark etme, değerlendirme, satın alma veya kullanım yolculuğundaki belirleyici andır.', question: 'Müşteri bu temasta neyi başarmaya çalışıyor?' },
      { title: 'Kanal rolü', caption: 'Temasın yapması gereken iş', definition: 'Her kanalın keşif, güven, işlem veya destek gibi belirli bir görevi olmalıdır.', question: 'Bu kanal yolculukta hangi işi üstleniyor?' },
      { title: 'Deneyim devamlılığı', caption: 'Sözün temaslar arasında korunması', definition: 'Müşteri kanallar arasında geçerken bilgi, güven ve bağlam kaybetmiyorsa deneyim bütünleşir.', question: 'Bir temastan diğerine ne taşınmalı?' },
    ],
    examples: [
      { id: 'A', values: ['Teslimat bölgesinde olup olmadığını hızla anlamak.', 'Arama sonucu keşfi, site uygunluğu ve takvimi, uygulama plan yönetimini üstlenir.', 'Sitede seçilen bölge ve plan uygulamada yeniden sorulmadan devam eder.'] },
      { id: 'B', values: ['Atölyenin çocuğuna uygunluğunu güvenle değerlendirmek.', 'Sosyal içerik örneği gösterir, tanıtım sayfası yöntemi açıklar, deneme dersi uyumu yaşatır.', 'İlanda verilen küçük grup sözü deneme dersinde gerçekten hissedilir.'] },
      { id: 'C', values: ['Hizmetin karar yükünü azaltacağını görmek.', 'Referans içerik kanıtlar, görüşme süreci uyarlar, çalışma alanı onayı kolaylaştırır.', 'Satışta anlatılan sade süreç teslimatta ek toplantı yüküne dönüşmez.'] },
    ],
    pattern: {
      title: 'Kanal listesini kesintisiz bir deneyime dönüştür.',
      body: 'Kanal stratejisi her yerde bulunmak değil; müşterinin her karar anında doğru işi yapan temasları birbirine bağlamaktır.',
      steps: [
        { title: 'Yolculuğu izle', description: 'Müşterinin başlangıçtan kullanıma kadar karar anlarını sırala.' },
        { title: 'İşi ata', description: 'Her kanalın tek temel rolünü belirle.' },
        { title: 'Sürtünmeyi bul', description: 'Bilgi, güven veya emek kaybı yaşanan geçişleri gör.' },
        { title: 'Bağlamı taşı', description: 'Temaslar arasında korunması gereken bilgiyi belirle.' },
        { title: 'Sözü doğrula', description: 'Kanal deneyiminin marka vaadini gerçekten yaşattığını sınat.' },
      ],
    },
    assignment: {
      title: 'Tek bir müşteri yolculuğunu temas temas çöz.',
      intro: 'Fark etmeden kullanıma kadar gerçek bir yolculuk seç; her kanalın işini ve kanallar arası kopuşları görünür kıl.',
      questions: ['Yolculuktaki beş kritik temas ne?', 'Müşteri her temasta neyi başarmaya çalışıyor?', 'Her kanal hangi işi üstleniyor?', 'Nerede bilgi veya güven kayboluyor?', 'Hangi geçişi yeniden tasarlayacaksın?'],
    },
    simulation: { intro: 'Ürününü ve müşterinin kullandığı kanalları yaz. Claude, temaslar arası kopuş içeren bir müşteri yolculuğu canlandıracak.', placeholder: 'Örn. Instagram, web sitesi ve WhatsApp üzerinden satış yapan bir atölyeyiz...', starters: ['Çok kanallı yerel mağaza', 'Çevrim içi eğitim kaydı', 'B2B danışmanlık yolculuğu'] },
  },
  'communication-and-content': {
    elements: [
      { title: 'Müşteri niyeti', caption: 'Cevap bekleyen soru', definition: 'İçeriğin başlangıç noktası markanın söylemek istediği değil, müşterinin o anda çözmeye çalıştığı sorudur.', question: 'Müşteri bu anda hangi cevabı arıyor?' },
      { title: 'Mesaj görevi', caption: 'Değiştirilecek düşünce veya davranış', definition: 'Her mesajın fark ettirme, açıklama, kanıtlama veya harekete geçirme gibi açık bir işi olmalıdır.', question: 'Bu iletişim neyi değiştirmeli?' },
      { title: 'Deneyim kanıtı', caption: 'Söz ile yaşantı arasındaki bağ', definition: 'İletişimde verilen söz ürün, kanal ve hizmet deneyiminde karşılık bulduğunda güven oluşur.', question: 'Mesaj verdiği sözü nerede doğruluyor?' },
    ],
    examples: [
      { id: 'A', values: ['Programım değişirse abonelikte ne olur?', 'Esnekliği açıklayıp bağlanma kaygısını azaltmak.', 'İçerikte gösterilen gün değiştirme akışı ödeme ve uygulamada aynen çalışır.'] },
      { id: 'B', values: ['Çocuğum bu atölyeye uyum sağlar mı?', 'Sonuç övmek yerine deneme deneyimini ve eğitmen yaklaşımını göstermek.', 'Tanıtılan geri bildirim yöntemi deneme dersinde uygulanır.'] },
      { id: 'C', values: ['Bu hizmet gerçekten karar yükümü azaltır mı?', 'Gönderi sayısından süreç rahatlığına dikkat çevirmek.', 'Satış sayfasındaki onay ritmi çalışma alanında aynı sadelikle işler.'] },
    ],
    pattern: {
      title: 'İçeriği müşteri sorusuna verilen tutarlı cevaba dönüştür.',
      body: 'İyi iletişim görünürlük üretmekten fazlasını yapar; doğru anda doğru soruyu yanıtlar ve cevabını deneyimle kanıtlar.',
      steps: [
        { title: 'Niyeti yakala', description: 'Müşterinin karar anındaki gerçek soruyu yaz.' },
        { title: 'Engeli seç', description: 'İlerlemeyi durduran belirsizlik veya inancı belirle.' },
        { title: 'Mesajı kur', description: 'Tek bir düşünceyi değiştirecek cevabı üret.' },
        { title: 'Biçimi eşle', description: 'Cevabı bağlama uygun kanal ve içerik biçimine taşı.' },
        { title: 'Deneyimle doğrula', description: 'Mesajdaki sözün üründe nerede yaşandığını göster.' },
      ],
    },
    assignment: {
      title: 'Bir içerik takvimini karar soruları üzerinden kur.',
      intro: 'Bir müşteri yolculuğu seç; markanın konularından değil, müşterinin beş karar sorusundan başlayan içerikler tasarla.',
      questions: ['Müşterinin beş gerçek karar sorusu ne?', 'Her sorunun arkasındaki engel ne?', 'Her içerik hangi düşünceyi değiştirecek?', 'Hangi biçim ve kanal bu cevaba uygun?', 'Verilen söz deneyimde nasıl doğrulanacak?'],
    },
    simulation: { intro: 'Ürününü ve üretmek istediğin içeriği yaz. Claude, bir müşterinin soru ve itirazlarıyla ilerleyen iletişim vakası kuracak.', placeholder: 'Örn. Yeni hizmetimizi Instagram içerikleriyle anlatmak istiyoruz...', starters: ['Yeni abonelik duyurusu', 'Eğitim programı içerik serisi', 'B2B hizmet satış sayfası'] },
  },
  'loyalty-and-customer-value': {
    elements: [
      { title: 'Tekrarlanan değer', caption: 'Geri dönme nedeni', definition: 'Sadakat puandan önce müşterinin her kullanımda yeniden elde ettiği anlamlı sonuçtur.', question: 'Müşteri neden tekrar değer buluyor?' },
      { title: 'İlişki sürtünmesi', caption: 'Değeri aşındıran yük', definition: 'Kullanım, destek, değişim veya iletişimde biriken küçük maliyetler ilişkiyi sessizce zayıflatır.', question: 'Müşterinin kalmasını ne zorlaştırıyor?' },
      { title: 'Güven büyümesi', caption: 'Devam ve tavsiye', definition: 'Marka müşteriyi öğrendikçe deneyimi iyileştirir; tutarlı değer güveni, genişlemeyi ve tavsiyeyi doğurur.', question: 'İlişki zamanla nasıl daha değerli oluyor?' },
    ],
    examples: [
      { id: 'A', values: ['Her yoğun haftada planlama yükünden kurtulmak.', 'Planı değiştirmek için desteğe yazmak ve tercihleri yeniden anlatmak.', 'Sistem tercihleri öğrenir; müşteri kontrolü kaybetmeden kolayca düzenler.'] },
      { id: 'B', values: ['Çocuğun gelişimini ve üretme isteğini düzenli görmek.', 'Her modülde seviye ve eğitmen bilgisini yeniden aramak.', 'Gelişim notları sonraki modülü kişiselleştirir ve ebeveynle güvenli bir devam kurar.'] },
      { id: 'C', values: ['Her ay daha az karar vererek daha tutarlı iletişim yürütmek.', 'Aynı marka tercihlerini tekrar açıklamak ve geciken onaylarla yorulmak.', 'Öğrenilen marka dili süreci hızlandırır; ortaklık zamanla daha az emekle daha iyi sonuç verir.'] },
    ],
    pattern: {
      title: 'Tekrar satın almayı büyüyen bir ilişkiye dönüştür.',
      body: 'Sadakat, müşteriyi kampanyayla geri çağırmak değil; tekrar eden değeri koruyup ilişki ilerledikçe deneyimi daha iyi hale getirmektir.',
      steps: [
        { title: 'Değer anını bul', description: 'Müşterinin tekrar tekrar aldığı sonucu tanımla.' },
        { title: 'Sürtünmeyi izle', description: 'İlişki boyunca biriken emek ve hayal kırıklıklarını gör.' },
        { title: 'Öğrenmeyi kullan', description: 'Müşteri bilgisini deneyimi kolaylaştırmak için işle.' },
        { title: 'Güveni doğrula', description: 'Verilen sözün zaman içinde tutarlı kaldığını göster.' },
        { title: 'İlişkiyi büyüt', description: 'Devam, genişleme ve tavsiyeyi doğal sonuç olarak tasarla.' },
      ],
    },
    assignment: {
      title: 'İlk satın almadan sonraki ilişkiyi yeniden tasarla.',
      intro: 'Gerçek bir müşteri tipi seç; ilk değerden tekrar kullanıma ve tavsiyeye kadar ilişkinin nasıl güçlenip zayıfladığını incele.',
      questions: ['Müşteri her kullanımda hangi değeri yeniden alıyor?', 'İlişkide biriken üç sürtünme ne?', 'Müşteri hakkında ne öğreniliyor?', 'Bu öğrenme deneyimi nasıl iyileştiriyor?', 'Tavsiye istemeden önce hangi güven kanıtlanmalı?'],
    },
    simulation: { intro: 'Ürününü ve tekrar satın alma düzenini yaz. Claude, ayrılma riski taşıyan bir müşteri ilişkisini canlandıracak.', placeholder: 'Örn. Müşterilerin birkaç ay kullandıktan sonra ayrıldığı abonelik hizmeti...', starters: ['Yemek aboneliğinde ayrılma', 'Eğitim programında devam kararı', 'B2B hizmet yenileme görüşmesi'] },
  },
  'measurement-and-growth': {
    elements: [
      { title: 'Değer sonucu', caption: 'Gerçek ilerlemeyi gösteren ölçü', definition: 'İş hacminden önce müşterinin ve işletmenin elde ettiği anlamlı sonucu tanımlar.', question: 'Değer yarattığımızı hangi sonuç gösterir?' },
      { title: 'Öncü davranış', caption: 'Sonuca giden erken sinyal', definition: 'Nihai sonuç oluşmadan önce müşterinin doğru yönde ilerlediğini gösteren gözlenebilir davranıştır.', question: 'Sonuçtan önce hangi davranış değişir?' },
      { title: 'Öğrenme döngüsü', caption: 'Ölçüden karara geçiş', definition: 'Metrik ancak varsayımı sınayıp bir sonraki pazarlama kararını değiştirdiğinde işe yarar.', question: 'Bu sonuç hangi kararı değiştirecek?' },
    ],
    examples: [
      { id: 'A', values: ['Müşterinin planı yoğun haftalarda da sürdürebilmesi.', 'Teslimat gününü ayarlayıp planı iptal etmeden yönetmesi.', 'Esneklik kullananların devamını izle; plan seçeneklerini bu öğrenmeye göre düzenle.'] },
      { id: 'B', values: ['Çocuğun üretime katılması ve uygun programa devam etmesi.', 'Deneme dersini tamamlayıp eğitmen geri bildirimini incelemesi.', 'Geri bildirim sonrası devam davranışını gör; deneme deneyimini buna göre iyileştir.'] },
      { id: 'C', values: ['Müşterinin daha az karar yüküyle tutarlı içerik yayınlaması.', 'Onay süresinin kısalması ve revizyonların netleşmesi.', 'Onay ritmi ile devam arasındaki bağı sınayıp hizmet sürecini yeniden kur.'] },
    ],
    pattern: {
      title: 'Gösterge panosunu karar veren bir öğrenme sistemine çevir.',
      body: 'Büyüme daha çok sayı izlemekten değil; değeri temsil eden sonucu, ona giden davranışı ve değişecek kararı birbirine bağlamaktan gelir.',
      steps: [
        { title: 'Değeri tanımla', description: 'Müşteri ve işletme için anlamlı sonucu seç.' },
        { title: 'Davranışı bul', description: 'Sonuca giden erken müşteri sinyalini belirle.' },
        { title: 'Varsayımı yaz', description: 'Davranış ile sonuç arasındaki beklenen bağı açıkla.' },
        { title: 'Deneyi kur', description: 'Tek bir pazarlama kararını değiştirip sonucu gözle.' },
        { title: 'Öğren ve yenile', description: 'Kanıta göre varsayımı ve sonraki kararı güncelle.' },
      ],
    },
    assignment: {
      title: 'Bir göstergeyi karar döngüsüne dönüştür.',
      intro: 'Bugün izlediğin bir metriği seç; onun hangi müşteri değerini temsil ettiğini ve hangi kararı değiştireceğini açıkça kur.',
      questions: ['Asıl müşteri ve işletme sonucu ne?', 'Bugün izlediğin metrik bu sonucu gerçekten temsil ediyor mu?', 'Hangi öncü davranış daha erken sinyal verir?', 'Sınanacak varsayım ne?', 'Sonuç olumlu veya olumsuzsa hangi karar değişecek?'],
    },
    simulation: { intro: 'İşini ve bugün izlediğin metrikleri yaz. Claude, yanıltıcı bir başarı göstergesi içeren büyüme vakası kuracak.', placeholder: 'Örn. Trafik ve takipçi artıyor fakat satış ve devam davranışı değişmiyor...', starters: ['Trafiği artan e-ticaret', 'Kaydı yüksek eğitim programı', 'Etkileşimi artan hizmet markası'] },
  },
};

export function getTopicLearningPlan(slug: string, locale = 'tr') {
  if (slug === 'segmentation' && (locale === 'en' || locale === 'ru')) {
    return segmentationPlanTranslations[locale];
  }
  return topicLearningPlans[slug];
}
import { segmentationPlanTranslations } from './topicLearningTranslations';
