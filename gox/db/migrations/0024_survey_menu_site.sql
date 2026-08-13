-- Anketler ve QR menü lokasyon-bazlı
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE;
UPDATE surveys s SET site_id = (SELECT id FROM sites WHERE customer_id = s.customer_id ORDER BY id LIMIT 1)
 WHERE site_id IS NULL;

ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE;
UPDATE menu_categories c SET site_id = (SELECT id FROM sites WHERE customer_id = c.customer_id ORDER BY id LIMIT 1)
 WHERE site_id IS NULL;
