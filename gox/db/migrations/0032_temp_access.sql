-- Geçici (temp) erişim derinlemesine yönetim: link metni, süre (dk), cihaz-başına tek kullanım.
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS temp_label      TEXT NOT NULL DEFAULT '';
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS temp_minutes    INTEGER NOT NULL DEFAULT 120;
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS temp_once       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS temp_profile_id BIGINT REFERENCES connection_profiles(id) ON DELETE SET NULL;

-- Tek kullanımlık temp: cihaz (MAC) bir kez kullanınca tekrar göremez.
CREATE TABLE IF NOT EXISTS temp_usage (
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    mac     TEXT NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (site_id, mac)
);
