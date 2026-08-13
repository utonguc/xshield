-- Plan kataloğu — platform (owner) tarafından yönetilir.
-- Faturalama modelleri:
--   flat       → sabit aylık ücret (base_fee)
--   per_room   → base_fee + per_unit_fee * max(0, oda_sayısı - included_units)   [otel]
--   per_device → base_fee + per_unit_fee * max(0, cihaz_sayısı - included_units)
CREATE TABLE IF NOT EXISTS plans (
	id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	name           text NOT NULL,
	sector         text NOT NULL DEFAULT 'all',      -- all | hotel | cafe | restaurant | office
	billing_model  text NOT NULL DEFAULT 'flat',     -- flat | per_room | per_device
	base_fee       numeric(12,2) NOT NULL DEFAULT 0, -- taban aylık ücret
	included_units int  NOT NULL DEFAULT 0,          -- tabana dahil oda/cihaz adedi
	per_unit_fee   numeric(12,2) NOT NULL DEFAULT 0, -- dahil üstü her oda/cihaz için
	max_devices    int  NOT NULL DEFAULT 0,          -- 0 = sınırsız
	max_locations  int  NOT NULL DEFAULT 0,          -- 0 = sınırsız
	features       text[] NOT NULL DEFAULT '{}',
	active         boolean NOT NULL DEFAULT true,
	sort           int NOT NULL DEFAULT 0,
	created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS plan_id    bigint REFERENCES plans(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS room_count int NOT NULL DEFAULT 0;

-- Başlangıç (referans) planları — owner panelinden düzenlenebilir.
INSERT INTO plans (name, sector, billing_model, base_fee, included_units, per_unit_fee, max_locations, features, sort)
SELECT * FROM (VALUES
	('Cafe Başlangıç',  'cafe',  'flat',     490.00,  0,  0.00, 1,
		ARRAY['Karşılama ekranı','SMS/Anket girişi','5651 loglama'], 10),
	('Cafe Pro',        'cafe',  'flat',     990.00,  0,  0.00, 3,
		ARRAY['Karşılama ekranı','Tüm giriş yöntemleri','QR Menü','Anket & geri bildirim','5651 loglama','Raporlar'], 20),
	('Otel Başlangıç',  'hotel', 'per_room', 750.00,  20, 15.00, 1,
		ARRAY['Oda bazlı erişim','PMS entegrasyonu','5651 loglama','Karşılama ekranı'], 30),
	('Otel Pro',        'hotel', 'per_room', 1500.00, 40, 18.00, 3,
		ARRAY['Oda bazlı erişim','PMS entegrasyonu','Çok lokasyon','Anket & geri bildirim','5651 loglama','Raporlar','Öncelikli destek'], 40),
	('Otel Enterprise', 'hotel', 'per_room', 3000.00, 80, 20.00, 0,
		ARRAY['Sınırsız lokasyon','PMS entegrasyonu','Özel raporlar','SLA & 7/24 destek','5651 loglama','Özel karşılama tasarımı'], 50)
) AS v(name, sector, billing_model, base_fee, included_units, per_unit_fee, max_locations, features, sort)
WHERE NOT EXISTS (SELECT 1 FROM plans);
