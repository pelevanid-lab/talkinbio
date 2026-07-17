import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { Link } from '@/i18n/routing';
import LandingMockup from '@/components/LandingMockup';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { isConversationActive } from '@/utils/conversationWindow';
import './landing.css';

const LogoSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160" width="220" height="55" role="img" aria-labelledby="logoTitle">
    <title id="logoTitle">Talkinbio</title>
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

export default async function HomePage({ params }: any) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Landing' });

  // Faz 1.6: landing'deki Saule önizlemesi gerçek demo işletmeye bağlanır (dogfooding).
  const demoBusinessId = process.env.TALKINBIO_BUSINESS_ID || null;
  let demoInitialMessages: any[] = [];
  if (demoBusinessId) {
    try {
      const cookieStore = await cookies();
      const visitorSessionId = cookieStore.get('visitor_session_id')?.value;
      if (visitorSessionId) {
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: conv } = await supabaseAdmin
          .from('conversations')
          .select('last_message_at, created_at, messages(id, role, content, created_at)')
          .eq('business_id', demoBusinessId)
          .eq('visitor_session_id', visitorSessionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const isActive = conv && isConversationActive(conv.last_message_at, conv.created_at);

        if (isActive && conv?.messages) {
          demoInitialMessages = conv.messages
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((m: any) => ({ id: m.id, role: m.role, content: m.content }));
        }
      }
    } catch (err) {
      console.error('Failed to load landing demo messages', err);
    }
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://www.talkinbio.com/#website',
        url: 'https://www.talkinbio.com/',
        name: 'Talkinbio',
        description: t('hero.sub'),
        inLanguage: locale
      },
      {
        '@type': 'Organization',
        '@id': 'https://www.talkinbio.com/#organization',
        name: 'Talkinbio',
        url: 'https://www.talkinbio.com/',
        logo: 'https://www.talkinbio.com/icon.svg'
      }
    ]
  };

  return (
    <div id="landing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header>
        <div className="wrap nav">
          <Link href="/">
            <LogoSVG />
          </Link>
          <div className="links" style={{ display: 'none' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <LanguageSwitcher />
            <Link href="/login" className="btn btn-ghost" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
              {t('nav.login')}
            </Link>
            <Link href="/request-access" className="btn btn-primary nav-cta">
              {t('nav.startFree')}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <span className="eyebrow">{t('hero.eyebrow')}</span>
              <h1>
                {t('hero.headlinePrefix')}
                <br />
                <span className="strike">{t('hero.headlineStrike')}</span> {t('hero.headlineSuffix')}
                <span style={{ color: 'var(--coral)' }}>talkinbio.</span>
              </h1>
              <p className="sub">{t('hero.sub')}</p>
              <div className="hero-ctas">
                <Link href="/request-access" className="btn btn-primary">
                  {t('hero.startFree')}
                </Link>
                <a href="#nasil-calisir" className="btn btn-ghost">
                  {t('hero.howItWorks')}
                </a>
                <Link href="/stakeholders" className="btn btn-ghost" style={{ fontSize: '0.9rem' }}>
                  {t('nav.stakeholders')}
                </Link>
              </div>
              <p className="hero-note">{t('hero.note')}</p>
            </div>

            <LandingMockup
              businessId={demoBusinessId}
              businessName="Talkinbio"
              locale={locale}
              initialMessages={demoInitialMessages}
            />
          </div>
        </section>

        <div className="wrap">
          <div className="statement">
            <p>{t('statement.text')}</p>
          </div>
        </div>

        <section id="nasil-calisir">
          <div className="wrap">
            <div className="section-head">
              <h2>{t('steps.title')}</h2>
              <p>{t('steps.sub')}</p>
            </div>
            <div className="steps">
              <div className="step">
                <div className="step-num mono">01</div>
                <h3>{t('steps.step1.title')}</h3>
                <p>{t('steps.step1.desc')}</p>
              </div>
              <div className="step">
                <div className="step-num mono">02</div>
                <h3>{t('steps.step2.title')}</h3>
                <p>{t('steps.step2.desc')}</p>
              </div>
              <div className="step">
                <div className="step-num mono">03</div>
                <h3>{t('steps.step3.title')}</h3>
                <p>{t('steps.step3.desc')}</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head">
              <h2>{t('features.title')}</h2>
              <p>{t('features.sub')}</p>
            </div>
            <div className="features">
              <div className="feature">
                <div className="feature-icon"><span></span></div>
                <h3>{t('features.feat1.title')}</h3>
                <p>{t('features.feat1.desc')}</p>
              </div>
              <div className="feature">
                <div className="feature-icon"><span></span></div>
                <h3>{t('features.feat2.title')}</h3>
                <p>{t('features.feat2.desc')}</p>
              </div>
              <div className="feature">
                <div className="feature-icon"><span></span></div>
                <h3>{t('features.feat3.title')}</h3>
                <p>{t('features.feat3.desc')}</p>
              </div>
              <div className="feature">
                <div className="feature-icon"><span></span></div>
                <h3>{t('features.feat4.title')}</h3>
                <p>{t('features.feat4.desc')}</p>
              </div>
              <div className="feature">
                <div className="feature-icon"><span></span></div>
                <h3>{t('features.feat5.title')}</h3>
                <p>{t('features.feat5.desc')}</p>
              </div>
              <div className="feature">
                <div className="feature-icon"><span></span></div>
                <h3>{t('features.feat6.title')}</h3>
                <p>{t('features.feat6.desc')}</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="audience">
              <div className="section-head">
                <h2>{t('audience.title')}</h2>
                <p>{t('audience.sub')}</p>
              </div>
              <div className="chip-row">
                {t.raw('audience.chips').map((chip: string, index: number) => (
                  <span key={index} className="chip">{chip}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="cta-final" id="basla">
          <div className="wrap">
            <h2>{t('cta.title')}</h2>
            <p>{t('cta.sub')}</p>
            <div className="cta-buttons">
              <Link href="/request-access" className="btn btn-primary">{t('cta.startFree')}</Link>
              <Link href="/uliana" className="btn btn-ghost">{t('cta.demo')}</Link>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="footer-row">
            <LogoSVG />
            <div className="foot-links">
              <Link href="/admin/login">Admin</Link>
              <Link href="/legal">{t('footer.privacy')}</Link>
            </div>
          </div>
          <div className="footer-bar" style={{ justifyContent: 'center', padding: '0' }}>
            <span>{t('footer.brandLink')}</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-ibm-plex-mono)' }}>{t('footer.rights')} · <a href="mailto:info@talkinbio.com" style={{ color: 'inherit', textDecoration: 'underline' }}>info@talkinbio.com</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
