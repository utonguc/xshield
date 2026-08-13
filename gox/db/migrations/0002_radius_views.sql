-- goX migration 0002 — FreeRADIUS view'ları.
-- RADIUS, mac_entries + connection_profiles'i doğrudan okur (tek gerçek kaynak).
-- MAC karşılaştırması: mac::text PostgreSQL'de küçük harf + iki nokta (aa:bb:..).
-- Cihaz provizyon config'inde MikroTik küçük harf MAC gönderecek şekilde ayarlanır.

BEGIN;

-- radcheck: her MAC için Auth-Type (blacklist → Reject, diğer → Accept)
CREATE OR REPLACE VIEW radcheck AS
SELECT me.id                                                          AS id,
       me.mac::text                                                  AS username,
       'Auth-Type'                                                   AS attribute,
       CASE WHEN me.list_type = 'blacklist' THEN 'Reject' ELSE 'Accept' END AS value,
       ':='                                                          AS op
FROM mac_entries me;

-- radreply: kabul edilen MAC'ler için hız limiti + (varsa) oturum süresi
CREATE OR REPLACE VIEW radreply AS
-- Mikrotik-Rate-Limit = "<upload>k/<download>k" (rx=upload, tx=download)
SELECT (me.id * 10 + 1)                                              AS id,
       me.mac::text                                                  AS username,
       'Mikrotik-Rate-Limit'                                         AS attribute,
       (cp.rate_up_kbps::text || 'k/' || cp.rate_down_kbps::text || 'k') AS value,
       ':='                                                          AS op
FROM mac_entries me
JOIN connection_profiles cp ON cp.id = me.profile_id
WHERE me.list_type <> 'blacklist'
  AND cp.rate_up_kbps IS NOT NULL
  AND cp.rate_down_kbps IS NOT NULL
UNION ALL
-- Session-Timeout (saniye) — süreli profiller
SELECT (me.id * 10 + 2)                                              AS id,
       me.mac::text                                                  AS username,
       'Session-Timeout'                                             AS attribute,
       (cp.duration_min * 60)::text                                  AS value,
       ':='                                                          AS op
FROM mac_entries me
JOIN connection_profiles cp ON cp.id = me.profile_id
WHERE me.list_type <> 'blacklist'
  AND cp.duration_min IS NOT NULL;

COMMIT;
