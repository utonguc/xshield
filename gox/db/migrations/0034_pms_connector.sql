-- PMS entegrasyon modları:
--  manual    : elle/CSV (mevcut)
--  connector : A şıkkı — otelde DB erişimli makinede script çalışır, goX'e PUSH eder (NAT dostu)
--  tunnel    : B şıkkı — goX ajanı mevcut WireGuard tüneli üzerinden DB'yi PULL eder (ekstra makine yok)
ALTER TABLE pms_config ADD COLUMN IF NOT EXISTS conn_mode     TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE pms_config ADD COLUMN IF NOT EXISTS push_token    TEXT;
ALTER TABLE pms_config ADD COLUMN IF NOT EXISTS db_kind       TEXT NOT NULL DEFAULT 'sqlserver'; -- sqlserver|mysql|firebird|postgres
ALTER TABLE pms_config ADD COLUMN IF NOT EXISTS db_host       TEXT NOT NULL DEFAULT '';
ALTER TABLE pms_config ADD COLUMN IF NOT EXISTS db_port       INTEGER;
ALTER TABLE pms_config ADD COLUMN IF NOT EXISTS db_name       TEXT NOT NULL DEFAULT '';
ALTER TABLE pms_config ADD COLUMN IF NOT EXISTS db_user       TEXT NOT NULL DEFAULT '';
ALTER TABLE pms_config ADD COLUMN IF NOT EXISTS db_pass       TEXT NOT NULL DEFAULT '';
ALTER TABLE pms_config ADD COLUMN IF NOT EXISTS db_query      TEXT NOT NULL DEFAULT '';
ALTER TABLE pms_config ADD COLUMN IF NOT EXISTS last_pull     TIMESTAMPTZ;
ALTER TABLE pms_config ADD COLUMN IF NOT EXISTS last_pull_msg TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS pms_config_push_token_idx ON pms_config(push_token) WHERE push_token IS NOT NULL;
