#!/usr/bin/env python3
# goX cihaz ajanı — cihazlara RouterOS REST API ile (tünel üzerinden) bağlanır.
#   1) Aktif hotspot oturumlarını okur; her misafir için profil hız limitini
#      DÜZENLENEBİLİR statik simple queue olarak uygular. Profil değişince queue
#      canlı PATCH'lenir => oturum DÜŞMEDEN hız değişir (hotspot dinamik kuyruğu
#      kilitli olduğu ve RADIUS CoA desteklenmediği için bu yol seçildi).
#   2) Canlı metrik toplar (aktif oturum sayısı + WAN anlık hız) ve device_metrics'e yazar;
#      panel "Genel Bakış" gerçek değerleri buradan okur.
import os, time, json, base64, urllib.request, subprocess, hashlib
from datetime import datetime, timezone

DBH = os.environ.get("GOX_DB_HOST", "gox_db")
DBU = os.environ.get("GOX_DB_USER", "goxuser")
DBN = os.environ.get("GOX_DB_NAME", "goxdb")
DBP = os.environ.get("GOX_DB_PASS", "goxpass")

PREFIX = "gox-rl-"   # yönetilen queue ön eki
SEP = "\x1f"         # psql alan ayırıcı (değerlerde çakışmasın diye)
_wan_last = {}       # device_id -> (ts, rx_byte, tx_byte) — WAN hız deltası için
_hist_last = {}      # device_id -> ts — zaman-serisi geçmiş yazım aralığı (~30s)


def psql(sql):
    env = os.environ.copy()
    env["PGPASSWORD"] = DBP
    r = subprocess.run(["psql", "-h", DBH, "-U", DBU, "-d", DBN, "-tA", "-F", SEP, "-c", sql],
                       capture_output=True, text=True, env=env)
    return [ln for ln in r.stdout.split("\n") if ln.strip()]


def dur_s(s):
    # RouterOS süresi "3h52m37s" / "7m23s" / "1w2d" -> saniye
    if not s:
        return None
    units = {"w": 604800, "d": 86400, "h": 3600, "m": 60, "s": 1}
    tot = 0
    num = ""
    for ch in str(s):
        if ch.isdigit():
            num += ch
        elif ch in units and num:
            tot += int(num) * units[ch]
            num = ""
        else:
            num = ""
    return tot


def sql_str(v):
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def parse_rate(s):
    # "1536000/7168000" veya "1536k/7168k" -> (up_bps, down_bps)
    def one(x):
        x = x.strip().lower()
        m = 1
        if x.endswith("k"): m, x = 1000, x[:-1]
        elif x.endswith("m"): m, x = 1000000, x[:-1]
        elif x.endswith("g"): m, x = 1000000000, x[:-1]
        try:
            return int(float(x) * m)
        except Exception:
            return -1
    p = (s or "").split("/")
    if len(p) != 2:
        return None
    return (one(p[0]), one(p[1]))


class Router:
    def __init__(self, ip, user, pw):
        self.base = "http://%s/rest" % ip
        self.auth = "Basic " + base64.b64encode(("%s:%s" % (user, pw)).encode()).decode()

    def call(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data, method=method)
        req.add_header("Authorization", self.auth)
        req.add_header("Content-Type", "application/json")
        r = urllib.request.urlopen(req, timeout=6)
        raw = r.read()
        return json.loads(raw) if raw else None


