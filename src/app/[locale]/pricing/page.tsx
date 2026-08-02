'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { SAULE_CREDIT_COST, SAULE_STUDIO_UPDATE_CREDIT_COST, CREDIT_COST_MENU } from '@/agents/shared/credits';
import { PLANS, EXTRA_PACK } from '@/config/plans';
import '../landing.css';

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

// Faz 4.3: ödeme sağlayıcı Faz H.1'i bekliyor — bu sayfa gerçek checkout değil,
// roadmap'in kredi tablosunu şeffaf gösteren + "bize ulaşın" formuna yönlendiren
// geçici bir çözüm. Kapasite örnekleri credits.ts'teki gerçek sabitlerden hesaplanır.
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.85rem 1rem',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
  fontFamily: 'var(--font-inter)',
  fontSize: '0.95rem',
  outline: 'none',
};

export default function PricingPage() {
  const t = useTranslations('Pricing');
  const tNav = useTranslations('Landing.nav');
  const locale = useLocale() as 'tr' | 'en' | 'ru';

  const [selectedPlan, setSelectedPlan] = useState<string>('');

  const handlePlanCta = async (planId: string) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      window.location.href = `/dashboard/billing?plan=${planId}`;
    } else {
      window.location.href = `/register?next=/dashboard/billing?plan=${planId}`;
    }
  };

  return (
    <div id="landing-page" style={{ background: 'var(--paper)', minHeight: '100vh' }}>
      <header>
        <div className="wrap nav">
          <Link href="/">
            <LogoSVG />
          </Link>
          <div className="links" style={{ display: 'none' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <LanguageSwitcher />
            <Link href="/login" className="btn btn-primary nav-cta" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
              {tNav('login')}
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '5rem 1.5rem 8rem' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.85rem',
            fontWeight: 500,
            color: 'var(--ink-soft)',
            textDecoration: 'none',
            marginBottom: '3rem',
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          <ChevronLeft size={14} /> talkinbio.com
        </Link>

        <div style={{ marginBottom: '3.5rem' }}>
          <p style={{
            fontFamily: 'var(--font-ibm-plex-mono)',
            fontSize: '0.75rem',
            color: 'var(--teal)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}>
            {t('eyebrow')}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-bricolage)',
            fontWeight: 800,
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            marginBottom: '1.5rem',
          }}>
            {t('title')}
          </h1>
          <p style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '1.1rem',
            lineHeight: 1.7,
            color: 'var(--ink-soft)',
            maxWidth: '620px',
            borderLeft: '3px solid var(--coral)',
            paddingLeft: '1.25rem',
          }}>
            {t('intro')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {PLANS.map((plan) => {
            const sauleChats = Math.floor(plan.credits / SAULE_CREDIT_COST);
            const studioUpdates = Math.floor(plan.credits / SAULE_STUDIO_UPDATE_CREDIT_COST);
            return (
              <div key={plan.id} style={{
                border: '1px solid rgba(20,35,31,0.10)',
                borderRadius: '20px',
                padding: '2rem',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}>
                <h2 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--ink)', margin: 0 }}>
                  {t(`plan_${plan.id}` as any)}
                </h2>
                <p style={{ margin: 0 }}>
                  <span style={{ fontFamily: 'var(--font-bricolage)', fontSize: '2rem', fontWeight: 800, color: 'var(--ink)' }}>${plan.price}</span>
                </p>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--teal)', fontSize: '0.95rem' }}>{t('credits', { count: plan.credits })}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink-soft)', lineHeight: 1.5, minHeight: '2.5rem' }}>
                  {t('capacityExample', { saule: sauleChats, studio: studioUpdates })}
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink-soft)', lineHeight: 1.5, fontWeight: 500 }}>
                  {t(`idealFor_${plan.id}` as any)}
                </p>
                <button
                  onClick={() => handlePlanCta(plan.id)}
                  className="btn btn-primary"
                  style={{ marginTop: 'auto', borderRadius: '100px', padding: '0.75rem 1.2rem', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}
                >
                  {plan.id === 'free' ? t('freeCtaButton') : t('ctaButton')}
                </button>
              </div>
            );
          })}

          <div style={{
            border: '1px dashed rgba(20,35,31,0.25)',
            borderRadius: '20px',
            padding: '2rem',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            <h2 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--ink)', margin: 0 }}>
              {t('extraPackName')}
            </h2>
            <p style={{ margin: 0 }}>
              <span style={{ fontFamily: 'var(--font-bricolage)', fontSize: '2rem', fontWeight: 800, color: 'var(--ink)' }}>${EXTRA_PACK.price}</span>
            </p>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--teal)', fontSize: '0.95rem' }}>{t('credits', { count: EXTRA_PACK.credits })}</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              {t('extraPackNote')}
            </p>
          </div>
        </div>

        <section style={{
          marginTop: '2rem',
          border: '1px solid rgba(20,35,31,0.10)',
          borderRadius: '20px',
          padding: '1.5rem',
          background: '#fff',
        }}>
          <h2 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--ink)', margin: '0 0 0.4rem' }}>
            {t('operationCostsTitle')}
          </h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            {t('operationCostsSubtitle')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {CREDIT_COST_MENU.map((item) => (
              <div key={item.id} style={{
                border: '1px solid rgba(20,35,31,0.08)',
                borderRadius: '14px',
                padding: '0.85rem 1rem',
                background: '#FBFAF7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--ink)', fontWeight: 600 }}>{item.label[locale] || item.label.tr}</span>
                <span style={{ fontSize: '0.88rem', color: 'var(--teal)', fontWeight: 800, whiteSpace: 'nowrap' }}>{t('credits', { count: item.credits })}</span>
              </div>
            ))}
          </div>
        </section>


      </main>

      <footer style={{ borderTop: '1px solid rgba(20,35,31,0.10)', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-ibm-plex-mono)',
          fontSize: '0.75rem',
          color: 'var(--muted)',
          letterSpacing: '0.04em',
        }}>
          © {new Date().getFullYear()} talkinbio · {t('footerNote')}
        </p>
      </footer>
    </div>
  );
}
