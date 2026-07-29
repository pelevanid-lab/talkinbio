import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin.storage.from('media').list('characters/_scene-refs');
  return NextResponse.json({ data, error });
}
