-- goX migration 0009 — Misafir Geri Bildirim (MGB).
BEGIN;
CREATE TABLE IF NOT EXISTS feedback (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    site_id     BIGINT REFERENCES sites(id) ON DELETE SET NULL,
    rating      INT,
    comment     TEXT,
    guest_name  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_cust ON feedback(customer_id);
COMMIT;
