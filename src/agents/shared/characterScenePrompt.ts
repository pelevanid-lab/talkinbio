// Faz S.4 — Türkçe sahne tarifini, görsel modelinin anladığı İngilizce sahne prompt'una çevirir.
//
// Sadece SAHNE üretilir: ortam, kadraj, ışık, poz, aksiyon. Karakterin yüzü/saçı/yapısı
// bilerek kapsam dışı — o `src/config/characters.ts`'teki kilitli `identityPrompt`'tan
// gelir ve model burada onu tekrar tarif ederse iki tarif çakışıp kimlik kayar.

import type { CharacterDefinition } from '@/config/characters';

export type BuildScenePromptParams = {
  character: CharacterDefinition;
  /** Kullanıcının Türkçe yazdığı sahne tarifi. */
  intent: string;
  /** Seçili şablonun İngilizce tarifi (varsa) — niyet bunun üzerine bindirilir. */
  presetPrompt?: string;
  /** Sahne referansı yüklendiyse model bunu bilmeli. */
  hasSceneReference: boolean;
};

/**
 * Çıktı sözleşmesi: düz metin, tek paragraf, İngilizce sahne tarifi.
 * JSON değil — tek bir alan üretiliyor, ayrıştırma katmanı gereksiz karmaşıklık olurdu.
 */
export function buildScenePrompt({
  character,
  intent,
  presetPrompt,
  hasSceneReference,
}: BuildScenePromptParams): { system: string; prompt: string } {
  const system = `Sen bir fotoğraf yönetmenisin. Görevin, Türkçe yazılmış bir sahne isteğini, görsel üretim modeline verilecek İNGİLİZCE bir sahne tarifine çevirmek.

Kurallar:
- SADECE sahneyi tarif et: ortam, kadraj, kamera açısı, ışık, poz, aksiyon, atmosfer, varsa kıyafet.
- Kişinin yüzünü, saçını, yaşını, etnik kökenini, vücut yapısını ASLA tarif etme — bunlar ayrı bir katmanda kilitli ve tekrar tarif edersen kimlik bozulur. "she"/"her" diyerek geç.
- Kıyafetten söz edeceksen bu paletin dışına çıkma: ${character.wardrobePrompt}
- Fotoğrafik ve somut yaz; soyut sıfat yığını yapma. 2-4 cümle, tek paragraf.
- Sahnede okunabilir yazı, tabela, arayüz metni veya altyazı isteme.${
    hasSceneReference
      ? '\n- Kullanıcı bir sahne referans görseli yükledi (ör. ekran görüntüsü veya mekan). Tarifte bunun sahnede NEREYE yerleşeceğini belirt (ör. "displayed on the laptop screen"), ama içeriğini tarif etme.'
      : ''
  }

SADECE İngilizce sahne tarifini döndür. Açıklama, başlık, tırnak veya markdown ekleme.`;

  const prompt = [
    presetPrompt ? `Seçili şablon (temel alınacak): ${presetPrompt}` : null,
    `Kullanıcının Türkçe sahne isteği: ${intent}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, prompt };
}
