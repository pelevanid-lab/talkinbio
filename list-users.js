const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://spjylpncgisogfxuiodl.supabase.co',
  'sb_secret_DqvBDK0D4vnfc9xKc5AXKg_hds8jG02'
);

(async () => {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Error fetching users:", error);
    process.exit(1);
  }
  
  console.log("Registered Users:");
  users.forEach(u => console.log(u.email));
})();
