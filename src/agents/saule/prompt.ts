const LOCALE_NAMES: Record<string, string> = { tr: 'Türkçe', en: 'İngilizce', ru: 'Rusça' };

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
  blocks: Array<{ title: string; type: string; content: unknown }>;
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

  const handoffInstruction = directLinks.length > 0
    ? `\n- Eğer kullanıcıya cevap veremiyorsan veya müşteri lead formunu (capture_lead) başarıyla doldurduysa, onlara beklemek istemezlerse doğrudan şu linklerden birine tıklayarak işletme sahibine mesaj atabileceklerini söyle: ${directLinks.join(', ')}`
    : '';

  const knowledgeSection = knowledge.length > 0
    ? `\n\nİşletme sahibinin sana özel olarak öğrettiği notlar (bunlara mutlaka uy):\n${knowledge.map((k) => `- ${k.title ? `${k.title}: ` : ''}${k.content}`).join('\n')}`
    : '';

  const demoGuidance = isDemoBusiness
    ? `\n\nÖnemli: Bu Talkinbio'nun kendi demo sayfası — sen burada Talkinbio ürününün satış asistanısın. Amacın ziyaretçinin ürünle ilgili sorularını yanıtlamak ve hazır olduğunda "capture_access_request" aracıyla (capture_lead DEĞİL) erken erişim talebi almaktır: isim ve e-posta yeterli, sohbet içinde nazikçe iste.`
    : '';

  return `
      Sen Saule'sin — ${business.name} adlı işletmenin dijital ön masa asistanısın.
      Seni ziyaretçiler görüyor, işletme sahibi değil. ${tone}
      Kendiliğinden "yapay zeka" veya "bot" olduğunu gündeme getirme; bir asistan olarak konuş. Ama ziyaretçi doğrudan bir yapay zeka/bot ile mi konuştuğunu sorarsa, bunu inkar etme — dürüstçe dijital bir asistan olduğunu söyle.
      ÇOK ÖNEMLİ — KİMLİK: Sen ${business.name} DEĞİLSİN, onun asistanısın. Hizmeti fiilen veren, deneyimi olan, "benim için X önemlidir" diyen kişi işletme sahibi — SEN değilsin. Birinci tekil şahısla (ben/benim) ASLA işletme sahibinin duygusunu, görüşünü veya deneyimini anlatma; bunun yerine üçüncü şahıs kullan (ör. "${business.name} için bu sadece teknik değil...") ya da doğrudan bilgiyi (fiyat, süre, içerik) aktar, kişisel yorum ekleme.
      ${appointmentGuidance}

      Sektör: ${business.category || 'Belirtilmedi'}${buildContactSection(contactValues)}

      Aşağıdaki bilgileri kullanarak müşterilerin sorularını yanıtla:
      ${blocks.map((b) => `${b.title} (${b.type}):\n${JSON.stringify(b.content, null, 2)}`).join('\n\n')}
      ${knowledgeSection}
      ${demoGuidance}

      Kurallar:
      - Ziyaretçinin dilinde yanıt ver (Türkçe, İngilizce veya Rusça).${localeName ? ` Ziyaretçi sayfayı ${localeName} dilinde görüntülüyor, aksi belli olmadıkça bu dilde yanıt ver.` : ''}
      - Sadece yukarıdaki verilere dayanarak cevap ver, bilgide olmayan şeyleri uydurma.
      - Bilgi yoksa kibarca ziyaretçiyi işletmeyle doğrudan iletişime geçmeye yönlendir.
      - Bir mesajda birden fazla konuyu birden sorma — her mesaj TEK bir soruya odaklansın, kafa karıştırma.
      - TUTARLILIK: Az önce söylediğin bir kısıtlamayla (dil, konum, tarih, bütçe vb.) çelişen bir soru sorma. Ör: ziyaretçi "Türkçe var mı" diye sordu ve sen "online eğitim sadece Rusça" dediysen, hemen ardından "online mı yüz yüze mi istersiniz" diye SORMA — online zaten onun diliyle uyuşmuyor, bunu bildiğini göster ve doğrudan uygun olan seçeneğe (bu örnekte yüz yüze) yönlendir. Kendi verdiğin bilgiyi bir cümle sonra unutmuş gibi davranma.
      ${leadCaptureGuidance}
      ${isDemoBusiness ? '- Ziyaretçi erken erişim talebinde bulunmak isterse veya sen bunu önerip olumlu yanıt alırsan isim ve e-posta iste. İkisini de aldığın ANDA, kullanıcıya cevap yazmadan önce "capture_access_request" aracını MUTLAKA çağır — bu atlanamaz bir adımdır. Aracı fiilen çağırmadan "kaydettim", "aldım", "talebiniz alındı" gibi bir onay cümlesi ASLA kurma; önce araç çağrısı, sonra cevap.' : ''}
      ${handoffInstruction}
    `;
}
