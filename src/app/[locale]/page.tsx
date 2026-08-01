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
import MobileMenu from '@/components/MobileMenu';
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
              <Link href="/login" className="btn btn-primary nav-cta" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
                {t('nav.login')}
              </Link>
            )}
          </div>
          <MobileMenu 
            isLoggedIn={isLoggedIn} 
            texts={{
              pricing: t('nav.pricing'),
              login: t('nav.login')
            }} 
          />
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
              <h2 className="animate-fade-up delay-75 mt-5 text-3xl md:text-5xl font-[800] text-[var(--ink)] leading-[1.05]" style={{ fontFamily: 'var(--font-bricolage)' }}>
                {t('heroTexts.title')}
              </h2>
              <p 
                className="sub animate-fade-up delay-100 text-xl md:text-2xl text-[var(--ink-soft)] mt-6 mb-8 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: t.raw('heroTexts.subtitle') }}
              />
              <div className="hero-ctas animate-fade-up delay-200 flex flex-wrap gap-4">
                <a href="#nasil-calisir" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '17px' }}>
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

        <section className="py-24 bg-[var(--paper)] border-t border-[var(--border)]">
          <div className="wrap max-w-4xl mx-auto flex flex-col gap-24">
            
            {/* Item 1 */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start group">
                <div className="w-16 h-16 rounded-[20px] shrink-0 border border-[var(--border)] bg-white flex items-center justify-center relative shadow-sm transition-transform group-hover:scale-105">
                  <span className="font-bricolage font-bold text-2xl text-[var(--ink)]">1</span>
                </div>
                <div className="pt-1">
                  <h3 className="text-2xl font-bold text-[var(--ink)] mb-3" style={{ fontFamily: 'var(--font-bricolage)' }}>
                    {t('threeDots.dot1Title')}
                  </h3>
                  <p className="text-[var(--ink-soft)] text-lg leading-relaxed max-w-2xl">
                    {t('threeDots.dot1Desc')}
                  </p>
                </div>
              </div>
              {/* Image Placeholder */}
              <div className="w-full aspect-[16/9] sm:aspect-[21/9] bg-[var(--paper)] rounded-[24px] border border-[var(--border)] shadow-sm flex items-center justify-center relative overflow-hidden">
                 <Image src="/mockup-1.png" alt="Podcast Room" fill priority sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px" className="object-cover object-top" />
              </div>
              <a href="https://www.instagram.com/talkinbio_/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[var(--ink-soft)] hover:text-[var(--ink)] font-medium transition-colors text-sm px-2 -mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                @talkinbio_
              </a>
            </div>

            {/* Item 2 */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start group">
                <div className="w-16 h-16 rounded-[20px] shrink-0 border border-[var(--border)] bg-white flex items-center justify-center relative shadow-sm transition-transform group-hover:scale-105">
                  <span className="font-bricolage font-bold text-2xl text-[var(--ink)]">2</span>
                </div>
                <div className="pt-1">
                  <h3 className="text-2xl font-bold text-[var(--ink)] mb-3" style={{ fontFamily: 'var(--font-bricolage)' }}>
                    {t('threeDots.dot2Title')}
                  </h3>
                  <p className="text-[var(--ink-soft)] text-lg leading-relaxed max-w-2xl">
                    {t('threeDots.dot2Desc')}
                  </p>
                </div>
              </div>
              {/* Video Mockup */}
              <div className="w-full aspect-[9/16] sm:aspect-video bg-[var(--paper)] rounded-[24px] border border-[var(--border)] shadow-sm flex items-center justify-center relative overflow-hidden">
                 <video src="/mockup-2.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover sm:object-contain object-center" />
              </div>
              <a href="https://talkinbio.com/ulianapehlivan" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] font-medium transition-colors text-sm px-2 -mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" opacity="0.15"/>
                  <circle cx="7.5" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="16.5" cy="12" r="1.5" fill="currentColor"/>
                </svg>
                talkinbio.com/ulianapehlivan
              </a>
            </div>

            {/* Item 3 */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start group">
                <div className="w-16 h-16 rounded-[20px] shrink-0 border border-[var(--border)] bg-white flex items-center justify-center relative shadow-sm transition-transform group-hover:scale-105">
                  <span className="font-bricolage font-bold text-2xl text-[var(--ink)]">3</span>
                </div>
                <div className="pt-1">
                  <h3 className="text-2xl font-bold text-[var(--ink)] mb-3" style={{ fontFamily: 'var(--font-bricolage)' }}>
                    {t('threeDots.dot3Title')}
                  </h3>
                  <p className="text-[var(--ink-soft)] text-lg leading-relaxed max-w-2xl">
                    {t('threeDots.dot3Desc')}
                  </p>
                </div>
              </div>
              {/* Fake UI Mockup for Sales */}
              <div className="w-full bg-[var(--paper)] rounded-[24px] border border-[var(--border)] shadow-sm relative overflow-hidden p-4 sm:p-10 flex items-center justify-center">
                
                {/* Dashboard Card */}
                <div className="w-full max-w-2xl bg-white border border-[var(--border)] rounded-[20px] shadow-sm overflow-hidden" style={{ fontFamily: 'var(--font-inter)' }}>
                  <div className="border-b border-[var(--border)] p-4 sm:p-5 flex justify-between items-center bg-[#FDFCFB]">
                    <div>
                      <h4 className="font-semibold text-[var(--ink)] text-base sm:text-lg">{t('mockup.title')}</h4>
                      <p className="text-xs sm:text-sm text-[var(--ink-soft)] mt-1">{t('mockup.subtitle')}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-[var(--ink)] text-white px-3 py-1.5 rounded-[100px] text-xs font-medium">
                      <span className="w-2 h-2 rounded-full bg-[var(--beiwe-accent)] animate-pulse"></span>
                      {t('mockup.live')}
                    </div>
                  </div>
                  
                  <div className="divide-y divide-[var(--border)]">
                    {/* Item 1 */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F9F9F9] transition-colors">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center text-[var(--saule-accent)] font-bold shrink-0 text-sm">AY</div>
                        <div>
                          <p className="font-semibold text-[var(--ink)] text-sm sm:text-base">Ayşe Yılmaz</p>
                          <p className="text-xs sm:text-sm text-[var(--ink-soft)] mt-0.5">{t('mockup.service1')}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto border-t border-[var(--border)] sm:border-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
                        <div className="text-left sm:text-right">
                          <p className="font-bold text-[var(--ink)] text-sm sm:text-base">$850</p>
                          <p className="text-[10px] sm:text-xs text-[var(--ink-soft)] uppercase tracking-wide">{t('mockup.paid')}</p>
                        </div>
                        <div className="bg-[#E8F8F5] text-[#145C4B] px-2.5 py-1 rounded-[100px] text-[11px] sm:text-xs font-semibold whitespace-nowrap border border-[#BCE8DE]">
                          {t('mockup.closed')}
                        </div>
                      </div>
                    </div>
                    
                    {/* Item 2 */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F9F9F9] transition-colors">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold shrink-0 text-sm">MK</div>
                        <div>
                          <p className="font-semibold text-[var(--ink)] text-sm sm:text-base">Murat Kaya</p>
                          <p className="text-xs sm:text-sm text-[var(--ink-soft)] mt-0.5">{t('mockup.service2')}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto border-t border-[var(--border)] sm:border-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
                        <div className="text-left sm:text-right">
                          <p className="font-bold text-[var(--ink)] text-sm sm:text-base">$200</p>
                          <p className="text-[10px] sm:text-xs text-[var(--ink-soft)] uppercase tracking-wide">{t('mockup.pending')}</p>
                        </div>
                        <div className="bg-[#FFF8E6] text-[#8C6D1F] px-2.5 py-1 rounded-[100px] text-[11px] sm:text-xs font-semibold whitespace-nowrap border border-[#F5E1A4]">
                          {t('mockup.appointment')}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
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
              <div className="px-5 py-2 rounded-full border border-[var(--border)] text-[var(--ink)] font-semibold text-sm cursor-default hidden sm:block">
                {t('updates.allPosts')}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {/* Post 1 */}
              <div className="group block cursor-default">
                <div className="aspect-[4/3] w-full rounded-3xl overflow-hidden relative mb-5 bg-[var(--paper)]">
                  {/* Coral Gradient — Saule */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF6A5C] via-[#ff8478] to-[#FFEDE9] opacity-90 transition-transform duration-700"></div>
                  <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <h3 className="text-white text-2xl font-bold drop-shadow-sm max-w-[200px] leading-tight">{t('updates.post1.badge')}</h3>
                  </div>
                </div>
                <h4 className="text-[var(--ink)] font-bold text-lg mb-2 line-clamp-2">{t('updates.post1.title')}</h4>
                <p className="text-[var(--muted)] text-sm font-medium">{t('updates.post1.meta')}</p>
              </div>

              {/* Post 2 */}
              <div className="group block cursor-default">
                <div className="aspect-[4/3] w-full rounded-3xl overflow-hidden relative mb-5 bg-[var(--paper)]">
                  {/* Teal Gradient — Beiwe */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#50e3c2] via-[#3a967c] to-[#14231F] opacity-90 transition-transform duration-700"></div>
                  <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <h3 className="text-white text-2xl font-bold drop-shadow-sm max-w-[200px] leading-tight">{t('updates.post2.badge')}</h3>
                  </div>
                </div>
                <h4 className="text-[var(--ink)] font-bold text-lg mb-2 line-clamp-2">{t('updates.post2.title')}</h4>
                <p className="text-[var(--muted)] text-sm font-medium">{t('updates.post2.meta')}</p>
              </div>

              {/* Post 3 */}
              <div className="group block cursor-default">
                <div className="aspect-[4/3] w-full rounded-3xl overflow-hidden relative mb-5 bg-[var(--paper)]">
                  {/* Ink Gradient — neutral */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#14231F] via-[#4B5A55] to-[#8A8880] opacity-90 transition-transform duration-700"></div>
                  <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <h3 className="text-white text-2xl font-bold drop-shadow-sm max-w-[200px] leading-tight">{t('updates.post3.badge')}</h3>
                  </div>
                </div>
                <h4 className="text-[var(--ink)] font-bold text-lg mb-2 line-clamp-2">{t('updates.post3.title')}</h4>
                <p className="text-[var(--muted)] text-sm font-medium">{t('updates.post3.meta')}</p>
              </div>
            </div>

            <div className="mt-8 text-center sm:hidden">
               <div className="px-5 py-2 rounded-full border border-[var(--border)] text-[var(--ink)] font-semibold text-sm inline-block cursor-default">
                {t('updates.allPosts')}
              </div>
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
