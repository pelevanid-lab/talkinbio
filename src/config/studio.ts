// Faz S.6 — Karakter Odası'nın 3. katmanı: post-prodüksiyon stüdyosu, tek gerçek kaynağı.
//
// Bu dosya BİLEREK `src/utils/fal.ts` ve `src/utils/supabase/admin.ts`'ten ayrı: server
// importu YOK. Kayıtlar hem sunucuda (`studio` route'unda timeline doğrulaması) hem
// tarayıcıda (editör, canvas render) okunuyor — motionModels.ts ile aynı gerekçe.
//
// Render burada YOK — o `src/utils/studioRenderer.ts`'te, çünkü render fonksiyonları
// DOM tipleri (HTMLCanvasElement, HTMLVideoElement) kullanıyor ve bu dosyanın sunucuda
// da import edilebilir (tip-only) kalması gerekiyor.

import { OVERLAY_LOCALES, type OverlayFont, type OverlayLocale } from './characters';

export type StudioAssetKind = 'image' | 'video' | 'audio';

/**
 * Yükleme sınırları — tür başına. `character_studio_assets.kind` check kısıtıyla eşleşir.
 * Video, cutaway'de kullanılmıyor (tam ekran görsel değişimi için görsel yeterli) ama
 * overlay'de "ekrana monte edilen görüntü" (StudioVideoOverlay) kaynağı olarak kullanılıyor.
 */
export const STUDIO_ASSET_LIMITS: Record<StudioAssetKind, { maxBytes: number; mimePrefix: string }> = {
  image: { maxBytes: 10 * 1024 * 1024, mimePrefix: 'image/' },
  video: { maxBytes: 100 * 1024 * 1024, mimePrefix: 'video/' },
  audio: { maxBytes: 20 * 1024 * 1024, mimePrefix: 'audio/' },
};

export function isStudioAssetKind(value: unknown): value is StudioAssetKind {
  return value === 'image' || value === 'video' || value === 'audio';
}

/** `character_studio_assets` satırının uygulama tarafındaki karşılığı. */
export interface StudioAsset {
  id: string;
  character_id: string;
  kind: StudioAssetKind;
  url: string;
  file_name: string;
  created_at: string;
}

/** Çıktı formatları — fal'a giden `AspectRatio`'dan bilerek ayrı: burada piksel boyutu lazım. */
export type StudioAspectRatio = '9:16' | '1:1' | '4:5' | '16:9';

export type StudioAspectPreset = {
  value: StudioAspectRatio;
  label: string;
  width: number;
  height: number;
};

/** 1080 tabanlı standart sosyal medya export boyutları. */
export const STUDIO_ASPECT_RATIOS: StudioAspectPreset[] = [
  { value: '9:16', label: 'Story/Reel 9:16', width: 1080, height: 1920 },
  { value: '1:1', label: 'Kare 1:1', width: 1080, height: 1080 },
  { value: '4:5', label: 'Gönderi 4:5', width: 1080, height: 1350 },
  { value: '16:9', label: 'Yatay 16:9', width: 1920, height: 1080 },
];

export function studioAspectPreset(ratio: StudioAspectRatio): StudioAspectPreset {
  return STUDIO_ASPECT_RATIOS.find((p) => p.value === ratio) ?? STUDIO_ASPECT_RATIOS[0];
}

export function isStudioAspectRatio(value: unknown): value is StudioAspectRatio {
  return typeof value === 'string' && STUDIO_ASPECT_RATIOS.some((p) => p.value === value);
}

export type StudioFit = 'cover' | 'contain';

/**
 * Videonun yerine tam ekran görsel gösterilen zaman aralığı — ses videodan kesintisiz
 * akmaya devam eder, sadece görüntü değişir. `studioRenderer.drawFrame` bunu, video
 * karesi çizmek yerine bu aralıktaki görseli çizerek uyguluyor (bkz. o dosyadaki yorum).
 */
export type StudioCutaway = {
  id: string;
  assetUrl: string;
  startTime: number;
  endTime: number;
  fit: StudioFit;
};

/**
 * "3 — 2 — 1 — yayın" geri sayımı. Noktalar CANVAS'A ÇİZİLİR (hazır bir görselin üstüne
 * değil): her nokta kendi bipiyle aynı anda yanabilsin diye görüntü ile sesin tek bir zaman
 * planından türemesi gerekiyor — bkz. `utils/countdown`.
 *
 * Sesi burada dosya olarak tutmuyoruz; osilatörle sentezleniyor. Klasik yayın sayacı bipi
 * (1000 Hz) zaten saf bir sinüs — asset yüklemek/yönetmek, önizleme ile export'un aynı
 * dosyayı beklemesi gibi bir yığın sorunu bedavaya getirirdi.
 */
export type StudioCountdown = {
  /** Kaç nokta = kaç kısa bip (sondaki uzun "yayın" bipi buna dahil değil). */
  steps: number;
  /**
   * `drain` = noktalar tek tek SÖNER (3 → 2 → 1 → yayın) — "geri sayım"ın birebir karşılığı.
   * `fill` = noktalar tek tek YANAR (yükleniyor → başlıyoruz). İkisi de aynı bip ritmini
   * kullanır, sadece hangi noktanın ne zaman değiştiği ters çevrilir.
   */
  direction: 'drain' | 'fill';
  /** Yanmış noktanın rengi; sönük hâli aynı renkten düşük opaklıkla türetilir. */
  color: string;
  /** Intro'ya görsel seçilmediyse çizilen düz arka plan. */
  background: string;
  /** Bip sesi — kapatılırsa sadece görsel geri sayım kalır. */
  sound: boolean;
};

export type StudioIntroOutro = {
  /** Geri sayım modunda null olabilir — o zaman `countdown.background` düz renk çizilir. */
  assetUrl: string | null;
  duration: number; // In seconds
  /**
   * Videonun başı (Intro) veya sonuna (Outro) göre zamanlama ofseti.
   * Intro'da -2 ise videodan 2 saniye önce (pre-roll) başlar. 0 ise video ile aynı anda başlar.
   * Outro'da +2 ise video bittikten 2 saniye sonraya (post-roll) uzar. 0 ise videoyla aynı anda biter.
   */
  offset: number;
  fit: StudioFit;
  /** null = düz görsel intro (eski davranış, kayıtlı projeler böyle açılır). */
  countdown: StudioCountdown | null;
};

/**
 * Kamera yakınlaştırma ("punch-in") — bu aralıkta TÜM kare (video + üstündeki overlay'ler)
 * `x`/`y` merkez noktasına doğru `scale` oranında büyür, `transition` saniyede yakınlaşır/
 * uzaklaşır, ortada sabit kalır. Ekrana monte edilen bir video overlay ile birlikte
 * kullanıldığında ikisi birlikte büyür — kameranın ekrana yaklaştığı hissi budur.
 */
export type StudioZoom = {
  id: string;
  startTime: number;
  endTime: number;
  /** Yakınlaşma hedefinin merkezi, canvas yüzdesi (0-100). */
  x: number;
  y: number;
  /** Büyütme çarpanı — 1 = zoom yok. */
  scale: number;
  /** Zoom-in/zoom-out geçiş süresi (saniye), başta ve sonda simetrik uygulanır. */
  transition: number;
};

