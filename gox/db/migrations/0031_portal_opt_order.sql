-- Karşılama ekranı giriş seçeneklerinin sırası (temp hariç; temp her zaman en altta ikincil link).
-- Virgülle ayrık anahtar listesi: ör. "staff,mernis,voucher,guest,meeting"
ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS opt_order TEXT NOT NULL DEFAULT '';
