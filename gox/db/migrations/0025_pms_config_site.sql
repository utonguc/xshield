-- PMS connector ayarı lokasyon-bazlı: PK customer_id → site_id (her lokasyon kendi PMS bağlantısı).
DELETE FROM pms_config WHERE site_id IS NULL;
ALTER TABLE pms_config DROP CONSTRAINT IF EXISTS pms_config_pkey;
ALTER TABLE pms_config ADD CONSTRAINT pms_config_site_pkey PRIMARY KEY (site_id);
