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

/**
 * `fal-ai/imageutils/rembg` (bkz. fal.ts `removeImageBackground`) — DOĞRULANDI, 2026-07-31
 * kurucu testinde gerçek bir çağrı $0,0045/görsel'e mal oldu. Model kimliği de bu çağrıyla
 * doğrulanmış oldu (artık "DOĞRULANMADI" değil).
 */
export const ESTIMATED_BG_REMOVAL_COST_USD = 0.0045;

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

export type PostTemplateId =
  | 'ekran'
  | 'duyuru'
  | 'aci'
  | 'soz'
  | 'obje-vitrini'
  | 'gradient-duyuru'
  | 'buyuk-rakam'
  | 'karanlik-sinematik'
  | 'alinti-karti'
  | 'sinema-posteri'
  | 'neon-vurgu'
  | 'manifesto'
  | 'ayna-ikili-ton'
  | 'ilham-karti';

/**
 * Zemin — düz renkten (eski davranış) gradient/mesh'e genişletildi (proje planı Faz 2), sonra
 * `split`e (proje planı Faz 5 — "5 yaratıcı şablon" turu, bkz. 'ayna-ikili-ton'). `postRenderer.ts`'teki
 * `paintBackground` bu türleri çizer; grain/vignette (bkz. `utils/canvasEffects.ts`, Studio'nunkiyle
 * AYNI fonksiyonlar) ayrıca `PostTemplate.grain`/`vignette` alanlarıyla İSTEĞE BAĞLI uygulanır.
 */
export type PostBackground =
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string; angle: number } // derece, 0 = soldan sağa
  | { kind: 'mesh'; colors: [string, string, string, string] } // dört köşe, mesh-gradient hissi
  | { kind: 'split'; left: string; right: string; angle: number }; // düz çizgiyle ikiye bölünmüş zemin

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
   * card:    metin (+ küçük bir küçük resim) zeminin ÜSTÜNDE, ortada yüzen gölgeli beyaz bir
   *          kartın içinde durur — "alıntı kartı", bkz. postRenderer.ts imageMode:'card' yorumu.
   * list:    görselsiz, rozet + başlık + altında 2x2 ipucu kartı ızgarası — "ilham kartı",
   *          bkz. postRenderer.ts imageMode:'list' yorumu, `PostTexts.items`.
   */
  imageMode: 'contain' | 'cover' | 'none' | 'card' | 'list';
  background: PostBackground;
  headlineColor: string;
  sublineColor: string;
  /** Kanvas yüksekliğinin yüzdesi. */
  headlineSizePct: number;
  sublineSizePct: number;
  wordmarkColor: string;
  /**
   * Yalnız `imageMode:'contain'`da anlamlı. true (varsayılan) = görsel yerleşimde hesaplanan
   * kutuya KIRPILIR (ör. 'ekran': ekran görüntüsü sabit bir çerçevede kalmalı). false = kırpma
   * yok — obje serbestçe büyütülüp taşabilir ("obje ortada yüzer" tasarımı, ör. 'obje-vitrini'
   * — kutu yalnızca BAŞLANGIÇ boyutunu hesaplamak için var, kilitli bir çerçeve değil).
   * Verilmezse true — bkz. bulunan hata: obje-vitrini'de %100'ün üstünde boyut/sürükleme
   * görünmez bir kutuya çarpıp kırpılıyordu.
   */
  frameImage?: boolean;
  /** Görselin üstüne karartma bindirilsin mi (yalnız `cover`). */
  scrim: 'none' | 'bottom' | 'full';
  /** 0-1, verilmezse 0 — bkz. `utils/canvasEffects.ts`. */
  grain?: number;
  vignette?: number;
  /**
   * Sabit, kilitli küçük etiket — başlığın ÜSTÜNDE durur (ör. 'sinema-posteri'de "TALKINBIO
   * SUNAR", 'ilham-karti'de rozet metni "İLHAM"). Kullanıcı METNİ değiştiremiyor (wordmark
   * gibi şablonun markalı bir parçası) — verilmezse hiç çizilmiyor. `imageMode:'list'`de rozet
   * (stroke'lu hap) olarak, diğerlerinde düz aralıklı büyük harf olarak çizilir (bkz. postRenderer.ts).
   */
  eyebrow?: string;
  /** Yalnız `imageMode:'cover'|'none'`da anlamlı — metin bloğunun dikey konumu. Verilmezse
   *  eski sezgisel davranış korunur (bkz. postRenderer.ts renderPost yorumu). */
  textVertical?: 'top' | 'center' | 'bottom';
  /** Verilirse başlığa neon/parlama hissi veren bir gölge rengi eklenir (ör. 'neon-vurgu'). */
  headlineGlow?: string;
  /**
   * `config/postFonts.ts`'teki `CuratedPostFont.id`'ye referans — proje planı Faz 4: font
   * özgürlüğü kullanıcı-başına değil ŞABLON-başına, her şablon kendi fontunu TAŞIR. Kiril
   * metinde bu fontun Kiril desteği yoksa `postRenderer.ts` otomatik `CYRILLIC_FALLBACK_FONT_ID`'ye
   * (Inter) düşer — site genelindeki bricolage→inter güvenlik ağıyla AYNI mantık.
   */
  fontId: string;
};

