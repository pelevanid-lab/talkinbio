import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Minimal validation
    if (!data.accountEmail || !data.name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a default username base
    const baseUsername = data.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const username = baseUsername + Math.floor(Math.random() * 10000);

    const { error } = await supabaseAdmin.from('onboarding_requests').insert({
      email: data.accountEmail,
      username: username,
      name: data.name,
      category: data.category || '',
      contacts: data.contacts || {}
    });

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Request Access error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
