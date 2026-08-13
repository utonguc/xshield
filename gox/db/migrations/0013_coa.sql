-- goX migration 0013 — CoA/Disconnect kuyruğu (canlı oturum müdahalesi).
BEGIN;
CREATE TABLE IF NOT EXISTS coa_queue (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_ip  TEXT NOT NULL,           -- cihazın wg IP'si (10.88.0.x)
    mac        TEXT NOT NULL,           -- hedef oturum (User-Name)
    action     TEXT NOT NULL DEFAULT 'disconnect',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_coa_pending ON coa_queue(id) WHERE sent_at IS NULL;
COMMIT;
