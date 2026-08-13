#!/bin/bash
# goX WireGuard hub — cihazların VPS'e dışarı doğru bağlandığı sunucu.
# wg0 = 10.88.0.1/24, ListenPort 51820. Tünelden gelen RADIUS'u gox_radius'a DNAT'lar.
set -e

WG_DIR=/etc/wireguard
mkdir -p "$WG_DIR/peers.d"
cd "$WG_DIR"

# Sunucu anahtarı (kalıcı volume — yalnız ilk açılışta üretilir)
if [ ! -f server_private.key ]; then
	umask 077
	wg genkey > server_private.key
	wg pubkey < server_private.key > server_public.key
fi
echo "=== goX WG sunucu public key: $(cat server_public.key) ==="

SERVER_PRIV="$(cat server_private.key)"
cat > wg0.conf <<EOF
[Interface]
Address = 10.88.0.1/24
ListenPort = 443
PrivateKey = ${SERVER_PRIV}
EOF

# Kalıcı cihaz peer'ları (her cihaz onboarding'de peers.d/<id>.conf olarak yazılır)
for f in peers.d/*.conf; do
	[ -e "$f" ] && cat "$f" >> wg0.conf
done

wg-quick down wg0 2>/dev/null || true
wg-quick up wg0

# Yönlendirme + NAT: tünelden gelen RADIUS → gox_radius
sysctl -w net.ipv4.ip_forward=1 2>/dev/null || true

# ── TÜNEL İZOLASYONU (hub-and-spoke) ──────────────────────────────────────────
# KRİTİK GÜVENLİK: cihazlar (peer'lar) birbirine ASLA ulaşamamalı. Her cihaz yalnız
# sunucuyla (10.88.0.1: RADIUS/REST/CoA) konuşur. Bir cihaz ya da tünel anahtarı ele
# geçse bile başka müşterinin cihazına geçemez. wg0→wg0 transit FORWARD'ı düşür.
# (Cihaz↔sunucu trafiği INPUT/OUTPUT'tur, bundan etkilenmez; yalnız peer-arası transit.)
iptables -C FORWARD -i wg0 -o wg0 -j DROP 2>/dev/null || iptables -I FORWARD 1 -i wg0 -o wg0 -j DROP

RADIUS_IP="$(getent hosts gox_radius | awk '{print $1}' | head -1)"
echo "=== gox_radius IP: ${RADIUS_IP:-bulunamadı} ==="
if [ -n "$RADIUS_IP" ]; then
	iptables -t nat -C PREROUTING -i wg0 -p udp --dport 1812 -j DNAT --to-destination "$RADIUS_IP:1812" 2>/dev/null || \
	iptables -t nat -A PREROUTING -i wg0 -p udp --dport 1812 -j DNAT --to-destination "$RADIUS_IP:1812"
	iptables -t nat -C PREROUTING -i wg0 -p udp --dport 1813 -j DNAT --to-destination "$RADIUS_IP:1813" 2>/dev/null || \
	iptables -t nat -A PREROUTING -i wg0 -p udp --dport 1813 -j DNAT --to-destination "$RADIUS_IP:1813"
	iptables -t nat -C POSTROUTING -o eth0 -j MASQUERADE 2>/dev/null || \
	iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
	iptables -C FORWARD -i wg0 -o eth0 -j ACCEPT 2>/dev/null || iptables -A FORWARD -i wg0 -o eth0 -j ACCEPT
	iptables -C FORWARD -i eth0 -o wg0 -j ACCEPT 2>/dev/null || iptables -A FORWARD -i eth0 -o wg0 -j ACCEPT
fi

echo "=== wg0 hazır ==="
wg show

PSQL() { PGPASSWORD="$GOX_DB_PASS" psql -h "${GOX_DB_HOST:-gox_db}" -U "${GOX_DB_USER:-goxuser}" -d "${GOX_DB_NAME:-goxdb}" "$@"; }

# Sunucu public key'ini ayarlara yaz (gox_api provizyon config'inde kullanır)
write_pubkey() {
	PSQL -v ON_ERROR_STOP=1 -c \
		"INSERT INTO settings(key,value) VALUES('wg_server_pubkey','$(cat server_public.key)')
		 ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=now();" >/dev/null 2>&1
}

# Cihaz peer'larını DB'den periyodik senkronla (panelden eklenen cihaz otomatik peer olur)
sync_peers() {
	while true; do
		desired=""
		rows="$(PSQL -tAF',' -c "SELECT d.wg_pubkey, host(d.wg_ip), COALESCE((SELECT pc.db_host FROM pms_config pc WHERE pc.site_id=d.site_id AND pc.conn_mode='tunnel' AND COALESCE(pc.db_host,'')<>'' LIMIT 1),'') FROM devices d WHERE d.wg_pubkey IS NOT NULL AND d.wg_ip IS NOT NULL" 2>/dev/null)"
		for row in $rows; do
			pub="${row%%,*}"; rest="${row#*,}"; ip="${rest%%,*}"; dbh="${rest##*,}"
			aips="$ip/32"; [ -n "$dbh" ] && [ "$dbh" != "$ip" ] && aips="$aips,$dbh/32"
			# tünelden PMS pull için DB host'u da tünele rotalanır (allowed-ips'e eklenir)
			[ -n "$pub" ] && [ -n "$ip" ] && wg set wg0 peer "$pub" allowed-ips "$aips" && desired="$desired $pub"
		done
		# DB'de olmayan peer'ları kaldır
		for cur in $(wg show wg0 peers); do
			case " $desired " in *" $cur "*) : ;; *) wg set wg0 peer "$cur" remove ;; esac
		done
		sleep 20
	done
}

( for i in $(seq 1 15); do write_pubkey && { echo "sunucu pubkey DB'ye yazıldı"; break; }; sleep 3; done ) &
sync_peers &
python3 /coa.py &
python3 /agent.py &

term() { echo "kapanıyor..."; wg-quick down wg0 2>/dev/null || true; exit 0; }
trap term TERM INT
sleep infinity & wait
