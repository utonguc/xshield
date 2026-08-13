-- Erişim profilleri tesis (lokasyon) bazlı: site_id eklenir. NULL = eski/legacy (tüm lokasyonlar).
ALTER TABLE connection_profiles ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS connection_profiles_site_idx ON connection_profiles(site_id);

-- Geçici erişim hız limiti (süre zaten temp_minutes); böylece temp tek yerde (Geçici Erişim sekmesi) yönetilir.
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS temp_rate_down_kbps INTEGER;
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS temp_rate_up_kbps   INTEGER;
