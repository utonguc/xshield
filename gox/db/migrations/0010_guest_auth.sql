-- goX migration 0010 — captive portal misafir doğrulama yöntemi + doğrulama logu.
BEGIN;

-- Portal misafir doğrulama yöntemi: none | mernis | pms (tenant yöneticisi seçer)
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS auth_method TEXT NOT NULL DEFAULT 'none';

-- Doğrulama logu (5651). KVKK: ham TC saklanmaz; kimlik = ad-soyad/oda.
CREATE TABLE IF NOT EXISTS guest_verifications (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
    site_id     BIGINT REFERENCES sites(id) ON DELETE SET NULL,
    method      TEXT,
    identity    TEXT,
    mac         TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