def reconcile_queues(r, site_id, sessions):
    # DB: bu site'ın mac -> (up_kbps, down_kbps) haritası (blacklist hariç, limitli olanlar)
    # Hız: önce mac'e özel override (m.rate_*), yoksa profil (cp.rate_*). Override profilsiz de çalışır.
    rows = psql("SELECT upper(m.mac::text), COALESCE(m.rate_up_kbps, cp.rate_up_kbps), COALESCE(m.rate_down_kbps, cp.rate_down_kbps) "
                "FROM mac_entries m LEFT JOIN connection_profiles cp ON cp.id=m.profile_id "
                "WHERE m.site_id=%d AND m.list_type<>'blacklist' "
                "AND COALESCE(m.rate_up_kbps, cp.rate_up_kbps) IS NOT NULL "
                "AND COALESCE(m.rate_down_kbps, cp.rate_down_kbps) IS NOT NULL" % site_id)
    rate = {}
    for ln in rows:
        p = ln.split(SEP)
        if len(p) >= 3:
            rate[p[0]] = (int(p[1]), int(p[2]))

    # Cihazdaki mevcut yönetilen queue'lar
    queues = r.call("GET", "/queue/simple") or []
    managed = {q.get("name", ""): q for q in queues if q.get("name", "").startswith(PREFIX)}

    want = set()
    for mac, addr in sessions.items():
        if mac not in rate:
            continue  # profil limiti yok => limitsiz, queue yönetme
        up, down = rate[mac]
        ml = "%dk/%dk" % (up, down)
        desired = (up * 1000, down * 1000)
        target = addr + "/32"
        nm = PREFIX + mac.replace(":", "")
        want.add(nm)
        q = managed.get(nm)
        if q is None:
            try:
                r.call("PUT", "/queue/simple", {"name": nm, "target": target,
                                                "max-limit": ml, "comment": "goX"})
                print("queue+ %s %s %s" % (nm, target, ml), flush=True)
            except Exception as e:
                print("queue create err", nm, e, flush=True)
        else:
            cur = parse_rate(q.get("max-limit", ""))
            if cur != desired or q.get("target") != target:
                try:
                    r.call("PATCH", "/queue/simple/" + q[".id"],
                           {"target": target, "max-limit": ml})
                    print("queue~ %s -> %s %s (canli)" % (nm, target, ml), flush=True)
                except Exception as e:
                    print("queue patch err", nm, e, flush=True)
    # Artık aktif olmayan yönetilen queue'ları kaldır
    for nm, q in managed.items():
        if nm not in want:
            try:
                r.call("DELETE", "/queue/simple/" + q[".id"])
                print("queue- %s" % nm, flush=True)
            except Exception as e:
                print("queue del err", nm, e, flush=True)


def collect_metrics(r, device_id, wan_if, active_count, info):
    rx_bps = tx_bps = 0
    if wan_if:
        try:
            data = r.call("GET", "/interface/" + wan_if)
            it = data[0] if isinstance(data, list) else data
            rxb = int(it.get("rx-byte", 0)); txb = int(it.get("tx-byte", 0))
            now = time.time()
            prev = _wan_last.get(device_id)
            if prev:
                dt = now - prev[0]
                if dt > 0:
                    rx_bps = max(0, int((rxb - prev[1]) * 8 / dt))
                    tx_bps = max(0, int((txb - prev[2]) * 8 / dt))
            _wan_last[device_id] = (now, rxb, txb)
        except Exception as e:
            print("wan metric err", device_id, e, flush=True)
    cpu = info.get("cpu_load", 0); mu = info.get("mem_used", 0); mt = info.get("mem_total", 0); up = info.get("uptime_s", 0)
    sensors, temp = read_sensors(r)
    temp_sql = "NULL" if temp is None else str(int(temp))
    sens_sql = sql_str(json.dumps(sensors)) + "::jsonb"
    psql("INSERT INTO device_metrics (device_id, active_count, wan_rx_bps, wan_tx_bps, cpu_load, mem_used, mem_total, uptime_s, temp_c, sensors, updated_at) "
         "VALUES (%d,%d,%d,%d,%d,%d,%d,%d,%s,%s,now()) ON CONFLICT (device_id) DO UPDATE SET "
         "active_count=EXCLUDED.active_count, wan_rx_bps=EXCLUDED.wan_rx_bps, wan_tx_bps=EXCLUDED.wan_tx_bps, "
         "cpu_load=EXCLUDED.cpu_load, mem_used=EXCLUDED.mem_used, mem_total=EXCLUDED.mem_total, "
         "uptime_s=EXCLUDED.uptime_s, temp_c=EXCLUDED.temp_c, sensors=EXCLUDED.sensors, updated_at=now()"
         % (device_id, active_count, rx_bps, tx_bps, cpu, mu, mt, up, temp_sql, sens_sql))
    # zaman-serisi geçmiş (~30s'de bir) + 24 saatten eskiyi buda
    now = time.time()
    if now - _hist_last.get(device_id, 0) >= 30:
        _hist_last[device_id] = now
        mem_pct = int(mu * 100 / mt) if mt else 0
        psql("INSERT INTO device_metrics_history (device_id, active_count, wan_rx_bps, wan_tx_bps, cpu_load, mem_pct, temp_c) "
             "VALUES (%d,%d,%d,%d,%d,%d,%s)" % (device_id, active_count, rx_bps, tx_bps, cpu, mem_pct, temp_sql))
        psql("DELETE FROM device_metrics_history WHERE device_id=%d AND ts < now()-interval '24 hours'" % device_id)


