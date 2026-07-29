// Beiwe Motion (Action Room) — stil ve kimlik katmanının tek gerçek kaynağı.
//
// `post.ts`'teki KİLİTLİ şablon disipliniyle aynı mantık: kullanıcı stili SEÇER,
// stilin kendi prompt tarifini değiştiremez. Fark şu — Post'un `STYLE_PROMPT`'u
// (bkz. `characters.ts`) fotogerçekçiliğe kilitli; Motion bilerek ondan bağımsız,
// çünkü burada tam tersi isteniyor: anime/çizgi film/cinematic/fantastic.

export type MotionStyleId = 'anime' | 'cizgi-film' | 'cinematic' | 'fantastic' | 'trend';

export type MotionStyle = {
  id: MotionStyleId;
  label: string;
  hint: string;
  /** Stilize kaynak portre üretiminde prompt'a eklenen İngilizce tarif. */
  prompt: string;
};

export const MOTION_STYLES: MotionStyle[] = [
  {
    id: 'anime',
    label: 'Anime',
    hint: 'Japon anime çizim stili — keskin hatlar, büyük gözler, düz renk gölgeleme.',
    prompt:
      'Japanese anime art style, clean cel-shaded illustration, sharp linework, expressive large eyes, vibrant flat colour shading, dynamic anime composition.',
  },
  {
    id: 'cizgi-film',
    label: 'Çizgi film',
    hint: 'Batı tarzı 3D/2D çizgi film karakteri — yumuşak hatlar, oyuncu ifade.',
    prompt:
      'Western animated cartoon style, stylised proportions, smooth rounded shapes, playful exaggerated expression, Pixar/DreamWorks-like rendering.',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    hint: 'Film seti kalitesinde ışık ve renk derinliği — gerçekçi ama abartılı prodüksiyon.',
    prompt:
      'Cinematic film still, dramatic directional lighting, anamorphic lens look, rich color grading, shallow depth of field, blockbuster movie production value.',
  },
  {
    id: 'fantastic',
    label: 'Fantastic',
    hint: 'Fantastik/masalsı dünya — büyülü ışık, sürreal ortam.',
    prompt:
      'Fantasy digital art, painterly magical atmosphere, glowing surreal lighting, epic otherworldly environment, high detail concept-art rendering.',
  },
  {
    id: 'trend',
    label: 'Trend (stilsiz)',
    hint: 'Stil bindirmeden — gerçek görüntü, yalnızca güncel bir trend formatını taklit eder.',
    prompt: 'Photorealistic, natural everyday video look — no stylisation, no filter.',
  },
];

export const DEFAULT_MOTION_STYLE_ID: MotionStyleId = 'cinematic';

export function findMotionStyle(id: unknown): MotionStyle | undefined {
  return typeof id === 'string' ? MOTION_STYLES.find((s) => s.id === id) : undefined;
}

/**
 * Kimlik kaynağı — 'twin' Enes'in kendi kimliğini stilize eder (Twin galerisinden bir
 * kare referans alınır), 'generic' kimliksiz/rastgele bir persona üretir (yalnızca metin
 * tarifinden, referans görsel yok). Podcast'in aksine Motion'da Twin ZORUNLU değil.
 */
export type MotionIdentityMode = 'twin' | 'generic';

export const MOTION_IDENTITY_MODES: { id: MotionIdentityMode; label: string; hint: string }[] = [
  {
    id: 'twin',
    label: 'Twin kimliği',
    hint: 'Galeriden seçilen bir Twin karesi stilize edilir — kimlik büyük ölçüde korunur.',
  },
  {
    id: 'generic',
    label: 'Jenerik / rastgele karakter',
    hint: 'Kimlik referansı yok — yalnızca yazdığın persona tarifinden sıfırdan üretilir.',
  },
];