/**
 * Yeniden kadraj (akıllı pan) — Zoom'la AYNI fikir (canvas'ta tıkla-konumlandır) ama farklı
 * davranış: Zoom bir ARALIKTA "blip" yapar (büyüt-küçült, aralık dışında etkisiz), Reframe
 * SIRALI noktalar arasında SÜREKLİ pan — ana sekans klibinin (video/görsel) `fit:'cover'`
 * kırpmasının odak noktasını zamana göre kaydırır. Kaynak video hedef en-boy oranından
 * FARKLIYSA (ör. 16:9 ham çekim 9:16 hedefe) sabit merkez-kırpma öznenin kadraj dışı
 * kalmasına yol açabiliyor — bu, o kaymayı elle (yüz takibi OLMADAN) düzeltme aracı.
 * Bkz. `resolveReframePoint` (interpolasyon) ve `drawMediaFittedBox`'ın `centerX/centerY`
 * parametreleri (studioRenderer.ts).
 */
export type StudioReframePoint = {
  id: string;
  /** Master-timeline zamanı (saniye) — Zoom'un aksine bir ARALIK değil TEK an. */
  time: number;
  /** Odak noktası, canvas yüzdesi (0-100). */
  x: number;
  y: number;
};

/** Ortak zaman/konum alanları — hem görsel hem metin overlay'i bunu taşır. */
type StudioOverlayBase = {
  id: string;
  startTime: number;
  endTime: number;
  /** Canvas boyutunun yüzdesi (0-100) — çözünürlükten bağımsız olsun diye (overlay.headlineSize ile aynı mantık). */
  x: number;
  y: number;
  opacity: number;
};

export type StudioImageOverlay = StudioOverlayBase & {
  kind: 'image';
  assetUrl: string;
  /** Canvas genişliğinin yüzdesi; yükseklik verilmezse görselin kendi oranından hesaplanır. */
  width: number;
  /**
   * YENİ — verilirse overlay artık aspect-kilitli değil, keyfi bir dikdörtgen kutu olur
   * (canvas yüksekliğinin yüzdesi). "Ekranı ikiye böl" (split-screen/PiP) ihtiyacı bunun
   * üzerinden çözülüyor — ör. y:0, height:50, overlayFit:'cover' = üst yarıyı kaplayan kutu.
   * Verilmezse davranış eskisiyle birebir aynı (geriye dönük uyumlu).
   */
  height?: number;
  /** `height` verildiğinde görsel bu kutuya nasıl sığdırılır. Verilmezse 'cover'. */
  overlayFit?: StudioFit;
};

/**
 * Ekrana monte edilen video (ör. laptop ekranına oturan bir screen-recording) — image
 * overlay ile aynı konumlama mantığı (x/y/width, eksene hizalı dikdörtgen), ama kaynağı
 * video. Her zaman sessiz oynatılır: ana videonun sesiyle karışmasın diye ayrıca bir
 * ses seviyesi/mute alanı YOK, `studioRenderer` bunu her zaman muted oynatıyor.
 */
export type StudioVideoOverlay = StudioOverlayBase & {
  kind: 'video';
  assetUrl: string;
  width: number;
  /** bkz. StudioImageOverlay.height — aynı split-screen/PiP mantığı. */
  height?: number;
  overlayFit?: StudioFit;
};

export type StudioTextOverlay = StudioOverlayBase & {
  kind: 'text';
  text: string;
  /** Canvas yüksekliğinin yüzdesi — CharacterShot.overlay.headlineSize ile aynı birim. */
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  font: OverlayFont;
};

export type StudioOverlay = StudioImageOverlay | StudioTextOverlay | StudioVideoOverlay;

/**
 * Sekans (film rulosu) elemanları arası geçiş. v1: yalnızca 'cut' render'da işlevsel —
 * 'crossfade'/'dip-to-black' tip olarak tanımlı, editörde seçilebilir ama `drawFrame`
 * onları şimdilik 'cut' gibi ele alır (bkz. studioRenderer.ts). Tip önden genişletiliyor
 * ki editör UI'ı ve kayıtlı projeler render mantığı yetişmeden önce kırılmasın.
 */
export type StudioTransition = { kind: 'cut' | 'crossfade' | 'dip-to-black'; duration: number };

export const DEFAULT_TRANSITION: StudioTransition = { kind: 'cut', duration: 0 };

/**
 * Sekans (film rulosu) tek bir elemanı — `cutaways`'ten farkı: cutaway "ana video akarken
 * bir aralıkta üstüne resim koy" demek, sequence ise "hangi kaynağın oynadığı" sorusunun
 * KENDİSİ. İkisi birlikte çalışır: sequence "hangi klip şu an aktif" sorusuna cevap verir,
 * cutaway hâlâ o cevabın üstüne binebilir (bkz. drawFrame'deki öncelik sırası).
 */
export type StudioSequenceClip = {
  id: string;
  kind: 'video' | 'image';
  assetUrl: string;
  /** character_clips.id, varsa — havuzdan silinse bile assetUrl bağımsız çalışır (anlık görüntü). */
  clipId: string | null;
  /** kind:'video' — kaynaktaki kırpma aralığı (saniye). kind:'image' için kullanılmaz (0/0).
   *  `sourceEnd === 0` bir SENTİNEL: "kaynak videonun tamamı" — bugünkü `trim.end` ile AYNI
   *  kural (bkz. DEFAULT_TIMELINE yorumu). Süresi henüz bilinmeyen (metadata yüklenmemiş)
   *  bir klip eklendiğinde kullanılır; gerçek süre `liveDurations` ile çözülür (bkz.
   *  `sequenceClipDuration`). */
  sourceStart: number;
  sourceEnd: number;
  /** kind:'image' — ekranda kalma süresi (saniye). kind:'video' için kullanılmaz (0). */
  holdDuration: number;
  fit: StudioFit;
  transitionIn: StudioTransition;
};

/**
 * Bir sekans elemanının kendi süresi (saniye) — video için kırpma aralığı, görsel için hold
 * süresi. `liveDurations` (clip.id -> saniye) `sourceEnd===0` sentinel'ini çözmek için —
 * bu dosya DOM tiplerinden bağımsız kalmalı (sunucuda da import ediliyor, bkz. dosya başı
 * yorumu), o yüzden `<video>` elementi değil düz bir Map alınıyor; `studioRenderer`/
 * `StudioEditor` kendi video havuzundan (`el.duration`) bu Map'i her karede kurup geçiriyor.
 */
export function sequenceClipDuration(clip: StudioSequenceClip, liveDurations?: Map<string, number>): number {
  if (clip.kind === 'image') return Math.max(0, clip.holdDuration);
  const end = clip.sourceEnd || liveDurations?.get(clip.id) || 0;
  return Math.max(0, end - clip.sourceStart);
}

/** Sekansın toplam süresi — v1: geçiş çakışması yok, elemanların süreleri toplanır. */
export function sequenceDuration(sequence: StudioSequenceClip[], liveDurations?: Map<string, number>): number {
  return sequence.reduce((sum, clip) => sum + sequenceClipDuration(clip, liveDurations), 0);
}

export type ResolvedSequencePosition = { clip: StudioSequenceClip; localTime: number; index: number };

/** Sekans zamanındaki (0 = ilk elemanın başı) `time` anında hangi eleman aktif ve o elemanın
 * kendi içindeki (localTime) karşılığı ne — `time` aralığın dışındaysa (sekans bitmiş/boş) null. */
export function resolveSequencePosition(
  sequence: StudioSequenceClip[],
  time: number,
  liveDurations?: Map<string, number>,
): ResolvedSequencePosition | null {
  let cursor = 0;
  for (let index = 0; index < sequence.length; index++) {
    const clip = sequence[index];
    const duration = sequenceClipDuration(clip, liveDurations);
    if (time >= cursor && time < cursor + duration) {
      return { clip, localTime: time - cursor, index };
    }
    cursor += duration;
  }
  return null;
}

