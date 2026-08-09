import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CloudflareEmbeddingProvider, FakeEmbeddingProvider } from '@/utils/semantic/embeddingProvider';
import { buildSemanticIndex } from '@/utils/semantic/indexer';
import { getBusinessFromRequest } from '@/utils/businessAuth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;

    // Bulgu (stabilizasyon taraması): service-role client kullanıyor (RLS'i atlar)
    // ve hiçbir sahiplik kontrolü yoktu — businessId'yi bilen herkes başka bir
    // işletme için pahalı bir embedding reindex tetikleyebilirdi.
    const authedBusiness = await getBusinessFromRequest();
    if (!authedBusiness || authedBusiness.id !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const publishVersion = body.publishVersion || 'draft';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const hasCF = !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);

    const embeddingProvider = hasCF
      ? new CloudflareEmbeddingProvider()
      : new FakeEmbeddingProvider();

    const result = await buildSemanticIndex({
      supabase,
      businessId,
      publishVersion,
      embeddingProvider,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Reindexing semantic route failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
