-- goX migration 0006 — anket modülü.
BEGIN;

CREATE TABLE IF NOT EXISTS surveys (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'draft',   -- draft | active
    frequency   TEXT NOT NULL DEFAULT 'once',    -- once | periodic
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_questions (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    survey_id BIGINT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    position  INT NOT NULL DEFAULT 0,
    qtype     TEXT NOT NULL,                     -- rating | choice | text
    text      TEXT NOT NULL,
    options   JSONB                              -- choice için seçenekler
);

CREATE TABLE IF NOT EXISTS survey_responses (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    survey_id    BIGINT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    mac          MACADDR,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_answers (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    response_id BIGINT NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
    value       TEXT
);

COMMIT;
