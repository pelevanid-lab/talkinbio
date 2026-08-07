import { notFound } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';
import ChatWidget from '@/components/ChatWidget';
import PoweredByFooter from '@/components/PoweredByFooter';
import ProfilePageBody from '@/components/ProfilePageBody';
import { PublicPageRuntimeProvider } from '@/components/PublicPageRuntime';
import { createClient } from '@/utils/supabase/server';
import { DEFAULT_THEME, resolvePageCanvases, resolveThemeColors } from '@/config/archetypes';
import { googleFontsHref } from '@/utils/googleFonts';
import { getPageActionTargets, withContactPageActionTarget } from '@/utils/pageActionTargets';
import { resolvePublishedRuntimeData } from '@/utils/publishedSnapshot';
import { localizedPath, localizedUrl, hreflangPaths } from '@/utils/localizedUrl';

// Her ziyarette taze saule_settings çekilsin
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: any) {
  const { username, locale } = await params;

  // Use anon client for metadata
  const { createClient: createAnonClient } = await import('@supabase/supabase-js');
  const supabase = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: business } = await supabase.from('businesses').select('*').eq('username', username).single();

  if (!business) return { title: 'Not Found' };

  const { data: blocks } = await supabase
    .from('blocks')
    .select('*')
    .eq('business_id', business.id)
    .order('order', { ascending: true });
  const { business: pageBusiness } = resolvePublishedRuntimeData(business, blocks || [], false);

  const path = `/${username}`;
  // Strip color markup [[text|#RRGGBB]] → text for metadata
  const stripColorMarkup = (text: string): string => {
    return text.replace(/\[\[(.*?)\|#[0-9A-Fa-f]{6}\]\]/g, '$1');
  };
  const displayTitle = pageBusiness.page_title || pageBusiness.name;
  const title = `${stripColorMarkup(displayTitle)} | Talkinbio`;
  const description = pageBusiness.category || 'Sohbet et, randevu al, bilgi al.';

  return {
    title,
    description,
    alternates: {
      // Default locale (tr) has no /tr prefix on this site — see src/utils/localizedUrl.ts.
      // Hardcoding `/${locale}${path}` here (as before) made the tr canonical/hreflang
      // point at a URL that immediately 30x-redirects back to the unprefixed one.
      canonical: localizedPath(locale, path),
      languages: hreflangPaths(path),
    },
    openGraph: {
      title,
      description,
      url: localizedPath(locale, path),
      siteName: 'Talkinbio',
      locale,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function BusinessProfilePage({ params, searchParams }: any) {
  const { username, locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'PublicPage' });
  const supabase = await createClient();

  // 1. Fetch Business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('username', username)
    .single();

  if (!business) {
    notFound();
  }

  // Check publication status
  const { data: userData } = await supabase.auth.getUser();
  const isOwner = userData?.user?.id === business.owner_id;

  if (!business.is_published && !isOwner) {
    notFound();
  }

  // Faz 3.3: haftalık özet e-postasının ön koşulu — günlük tekilleştirilmiş sayfa
  // görüntülenme sayacı. Sahibin kendi ziyaretleri sayılmaz.
  if (!isOwner) {
    try {
      const cookieStore = await cookies();
      const visitorSessionId = cookieStore.get('visitor_session_id')?.value;
      if (visitorSessionId) {
        let source = 'direct';
        if (sp?.utm_source) {
          source = sp.utm_source;
        } else {
          const reqHeaders = await headers();
          const referer = reqHeaders.get('referer') || '';
          if (referer.includes('instagram.com')) source = 'instagram';
          else if (referer.includes('tiktok.com')) source = 'tiktok';
          else if (referer.includes('google.com')) source = 'google';
          else if (referer.includes('t.co') || referer.includes('twitter.com')) source = 'twitter';
          else if (referer.includes('youtube.com')) source = 'youtube';
          else if (referer.includes('facebook.com')) source = 'facebook';
          else if (referer) source = 'referral';
        }

        const { error } = await supabase.from('page_views').insert(
          { business_id: business.id, visitor_session_id: visitorSessionId, view_date: new Date().toISOString().slice(0, 10), source }
        );
        // Error code 23505 is unique_violation, which means they already visited today
        if (error && error.code !== '23505') {
          console.error('Failed to record page view:', error.message || error, 'Code:', error.code);
        }
      }
    } catch (err) {
      console.error('Exception recording page view', err);
    }
  }

  // 2. Fetch Blocks
  // Note: fetch all blocks (not just is_visible) — the invisible `settings` block carries
  // layoutMode, which ArchetypeRenderer needs to decide website vs. linktree rendering.
  // ArchetypeRenderer itself filters out settings + is_visible:false blocks before display.
  const { data: blocks } = await supabase
    .from('blocks')
    .select('*')
    .eq('business_id', business.id)
    .order('order', { ascending: true });

  const { business: pageBusiness, blocks: pageBlocks } = resolvePublishedRuntimeData(business, blocks || [], isOwner);
  const theme = pageBusiness.theme || DEFAULT_THEME;
  const sauleSettings = pageBusiness.saule_settings || {};
  const creditBalance = business.credit_balance ?? 0;
  const isFrontDeskActive = (sauleSettings.frontDeskEnabled !== false) && (creditBalance >= 20);
  const customGreeting = sauleSettings.customGreetingEnabled && sauleSettings.customGreeting
    ? sauleSettings.customGreeting
    : null;
  const pageActionTargets = withContactPageActionTarget(
    getPageActionTargets(pageBlocks || [], locale),
    pageBusiness.contact_method,
    pageBusiness.contact_value,
    locale
  );

  const { getCategoryById: getWizardCategory } = await import('@/config/wizardCategories');
  const wizardCat = business.category_id ? getWizardCategory(business.category_id) : null;
  const schemaType = wizardCat?.schemaType ?? 'LocalBusiness';
  // Same locale-prefix rule as generateMetadata above (tr has no /tr prefix), plus the
  // bare (non-www) domain that robots.txt/sitemap.xml actually serve from — this used to
  // hardcode `www.talkinbio.com/${locale}/...` for every locale, which both redirected
  // (tr) and pointed at a different host than the page's real URL.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: business.name,
    url: localizedUrl(locale, `/${business.username}`),
    description: pageBusiness.category,
    '@id': `${localizedUrl(locale, `/${business.username}`)}#entity`
  };

  // Koyu modda tüm viewport (header satırı dahil) koyu zemine uyar — ArchetypeRenderer'ın kendi
  // renkli div'i yalnızca blok alanını kaplıyor, profil başlığı ve boşluklar bunun dışında.
  const resolvedColors = resolveThemeColors(theme);
  const { pageCanvas, stickyCanvas } = resolvePageCanvases(theme);
  const pageStyle = {
    background: pageCanvas,
    color: resolvedColors.text,
    '--tb-page-bg': pageCanvas,
    '--tb-page-bg-sticky': stickyCanvas,
  } as CSSProperties;

  // Resolve the contact method & value based on lead capture settings fallback
  let resolvedContactMethod = pageBusiness.contact_method;
  let resolvedContactValue = pageBusiness.contact_value;

  if (pageBusiness.saule_settings?.leadCaptureEnabled === false && pageBusiness.saule_settings?.preferredContactMethod) {
    const preferredMethod = pageBusiness.saule_settings.preferredContactMethod;
    try {
      const contactValues = pageBusiness.contact_value ? JSON.parse(pageBusiness.contact_value) : {};
      if (contactValues[preferredMethod]) {
        resolvedContactMethod = preferredMethod;
        resolvedContactValue = contactValues[preferredMethod];
      }
    } catch (e) {
      console.error('Failed to parse contact_value JSON:', e);
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] relative" style={pageStyle}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href={googleFontsHref(theme.headingFont, theme.bodyFont)} rel="stylesheet" />
      {!business.is_published && isOwner && (
        <div className="w-full bg-[var(--coral)] text-white text-center py-2 text-sm font-medium shadow-sm z-50">
          {t('unpublishedBanner')}
        </div>
      )}
      
      <PublicPageRuntimeProvider
        targets={pageActionTargets}
        businessId={business.id}
        blocks={pageBlocks || []}
        contactMethod={resolvedContactMethod}
        contactValue={resolvedContactValue}
        leadCaptureEnabled={pageBusiness.saule_settings?.leadCaptureEnabled !== false}
        customGreeting={customGreeting}
        isOwner={isOwner}
      >
      {/* Scrollable content — flex-1 min-h-0 so it fills only the space ABOVE the in-flow Saule
          dock below. Blocks scroll within here; the last block ends above Saule and can never
          slide under it (no magic pb-[…] needed). */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-md mx-auto w-full px-4 pt-4 pb-8">

          <ProfilePageBody
            blocks={pageBlocks || []}
            theme={theme}
            businessName={pageBusiness.name}
            pageTitle={pageBusiness.page_title || pageBusiness.name}
            tagline={pageBusiness.tagline}
            category={pageBusiness.category}
            categoryId={business.category_id}
            contactMethod={pageBusiness.contact_method}
            contactValue={pageBusiness.contact_value}
            orderNowBehavior={pageBusiness.saule_settings?.orderNowBehavior}
            locale={locale}
          />

        </div>
      </main>

      {/* Saule dock — an in-flow flex child (NOT fixed), so it reserves its own vertical space and
          the block area above shrinks to fit. Overlap with blocks is structurally impossible.
          The expanded chat sheet still opens as a fixed 85dvh overlay from inside ChatWidget. */}
      {isFrontDeskActive && (
        <div className="shrink-0 relative z-50" style={{ background: 'var(--tb-page-bg-sticky)' }}>
          <div className="max-w-md mx-auto w-full relative">
            <ChatWidget businessId={business.id} locale={locale} customGreeting={customGreeting} sauleSettings={sauleSettings} preview={isOwner} />
          </div>
        </div>
      )}

      {/* Karşılama/blok-listesi görünümünde talkinbio wordmark üstte (bkz. ProfileHeader).
          Bir blok açıldığında veya Saule bir soruya cevap verdiğinde üstteki kaybolur, bu daha
          görünür "Powered by talkinbio" alt satırı devralır (bkz. PoweredByFooter — kendi
          içinde activeBlockId/sauleQuestion'a göre gösterip gösterilmeyeceğine karar veriyor). */}
      <PoweredByFooter textColor={resolvedColors.text} />
      </PublicPageRuntimeProvider>
    </div>
  );
}