/**
 * `points` (zamana göre sıralı VARSAYILIR — çağıran taraf ekleme/düzenlemede sıralı tutar)
 * arasında `time` anındaki odak noktasını lineer interpolasyonla çözer. Boşsa sabit
 * %50/%50 (bugünkü merkez-kırpma davranışı DEĞİŞMEZ). Tek noktaysa/`time` ilk noktadan
 * önce/son noktadan sonraysa o UÇ noktada sabit kalır — pan SADECE noktalar ARASINDA var,
 * uçlarda "hold" davranışı Zoom'un `transition`'ından FARKLI olarak burada zaten
 * kesintisiz (ayrı bir geçiş süresi parametresi yok, iki nokta arası mesafe pan hızını belirler).
 */
export function resolveReframePoint(points: StudioReframePoint[], time: number): { x: number; y: number } {
  if (!points.length) return { x: 50, y: 50 };
  if (points.length === 1 || time <= points[0].time) return { x: points[0].x, y: points[0].y };
  const last = points[points.length - 1];
  if (time >= last.time) return { x: last.x, y: last.y };
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (time >= a.time && time <= b.time) {
      const t = b.time === a.time ? 0 : (time - a.time) / (b.time - a.time);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return { x: last.x, y: last.y };
}

export const MAX_SEQUENCE_CLIPS = 30;

/**
 * Klip/görsel rengi ve dokusu — v1 kapsamı GLOBAL (tüm sekansa uygulanır), klip-başına
 * grade v1.1. `ctx.filter` (brightness/contrast/saturate) native ve ucuz; grain/vignette
 * `studioRenderer`'da wordmark ile aynı önbellekleme deseniyle (bkz. getWordmarkLayer)
 * çiziliyor — her karede yeniden üretilmiyor.
 */
export type StudioColorGrade = {
  brightness: number; // -100..100, 0 = değişiklik yok
  contrast: number;   // -100..100
  saturation: number; // -100..100
  temperature: number; // -100 (soğuk) .. 100 (sıcak), 0 = değişiklik yok
  grain: number;   // 0..1, 0 = kapalı
  vignette: number; // 0..1, 0 = kapalı
};

export const DEFAULT_COLOR_GRADE: StudioColorGrade = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  grain: 0,
  vignette: 0,
};

export type StudioMusic = {
  assetUrl: string;
  /** 0-1 arası kazanç — orijinal video sesi ayrıca `StudioTimeline.videoVolume` ile ayarlanır. */
  volume: number;
};

/**
 * Otomatik altyazının TEK bir kelimesi (fal-ai/whisper `chunk_level: "word"` çıktısından) —
 * ekranda aynı anda tek kelime yanıp söner ("karaoke"/TikTok tarzı pop-on caption).
 * `startTime`/`endTime` diğer zaman çizelgesi öğeleriyle AYNI koordinat sisteminde
 * (0 = `trim.start`) — transkripsiyon sırasında whisper'ın mutlak zaman damgasından
 * `trim.start` çıkarılarak hesaplanıyor (bkz. StudioEditor'daki transcribe akışı).
 */
export type StudioCaption = {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
};

/** Tüm altyazı kelimelerinin paylaştığı ortak görünüm — her kelime için ayrı ayarlamak yerine tek stil. */
export type StudioCaptionStyle = {
  /** Canvas yüzdesi, metnin merkezi. */
  x: number;
  y: number;
  /** Canvas yüksekliğinin yüzdesi. */
  fontSize: number;
  color: string;
  font: OverlayFont;
  /**
   * Kelime akış hızı çarpanı — 1 = whisper'ın orijinal zamanlaması (kaynak konuşma hızı).
   * >1 her kelimeyi ekranda daha uzun tutar (bkz. `applyCaptionSpeed`). Çeviri metinleri
   * genelde kaynaktan daha uzun/yavaş okunduğu için (zaman damgaları kaynaktan AYNEN
   * kopyalanıyor, bkz. `StudioTranslatedCaptions` yorumu) bu ayar özellikle çeviri
   * altyazılarını okunur kılmak için var — ama global (locale'e özel değil), çünkü
   * `captionStyle` tek, tüm locale'ler paylaşıyor.
   */
  speed: number;
  /**
   * Aynı anda ekranda gösterilecek ardışık kelime SAYISI — 1 = whisper'ın verdiği gibi tek
   * tek (varsayılan). >1, `groupCaptions` ile ardışık N parçayı TEK bir görüntüleme birimine
   * birleştirir (metinleri boşlukla birleştirilir, zamanlama ilkin başlangıcı/sonuncunun
   * bitişini alır). Çeviri parçaları artık kaynak kelimeyle birebir eşleşmek zorunda değil
   * (bkz. captionTranslate.ts, 2026-08-08) — bu bazı parçaların boş kalmasına yol açabiliyor;
   * gruplama bu boş/parçalı satırları da doğal olarak eritiyor.
   */
  groupSize: number;
};

/** `groupSize` için izin verilen aralık — `parseCaptionStyle` ve StudioEditor'daki seçenek
 *  listesi bununla sınırlı. Üstü tek satırda okunamayacak kadar uzun metin biriktirir. */
export const CAPTION_GROUP_SIZE_RANGE = { min: 1, max: 4 } as const;

/**
 * Çok dilli altyazı — Düzenle → "Bu dile çevir". Kaynak `StudioTimeline.captions`
 * (whisper transkripti) YERİNE geçmez, yanında yaşar: çeviri yalnızca `text`'i
 * değiştirir, `startTime`/`endTime` kaynak diziden AYNEN kopyalanır (bkz.
 * `captionTranslate.ts` — LLM'e zaman damgası değil sadece metin gönderiliyor).
 * Bu yüzden `Partial<Record<OverlayLocale, StudioCaption[]>>` — henüz çevrilmemiş
 * bir dilin anahtarı hiç yok, `{}`  eski projeler için güvenli varsayılan.
 */
export type StudioTranslatedCaptions = Partial<Record<OverlayLocale, StudioCaption[]>>;

/**
 * Düzenle → Redub çıktısı — `fal-ai/elevenlabs/dubbing` sonucu. `sourceUrl` hangi
 * videodan türetildiğini işaretler (proje birden fazla redub deneyebilir, ör. önce
 * TR kaynaktan EN, sonra aynı kaynaktan RU); `videoUrl` her zaman fal'ın kalıcı
 * depolamasında (7 gün sınırı YOK — MiniMax klonundaki `custom_voice_id` süresiyle
 * karıştırılmasın, bu düz bir dosya).
 */
export type StudioDub = {
  id: string;
  locale: OverlayLocale;
  sourceUrl: string;
  videoUrl: string;
  createdAt: string;
};

export const MAX_DUBS = 6;

/**
 * Ana sekansın (+ üstüne binen cutaway/intro/outro) belli bir ZAMAN ARALIĞINDA ekranda
 * kapladığı dikdörtgen — split-screen için `StudioImageOverlay.height` ile AYNI fikir, ama
 * OVERLAY'e değil ANA VİDEOYA uygulanıyor. `cutaways`/`zooms` ile AYNI desen: bir dizi,
 * her eleman kendi `startTime`/`endTime`'ına sahip — videonun sadece belirli bir bölümünü
 * split-screen yapmak için (tamamını değil). Aralık dışında ana video eskisi gibi tam ekran
 * kapla. Overlay'ler bu kutudan bağımsız, kendi x/y/width/height'lerine göre konumlanmaya
 * devam eder — split-screen'in "üst" tarafı genelde bir overlay (ör. ekran kaydı), "alt"
 * tarafı bu kutuya sıkıştırılmış ana video olur.
 */
export type StudioSequenceLayout = {
  id: string;
  startTime: number;
  endTime: number;
  x: number; // canvas genişliğinin yüzdesi
  y: number; // canvas yüksekliğinin yüzdesi
  width: number;
  height: number;
  fit: StudioFit;
};

