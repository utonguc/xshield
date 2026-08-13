-- Walled garden (portal öncesi erişilebilen siteler) + içerik/port engelleme — cihaz bazlı,
-- goX'te merkezi tutulur (yeniden yapılandırmada silinmez, yedeğe girer).
CREATE TABLE IF NOT EXISTS walled_garden (
    id        SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL,
    host      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS walled_garden_dev_idx ON walled_garden(device_id);

CREATE TABLE IF NOT EXISTS block_rules (
    id        SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL,
    kind      TEXT NOT NULL,   -- domain | ip | port
    value     TEXT NOT NULL,
    note      TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS block_rules_dev_idx ON block_rules(device_id);