def write_sessions(device_id, rows):
    # Bu cihazın aktif oturumlarını tazele (sil + yeniden yaz)
    vals = []
    for mac, ip, up_s, tl_s in rows:
        tl = "NULL" if tl_s is None else str(int(tl_s))
        vals.append("(%d,%s,%s,%d,%s,now())" % (device_id, sql_str(mac), sql_str(ip), int(up_s), tl))
    sql = "DELETE FROM active_sessions WHERE device_id=%d;" % device_id
    if vals:
        sql += ("INSERT INTO active_sessions (device_id,mac,ip,uptime_s,time_left_s,updated_at) VALUES "
                + ",".join(vals) + ";")
    psql(sql)


def lookup_identity(site_id, mac):
    # Portal doğrulaması yapılmışsa (mernis/pms/staff/voucher) kimliği guest_verifications'tan al.
    rows = psql("SELECT method || '%s' || COALESCE(identity,'') FROM guest_verifications "
                "WHERE site_id=%d AND lower(mac::text)=lower(%s) ORDER BY id DESC LIMIT 1"
                % (SEP, site_id, sql_str(mac)))
    if rows:
        p = rows[0].split(SEP)
        return (p[0] if p else ""), (p[1] if len(p) > 1 else "")
    return "", ""


def log_access(customer_id, site_id, mac, ip, identity, method, event):
    # 5651 hash-zincirli append-only erişim kaydı. Ajan TEK yazardır (zincir bütünlüğü).
    # TSA'dan bağımsız: imza olmasa da log düşer; TSA aktifse stampingLoop sonradan mühürler.
    if not customer_id:
        return
    rows = psql("SELECT row_hash FROM access_logs WHERE customer_id=%d ORDER BY id DESC LIMIT 1" % customer_id)
    prev = rows[0] if rows else ""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f+00:00")
    mac_l = (mac or "").lower()
    payload = "%d|%s|%s|%s|%s|%s|%s|%s" % (customer_id, ts, mac_l, ip or "", identity or "", method or "", event, prev)
    row_hash = hashlib.sha256(payload.encode()).hexdigest()
    site_sql = str(int(site_id)) if site_id else "NULL"
    psql("INSERT INTO access_logs (customer_id, site_id, ts, mac, ip, identity, method, event, prev_hash, row_hash) "
         "VALUES (%d, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
         % (customer_id, site_sql, sql_str(ts), sql_str(mac_l), sql_str(ip or ""),
            sql_str(identity or ""), sql_str(method or ""), sql_str(event), sql_str(prev), sql_str(row_hash)))


def write_leases(device_id, site_id, leases):
    # Cihazın güncel DHCP havuzunu tazele (sil + yeniden yaz). MAC seçici bunu okur.
    vals = []
    for lz in leases:
        if not isinstance(lz, dict):
            continue
        mac = (lz.get("mac-address") or "").upper()
        if not mac or ":" not in mac:
            continue
        vals.append("(%d,%d,%s,%s,%s,%s,now())" % (
            device_id, site_id, sql_str(mac), sql_str(lz.get("address", "")),
            sql_str(lz.get("host-name", "")), sql_str(lz.get("status", ""))))
    sql = "DELETE FROM dhcp_leases WHERE device_id=%d;" % device_id
    if vals:
        sql += ("INSERT INTO dhcp_leases (device_id,site_id,mac,ip,host,status,updated_at) VALUES "
                + ",".join(vals) + ";")
    psql(sql)


