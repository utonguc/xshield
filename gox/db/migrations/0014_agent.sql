-- goX cihaz ajanı: canlı metrik + hız limitini RADIUS'tan ajana taşıma
-- Neden: RouterOS hotspot mac oturumu RADIUS CoA'yı desteklemiyor (Error-Cause 406)
-- ve dinamik kuyruğu düzenlenemiyor. Hız limiti artık ajan tarafından
-- düzenlenebilir statik simple queue ile veriliyor => profil değişiminde oturum DÜŞMEZ.

-- 1) Canlı cihaz metrikleri (panel Genel Bakış buradan okur)
CREATE TABLE IF NOT EXISTS device_metrics (
    device_id    bigint PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    active_count int    NOT NULL DEFAULT 0,
    wan_rx_bps   bigint NOT NULL DEFAULT 0,
    wan_tx_bps   bigint NOT NULL DEFAULT 0,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 2) RADIUS yanıtından Mikrotik-Rate-Limit'i kaldır (Session-Timeout kalır).
--    Hız artık ajan tarafından statik queue ile uygulanıyor.
CREATE OR REPLACE VIEW radreply AS
SELECT me.id * 10 + 2 AS id,
       me.mac::text     AS username,
       'Session-Timeout'::text AS attribute,
       (cp.duration_min * 60)::text AS value,
       ':='::text       AS op
FROM mac_entries me
JOIN connection_profiles cp ON cp.id = me.profile_id
WHERE me.list_type <> 'blacklist'::text
  AND cp.duration_min IS NOT NULL;
