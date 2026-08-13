-- Çok-lokasyon: lokasyon (site) operasyonun ana birimi. Faz 1: lokasyon bağlamı + misafir/PMS lokasyon-bazlı.
-- Lokasyon yöneticisi: kullanıcıya sabit lokasyon (NULL = tenant admin, tüm lokasyonlar).
ALTER TABLE users ADD COLUMN IF NOT EXISTS site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL;

-- PMS misafirleri lokasyon-bazlı
ALTER TABLE pms_guests ADD COLUMN IF NOT EXISTS site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE;
UPDATE pms_guests g SET site_id = (SELECT id FROM sites WHERE customer_id = g.customer_id ORDER BY id LIMIT 1)
 WHERE site_id IS NULL;
CREATE INDEX IF NOT EXISTS pms_guests_site ON pms_guests(site_id);

-- PMS connector ayarı da lokasyon-bazlı (site_id eklendi; PK değişimi sonraki adımda)
ALTER TABLE pms_config ADD COLUMN IF NOT EXISTS site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE;
UPDATE pms_config c SET site_id = (SELECT id FROM sites WHERE customer_id = c.customer_id ORDER BY id LIMIT 1)
 WHERE site_id IS NULL;
