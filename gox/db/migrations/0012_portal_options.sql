-- goX migration 0012 — MERNIS bir giriş seçeneği (opt_mernis). PMS otomatik (sektöre göre).
BEGIN;
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS opt_mernis BOOLEAN NOT NULL DEFAULT false;
COMMIT;