export const MAX_SEQUENCE_LAYOUTS = 12;

export type StudioTimeline = {
  aspectRatio: StudioAspectRatio;
  /** Ana videonun kaynak süresinden (saniye) kırpılan aralık. `sequence` doluysa bu alan
   *  YOK SAYILIR — yalnızca `sequence` boşken (eski proje) geriye dönük anlamı korunuyor,
   *  bkz. `parseStudioTimeline`'daki geriye dönük sentez. */
  trim: { start: number; end: number };
  /**
   * YENİ — film rulosu. Boşsa (eski proje ya da fallback verilmeden parse edilmişse)
   * `trim`+harici video kaynağı eskisi gibi tek elemanlı bir sekans gibi davranır.
   */
  sequence: StudioSequenceClip[];
  /** YENİ — split-screen: bu aralıklarda ana video (+ cutaway/intro/outro) kendi kutusuna
   *  sığdırılır. `cutaways`/`zooms` ile AYNI desen — aralık dışında tam ekran. */
  sequenceLayouts: StudioSequenceLayout[];
  cutaways: StudioCutaway[];
  overlays: StudioOverlay[];
  zooms: StudioZoom[];
  /** YENİ — yeniden kadraj (akıllı pan). Boşsa/tek noktaysa bugünkü sabit merkez-kırpma
   *  davranışı (%50/%50) DEĞİŞMEZ, bkz. `resolveReframePoint`. */
  reframe: StudioReframePoint[];
  captions: StudioCaption[];
  captionStyle: StudioCaptionStyle;
  /** YENİ — çok dilli altyazı, bkz. tip yorumu. Boş `{}` = hiç çeviri yok (eski proje). */
  translatedCaptions: StudioTranslatedCaptions;
  intro: StudioIntroOutro | null;
  outro: StudioIntroOutro | null;
  music: StudioMusic | null;
  /** 0-1 arası kazanç — orijinal video/anlatım sesi (bkz. `enhancedAudioUrl`). */
  videoVolume: number;
  /** fal-ai/elevenlabs/audio-isolation çıktısı — varsa orijinal video sesi yerine BU çalınır/kaydedilir. */
  enhancedAudioUrl: string | null;
  wordmark: boolean;
  /** YENİ — global renk/efekt katmanı. */
  grade: StudioColorGrade;
  /** YENİ — Redub çıktıları, bkz. `StudioDub`. Boş `[]` = hiç redub yapılmamış. */
  dubs: StudioDub[];
};

export const MAX_CUTAWAYS = 12;
export const MAX_OVERLAYS = 12;
export const MAX_ZOOMS = 8;
export const MAX_REFRAME_POINTS = 8;
// Cutaway/overlay'den çok daha yüksek: bir dakikalık konuşma kolayca 150+ kelime üretir,
// bunlar tek tek elle eklenmiyor, whisper'dan toplu geliyor.
export const MAX_CAPTIONS = 600;
export const MAX_OVERLAY_TEXT_LENGTH = 200;
export const MAX_PROJECT_NAME_LENGTH = 80;

export const MIN_COUNTDOWN_STEPS = 2;
export const MAX_COUNTDOWN_STEPS = 5;

// Nokta rengi `LogoSVG`deki (page.tsx) üç noktayla BİREBİR aynı hex — geri sayım markanın
// kendi işaretinin büyütülmüş hâli gibi okunsun diye. Zemin markanın kirli beyazı.
export const DEFAULT_COUNTDOWN: StudioCountdown = {
  steps: 3,
  direction: 'drain',
  color: '#14231F',
  background: '#F2EFE6',
  sound: true,
};

/**
 * Geri sayım intro'sunun varsayılan süresi. Yayın sayacı ritmi süreyi (adım + 1)'e böldüğü
 * için 2.5 sn ≈ 0.6 sn'lik vuruşlar demek — Reels için fazla uzatmadan sayaç hissini veriyor.
 */
export const DEFAULT_COUNTDOWN_DURATION = 2.5;

// y: 82 -> Instagram/TikTok Reels'in alt %20'lik kendi arayüzü (kullanıcı adı, açıklama,
// paylaş butonları) tam bu bölgeyi kaplıyor — StudioEditor'daki güvenli alan çizgisiyle
// (bottom-[20%], yani Y:80) çakışırdı. 70, o çizginin belirgin şekilde üstünde kalıyor.
export const DEFAULT_CAPTION_STYLE: StudioCaptionStyle = {
  x: 50,
  y: 70,
  fontSize: 7,
  color: '#FFFFFF',
  font: 'bricolage',
  speed: 1,
  groupSize: 1,
};

/** Altyazı hız çarpanı için izin verilen aralık — `parseCaptionStyle` ve StudioEditor'daki
 *  seçenek listesi bununla sınırlı. Üstü, kelimeler arası boşluğu absürt uzatır. */
export const CAPTION_SPEED_RANGE = { min: 0.5, max: 2.5 } as const;

/**
 * Tek tık altyazı stil şablonları — X/Y/punto/font/renk'i tek tek elle ayarlamak yerine
 * hazır bir görünüm uygular. `speed`/`groupSize` KASITLI OLARAK dahil değil — kullanıcının
 * ayrı ayarladığı bu tercihler bir stil şablonu seçmekle sıfırlanmamalı.
 */
export const CAPTION_STYLE_PRESETS: { id: string; label: string; style: Partial<StudioCaptionStyle> }[] = [
  { id: 'tiktok-bold', label: 'TikTok Kalın', style: { font: 'bricolage', fontSize: 9, color: '#FFEB3B', x: 50, y: 72 } },
  { id: 'minimal', label: 'Temiz Minimal', style: { font: 'inter', fontSize: 5, color: '#FFFFFF', x: 50, y: 88 } },
  { id: 'center-pop', label: 'Ortada Vurgu', style: { font: 'bricolage', fontSize: 11, color: '#FFFFFF', x: 50, y: 50 } },
  { id: 'typewriter', label: 'Daktilo', style: { font: 'mono', fontSize: 6, color: '#FFFFFF', x: 50, y: 80 } },
];

/**
 * Kelime zamanlamasını `speed` çarpanı kadar esnetir — ilk kelimenin `startTime`'ı sabit
 * pivot, sonraki her kelimenin başlangıç/bitişi bu pivottan olan mesafesi `speed` ile
 * çarpılarak yeniden hesaplanır. speed=1 → değişiklik yok (kaynak whisper zamanlaması).
 * speed=1.5 → her kelime ekranda %50 daha uzun kalır VE aralarındaki boşluk da orantılı
 * büyür (kelimeler sesin "gerisinde" kalmaya başlar — bu, okunabilirlik için kabul edilen
 * bir görsel/ses kayması, `drawFrame` sadece görsel katmanı çiziyor, sesi etkilemiyor).
 * Saf fonksiyon — hem önizleme hem export AYNI `drawFrame` çağrısından geçtiği için tek
 * bir uygulama noktası yeterli (bkz. studioRenderer.ts).
 */
export function applyCaptionSpeed(captions: StudioCaption[], speed: number): StudioCaption[] {
  if (!captions.length || !isFiniteNumber(speed) || speed === 1) return captions;
  const t0 = captions[0].startTime;
  return captions.map((c) => ({
    ...c,
    startTime: t0 + (c.startTime - t0) * speed,
    endTime: t0 + (c.endTime - t0) * speed,
  }));
}

/** `groupCaptions`'ın çıktısı — normal `StudioCaption` alanlarına ek olarak, StudioEditor'ün
 *  "Kelimeleri düzenle" listesi bir grup satırını düzenlerken hangi ORİJİNAL id'lere
 *  yazacağını bilsin diye `memberIds` taşır (bkz. groupSize yorumu, StudioCaptionStyle). */
