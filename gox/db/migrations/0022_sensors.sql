-- Sensör izleme: sıcaklık (ayrı kolon, alarm/grafik) + tüm sensörler (esnek JSONB, model-bağımsız)
ALTER TABLE device_metrics ADD COLUMN IF NOT EXISTS temp_c  INTEGER;
ALTER TABLE device_metrics ADD COLUMN IF NOT EXISTS sensors JSONB;
ALTER TABLE device_metrics_history ADD COLUMN IF NOT EXISTS temp_c INTEGER;
ALTER TABLE alert_settings ADD COLUMN IF NOT EXISTS temp_c INTEGER NOT NULL DEFAULT 75;
