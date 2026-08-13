-- goX migration 0008 — PMS entegrasyon çerçevesi (otel) + QR menü (cafe).
BEGIN;

-- ── PMS ──
CREATE TABLE IF NOT EXISTS pms_config (
    customer_id BIGINT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    provider    TEXT NOT NULL DEFAULT 'manual',  -- manual | sedna | elektra
    endpoint    TEXT,
    api_key     TEXT,
    hotel_code  TEXT,
    enabled     BOOLEAN NOT NULL DEFAULT false,
    last_sync   TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pms_guests (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    room        TEXT,
    full_name   TEXT,
    surname     TEXT,
    checkin     DATE,
    checkout    DATE,
    source      TEXT NOT NULL DEFAULT 'manual',  -- manual | sedna | elektra
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pms_guests_cust ON pms_guests(customer_id);

-- ── QR Menü ──
CREATE TABLE IF NOT EXISTS menu_categories (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    position    INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS menu_items (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    price       NUMERIC(10,2) NOT NULL DEFAULT 0,
    position    INT NOT NULL DEFAULT 0,
    available   BOOLEAN NOT NULL DEFAULT true
);

COMMIT;
