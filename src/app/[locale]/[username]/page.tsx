import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import ChatWidget from '@/components/ChatWidget';
import ProfilePageBody from '@/components/ProfilePageBody';
import { createClient } from '@/utils/supabase/server';
import { DEFAULT_THEME } from '@/config/archetypes';
import { googleFontsHref } from '@/utils/googleFonts';
import { isConversationActive } from '@/utils/conversationWindow';

export async function generateMetadata({ params }: any) {
  const { username, locale } = await params;

  // Use anon client for metadata
  const { createClient: createAnonClient } = await import('@supabase/supabase-js');
  const supabase = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: business } = await supabase.from('businesses').select('name, category').eq('username', username).single();

  if (!business) return { title: 'Not Found' };

  const path = `/${username}`;
  const title = `${business.name} | Talkinbio`;
  const description = business.category || 'Sohbet et, randevu al, bilgi al.';

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        en: `/en${path}`,
        tr: `/tr${path}`,
        ru: `/ru${path}`,
        'x-default': `/en${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `/${locale}${path}`,
      siteName: 'Talkinbio',
      images: [{ url: '/saule-avatar-v1.png', width: 512, height: 512 }],
      locale,
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: ['/saule-avatar-v1.png'],
    },
  };
}

export default async function BusinessProfilePage({ params }: any) {
  const { username, locale } = await params;
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
        await supabase.from('page_views').upsert(
          { business_id: business.id, visitor_session_id: visitorSessionId, view_date: new Date().toISOString().slice(0, 10) },
          { onConflict: 'business_id,view_date,visitor_session_id', ignoreDuplicates: true }
        );
      }
    } catch (err) {
      console.error('Failed to record page view', err);
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

  const theme = business.theme || DEFAULT_THEME;
  const sauleSettings = business.saule_settings || {};
  const customGreeting = sauleSettings.customGreetingEnabled && sauleSettings.customGreeting
    ? sauleSettings.customGreeting
    : null;

  // 3. Fetch past conversation if visitor_session_id exists
  let initialMessages: any[] = [];
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
        .eq('business_id', business.id)
        .eq('visitor_session_id', visitorSessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Faz 1.3: >7 gün sessiz kalan konuşma "aktif" sayılmaz, geçmişi yüklenmez.
      const isActive = conv && isConversationActive(conv.last_message_at, conv.created_at);

      if (isActive && conv?.messages) {
        initialMessages = conv.messages
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((m: any) => ({ id: m.id, role: m.role, content: m.content }));
      }
    }
  } catch (err) {
    console.error('Failed to load past messages', err);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    url: `https://www.talkinbio.com/${locale}/${business.username}`,
    description: business.category,
    '@id': `https://www.talkinbio.com/${locale}/${business.username}#localbusiness`
  };

  return (
    <div className="flex flex-col min-h-[100dvh] relative">
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
      
      {/* Top 70% Content Area */}
      <main className="flex-1 overflow-y-auto pb-[35dvh]">
        <div className="max-w-md mx-auto w-full px-4 pt-6 pb-8">
          
          <ProfilePageBody
            blocks={blocks || []}
            theme={theme}
            businessName={business.name}
            pageTitle={business.page_title || business.name}
            contactMethod={business.contact_method}
            contactValue={business.contact_value}
          />

        </div>
      </main>

      {/* Bottom 30% Chat Widget */}
      <div className="fixed bottom-0 left-0 right-0 h-[30dvh] bg-transparent z-50 pointer-events-none">
        <div className="max-w-md mx-auto w-full h-full relative pointer-events-auto">
          <ChatWidget businessId={business.id} businessName={business.name} locale={locale} initialMessages={initialMessages} customGreeting={customGreeting} initialCreditsExhausted={(business.credit_balance ?? 0) <= 0} />
        </div>
      </div>
    </div>
  );
}
