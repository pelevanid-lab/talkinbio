import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get('admin_session')?.value !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Get Request
    const { data: request, error: reqError } = await supabaseAdmin
      .from('onboarding_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (reqError || !request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (request.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved requests can be resent' }, { status: 400 });
    }

    // 2. Generate and send magic link
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://talkinbio.com';
    
    // We just trigger signInWithOtp which sends the magic link to the user
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({ 
      email: request.email,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback`
      }
    });

    if (otpError) {
      throw otpError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Resend Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
