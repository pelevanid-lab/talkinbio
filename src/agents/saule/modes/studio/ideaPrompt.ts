import type { ContentPillar } from '@/config/contentPlan';

export type IdeaGenerationParams = {
  business: { name: string; category: string | null };
  pillars: ContentPillar[];
  count: number;
  /** true ise sistem talimatı modele `web_search` aracını KULLANMASINI emreder ve her
   *  fikrin `trendNote`sunu doldurmasını ister — bkz. `trendSearch.ts` (aracın kendisi
   *  burada değil, çağıran tarafta `generateText`e bağlanıyor). false ise araç hiç
   *  verilmiyor, model kendi bilgisiyle üretiyor ve `trendNote` boş kalıyor. */
  grounded: boolean;
};

/**
 * Haftalık içerik fikri üretimi — sütunlara bağlı, somut ve üretilmeye hazır. Çıktı
 * sözleşmesi: `[{pillarLabel, title, brief, format, trendNote}]`. `pillarLabel` modelin
 * yukarıda verilen sütun listesinden seçtiği `label` — çağıran taraf (route) bunu
 * `pillar_id`'ye eşliyor, model DB id'sini hiç görmüyor.
 */
export function buildIdeaPrompt({ business, pillars, count, grounded }: IdeaGenerationParams): { system: string; prompt: string } {
  const pillarList =
    pillars.length > 0
      ? pillars.map((p) => `- "${p.label}": ${p.description}`).join('\n')
      : '(henüz tanımlı sütun yok — işletmeye uygun kendi temalarını kullan, "pillarLabel" alanını boş bırak)';

  const groundingInstruction = grounded
    ? `\nÖNCE web_search aracıyla ${business.category || business.name} sektöründeki GÜNCEL trend/gündemi araştır (birkaç arama yeterli). Fikirleri bu güncel bilgiye dayandır — her fikrin "trendNote" alanına hangi güncel bağlamdan esinlendiğini KISACA (tek cümle, kaynak adı değil) yaz. Araştırma yapmadan fikir üretme.`
    : `\n"trendNote" alanını HER ZAMAN boş string ("") bırak — bu modda güncel arama yapılmıyor, kendi bilgini kullan.`;

  const system = `Sen Saule'sin — ${business.name} adlı işletmenin sosyal medya stratejistisin (Studio mode, Planla → fikir üretimi).
İşletme sektörü: ${business.category || 'belirtilmedi'}.

İçerik sütunları:
${pillarList}
${groundingInstruction}

Görevin: ${count} adet somut, üretilmeye hazır içerik fikri önermek. Her fikir mümkünse yukarıdaki sütunlardan birine bağlı olmalı ("pillarLabel" alanına sütunun TAM "label" metnini yaz). Format olarak instagram_post/instagram_story/whatsapp_status'tan en uygununu seç.

SADECE aşağıdaki şemaya uyan geçerli bir JSON dizisi döndür, başka hiçbir açıklama veya metin ekleme:
[{"pillarLabel": "...", "title": "kısa fikir başlığı", "brief": "1-2 cümlelik üretim notu — ne anlatılacak, hangi ton/açı", "format": "instagram_post", "trendNote": "..."}]`;

  const prompt = `${count} fikir üret.`;

  return { system, prompt };
}
