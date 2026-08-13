-- ZTP fetch-tabanlı enrollment: cihaz kendi WG anahtarını üretir, pubkey'i geri bildirir.
ALTER TABLE devices ADD COLUMN IF NOT EXISTS enroll_token TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS enrolled     BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS devices_enroll_token ON devices(enroll_token) WHERE enroll_token IS NOT NULL;
