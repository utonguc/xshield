-- Voucher (kod ile giriş): sistem kod üretir; admin isim + bitiş süresi + kullanıcı adedi
-- + hız limiti girer. Misafir portalda kodu girerek bağlanır. Hız limiti, voucher'a özel
-- otomatik oluşturulan connection_profile üstünden ajan queue'suyla uygulanır.
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS opt_voucher BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS vouchers (
    id          SERIAL PRIMARY KEY,
    site_id     INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    code        TEXT NOT NULL UNIQUE,
    profile_id  BIGINT REFERENCES connection_profiles(id) ON DELETE SET NULL,
    max_users   INTEGER,             -- NULL = sınırsız
    expires_at  TIMESTAMPTZ,         -- NULL = süresiz
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vouchers_site_idx ON vouchers(site_id);

CREATE TABLE IF NOT EXISTS voucher_redemptions (
    id          SERIAL PRIMARY KEY,
    voucher_id  INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    mac         TEXT NOT NULL,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (voucher_id, mac)
);
