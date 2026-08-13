#!/usr/bin/env python3
# goX CoA gönderici: coa_queue'yu okur, cihaza (tünel üzerinden) RADIUS Disconnect-Request yollar.
# Cihaz ilgili MAC oturumunu düşürür → anında yeniden auth → yeni profil/limit canlı uygulanır.
import socket, hashlib, struct, os, time, subprocess

SECRET = os.environ.get("GOX_RADIUS_SECRET", "goxradius").encode()
DBH = os.environ.get("GOX_DB_HOST", "gox_db")
DBU = os.environ.get("GOX_DB_USER", "goxuser")
DBN = os.environ.get("GOX_DB_NAME", "goxdb")
DBP = os.environ.get("GOX_DB_PASS", "goxpass")


def psql(sql):
    env = os.environ.copy()
    env["PGPASSWORD"] = DBP
    r = subprocess.run(["psql", "-h", DBH, "-U", DBU, "-d", DBN, "-tAF,", "-c", sql],
                       capture_output=True, text=True, env=env)
    return r.stdout


def disconnect(host, username):
    code, ident = 40, os.urandom(1)[0]
    u = username.encode()
    # User-Name + Calling-Station-Id (RouterOS MAC oturumunu bunlarla eşler)
    attrs = bytes([1, 2 + len(u)]) + u + bytes([31, 2 + len(u)]) + u
    length = 20 + len(attrs)
    hdr = struct.pack("!BBH", code, ident, length)
    auth = hashlib.md5(hdr + b"\x00" * 16 + attrs + SECRET).digest()
    pkt = hdr + auth + attrs
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.bind(("10.88.0.1", 0))
    except Exception:
        pass
    s.settimeout(3)
    try:
        s.sendto(pkt, (host, 3799))
        resp, _ = s.recvfrom(4096)
        return resp[0]  # 41=ACK, 42=NAK
    except Exception:
        return None
    finally:
        s.close()


print("goX CoA sender başladı", flush=True)
while True:
    try:
        out = psql("SELECT id, device_ip, mac FROM coa_queue WHERE sent_at IS NULL ORDER BY id LIMIT 50")
        for line in out.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split(",")
            if len(parts) < 3:
                continue
            qid, ip, mac = parts[0], parts[1], parts[2]
            r = disconnect(ip, mac.upper())
            print(f"CoA disconnect id={qid} ip={ip} mac={mac.upper()} -> {r}", flush=True)
            psql(f"UPDATE coa_queue SET sent_at=now() WHERE id={qid}")
    except Exception as e:
        print("coa loop err:", e, flush=True)
    time.sleep(4)
