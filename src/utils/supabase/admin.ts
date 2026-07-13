import { createClient } from '@supabase/supabase-js';

// Used strictly on the server-side to bypass RLS when necessary (e.g. creating businesses on behalf of users, reading all requests)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
