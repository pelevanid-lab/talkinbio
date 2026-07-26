// Faz S.4 — Karakter Odası'nın tek gerçek kaynağı.
//
// Saule ve Beiwe'nin görünüşü burada, KODDA kilitlidir; admin arayüzünden düzenlenemez.
// Sebebi: sosyal medyada marka kuran şey tutarlılıktır, her üretimde biraz kayan bir yüz
// marka kurmaz. Kimlik üç katmanla zorlanır — (1) `referenceFile`'daki kanonik avatar her
// istekte gönderilir, (2) buradaki `identityPrompt` her prompt'un başına eklenir,
// (3) galeriden "kanon" işaretlenen kareler ek referans olur (bkz. 00037_character_shots.sql).
//
// Tanımlar `public/saule-avatar-v1.png` ve `public/beiwe-avatar-v1.png` görsellerine
// bakılarak yazıldı. Avatar dosyaları değişirse buradaki tarifler de güncellenmelidir,
// yoksa referans görselle metin birbirini çeker ve kimlik kayar.

export type CharacterId = 'saule' | 'beiwe' | 'enes';

export const CHARACTER_IDS: CharacterId[] = ['saule', 'beiwe', 'enes'];

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && (CHARACTER_IDS as string[]).includes(value);
}

/** fal `aspect_ratio` enum'unun bizim kullandığımız alt kümesi. */
export type AspectRatio = '1:1' | '4:5' | '3:4' | '9:16' | '16:9';
export const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: '1:1', label: 'Kare 1:1' },
  { value: '4:5', label: 'Gönderi 4:5' },
  { value: '9:16', label: 'Story/Reel 9:16' },
  { value: '3:4', label: 'Dikey 3:4' },
  { value: '16:9', label: 'Yatay 16:9' },
];

export type Resolution = '1K' | '2K';

/**
 * Sahne prompt'una eklenen "şu tarafı boş bırak" talimatı. Slogan katmanının
 * (CharacterOverlayEditor) okunaklı oturabilmesi için gerekli.
 */
export type TextSpace = 'none' | 'left' | 'right' | 'top' | 'bottom';

export interface ScenePreset {
  id: string;
  label: string;
  group: 'Kadraj' | 'Ortam' | 'Aksiyon';
  /** İngilizce sahne tarifi — identity + style ile birleştirilerek fal'a gider. */
  prompt: string;
  aspectRatio?: AspectRatio;
  textSpace?: TextSpace;
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  /** UI kartındaki rol satırı. */
  role: string;
  /** Kilitli kimliğin Türkçe, insan okuru için özeti. */
  summary: string;
  /** `public/` altındaki kanonik avatar dosyası. */
  referenceFile: string;
  /** Kilitli — her prompt'un başına eklenir. */
  identityPrompt: string;
  /** Gardırop paleti; sahne kıyafet değiştirse bile bu sınırların içinde kalır. */
  wardrobePrompt: string;
  /** UI vurgusu ve metin katmanının varsayılan rengi. */
  accentColor: string;
  scenePresets: ScenePreset[];
}

/* ------------------------------------------------------------------ */
/* Ortak fotoğraf dili — iki karakter de aynı görsel dünyada yaşıyor.  */
/* ------------------------------------------------------------------ */

export const STYLE_PROMPT = [
  'Photorealistic editorial photograph, full-frame camera with an 85mm lens at f/2.0.',
  'Soft natural directional light with gentle falloff, true-to-life colour, subtle film-like grain.',
  'Candid documentary feel rather than stock-photo posing; relaxed, unforced body language.',
  'Skin keeps its natural texture — no plastic smoothing, no beauty filter, no heavy retouching.',
].join(' ');

const BASE_NEGATIVES = [
  'no watermarks',
  'no logos',
  'no extra or malformed fingers',
  'no duplicated or background people unless explicitly requested',
  'no oversaturated or teal-orange colour grading',
  'no fisheye or wide-angle facial distortion',
  'no exaggerated beauty retouching',
];

