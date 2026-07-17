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

export function parseContactInfo(contactValue: string | null | undefined): ContactInfo {
  let contactValues: Record<string, string> = {};
  const directLinks: string[] = [];
  try {
    contactValues = contactValue ? JSON.parse(contactValue) : {};
    if (contactValues.instagram) directLinks.push(`Instagram: https://ig.me/m/${contactValues.instagram.replace('@', '')}`);
    if (contactValues.whatsapp) directLinks.push(`WhatsApp: https://wa.me/${contactValues.whatsapp.replace(/[^0-9]/g, '')}`);
    if (contactValues.telegram) directLinks.push(`Telegram: https://t.me/${contactValues.telegram.replace('@', '')}`);
  } catch {
    // contact_value not valid JSON yet (new business) — treat as empty.
  }
  return { contactValues, directLinks };
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
};

export function buildSaulePrompt({ business, blocks, knowledge, locale, isDemoBusiness, directLinks }: BuildSaulePromptParams): string {
  const localeName = locale ? LOCALE_NAMES[locale] : null;
  const sauleSettings = business.saule_settings || {};
  const tone = TONE_GUIDANCE[sauleSettings.personalityTone as string] || 'Sıcak, kısa ve işe yarar yanıtlar ver.';

  const appointmentGuidance = sauleSettings.appointmentEnabled
    ? `Ziyaretçi randevu veya rezervasyon yapmak isterse: ${sauleSettings.appointmentInstructions || 'Müsait gün ve saatini öğren, ardından isim ve iletişim bilgilerini al.'} "capture_lead" aracını çağırırken öğrendiğin gün/saat tercihini preferred_datetime parametresine yaz.`
    : '';

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
      ${appointmentGuidance}

      Sektör: ${business.category || 'Belirtilmedi'}
      İletişim Tercihi: ${business.contact_method || 'Belirtilmedi'} (${business.contact_value || 'Belirtilmedi'})

      Aşağıdaki bilgileri kullanarak müşterilerin sorularını yanıtla:
      ${blocks.map((b) => `${b.title} (${b.type}):\n${JSON.stringify(b.content, null, 2)}`).join('\n\n')}
      ${knowledgeSection}
      ${demoGuidance}

      Kurallar:
      - Ziyaretçinin dilinde yanıt ver (Türkçe, İngilizce veya Rusça).${localeName ? ` Ziyaretçi sayfayı ${localeName} dilinde görüntülüyor, aksi belli olmadıkça bu dilde yanıt ver.` : ''}
      - Sadece yukarıdaki verilere dayanarak cevap ver, bilgide olmayan şeyleri uydurma.
      - Bilgi yoksa kibarca ziyaretçiyi işletmeyle doğrudan iletişime geçmeye yönlendir.
      ${sauleSettings.leadCaptureEnabled !== false ? '- Kullanıcı bir hizmet için rezervasyon yapmak, fiyat almak veya iletişime geçilmesini isterse mutlaka isim ve iletişim bilgilerini iste. Özellikle Instagram veya başka bir sosyal medyadan ulaştıysa kullanıcı adını (@) da iste.\n      - Yeterli bilgiyi (isim ve telefon/email/kullanıcı adı) aldığında "capture_lead" aracını (tool) çağırarak kaydı tamamla ve kullanıcıya işletmenin onlara ulaşacağını söyle.' : ''}
      ${isDemoBusiness ? '- Ziyaretçi erken erişim talebinde bulunmak isterse veya sen bunu önerip olumlu yanıt alırsan isim ve e-posta iste; ikisini de aldığında "capture_access_request" aracını çağırarak talebi kaydet.' : ''}
      ${handoffInstruction}
    `;
}
