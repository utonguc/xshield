-- Tünel üstünden kapsamlı cihaz yönetimi: komut kuyruğu + cihaz yetenek/durum alanları

-- Panelden tetiklenen aksiyonlar; gox_wg ajanı REST ile uygular, sonucu yazar.
CREATE TABLE IF NOT EXISTS device_commands (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id   BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    action      TEXT   NOT NULL,                 -- info | apply_network | reboot | shutdown | backup | ssid | dhcp ...
    params      JSONB  NOT NULL DEFAULT '{}',
    status      TEXT   NOT NULL DEFAULT 'pending',-- pending | running | done | error
    result      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at  TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS device_commands_pending ON device_commands(device_id) WHERE status='pending';

-- Cihaz yetenek/durum (ajan REST ile tespit edip yazar)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS board_name   TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS ros_detected TEXT;     -- cihazdan okunan gerçek sürüm
ALTER TABLE devices ADD COLUMN IF NOT EXISTS has_wifi     BOOLEAN;  -- AP yeteneği var mı
ALTER TABLE devices ADD COLUMN IF NOT EXISTS wifi_kind    TEXT;     -- wireless | wifi (wave2) | NULL
ALTER TABLE devices ADD COLUMN IF NOT EXISTS provisioned  BOOLEAN NOT NULL DEFAULT false; -- guest network kuruldu mu
ALTER TABLE devices ADD COLUMN IF NOT EXISTS wifi_bridge  BOOLEAN NOT NULL DEFAULT true;  -- wlan misafir ağına dahil edilsin mi (opsiyonel)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS ssid         TEXT;     -- misafir SSID (AP'li cihazlar)
