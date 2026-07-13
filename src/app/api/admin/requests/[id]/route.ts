import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // 2. Find associated business and user to delete them
    if (request.status === 'approved') {
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('owner_id')
        .eq('username', request.username)
        .single();

      if (business?.owner_id) {
        // Delete user (this will cascade delete the business due to foreign key constraints)
        await supabaseAdmin.auth.admin.deleteUser(business.owner_id);
      }
    }

    // 3. Delete the request
    await supabaseAdmin.from('onboarding_requests').delete().eq('id', id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete Request Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
