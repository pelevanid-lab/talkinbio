-- İşletme sahibi her talep/müşteri kaydına kendi serbest notunu düşebilsin
-- (transkriptten bağımsız, yalnızca sahibin gördüğü).
alter table public.leads add column notes text;
