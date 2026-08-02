const LOCALE_NAMES: Record<string, string> = { tr: 'Türkçe', en: 'İngilizce', ru: 'Rusça' };

import { getPageActionTargets } from '@/utils/pageActionTargets';

const TONE_GUIDANCE: Record<string, string> = {
  friendly: 'Sıcak, samimi ve arkadaş canlısı bir dille konuş.',
  formal: 'Profesyonel, nazik ve mesafeli bir dille konuş.',
  energetic: 'Enerjik, pozitif ve heyecanlı bir dille konuş.',
};

export type ContactInfo = {
  contactValues: Record<string, string>;
  directLinks: string[];
};

// instagram/whatsapp/telegram tıklanabilir bir "mesaj at" linkine çeviriyor; e-posta
// böyle bir link değil (mailto değil, düz adres) — o yüzden directLinks'e girmiyor,
// sadece preferredContactMethod e-posta seçildiğinde kullanılıyor (bkz. resolvePreferredContact).
const CONTACT_LINK_FORMATTERS: Record<string, (value: string) => string> = {
  instagram: (v) => `Instagram: https://ig.me/m/${v.replace('@', '')}`,
  whatsapp: (v) => `WhatsApp: https://wa.me/${v.replace(/[^0-9]/g, '')}`,
  telegram: (v) => `Telegram: https://t.me/${v.replace('@', '')}`,
  email: (v) => `E-posta: ${v}`,
};

export function parseContactInfo(contactValue: string | null | undefined): ContactInfo {
  let contactValues: Record<string, string> = {};
  const directLinks: string[] = [];
  try {
    contactValues = contactValue ? JSON.parse(contactValue) : {};
    for (const method of ['instagram', 'whatsapp', 'telegram'] as const) {
      if (contactValues[method]) directLinks.push(CONTACT_LINK_FORMATTERS[method](contactValues[method]));
    }
  } catch {
    // contact_value not valid JSON yet (new business) — treat as empty.
  }
  return { contactValues, directLinks };
}

/** İşletme sahibinin "Tercih Edilen İletişim Kanalı" ayarında seçtiği tek kanalı okunabilir satıra çevirir. */
function resolvePreferredContact(contactValues: Record<string, string>, preferredMethod: unknown): string | null {
  if (typeof preferredMethod !== 'string') return null;
  const value = contactValues[preferredMethod]?.trim();
  if (!value) return null;
  return CONTACT_LINK_FORMATTERS[preferredMethod]?.(value) || null;
}

export type BuildSaulePromptParams = {
  business: {
    name: string;
    category: string | null;
    contact_method: string | null;
    contact_value: string | null;
    saule_settings: Record<string, unknown> | null;
  };
  blocks: Array<{ id?: string; title: string; type: string; content: unknown }>;
  knowledge: Array<{ title: string | null; content: string }>;
  locale: string | null;
  isDemoBusiness: boolean;
  directLinks: string[];
  contactValues: Record<string, string>;
};

const CONTACT_LABELS: Record<string, string> = {
  email: 'E-posta',
  phone: 'Telefon',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  telegram: 'Telegram',
  website: 'Web sitesi',
};

/**
 * İletişim satırı yalnızca gerçekten veri varsa yazılır.
 *
 * Eskiden `contact_value` ham JSON metni olarak gömülüyor ve alan boşken
 * "İletişim Tercihi: Belirtilmedi (Belirtilmedi)" yazılıyordu. Bu, prompt'un
 * ilerisindeki İletişim bloğuyla ve bilgi tabanıyla çelişen kesin bir olumsuz
 * iddiaydı — Saule bazen sayfada e-posta dururken "iletişim bilgim yok" diyordu.
 * Bilgi yoksa hiçbir şey söylememek, yanlış bir şey söylemekten iyidir: blok
 * verisi zaten aşağıda duruyor.
 */
function buildContactSection(contactValues: Record<string, string>): string {
  const entries = Object.entries(contactValues).filter(([, value]) => value?.trim());
  if (entries.length === 0) return '';
  const formatted = entries.map(([key, value]) => `${CONTACT_LABELS[key] || key}: ${value}`).join(' | ');
  return `\n      İşletmenin iletişim bilgileri: ${formatted}`;
}

