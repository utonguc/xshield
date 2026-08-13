-- Karşılama portalı: İngilizce metin (dil seçimi), KVKK aydınlatma/onay metni,
-- giriş sonrası yönlendirme URL'si.
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS welcome_title_en TEXT NOT NULL DEFAULT '';
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS welcome_text_en  TEXT NOT NULL DEFAULT '';
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS kvkk_text        TEXT NOT NULL DEFAULT '';
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS redirect_url     TEXT NOT NULL DEFAULT '';
