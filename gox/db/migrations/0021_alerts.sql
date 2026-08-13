-- Uyarı/alarm: eşik ayarları (müşteri bazlı) + alarm kayıtları
CREATE TABLE IF NOT EXISTS alert_settings (
    customer_id    BIGINT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    enabled        BOOLEAN NOT NULL DEFAULT true,
    offline_sec    INTEGER NOT NULL DEFAULT 120,   -- bu kadar sn yanıt yoksa çevrimdışı
    cpu_pct        INTEGER NOT NULL DEFAULT 90,
    mem_pct        INTEGER NOT NULL DEFAULT 90,
    telegram_token TEXT,
    telegram_chat  TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id    BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    customer_id  BIGINT NOT NULL,
    type         TEXT NOT NULL,                     -- offline | high_cpu | high_mem
    severity     TEXT NOT NULL DEFAULT 'warning',   -- warning | critical
    message      TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'active',    -- active | resolved
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at  TIMESTAMPTZ
);
-- Cihaz + tip başına en fazla 1 aktif alarm
CREATE UNIQUE INDEX IF NOT EXISTS alerts_active_ux ON alerts(device_id, type) WHERE status='active';
CREATE INDEX IF NOT EXISTS alerts_cust ON alerts(customer_id, started_at DESC);
