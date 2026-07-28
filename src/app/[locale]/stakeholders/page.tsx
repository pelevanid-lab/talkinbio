'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ChevronLeft } from 'lucide-react';

const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.44-2.14 2.94v5.66H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z"/>
  </svg>
);
import '../landing.css';

const LogoSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="130 30 350 90" width="150" height="40" role="img" aria-labelledby="logoTitle">
    <title id="logoTitle">Talkinbio</title>
    <defs>
      <style>{`.word { font-family: 'Bricolage Grotesque', 'Arial Black', sans-serif; font-weight: 800; }`}</style>
    </defs>
    <text x="130" y="102" className="word" fontSize="64" fill="#14231F" letterSpacing="-1.5">talkinbio</text>
  </svg>
);

const sections = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'] as const;

const dividers = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09',
];

export default function StakeholdersPage() {
  const t = useTranslations('Stakeholders');
  const tNav = useTranslations('Landing.nav');

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

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '5rem 1.5rem 8rem' }}>

        {/* Back link */}
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

        {/* Header */}
        <div style={{ marginBottom: '4rem' }}>
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
            fontSize: '1.15rem',
            lineHeight: 1.7,
            color: 'var(--ink-soft)',
            maxWidth: '600px',
            borderLeft: '3px solid var(--coral)',
            paddingLeft: '1.25rem',
          }}>
            {t('intro')}
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginTop: '1.5rem',
          }}>
            <div>
              <p style={{
                margin: 0,
                fontFamily: 'var(--font-inter)',
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--ink)',
              }}>
                Enes Pehlivan
              </p>
              <p style={{
                margin: 0,
                fontFamily: 'var(--font-ibm-plex-mono)',
                fontSize: '0.75rem',
                color: 'var(--ink-soft)',
                letterSpacing: '0.03em',
              }}>
                CCO
              </p>
            </div>
            <a
              href="https://www.linkedin.com/in/enes-pehlivan"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--teal)' }}
            >
              <LinkedInIcon />
            </a>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(20,35,31,0.10)', marginBottom: '4rem' }} />

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4.5rem' }}>
          {sections.map((key, i) => (
            <section key={key}>
              {/* Section number + title */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.5rem' }}>
                <span style={{
                  fontFamily: 'var(--font-ibm-plex-mono)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--coral)',
                  letterSpacing: '0.05em',
                  opacity: 0.7,
                  minWidth: '1.8rem',
                }}>
                  {dividers[i]}
                </span>
                <h2 style={{
                  fontFamily: 'var(--font-bricolage)',
                  fontWeight: 800,
                  fontSize: 'clamp(1.25rem, 3vw, 1.65rem)',
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: 0,
                  lineHeight: 1.2,
                }}>
                  {t(`${key}.title`)}
                </h2>
              </div>

              {/* Content */}
              <div style={{
                fontFamily: 'var(--font-inter)',
                fontSize: '1.05rem',
                lineHeight: 1.85,
                color: '#2f3d38',
                whiteSpace: 'pre-line',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}>
                {t(`${key}.content`).split('\n\n').map((para, pi) => (
                  <p key={pi} style={{ margin: 0 }}>{para}</p>
                ))}
              </div>

              {/* Section divider */}
              {i < sections.length - 1 && (
                <div style={{
                  marginTop: '4.5rem',
                  borderTop: '1px solid rgba(20,35,31,0.07)',
                }} />
              )}
            </section>
          ))}
        </div>

        {/* CTA block */}
        <div style={{
          marginTop: '6rem',
          background: 'var(--ink)',
          borderRadius: '20px',
          padding: '3rem 2.5rem',
          textAlign: 'center',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-bricolage)',
            fontWeight: 800,
            fontSize: '1.6rem',
            letterSpacing: '-0.02em',
            color: '#fff',
            marginBottom: '1rem',
          }}>
            {t('ctaTitle')}
          </h3>
          <p style={{
            fontFamily: 'var(--font-inter)',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            marginBottom: '2rem',
            maxWidth: '420px',
            margin: '0 auto 2rem',
          }}>
            {t('ctaBody')}
          </p>
          <Link href="/request-access" className="btn btn-primary" style={{
            background: 'var(--coral)',
            color: 'var(--ink)',
            borderRadius: '100px',
            padding: '0.85rem 2rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            display: 'inline-block',
            textDecoration: 'none',
          }}>
            {tNav('startFree')}
          </Link>
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
