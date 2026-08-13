CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(50)  UNIQUE NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(300) NOT NULL,
  role         VARCHAR(20)  NOT NULL DEFAULT 'support',
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_login   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS customers (
  id             SERIAL PRIMARY KEY,
  company_name   VARCHAR(255) NOT NULL,
  contact_name   VARCHAR(255),
  contact_email  VARCHAR(255),
  contact_phone  VARCHAR(50),
  secondary_phone VARCHAR(50),
  address        TEXT,
  city           VARCHAR(100),
  country        VARCHAR(10)  NOT NULL DEFAULT 'TR',
  service_scope  TEXT,
  monthly_fee    NUMERIC(10,2),
  currency       VARCHAR(10)  NOT NULL DEFAULT 'USD',
  billing_day    INTEGER,
  contract_start DATE,
  contract_end   DATE,
  status               VARCHAR(20)  NOT NULL DEFAULT 'active',
  notes                TEXT,
  sla_response_hours   INT,
  sla_resolution_hours INT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER      NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  currency    VARCHAR(10)  NOT NULL DEFAULT 'USD',
  due_date    DATE         NOT NULL,
  paid_date   DATE,
  period      VARCHAR(10),
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
  invoice_no  VARCHAR(100),
  notes       TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  color      VARCHAR(7)   NOT NULL DEFAULT '#64748b',
  sort_order INT          NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_subcategories (
  id          SERIAL PRIMARY KEY,
  category_id INT          NOT NULL REFERENCES ticket_categories(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id             SERIAL PRIMARY KEY,
  customer_id    INTEGER      REFERENCES customers(id) ON DELETE SET NULL,
  category_id    INTEGER      REFERENCES ticket_categories(id) ON DELETE SET NULL,
  subcategory_id INTEGER      REFERENCES ticket_subcategories(id) ON DELETE SET NULL,
  subject        VARCHAR(500) NOT NULL,
  body           TEXT,
  status         VARCHAR(30)  NOT NULL DEFAULT 'open',
  priority       VARCHAR(20)  NOT NULL DEFAULT 'normal',
  source         VARCHAR(20)  NOT NULL DEFAULT 'manual',
  from_email     VARCHAR(255),
  from_name      VARCHAR(255),
  assigned_to    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  imap_uid       BIGINT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  resolved_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id          SERIAL PRIMARY KEY,
  ticket_id   INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_type VARCHAR(10) NOT NULL DEFAULT 'agent',
  author_name VARCHAR(255),
  body        TEXT        NOT NULL,
  is_internal BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS imap_cursor (
  id         INTEGER PRIMARY KEY DEFAULT 1,
  last_uid   BIGINT      NOT NULL DEFAULT 0,
  last_check TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO imap_cursor VALUES (1, 0, now()) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS canned_responses (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  body       TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id         SERIAL PRIMARY KEY,
  key        VARCHAR(50)  UNIQUE NOT NULL,
  name       VARCHAR(100) NOT NULL,
  subject    TEXT         NOT NULL,
  body_text  TEXT         NOT NULL,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO email_templates (key, name, subject, body_text) VALUES
  ('ticket_reply',
   'Ticket Yanıt Bildirimi',
   'Re: [Ticket #{{ticket_id}}] {{ticket_subject}}',
   E'{{body}}\n\n---\nBu mesajı yanıtlayarak talebinize devam edebilirsiniz.\nxShield IT Destek — support@xshield.com.tr')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS customer_employees (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER      NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(255),
  phone       VARCHAR(50),
  department  VARCHAR(100),
  title       VARCHAR(100),
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id            SERIAL PRIMARY KEY,
  customer_id   INTEGER      NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  employee_id   INTEGER      REFERENCES customer_employees(id) ON DELETE SET NULL,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(50)  NOT NULL DEFAULT 'other',
  brand         VARCHAR(100),
  model         VARCHAR(100),
  serial_no     VARCHAR(200),
  asset_tag     VARCHAR(100),
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',
  assigned_date DATE,
  purchase_date DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_documents (
  id            SERIAL PRIMARY KEY,
  customer_id   INTEGER      NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  original_name VARCHAR(500) NOT NULL,
  stored_name   VARCHAR(500) NOT NULL,
  mimetype      VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
  size          INTEGER      NOT NULL DEFAULT 0,
  uploaded_by   VARCHAR(100),
  uploaded_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS network_agents (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER      NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL DEFAULT 'Ajan',
  token       VARCHAR(64)  UNIQUE NOT NULL,
  subnets     TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS discovered_devices (
  id               SERIAL PRIMARY KEY,
  customer_id      INTEGER      NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  ip_address       VARCHAR(45)  NOT NULL,
  mac_address      VARCHAR(17),
  hostname         VARCHAR(255),
  vendor           VARCHAR(255),
  open_ports       TEXT,
  os_info          TEXT,
  subnet           VARCHAR(50),
  first_seen       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_seen        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  status           VARCHAR(20)  NOT NULL DEFAULT 'new',
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
  UNIQUE(customer_id, mac_address)
);

CREATE TABLE IF NOT EXISTS device_metrics (
  id           SERIAL PRIMARY KEY,
  customer_id  INTEGER     NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id     INTEGER     NOT NULL REFERENCES network_agents(id) ON DELETE CASCADE,
  hostname     VARCHAR(255),
  ip_address   VARCHAR(45),
  cpu_percent  NUMERIC(5,1),
  ram_percent  NUMERIC(5,1),
  ram_total_gb NUMERIC(8,2),
  disk_percent NUMERIC(5,1),
  disk_total_gb NUMERIC(10,2),
  uptime_hours  NUMERIC(10,1),
  platform     VARCHAR(100),
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_sysinfo (
  id              SERIAL PRIMARY KEY,
  customer_id     INTEGER      NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id        INTEGER      NOT NULL REFERENCES network_agents(id) ON DELETE CASCADE,
  hostname        TEXT,
  ip_address      TEXT,
  software        JSONB,
  patches         JSONB,
  active_users    JSONB,
  usb_devices     JSONB,
  top_processes   JSONB,
  services        JSONB,
  security_events JSONB,
  net_io          JSONB,
  collected_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_sysinfo_agent    ON agent_sysinfo(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sysinfo_customer ON agent_sysinfo(customer_id);
CREATE INDEX IF NOT EXISTS idx_agent_sysinfo_time     ON agent_sysinfo(collected_at DESC);

CREATE TABLE IF NOT EXISTS credential_vaults (
  id            SERIAL PRIMARY KEY,
  customer_id   INTEGER      NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label         VARCHAR(255) NOT NULL,
  category      VARCHAR(50)  NOT NULL DEFAULT 'other',
  username      VARCHAR(255),
  encrypted_pass TEXT,
  url           TEXT,
  port          INTEGER,
  notes         TEXT,
  created_by    VARCHAR(100),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credential_vaults_customer ON credential_vaults(customer_id);