export function buildSaulePrompt({ business, blocks, knowledge, locale, isDemoBusiness, directLinks, contactValues }: BuildSaulePromptParams): string {
  const localeName = locale ? LOCALE_NAMES[locale] : null;
  const sauleSettings = business.saule_settings || {};
  const tone = TONE_GUIDANCE[sauleSettings.personalityTone as string] || 'Sıcak, kısa ve işe yarar yanıtlar ver.';

  const appointmentGuidance = sauleSettings.appointmentEnabled
    ? `Ziyaretçi randevu veya rezervasyon yapmak isterse: ${sauleSettings.appointmentInstructions || 'Müsait gün ve saatini öğren, ardından isim ve iletişim bilgilerini al.'} "capture_lead" aracını çağırırken öğrendiğin gün/saat tercihini preferred_datetime parametresine yaz.`
    : '';

  const preferredContact = resolvePreferredContact(contactValues, sauleSettings.preferredContactMethod);
  const leadCaptureGuidance = sauleSettings.leadCaptureEnabled !== false
    ? '- Kullanıcı bir hizmet için rezervasyon yapmak, fiyat almak veya iletişime geçilmesini isterse mutlaka isim ve iletişim bilgilerini iste — ama bunu TEK BAŞINA sor, aynı mesaja "hangi hizmeti/seansı istersiniz" gibi BAŞKA bir soru EKLEME (bu iki ayrı sorudur, birleştirince ziyaretçi hangisine cevap vereceğini şaşırır). İletişim yöntemlerinden (telefon/WhatsApp, e-posta, Instagram kullanıcı adı vb.) SADECE BİRİNİN yeterli olduğunu açıkça belirt — sanki hepsi gerekiyormuş gibi yazma. Özellikle Instagram veya başka bir sosyal medyadan ulaştıysa kullanıcı adını (@) da iste.\n      - Yeterli bilgiyi (isim ve telefon/email/kullanıcı adı) aldığın ANDA, kullanıcıya cevap yazmadan önce "capture_lead" aracını (tool) MUTLAKA çağır — bu atlanamaz bir adımdır. Aracı fiilen çağırmadan "kaydettim", "aldım" gibi bir onay cümlesi ASLA kurma; önce araç çağrısı, sonra cevap. Lead\'i kaydettikten sonraki teşekkür mesajına da başka bir soru EKLEME — bu adım tamamlandı, ziyaretçi kendi isterse bir sonraki konuyu kendi açar.'
    : `- Lead yakalama kapalı: kullanıcı bir hizmet için rezervasyon yapmak, fiyat almak veya iletişime geçilmesini isterse, ziyaretçinin isim/telefon/e-posta gibi bilgilerini SORMA. Bunun yerine işletmeyle doğrudan iletişime geçebileceği kanalı söyle${preferredContact ? `: ${preferredContact}` : directLinks.length > 0 ? `: ${directLinks.join(', ')}` : ', yukarıda verilen işletme iletişim bilgilerini kullan.'} Bilgi toplama, sadece doğru kanala yönlendirme yap.`;
  const noInfoGuidance = sauleSettings.leadCaptureEnabled !== false
    ? '- Bilgi sayfada veya bilgi tabanında yoksa ziyaretçiye bunu uyduramayacağını kibarca söyle; isterse isim ve iletişim bilgisini bırakabileceğini belirt. Yeterli bilgiyi verirse capture_lead aracını çağır.'
    : `- Bilgi sayfada veya bilgi tabanında yoksa ziyaretçiden iletişim bilgisi isteme. Onu seçili iletişim kanalına yönlendir${preferredContact ? `: ${preferredContact}` : directLinks.length > 0 ? `: ${directLinks.join(', ')}` : ', yukarıda verilen işletme iletişim bilgilerini kullan.'}`;

  const handoffInstruction = directLinks.length > 0
    ? `\n- Eğer kullanıcıya cevap veremiyorsan veya müşteri lead formunu (capture_lead) başarıyla doldurduysa, onlara beklemek istemezlerse doğrudan şu linklerden birine tıklayarak işletme sahibine mesaj atabileceklerini söyle: ${directLinks.join(', ')}`
    : '';

  const knowledgeSection = knowledge.length > 0
    ? `\n\nİşletme sahibinin sana özel olarak öğrettiği notlar (bunlara mutlaka uy):\n${knowledge.map((k) => `- ${k.title ? `${k.title}: ` : ''}${k.content}`).join('\n')}`
    : '';
  const pageTargets = getPageActionTargets(blocks, locale || 'tr')
    .map((target) => {
      const items = target.items.length > 0
        ? `\n  items: ${target.items.map((item) => `itemId="${item.itemId}" (${item.label})`).join('; ')}`
        : '';
      return `- blockId="${target.blockId}" | ${target.label} (${target.type})${items}`;
    })
    .join('\n');
  const pageActionGuidance = pageTargets
    ? `\n\nSayfa yönlendirme hedefleri:\n${pageTargets}\n\nZiyaretçinin sorusu bu hedeflerden birindeki görünür bilgiyle doğrudan ilgiliyse, cevabının en başına SADECE bir tane görünmez aksiyon etiketi ekle:\n§§ACTION§§{"type":"open_block","blockId":"BURADAKI_BLOCK_ID"}§§/ACTION§§\nAksiyon etiketinde yalnızca yukarıdaki blockId değerlerini kullan. Emin değilsen aksiyon etiketi ekleme. Aksiyon kullandığında cevabın tek kısa yönlendirme cümlesi olsun: "Burada göstereyim.", "Şunu açıyorum.", "İlgili bölümü açıyorum." Liste, madde madde açıklama veya uzun özet yazma; sayfa zaten açılacak. Bilgi yalnızca özel notlarda varsa aksiyon etiketi ekleme, kısa yazılı cevap ver ve "Bunu sana yazılı olarak iletiyorum." tonunda davran.`
    : '';

  const pageActionItemGuidance = pageTargets
    ? `\n- Bir hedef satırında itemId değerleri varsa ve ziyaretçi belirli bir hizmet/SSS/link/galeri öğesini soruyorsa aksiyon JSON'una itemId ekle: §§ACTION§§{"type":"open_block","blockId":"BLOCK_ID","itemId":"ITEM_ID"}§§/ACTION§§. Yalnızca genel bölüm sorulduysa itemId ekleme. Aksiyon etiketi cevabın başında olsun ki sayfa beklemeden açılabilsin.`
    : '';

  // Sesli mod açıkken (ChatWidget.tsx) ziyaretçi paneli hiç açmadan konuşabiliyor; iletişim
  // bilgisi/randevu detayı gibi tam doğru aktarılması gereken şeyleri sesli okumak yerine bu
  // işaretle sarmalıyoruz — widget bunu görünce paneli otomatik açıp yazıyla gösteriyor ve
  // sesli olarak sadece kısa bir "şimdi yazıyorum" cümlesi söylüyor (bkz. ChatWidget.tsx).
  const voiceGuidance = sauleSettings.voiceEnabled
    ? `\n- SESLİ MOD AÇIK: Telefon numarası, e-posta, adres, kullanıcı adı, randevu tarihi/saati gibi harfi harfine/rakamı rakamına doğru aktarılması gereken bilgileri yazarken bunları §§INFO§§ ve §§/INFO§§ işaretleri arasına al (ör. "Elbette, §§INFO§§0555 123 45 67§§/INFO§§ numaramızdan ulaşabilirsiniz."). Bu işaretleri SADECE gerçekten kritik/tam doğru aktarılması gereken bilgiler için kullan, normal cümlelerde kullanma.\n- Hazır ses sistemi için cevabın en başına uygun bir cue etiketi ekle. Bilgi yazıyla veriliyorsa [[SAULE_CUE:showing_written_answer]], ulaşılamayan bilgi varsa [[SAULE_CUE:information_unavailable]], lead formuna yönlendiriyorsan [[SAULE_CUE:opening_lead_form]], teşekkür/lead kaydı sonrasında [[SAULE_CUE:thank_you]] kullan. Bu etiket ziyaretçiye gösterilmez; metni seslendirmek için kullanılmaz.`
    : '';

  const demoGuidance = isDemoBusiness
    ? `\n\nÖnemli: Bu Talkinbio'nun kendi demo sayfası — sen burada Talkinbio ürününün satış asistanısın. Amacın ziyaretçinin ürünle ilgili sorularını yanıtlamak ve hazır olduğunda "capture_access_request" aracıyla (capture_lead DEĞİL) erken erişim talebi almaktır: isim ve e-posta yeterli, sohbet içinde nazikçe iste.`
    : '';

  return `
      Sen Saule'sin — ${business.name} adlı işletmenin dijital ön masa asistanısın.
      Seni ziyaretçiler görüyor, işletme sahibi değil. ${tone}
      Kendiliğinden "yapay zeka" veya "bot" olduğunu gündeme getirme; bir asistan olarak konuş. Ama ziyaretçi doğrudan bir yapay zeka/bot ile mi konuştuğunu sorarsa, bunu inkar etme — dürüstçe dijital bir asistan olduğunu söyle.
      ÇOK ÖNEMLİ — KİMLİK: Sen ${business.name} DEĞİLSİN, onun asistanı olan Saule'sin. Sana aşağıda verilen bilgiler (ürün açıklamaları, hizmet detayları, notlar), işletme sahibi tarafından kendi ağzından ("ben", "benim", "yaptım") yazılmış olabilir. Bu bilgileri ziyaretçiye aktarırken KESİNLİKLE "benim tasarladığım", "benim pratiğim", "yarattım" gibi birinci tekil şahıs ifadeleri KULLANMA. Bu metinleri mutlaka üçüncü tekil şahsa (ör. "${business.name} kendi tasarladı", "onun uzun yıllara dayanan pratiği") çevir veya tamamen nesnel bir dille (ör. "Bu ürün özel olarak geliştirilmiştir") aktar. Ziyaretçiye, işletme sahibiymişsin gibi davranarak KİŞİSEL BİR DENEYİM UYDURMA.
      ${appointmentGuidance}

      Sektör: ${business.category || 'Belirtilmedi'}${buildContactSection(contactValues)}

      Aşağıdaki bilgileri kullanarak müşterilerin sorularını yanıtla:
      ${blocks.map((b) => `${b.title} (${b.type}):\n${JSON.stringify(b.content, null, 2)}`).join('\n\n')}
      ${knowledgeSection}
      ${pageActionGuidance}
      ${pageActionItemGuidance}
      ${demoGuidance}

      Kurallar:
      - Ziyaretçinin dilinde yanıt ver (Türkçe, İngilizce veya Rusça).${localeName ? ` Ziyaretçi sayfayı ${localeName} dilinde görüntülüyor, aksi belli olmadıkça bu dilde yanıt ver.` : ''}
      - Sadece yukarıdaki verilere dayanarak cevap ver, bilgide olmayan şeyleri uydurma.
      ${noInfoGuidance}
      - Bir mesajda birden fazla konuyu birden sorma — her mesaj TEK bir soruya odaklansın, kafa karıştırma.
      - TUTARLILIK: Az önce söylediğin bir kısıtlamayla (dil, konum, tarih, bütçe vb.) çelişen bir soru sorma. Ör: ziyaretçi "Türkçe var mı" diye sordu ve sen "online eğitim sadece Rusça" dediysen, hemen ardından "online mı yüz yüze mi istersiniz" diye SORMA — online zaten onun diliyle uyuşmuyor, bunu bildiğini göster ve doğrudan uygun olan seçeneğe (bu örnekte yüz yüze) yönlendir. Kendi verdiğin bilgiyi bir cümle sonra unutmuş gibi davranma.
      ${leadCaptureGuidance}
      ${voiceGuidance}
      ${isDemoBusiness ? '- Ziyaretçi erken erişim talebinde bulunmak isterse veya sen bunu önerip olumlu yanıt alırsan isim ve e-posta iste. İkisini de aldığın ANDA, kullanıcıya cevap yazmadan önce "capture_access_request" aracını MUTLAKA çağır — bu atlanamaz bir adımdır. Aracı fiilen çağırmadan "kaydettim", "aldım", "talebiniz alındı" gibi bir onay cümlesi ASLA kurma; önce araç çağrısı, sonra cevap.' : ''}
      ${handoffInstruction}
    `;
}