def reconcile_advertise(r, site_id):
    # Bu site'ın müşterisinde AKTİF anket varsa hotspot Advertisement'ı aç:
    # misafirin tarayıcısı belirli aralıklarla anket sayfasına KOPMADAN yönlendirilir.
    # (RouterOS advertisement transparent-proxy=yes ister.)
    rows = psql("SELECT su.frequency FROM surveys su JOIN sites s ON s.customer_id=su.customer_id "
                "WHERE s.id=%d AND su.status='active' ORDER BY su.id DESC LIMIT 1" % site_id)
    # Advertisement devre dışı: mobilde captive sheet flash'lıyor (doldurulamıyor).
    # Anket artık karşılama portalının ZORUNLU adımı (gate). Bkz. portal /anket gate.
    want = False
    freq = rows[0].strip() if rows else ""
    interval = "30s,1h" if freq == "periodic" else "30s,12h"
    url = "https://gox.xshield.com.tr/anket?site=%d" % site_id

    profs = r.call("GET", "/ip/hotspot/user/profile") or []
    prof = next((p for p in profs if p.get("name") == "default"), None)
    if not prof:
        return
    pid = prof[".id"]
    cur_adv = str(prof.get("advertise", "")).lower() in ("true", "yes")
    proxy_on = str(prof.get("transparent-proxy", "")).lower() in ("true", "yes")
    if want:
        if (not cur_adv or not proxy_on or prof.get("advertise-url") != url
                or prof.get("advertise-interval") != interval):
            try:
                r.call("PATCH", "/ip/hotspot/user/profile/" + pid, {
                    "transparent-proxy": "yes", "advertise": "yes", "advertise-url": url,
                    "advertise-interval": interval, "advertise-timeout": "1d"})
                print("advertise+ site=%d (%s) %s" % (site_id, freq or "once", url), flush=True)
            except Exception as e:
                print("advertise set err", site_id, e, flush=True)
    else:
        if cur_adv:
            try:
                r.call("PATCH", "/ip/hotspot/user/profile/" + pid, {"advertise": "no"})
                print("advertise- site=%d" % site_id, flush=True)
            except Exception as e:
                print("advertise off err", site_id, e, flush=True)


def safe_get(r, path):
    try:
        return r.call("GET", path)
    except Exception:
        return None


def _int(x, d=0):
    try:
        return int(x)
    except Exception:
        return d


def detect_info(r):
    res = r.call("GET", "/system/resource")
    d = res[0] if isinstance(res, list) else (res or {})
    if not isinstance(d, dict):
        d = {}
    ver = d.get("version", "")
    board = d.get("board-name", "")
    total = _int(d.get("total-memory", 0))
    free = _int(d.get("free-memory", 0))
    has_wifi, kind = False, ""
    wl = safe_get(r, "/interface/wireless")
    if isinstance(wl, list) and len(wl) > 0:
        has_wifi, kind = True, "wireless"
    else:
        wf = safe_get(r, "/interface/wifi")
        if isinstance(wf, list) and len(wf) > 0:
            has_wifi, kind = True, "wifi"
    return {"version": ver, "board": board, "has_wifi": has_wifi, "wifi_kind": kind,
            "cpu_load": _int(d.get("cpu-load", 0)), "mem_used": max(0, total - free),
            "mem_total": total, "uptime_s": dur_s(d.get("uptime")) or 0}


def read_sensors(r):
    # /system/health -> {ad: {value, unit}} + sıcaklık (varsa). Model-bağımsız.
    h = safe_get(r, "/system/health")
    sensors, temp = {}, None
    items = h if isinstance(h, list) else []
    if isinstance(h, dict):  # bazı sürümler tek obje
        items = [{"name": k, "value": v, "type": ""} for k, v in h.items() if not str(k).startswith(".")]
    for x in items:
        if not isinstance(x, dict):
            continue
        nm = x.get("name", "")
        if not nm:
            continue
        sensors[nm] = {"value": str(x.get("value", "")), "unit": x.get("type", "")}
        if temp is None and "temp" in nm.lower():
            temp = _int(x.get("value", 0))
    return sensors, temp


def update_device_online(did, info):
    psql("UPDATE devices SET status='online', last_seen=now(), ros_detected=%s, board_name=%s, "
         "has_wifi=%s, wifi_kind=%s WHERE id=%d"
         % (sql_str(info["version"]), sql_str(info["board"]),
            "true" if info["has_wifi"] else "false", sql_str(info["wifi_kind"]), did))


def apply_script(r, script):
    # eski goxapply betiği varsa kaldır
    for s in (safe_get(r, "/system/script") or []):
        if s.get("name") == "goxapply":
            try:
                r.call("DELETE", "/system/script/" + s[".id"])
            except Exception:
                pass
    r.call("PUT", "/system/script", {"name": "goxapply", "source": script,
                                     "dont-require-permissions": "yes"})
    sid = None
    for s in (safe_get(r, "/system/script") or []):
        if s.get("name") == "goxapply":
            sid = s[".id"]
    if not sid:
        raise RuntimeError("script eklenemedi")
    r.call("POST", "/system/script/run", {".id": sid})


