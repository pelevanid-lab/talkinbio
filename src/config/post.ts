// Beiwe Post — ekran kaydı / görsel → marka şablonlu gönderi.
//
// TASARIM KARARI: şablonlar KİLİTLİ.
//
// Mevcut `CharacterOverlayEditor` tamamen serbest (konum, hizalama, font, punto, renk
// hepsi ayarlanabilir). Bu, tek bir kare için iyi ama bir IZGARA için felaket: her
// gönderi biraz farklı görünür, hesap "marka" gibi durmaz. ElevenLabs ızgarasını
// ElevenLabs yapan şey ürettikleri içerik değil, her karoya vuran aynı rozet/tipografi/
// yerleşim disiplini (2026-07-29 incelemesi).
//
// Bu yüzden burada kullanıcının değiştirebileceği şey yalnızca: METİN, GÖRSEL, FORMAT ve
// hangi ŞABLON. Tipografi, konum, renk, kenar boşluğu şablonun içinde sabit.

/** globals.css'teki `:root` değişkenlerinin aynası — canvas CSS değişkeni okuyamıyor. */
export const BRAND = {
  paper: '#F4F2ED',
  ink: '#14231F',
  inkSoft: '#4B5A55',
  muted: '#8A8880',
  coral: '#FF6A5C',
  coralTint: '#FFEDE9',
  teal: '#50e3c2',
  tealDeep: '#2B6F5C',
} as const;

export type PostFormat = {
  id: string;
  label: string;
  width: number;
  height: number;
  hint: string;
};

/** Instagram'ın üç asıl yerleşimi. 1080 genişlik her üçünde de yeterli (IG zaten sıkıştırıyor). */
export const POST_FORMATS: PostFormat[] = [
  { id: 'feed', label: 'Gönderi 4:5', width: 1080, height: 1350, hint: 'Akışta en çok yer kaplayan oran' },
  { id: 'square', label: 'Kare 1:1', width: 1080, height: 1080, hint: 'Izgarada güvenli, karma içerik' },
  { id: 'story', label: 'Story / Reel 9:16', width: 1080, height: 1920, hint: 'Tam ekran dikey' },
];

export type PostTemplateId = 'ekran' | 'duyuru' | 'aci' | 'soz';

export type PostTemplate = {
  id: PostTemplateId;
  label: string;
  /** Hangi içerik sütununu besliyor (bkz. 2026-07-29 sosyal medya planı). */
  pillar: string;
  hint: string;
  /**
   * contain: görsel çerçevelenir, marka zemini üstünde durur (ekran kayıtları 16:9,
   *          dikey formata kırpılırsa arayüz kesilir — bu yüzden kırpmak değil çerçevelemek).
   * cover:   görsel tam kanar, kırpılır.
   * none:    görselsiz, düz zemin.
   */
  imageMode: 'contain' | 'cover' | 'none';
  background: string;
  headlineColor: string;
  sublineColor: string;
  /** Kanvas yüksekliğinin yüzdesi. */
  headlineSizePct: number;
  sublineSizePct: number;
  wordmarkColor: string;
  /** Görselin üstüne karartma bindirilsin mi (yalnız `cover`). */
  scrim: 'none' | 'bottom' | 'full';
};

/**
 * Dört şablon, dört iş. Fazlası tutarlılığı bozar — bu katmanın amacı seçenek sunmak
 * değil, seçeneği KISITLAMAK.
 */
export const POST_TEMPLATES: PostTemplate[] = [
  {
    id: 'ekran',
    label: 'Ürün çalışıyor',
    pillar: 'Ekran kaydı · nasıl yapılır',
    hint: 'Ekran görüntüsü koyu zeminde çerçevelenir, başlık üstte. En güçlü içerik biçimi.',
    imageMode: 'contain',
    background: BRAND.ink,
    headlineColor: BRAND.paper,
    sublineColor: BRAND.muted,
    headlineSizePct: 4.6,
    sublineSizePct: 2.3,
    wordmarkColor: BRAND.muted,
    scrim: 'none',
  },
  {
    id: 'duyuru',
    label: 'X yayında',
    pillar: 'Özellik duyurusu',
    hint: 'Görsel tam kanar, üstüne koyu perde ve ortada iri başlık.',
    imageMode: 'cover',
    background: BRAND.ink,
    headlineColor: BRAND.paper,
    sublineColor: BRAND.paper,
    headlineSizePct: 8,
    sublineSizePct: 2.8,
    wordmarkColor: 'rgba(244,242,237,0.75)',
    scrim: 'full',
  },
  {
    id: 'aci',
    label: 'Acıyı adlandır',
    pillar: 'Problem farkındalığı',
    hint: 'Görsel tam kanar, altta karartma, başlık sol altta. B-roll için tasarlandı.',
    imageMode: 'cover',
    background: BRAND.ink,
    headlineColor: BRAND.paper,
    sublineColor: 'rgba(244,242,237,0.8)',
    headlineSizePct: 5.6,
    sublineSizePct: 2.5,
    wordmarkColor: 'rgba(244,242,237,0.7)',
    scrim: 'bottom',
  },
  {
    id: 'soz',
    label: 'Söz / istatistik',
    pillar: 'Görselsiz',
    hint: 'Görsel yok. Mercan zeminde iri metin — üretim maliyeti sıfır, ızgarada ritim kurar.',
    imageMode: 'none',
    background: BRAND.coral,
    headlineColor: BRAND.ink,
    sublineColor: 'rgba(20,35,31,0.7)',
    headlineSizePct: 7,
    sublineSizePct: 2.6,
    wordmarkColor: 'rgba(20,35,31,0.55)',
    scrim: 'none',
  },
];

export function findPostTemplate(id: unknown): PostTemplate | undefined {
  return typeof id === 'string' ? POST_TEMPLATES.find((t) => t.id === id) : undefined;
}

export function findPostFormat(id: unknown): PostFormat | undefined {
  return typeof id === 'string' ? POST_FORMATS.find((f) => f.id === id) : undefined;
}
