-- goX migration 0004 — cihaz sihirbazı alanları (WAN/LAN/DNS/admin).
BEGIN;

ALTER TABLE devices ADD COLUMN IF NOT EXISTS wan_mode       TEXT DEFAULT 'dhcp';   -- dhcp | static
ALTER TABLE devices ADD COLUMN IF NOT EXISTS wan_interface  TEXT DEFAULT 'ether1';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS wan_ip         TEXT;                  -- statik: CIDR (ör. 1.2.3.4/29)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS wan_gateway    TEXT;                  -- statik: gateway
ALTER TABLE devices ADD COLUMN IF NOT EXISTS lan_interfaces TEXT DEFAULT 'ether2,ether3,ether4,ether5';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS lan_subnet     TEXT DEFAULT '172.16.0.0/16';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS dns_servers    TEXT DEFAULT '8.8.8.8,1.1.1.1';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS admin_user     TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS admin_password TEXT;

COMMIT;
