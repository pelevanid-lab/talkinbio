const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://spjylpncgisogfxuiodl.supabase.co',
  'sb_secret_DqvBDK0D4vnfc9xKc5AXKg_hds8jG02'
);

(async () => {
  const { data: businesses, error } = await supabase.from('businesses').select('*');
  
  if (error) {
    console.error("Error fetching businesses:", error);
    process.exit(1);
  }
  
  console.log("Businesses:", businesses.map(b => ({ id: b.id, name: b.name, user_id: b.user_id })));
})();
