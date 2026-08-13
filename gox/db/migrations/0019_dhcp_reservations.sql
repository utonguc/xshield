-- DHCP IP rezervasyonları goX'ta merkezi (cihaz-local değil) → yedeğe girer, cihaz değişse de geri yüklenir.
CREATE TABLE IF NOT EXISTS dhcp_reservations (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id  BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    mac        MACADDR NOT NULL,
    ip         INET    NOT NULL,
    hostname   TEXT,
    note       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (device_id, mac)
);
CREATE INDEX IF NOT EXISTS dhcp_reservations_dev ON dhcp_reservations(device_id);
