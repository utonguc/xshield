-- 5651 sayılı kanun: toplu kullanım sağlayıcı erişim kayıtları + RFC 3161 zaman damgası.
-- access_logs: append-only, hash-zincirli (tamper-evident) erişim olay kaydı.
-- log_timestamps: müşteri bazlı, bir log aralığını TSA zaman damgasıyla mühürleyen çapa.
-- tsa_config: tek satır global TSA (TÜBİTAK Kamu SM vb.) abonelik ayarı — panelden doldurulur.

CREATE TABLE IF NOT EXISTS access_logs (
    id          BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    site_id     INTEGER REFERENCES sites(id) ON DELETE SET NULL,
    device_id   INTEGER,
    ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
    mac         TEXT,
    ip          TEXT,
    identity    TEXT NOT NULL DEFAULT '',
    method      TEXT NOT NULL DEFAULT '',
    event       TEXT NOT NULL DEFAULT 'login',
    prev_hash   TEXT NOT NULL DEFAULT '',
    row_hash    TEXT NOT NULL,
    stamped     BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS access_logs_cust_ts_idx ON access_logs(customer_id, ts);
CREATE INDEX IF NOT EXISTS access_logs_unstamped_idx ON access_logs(customer_id, id) WHERE stamped = false;

CREATE TABLE IF NOT EXISTS log_timestamps (
    id          BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    from_id     BIGINT NOT NULL,
    to_id       BIGINT NOT NULL,
    row_count   INTEGER NOT NULL DEFAULT 0,
    hash_alg    TEXT NOT NULL DEFAULT 'sha256',
    digest      TEXT NOT NULL,
    token       BYTEA,
    tsa_url     TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',
    detail      TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS log_timestamps_cust_idx ON log_timestamps(customer_id, id);

CREATE TABLE IF NOT EXISTS tsa_config (
    id         INTEGER PRIMARY KEY DEFAULT 1,
    enabled    BOOLEAN NOT NULL DEFAULT false,
    url        TEXT NOT NULL DEFAULT '',
    username   TEXT NOT NULL DEFAULT '',
    password   TEXT NOT NULL DEFAULT '',
    hash_alg   TEXT NOT NULL DEFAULT 'sha256',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tsa_config_single CHECK (id = 1)
);
INSERT INTO tsa_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
