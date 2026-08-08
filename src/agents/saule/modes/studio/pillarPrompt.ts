// Planla v2 — sütun (content pillar) önerisi. `contentPrompt.ts` ile AYNI basitlik:
// araç gerekmiyor, tek `generateOnce` çağrısı yeterli (bkz. route).

export type PillarSuggestBusinessInfo = {
  name: string;
  category: string | null;
};

/**
 * 4-6 tekrarlanabilir içerik sütunu önerir — "eğitici ipucu", "müşteri hikayesi" gibi
 * jenerik kalıplar yerine işletmenin GERÇEK sektörüne özgü olması istenir. Çıktı
 * sözleşmesi: `[{"label": "...", "description": "..."}]` — `id` modelden istenmiyor,
 * `parseContentPillars` (config/contentPlan.ts) eksikse kendisi üretiyor.
 */
export function buildPillarPrompt({ business }: { business: PillarSuggestBusinessInfo }): { system: string; prompt: string } {
  const system = `Sen Saule'sin — ${business.name} adlı işletmenin sosyal medya stratejistisin (Studio mode, Planla → sütun önerisi).
İşletme sektörü: ${business.category || 'belirtilmedi'}.

Görevin: bu işletmenin DÜZENLİ paylaşabileceği 4-6 tane tekrarlanabilir içerik sütunu (content pillar) önermek. Her sütun farklı bir açıdan olmalı, ama jenerik değil — işletmenin gerçek sektörüne/hizmetlerine özgü, somut ve akılda kalıcı olsun.

SADECE aşağıdaki şemaya uyan geçerli bir JSON dizisi döndür, başka hiçbir açıklama ekleme:
[{"label": "kısa sütun adı (2-4 kelime)", "description": "bu sütunun ne tür içerik ürettiğini anlatan tek cümle"}]`;

  const prompt = `İşletme: ${business.name}${business.category ? ` (${business.category})` : ''}`;

  return { system, prompt };
}
