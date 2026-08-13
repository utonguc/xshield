-- goX migration 0011 — captive portal logo + tema.
BEGIN;
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS logo  TEXT;                 -- data URL (base64)
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'editorial'; -- editorial | dark | soft | minimal
COMMIT;
