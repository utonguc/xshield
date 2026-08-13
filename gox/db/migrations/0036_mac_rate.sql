-- Tek cihaza özel hız sınırı: mac_entries üstünde profilden bağımsız hız override.
-- Ajan reconcile_queues COALESCE(m.rate, cp.rate) ile uygular (oturum düşmeden).
ALTER TABLE mac_entries ADD COLUMN IF NOT EXISTS rate_up_kbps   INTEGER;
ALTER TABLE mac_entries ADD COLUMN IF NOT EXISTS rate_down_kbps INTEGER;
