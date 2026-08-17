'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ChevronLeft, Check, Zap } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { CREDIT_PACKAGES } from '@/config/plans';
import '../landing.css';

// Faz 4.3: ödeme sağlayıcı Faz H.1'i bekliyor — bu sayfa gerçek checkout değil,
// yeni freemium modeli şeffaf biçimde anlatan ve /dashboard/billing'e yönlendiren geçiş.

const LogoSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="130 15 350 135" width="160" height="60" role="img" aria-labelledby="logoTitle">
    <title id="logoTitle">Talkinbio</title>
    <defs>
      <style>{`.word { font-family: 'Bricolage Grotesque', 'Arial Black', sans-serif; font-weight: 800; }`}</style>
    </defs>
    <text x="130" y="102" className="word" fontSize="64" fill="#14231F" letterSpacing="-1.5">talkinbio</text>
    <circle cx="152" cy="118" r="5.5" fill="#14231F"/>
    <circle cx="174" cy="118" r="5.5" fill="#14231F"/>
    <circle cx="196" cy="118" r="5.5" fill="#14231F"/>
  </svg>
);

const USE_CASES = [
  { emoji: '⚡', titleKey: 'use_interactive_title', descKey: 'use_interactive_desc', soon: false },
  { emoji: '🎨', titleKey: 'use_media_title',        descKey: 'use_media_desc',        soon: false },
  { emoji: '💬', titleKey: 'use_assistant_title',    descKey: 'use_assistant_desc',    soon: true  },
] as const;

