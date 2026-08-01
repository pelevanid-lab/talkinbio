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
    label: 'motionStyleAnimeLabel',
    hint: 'motionStyleAnimeHint',
    prompt:
      'Japanese anime art style, clean cel-shaded illustration, sharp linework, expressive large eyes, vibrant flat colour shading, dynamic anime composition.',
  },
  {
    id: 'cizgi-film',
    label: 'motionStyleCartoonLabel',
    hint: 'motionStyleCartoonHint',
    prompt:
      'Western animated cartoon style, stylised proportions, smooth rounded shapes, playful exaggerated expression, Pixar/DreamWorks-like rendering.',
  },
  {
    id: 'cinematic',
    label: 'motionStyleCinematicLabel',
    hint: 'motionStyleCinematicHint',
    prompt:
      'Cinematic film still, dramatic directional lighting, anamorphic lens look, rich color grading, shallow depth of field, blockbuster movie production value.',
  },
  {
    id: 'fantastic',
    label: 'motionStyleFantasticLabel',
    hint: 'motionStyleFantasticHint',
    prompt:
      'Fantasy digital art, painterly magical atmosphere, glowing surreal lighting, epic otherworldly environment, high detail concept-art rendering.',
  },
  {
    id: 'trend',
    label: 'motionStyleTrendLabel',
    hint: 'motionStyleTrendHint',
    prompt: 'Photorealistic, natural everyday video look — no stylisation, no filter.',
  },
];

export const DEFAULT_MOTION_STYLE_ID: MotionStyleId = 'cinematic';

export function findMotionStyle(id: unknown): MotionStyle | undefined {
  return typeof id === 'string' ? MOTION_STYLES.find((s) => s.id === id) : undefined;
}

/**
 * Kimlik kaynağı — 'twin' Enes'in kendi kimliğini stilize eder (Twin galerisinden bir
 * kare referans alınır), 'cast' Yardımcı Oyuncular'dan (Saule, Beiwe, admin panelinden
 * eklenen sanal karakterler) birinin kanonik avatarını kullanır, 'generic' kimliksiz/
 * rastgele bir persona üretir (yalnızca metin tarifinden, referans görsel yok).
 * Podcast'in aksine Motion'da Twin ZORUNLU değil.
 */
export type MotionIdentityMode = 'twin' | 'cast' | 'generic';

export const MOTION_IDENTITY_MODES: { id: MotionIdentityMode; label: string; hint: string }[] = [
  {
    id: 'twin',
    label: 'motionIdentityTwinLabel',
    hint: 'motionIdentityTwinHint',
  },
  {
    id: 'cast',
    label: 'motionIdentityCastLabel',
    hint: 'motionIdentityCastHint',
  },
  {
    id: 'generic',
    label: 'motionIdentityGenericLabel',
    hint: 'motionIdentityGenericHint',
  },
];
