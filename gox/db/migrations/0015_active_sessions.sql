-- Cihaz ajanı tarafından yazılan canlı aktif oturumlar (panel Genel Bakış "şu an bağlı" listesi)
CREATE TABLE IF NOT EXISTS active_sessions (
    device_id   BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    mac         TEXT   NOT NULL,
    ip          TEXT,
    uptime_s    INTEGER NOT NULL DEFAULT 0,
    time_left_s INTEGER,                 -- NULL = sınırsız (ör. personel)
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (device_id, mac)
);