def run_command(r, did, cmd_id, action, params):
    psql("UPDATE device_commands SET status='running', started_at=now() WHERE id=%d" % cmd_id)
    status, result = "done", "ok"
    try:
        if action == "info":
            info = detect_info(r); update_device_online(did, info); result = json.dumps(info)
        elif action == "reboot":
            r.call("POST", "/system/reboot", {}); result = "reboot gonderildi"
        elif action == "shutdown":
            r.call("POST", "/system/shutdown", {}); result = "shutdown gonderildi"
        elif action == "apply_network":
            apply_script(r, params.get("script", ""))
            psql("UPDATE devices SET provisioned=true, status='online' WHERE id=%d" % did)
            result = "misafir agi uygulandi"
        elif action == "ssid":
            ssid = params.get("ssid", "goX")
            wl = safe_get(r, "/interface/wireless") or []
            if wl:
                r.call("PATCH", "/interface/wireless/" + wl[0][".id"], {"ssid": ssid})
            result = "ssid: " + ssid
        elif action == "hotspot_toggle":
            en = params.get("enabled", True)
            hs = safe_get(r, "/ip/hotspot") or []
            hit = False
            for h in hs:
                if h.get("name") == "gox-hotspot":
                    r.call("PATCH", "/ip/hotspot/" + h[".id"], {"disabled": "no" if en else "yes"})
                    hit = True
            result = ("hotspot acildi" if en else "hotspot kapatildi") if hit else "hotspot yok (once Yapilandir)"
        elif action == "sync_reservations":
            apply_script(r, params.get("script", ""))
            result = "rezervasyonlar uygulandi"
        elif action == "dhcp_leases":
            lv = safe_get(r, "/ip/dhcp-server/lease") or []
            leases = [{"address": x.get("address"), "mac": x.get("mac-address"),
                       "host": x.get("host-name", ""), "status": x.get("status", "")}
                      for x in lv if isinstance(x, dict)]
            result = json.dumps(leases)
        elif action == "nat_toggle":
            en = params.get("enabled", True)
            hit = False
            for n in (safe_get(r, "/ip/firewall/nat") or []):
                if n.get("comment") == "goX guest out":
                    r.call("PATCH", "/ip/firewall/nat/" + n[".id"], {"disabled": "no" if en else "yes"})
                    hit = True
            result = ("NAT acildi (internet paylasimi)" if en else "NAT kapatildi (internet kesildi)") if hit else "NAT kurali yok (once Yapilandir)"
        elif action == "kick_all":
            n = 0
            addrs = set()
            # 1) aktif hotspot oturumlarini dus (deauth)
            for a_ in (safe_get(r, "/ip/hotspot/active") or []):
                if a_.get("address"):
                    addrs.add(a_["address"])
                try:
                    r.call("DELETE", "/ip/hotspot/active/" + a_[".id"]); n += 1
                except Exception:
                    pass
            # 2) yetkisi olmayan host'lari kaldir (yeniden portal'a dussunler)
            for h in (safe_get(r, "/ip/hotspot/host") or []):
                if h.get("bypassed") == "true":
                    continue
                if h.get("address"):
                    addrs.add(h["address"])
                try:
                    r.call("DELETE", "/ip/hotspot/host/" + h[".id"])
                except Exception:
                    pass
            # 3) bu misafirlerin acik (established) baglantilarini conntrack'ten dus
            #    (yoksa firewall yeni baglantiyi keser ama mevcut akislar surer)
            if addrs:
                for c in (safe_get(r, "/ip/firewall/connection") or []):
                    src = str(c.get("src-address", "")).rsplit(":", 1)[0]
                    dst = str(c.get("dst-address", "")).rsplit(":", 1)[0]
                    if src in addrs or dst in addrs:
                        try:
                            r.call("DELETE", "/ip/firewall/connection/" + c[".id"])
                        except Exception:
                            pass
            result = "%d misafir oturumu kapatildi" % n
        elif action == "disconnect_mac":
            # Tek bir MAC'i gercekten dus: hotspot oturumu + host + conntrack.
            # (mac_entries silindiginde radcheck reddeder; bu da mevcut oturumu/akisi keser.)
            mac = str(params.get("mac", "")).upper()
            addrs = set()
            for a_ in (safe_get(r, "/ip/hotspot/active") or []):
                if str(a_.get("mac-address", "")).upper() == mac:
                    if a_.get("address"):
                        addrs.add(a_["address"])
                    try:
                        r.call("DELETE", "/ip/hotspot/active/" + a_[".id"])
                    except Exception:
                        pass
            for h in (safe_get(r, "/ip/hotspot/host") or []):
                if str(h.get("mac-address", "")).upper() == mac:
                    if h.get("address"):
                        addrs.add(h["address"])
                    try:
                        r.call("DELETE", "/ip/hotspot/host/" + h[".id"])
                    except Exception:
                        pass
            if addrs:
                for c in (safe_get(r, "/ip/firewall/connection") or []):
                    src = str(c.get("src-address", "")).rsplit(":", 1)[0]
                    dst = str(c.get("dst-address", "")).rsplit(":", 1)[0]
                    if src in addrs or dst in addrs:
                        try:
                            r.call("DELETE", "/ip/firewall/connection/" + c[".id"])
                        except Exception:
                            pass
            result = "misafir dusuruldu: " + mac
        elif action == "set_dns":
            servers = str(params.get("servers", "")).strip()
            if not servers:
                status, result = "error", "DNS bos olamaz"
            else:
                apply_script(r, "/ip dns set servers=%s allow-remote-requests=yes" % servers)
                psql("UPDATE devices SET dns_servers=%s WHERE id=%d" % (sql_str(servers), did))
                result = "DNS guncellendi: " + servers
        elif action == "sync_policy":
            apply_script(r, params.get("script", ""))
            result = "walled garden + engelleme uygulandi"
        elif action == "get_logs":
            n = int(params.get("n", 50))
            lg = safe_get(r, "/log") or []
            lines = [("%s %s %s" % (x.get("time", ""), x.get("topics", ""), x.get("message", ""))) for x in lg[-n:] if isinstance(x, dict)]
            result = json.dumps(lines)
        elif action == "set_time":
            tz = str(params.get("timezone", "Europe/Istanbul")).strip() or "Europe/Istanbul"
            ntp = str(params.get("ntp", "tr.pool.ntp.org")).strip() or "tr.pool.ntp.org"
            apply_script(r, "/system clock set time-zone-name=%s\n/system ntp client set enabled=yes servers=%s\n" % (tz, ntp))
            result = "saat/NTP ayarlandi: %s" % tz
        elif action == "upgrade":
            try:
                r.call("POST", "/system/package/update/check-for-updates", {})
                r.call("POST", "/system/package/update/install", {})  # indirir + yeniden baslar
            except Exception:
                pass  # install cihazi yeniden baslatinca baglanti kopar (normal)
            result = "guncelleme baslatildi — cihaz yeniden baslayacak"
        elif action == "factory_reset":
            # mode: "blank" (bos config) | "default" (varsayilan config) | "default_keep_users" (varsayilan + kullanicilar)
            mode = str(params.get("mode", "blank")).strip() or "blank"
            opts = {"skip-backup": "yes"}
            if mode == "blank":
                opts["no-defaults"] = "yes"
                msg = "bos yapilandirmaya sifirlandi"
            elif mode == "default_keep_users":
                opts["keep-users"] = "yes"
                msg = "varsayilan yapilandirmaya sifirlandi (kullanicilar korundu)"
            else:  # default
                msg = "varsayilan yapilandirmaya sifirlandi"
            psql("UPDATE devices SET provisioned=false, status='offline', enrolled=false WHERE id=%d" % did)
            try:
                r.call("POST", "/system/reset-configuration", opts)
            except Exception:
                pass  # reset cihazi yeniden baslatir, baglanti kopar (normal)
            result = "%s — cihaza tekrar ZTP yapistirin" % msg
        elif action == "top_talkers":
            act = safe_get(r, "/ip/hotspot/active") or []
            tt = []
            for x in act:
                if not isinstance(x, dict):
                    continue
                bi = int(x.get("bytes-in", 0) or 0)
                bo = int(x.get("bytes-out", 0) or 0)
                tt.append({"mac": x.get("mac-address", ""), "ip": x.get("address", ""),
                           "user": x.get("user", ""), "in": bi, "out": bo, "total": bi + bo,
                           "uptime": x.get("uptime", "")})
            tt.sort(key=lambda z: z["total"], reverse=True)
            result = json.dumps(tt[:20])
        elif action == "restore_config":
            apply_script(r, params.get("script", ""))
            result = "yedek geri yuklendi (misafir agi yeniden uygulandi)"
        elif action == "set_admin_pass":
            np = str(params.get("password", "")).strip()
            if not np:
                status, result = "error", "parola uretilmedi"
            else:
                for u_ in (safe_get(r, "/user") or []):
                    if u_.get("name") == "goxadmin":
                        r.call("PATCH", "/user/" + u_[".id"], {"password": np})
                result = "yonetim parolasi yenilendi"
        else:
            status, result = "error", "desteklenmiyor (yakinda)"
    except Exception as e:
        status, result = "error", "hata: " + str(e)
    psql("UPDATE device_commands SET status='%s', result=%s, finished_at=now() WHERE id=%d"
         % (status, sql_str(result), cmd_id))
    print("cmd %d %s -> %s" % (cmd_id, action, status), flush=True)