const NO_TEXT_NEGATIVES = [
  'no text of any kind',
  'no captions or subtitles',
  'no readable writing on screens, signage or clothing',
];

/**
 * Negatifler. Sahnede fiziksel yazı (tabela, kupa, tişört) isteniyorsa
 * `allowSceneText` açılır — pazarlama kopyası için değil, sahne öğesi için.
 */
export function buildNegativePrompt(allowSceneText = false): string {
  const parts = allowSceneText ? BASE_NEGATIVES : [...BASE_NEGATIVES, ...NO_TEXT_NEGATIVES];
  return `Avoid: ${parts.join(', ')}.`;
}

const TEXT_SPACE_INSTRUCTIONS: Record<Exclude<TextSpace, 'none'>, string> = {
  left: 'Compose so the left third of the frame stays visually calm, uncluttered and low-contrast — this area is reserved for a text overlay added afterwards.',
  right: 'Compose so the right third of the frame stays visually calm, uncluttered and low-contrast — this area is reserved for a text overlay added afterwards.',
  top: 'Compose so the top third of the frame stays visually calm, uncluttered and low-contrast — this area is reserved for a text overlay added afterwards.',
  bottom: 'Compose so the bottom third of the frame stays visually calm, uncluttered and low-contrast — this area is reserved for a text overlay added afterwards.',
};

export function textSpaceInstruction(space: TextSpace | undefined): string | null {
  if (!space || space === 'none') return null;
  return TEXT_SPACE_INSTRUCTIONS[space];
}

/**
 * Referans görsellere rol etiketi. Sahne referansı (ör. gerçek ekran görüntüsü)
 * gönderildiğinde modelin onu yüz referansı sanmasını engeller.
 */
export function referenceRoleInstruction(identityCount: number, sceneCount: number): string | null {
  if (sceneCount === 0) return null;
  const identityPart =
    identityCount === 1
      ? 'The first reference image defines the identity of the person'
      : `The first ${identityCount} reference images define the identity of the person`;
  const scenePart =
    sceneCount === 1
      ? 'the last reference image is scene content (for example a screen capture or a location) to be placed into the scene'
      : `the last ${sceneCount} reference images are scene content (for example screen captures or locations) to be placed into the scene`;
  return `${identityPart} — her face, hair and build must be preserved exactly. In contrast, ${scenePart}; use it for the environment or for what is displayed on a device screen, never for the person's appearance.`;
}

/* ------------------------------------------------------------------ */
/* Sahne şablonları                                                    */
/* ------------------------------------------------------------------ */

/**
 * Şablonlar sahne üretimi içindir — oda portre stüdyosu değil. Kadraj, ortam ve
 * aksiyon ayrı gruplar; kullanıcı birini seçip Türkçe niyet alanıyla
 * özelleştirebilir ya da tamamen serbest metin yazabilir.
 */
