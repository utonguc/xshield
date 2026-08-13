-- goX şema v1 — Faz 0 temeli. Değişiklikler migration ile (elle prod düzenleme YOK).
-- Çalışan ortam VPS; bu dosya gox_db init + migration kaynağı.

BEGIN;

-- ── Müşteriler (goX'i kullanan işletmeler) ──────────────────
CREATE TABLE IF NOT EXISTS customers (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'active',   -- active | suspended
    plan        TEXT DEFAULT 'standart',
    sector      TEXT DEFAULT 'cafe',              -- hotel | cafe | office
    monthly_fee NUMERIC(12,2) DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Platform: ödemeler & ticketlar ──
CREATE TABLE IF NOT EXISTS payments (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount      NUMERIC(12,2) NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'TRY',
    period      TEXT,
    status      TEXT NOT NULL DEFAULT 'paid',
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tickets (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subject     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'open',
    priority    TEXT NOT NULL DEFAULT 'normal',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ticket_messages (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id  BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author     TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Panel kullanıcıları (müşteri personeli + owner) ─────────
CREATE TABLE IF NOT EXISTS users (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id  BIGINT REFERENCES customers(id) ON DELETE CASCADE, -- NULL = platform owner
    email        TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'customer_admin', -- owner | customer_admin | location_manager
    site_id      BIGINT REFERENCES sites(id) ON DELETE SET NULL, -- dolu = lokasyon yöneticisi (sabit)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Sahalar (müşteri lokasyonu: ofis/otel/cafe) ─────────────
CREATE TABLE IF NOT EXISTS sites (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id  BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── MikroTik cihazları ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id         BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    routeros_ver    TEXT,                       -- '6' | '7'
    api_kind        TEXT,                       -- 'rest' | 'binary'
    wg_pubkey       TEXT,                       -- cihazın WireGuard public key'i
    wg_privkey      TEXT,                       -- cihazın WG private key'i (provizyon config'ine gömülür)
    wg_ip           INET,                       -- tünel içi yönetim IP'si
    -- Sihirbaz alanları
    wan_mode        TEXT DEFAULT 'dhcp',        -- dhcp | static
    wan_interface   TEXT DEFAULT 'ether1',
    wan_ip          TEXT,                       -- statik: CIDR
    wan_gateway     TEXT,
    lan_interfaces  TEXT DEFAULT 'ether2,ether3,ether4,ether5',
    lan_subnet      TEXT DEFAULT '172.16.0.0/16',
    dns_servers     TEXT DEFAULT '8.8.8.8,1.1.1.1',
    admin_user      TEXT,
    admin_password  TEXT,
    last_seen       TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'pending', -- pending | online | offline
    -- Ajan tarafından tespit edilen yetenek/durum (tünel üstünden)
    board_name      TEXT,
    ros_detected    TEXT,
    has_wifi        BOOLEAN,
    wifi_kind       TEXT,                       -- wireless | wifi (wave2)
    provisioned     BOOLEAN NOT NULL DEFAULT false, -- misafir ağı kuruldu mu
    wifi_bridge     BOOLEAN NOT NULL DEFAULT true,  -- wlan misafir ağına dahil (opsiyonel)
    ssid            TEXT,
    enroll_token    TEXT,                       -- ZTP enrollment token (tek satır onboarding)
    enrolled        BOOLEAN NOT NULL DEFAULT false, -- cihaz kendi anahtarını üretip bildirdi mi
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Panelden tetiklenen cihaz komutları; gox_wg ajanı REST ile uygular
CREATE TABLE IF NOT EXISTS device_commands (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id   BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    action      TEXT   NOT NULL,
    params      JSONB  NOT NULL DEFAULT '{}',
    status      TEXT   NOT NULL DEFAULT 'pending', -- pending | running | done | error
    result      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at  TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

-- Cihaz config yedekleri (şu an indirme goX-üretimli config kullanıyor; tablo ileride cihaz-state için)
CREATE TABLE IF NOT EXISTS device_backups (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id  BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    content    TEXT   NOT NULL,
    size       INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DHCP IP rezervasyonları (goX-merkezi; yedeğe girer, cihaz değişse de geri yüklenir)
CREATE TABLE IF NOT EXISTS dhcp_reservations (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id  BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    mac        MACADDR NOT NULL,
    ip         INET    NOT NULL,
    hostname   TEXT,
    note       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (device_id, mac)
);

-- ── Bağlantı profilleri (süre + hız limiti) ─────────────────
-- Merkezi RADIUS'a yansır; "cihazda sabit" görünür ama kaynağı burası.
CREATE TABLE IF NOT EXISTS connection_profiles (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id   BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,               -- 'Misafir', 'Personel', 'Toplantı', 'Geçici 2sa'
    kind          TEXT NOT NULL,               -- guest | staff | meeting | temporary
    duration_min  INTEGER,                     -- NULL = süresiz; geçici için örn. 120
    rate_up_kbps  INTEGER,                     -- Mikrotik-Rate-Limit upload
    rate_down_kbps INTEGER,                    -- Mikrotik-Rate-Limit download
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── MAC kayıtları (profil eşleme + whitelist/blacklist) ─────
CREATE TABLE IF NOT EXISTS mac_entries (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id       BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    mac           MACADDR NOT NULL,
    profile_id    BIGINT REFERENCES connection_profiles(id) ON DELETE SET NULL,
    list_type     TEXT NOT NULL DEFAULT 'normal', -- normal | whitelist | blacklist
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (site_id, mac)
);

-- ── Genel ayarlar (gox_wg sunucu pubkey'i vb.) ──
CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Captive portal (karşılama ekranı) ayarları ──
CREATE TABLE IF NOT EXISTS portal_settings (
    site_id       BIGINT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
    brand_name    TEXT NOT NULL DEFAULT 'goX',
    welcome_title TEXT NOT NULL DEFAULT 'Hoş geldiniz',
    welcome_text  TEXT NOT NULL DEFAULT 'İnternete bağlanmak için bir seçenek seçin',
    primary_color TEXT NOT NULL DEFAULT '#C7F24E',
    opt_guest     BOOLEAN NOT NULL DEFAULT true,
    opt_staff     BOOLEAN NOT NULL DEFAULT false,
    opt_meeting   BOOLEAN NOT NULL DEFAULT false,
    opt_temp      BOOLEAN NOT NULL DEFAULT true,
    auth_method   TEXT NOT NULL DEFAULT 'none',     -- (kullanım dışı, geriye uyum)
    opt_mernis    BOOLEAN NOT NULL DEFAULT false,   -- "TC ile giriş" seçeneği
    logo          TEXT,                             -- data URL (base64)
    theme         TEXT NOT NULL DEFAULT 'editorial',-- editorial | dark | soft | minimal
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS guest_verifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
    site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
    method TEXT, identity TEXT, mac TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Anketler ──
CREATE TABLE IF NOT EXISTS surveys (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    site_id     BIGINT REFERENCES sites(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'draft',
    frequency   TEXT NOT NULL DEFAULT 'once',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS survey_questions (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    survey_id BIGINT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    position  INT NOT NULL DEFAULT 0,
    qtype     TEXT NOT NULL,
    text      TEXT NOT NULL,
    options   JSONB
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

-- ── Misafir Geri Bildirim (MGB) ──
CREATE TABLE IF NOT EXISTS feedback (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
    rating INT, comment TEXT, guest_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PMS (otel) ──
CREATE TABLE IF NOT EXISTS pms_config (
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    site_id     BIGINT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE, -- per-lokasyon connector
    provider    TEXT NOT NULL DEFAULT 'manual',
    endpoint    TEXT, api_key TEXT, hotel_code TEXT,
    enabled     BOOLEAN NOT NULL DEFAULT false,
    last_sync   TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pms_guests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
    room TEXT, full_name TEXT, surname TEXT, checkin DATE, checkout DATE,
    source TEXT NOT NULL DEFAULT 'manual', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── QR Menü (cafe) ──
CREATE TABLE IF NOT EXISTS menu_categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL, position INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS menu_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL, description TEXT, price NUMERIC(10,2) NOT NULL DEFAULT 0,
    position INT NOT NULL DEFAULT 0, available BOOLEAN NOT NULL DEFAULT true
);

-- ── CoA/Disconnect kuyruğu (canlı oturum müdahalesi) ──
CREATE TABLE IF NOT EXISTS coa_queue (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_ip TEXT NOT NULL, mac TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'disconnect',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), sent_at TIMESTAMPTZ
);

-- Cihaz ajanı (gox_wg) tarafından yazılan canlı metrikler (panel Genel Bakış okur)
CREATE TABLE IF NOT EXISTS device_metrics (
    device_id    BIGINT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    active_count INTEGER NOT NULL DEFAULT 0,
    wan_rx_bps   BIGINT  NOT NULL DEFAULT 0,
    wan_tx_bps   BIGINT  NOT NULL DEFAULT 0,
    cpu_load     INTEGER,
    mem_used     BIGINT,
    mem_total    BIGINT,
    uptime_s     BIGINT,
    temp_c       INTEGER,
    sensors      JSONB,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- İzleme zaman-serisi (grafikler; ~30s, 24 saat retention)
CREATE TABLE IF NOT EXISTS device_metrics_history (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id    BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    ts           TIMESTAMPTZ NOT NULL DEFAULT now(),
    active_count INTEGER, wan_rx_bps BIGINT, wan_tx_bps BIGINT, cpu_load INTEGER, mem_pct INTEGER, temp_c INTEGER
);

-- Uyarı/alarm
CREATE TABLE IF NOT EXISTS alert_settings (
    customer_id    BIGINT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    enabled        BOOLEAN NOT NULL DEFAULT true,
    offline_sec    INTEGER NOT NULL DEFAULT 120,
    cpu_pct        INTEGER NOT NULL DEFAULT 90,
    mem_pct        INTEGER NOT NULL DEFAULT 90,
    temp_c         INTEGER NOT NULL DEFAULT 75,
    telegram_token TEXT, telegram_chat TEXT
);
CREATE TABLE IF NOT EXISTS alerts (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id    BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    customer_id  BIGINT NOT NULL,
    type         TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'warning',
    message      TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS alerts_active_ux ON alerts(device_id, type) WHERE status='active';

-- Cihaz ajanı tarafından yazılan canlı aktif oturumlar (panel "şu an bağlı" listesi)
CREATE TABLE IF NOT EXISTS active_sessions (
    device_id   BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    mac         TEXT   NOT NULL,
    ip          TEXT,
    uptime_s    INTEGER NOT NULL DEFAULT 0,
    time_left_s INTEGER,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (device_id, mac)
);

-- ── Personel hesapları (bkz. migrations/0026_staff.sql) ──
CREATE TABLE IF NOT EXISTS staff (
    id            SERIAL PRIMARY KEY,
    site_id       INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    full_name     TEXT NOT NULL,
    username      TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    title         TEXT NOT NULL DEFAULT '',
    active        BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_site_idx ON staff(site_id);
CREATE UNIQUE INDEX IF NOT EXISTS staff_site_username_idx ON staff (site_id, lower(username));

-- ── Voucher / kod ile giriş (bkz. migrations/0027_vouchers.sql) ──
CREATE TABLE IF NOT EXISTS vouchers (
    id          SERIAL PRIMARY KEY,
    site_id     INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    code        TEXT NOT NULL UNIQUE,
    profile_id  BIGINT REFERENCES connection_profiles(id) ON DELETE SET NULL,
    max_users   INTEGER,
    expires_at  TIMESTAMPTZ,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vouchers_site_idx ON vouchers(site_id);
CREATE TABLE IF NOT EXISTS voucher_redemptions (
    id          SERIAL PRIMARY KEY,
    voucher_id  INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    mac         TEXT NOT NULL,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (voucher_id, mac)
);

-- ── 5651 erişim kayıtları + zaman damgası (bkz. migrations/0028_legal_5651.sql) ──
CREATE TABLE IF NOT EXISTS access_logs (
    id          BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    site_id     INTEGER REFERENCES sites(id) ON DELETE SET NULL,
    device_id   INTEGER,
    ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
    mac         TEXT,
    ip          TEXT,
    identity    TEXT NOT NULL DEFAULT '',
    method      TEXT NOT NULL DEFAULT '',
    event       TEXT NOT NULL DEFAULT 'login',
    prev_hash   TEXT NOT NULL DEFAULT '',
    row_hash    TEXT NOT NULL,
    stamped     BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS access_logs_cust_ts_idx ON access_logs(customer_id, ts);
CREATE INDEX IF NOT EXISTS access_logs_unstamped_idx ON access_logs(customer_id, id) WHERE stamped = false;
CREATE TABLE IF NOT EXISTS log_timestamps (
    id          BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    from_id     BIGINT NOT NULL,
    to_id       BIGINT NOT NULL,
    row_count   INTEGER NOT NULL DEFAULT 0,
    hash_alg    TEXT NOT NULL DEFAULT 'sha256',
    digest      TEXT NOT NULL,
    token       BYTEA,
    tsa_url     TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',
    detail      TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS log_timestamps_cust_idx ON log_timestamps(customer_id, id);
CREATE TABLE IF NOT EXISTS tsa_config (
    id         INTEGER PRIMARY KEY DEFAULT 1,
    enabled    BOOLEAN NOT NULL DEFAULT false,
    url        TEXT NOT NULL DEFAULT '',
    username   TEXT NOT NULL DEFAULT '',
    password   TEXT NOT NULL DEFAULT '',
    hash_alg   TEXT NOT NULL DEFAULT 'sha256',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tsa_config_single CHECK (id = 1)
);
INSERT INTO tsa_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── Cihaz DHCP havuzu (bkz. migrations/0029_dhcp_leases.sql) ──
CREATE TABLE IF NOT EXISTS dhcp_leases (
    device_id  INTEGER NOT NULL,
    site_id    INTEGER NOT NULL,
    mac        TEXT NOT NULL,
    ip         TEXT,
    host       TEXT,
    status     TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (device_id, mac)
);
CREATE INDEX IF NOT EXISTS dhcp_leases_site_idx ON dhcp_leases(site_id);

-- ── FreeRADIUS view'ları (bkz. migrations/0002_radius_views.sql) ──
CREATE OR REPLACE VIEW radcheck AS
SELECT me.id AS id, me.mac::text AS username, 'Auth-Type' AS attribute,
       CASE WHEN me.list_type = 'blacklist' THEN 'Reject' ELSE 'Accept' END AS value,
       ':=' AS op
FROM mac_entries me;

-- Not: Mikrotik-Rate-Limit RADIUS yanıtından çıkarıldı (bkz. 0014_agent.sql).
-- Hız limiti cihaz ajanı tarafından düzenlenebilir statik queue ile verilir
-- (RouterOS hotspot mac oturumu RADIUS CoA desteklemiyor; oturum düşmeden değişim için).
CREATE OR REPLACE VIEW radreply AS
SELECT (me.id * 10 + 2) AS id, me.mac::text AS username, 'Session-Timeout' AS attribute,
       (cp.duration_min * 60)::text AS value, ':=' AS op
FROM mac_entries me JOIN connection_profiles cp ON cp.id = me.profile_id
WHERE me.list_type <> 'blacklist' AND cp.duration_min IS NOT NULL;

COMMIT;