def process_commands(r, did):
    import base64 as _b64
    q = ("SELECT c.id||'|'||c.action||'|'||replace(encode(convert_to(coalesce(c.params::text,'{}'),'UTF8'),'base64'),E'\\n','') "
         "FROM device_commands c WHERE c.device_id=%d AND c.status='pending' ORDER BY c.id LIMIT 10" % did)
    for ln in psql(q):
        parts = ln.split("|", 2)
        if len(parts) != 3:
            continue
        try:
            params = json.loads(_b64.b64decode(parts[2]).decode() or "{}")
        except Exception:
            params = {}
        run_command(r, did, int(parts[0]), parts[1], params)


_pms_last = {}


def pms_connect(kind, host, port, name, user, pw):
    if kind == "mysql":
        import pymysql
        return pymysql.connect(host=host, port=int(port or 3306), user=user, password=pw, database=name, connect_timeout=8)
    if kind == "firebird":
        import firebirdsql
        return firebirdsql.connect(host=host, port=int(port or 3050), database=name, user=user, password=pw)
    if kind == "postgres":
        import pg8000
        return pg8000.connect(host=host, port=int(port or 5432), user=user, password=pw, database=name)
    import pytds  # sqlserver (varsayılan)
    return pytds.connect(host, name, user, pw, port=int(port or 1433), login_timeout=8, timeout=8)


