-- Cihazların güncel DHCP havuzu (ajan her döngüde tazeler). Erişim listesinde
-- MAC'i elle yazmak yerine bağlı cihazlardan arayıp seçebilmek için.
CREATE TABLE IF NOT EXISTS dhcp_leases (
    device_id  INTEGER NOT NULL,
    site_id    INTEGER NOT NULL,
    mac        TEXT NOT NULL,
    ip         TEXT,
    host       TEXT,
    status     TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (device_id, mac)
);
CREATE INDEX IF NOT EXISTS dhcp_leases_site_idx ON dhcp_leases(site_id);
