// Beiwe Post — kürasyonlu font kütüphanesi (proje planı Faz 4).
//
// KARAR: font özgürlüğü kullanıcı-başına değil ŞABLON-başına. Her `PostTemplate` kendi
// `fontId`'sini taşır (bkz. config/post.ts), kullanıcı hâlâ sadece ŞABLONU seçiyor — bu,
// Post'un "kilitli şablon = marka tutarlılığı" ilkesini (bkz. post.ts başlık yorumu) bozmadan
// görsel çeşitlilik katıyor: ızgaradaki her karo kendi şablonunun fontunu taşır ama HİÇBİR
// karo "bugün canım hangi fontu çekti" rastgeleliğine açık değil.
//
// YÜKLEME — next/font DEĞİL: site genelindeki 3 font (`app/[locale]/layout.tsx`) build-time
// `next/font/google` ile self-host ediliyor; burada 30+ fontu aynı şekilde eklemek her biri
// için ayrı `const X = SomeFont(...)` boilerplate'i ve gereksiz genel bundle şişmesi demek.
// Bunun yerine SADECE Post editöründe, seçili şablonun fontu için runtime'da bir
// `<link href="https://fonts.googleapis.com/css2?family=...">` enjekte ediliyor (bkz.
// BeiwePostClient.tsx) — yalnızca kullanılan font indirilir. Admin-only bir araç için
// gizlilik/performans farkı önemsiz.

export type PostFontCategory = 'sans' | 'serif' | 'display' | 'mono' | 'handwritten';

export type CuratedPostFont = {
  id: string;
  /** Google Fonts'taki TAM aile adı (boşluklu) — hem CSS `font-family` hem `css2` URL'i için. */
  family: string;
  category: PostFontCategory;
  /** css2 API'sine istenecek ağırlıklar. */
  weights: number[];
  italic?: boolean;
  /**
   * Google Fonts'ta Kiril alt kümesi VAR mı — emin olunmayan fontlarda BİLEREK `false`
   * bırakıldı (güvenli yön): Rusça metinde `resolveTemplateFontFamily` (postRenderer.ts)
   * bilinen-iyi bir Kiril fontuna (Inter) düşer, `bricolage`/site geneliyle AYNI güvenlik ağı.
   */
  supportsCyrillic: boolean;
};

