import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function test() {
  console.log("Fetching pending requests...");
  const { data: requests, error: reqError } = await supabaseAdmin
    .from('onboarding_requests')
    .select('*')
    .eq('status', 'pending');

  if (reqError) {
    console.error("Error fetching requests:", reqError);
    return;
  }

  console.log("Pending requests:", requests.map(r => r.email));

  const request = requests.find(r => r.email === 'pelevanid@gmail.com');
  if (!request) {
    console.log("Request not found for pelevanid@gmail.com");
    return;
  }

  console.log("Processing request for:", request.email);

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://talkinbio.com';
    
    // 2. Invite User (Creates Auth User & Sends Email)
    console.log("Inviting user...");
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(request.email, {
      redirectTo: `${baseUrl}/`
    });
    
    let userId = inviteData?.user?.id;
    console.log("Invite result:", { userId, error: inviteError });

    const isAlreadyRegistered = inviteError && (
      (inviteError as any).code === 'email_exists' || 
      inviteError.message.includes('already')
    );

    if (isAlreadyRegistered) {
      console.log("User already registered, generating link...");
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: request.email,
        options: {
          redirectTo: `${baseUrl}/`
        }
      });
      console.log("Link data:", linkData, "Link error:", linkError);
      if (linkError) throw linkError;
      userId = linkData?.user?.id;
      
      console.log("Sending magic link email...");
      const { error: signInError } = await supabaseAdmin.auth.signInWithOtp({ 
        email: request.email,
        options: {
          emailRedirectTo: `${baseUrl}/`
        }
      });
      console.log("Sign in error:", signInError);
      if (signInError) throw signInError;
    } else if (inviteError) {
      throw inviteError;
    }

    if (!userId) {
      throw new Error("Could not determine user ID");
    }

    console.log("User ID:", userId);

    // 3. Create Business Profile
    const contactValues = JSON.stringify(
      Object.entries(request.contacts)
        .filter(([_, v]) => (v as any).selected)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: (v as any).value }), {})
    );

    const contactMethods = Object.entries(request.contacts)
      .filter(([_, v]) => (v as any).selected)
      .map(([k]) => k)
      .join(',');

    console.log("Creating business profile...");
    const { data: business, error: bizError } = await supabaseAdmin.from('businesses').insert({
      owner_id: userId,
      username: request.username,
      name: request.name,
      category: request.category,
      contact_method: contactMethods,
      contact_value: contactValues,
    }).select().single();

    console.log("Business creation result:", { business, error: bizError });
    if (bizError) throw bizError;

    console.log("Success! Not updating the real request status for safety.");

  } catch (err) {
    console.error("Caught error:", err);
  }
}

test();
