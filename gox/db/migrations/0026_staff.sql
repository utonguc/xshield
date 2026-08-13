-- Personel hesapları: lokasyon bazlı, kullanıcı adı + parola ile portal "Personel girişi".
-- PMS/İK entegrasyonu yoksa lokasyon yöneticisi buradan personel oluşturup şifre atar.
CREATE TABLE IF NOT EXISTS staff (
    id            SERIAL PRIMARY KEY,
    site_id       INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    full_name     TEXT NOT NULL,
    username      TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    title         TEXT NOT NULL DEFAULT '',
    active        BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_site_idx ON staff(site_id);
CREATE UNIQUE INDEX IF NOT EXISTS staff_site_username_idx ON staff (site_id, lower(username));
