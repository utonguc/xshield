-- E-posta OTP ile misafir girişi (MERNIS bağımsız, mevcut SMTP altyapısı).
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS opt_email boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS email_otps (
	id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	site_id    bigint NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
	email      text   NOT NULL,
	mac        text   NOT NULL DEFAULT '',
	code       text   NOT NULL,
	attempts   int    NOT NULL DEFAULT 0,
	used       boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS email_otps_lookup ON email_otps (site_id, lower(email), created_at DESC);
