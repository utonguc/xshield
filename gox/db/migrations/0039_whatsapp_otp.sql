-- WhatsApp ile giriş (misafir-başlatan, token'lı). Misafir goX numarasına GOX-<token>
-- mesajı gönderir; Meta webhook'u numarayı + token'ı iletir; eşleşince doğrulanır.
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS opt_whatsapp boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS whatsapp_otps (
	id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	site_id    bigint NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
	mac        text   NOT NULL DEFAULT '',
	token      text   NOT NULL UNIQUE,
	phone      text   NOT NULL DEFAULT '',
	verified   boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS whatsapp_otps_token ON whatsapp_otps (token);