export type StudioCaptionGroup = StudioCaption & { memberIds: string[] };

/**
 * Ardışık `groupSize` kadar kelime parçasını TEK bir görüntüleme birimine birleştirir —
 * karaoke ekranında aynı anda kaç kelimenin gösterileceğini kontrol eder. groupSize<=1 →
 * değişiklik yok, her parça kendi başına (memberIds tek elemanlı). groupSize=2 → ardışık
 * ikişer parça birleşir: startTime ilkin başlangıcı, endTime sonuncunun bitişi, text ise
 * aradaki BOŞ OLMAYAN metinlerin boşlukla birleşimi — bu son kısım özellikle çeviri
 * altyazılarında işe yarıyor: `captionTranslate.ts` artık her parçayı kaynak kelimeyle
 * birebir eşlemiyor (2026-08-08), bu da bazı parçaları boş bırakabiliyor; gruplama bu
 * boş/parçalı satırları doğal olarak eritip tek okunabilir bir metne dönüştürüyor.
 */
export function groupCaptions(captions: StudioCaption[], groupSize: number): StudioCaptionGroup[] {
  const size = Math.max(1, Math.round(isFiniteNumber(groupSize) ? groupSize : 1));
  if (size <= 1) return captions.map((c) => ({ ...c, memberIds: [c.id] }));
  const groups: StudioCaptionGroup[] = [];
  for (let i = 0; i < captions.length; i += size) {
    const chunk = captions.slice(i, i + size);
    groups.push({
      id: chunk[0].id,
      startTime: chunk[0].startTime,
      endTime: chunk[chunk.length - 1].endTime,
      text: chunk
        .map((c) => c.text.trim())
        .filter(Boolean)
        .join(' '),
      memberIds: chunk.map((c) => c.id),
    });
  }
  return groups;
}

// --- Sessizlik / dolgu kelime otomatik kesme --------------------------------------------
//
// `timeline.captions` (whisper kelime zaman damgaları) ZATEN master-timeline koordinatında
// (bkz. StudioEditor'daki transcribeCaptions yorumu ve drawFrame'in `time >= c.startTime`
// karşılaştırması — zooms/cutaways/overlays ile AYNI koordinat sistemi). Bu yüzden kelimeler
// arası boşluklar doğrudan [start,end) master-time kesim aralığı olarak kullanılabiliyor,
// ayrı bir koordinat dönüşümüne gerek yok.

export type StudioCutRange = { start: number; end: number };

/** Konservatif, sabit bir TR dolgu kelime listesi — `findSilenceCuts`'a opsiyonel olarak
 *  geçiliyor (varsayılan KAPALI, dil/bağlam riskli). Noktalama ayıklanıp küçük harfe
 *  çevrilmiş metinle eşleştirilir (bkz. findSilenceCuts). */
export const FILLER_WORDS_TR = new Set(['şey', 'yani', 'ıı', 'ııı', 'eee', 'hıı', 'aa']);

/** Üst üste binen/bitişik kesim aralıklarını tek aralığa birleştirir, artan sıraya dizer —
 *  hem `findSilenceCuts`'ın kendi çıktısı hem `removeCutRanges`'a kullanıcının UI'da
 *  işaretlediği (sırasız/çakışabilir) alt küme için savunmacı bir ön adım. */
