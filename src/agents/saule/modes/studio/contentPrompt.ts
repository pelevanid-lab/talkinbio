export type ContentSourceType = 'service' | 'gallery' | 'testimonial' | 'general';
export type ContentFormat = 'instagram_post' | 'instagram_story' | 'whatsapp_status';

export type ContentSource = {
  type: ContentSourceType;
  title: string;
  description?: string;
};

export type ContentBusinessInfo = {
  name: string;
  category: string | null;
};

const FORMAT_GUIDANCE: Record<ContentFormat, string> = {
  instagram_post: 'Instagram gönderi metni: 2-4 kısa cümle veya kısa paragraf, ilgi çekici bir açılış cümlesiyle başla, sonunda 3-5 ilgili hashtag öner (hashtags alanına, metnin içine gömme).',
  instagram_story: 'Instagram hikaye (story) metni: tek, çok kısa ve çarpıcı bir cümle (maksimum ~12 kelime), hashtag YOK.',
  whatsapp_status: 'WhatsApp durum metni: tek kısa satır, samimi ve doğrudan, markdown veya emoji yığını yok, en fazla 1 emoji.',
};

const SOURCE_LABEL: Record<ContentSourceType, string> = {
  service: 'Hizmet',
  gallery: 'Galeri görseli',
  testimonial: 'Müşteri yorumu',
  general: 'Genel işletme tanıtımı',
};

export type BuildContentPromptParams = {
  business: ContentBusinessInfo;
  source: ContentSource;
  format: ContentFormat;
};

/**
 * v1'de yalnız metin üretilir (görsel şablon üretimi kapsam dışı, ROADMAP.md Faz 3.2).
 * Çıktı sözleşmesi: {"tr": {"caption": string, "hashtags"?: string[]}, "en": {...}, "ru": {...}}
 */
export function buildContentPrompt({ business, source, format }: BuildContentPromptParams): { system: string; prompt: string } {
  const system = `Sen Saule'sin — ${business.name} adlı işletmenin sosyal medya içerik asistanısın (Studio mode, content generation).
İşletme sektörü: ${business.category || 'belirtilmedi'}.
Görevin: aşağıda verilen içerik kaynağından, istenen formata uygun, işletmenin tonuna yakışan bir sosyal medya metni üretmek.

Format: ${FORMAT_GUIDANCE[format]}

Metinleri TÜRKÇE, İNGİLİZCE ve RUSÇA olmak üzere üç dilde üret (çeviri değil, her dilde doğal okunan ayrı bir metin).

SADECE aşağıdaki şemaya uyan geçerli bir JSON nesnesi döndür, başka hiçbir metin ekleme:
{"tr": {"caption": "...", "hashtags": ["...", "..."]}, "en": {"caption": "...", "hashtags": ["...", "..."]}, "ru": {"caption": "...", "hashtags": ["...", "..."]}}
"instagram_post" dışındaki formatlarda "hashtags" alanını boş dizi olarak bırak.`;

  const prompt = `İçerik kaynağı — ${SOURCE_LABEL[source.type]}:
Başlık: ${source.title}
${source.description ? `Açıklama: ${source.description}` : ''}`;

  return { system, prompt };
}