const SHARED_SCENE_PRESETS: ScenePreset[] = [
  // Kadraj
  {
    id: 'close-portrait',
    label: 'Yakın portre',
    group: 'Kadraj',
    prompt: 'Close head-and-shoulders portrait, eye-level, softly blurred neutral background.',
    aspectRatio: '4:5',
  },
  {
    id: 'mid-shot',
    label: 'Orta plan',
    group: 'Kadraj',
    prompt: 'Waist-up mid shot with room to breathe around the subject, shallow depth of field.',
    aspectRatio: '4:5',
    textSpace: 'left',
  },
  {
    id: 'full-body',
    label: 'Boy plan',
    group: 'Kadraj',
    prompt: 'Full-body shot, standing naturally, the environment clearly readable behind her.',
    aspectRatio: '9:16',
    textSpace: 'top',
  },
  {
    id: 'desk-overhead',
    label: 'Üstten masa',
    group: 'Kadraj',
    prompt: 'High-angle shot looking down at her desk from just over her shoulder; her hands and part of her face are in frame alongside the work surface.',
    aspectRatio: '1:1',
  },

  // Ortam
  {
    id: 'home-office',
    label: 'Ev ofisi',
    group: 'Ortam',
    prompt: 'A warm, lived-in home office: wooden desk, a plant, soft daylight from a side window, muted neutral walls.',
    textSpace: 'right',
  },
  {
    id: 'cafe',
    label: 'Kafe',
    group: 'Ortam',
    prompt: 'A quiet neighbourhood cafe in the late afternoon, warm ambient light, softly out-of-focus interior behind her.',
    textSpace: 'left',
  },
  {
    id: 'studio-backdrop',
    label: 'Stüdyo fonu',
    group: 'Ortam',
    prompt: 'Clean seamless studio backdrop in a soft neutral tone, single large softbox key light, minimal shadow.',
    aspectRatio: '1:1',
    textSpace: 'right',
  },
  {
    id: 'client-space',
    label: 'Müşteri mekanı',
    group: 'Ortam',
    prompt: 'A small service business interior — a tidy salon or consultation room with a reception counter, calm modern styling, daylight.',
    textSpace: 'bottom',
  },
  {
    id: 'outdoor',
    label: 'Dış mekan',
    group: 'Ortam',
    prompt: 'Outdoors on a calm city street in soft overcast light, muted architecture blurred behind her.',
    aspectRatio: '9:16',
    textSpace: 'top',
  },

  // Aksiyon
  {
    id: 'laptop-blank-screen',
    label: "Laptopta (ekran boş)",
    group: 'Aksiyon',
    prompt: 'Working at a laptop, hands on the keyboard, glancing at the screen. The laptop screen is switched off and shows only a clean dark reflective surface with nothing displayed on it.',
    textSpace: 'right',
  },
  {
    id: 'phone-in-hand',
    label: 'Telefona bakarken',
    group: 'Aksiyon',
    prompt: 'Holding a phone at chest height and looking at it with a small pleased expression. The phone screen is off and shows only a clean dark reflective surface.',
    aspectRatio: '9:16',
    textSpace: 'top',
  },
  {
    id: 'talking-to-camera',
    label: 'Kameraya konuşurken',
    group: 'Aksiyon',
    prompt: 'Mid-sentence, looking directly into the lens and gesturing lightly with one hand, as if explaining something to the viewer.',
    aspectRatio: '9:16',
    textSpace: 'bottom',
  },
  {
    id: 'taking-notes',
    label: 'Not alırken',
    group: 'Aksiyon',
    prompt: 'Leaning over a notebook writing with a pen, attention on the page, shoulders relaxed.',
    textSpace: 'left',
  },
];

/* ------------------------------------------------------------------ */
/* Karakterler                                                         */
/* ------------------------------------------------------------------ */

