-- İzleme: anlık metrik alanlarını genişlet + zaman-serisi geçmiş (grafikler için)
ALTER TABLE device_metrics ADD COLUMN IF NOT EXISTS cpu_load  INTEGER;
ALTER TABLE device_metrics ADD COLUMN IF NOT EXISTS mem_used  BIGINT;
ALTER TABLE device_metrics ADD COLUMN IF NOT EXISTS mem_total BIGINT;
ALTER TABLE device_metrics ADD COLUMN IF NOT EXISTS uptime_s  BIGINT;

CREATE TABLE IF NOT EXISTS device_metrics_history (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id    BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    ts           TIMESTAMPTZ NOT NULL DEFAULT now(),
    active_count INTEGER,
    wan_rx_bps   BIGINT,
    wan_tx_bps   BIGINT,
    cpu_load     INTEGER,
    mem_pct      INTEGER
);
CREATE INDEX IF NOT EXISTS dmh_dev_ts ON device_metrics_history(device_id, ts DESC);