def ensure_pms_route(r, db_host, wan):
    # Tünelden DB'ye ulaşmak için cihazda forward (gox-wg->DB) + masquerade (idempotent).
    try:
        if not any(x.get("comment") == "goX pms" for x in (safe_get(r, "/ip/firewall/filter") or [])):
            r.call("PUT", "/ip/firewall/filter", {"chain": "forward", "action": "accept",
                    "in-interface": "gox-wg", "dst-address": db_host, "comment": "goX pms"})
        if wan and not any(x.get("comment") == "goX pms" for x in (safe_get(r, "/ip/firewall/nat") or [])):
            r.call("PUT", "/ip/firewall/nat", {"chain": "srcnat", "action": "masquerade",
                    "dst-address": db_host, "out-interface": wan, "comment": "goX pms"})
    except Exception as e:
        print("pms route err", e, flush=True)


def pull_pms(r, site_id, wan):
    # B şıkkı: tünel üstünden PMS DB view'ını oku, pms_guests'i (source='tunnel') tazele.
    rows = psql("SELECT conn_mode, db_kind, db_host, COALESCE(db_port,0), db_name, db_user, db_pass, db_query "
                "FROM pms_config WHERE site_id=%d" % site_id)
    if not rows:
        return
    p = rows[0].split(SEP)
    if len(p) < 8 or p[0] != "tunnel" or not p[2] or not p[7]:
        return  # tunnel modu değil veya eksik config
    kind, host, port, name, user, pw, query = p[1], p[2], p[3], p[4], p[5], p[6], p[7]
    # ~5 dk'da bir
    if time.time() - _pms_last.get(site_id, 0) < 300:
        return
    _pms_last[site_id] = time.time()
    ensure_pms_route(r, host, wan)
    crows = psql("SELECT customer_id FROM sites WHERE id=%d" % site_id)
    cust = int(crows[0]) if crows else 0
    try:
        conn = pms_connect(kind, host, port, name, user, pw)
        cur = conn.cursor()
        cur.execute(query)
        cols = [d[0].lower() for d in cur.description]
        idx = {c: i for i, c in enumerate(cols)}
        vals = []
        for row in cur.fetchall():
            def g(k):
                return str(row[idx[k]]) if k in idx and row[idx[k]] is not None else ""
            vals.append("(%d,%d,%s,%s,%s,%s,%s,'tunnel')" % (
                cust, site_id, sql_str(g("room")), sql_str(g("full_name")), sql_str(g("surname")),
                ("NULL" if not g("checkin") else sql_str(g("checkin")[:10]) + "::date"),
                ("NULL" if not g("checkout") else sql_str(g("checkout")[:10]) + "::date")))
        try:
            conn.close()
        except Exception:
            pass
        sql = "DELETE FROM pms_guests WHERE site_id=%d AND source='tunnel';" % site_id
        if vals:
            sql += ("INSERT INTO pms_guests (customer_id,site_id,room,full_name,surname,checkin,checkout,source) VALUES "
                    + ",".join(vals) + ";")
        psql(sql)
        psql("UPDATE pms_config SET last_pull=now(), last_pull_msg=%s WHERE site_id=%d"
             % (sql_str("tunnel: %d kayit" % len(vals)), site_id))
        print("pms pull site=%d -> %d kayit" % (site_id, len(vals)), flush=True)
    except Exception as e:
        psql("UPDATE pms_config SET last_pull_msg=%s WHERE site_id=%d" % (sql_str("tunnel hata: " + str(e)[:200]), site_id))
        print("pms pull err site=%d:" % site_id, e, flush=True)