function mergeCutRanges(ranges: StudioCutRange[]): StudioCutRange[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: StudioCutRange[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

/**
 * Kelimeler arası boşlukları (>= `minGapSeconds`) kesim adayı olarak bulur. `fillerWords`
 * verilirse o kelimelerin KENDİ span'ları da eklenir (komşu boşluklarla `mergeCutRanges`
 * otomatik birleşir). Saf/salt-okunur — hiçbir şeyi uygulamaz, sadece aday listesi döner;
 * çağıran taraf (StudioEditor) kullanıcıya önizleme olarak gösterip onaylatır.
 */
export function findSilenceCuts(
  captions: StudioCaption[],
  minGapSeconds: number,
  fillerWords?: Set<string>,
): StudioCutRange[] {
  if (!captions.length) return [];
  const sorted = [...captions].sort((a, b) => a.startTime - b.startTime);
  const ranges: StudioCutRange[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    if (fillerWords) {
      const normalized = c.text.trim().toLocaleLowerCase('tr').replace(/[.,!?;:…]/g, '');
      if (fillerWords.has(normalized)) ranges.push({ start: c.startTime, end: c.endTime });
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      const gap = c.startTime - prev.endTime;
      if (gap >= minGapSeconds) ranges.push({ start: prev.endTime, end: c.startTime });
    }
  }
  return mergeCutRanges(ranges);
}

/**
 * Verilen `t` (kesimler UYGULANMADAN ÖNCEKİ, orijinal master-time) anını kesimler
 * uygulandıktan SONRAKİ konumuna eşler — NLE'lerdeki "ripple delete" ile aynı fikir tek bir
 * fonksiyona sıkıştırılmış: kesimden önce değişmez, bir kesimin İÇİNDEKİ her an o kesimin
 * başlangıcına "çöker" (üstündeki öğe `remapRange`'de start===end kontrolüyle düşürülür),
 * kesimden sonrası o ana kadarki TOPLAM kesilmiş süre kadar geri kayar. `sortedCuts`
 * ÖNCEDEN `mergeCutRanges` ile birleştirilmiş/sıralanmış olmalı.
 */
function mapTimeAfterCuts(t: number, sortedCuts: StudioCutRange[]): number {
  let removed = 0;
  for (const cut of sortedCuts) {
    if (t <= cut.start) break;
    if (t < cut.end) return cut.start - removed;
    removed += cut.end - cut.start;
  }
  return t - removed;
}

/** `startTime`/`endTime` taşıyan herhangi bir master-time öğesini (caption/cutaway/zoom/
 *  overlay/sequenceLayout) kesimlere göre yeniden konumlandırır — tamamen bir kesimin
 *  içindeyse (yeniden konumlanmış start===end) `null` (düşür). */
function remapRange<T extends { startTime: number; endTime: number }>(
  item: T,
  sortedCuts: StudioCutRange[],
): T | null {
  const startTime = mapTimeAfterCuts(item.startTime, sortedCuts);
  const endTime = mapTimeAfterCuts(item.endTime, sortedCuts);
  if (endTime <= startTime) return null;
  return { ...item, startTime, endTime };
}

/**
 * `timeline.sequence`'e kesimleri uygular. Sekans DİĞER dizilerin aksine KÜMÜLATİF/cursor
 * tabanlı (bkz. `resolveSequencePosition` yorumu) — klipler kendi mutlak zamanını taşımaz,
 * konumu önceki kliplerin toplam süresinden türer. Bu yüzden `remapRange`/`mapTimeAfterCuts`
 * BURADA uygulanmıyor: bunun yerine her klibin ORİJİNAL [clipStart,clipEnd) aralığı kesimlerle
 * kesiştirilip HAYATTA KALAN alt parçalar (varsa birden fazla — aynı klip içinde birden fazla
 * sessizlik olabilir) yeni klipler olarak üretiliyor; klip TAMAMEN bir kesimin içindeyse hiç
 * parça üretilmiyor (düşer). Kalan kliplerin konumu zaten cursor'dan otomatik türeyeceği için
 * ayrıca kaydırma GEREKMİYOR.
 */
function removeCutsFromSequence(
  sequence: StudioSequenceClip[],
  sortedCuts: StudioCutRange[],
  liveDurations?: Map<string, number>,
): StudioSequenceClip[] {
  const MIN_PIECE_SECONDS = 0.05;
  const result: StudioSequenceClip[] = [];
  let cursor = 0;
  for (const clip of sequence) {
    const duration = sequenceClipDuration(clip, liveDurations);
    const clipStart = cursor;
    const clipEnd = cursor + duration;
    cursor = clipEnd;

    const overlapping = sortedCuts.filter((c) => c.end > clipStart && c.start < clipEnd);
    if (!overlapping.length) {
      result.push(clip);
      continue;
    }

    let pos = clipStart; // orijinal master-time koordinatında
    let firstPiece = true;
    const pushPiece = (segStart: number, segEnd: number) => {
      if (segEnd - segStart <= MIN_PIECE_SECONDS) return;
      const id = firstPiece ? clip.id : crypto.randomUUID();
      if (clip.kind === 'image') {
        result.push({ ...clip, id, holdDuration: segEnd - segStart });
      } else {
        result.push({
          ...clip,
          id,
          sourceStart: clip.sourceStart + (segStart - clipStart),
          sourceEnd: clip.sourceStart + (segEnd - clipStart),
        });
      }
      firstPiece = false;
    };

    for (const cut of overlapping) {
      pushPiece(pos, Math.max(pos, cut.start));
      pos = Math.max(pos, cut.end);
    }
    pushPiece(pos, clipEnd);
  }
  return result;
}

/**
 * Kesim aralıklarını TÜM zamanlanmış timeline verisine uygular: sekans (özel — bkz.
 * `removeCutsFromSequence`) + mutlak master-time dizileri (captions, translatedCaptions'ın
 * her locale'i, cutaways, zooms, overlays, sequenceLayouts — hepsi `remapRange` ile) +
 * reframe (tek `time` alanı olduğu için ayrı, bkz. altındaki satır). Saf fonksiyon,
 * `timeline`'ı MUTATE etmez. `findSilenceCuts`'ın çıktısı zaten birleşik/sıralı ama çağıran
 * taraf kullanıcının önizlemede işaretlediği ALT KÜMEYİ gönderdiği için burada yeniden
 * `mergeCutRanges` uygulanıyor (savunmacı).
 */
export function removeCutRanges(
  timeline: StudioTimeline,
  ranges: StudioCutRange[],
  liveDurations?: Map<string, number>,
): StudioTimeline {
  const cuts = mergeCutRanges(ranges.filter((r) => r.end > r.start));
  if (!cuts.length) return timeline;

  const remapList = <T extends { startTime: number; endTime: number }>(items: T[]): T[] =>
    items.map((item) => remapRange(item, cuts)).filter((x): x is T => x !== null);

  const translatedCaptions: StudioTranslatedCaptions = {};
  for (const locale of OVERLAY_LOCALES) {
    const list = timeline.translatedCaptions[locale];
    if (list?.length) {
      const next = remapList(list);
      if (next.length) translatedCaptions[locale] = next;
    }
  }

  return {
    ...timeline,
    sequence: removeCutsFromSequence(timeline.sequence, cuts, liveDurations),
    captions: remapList(timeline.captions),
    translatedCaptions,
    cutaways: remapList(timeline.cutaways),
    zooms: remapList(timeline.zooms),
    overlays: remapList(timeline.overlays),
    sequenceLayouts: remapList(timeline.sequenceLayouts),
    // reframe noktalarının SÜRESİ yok (tek `time`), `remapList` (start/end) uygulanamaz —
    // bir kesimin İÇİNE düşen nokta o kesimin başlangıcına "çöker" (mapTimeAfterCuts), DÜŞMEZ.
    reframe: timeline.reframe.map((p) => ({ ...p, time: mapTimeAfterCuts(p.time, cuts) })),
  };
}

export const DEFAULT_TIMELINE: StudioTimeline = {
  aspectRatio: '9:16',
  // end=0: "kaynak videonun tamamı" için sentinel — gerçek süre yüklenince editör dolduruyor.
  trim: { start: 0, end: 0 },
  sequence: [],
  sequenceLayouts: [],
  cutaways: [],
  overlays: [],
  zooms: [],
  reframe: [],
  captions: [],
  captionStyle: DEFAULT_CAPTION_STYLE,
  translatedCaptions: {},
  intro: null,
  outro: null,
  music: null,
  videoVolume: 1,
  enhancedAudioUrl: null,
  wordmark: true,
  grade: DEFAULT_COLOR_GRADE,
  dubs: [],
};

const OVERLAY_FONTS_SET = new Set<OverlayFont>(['bricolage', 'inter', 'mono']);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** `assetUrl` alanlarının en azından http(s) URL'i olduğunu doğrular — tam whitelisting değil. */
function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseCutaway(value: unknown): StudioCutaway | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isHttpUrl(v.assetUrl)) return null;
  if (!isFiniteNumber(v.startTime) || !isFiniteNumber(v.endTime)) return null;
  if (v.endTime <= v.startTime) return null;
  const fit: StudioFit = v.fit === 'contain' ? 'contain' : 'cover';
  return {
    id: typeof v.id === 'string' ? v.id : crypto.randomUUID(),
    assetUrl: v.assetUrl,
    startTime: Math.max(0, v.startTime),
    endTime: v.endTime,
    fit,
  };
}

function parseZoom(value: unknown): StudioZoom | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isFiniteNumber(v.startTime) || !isFiniteNumber(v.endTime) || v.endTime <= v.startTime) return null;
  return {
    id: typeof v.id === 'string' ? v.id : crypto.randomUUID(),
    startTime: Math.max(0, v.startTime),
    endTime: v.endTime,
    x: clamp(isFiniteNumber(v.x) ? v.x : 50, 0, 100),
    y: clamp(isFiniteNumber(v.y) ? v.y : 50, 0, 100),
    scale: clamp(isFiniteNumber(v.scale) ? v.scale : 1.6, 1, 4),
    transition: clamp(isFiniteNumber(v.transition) ? v.transition : 0.4, 0, 3),
  };
}

function parseReframePoint(value: unknown): StudioReframePoint | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isFiniteNumber(v.time)) return null;
  return {
    id: typeof v.id === 'string' ? v.id : crypto.randomUUID(),
    time: Math.max(0, v.time),
    x: clamp(isFiniteNumber(v.x) ? v.x : 50, 0, 100),
    y: clamp(isFiniteNumber(v.y) ? v.y : 50, 0, 100),
  };
}

function parseCountdown(value: unknown): StudioCountdown | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  return {
    steps: Math.round(clamp(isFiniteNumber(v.steps) ? v.steps : DEFAULT_COUNTDOWN.steps, MIN_COUNTDOWN_STEPS, MAX_COUNTDOWN_STEPS)),
    direction: v.direction === 'fill' ? 'fill' : 'drain',
    color: typeof v.color === 'string' ? v.color : DEFAULT_COUNTDOWN.color,
    background: typeof v.background === 'string' ? v.background : DEFAULT_COUNTDOWN.background,
    sound: v.sound !== false,
  };
}

function parseIntroOutro(value: unknown): StudioIntroOutro | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isFiniteNumber(v.duration) || v.duration <= 0) return null;

  const countdown = parseCountdown(v.countdown);
  const assetUrl = isHttpUrl(v.assetUrl) ? v.assetUrl : null;
  // Görselsiz intro yalnızca geri sayım modunda anlamlı — aksi hâlde ekranda çizilecek
  // hiçbir şey kalmaz (siyah kare), o yüzden böyle bir kayıt tamamen reddediliyor.
  if (!assetUrl && !countdown) return null;

  const fit: StudioFit = v.fit === 'contain' ? 'contain' : 'cover';
  const offset = isFiniteNumber(v.offset) ? v.offset : 0;
  return {
    assetUrl,
    duration: v.duration,
    offset,
    fit,
    countdown,
  };
}

