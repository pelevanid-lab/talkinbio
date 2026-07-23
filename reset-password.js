const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://spjylpncgisogfxuiodl.supabase.co',
  'sb_secret_DqvBDK0D4vnfc9xKc5AXKg_hds8jG02'
);

(async () => {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '51ace037-2985-4351-b82b-fe4a85f6469a',
    { password: 'admin123' }
  );
  
  if (error) {
    console.error("Error updating user:", error);
    process.exit(1);
  }
  
  console.log("Password updated successfully!");
})();
