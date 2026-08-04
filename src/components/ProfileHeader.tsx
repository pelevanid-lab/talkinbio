'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Tag, X, Check, AlertCircle, MessageSquare, Phone, Mail, ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Theme, resolveThemeColors } from '@/config/archetypes';
import { iconForLinkUrl } from '@/utils/linkIcon';
import { renderColoredSegments } from '@/utils/coloredText';
import type { Shortcut } from '@/utils/shortcuts';
import { SauleIcon } from './AgentIcons';
import { useOptionalPublicPageRuntime } from './PublicPageRuntime';

function Typewriter({ text, speed = 15 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{displayedText}</span>;
}

// Linktree-style profil başlığı: hem canlı sayfada (ProfilePageBody) hem editör önizlemesinde
// (EditorClient mockup) kullanılan tek bileşen — böylece ikisi birebir aynı görünür.
export default function ProfileHeader({
  avatarUrl,
  name,
  description,
  theme,
  activeBlockId,
  onBack,
  topLeft,
  topRight,
  shortcuts,
  onShortcutSelect,
  minimal = false,
}: {
  avatarUrl?: string;
  name: string;
  description?: string;
  theme: Theme;
  activeBlockId?: string | null;
  onBack?: () => void;
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
  shortcuts?: Shortcut[];
  onShortcutSelect?: (blockId: string) => void;
  minimal?: boolean;
}) {
  const c = resolveThemeColors(theme);
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  const pageRuntime = useOptionalPublicPageRuntime();
  const sauleActive = pageRuntime?.sauleActive ?? false;
  const sauleText = pageRuntime?.sauleText ?? '';
  const sauleQuestion = pageRuntime?.sauleQuestion ?? '';
  const sauleSuggestions = pageRuntime?.sauleSuggestions ?? [];
  const sauleMatchedBlock = pageRuntime?.sauleMatchedBlock ?? null;
  const sauleState = pageRuntime?.sauleState ?? 'idle';
  const glitchTrigger = pageRuntime?.glitchTrigger ?? 0;

  const params = useParams();
  const activeLocale = (params?.locale as 'tr' | 'en' | 'ru') || 'tr';

  const handleResetToGreeting = () => {
    if (pageRuntime) {
      pageRuntime.setSauleQuestion('');
      pageRuntime.setQueryTrigger(null);
      pageRuntime.setSauleSuggestions([]);
      pageRuntime.setSauleMatchedBlock(null);
      const greetingText = pageRuntime.customGreeting?.[activeLocale] || pageRuntime.customGreeting?.tr || 'Hoşgeldiniz, size nasıl yardımcı olabilirim?';
      pageRuntime.setSauleText(greetingText);
      pageRuntime.setSauleState('idle');
      pageRuntime.triggerGlitch();
    }
  };

  const [isGlitching, setIsGlitching] = useState(false);
  useEffect(() => {
    if (glitchTrigger > 0) {
      setIsGlitching(true);
      const t = setTimeout(() => setIsGlitching(false), 450);
      return () => clearTimeout(t);
    }
  }, [glitchTrigger]);

  const [leadName, setLeadName] = useState('');
  const [leadContact, setLeadContact] = useState('');
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState('');

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadContact.trim() || leadSubmitting) return;
    setLeadSubmitting(true);
    setLeadError('');
    try {
      const res = await fetch('/api/leads/direct-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: pageRuntime?.businessId || '',
          name: leadName.trim(),
          contact: leadContact.trim(),
          message: 'Saule Bubble Lead Form'
        }),
      });
      if (!res.ok) throw new Error();
      setLeadSubmitted(true);
    } catch {
      setLeadError('Bir hata oluştu, lütfen daha sonra tekrar deneyin.');
    } finally {
      setLeadSubmitting(false);
    }
  };

  // Minimal: web sitesi görünümü veya açık blok detayı. Sadece kompakt bir üst şerit.
  if (minimal) {
    return (
      <div className="w-full flex items-center justify-between min-h-[32px] relative" style={{ color: c.text }}>
        <div className="flex items-center gap-2 z-10">
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
          {!activeBlockId && topLeft}
        </div>

        {/* Centered Name */}
        <div 
          className="absolute inset-x-0 mx-auto text-center px-12 truncate pointer-events-none font-semibold text-sm select-none"
          style={{ fontFamily: `"${theme.headingFont}", sans-serif` }}
        >
          {renderColoredSegments(name)}
        </div>

        <div className="z-10">
          {topRight}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Tek yatay bant: sol = talkinbio wordmark · orta = avatar / Saule bubble · sağ = topRight */}
      <div className="flex flex-col items-center text-center">
        <div className="relative w-full flex justify-center min-h-[144px]">
          {/* Sol slot — avatar üst kenarına hizalı */}
          <div className="absolute left-0 top-0 flex items-center gap-2" style={{ color: c.text, zIndex: 30 }}>
            {topLeft}
            {!topLeft && (
              <a
                href="https://talkinbio.com/?utm_source=widget&utm_medium=profile_logo&utm_campaign=attribution"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold tracking-tight hover:opacity-100 transition"
                style={{ color: c.textMuted, opacity: 0.5, fontFamily: `"${theme.headingFont}", sans-serif` }}
              >
                talkinbio
              </a>
            )}
          </div>

          {/* Morphing Avatar / Saule Speech Bubble Container */}
          <AnimatePresence mode="wait">
            {!sauleActive ? (
              <motion.div
                key="avatar"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className={`w-36 h-36 rounded-full overflow-hidden flex items-center justify-center shrink-0 border ${isGlitching ? 'holo-glitch-active' : ''}`}
                style={{ backgroundColor: c.surface, borderColor: c.border }}
              >
                {/* Holographic / digital glitch effect styling */}
                <style>{`
                  @keyframes holo-glitch {
                    0% { transform: translate(0) skew(0deg); filter: hue-rotate(0deg) saturate(1.2); }
                    15% { transform: translate(-2px, 1px) skew(-3deg); filter: hue-rotate(45deg) contrast(1.2); }
                    30% { transform: translate(1px, -1px) skew(1deg); filter: hue-rotate(90deg) saturate(1.5); }
                    45% { transform: translate(-1px, 2px) skew(-1deg); filter: none; }
                    60% { transform: translate(2px, -2px) skew(2deg); filter: hue-rotate(-45deg); }
                    75% { transform: translate(0) skew(0deg); filter: none; }
                  }
                  .holo-glitch-active {
                    animation: holo-glitch 0.4s ease-in-out;
                    position: relative;
                  }
                  .holo-glitch-active::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: repeating-linear-gradient(0deg, rgba(56, 249, 215, 0.12), rgba(56, 249, 215, 0.12) 1px, transparent 1px, transparent 3px);
                    pointer-events: none;
                    z-index: 10;
                    border-radius: inherit;
                  }
                `}</style>
                {name.toLowerCase().includes('talkinbio') ? (
                  <SauleIcon size={144} className="w-full h-full" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span
                    className="text-5xl font-semibold"
                    style={{ color: c.textMuted, fontFamily: `"${theme.headingFont}", sans-serif` }}
                  >
                    {initial}
                  </span>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="saule-bubble"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`w-full max-w-sm py-5 px-4 relative flex flex-col items-center justify-center text-center min-h-[144px] ${isGlitching ? 'holo-glitch-active' : ''}`}
              >
                {sauleQuestion && (
                  <button
                    type="button"
                    onClick={handleResetToGreeting}
                    className="absolute left-3 top-3 p-1.5 rounded-full hover:bg-[rgba(20,35,31,0.05)] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors z-20"
                    aria-label="Geri Dön"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}

                {/* Style for technological scanlines and chromatic aberration glitch */}
                <style>{`
                  @keyframes holo-glitch {
                    0% { transform: translate(0) skew(0deg); filter: hue-rotate(0deg) saturate(1.1); }
                    15% { transform: translate(-2px, 1px) skew(-2deg); filter: hue-rotate(15deg) contrast(1.1); }
                    30% { transform: translate(1px, -1px) skew(1deg); filter: hue-rotate(30deg) saturate(1.3); }
                    45% { transform: translate(-1px, 1px) skew(-1deg); filter: none; }
                    60% { transform: translate(2px, -1px) skew(1deg); filter: hue-rotate(-15deg); }
                    75% { transform: translate(0) skew(0deg); filter: none; }
                  }
                  .holo-glitch-active {
                    animation: holo-glitch 0.4s ease-in-out;
                    position: relative;
                  }
                  .holo-glitch-active::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: repeating-linear-gradient(0deg, rgba(56, 249, 215, 0.06), rgba(56, 249, 215, 0.06) 1px, transparent 1px, transparent 3px);
                    pointer-events: none;
                    z-index: 10;
                    border-radius: inherit;
                  }
                `}</style>

                {/* Sub-form and Response Renderers */}
                {sauleState === 'lead_form' && !leadSubmitted ? (
                  <form onSubmit={handleLeadSubmit} className="flex flex-col gap-2.5 w-full max-w-xs items-center">
                    <p className="text-sm text-[var(--ink-soft)] leading-relaxed font-semibold"><Typewriter text={sauleText} /></p>
                    <div className="w-full">
                      <input
                        type="text"
                        placeholder="Adınız"
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 rounded-lg border border-[rgba(20,35,31,0.10)] text-xs bg-white focus:ring-1 focus:ring-[var(--coral)] focus:outline-none text-[var(--ink)]"
                      />
                    </div>
                    <div className="w-full">
                      <input
                        type="text"
                        placeholder="Telefon veya E-posta"
                        value={leadContact}
                        onChange={(e) => setLeadContact(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 rounded-lg border border-[rgba(20,35,31,0.10)] text-xs bg-white focus:ring-1 focus:ring-[var(--coral)] focus:outline-none text-[var(--ink)]"
                      />
                    </div>
                    {leadError && (
                      <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {leadError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={leadSubmitting}
                      className="w-full py-1.5 rounded-full bg-[#FF6A5C] text-white text-xs font-semibold hover:opacity-95 transition-opacity flex items-center justify-center gap-1 shadow-sm"
                    >
                      {leadSubmitting ? 'Gönderiliyor...' : 'Bilgilerimi İlet'}
                    </button>
                  </form>
                ) : leadSubmitted ? (
                  <div className="flex flex-col items-center text-center gap-1.5 py-2">
                    <div className="w-8 h-8 rounded-full bg-[#FFEDE9] border border-[#FF6A5C] flex items-center justify-center text-[#FF6A5C]">
                      <Check className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--ink)]">Talebiniz Alındı!</p>
                    <p className="text-xs text-[var(--ink-soft)] leading-normal font-medium">
                      Size en kısa sürede geri dönüş sağlayacağız. Teşekkürler!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 items-center justify-center w-full">
                    {sauleQuestion && (
                      <div className="flex flex-col items-center gap-1 mb-1 select-none">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--teal)] font-bold">
                          Sorunuz
                        </span>
                        <div className="px-4 py-1.5 bg-[#FFEDE9] text-[#FF6A5C] text-xs font-semibold rounded-full border border-[#FF6A5C]/20 shadow-sm max-w-xs text-center leading-normal">
                          “{sauleQuestion}”
                        </div>
                      </div>
                    )}
                    {sauleState === 'loading' ? (
                      <div className="flex flex-col items-center justify-center py-6 w-full select-none">
                        <div className="w-[84px] h-[84px] bg-[#F4F2ED] rounded-[24px] border border-[rgba(20,35,31,0.06)] flex items-center justify-center gap-2 shadow-sm">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#14231F] animate-[sauleDotBounce_1.4s_infinite_0s_ease-in-out]"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-[#14231F] animate-[sauleDotBounce_1.4s_infinite_0.2s_ease-in-out]"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-[#14231F] animate-[sauleDotBounce_1.4s_infinite_0.4s_ease-in-out]"></span>
                        </div>
                        <style>{`
                          @keyframes sauleDotBounce {
                            0%, 80%, 100% { transform: scale(0.6); opacity: 0.35; }
                            40% { transform: scale(1.1); opacity: 1; }
                          }
                        `}</style>
                      </div>
                    ) : (
                      <div className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-line font-bold text-center max-w-sm">
                        <Typewriter text={sauleText} />
                      </div>
                    )}

                    {/* Suggested Questions Buttons */}
                    {sauleSuggestions.length > 0 && (
                      <div className="mt-3 w-full max-w-xs select-none">
                        <div className="text-[9px] font-mono uppercase tracking-wider text-[var(--ink-soft)] font-bold mb-2">
                          İlgili diğer sorular
                        </div>
                        <div className="flex flex-col gap-1.5 w-full">
                          {sauleSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => pageRuntime?.setQueryTrigger({ query: suggestion })}
                              className="w-full text-center px-4 py-2 bg-[#F4F2ED] hover:bg-[#FFEDE9] text-[var(--ink)] hover:text-[#FF6A5C] text-xs font-semibold rounded-full border border-transparent hover:border-[#FF6A5C]/20 transition-all leading-normal"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contact CTA buttons for no-match deterministic replies */}
                    {sauleState === 'response' && pageRuntime?.contactValue && (
                      <div className="mt-1 flex justify-center">
                        {pageRuntime.contactMethod === 'whatsapp' ? (
                          <a
                            href={`https://wa.me/${pageRuntime.contactValue.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-xs font-semibold shadow-sm transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-white" /> WhatsApp ile Sor
                          </a>
                        ) : pageRuntime.contactMethod === 'phone' ? (
                          <a
                            href={`tel:${pageRuntime.contactValue}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF6A5C] hover:opacity-95 text-white rounded-full text-xs font-semibold shadow-sm transition"
                          >
                            <Phone className="w-3.5 h-3.5 fill-white" /> Hemen Ara
                          </a>
                        ) : (
                          <a
                            href={`mailto:${pageRuntime.contactValue}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2B6F5C] hover:opacity-95 text-white rounded-full text-xs font-semibold shadow-sm transition"
                          >
                            <Mail className="w-3.5 h-3.5" /> E-posta Gönder
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sağ slot — avatar üst kenarına hizalı */}
          <div className="absolute right-0 top-0 flex items-center" style={{ color: c.text, zIndex: 30 }}>
            {topRight}
          </div>
        </div>

        <h1
          className="mt-3 text-xl font-bold leading-tight"
          style={{ color: c.text, fontFamily: `"${theme.headingFont}", sans-serif` }}
        >
          {renderColoredSegments(name)}
        </h1>

        {description && (
          <p
            className="mt-1 text-xs leading-snug line-clamp-2 max-w-[46ch]"
            style={{ color: c.textMuted }}
          >
            {renderColoredSegments(description)}
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