function parseOverlay(value: unknown): StudioOverlay | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isFiniteNumber(v.startTime) || !isFiniteNumber(v.endTime) || v.endTime <= v.startTime) return null;

  const base = {
    id: typeof v.id === 'string' ? v.id : crypto.randomUUID(),
    startTime: Math.max(0, v.startTime),
    endTime: v.endTime,
    x: clamp(isFiniteNumber(v.x) ? v.x : 50, 0, 100),
    y: clamp(isFiniteNumber(v.y) ? v.y : 50, 0, 100),
    opacity: clamp(isFiniteNumber(v.opacity) ? v.opacity : 1, 0, 1),
  };

  // height/overlayFit opsiyonel: verilmezse eskisi gibi aspect-kilitli davranış korunur
  // (bkz. StudioImageOverlay.height yorumu) — split-screen/PiP İÇİN yeni, geriye uyumlu alan.
  const height = isFiniteNumber(v.height) ? clamp(v.height, 5, 100) : undefined;
  const overlayFit: StudioFit | undefined = height !== undefined ? (v.overlayFit === 'contain' ? 'contain' : 'cover') : undefined;

  if (v.kind === 'image') {
    if (!isHttpUrl(v.assetUrl)) return null;
    return {
      ...base,
      kind: 'image',
      assetUrl: v.assetUrl,
      width: clamp(isFiniteNumber(v.width) ? v.width : 30, 5, 100),
      ...(height !== undefined ? { height, overlayFit } : {}),
    };
  }

  if (v.kind === 'video') {
    if (!isHttpUrl(v.assetUrl)) return null;
    return {
      ...base,
      kind: 'video',
      assetUrl: v.assetUrl,
      width: clamp(isFiniteNumber(v.width) ? v.width : 30, 5, 100),
      ...(height !== undefined ? { height, overlayFit } : {}),
    };
  }

  if (v.kind === 'text') {
    if (typeof v.text !== 'string' || !v.text.trim()) return null;
    const font = OVERLAY_FONTS_SET.has(v.font as OverlayFont) ? (v.font as OverlayFont) : 'bricolage';
    const align = v.align === 'left' || v.align === 'right' ? v.align : 'center';
    return {
      ...base,
      kind: 'text',
      text: v.text.slice(0, MAX_OVERLAY_TEXT_LENGTH),
      fontSize: clamp(isFiniteNumber(v.fontSize) ? v.fontSize : 6, 1, 20),
      color: typeof v.color === 'string' ? v.color : '#FFFFFF',
      align,
      font,
    };
  }

  return null;
}

function parseMusic(value: unknown): StudioMusic | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isHttpUrl(v.assetUrl)) return null;
  return { assetUrl: v.assetUrl, volume: clamp(isFiniteNumber(v.volume) ? v.volume : 0.5, 0, 1) };
}

function parseCaption(value: unknown): StudioCaption | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.text !== 'string' || !v.text.trim()) return null;
  if (!isFiniteNumber(v.startTime) || !isFiniteNumber(v.endTime) || v.endTime <= v.startTime) return null;
  return {
    id: typeof v.id === 'string' ? v.id : crypto.randomUUID(),
    text: v.text.slice(0, MAX_OVERLAY_TEXT_LENGTH),
    startTime: Math.max(0, v.startTime),
    endTime: v.endTime,
  };
}

function isOverlayLocale(value: unknown): value is OverlayLocale {
  return typeof value === 'string' && (OVERLAY_LOCALES as string[]).includes(value);
}

/** `translatedCaptions` — her locale anahtarı altında `parseCaption` ile AYNI kurallarla
 *  doğrulanan bir dizi. Tanınmayan/bozuk bir locale anahtarı ya da boş dizi sessizce atlanır. */
function parseTranslatedCaptions(value: unknown): StudioTranslatedCaptions {
  if (typeof value !== 'object' || value === null) return {};
  const v = value as Record<string, unknown>;
  const result: StudioTranslatedCaptions = {};
  for (const locale of OVERLAY_LOCALES) {
    const raw = v[locale];
    if (!Array.isArray(raw)) continue;
    const captions = (raw.map(parseCaption).filter(Boolean) as StudioCaption[]).slice(0, MAX_CAPTIONS);
    if (captions.length > 0) result[locale] = captions;
  }
  return result;
}

function parseDub(value: unknown): StudioDub | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isOverlayLocale(v.locale)) return null;
  if (!isHttpUrl(v.sourceUrl) || !isHttpUrl(v.videoUrl)) return null;
  return {
    id: typeof v.id === 'string' ? v.id : crypto.randomUUID(),
    locale: v.locale,
    sourceUrl: v.sourceUrl,
    videoUrl: v.videoUrl,
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : new Date().toISOString(),
  };
}

function parseTransition(value: unknown): StudioTransition {
  if (typeof value !== 'object' || value === null) return DEFAULT_TRANSITION;
  const v = value as Record<string, unknown>;
  const kind: StudioTransition['kind'] =
    v.kind === 'crossfade' || v.kind === 'dip-to-black' ? v.kind : 'cut';
  return { kind, duration: clamp(isFiniteNumber(v.duration) ? v.duration : 0, 0, 5) };
}

function parseSequenceClip(value: unknown): StudioSequenceClip | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isHttpUrl(v.assetUrl)) return null;

  const id = typeof v.id === 'string' ? v.id : crypto.randomUUID();
  const clipId = typeof v.clipId === 'string' ? v.clipId : null;
  const fit: StudioFit = v.fit === 'contain' ? 'contain' : 'cover';
  const transitionIn = parseTransition(v.transitionIn);

  if (v.kind === 'image') {
    return {
      id,
      kind: 'image',
      assetUrl: v.assetUrl,
      clipId,
      sourceStart: 0,
      sourceEnd: 0,
      holdDuration: Math.max(0.1, isFiniteNumber(v.holdDuration) ? v.holdDuration : 3),
      fit,
      transitionIn,
    };
  }

  // kind: 'video' (varsayılan) — sourceEnd===0 SENTİNEL ("tam süre", bkz. tip yorumu) hariç,
  // sourceEnd <= sourceStart olan bir kayıt anlamsız, reddedilir.
  const sourceStart = Math.max(0, isFiniteNumber(v.sourceStart) ? v.sourceStart : 0);
  const sourceEnd = isFiniteNumber(v.sourceEnd) ? v.sourceEnd : 0;
  if (sourceEnd !== 0 && sourceEnd <= sourceStart) return null;

  return {
    id,
    kind: 'video',
    assetUrl: v.assetUrl,
    clipId,
    sourceStart,
    sourceEnd,
    holdDuration: 0,
    fit,
    transitionIn,
  };
}

function parseColorGrade(value: unknown): StudioColorGrade {
  if (typeof value !== 'object' || value === null) return DEFAULT_COLOR_GRADE;
  const v = value as Record<string, unknown>;
  return {
    brightness: clamp(isFiniteNumber(v.brightness) ? v.brightness : 0, -100, 100),
    contrast: clamp(isFiniteNumber(v.contrast) ? v.contrast : 0, -100, 100),
    saturation: clamp(isFiniteNumber(v.saturation) ? v.saturation : 0, -100, 100),
    temperature: clamp(isFiniteNumber(v.temperature) ? v.temperature : 0, -100, 100),
    grain: clamp(isFiniteNumber(v.grain) ? v.grain : 0, 0, 1),
    vignette: clamp(isFiniteNumber(v.vignette) ? v.vignette : 0, 0, 1),
  };
}

