import { generateText, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// Planla v2 — trend-aramalı (grounded) fikir üretimi. `agents/shared/generateOnce.ts`
// KULLANILMIYOR: o `tools` desteklemiyor (düz metin tamamlama). Web search Anthropic'e
// ÖZEL bir "provider-executed" araç (`@ai-sdk/anthropic`'in `tools.webSearch_20250305`'i
// — Anthropic sunucusunda çalışır, bizim bir executor fonksiyonumuz gerekmiyor) — bu
// yüzden `utils/ai.ts`'teki çoklu-sağlayıcı `getModel(task)` soyutlaması BİLEREK
// atlanıyor (o Gemini'ye de düşebilir, bu araç yalnızca Claude'da var).
//
// Model seçimi: `AI_MODEL_SAULE`/`AI_MODEL_PLANLA_TREND` env'i BİR Claude model id'si
// OLMALI — sessizce Gemini'ye düşmüyoruz (yanlış sağlayıcıyla garip bir hata yerine
// net bir kurulum mesajı), `falKey()` (fal.ts) ile AYNI "fail loud" ilkesi.
function resolveGroundedModelName(): string {
  const configured = process.env.AI_MODEL_PLANLA_TREND || process.env.AI_MODEL_SAULE;
  if (!configured || configured.startsWith('gemini')) {
    throw new Error(
      "Trend aramalı fikir üretimi için bir Claude modeli gerekiyor (web search tool Anthropic'e özel) — " +
        '.env.local dosyasına AI_MODEL_PLANLA_TREND (ya da AI_MODEL_SAULE) değişkenini bir Claude model id\'siyle ekleyip sunucuyu yeniden başlat.',
    );
  }
  return configured;
}

export type GroundedGenerateParams = {
  system: string;
  prompt: string;
};

export type GroundedGenerateResult = {
  text: string;
  model: string;
  usage: unknown;
};

/**
 * `generateOnce`'ın grounded (web search'lü) karşılığı. `stopWhen: stepCountIs(3)` —
 * araç provider-executed olduğu için tek adımda kendiliğinden sonuçlanabilir; bu
 * yalnızca bir ÜST SINIR (model birden fazla arama yapmak isterse izin verir).
 * `maxUses: 3` ile toplam arama sayısı ayrıca sınırlanıyor (maliyet tavanı, bkz.
 * `PLANLA_IDEA_GENERATE_GROUNDED_COST_USD` yorumu, config/contentPlan.ts).
 */
export async function generateGroundedIdeas({ system, prompt }: GroundedGenerateParams): Promise<GroundedGenerateResult> {
  const modelName = resolveGroundedModelName();

  const result = await generateText({
    model: anthropic(modelName),
    system,
    prompt,
    tools: {
      web_search: anthropic.tools.webSearch_20250305({ maxUses: 3 }),
    },
    stopWhen: stepCountIs(3),
  });

  return { text: result.text, model: modelName, usage: result.usage };
}