def handle_device(dev):
    did, site_id, ip, user, pw, wan_if, provisioned = dev
    r = Router(ip, user, pw)
    # 1) Erişim + cihaz bilgisi (online tespiti)
    try:
        info = detect_info(r)
        update_device_online(did, info)
    except Exception:
        psql("UPDATE devices SET status='offline' WHERE id=%d" % did)
        return  # ulaşılamıyor (tünel yok/yeni) -> komut/reconcile denemeye gerek yok
    # 2) Panelden gelen komutlar
    try:
        process_commands(r, did)
    except Exception as e:
        print("cmd loop err", did, e, flush=True)
    # 3) Misafir ağı reconcile (yalnız kurulmuş cihazlarda)
    sessions = {}
    if provisioned:
        try:
            active = r.call("GET", "/ip/hotspot/active") or []
            sess_rows = []
            for s in active:
                mac = (s.get("mac-address") or s.get("user") or "").upper()
                addr = s.get("address")
                if not (mac and addr and ":" in mac):
                    continue
                sessions[mac] = addr
                sess_rows.append((mac, addr, dur_s(s.get("uptime")) or 0, dur_s(s.get("session-time-left"))))
            reconcile_queues(r, site_id, sessions)
            reconcile_advertise(r, site_id)
            # 5651: önceki döngüye göre yeni/biten oturumları logla (MAC ile otomatik giriş dahil)
            try:
                prev_macs = set(psql("SELECT mac FROM active_sessions WHERE device_id=%d" % did))
                cur_macs = set(sessions.keys())
                if prev_macs != cur_macs:
                    crows = psql("SELECT customer_id FROM sites WHERE id=%d" % site_id)
                    cust = int(crows[0]) if crows else 0
                    for mac in (cur_macs - prev_macs):
                        method, identity = lookup_identity(site_id, mac)
                        log_access(cust, site_id, mac, sessions.get(mac, ""), identity, method or "misafir", "login")
                    for mac in (prev_macs - cur_macs):
                        log_access(cust, site_id, mac, "", "", "", "logout")
            except Exception as e:
                print("erisim log err", did, e, flush=True)
            write_sessions(did, sess_rows)
            try:
                write_leases(did, site_id, safe_get(r, "/ip/dhcp-server/lease") or [])
            except Exception as e:
                print("lease yazma err", did, e, flush=True)
        except Exception as e:
            print("reconcile err", did, e, flush=True)
    # 4) İzleme metrikleri (tüm online cihazlar) + zaman-serisi geçmiş
    try:
        collect_metrics(r, did, wan_if, len(sessions), info)
    except Exception as e:
        print("metric err", did, e, flush=True)
    # 5) PMS B-şıkkı: tünelden DB pull (yalnız conn_mode='tunnel' lokasyonlarda; ~5dk'da bir)
    try:
        pull_pms(r, site_id, wan_if)
    except Exception as e:
        print("pms pull loop err", did, e, flush=True)


print("goX agent başladı", flush=True)
while True:
    try:
        devs = psql("SELECT id, site_id, host(wg_ip), admin_user, admin_password, COALESCE(wan_interface,''), "
                    "provisioned FROM devices WHERE wg_ip IS NOT NULL AND admin_user IS NOT NULL "
                    "AND admin_password IS NOT NULL AND COALESCE(status,'') <> 'disabled'")
        for ln in devs:
            p = ln.split(SEP)
            if len(p) < 7:
                continue
            try:
                handle_device((int(p[0]), int(p[1]), p[2], p[3], p[4], p[5], p[6] == "t"))
            except Exception as e:
                print("device", p[0], "err", e, flush=True)
    except Exception as e:
        print("agent loop err", e, flush=True)
    time.sleep(3)
