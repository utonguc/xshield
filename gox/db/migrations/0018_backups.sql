-- Cihaz config yedekleri (cihaz /export'u /tool fetch ile goX'a yükler; panelden indirilir)
CREATE TABLE IF NOT EXISTS device_backups (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id  BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    content    TEXT   NOT NULL,
    size       INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS device_backups_dev ON device_backups(device_id, id DESC);
