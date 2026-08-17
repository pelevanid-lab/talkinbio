import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { createRateLimiter, generateCaseStudy, generateSignal } from '@/utils/kesfetSignal';

// Turns a search query into a saved, illustrative case-study narrative — the interactive
// counterpart to the static "Vaka Çalışması" teaser on /kesfet/[slug]. Reachable from three
// places (Arama Sinyali card, SIGNAL modeli card, and the Vaka Çalışması card itself), all
// hitting this one endpoint so every generated study lands in the same public gallery.

const isRateLimited = createRateLimiter(6);

const KNOWN_CATEGORY_SLUGS = new Set(['search-and-discovery']);

export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for') || 'anonymous';
  if (isRateLimited(clientIp)) {
    return NextResponse.json({ error: 'Çok fazla istek gönderildi. Biraz sonra tekrar dene.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({ query: '', categorySlug: '' }));
  const normalizedQuery = typeof body.query === 'string' ? body.query.trim() : '';
  const categorySlug = typeof body.categorySlug === 'string' ? body.categorySlug.trim() : '';

  if (!normalizedQuery) {
    return NextResponse.json({ error: 'Bir arama yazmalısın.' }, { status: 400 });
  }
  if (normalizedQuery.length > 140) {
    return NextResponse.json({ error: 'Arama çok uzun.' }, { status: 400 });
  }
  if (!KNOWN_CATEGORY_SLUGS.has(categorySlug)) {
    return NextResponse.json({ error: 'Geçersiz kategori.' }, { status: 400 });
  }

  const { signal } = await generateSignal(normalizedQuery);
  const caseStudy = await generateCaseStudy(normalizedQuery, signal);

  if (!caseStudy) {
    return NextResponse.json({ error: 'Vaka analizi şu an oluşturulamadı, biraz sonra tekrar dene.' }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from('kesfet_case_studies')
    .insert({
      category_slug: categorySlug,
      query: normalizedQuery,
      title: caseStudy.title,
      narrative: caseStudy.narrative,
      signal,
    })
    .select('id, query, title, narrative, signal, created_at')
    .single();

  if (error) {
    console.error('[kesfet/case-study] insert error:', error);
    return NextResponse.json({ error: 'Analiz oluşturuldu ama kaydedilemedi.' }, { status: 500 });
  }

  return NextResponse.json({ caseStudy: data });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get('slug') || '';

  if (!KNOWN_CATEGORY_SLUGS.has(categorySlug)) {
    return NextResponse.json({ error: 'Geçersiz kategori.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('kesfet_case_studies')
    .select('id, query, title, narrative, signal, created_at')
    .eq('category_slug', categorySlug)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    console.error('[kesfet/case-study] list error:', error);
    return NextResponse.json({ error: 'Vaka analizleri yüklenemedi.' }, { status: 500 });
  }

  return NextResponse.json({ caseStudies: data || [] });
}
