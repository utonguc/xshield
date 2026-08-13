-- goX migration 0003 — cihaz WG anahtarı + ayar tablosu.
BEGIN;

-- Cihazın WireGuard private key'i (provizyon config'ine gömülür).
ALTER TABLE devices ADD COLUMN IF NOT EXISTS wg_privkey TEXT;

-- Genel ayarlar (örn. gox_wg sunucu public key'i).
CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