function parseSequenceLayout(value: unknown): StudioSequenceLayout | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isFiniteNumber(v.width) || !isFiniteNumber(v.height)) return null;
  if (!isFiniteNumber(v.startTime) || !isFiniteNumber(v.endTime) || v.endTime <= v.startTime) return null;
  return {
    id: typeof v.id === 'string' ? v.id : crypto.randomUUID(),
    startTime: Math.max(0, v.startTime),
    endTime: v.endTime,
    x: clamp(isFiniteNumber(v.x) ? v.x : 0, 0, 100),
    y: clamp(isFiniteNumber(v.y) ? v.y : 0, 0, 100),
    width: clamp(v.width, 5, 100),
    height: clamp(v.height, 5, 100),
    fit: v.fit === 'contain' ? 'contain' : 'cover',
  };
}

function parseCaptionStyle(value: unknown): StudioCaptionStyle {
  if (typeof value !== 'object' || value === null) return DEFAULT_CAPTION_STYLE;
  const v = value as Record<string, unknown>;
  const font = OVERLAY_FONTS_SET.has(v.font as OverlayFont) ? (v.font as OverlayFont) : DEFAULT_CAPTION_STYLE.font;
  return {
    x: clamp(isFiniteNumber(v.x) ? v.x : DEFAULT_CAPTION_STYLE.x, 0, 100),
    y: clamp(isFiniteNumber(v.y) ? v.y : DEFAULT_CAPTION_STYLE.y, 0, 100),
    fontSize: clamp(isFiniteNumber(v.fontSize) ? v.fontSize : DEFAULT_CAPTION_STYLE.fontSize, 1, 20),
    color: typeof v.color === 'string' ? v.color : DEFAULT_CAPTION_STYLE.color,
    font,
    speed: clamp(
      isFiniteNumber(v.speed) ? v.speed : DEFAULT_CAPTION_STYLE.speed,
      CAPTION_SPEED_RANGE.min,
      CAPTION_SPEED_RANGE.max,
    ),
    groupSize: Math.round(
      clamp(
        isFiniteNumber(v.groupSize) ? v.groupSize : DEFAULT_CAPTION_STYLE.groupSize,
        CAPTION_GROUP_SIZE_RANGE.min,
        CAPTION_GROUP_SIZE_RANGE.max,
      ),
    ),
  };
}

/** `parseStudioTimeline`'a eski (sequence'sız) bir proje için "tek elemanlı sekans nasıl
 *  sentezlenir" bilgisini verir — `StudioEditor` bunu kendi `motion: CharacterClip` prop'undan kurar. */
export type StudioTimelineFallback = { clipId: string; videoUrl: string };

/**
 * İstemciden gelen timeline'ı sunucuda doğrular — istemciye güvenilmiyor (plan kararı).
 * Geçersiz/eksik alanlar makul varsayılanlara düşer, tamamen anlamsız girdi `null` döner.
 *
 * `fallback` — GERİYE DÖNÜK UYUMLULUK: `sequence` alanı yoksa (eski proje, `sequence`
 * eklenmeden ÖNCE kaydedilmiş) ve `fallback` verildiyse, eski `trim` aralığı + harici video
 * kaynağından tek elemanlı bir sekans sentezlenir — eski projeler sessizce bozulmaz.
 * Sunucu tarafı (route.ts) `fallback` VERMEDEN çağırır (yalnızca doğrulama amaçlı, kaynak
 * video burada bilinmiyor); `StudioEditor` kendi `motion` prop'undan fallback'i geçirir.
 */
export function parseStudioTimeline(value: unknown, fallback?: StudioTimelineFallback): StudioTimeline | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;

  if (!isStudioAspectRatio(v.aspectRatio)) return null;

  const trimSource = typeof v.trim === 'object' && v.trim !== null ? (v.trim as Record<string, unknown>) : {};
  const start = isFiniteNumber(trimSource.start) ? Math.max(0, trimSource.start) : 0;
  const end = isFiniteNumber(trimSource.end) ? trimSource.end : 0;
  if (end !== 0 && end <= start) return null;

  const cutaways = Array.isArray(v.cutaways)
    ? (v.cutaways.map(parseCutaway).filter(Boolean) as StudioCutaway[]).slice(0, MAX_CUTAWAYS)
    : [];

  const overlays = Array.isArray(v.overlays)
    ? (v.overlays.map(parseOverlay).filter(Boolean) as StudioOverlay[]).slice(0, MAX_OVERLAYS)
    : [];

  const zooms = Array.isArray(v.zooms)
    ? (v.zooms.map(parseZoom).filter(Boolean) as StudioZoom[]).slice(0, MAX_ZOOMS)
    : [];

  // `resolveReframePoint` sıralı olduğunu VARSAYAR — tek doğrulama noktası burası, editördeki
  // ekleme akışı zaten kronolojik ekliyor ama bozuk/elle düzenlenmiş bir kayıt için savunmacı.
  const reframe = Array.isArray(v.reframe)
    ? (v.reframe.map(parseReframePoint).filter(Boolean) as StudioReframePoint[])
        .sort((a, b) => a.time - b.time)
        .slice(0, MAX_REFRAME_POINTS)
    : [];

  const sequenceLayouts = Array.isArray(v.sequenceLayouts)
    ? (v.sequenceLayouts.map(parseSequenceLayout).filter(Boolean) as StudioSequenceLayout[]).slice(0, MAX_SEQUENCE_LAYOUTS)
    : [];

  const captions = Array.isArray(v.captions)
    ? (v.captions.map(parseCaption).filter(Boolean) as StudioCaption[]).slice(0, MAX_CAPTIONS)
    : [];

  const translatedCaptions = parseTranslatedCaptions(v.translatedCaptions);

  const dubs = Array.isArray(v.dubs)
    ? (v.dubs.map(parseDub).filter(Boolean) as StudioDub[]).slice(0, MAX_DUBS)
    : [];

  let sequence = Array.isArray(v.sequence)
    ? (v.sequence.map(parseSequenceClip).filter(Boolean) as StudioSequenceClip[]).slice(0, MAX_SEQUENCE_CLIPS)
    : [];

  if (sequence.length === 0 && fallback) {
    sequence = [
      {
        id: crypto.randomUUID(),
        kind: 'video',
        assetUrl: fallback.videoUrl,
        clipId: fallback.clipId,
        sourceStart: start,
        sourceEnd: end, // 0 sentinel korunuyor — drawFrame/exportTimeline'daki "0 = video.duration" mantığıyla aynı
        holdDuration: 0,
        fit: 'cover',
        transitionIn: DEFAULT_TRANSITION,
      },
    ];
  }

  return {
    aspectRatio: v.aspectRatio,
    trim: { start, end },
    sequence,
    sequenceLayouts,
    cutaways,
    overlays,
    zooms,
    reframe,
    captions,
    captionStyle: parseCaptionStyle(v.captionStyle),
    translatedCaptions,
    intro: parseIntroOutro(v.intro),
    outro: parseIntroOutro(v.outro),
    music: v.music ? parseMusic(v.music) : null,
    videoVolume: clamp(isFiniteNumber(v.videoVolume) ? v.videoVolume : 1, 0, 1),
    enhancedAudioUrl: isHttpUrl(v.enhancedAudioUrl) ? v.enhancedAudioUrl : null,
    wordmark: v.wordmark !== false,
    grade: parseColorGrade(v.grade),
    dubs,
  };
}

/** `character_studio_projects` satırının uygulama tarafındaki karşılığı. */
export interface StudioProject {
  id: string;
  character_id: string;
  motion_id: string | null;
  name: string;
  timeline: StudioTimeline;
  output_url: string | null;
  /** Kapak/thumbnail karesi — export'un aksine tarayıcıda ayrıca bir "Bu kareyi kapak yap"
   *  eylemiyle üretilir (bkz. StudioEditor), otomatik değil. Eski projelerde yok (null). */
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}
