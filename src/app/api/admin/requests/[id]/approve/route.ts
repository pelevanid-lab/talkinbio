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

    if (request.status !== 'pending') {
      return NextResponse.json({ error: 'Already processed' }, { status: 400 });
    }

    // 2. Invite User (Creates Auth User & Sends Email)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://talkinbio.com';
    
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(request.email, {
      redirectTo: `${baseUrl}/auth/callback`
    });
    
    let userId = inviteData?.user?.id;

    // If user already exists, inviteUserByEmail might fail or return error. 
    // Fallback: try to just create a magic link to get the user ID, or assume they exist.
    const isAlreadyRegistered = inviteError && (
      (inviteError as any).code === 'email_exists' || 
      inviteError.message.includes('already')
    );

    if (isAlreadyRegistered) {
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: request.email,
        options: {
          redirectTo: `${baseUrl}/auth/callback`
        }
      });
      userId = linkData?.user?.id;
      
      // Send magic link email so they can login
      await supabaseAdmin.auth.signInWithOtp({ 
        email: request.email,
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback`
        }
      });
    } else if (inviteError) {
      throw inviteError;
    }

    if (!userId) {
      throw new Error("Could not determine user ID");
    }

    // 3. Create Business Profile
    const contactValues = JSON.stringify(
      Object.entries(request.contacts)
        .filter(([_, v]: any) => v.selected)
        .reduce((acc, [k, v]: any) => ({ ...acc, [k]: v.value }), {})
    );

    const contactMethods = Object.entries(request.contacts)
      .filter(([_, v]: any) => v.selected)
      .map(([k]) => k)
      .join(',');

    const { data: business, error: bizError } = await supabaseAdmin.from('businesses').insert({
      owner_id: userId,
      username: request.username,
      name: request.name,
      category: request.category,
      contact_method: contactMethods,
      contact_value: contactValues,
    }).select().single();

    if (bizError) {
      if (bizError.code === '23505') {
        console.warn('Business already exists, skipping creation for:', request.username);
      } else {
        throw bizError;
      }
    }

    // 4. Mark Request as Approved
    await supabaseAdmin.from('onboarding_requests').update({ status: 'approved' }).eq('id', id);

    return NextResponse.json({ success: true, business });
  } catch (err: any) {
    console.error('Approve Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