export const CHARACTERS: Record<CharacterId, CharacterDefinition> = {
  enes: {
    id: 'enes',
    name: 'Enes',
    role: 'Kurucu — vizyonu anlatan, ürünün arkasındaki isim',
    summary:
      'Otuzlu yaşlarında, kısa saçlı ve tepesi hafif seyrek, kısa kahverengi sakallı. Sıcak bir gülümsemeye ve doğrudan kameraya bakan, güven veren bir duruşa sahip.',
    referenceFile: 'enes-avatar-v1.png',
    accentColor: '#174A54',
    identityPrompt: [
      'The person is Enes: a man in his early thirties of Turkish heritage.',
      'Slightly bald on top with short hair on the sides, short well-kept brown beard.',
      'Warm and confident expression, friendly eyes, looking directly at the viewer.',
      'His face, hair length and build must match the reference image exactly.'
    ].join(' '),
    wardrobePrompt:
      'Keep his clothing casual yet professional — a plain dark gray or black t-shirt. Avoid logos, patterns, or bright colors.',
    scenePresets: [
      ...SHARED_SCENE_PRESETS,
      {
        id: 'home-office',
        label: 'Ev ofisinde çalışırken',
        group: 'Ortam',
        prompt: 'Sitting in a cozy home office with a blurred bookshelf in the background, warm and inviting lighting.',
        textSpace: 'right',
      },
      {
        id: 'explaining-product',
        label: 'Ürünü anlatırken',
        group: 'Aksiyon',
        prompt: 'Gesturing with his hands confidently, leaning slightly forward to explain the product vision, bright professional lighting.',
        aspectRatio: '16:9',
        textSpace: 'left',
      },
    ],
  },
  saule: {
    id: 'saule',
    name: 'Saule',
    role: 'Ön büro — ziyaretçiyle konuşan, gece 2\'de cevap veren asistan',
    summary:
      'Otuzlu yaşların başında, Orta Asya (Kazak) kökenli; uzun koyu kahve dalgalı saç, belirgin elmacık kemikleri, sıcak açık-kumral ten, badem gözler, sakin ve kapalı bir gülümseme. Sıcak, ölçülü, güven veren bir enerji.',
    referenceFile: 'saule-avatar-v1.png',
    accentColor: '#1E3A5F',
    identityPrompt: [
      'The person is Saule: a woman in her early thirties of Central Asian (Kazakh) heritage.',
      'Oval face with softly defined high cheekbones; warm light-tan skin with a natural matte finish and visible fine skin texture.',
      'Almond-shaped dark eyes with warm brown irises; straight dark brown eyebrows with a gentle arch; a small straight nose; full, evenly balanced lips in a muted rose tone.',
      'Long dark brown, nearly black hair falling well past the shoulders in loose natural waves, parted slightly off-centre.',
      'Composed, warm expression with a faint closed-lip smile; minimal natural makeup.',
      'Her face, hair length and build must match the reference image exactly.',
    ].join(' '),
    wardrobePrompt:
      'Keep her clothing within a restrained professional palette of navy, charcoal, cream and warm sand — solid colours only, no patterns, no logos, no bright saturated tones. Adapt the specific clothing to fit the environment naturally.',
    scenePresets: [
      ...SHARED_SCENE_PRESETS,
      {
        id: 'reception-desk',
        label: 'Resepsiyon başında',
        group: 'Ortam',
        prompt: 'Standing behind a small reception counter in a calm modern service space, welcoming posture, warm evening light.',
        textSpace: 'right',
      },
      {
        id: 'late-night',
        label: 'Gece geç saat',
        group: 'Ortam',
        prompt: 'Late at night in a dim room lit mainly by a warm desk lamp; quiet, focused mood, deep shadows and a calm atmosphere.',
        aspectRatio: '4:5',
        textSpace: 'top',
      },
    ],
  },

  beiwe: {
    id: 'beiwe',
    name: 'Beiwe',
    role: 'Arka oda — sayfayı kuran, içeriği üreten, raporu yazan asistan',
    summary:
      'Yirmili yaşların sonunda, Kuzey/Doğu Avrupa kökenli; omuz hizasında ballı kumral saç, mavi-gri gözler, ince düz burun, hafif çilli yanaklar, açık ve enerjik bir gülümseme. Yapıcı, pratik, "hadi kuralım" enerjisi.',
    referenceFile: 'beiwe-avatar-v1.png',
    accentColor: '#14607A',
    identityPrompt: [
      'The person is Beiwe: a woman in her late twenties of Northern/Eastern European heritage.',
      'Oval face with soft features; fair skin with a light natural flush across the cheeks and faint freckling.',
      'Blue-grey eyes with light lashes; softly arched medium brown eyebrows; a straight slender nose.',
      'Shoulder-length medium brown hair with natural honey-blonde highlights, side-parted, waving softly inward at the ends.',
      'An open, warm smile showing her upper teeth; approachable, energetic expression.',
      'Her face, hair length and build must match the reference image exactly.',
    ].join(' '),
    wardrobePrompt:
      'Keep her clothing within a palette of teal, deep green, warm grey and off-white — solid colours only, no patterns, no logos, no bright saturated tones. Adapt the specific clothing to fit the environment naturally.',
    scenePresets: [
      ...SHARED_SCENE_PRESETS,
      {
        id: 'whiteboard',
        label: 'Beyaz tahta başında',
        group: 'Ortam',
        prompt: 'Standing at a whiteboard covered only in simple abstract boxes and arrows with no legible writing, mid-explanation, one hand raised toward the board.',
        aspectRatio: '16:9',
        textSpace: 'right',
      },
      {
        id: 'side-by-side',
        label: 'Müşteriyle yan yana',
        group: 'Aksiyon',
        prompt: 'Sitting beside a desk turned toward an empty chair as if walking someone through a setup, laptop closed in front of her, open and helpful body language.',
        textSpace: 'left',
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Metin / slogan katmanı                                              */
/* ------------------------------------------------------------------ */

export type OverlayLocale = 'tr' | 'en' | 'ru';
export const OVERLAY_LOCALES: OverlayLocale[] = ['tr', 'en', 'ru'];

export type OverlayPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export const OVERLAY_POSITIONS: OverlayPosition[] = [
  'top-left', 'top-center', 'top-right',
  'center-left', 'center', 'center-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

/** Kayıtlı marka fontları — `src/app/[locale]/layout.tsx`'te next/font ile zaten yükleniyor. */
export type OverlayFont = 'bricolage' | 'inter' | 'mono';
export const OVERLAY_FONTS: { value: OverlayFont; label: string; family: string; note?: string }[] = [
  { value: 'bricolage', label: 'Bricolage Grotesque', family: 'var(--font-bricolage)', note: 'Kiril desteği sınırlı — Rusça için Inter kullan' },
  { value: 'inter', label: 'Inter', family: 'var(--font-inter)' },
  { value: 'mono', label: 'IBM Plex Mono', family: 'var(--font-ibm-plex-mono)' },
];

export type OverlayText = { headline: string; subline: string };

export interface OverlayConfig {
  texts: Record<OverlayLocale, OverlayText>;
  position: OverlayPosition;
  align: 'left' | 'center' | 'right';
  font: OverlayFont;
  /** Görsel yüksekliğinin yüzdesi — çözünürlükten bağımsız olsun diye. */
  headlineSize: number;
  sublineSize: number;
  color: string;
  /** Okunabilirlik için metnin altına karartma şeridi. */
  scrim: boolean;
  wordmark: boolean;
}

export const DEFAULT_OVERLAY: OverlayConfig = {
  texts: { tr: { headline: '', subline: '' }, en: { headline: '', subline: '' }, ru: { headline: '', subline: '' } },
  position: 'bottom-left',
  align: 'left',
  font: 'bricolage',
  headlineSize: 7,
  sublineSize: 3.2,
  color: '#FFFFFF',
  scrim: true,
  wordmark: true,
};

/** `character_shots` satırının uygulama tarafındaki karşılığı. */
export interface CharacterShot {
  id: string;
  character_id: CharacterId;
  image_url: string;
  prompt: string;
  user_intent: string | null;
  preset_id: string | null;
  model: string;
  seed: number | null;
  reference_urls: string[];
  aspect_ratio: string | null;
  overlay: OverlayConfig | null;
  is_canon: boolean;
  created_at: string;
}

/** Referans bütçesi — fal, 6'nın üzerinde kimlik sadakatinin düştüğünü belirtiyor. */
export const MAX_REFERENCE_IMAGES = 6;
export const MAX_CANON_SHOTS = 3;
export const MAX_SCENE_REFS = 2;
export const MAX_IMAGES_PER_RUN = 4;

/** fal model kimliği; env ile değiştirilebilir. Tahmini maliyet ~$0,13/görsel (doğrulanmadı). */
export const DEFAULT_IMAGE_MODEL = 'fal-ai/nano-banana-pro/edit';
export const ESTIMATED_COST_PER_IMAGE_USD = 0.13;
