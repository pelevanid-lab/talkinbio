'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ChevronLeft } from 'lucide-react';
import { SAULE_CREDIT_COST, BEIWE_UPDATE_CREDIT_COST } from '@/agents/shared/credits';
import '../landing.css';

const LogoSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160" width="180" height="45" role="img" aria-label="talkinbio">
    <defs>
      <style>{`.word { font-family: 'Bricolage Grotesque', 'Arial Black', sans-serif; font-weight: 800; }`}</style>
    </defs>
    <g transform="translate(4,26)">
      <rect x="0" y="0" width="108" height="108" rx="26" fill="#14231F"/>
      <rect x="14" y="60" width="80" height="34" rx="17" fill="#FF6A5C"/>
      <circle cx="34" cy="77" r="4.5" fill="#14231F"/>
      <circle cx="54" cy="77" r="4.5" fill="#14231F"/>
      <circle cx="74" cy="77" r="4.5" fill="#14231F"/>
    </g>
    <text x="140" y="102" className="word" fontSize="64" fill="#14231F" letterSpacing="-1.5">talkin<tspan fill="#FF6A5C">bio</tspan></text>
  </svg>
);

// Faz 4.3: ödeme sağlayıcı Faz H.1'i bekliyor — bu sayfa gerçek checkout değil,
// roadmap'in kredi tablosunu şeffaf gösteren + "bize ulaşın" formuna yönlendiren
// geçici bir çözüm. Kapasite örnekleri credits.ts'teki gerçek sabitlerden hesaplanır.
const PLANS = [
  { id: 'starter', name: 'Starter', price: 9, credits: 200 },
  { id: 'pro', name: 'Pro', price: 29, credits: 700 },
  { id: 'business', name: 'Business', price: 79, credits: 1800 },
] as const;

const EXTRA_PACK = { price: 5, credits: 100 };

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

  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlanCta = (planId: string) => {
    setSelectedPlan(planId);
    document.getElementById('pricing-contact-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !phone.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/pricing-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          phone: phone.trim(),
          planInterest: selectedPlan || null,
          message: message.trim(),
        }),
      });
      if (!res.ok) throw new Error('failed');
      setSubmitted(true);
    } catch {
      setError(t('formErrorGeneric'));
    } finally {
      setSubmitting(false);
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
            <Link href="/login" className="btn btn-ghost" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
              {tNav('login')}
            </Link>
            <Link href="/request-access" className="btn btn-primary nav-cta">
              {tNav('startFree')}
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
            const beiweUpdates = Math.floor(plan.credits / BEIWE_UPDATE_CREDIT_COST);
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
                  {plan.name}
                </h2>
                <p style={{ margin: 0 }}>
                  <span style={{ fontFamily: 'var(--font-bricolage)', fontSize: '2rem', fontWeight: 800, color: 'var(--ink)' }}>${plan.price}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.9rem', marginLeft: '4px' }}>{t('perMonth')}</span>
                </p>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--teal)', fontSize: '0.95rem' }}>{t('credits', { count: plan.credits })}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink-soft)', lineHeight: 1.5, minHeight: '2.5rem' }}>
                  {t('capacityExample', { saule: sauleChats, beiwe: beiweUpdates })}
                </p>
                <button
                  onClick={() => handlePlanCta(plan.id)}
                  className="btn btn-primary"
                  style={{ marginTop: 'auto', borderRadius: '100px', padding: '0.75rem 1.2rem', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}
                >
                  {t('ctaButton')}
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

        <div id="pricing-contact-form" style={{
          marginTop: '5rem',
          background: 'var(--ink)',
          borderRadius: '20px',
          padding: '3rem 2.5rem',
        }}>
          <h3 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '1.6rem', color: '#fff', margin: '0 0 0.75rem' }}>
            {t('formTitle')}
          </h3>
          <p style={{ fontFamily: 'var(--font-inter)', color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2rem', maxWidth: '480px' }}>
            {t('formSubtitle')}
          </p>

          {submitted ? (
            <p style={{ color: '#fff', fontFamily: 'var(--font-inter)', fontSize: '1rem' }}>{t('formSuccess')}</p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', maxWidth: '420px' }}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('formEmail')} style={inputStyle} />
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('formPhone')} style={inputStyle} />
              <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)} style={inputStyle}>
                <option value="">{t('formPlanNone')}</option>
                {PLANS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('formMessage')} rows={3} style={{ ...inputStyle, resize: 'none' }} />
              {error && <p style={{ color: '#FF6A5C', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ borderRadius: '100px', padding: '0.85rem 1.5rem', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? t('formSubmitting') : t('formSubmit')}
              </button>
            </form>
          )}
        </div>
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
