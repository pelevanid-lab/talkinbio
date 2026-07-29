import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import LandingHeroTabs from '@/components/LandingHeroTabs';
import ShowcaseSection from '@/components/ShowcaseSection';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { SauleIcon, BeiweIcon } from '@/components/AgentIcons';
import { isConversationActive } from '@/utils/conversationWindow';
import './landing.css';

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

export default async function HomePage({ params }: any) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Landing' });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  // Faz 1.6: landing'deki Saule önizlemesi gerçek demo işletmeye bağlanır (dogfooding).
  const demoBusinessId = process.env.TALKINBIO_BUSINESS_ID || null;
  let demoInitialMessages: any[] = [];
  let demoBlocks: any[] = [];
  let demoTheme: any = null;
  if (demoBusinessId) {
    try {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const [{ data: blocks }, { data: business }] = await Promise.all([
        supabaseAdmin.from('blocks').select('*').eq('business_id', demoBusinessId).eq('is_visible', true).order('order', { ascending: true }),
        supabaseAdmin.from('businesses').select('theme').eq('id', demoBusinessId).single(),
      ]);
      demoBlocks = blocks || [];
      demoTheme = business?.theme || null;

      const cookieStore = await cookies();
      const visitorSessionId = cookieStore.get('visitor_session_id')?.value;
      if (visitorSessionId) {
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
        '@id': 'https://talkinbio.com/#website',
        url: 'https://talkinbio.com/',
        name: 'Talkinbio',
        description: t('hero.sub'),
        inLanguage: locale
      },
      {
        '@type': 'Organization',
        '@id': 'https://talkinbio.com/#organization',
        name: 'Talkinbio',
        url: 'https://talkinbio.com/',
        logo: 'https://talkinbio.com/icon.svg'
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://talkinbio.com/#software',
        name: 'Talkinbio',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD'
        },
        description: t('hero.sub'),
        url: 'https://talkinbio.com/'
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
          <div className="hidden md:flex items-center gap-5">
            <LanguageSwitcher />
            <Link href="/pricing" className="btn btn-ghost" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
              {t('nav.pricing')}
            </Link>
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn btn-primary nav-cta">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
                  {t('nav.login')}
                </Link>
                <Link href="/request-access" className="btn btn-primary nav-cta">
                  {t('nav.startFree')}
                </Link>
              </>
            )}
          </div>
          <button className="md:hidden p-2 text-[var(--ink)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
        </div>
      </header>

      <main>
        <section className="hero relative">
          <div className="wrap">
            <div className="max-w-[800px] mb-12 relative z-10">
              <h1 className="animate-fade-up" style={{ fontSize: 'clamp(48px, 7vw, 84px)', letterSpacing: '-0.04em', lineHeight: '1.02' }}>
                Stop linking.
                <br />
                Start talking.
              </h1>
              <p 
                className="sub animate-fade-up delay-100 text-xl md:text-2xl text-[var(--ink-soft)] mt-6 mb-8 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: t.raw('heroTexts.subtitle') }}
              />
              <div className="hero-ctas animate-fade-up delay-200 flex flex-wrap gap-4">
                <Link href="/request-access" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '17px' }}>
                  {t('heroTexts.btnEarly')}
                </Link>
                <a href="#nasil-calisir" className="btn btn-ghost bg-white" style={{ padding: '16px 32px', fontSize: '17px' }}>
                  {t('heroTexts.btnHow')}
                </a>
                <Link href="/pricing" className="btn btn-ghost bg-white" style={{ padding: '16px 32px', fontSize: '17px' }}>
                  {t('heroTexts.btnPricing')}
                </Link>
              </div>
            </div>

            <div className="animate-fade-up delay-300 relative z-10">
              <LandingHeroTabs 
                texts={{}}
                demoBusinessId={demoBusinessId}
                locale={locale}
                demoInitialMessages={demoInitialMessages}
                demoBlocks={demoBlocks}
                demoTheme={demoTheme}
              />
            </div>
          </div>
        </section>

        <div className="wrap">
          <div className="statement">
            <p>{t('statement.text')}</p>
          </div>
        </div>

        <section className="py-24 bg-white border-t border-[var(--border)]">
          <div className="wrap flex flex-col lg:flex-row gap-12 lg:gap-24">
            <div className="w-full lg:w-[40%] flex flex-col justify-center">
              <h2 className="text-4xl md:text-[56px] font-bold text-[var(--ink)] mb-8 tracking-tight leading-[1.1]" style={{ fontFamily: 'var(--font-bricolage)', letterSpacing: '-0.02em' }}>
                {t('twoPlatforms.title')}
              </h2>
            </div>
            
            <div className="w-full lg:w-[60%] flex flex-col gap-16">
              
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-24 h-24 rounded-[32px] shrink-0 border border-[var(--border)] bg-[var(--paper)] flex items-center justify-center relative overflow-hidden shadow-sm">
                   <div className="animate-orbPulse"><SauleIcon size={64} /></div>
                   <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--ink)] mb-3 flex items-center gap-3" style={{ fontFamily: 'var(--font-bricolage)' }}>
                    <div className="px-2 py-0.5 rounded-full bg-[var(--coral-tint)] text-[var(--coral)] text-xs font-bold tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono)' }}>ASSISTANT</div>
                    {t('twoPlatforms.sauleTitle')}
                  </h3>
                  <p className="text-[var(--ink-soft)] leading-relaxed text-[15px]">
                    {t('twoPlatforms.sauleDesc')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-24 h-24 rounded-[32px] shrink-0 border border-[var(--border)] bg-[var(--paper)] flex items-center justify-center relative overflow-hidden shadow-sm">
                   <div className="animate-orbPulse" style={{ animationDelay: '1s' }}><BeiweIcon size={64} /></div>
                   <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--ink)] mb-3 flex items-center gap-3" style={{ fontFamily: 'var(--font-bricolage)' }}>
                    <div className="px-2 py-0.5 rounded-full bg-[var(--teal-tint)] text-[var(--teal-deep)] text-xs font-bold tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono)' }}>CREATIVE</div>
                    {t('twoPlatforms.beiweTitle')}
                  </h3>
                  <p className="text-[var(--ink-soft)] leading-relaxed text-[15px]">
                    {t('twoPlatforms.beiweDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="h-24 md:h-32 w-full"></div>
          <div className="wrap">
            {/* Dashboard Mockup Area */}
            <div className="bg-[var(--paper)] rounded-[32px] p-6 md:p-12 border border-[var(--border)] shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden relative">
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 justify-center items-center lg:items-stretch min-h-[400px]">
                
                {/* Placeholder for Saule Dashboard Screenshot */}
                <div className="w-full lg:w-[55%] min-h-[240px] aspect-[4/3] lg:aspect-auto bg-white rounded-2xl border border-[var(--border)] shadow-2xl shadow-slate-200/50 flex flex-col overflow-hidden relative z-20 transform lg:translate-x-4 lg:-translate-y-4 hover:z-30 transition-transform">
                  <div className="h-10 border-b border-[var(--border)] flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <div className="text-[10px] text-[var(--muted)] font-medium ml-2 uppercase tracking-widest">Assistant Analytics</div>
                  </div>
                  <div className="flex-1 p-8 flex items-center justify-center text-center">
                    <div>
                      <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center"><SauleIcon size={96} /></div>
                    </div>
                  </div>
                </div>

                {/* Placeholder for Beiwe Dashboard Screenshot */}
                <div className="w-full lg:w-[45%] min-h-[240px] aspect-[4/3] lg:aspect-auto bg-white rounded-2xl border border-[var(--border)] shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden relative z-10 transform lg:-translate-x-4 lg:translate-y-4 hover:z-20 transition-transform">
                  <div className="h-10 border-b border-[var(--border)] flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <div className="text-[10px] text-[var(--muted)] font-medium ml-2 uppercase tracking-widest">Creative Studio</div>
                  </div>
                  <div className="flex-1 p-8 flex items-center justify-center text-center">
                    <div>
                      <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"><BeiweIcon size={64} /></div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Deep Dive: Saule Assistant */}
        <section className="py-24 border-t border-[var(--border)] bg-white">
          <div className="wrap flex flex-col lg:flex-row gap-12 lg:gap-24">
            <div className="w-full lg:w-[40%]">
              <h2 className="text-4xl md:text-5xl font-bold text-[var(--ink)] mb-6 tracking-tight" style={{ fontFamily: 'var(--font-bricolage)', letterSpacing: '-0.02em' }}>
                {t('deepSaule.title')}
              </h2>
              <p className="text-xl text-[var(--ink)] font-semibold mb-4 leading-snug">
                {t('deepSaule.desc')}
              </p>
              <Link href="/request-access" className="text-[var(--coral)] font-semibold hover:underline flex items-center gap-2">
                {t('deepSaule.btn')} <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
            
            <div className="w-full lg:w-[60%] grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12">
              <div>
                <h4 className="text-lg font-bold text-[var(--ink)] mb-2">{t('deepSaule.f1Title')}</h4>
                <p className="text-[var(--ink-soft)] leading-relaxed text-[15px]">{t('deepSaule.f1Desc')}</p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-[var(--ink)] mb-2">{t('deepSaule.f2Title')}</h4>
                <p className="text-[var(--ink-soft)] leading-relaxed text-[15px]">{t('deepSaule.f2Desc')}</p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-[var(--ink)] mb-2">{t('deepSaule.f3Title')}</h4>
                <p className="text-[var(--ink-soft)] leading-relaxed text-[15px]">{t('deepSaule.f3Desc')}</p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-[var(--ink)] mb-2">{t('deepSaule.f4Title')}</h4>
                <p className="text-[var(--ink-soft)] leading-relaxed text-[15px]">{t('deepSaule.f4Desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Deep Dive: Beiwe Creative */}
        <section className="py-24 border-t border-[var(--border)] bg-[var(--paper)]">
          <div className="wrap flex flex-col lg:flex-row gap-12 lg:gap-24">
            <div className="w-full lg:w-[40%]">
              <h2 className="text-4xl md:text-5xl font-bold text-[var(--ink)] mb-6 tracking-tight" style={{ fontFamily: 'var(--font-bricolage)', letterSpacing: '-0.02em' }}>
                {t('deepBeiwe.title')}
              </h2>
              <p className="text-xl text-[var(--ink)] font-semibold mb-4 leading-snug">
                {t('deepBeiwe.desc1')}
              </p>
              <p className="text-[var(--ink-soft)] text-lg leading-relaxed mb-8">
                {t('deepBeiwe.desc2')}
              </p>
              <Link href="/request-access" className="text-[var(--teal-deep)] font-semibold hover:underline flex items-center gap-2">
                {t('deepBeiwe.btn')} <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
            
            <div className="w-full lg:w-[60%] grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12">
              <div>
                <h4 className="text-lg font-bold text-[var(--ink)] mb-2">{t('deepBeiwe.f1Title')}</h4>
                <p className="text-[var(--ink-soft)] leading-relaxed text-[15px]">{t('deepBeiwe.f1Desc')}</p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-[var(--ink)] mb-2">{t('deepBeiwe.f2Title')}</h4>
                <p className="text-[var(--ink-soft)] leading-relaxed text-[15px]">{t('deepBeiwe.f2Desc')}</p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-[var(--ink)] mb-2">{t('deepBeiwe.f3Title')}</h4>
                <p className="text-[var(--ink-soft)] leading-relaxed text-[15px]">{t('deepBeiwe.f3Desc')}</p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-[var(--ink)] mb-2">{t('deepBeiwe.f4Title')}</h4>
                <p className="text-[var(--ink-soft)] leading-relaxed text-[15px]">{t('deepBeiwe.f4Desc')}</p>
              </div>
            </div>
          </div>
        </section>

        <ShowcaseSection />

        <section className="py-20 md:py-32 bg-white border-t border-[var(--border)]">
          <div className="wrap">
            <div className="flex justify-between items-end mb-12">
              <h2 className="text-3xl md:text-5xl font-bold text-[var(--ink)] tracking-tight" style={{ fontFamily: 'var(--font-bricolage)', letterSpacing: '-0.02em' }}>
                {t('updates.title')}
              </h2>
              <Link href="/updates" className="px-5 py-2 rounded-full border border-[var(--border)] text-[var(--ink)] font-semibold text-sm hover:bg-[var(--paper)] transition-colors hidden sm:block">
                {t('updates.allPosts')}
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {/* Post 1 */}
              <Link href="/updates/talkinbio-v2-yayinda" className="group block">
                <div className="aspect-[4/3] w-full rounded-3xl overflow-hidden relative mb-5 bg-[var(--paper)]">
                  {/* Coral Gradient — Saule */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF6A5C] via-[#ff8478] to-[#FFEDE9] opacity-90 transition-transform duration-700 group-hover:scale-105"></div>
                  <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <h3 className="text-white text-2xl font-bold drop-shadow-sm max-w-[200px] leading-tight">{t('updates.post1.badge')}</h3>
                  </div>
                </div>
                <h4 className="text-[var(--ink)] font-bold text-lg mb-2 group-hover:text-[var(--coral)] transition-colors line-clamp-2">{t('updates.post1.title')}</h4>
                <p className="text-[var(--muted)] text-sm font-medium">{t('updates.post1.meta')}</p>
              </Link>

              {/* Post 2 */}
              <Link href="/updates/saule-egitimi" className="group block">
                <div className="aspect-[4/3] w-full rounded-3xl overflow-hidden relative mb-5 bg-[var(--paper)]">
                  {/* Teal Gradient — Beiwe */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#50e3c2] via-[#3a967c] to-[#14231F] opacity-90 transition-transform duration-700 group-hover:scale-105"></div>
                  <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <h3 className="text-white text-2xl font-bold drop-shadow-sm max-w-[200px] leading-tight">{t('updates.post2.badge')}</h3>
                  </div>
                </div>
                <h4 className="text-[var(--ink)] font-bold text-lg mb-2 group-hover:text-[var(--teal-deep)] transition-colors line-clamp-2">{t('updates.post2.title')}</h4>
                <p className="text-[var(--muted)] text-sm font-medium">{t('updates.post2.meta')}</p>
              </Link>

              {/* Post 3 */}
              <Link href="/updates/gelismis-analitik" className="group block">
                <div className="aspect-[4/3] w-full rounded-3xl overflow-hidden relative mb-5 bg-[var(--paper)]">
                  {/* Ink Gradient — neutral */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#14231F] via-[#4B5A55] to-[#8A8880] opacity-90 transition-transform duration-700 group-hover:scale-105"></div>
                  <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <h3 className="text-white text-2xl font-bold drop-shadow-sm max-w-[200px] leading-tight">{t('updates.post3.badge')}</h3>
                  </div>
                </div>
                <h4 className="text-[var(--ink)] font-bold text-lg mb-2 group-hover:text-[var(--ink-soft)] transition-colors line-clamp-2">{t('updates.post3.title')}</h4>
                <p className="text-[var(--muted)] text-sm font-medium">{t('updates.post3.meta')}</p>
              </Link>
            </div>

            <div className="mt-8 text-center sm:hidden">
               <Link href="/updates" className="px-5 py-2 rounded-full border border-[var(--border)] text-[var(--ink)] font-semibold text-sm inline-block">
                {t('updates.allPosts')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="footer-row">
            <LogoSVG />
            <div className="foot-links">
              <Link href="/pricing">{t('nav.pricing')}</Link>
              <Link href="/admin/login">Admin</Link>
              <Link href="/legal">{t('footer.privacy')}</Link>
            </div>
          </div>
          <div className="footer-bar" style={{ justifyContent: 'center', padding: '0' }}>
            <span>{t('footer.brandLink')}</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-ibm-plex-mono)' }}>{t('footer.tagline')}</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-ibm-plex-mono)' }}>{t('footer.rights')} · <a href="mailto:info@talkinbio.com" style={{ color: 'inherit', textDecoration: 'underline' }}>info@talkinbio.com</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