export default function PricingPage() {
  const t = useTranslations('Pricing');
  const tNav = useTranslations('Landing.nav');
  const locale = useLocale() as 'tr' | 'en' | 'ru';

  const formatN = (n: number) =>
    n.toLocaleString(locale === 'tr' ? 'tr-TR' : locale === 'ru' ? 'ru-RU' : 'en-US');

  const handleCta = async (planId: string) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      window.location.href = `/dashboard/billing?plan=${planId}`;
    } else {
      window.location.href = `/register?next=/dashboard/billing?plan=${planId}`;
    }
  };

  const badges = [t('badge_1'), t('badge_2'), t('badge_3'), t('badge_4')];

  const freeItems  = [t('free_1'), t('free_2'), t('free_3'), t('free_4'), t('free_5'), t('free_6')];
  const creditItems = [t('credit_1'), t('credit_2'), t('credit_3'), t('credit_4'), t('credit_5'), t('credit_6')];

  return (
    <div id="landing-page" style={{ background: 'var(--paper)', minHeight: '100vh' }}>
      <header>
        <div className="wrap nav">
          <Link href="/"><LogoSVG /></Link>
          <div className="links" style={{ display: 'none' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link href="/login" className="btn btn-primary nav-cta" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
              {tNav('login')}
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '5rem 1.5rem 8rem' }}>

        {/* Geri bağlantısı */}
        <Link
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink-soft)',
            textDecoration: 'none', marginBottom: '3rem',
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          <ChevronLeft size={14} /> talkinbio.com
        </Link>

        {/* ——— HERO ——— */}
        <section style={{ marginBottom: '3.5rem' }}>
          <p style={{
            fontFamily: 'var(--font-ibm-plex-mono)',
            fontSize: '0.72rem', color: 'var(--teal)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: '1rem',
          }}>
            {t('eyebrow')}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-bricolage)', fontWeight: 800,
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            lineHeight: 1.1, letterSpacing: '-0.02em',
            color: 'var(--ink)', marginBottom: '1.25rem',
          }}>
            {t('title')}
          </h1>
          <p style={{
            fontFamily: 'var(--font-inter)', fontSize: '1.05rem',
            lineHeight: 1.7, color: 'var(--ink-soft)', maxWidth: '620px',
            borderLeft: '3px solid var(--coral)', paddingLeft: '1.25rem',
          }}>
            {t('intro')}
          </p>
          {/* Rozetler */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1.75rem' }}>
            {badges.map((badge, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.35rem 0.9rem',
                border: '1px solid rgba(20,35,31,0.12)',
                borderRadius: '100px', background: '#fff',
                fontFamily: 'var(--font-ibm-plex-mono)',
                fontSize: '0.75rem', fontWeight: 600,
                color: 'var(--ink-soft)', letterSpacing: '0.01em',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--teal-deep)', flexShrink: 0,
                }} />
                {badge}
              </span>
            ))}
          </div>
        </section>

        {/* ——— ÜCRETSİZ BAŞLANGIÇ KARTI ——— */}
        <section style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'space-between', gap: '1.5rem',
          background: 'var(--teal-tint)',
          border: '1px solid rgba(43,111,92,0.18)',
          borderRadius: '20px', padding: '2rem 2.5rem',
          marginBottom: '4rem',
        }}>
          <div style={{ flex: '1 1 340px' }}>
            <h2 style={{
              fontFamily: 'var(--font-bricolage)', fontWeight: 800,
              fontSize: '1.25rem', color: 'var(--ink)', margin: '0 0 0.6rem',
            }}>
              {t('freeStartTitle')}
            </h2>
            <p style={{
              fontFamily: 'var(--font-inter)', fontSize: '0.95rem',
              lineHeight: 1.65, color: 'var(--ink-soft)', margin: '0 0 1rem', maxWidth: '480px',
            }}>
              {t('freeStartDesc')}
            </p>
            <p style={{
              fontFamily: 'var(--font-inter)', fontSize: '0.82rem',
              lineHeight: 1.6, color: 'var(--ink-soft)', margin: 0,
            }}>
              <strong style={{ color: 'var(--ink)' }}>{t('freeStartPauseLabel')}</strong>{' '}
              {t('freeStartPauseInfo')}
            </p>
          </div>
          <button
            onClick={() => handleCta('free')}
            className="btn btn-primary"
            style={{
              borderRadius: '100px', padding: '0.85rem 1.75rem',
              fontWeight: 700, fontSize: '0.95rem',
              border: 'none', cursor: 'pointer', flexShrink: 0,
            }}
          >
            {t('freeCtaButton')}
          </button>
        </section>

        {/* ——— KREDİ PAKETLERİ ——— */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-bricolage)', fontWeight: 800,
            fontSize: '1.5rem', color: 'var(--ink)', margin: '0 0 0.4rem',
          }}>
            {t('packagesTitle')}
          </h2>
          <p style={{
            fontFamily: 'var(--font-inter)', fontSize: '0.9rem',
            color: 'var(--ink-soft)', margin: '0 0 1.5rem',
          }}>
            {t('packageUsageDesc')}
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '1rem',
          }}>
            {CREDIT_PACKAGES.map((pkg) => (
              <div key={pkg.id} style={{
                background: '#fff',
                border: '1px solid rgba(20,35,31,0.10)',
                borderRadius: '20px', padding: '1.75rem 1.5rem',
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}>
                {/* Kredi miktarı — büyük numara */}
                <div>
                  <span style={{
                    fontFamily: 'var(--font-bricolage)', fontWeight: 800,
                    fontSize: '2.2rem', color: 'var(--ink)', lineHeight: 1,
                  }}>
                    {formatN(pkg.credits)}
                  </span>
                  <span style={{
                    display: 'block',
                    fontFamily: 'var(--font-ibm-plex-mono)', fontSize: '0.72rem',
                    color: 'var(--teal)', fontWeight: 700,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    marginTop: '0.2rem',
                  }}>
                    {t('creditsUnit')}
                  </span>
                </div>

                {/* Fiyat */}
                <p style={{
                  fontFamily: 'var(--font-bricolage)', fontWeight: 800,
                  fontSize: '1.4rem', color: 'var(--ink)', margin: 0,
                }}>
                  ${pkg.price}
                </p>

                {/* Açıklama */}
                <p style={{
                  fontFamily: 'var(--font-inter)', fontSize: '0.83rem',
                  color: 'var(--ink-soft)', lineHeight: 1.5,
                  margin: '0 0 auto',
                }}>
                  {t(`desc_${pkg.id}` as any)}
                </p>

                <button
                  onClick={() => handleCta(pkg.id)}
                  className="btn btn-outline"
                  style={{
                    marginTop: '0.75rem', borderRadius: '100px',
                    padding: '0.65rem 1rem', fontWeight: 700,
                    fontSize: '0.85rem', cursor: 'pointer',
                  }}
                >
                  {t('ctaButton')}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ——— KREDİNİ NEREDE KULLANIRSIN? ——— */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-bricolage)', fontWeight: 800,
            fontSize: '1.5rem', color: 'var(--ink)', margin: '0 0 1.25rem',
          }}>
            {t('whereTitle')}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}>
            {USE_CASES.map((uc) => (
              <div key={uc.titleKey} style={{
                background: '#fff',
                border: '1px solid rgba(20,35,31,0.10)',
                borderRadius: '16px', padding: '1.5rem',
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}>
                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{uc.emoji}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{
                    fontFamily: 'var(--font-bricolage)', fontWeight: 800,
                    fontSize: '1rem', color: 'var(--ink)', margin: 0,
                  }}>
                    {t(uc.titleKey)}
                  </h3>
                  {uc.soon && (
                    <span style={{
                      padding: '0.15rem 0.55rem',
                      background: 'var(--coral-tint)',
                      border: '1px solid rgba(255,106,92,0.25)',
                      borderRadius: '100px',
                      fontFamily: 'var(--font-ibm-plex-mono)',
                      fontSize: '0.65rem', fontWeight: 700,
                      color: 'var(--coral)', letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}>
                      {t('use_assistant_soon')}
                    </span>
                  )}
                </div>
                <p style={{
                  fontFamily: 'var(--font-inter)', fontSize: '0.88rem',
                  lineHeight: 1.6, color: 'var(--ink-soft)', margin: 0,
                }}>
                  {t(uc.descKey)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ——— HER ZAMAN ÜCRETSİZ / KREDİ KULLANANLAR ——— */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {/* Ücretsiz sütunu */}
          <div style={{
            background: '#fff',
            border: '1px solid rgba(20,35,31,0.10)',
            borderRadius: '20px', padding: '1.75rem',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-bricolage)', fontWeight: 800,
              fontSize: '1.1rem', color: 'var(--ink)', margin: '0 0 1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--teal-tint)',
                border: '1.5px solid rgba(43,111,92,0.25)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Check size={12} color="var(--teal-deep)" strokeWidth={2.5} />
              </span>
              {t('freeTableTitle')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {freeItems.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                  paddingBottom: '0.6rem',
                  borderBottom: i < freeItems.length - 1 ? '1px solid rgba(20,35,31,0.06)' : 'none',
                }}>
                  <Check size={14} color="var(--teal-deep)" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.5 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Kredi kullananlar sütunu */}
          <div style={{
            background: '#fff',
            border: '1px solid rgba(20,35,31,0.10)',
            borderRadius: '20px', padding: '1.75rem',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-bricolage)', fontWeight: 800,
              fontSize: '1.1rem', color: 'var(--ink)', margin: '0 0 1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--coral-tint)',
                border: '1.5px solid rgba(255,106,92,0.25)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Zap size={11} color="var(--coral)" strokeWidth={2.5} />
              </span>
              {t('creditTableTitle')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {creditItems.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                  paddingBottom: '0.6rem',
                  borderBottom: i < creditItems.length - 1 ? '1px solid rgba(20,35,31,0.06)' : 'none',
                }}>
                  <Zap size={13} color="var(--coral)" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.5 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer style={{ borderTop: '1px solid rgba(20,35,31,0.10)', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-ibm-plex-mono)',
          fontSize: '0.75rem', color: 'var(--muted)', letterSpacing: '0.04em',
        }}>
          © {new Date().getFullYear()} talkinbio · {t('footerNote')}
        </p>
      </footer>
    </div>
  );
}
