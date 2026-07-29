import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'https://spjylpncgisogfxuiodl.supabase.co',
  'sb_secret_DqvBDK0D4vnfc9xKc5AXKg_hds8jG02',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function check() {
  const { data, error } = await supabaseAdmin.storage.from('media').list('characters/_scene-refs');
  console.log(JSON.stringify({ data, error }, null, 2));
}

check();
