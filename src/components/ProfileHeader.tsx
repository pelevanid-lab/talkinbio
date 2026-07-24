'use client';

import { ChevronLeft } from 'lucide-react';
import { Theme, resolveThemeColors } from '@/config/archetypes';

// Linktree-style profil başlığı: hem canlı sayfada (ProfilePageBody) hem editör önizlemesinde
// (EditorClient mockup) kullanılan tek bileşen — böylece ikisi birebir aynı görünür.
//
// - Avatar ayrı yüklenmez; "Hakkında" bloğunun fotosundan türetilir (avatarFromBlocks) ve
//   avatarUrl olarak geçilir. Yoksa ismin baş harfiyle placeholder gösterilir.
// - Renkler resolveThemeColors(theme) ile çözülür; koyu modda tüm başlık koyu zemine uyar.
// - topRight slotu: canlı sayfada kompakt LanguageSwitcher, editörde locale rozeti.
// - Üst şeritte tekrar eden sayfa başlığı metni YOK (isim ortadaki başlıkta) — dikey alandan
//   tasarruf için. Geri butonu yalnızca bir linktree kartı açıkken görünür.
export default function ProfileHeader({
  avatarUrl,
  name,
  description,
  theme,
  activeBlockId,
  onBack,
  topRight,
}: {
  avatarUrl?: string;
  name: string;
  description?: string;
  theme: Theme;
  activeBlockId?: string | null;
  onBack?: () => void;
  topRight?: React.ReactNode;
}) {
  const c = resolveThemeColors(theme);
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="w-full">
      {/* Kompakt üst şerit: geri butonu (kart açıkken) + topRight (dil/rozet) */}
      <div className="flex items-center justify-between min-h-[28px] mb-3" style={{ color: c.text }}>
        <div className="flex items-center">
          {activeBlockId && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1 -ml-1 shrink-0 hover:opacity-70 transition"
              style={{ color: c.text }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>
        {topRight}
      </div>

      {/* Profil: avatar + isim + kısa açıklama (ortalı) */}
      <div className="flex flex-col items-center text-center">
        <div
          className="w-[76px] h-[76px] rounded-full overflow-hidden flex items-center justify-center shrink-0 border"
          style={{ backgroundColor: c.surface, borderColor: c.border }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span
              className="text-2xl font-semibold"
              style={{ color: c.textMuted, fontFamily: `"${theme.headingFont}", sans-serif` }}
            >
              {initial}
            </span>
          )}
        </div>

        <h1
          className="mt-3 text-lg font-bold leading-tight"
          style={{ color: c.text, fontFamily: `"${theme.headingFont}", sans-serif` }}
        >
          {name}
        </h1>

        {description && (
          <p
            className="mt-1 text-xs leading-snug line-clamp-2 max-w-[46ch]"
            style={{ color: c.textMuted }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
