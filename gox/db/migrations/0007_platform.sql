-- goX migration 0007 — platform yönetimi (tenant alanları, ödemeler, ticketlar).
BEGIN;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS plan        TEXT DEFAULT 'standart';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sector      TEXT DEFAULT 'cafe';   -- hotel | cafe | office
ALTER TABLE customers ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(12,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS payments (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount      NUMERIC(12,2) NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'TRY',
    period      TEXT,                          -- ör. '2026-06'
    status      TEXT NOT NULL DEFAULT 'paid',  -- paid | pending | overdue
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subject     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'open',  -- open | closed
    priority    TEXT NOT NULL DEFAULT 'normal',-- low | normal | high
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id  BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author     TEXT NOT NULL,                  -- owner | customer
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