export const CURATED_POST_FONTS: CuratedPostFont[] = [
  // — Sans —
  { id: 'inter', family: 'Inter', category: 'sans', weights: [400, 500, 700], supportsCyrillic: true },
  { id: 'roboto', family: 'Roboto', category: 'sans', weights: [400, 500, 700], supportsCyrillic: true },
  { id: 'open-sans', family: 'Open Sans', category: 'sans', weights: [400, 600, 700], supportsCyrillic: true },
  { id: 'montserrat', family: 'Montserrat', category: 'sans', weights: [400, 600, 800], supportsCyrillic: true },
  { id: 'poppins', family: 'Poppins', category: 'sans', weights: [400, 500, 700], supportsCyrillic: false },
  { id: 'manrope', family: 'Manrope', category: 'sans', weights: [400, 600, 800], supportsCyrillic: false },
  { id: 'dm-sans', family: 'DM Sans', category: 'sans', weights: [400, 500, 700], supportsCyrillic: false },
  { id: 'rubik', family: 'Rubik', category: 'sans', weights: [400, 600, 800], supportsCyrillic: true },
  { id: 'plus-jakarta-sans', family: 'Plus Jakarta Sans', category: 'sans', weights: [400, 600, 800], supportsCyrillic: false },
  { id: 'outfit', family: 'Outfit', category: 'sans', weights: [400, 600, 800], supportsCyrillic: false },
  { id: 'space-grotesk', family: 'Space Grotesk', category: 'sans', weights: [400, 600, 700], supportsCyrillic: false },
  { id: 'sora', family: 'Sora', category: 'sans', weights: [400, 600, 800], supportsCyrillic: false },
  { id: 'work-sans', family: 'Work Sans', category: 'sans', weights: [400, 600, 800], supportsCyrillic: false },
  { id: 'karla', family: 'Karla', category: 'sans', weights: [400, 600, 800], supportsCyrillic: true },

  // — Serif —
  { id: 'playfair-display', family: 'Playfair Display', category: 'serif', weights: [500, 700, 900], supportsCyrillic: true },
  { id: 'lora', family: 'Lora', category: 'serif', weights: [400, 600, 700], supportsCyrillic: true },
  { id: 'merriweather', family: 'Merriweather', category: 'serif', weights: [400, 700, 900], supportsCyrillic: true },
  { id: 'pt-serif', family: 'PT Serif', category: 'serif', weights: [400, 700], supportsCyrillic: true },
  { id: 'eb-garamond', family: 'EB Garamond', category: 'serif', weights: [400, 600, 700], supportsCyrillic: true },
  { id: 'libre-baskerville', family: 'Libre Baskerville', category: 'serif', weights: [400, 700], supportsCyrillic: false },
  { id: 'fraunces', family: 'Fraunces', category: 'serif', weights: [400, 600, 900], supportsCyrillic: false },
  { id: 'crimson-text', family: 'Crimson Text', category: 'serif', weights: [400, 600, 700], supportsCyrillic: true },

  // — Display (başlık odaklı, iri punto için) —
  { id: 'archivo-black', family: 'Archivo Black', category: 'display', weights: [400], supportsCyrillic: false },
  { id: 'anton', family: 'Anton', category: 'display', weights: [400], supportsCyrillic: false },
  { id: 'bebas-neue', family: 'Bebas Neue', category: 'display', weights: [400], supportsCyrillic: false },
  { id: 'unbounded', family: 'Unbounded', category: 'display', weights: [500, 800], supportsCyrillic: true },
  { id: 'syne', family: 'Syne', category: 'display', weights: [500, 800], supportsCyrillic: false },
  { id: 'big-shoulders-display', family: 'Big Shoulders Display', category: 'display', weights: [500, 800], supportsCyrillic: false },
  { id: 'righteous', family: 'Righteous', category: 'display', weights: [400], supportsCyrillic: false },
  { id: 'bricolage-grotesque', family: 'Bricolage Grotesque', category: 'display', weights: [500, 700, 800], supportsCyrillic: false },

  // — Mono —
  { id: 'jetbrains-mono', family: 'JetBrains Mono', category: 'mono', weights: [400, 600, 800], supportsCyrillic: true },
  { id: 'ibm-plex-mono', family: 'IBM Plex Mono', category: 'mono', weights: [400, 600], supportsCyrillic: true },
  { id: 'space-mono', family: 'Space Mono', category: 'mono', weights: [400, 700], supportsCyrillic: false },

  // — El yazısı / karakterli —
  { id: 'caveat', family: 'Caveat', category: 'handwritten', weights: [500, 700], supportsCyrillic: true },
  { id: 'comfortaa', family: 'Comfortaa', category: 'handwritten', weights: [500, 700], supportsCyrillic: true },
  { id: 'pacifico', family: 'Pacifico', category: 'handwritten', weights: [400], supportsCyrillic: false },
];

/** Kiril metinde her zaman güvenle düşülecek font — site genelinde de AYNI rol Inter'de (bkz. layout.tsx yorumu). */
export const CYRILLIC_FALLBACK_FONT_ID = 'inter';

export function findCuratedPostFont(id: unknown): CuratedPostFont | undefined {
  return typeof id === 'string' ? CURATED_POST_FONTS.find((f) => f.id === id) : undefined;
}

/** Google Fonts `css2` API URL'i — `<link>` enjeksiyonu için (bkz. BeiwePostClient.tsx). */
export function googleFontsHref(font: CuratedPostFont): string {
  const familyParam = font.family.replace(/ /g, '+');
  const weightsParam = font.italic
    ? font.weights.map((w) => `1,${w}`).join(';')
    : font.weights.join(';');
  const axis = font.italic ? 'ital,wght' : 'wght';
  return `https://fonts.googleapis.com/css2?family=${familyParam}:${axis}@${weightsParam}&display=swap`;
}

/**
 * `postRenderer.ts`'in kullandığı çözümleme — şablonun kilitli fontunu ister, Kiril metin
 * VE fontun Kiril desteği yoksa `CYRILLIC_FALLBACK_FONT_ID`'ye (Inter) düşer. `fontId`
 * bilinmiyorsa (bozuk veri) yine Inter'e düşülür — sessizce tofu/kırık glif göstermektense.
 */
export function resolveTemplateFontFamily(fontId: string, hasCyrillic: boolean): string {
  const requested = findCuratedPostFont(fontId);
  const needsFallback = !requested || (hasCyrillic && !requested.supportsCyrillic);
  const effective = needsFallback ? findCuratedPostFont(CYRILLIC_FALLBACK_FONT_ID) : requested;
  const family = effective?.family ?? 'Inter';
  return `'${family}', sans-serif`;
}
