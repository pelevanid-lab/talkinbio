'use client';

import { ChevronLeft, Tag } from 'lucide-react';
import { Theme, resolveThemeColors } from '@/config/archetypes';
import { iconForLinkUrl } from '@/utils/linkIcon';
import type { Shortcut } from '@/utils/shortcuts';

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
  shortcuts,
  onShortcutSelect,
}: {
  avatarUrl?: string;
  name: string;
  description?: string;
  theme: Theme;
  activeBlockId?: string | null;
  onBack?: () => void;
  topRight?: React.ReactNode;
  // Başlık altındaki kısayol butonları (maks 4). Link → URL açar; Hizmet → onShortcutSelect(blockId)
  // ile ilgili bölümü açar (linktree kartı). resolveShortcuts ile hazırlanıp geçilir.
  shortcuts?: Shortcut[];
  onShortcutSelect?: (blockId: string) => void;
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

        {shortcuts && shortcuts.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {shortcuts.slice(0, 4).map((s, idx) => {
              const Icon = s.kind === 'link' ? iconForLinkUrl(s.url) : Tag;
              const inner = (
                <>
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: c.primary }} />
                  <span className="truncate max-w-[9rem]">{s.label}</span>
                </>
              );
              const className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition hover:scale-[1.03]';
              const style = { backgroundColor: c.surface, borderColor: c.border, color: c.text };
              return s.kind === 'link' ? (
                <a key={idx} href={s.url} target="_blank" rel="noreferrer" className={className} style={style}>
                  {inner}
                </a>
              ) : (
                <button key={idx} type="button" onClick={() => onShortcutSelect?.(s.blockId)} className={className} style={style}>
                  {inner}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
