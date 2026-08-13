-- goX migration 0005 — captive portal (karşılama ekranı) ayarları (site bazlı).
BEGIN;

CREATE TABLE IF NOT EXISTS portal_settings (
    site_id       BIGINT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
    brand_name    TEXT NOT NULL DEFAULT 'goX',
    welcome_title TEXT NOT NULL DEFAULT 'Hoş geldiniz',
    welcome_text  TEXT NOT NULL DEFAULT 'İnternete bağlanmak için bir seçenek seçin',
    primary_color TEXT NOT NULL DEFAULT '#C7F24E',
    opt_guest     BOOLEAN NOT NULL DEFAULT true,
    opt_staff     BOOLEAN NOT NULL DEFAULT false,
    opt_meeting   BOOLEAN NOT NULL DEFAULT false,
    opt_temp      BOOLEAN NOT NULL DEFAULT true,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
