import { LOCALE_KEYS, type LocaleKey } from '@/config/localeTitles';
import type { StudioCaption } from '@/config/studio';

// Düzenle → çok dilli altyazı. `localeSync.ts`'teki `buildTranslatePrompt` ile AYNI
// gerekçeyle ayrı bir dosya: farklı kaynak şekli (blok içeriği değil, whisper
// transkriptinden gelen düz {id, text} listesi), farklı çağıran (studio route'u,
// content/generate değil). Kasıtlı olarak zaman damgası (startTime/endTime) modele
// HİÇ gönderilmiyor — `StudioTranslatedCaptions` (config/studio.ts) kaynak diziden
// aynen kopyalıyor, model sadece `text`'i çevirir. Bu hem maliyeti düşürür (daha az
// token) hem de modelin zamanlamayı "düzeltmeye" çalışıp bozmasını imkansız kılar.
//
// Parça SAYISI/SIRASI (id listesi) sabit kalmak ZORUNDA (her id bir whisper zaman
// damgasına bağlı) — ama parça↔kaynak-kelime eşleşmesi KASITLI OLARAK esnek: model tam
// cümleyi doğal çevirip aynı sayıda parçaya bölüyor, id'ler sırayla dolduruluyor. Önceki
// sürüm "her parçayı KENDİ kaynak kelimesinin birebir çevirisi yap" diyordu — bu, farklı
// kelime sırası/çekim gerektiren diller (ör. RU→TR) için gramer bozuk, kelime-kelime bir
// çıktı üretiyordu (kullanıcı geri bildirimi, 2026-08-08). Şimdi model önce tüm cümleyi
// anlayıp doğal çeviriyor, SONRA parçalıyor — id sırası (=zamanlama sırası) hâlâ korunuyor
// ama parça içeriği artık "o anda konuşulan TAM kelime" değil, "doğal cümlenin o sıradaki
// parçası" anlamına geliyor.

export type CaptionTranslateItem = { id: string; text: string };

const LOCALE_LABELS: Record<LocaleKey, string> = { tr: 'Türkçe', en: 'İngilizce (English)', ru: 'Rusça (Русский)' };

export function isLocaleKey(v: unknown): v is LocaleKey {
  return typeof v === 'string' && (LOCALE_KEYS as string[]).includes(v);
}

/**
 * Builds the single-shot caption translation prompt. Output contract: a flat JSON object
 * keyed by the source items' `id`, values are the translated text — nothing else (no
 * timestamps, no reordering). Caller (route) maps the result back onto the ORIGINAL
 * caption array by id, preserving startTime/endTime untouched.
 */
export function buildCaptionTranslatePrompt({
  captions,
  targetLocale,
}: {
  captions: CaptionTranslateItem[];
  targetLocale: LocaleKey;
}): { system: string; prompt: string } {
  const system = `Sen bir profesyonel çevirmensin. Sana bir videonun altyazı parçaları (whisper transkripsiyonundan, çoğunlukla tek tek kelimeler) JSON dizi olarak veriliyor. Görevin, bu parçaların TAMAMINI TEK BİR METİN gibi okuyup ${LOCALE_LABELS[targetLocale]} diline Google Translate kalitesinde DOĞAL ve GRAMATİK OLARAK DOĞRU çevirmek — parça parça, birbirinden kopuk kelime kelime değil.

Kurallar:
- Önce TÜM parçaları art arda okuyup cümlenin/cümlelerin tam anlamını kavra, sonra hedef dilde akıcı ve gramatik olarak doğru TAM bir çeviri üret.
- Bu çeviriyi, kaynaktaki parça SAYISI kadar parçaya bölüp id'lere SIRAYLA dağıt. Parça SAYISINI ve SIRASINI (id listesi) değiştirme, hiçbirini atlama.
- AMA her parçanın metni, karşılık geldiği kaynak kelimenin BİREBİR çevirisi olmak ZORUNDA DEĞİL — hedef dilin doğru kelime sırasını/çekimini/edatını kullan; gerekirse bir kaynak kelimenin karşılığını birden fazla parçaya yay, ya da birden fazla kaynak kelimenin karşılığını tek parçada topla. Önemli olan: parçalar id sırasına göre yan yana okunduğunda eksiksiz, doğal ve gramatik olarak doğru bir cümle oluşturması — kaynaktaki kelime kelime yapının aynen korunması DEĞİL.
- Marka adları, kişi isimleri ve sayıları OLDUĞU GİBİ bırak.

SADECE aşağıdaki şemaya uyan geçerli bir JSON nesnesi döndür, başka hiçbir açıklama veya metin ekleme. Anahtarlar kaynaktaki "id" alanlarıdır, değerler çevrilmiş metindir:
{${captions
    .slice(0, 3)
    .map((c) => `"${c.id}": "..."`)
    .join(', ')}${captions.length > 3 ? ', ...' : ''}}`;

  const prompt = `Hedef dil: ${targetLocale}
Çevrilecek altyazı parçaları (JSON):
${JSON.stringify(captions)}`;

  return { system, prompt };
}

/** Modelin `{id: metin}` çıktısını kaynak diziye geri uygular — zaman damgaları kaynaktan
 *  AYNEN gelir, model hiç görmedi. Modelin atladığı/boş bıraktığı bir id varsa o parça
 *  sonuca girmez (route bunu "kısmi çeviri" olarak ele alıp reddedebilir). */
export function applyCaptionTranslations(source: StudioCaption[], translated: Record<string, string>): StudioCaption[] {
  return source
    .filter((c) => typeof translated[c.id] === 'string' && translated[c.id].trim().length > 0)
    .map((c) => ({ ...c, text: translated[c.id] }));
}
