-- Add saule_settings JSONB column to businesses table
alter table public.businesses 
  add column if not exists saule_settings jsonb default '{}'::jsonb;

-- Example saule_settings structure:
-- {
--   "appointmentEnabled": true,
--   "appointmentInstructions": "Lütfen gün ve saat tercihinizi belirtin",
--   "leadCaptureEnabled": true,
--   "notificationEmail": "owner@example.com", -- lead alert recipient; falls back to contact_value.email when unset
--   "customGreeting": null,
--   "personalityTone": "friendly"  -- "friendly" | "formal" | "energetic"
-- }
