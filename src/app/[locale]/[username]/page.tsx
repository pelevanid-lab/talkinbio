import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import ChatWidget from '@/components/ChatWidget';
import ProfilePageBody from '@/components/ProfilePageBody';
import { createClient } from '@/utils/supabase/server';
import { DEFAULT_THEME, resolveThemeColors } from '@/config/archetypes';
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

  // Koyu modda tüm viewport (header satırı dahil) koyu zemine uyar — ArchetypeRenderer'ın kendi
  // renkli div'i yalnızca blok alanını kaplıyor, profil başlığı ve boşluklar bunun dışında.
  const resolvedColors = resolveThemeColors(theme);

  return (
    <div className="flex flex-col h-[100dvh] relative" style={{ backgroundColor: resolvedColors.background, color: resolvedColors.text }}>
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
      
      {/* Scrollable content — flex-1 min-h-0 so it fills only the space ABOVE the in-flow Saule
          dock below. Blocks scroll within here; the last block ends above Saule and can never
          slide under it (no magic pb-[…] needed). */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-md mx-auto w-full px-4 pt-4 pb-8">

          <ProfilePageBody
            blocks={blocks || []}
            theme={theme}
            businessName={business.name}
            pageTitle={business.page_title || business.name}
            tagline={business.tagline}
            category={business.category}
            contactMethod={business.contact_method}
            contactValue={business.contact_value}
            orderNowBehavior={business.saule_settings?.orderNowBehavior}
          />

        </div>
      </main>

      {/* Saule dock — an in-flow flex child (NOT fixed), so it reserves its own vertical space and
          the block area above shrinks to fit. Overlap with blocks is structurally impossible.
          The expanded chat sheet still opens as a fixed 85dvh overlay from inside ChatWidget. */}
      <div className="shrink-0 relative z-50">
        <div className="max-w-md mx-auto w-full relative">
          <ChatWidget businessId={business.id} businessName={business.name} locale={locale} initialMessages={initialMessages} customGreeting={customGreeting} preview={isOwner} initialCreditsExhausted={(business.credit_balance ?? 0) <= 0} />
        </div>
      </div>
    </div>
  );
}
