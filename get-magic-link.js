const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://spjylpncgisogfxuiodl.supabase.co',
  'sb_secret_DqvBDK0D4vnfc9xKc5AXKg_hds8jG02'
);

(async () => {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: 'enes@talkinbio.com',
  });
  
  if (error) {
    console.error("Error generating link:", error);
    process.exit(1);
  }
  
  console.log("Magic Link:");
  console.log(data.properties.action_link);
})();