/**
 * Her şablon bir iş için var. Sayı 4'ten 9'a çıktı (proje planı Faz 3) ama ilke aynı: bu
 * katmanın amacı seçenek SUNMAK değil, seçeneği KISITLAMAK — kullanıcı hâlâ yalnızca metin/
 * görsel/format/hangi şablon seçiyor, her şablonun tipografi/renk/konum/zemini kendi içinde
 * kilitli. Çeşitlilik şablon SAYISINDA, her tekil şablonun ÖZGÜRLÜĞÜNDE değil.
 */
export const POST_TEMPLATES: PostTemplate[] = [
  {
    id: 'ekran',
    label: 'Ürün çalışıyor',
    pillar: 'Ekran kaydı · nasıl yapılır',
    hint: 'Ekran görüntüsü koyu zeminde çerçevelenir, başlık üstte. En güçlü içerik biçimi.',
    imageMode: 'contain',
    background: { kind: 'solid', color: BRAND.ink },
    headlineColor: BRAND.paper,
    sublineColor: BRAND.muted,
    headlineSizePct: 4.6,
    sublineSizePct: 2.3,
    wordmarkColor: BRAND.muted,
    scrim: 'none',
    fontId: 'bricolage-grotesque',
  },
  {
    id: 'duyuru',
    label: 'X yayında',
    pillar: 'Özellik duyurusu',
    hint: 'Görsel tam kanar, üstüne koyu perde ve ortada iri başlık.',
    imageMode: 'cover',
    background: { kind: 'solid', color: BRAND.ink },
    headlineColor: BRAND.paper,
    sublineColor: BRAND.paper,
    headlineSizePct: 8,
    sublineSizePct: 2.8,
    wordmarkColor: 'rgba(244,242,237,0.75)',
    scrim: 'full',
    fontId: 'bricolage-grotesque',
  },
  {
    id: 'aci',
    label: 'Acıyı adlandır',
    pillar: 'Problem farkındalığı',
    hint: 'Görsel tam kanar, altta karartma, başlık sol altta. B-roll için tasarlandı.',
    imageMode: 'cover',
    background: { kind: 'solid', color: BRAND.ink },
    headlineColor: BRAND.paper,
    sublineColor: 'rgba(244,242,237,0.8)',
    headlineSizePct: 5.6,
    sublineSizePct: 2.5,
    wordmarkColor: 'rgba(244,242,237,0.7)',
    scrim: 'bottom',
    fontId: 'bricolage-grotesque',
  },
  {
    id: 'soz',
    label: 'Söz / istatistik',
    pillar: 'Görselsiz',
    hint: 'Görsel yok. Mercan zeminde iri metin — üretim maliyeti sıfır, ızgarada ritim kurar.',
    imageMode: 'none',
    background: { kind: 'solid', color: BRAND.coral },
    headlineColor: BRAND.ink,
    sublineColor: 'rgba(20,35,31,0.7)',
    headlineSizePct: 7,
    sublineSizePct: 2.6,
    wordmarkColor: 'rgba(20,35,31,0.55)',
    scrim: 'none',
    fontId: 'bricolage-grotesque',
  },
  {
    id: 'obje-vitrini',
    label: 'Obje vitrini',
    pillar: 'Ürün/obje · arka planı kaldırılmış',
    hint: 'Sıcak mesh-gradient zemin + hafif grain, obje/kişi ortada yüzer. "Arka planı kaldır" ile üretilen görseller için tasarlandı.',
    imageMode: 'contain',
    frameImage: false,
    background: { kind: 'mesh', colors: ['#FFD9A0', '#FF9E7A', '#C77DFF', '#7B5CFF'] },
    headlineColor: BRAND.paper,
    sublineColor: 'rgba(244,242,237,0.75)',
    headlineSizePct: 5,
    sublineSizePct: 2.4,
    wordmarkColor: 'rgba(244,242,237,0.7)',
    scrim: 'none',
    grain: 0.35,
    fontId: 'space-grotesk',
  },
  {
    id: 'gradient-duyuru',
    label: 'Gradient duyuru',
    pillar: 'Özellik duyurusu',
    hint: '\'X yayında\'nın gradient zeminli varyantı — daha canlı, daha az kurumsal.',
    imageMode: 'cover',
    background: { kind: 'gradient', from: '#2B6F5C', to: '#14231F', angle: 135 },
    headlineColor: BRAND.paper,
    sublineColor: BRAND.paper,
    headlineSizePct: 8,
    sublineSizePct: 2.8,
    wordmarkColor: 'rgba(244,242,237,0.75)',
    scrim: 'full',
    fontId: 'archivo-black',
  },
  {
    id: 'buyuk-rakam',
    label: 'Büyük rakam',
    pillar: 'Görselsiz · istatistik',
    hint: '\'Söz\'den farkı: tek bir sayı/kısa ifade için AŞIRI büyük punto, altında ince bir açıklama.',
    imageMode: 'none',
    background: { kind: 'solid', color: BRAND.ink },
    headlineColor: BRAND.paper,
    sublineColor: 'rgba(244,242,237,0.6)',
    headlineSizePct: 13,
    sublineSizePct: 2.2,
    wordmarkColor: 'rgba(244,242,237,0.5)',
    scrim: 'none',
    fontId: 'anton',
  },
  {
    id: 'karanlik-sinematik',
    label: 'Karanlık sinematik',
    pillar: 'Motion çıktısı · sinematik kare',
    hint: 'Koyu zemin + vinyet + grain — Beiwe Motion\'dan çıkan sinematik karelerle eşleşsin diye.',
    imageMode: 'cover',
    background: { kind: 'solid', color: '#0A0F0D' },
    headlineColor: BRAND.paper,
    sublineColor: 'rgba(244,242,237,0.75)',
    headlineSizePct: 5.4,
    sublineSizePct: 2.4,
    wordmarkColor: 'rgba(244,242,237,0.6)',
    scrim: 'bottom',
    grain: 0.3,
    vignette: 0.55,
    fontId: 'playfair-display',
  },
  {
    id: 'alinti-karti',
    label: 'Alıntı kartı',
    pillar: 'Alıntı/yorum · dizi hâlinde kullanılabilir',
    hint: 'Ortada yüzen beyaz kart — küçük resim + alıntı + isim. Birkaç tanesini kaydedip Beiwe Studio\'nun Sekans panelinde art arda dizerek "kartlar birer birer beliriyor" etkisi kurulabilir.',
    imageMode: 'card',
    background: { kind: 'mesh', colors: ['#FFB199', '#F7716B', '#C86DD7', '#8E6FE3'] },
    headlineColor: BRAND.ink,
    sublineColor: BRAND.muted,
    headlineSizePct: 3.2,
    sublineSizePct: 2,
    wordmarkColor: 'rgba(244,242,237,0.85)',
    scrim: 'none',
    grain: 0.25,
    fontId: 'lora',
  },
  {
    id: 'sinema-posteri',
    label: 'Sinema posteri',
    pillar: 'Karakter/hikaye tanıtımı',
    hint: 'Görsel tam kanar, ağır vinyet altında üstte sabit "sunar" etiketi + ortalanmış başlık/açıklama — film afişi hissi.',
    imageMode: 'cover',
    background: { kind: 'solid', color: '#1F1512' },
    headlineColor: BRAND.paper,
    sublineColor: 'rgba(244,242,237,0.78)',
    headlineSizePct: 6.4,
    sublineSizePct: 2.3,
    wordmarkColor: 'rgba(244,242,237,0.65)',
    eyebrow: 'talkinbio sunar',
    textVertical: 'top',
    scrim: 'full',
    grain: 0.25,
    vignette: 0.6,
    fontId: 'unbounded',
  },
  {
    id: 'neon-vurgu',
    label: 'Neon vurgu',
    pillar: 'Özellik duyurusu · canlı/eğlenceli',
    hint: 'Görsel tam kanar, başlık neon parlamayla öne çıkar — parti/etkinlik/canlı anlar için.',
    imageMode: 'cover',
    background: { kind: 'solid', color: '#0B0B10' },
    headlineColor: '#FFFFFF',
    sublineColor: 'rgba(255,255,255,0.8)',
    headlineSizePct: 7,
    sublineSizePct: 2.4,
    wordmarkColor: 'rgba(255,255,255,0.7)',
    headlineGlow: '#FF7A3D',
    scrim: 'bottom',
    grain: 0.2,
    vignette: 0.4,
    fontId: 'righteous',
  },
  {
    id: 'manifesto',
    label: 'Manifesto',
    pillar: 'Marka duruşu · minimal',
    hint: 'Görselsiz, açık/kağıt dokulu zeminde sol-altta dev kalın başlık — bol boşluk, ElevenLabs\'in "Like your voice. But different." tarzı.',
    imageMode: 'none',
    background: { kind: 'solid', color: BRAND.paper },
    headlineColor: BRAND.ink,
    sublineColor: BRAND.inkSoft,
    headlineSizePct: 9,
    sublineSizePct: 2.4,
    wordmarkColor: BRAND.muted,
    textVertical: 'bottom',
    scrim: 'none',
    grain: 0.12,
    fontId: 'manrope',
  },
  {
    id: 'ayna-ikili-ton',
    label: 'Ayna / ikili ton',
    pillar: 'Marka duruşu · grafik',
    hint: 'Zemin düz bir çizgiyle iki zıt renge bölünür, başlık ortada — flat/grafik bir karşıtlık hissi.',
    imageMode: 'none',
    background: { kind: 'split', left: BRAND.ink, right: BRAND.coral, angle: 0 },
    headlineColor: BRAND.paper,
    sublineColor: 'rgba(244,242,237,0.85)',
    headlineSizePct: 6.5,
    sublineSizePct: 2.3,
    wordmarkColor: 'rgba(244,242,237,0.75)',
    textVertical: 'center',
    scrim: 'none',
    fontId: 'syne',
  },
  {
    id: 'ilham-karti',
    label: 'İlham kartı',
    pillar: 'Liste/ipucu · görselsiz',
    hint: 'Rozet + başlık + altında 2x2 ipucu kartı ızgarası — "4 kullanım fikri" gibi liste içerikleri için.',
    imageMode: 'list',
    background: { kind: 'solid', color: '#12131A' },
    headlineColor: BRAND.paper,
    sublineColor: 'rgba(244,242,237,0.7)',
    headlineSizePct: 6,
    sublineSizePct: 2.1,
    wordmarkColor: 'rgba(244,242,237,0.6)',
    eyebrow: 'ilham',
    scrim: 'none',
    grain: 0.15,
    fontId: 'plus-jakarta-sans',
  },
];

export function findPostTemplate(id: unknown): PostTemplate | undefined {
  return typeof id === 'string' ? POST_TEMPLATES.find((t) => t.id === id) : undefined;
}

export function findPostFormat(id: unknown): PostFormat | undefined {
  return typeof id === 'string' ? POST_FORMATS.find((f) => f.id === id) : undefined;
}
