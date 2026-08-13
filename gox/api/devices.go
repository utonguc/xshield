package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"

	"golang.org/x/crypto/curve25519"
)

type Device struct {
	ID            int64  `json:"id"`
	SiteID        int64  `json:"site_id"`
	SiteName      string `json:"site_name,omitempty"`
	Name          string `json:"name"`
	RouterosVer   string `json:"routeros_ver"`
	ApiKind       string `json:"api_kind"`
	WgIP          string `json:"wg_ip"`
	WgPubkey      string `json:"wg_pubkey"`
	WanMode       string `json:"wan_mode"`
	WanInterface  string `json:"wan_interface"`
	WanIP         string `json:"wan_ip,omitempty"`
	WanGateway    string `json:"wan_gateway,omitempty"`
	LanInterfaces string `json:"lan_interfaces"`
	LanSubnet     string `json:"lan_subnet"`
	DNSServers    string `json:"dns_servers"`
	AdminUser     string `json:"admin_user,omitempty"`
	AdminPassword string `json:"admin_password,omitempty"`
	Status        string `json:"status"`
	BoardName     string `json:"board_name,omitempty"`
	RosDetected   string `json:"ros_detected,omitempty"`
	HasWifi       bool   `json:"has_wifi"`
	WifiKind      string `json:"wifi_kind,omitempty"`
	Provisioned   bool   `json:"provisioned"`
	WifiBridge    bool   `json:"wifi_bridge"`
	SSID          string `json:"ssid,omitempty"`
	LastSeen      string `json:"last_seen,omitempty"`
	EnrollToken   string `json:"enroll_token,omitempty"`
}

// wgKeypair: WireGuard (Curve25519) anahtar çifti üretir, base64 döner.
func wgKeypair() (priv, pub string, err error) {
	var p [32]byte
	if _, err = rand.Read(p[:]); err != nil {
		return "", "", err
	}
	p[0] &= 248
	p[31] &= 127
	p[31] |= 64
	pubB, err := curve25519.X25519(p[:], curve25519.Basepoint)
	if err != nil {
		return "", "", err
	}
	return base64.StdEncoding.EncodeToString(p[:]), base64.StdEncoding.EncodeToString(pubB), nil
}

func randPassword(n int) string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
	b := make([]byte, n)
	_, _ = rand.Read(b)
	for i := range b {
		b[i] = chars[int(b[i])%len(chars)]
	}
	return string(b)
}

func (a *app) nextWgIP(ctx context.Context) (string, error) {
	var n int
	err := a.db.QueryRow(ctx,
		`SELECT COALESCE(MAX(split_part(host(wg_ip),'.',4)::int),1)+1 FROM devices WHERE wg_ip IS NOT NULL`).Scan(&n)
	if err != nil {
		return "", err
	}
	if n > 254 {
		return "", fmt.Errorf("WG adres havuzu (10.88.0.0/24) doldu")
	}
	return fmt.Sprintf("10.88.0.%d", n), nil
}

func (a *app) getSetting(ctx context.Context, key string) string {
	var v string
	_ = a.db.QueryRow(ctx, `SELECT value FROM settings WHERE key=$1`, key).Scan(&v)
	return v
}

// lanParams: subnet CIDR'den gateway + DHCP havuz aralığını hesaplar.
func lanParams(subnet string) (gateway, poolRange, normCIDR string) {
	ip, ipnet, err := net.ParseCIDR(subnet)
	if err != nil || ip.To4() == nil {
		return "172.16.0.1", "172.16.0.10-172.16.255.254", "172.16.0.0/16"
	}
	netU := ip2u(ipnet.IP)
	maskU := ip2u(net.IP(ipnet.Mask))
	bcast := netU | ^maskU
	gw := netU + 1
	poolStart := netU + 10
	poolEnd := bcast - 1
	if poolStart >= poolEnd {
		poolStart = netU + 1
		poolEnd = bcast
	}
	prefix, _ := ipnet.Mask.Size()
	return u2ip(gw), u2ip(poolStart) + "-" + u2ip(poolEnd), fmt.Sprintf("%s/%d", u2ip(netU), prefix)
}

func ip2u(ip net.IP) uint32 {
	ip = ip.To4()
	return uint32(ip[0])<<24 | uint32(ip[1])<<16 | uint32(ip[2])<<8 | uint32(ip[3])
}
func u2ip(u uint32) string {
	return fmt.Sprintf("%d.%d.%d.%d", byte(u>>24), byte(u>>16), byte(u>>8), byte(u))
}

func (a *app) handleDevicesList(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	loc := a.locationID(u)
	rows, err := a.db.Query(r.Context(),
		`SELECT d.id, d.site_id, s.name, d.name, COALESCE(d.routeros_ver,''), COALESCE(d.api_kind,''),
		        COALESCE(host(d.wg_ip),''), COALESCE(d.wg_pubkey,''), COALESCE(d.wan_mode,''),
		        COALESCE(d.lan_subnet,''), d.status,
		        COALESCE(d.board_name,''), COALESCE(d.ros_detected,''), COALESCE(d.has_wifi,false),
		        COALESCE(d.wifi_kind,''), d.provisioned, d.wifi_bridge, COALESCE(d.ssid,''),
		        COALESCE(to_char(d.last_seen,'YYYY-MM-DD"T"HH24:MI:SSOF'),''),
		        CASE WHEN d.enrolled THEN '' ELSE COALESCE(d.enroll_token,'') END
		 FROM devices d JOIN sites s ON s.id=d.site_id
		 WHERE s.customer_id=$1 AND ($2=0 OR d.site_id=$2) ORDER BY d.id`, cid, loc)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []Device{}
	for rows.Next() {
		var d Device
		if err := rows.Scan(&d.ID, &d.SiteID, &d.SiteName, &d.Name, &d.RouterosVer, &d.ApiKind,
			&d.WgIP, &d.WgPubkey, &d.WanMode, &d.LanSubnet, &d.Status,
			&d.BoardName, &d.RosDetected, &d.HasWifi, &d.WifiKind, &d.Provisioned, &d.WifiBridge,
			&d.SSID, &d.LastSeen, &d.EnrollToken); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "okuma hatası"})
			return
		}
		list = append(list, d)
	}
	writeJSON(w, http.StatusOK, map[string]any{"devices": list})
}

func (a *app) handleDeviceCreate(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	var in Device
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Cihaz adı gerekli"})
		return
	}
	// Plan limiti: cihaz
	if p, _, devices, err := a.planForCustomer(r.Context(), cid); err == nil && p != nil {
		if msg := limitErr("device", devices, p.MaxDevices); msg != "" {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": msg})
			return
		}
	}
	// Varsayılanlar
	if in.WanMode != "static" {
		in.WanMode = "dhcp"
	}
	if in.WanInterface == "" {
		in.WanInterface = "ether1"
	}
	if in.LanInterfaces == "" {
		in.LanInterfaces = "ether2,ether3,ether4,ether5"
	}
	if in.LanSubnet == "" {
		in.LanSubnet = "172.16.0.0/16"
	}
	if in.DNSServers == "" {
		in.DNSServers = "8.8.8.8,1.1.1.1"
	}
	if in.RouterosVer == "" {
		in.RouterosVer = "7"
	}
	if in.WanMode == "static" && (strings.TrimSpace(in.WanIP) == "" || strings.TrimSpace(in.WanGateway) == "") {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Statik WAN için IP ve gateway gerekli"})
		return
	}
	// Lokasyon bu müşteriye mi ait?
	var siteOK bool
	if err := a.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM sites WHERE id=$1 AND customer_id=$2)`, in.SiteID, cid).Scan(&siteOK); err != nil || !siteOK {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz lokasyon"})
		return
	}

	priv, pub, err := wgKeypair()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "anahtar üretilemedi"})
		return
	}
	ip, err := a.nextWgIP(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	apiKind := "rest"
	if in.RouterosVer == "6" {
		apiKind = "binary"
	}
	adminUser := "goxadmin"
	adminPass := randPassword(16)
	enrollToken := randPassword(36)

	var d Device
	err = a.db.QueryRow(r.Context(),
		`INSERT INTO devices (site_id, name, routeros_ver, api_kind, wg_pubkey, wg_privkey, wg_ip,
		     wan_mode, wan_interface, wan_ip, wan_gateway, lan_interfaces, lan_subnet, dns_servers,
		     admin_user, admin_password, status, enroll_token)
		 VALUES ($1,$2,$3,$4,$5,$6,$7::inet,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pending',$17)
		 RETURNING id, site_id, name, routeros_ver, api_kind, host(wg_ip), wg_pubkey, wan_mode,
		     wan_interface, COALESCE(wan_ip,''), COALESCE(wan_gateway,''), lan_interfaces, lan_subnet,
		     dns_servers, admin_user, admin_password, status, enroll_token`,
		in.SiteID, in.Name, in.RouterosVer, apiKind, pub, priv, ip,
		in.WanMode, in.WanInterface, nullIfEmpty(in.WanIP), nullIfEmpty(in.WanGateway),
		in.LanInterfaces, in.LanSubnet, in.DNSServers, adminUser, adminPass, enrollToken).
		Scan(&d.ID, &d.SiteID, &d.Name, &d.RouterosVer, &d.ApiKind, &d.WgIP, &d.WgPubkey, &d.WanMode,
			&d.WanInterface, &d.WanIP, &d.WanGateway, &d.LanInterfaces, &d.LanSubnet, &d.DNSServers,
			&d.AdminUser, &d.AdminPassword, &d.Status, &d.EnrollToken)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	d.AdminPassword = "" // secret panelde gösterilmez (yalnız bootstrap config'inde yer alır)
	writeJSON(w, http.StatusCreated, map[string]any{"device": d})
}

func nullIfEmpty(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}

func (a *app) handleDeviceDelete(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz id"})
		return
	}
	ct, err := a.db.Exec(r.Context(),
		`DELETE FROM devices d USING sites s WHERE d.site_id=s.id AND d.id=$1 AND s.customer_id=$2`, id, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "silme hatası"})
		return
	}
	if ct.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// handleDeviceConfig: cihaz için tam RouterOS provizyon betiği (text/plain).
func (a *app) handleDeviceConfig(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz id"})
		return
	}
	var d Device
	var wgPriv string
	err = a.db.QueryRow(r.Context(),
		`SELECT d.name, COALESCE(d.routeros_ver,'7'), COALESCE(d.wg_privkey,''), host(d.wg_ip),
		        COALESCE(d.wan_mode,'dhcp'), COALESCE(d.wan_interface,'ether1'), COALESCE(d.wan_ip,''),
		        COALESCE(d.wan_gateway,''), COALESCE(d.lan_interfaces,''), COALESCE(d.lan_subnet,'172.16.0.0/16'),
		        COALESCE(d.dns_servers,'8.8.8.8'), COALESCE(d.admin_user,'goxadmin'), COALESCE(d.admin_password,'')
		 FROM devices d JOIN sites s ON s.id=d.site_id WHERE d.id=$1 AND s.customer_id=$2`,
		id, cid).Scan(&d.Name, &d.RouterosVer, &wgPriv, &d.WgIP, &d.WanMode, &d.WanInterface, &d.WanIP,
		&d.WanGateway, &d.LanInterfaces, &d.LanSubnet, &d.DNSServers, &d.AdminUser, &d.AdminPassword)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}

	serverPub := a.getSetting(r.Context(), "wg_server_pubkey")
	endpoint := env("GOX_WG_ENDPOINT", "77.223.130.51:443")
	epHost, epPort := endpoint, "443"
	if i := strings.LastIndex(endpoint, ":"); i > 0 {
		epHost, epPort = endpoint[:i], endpoint[i+1:]
	}

	cfg := bootstrapConfig(d, wgPriv, serverPub, epHost, epPort)
	if r.URL.Query().Get("full") == "1" { // tam betik (yedek/teşhis)
		cfg = routerosConfig(d, wgPriv, serverPub, epHost, epPort, env("GOX_RADIUS_SECRET", "goxradius"))
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(cfg))
}

// bootstrapConfig: SADECE tüneli kuran minimal betik. Tünel kalkınca geri kalan
// her şey (guest network, hotspot, WiFi, DHCP, firewall) panelden REST ile uygulanır.
func bootstrapConfig(d Device, wgPriv, serverPub, epHost, epPort string) string {
	var wan string
	if d.WanMode == "static" {
		wan = fmt.Sprintf(`/ip/address add address=%s interface=%s comment="goX WAN"
/ip/route add dst-address=0.0.0.0/0 gateway=%s comment="goX default route"`, d.WanIP, d.WanInterface, d.WanGateway)
	} else {
		wan = fmt.Sprintf(`/ip/dhcp-client add interface=%s use-peer-dns=no add-default-route=yes disabled=no comment="goX WAN"`, d.WanInterface)
	}
	warn := ""
	if d.RouterosVer == "6" {
		warn = "# UYARI: RouterOS v6 native WireGuard desteklemez; bu cihaz icin alternatif tunel gerekir.\n\n"
	}
	return fmt.Sprintf(`# ============ goX baglanti (tunel) bootstrap ============
# Cihaz: %s
# Bu betik YALNIZCA tuneli kurar. Tunel kalkinca cihaz panelde "online" gorunur,
# geri kalan HER SEY (misafir agi, hotspot, WiFi, DHCP) panelden yapilir.
# Sifir-config'li MikroTik terminaline (Winbox/SSH > New Terminal) KOMPLE yapistirin.
%s
# 1) goX yonetim kullanicisi (panel cihazi tunel uzerinden bununla yonetir)
/user add name=%s password="%s" group=full comment="goX yonetim - silmeyin"

# 2) WAN (internet - tunelin disari cikabilmesi icin)
%s
/ip/dns set servers=%s allow-remote-requests=yes

# 3) Yonetim API'si (REST) - sadece tunelden erisilir
/ip/service set www disabled=no
/ip/service set api disabled=no

# 4) WireGuard tuneli (goX merkez)
/interface/wireguard add name=gox-wg listen-port=51820 private-key="%s"
/interface/wireguard/peers add interface=gox-wg public-key="%s" \
    endpoint-address=%s endpoint-port=%s allowed-address=10.88.0.0/24 persistent-keepalive=25s
/ip/address add address=%s/24 interface=gox-wg

# 5) Guvenlik: yonetim YALNIZ tunelden; WAN'dan girise kapali
/ip/firewall/filter add chain=input action=accept connection-state=established,related comment="goX"
/ip/firewall/filter add chain=input action=accept in-interface=gox-wg comment="goX yonetim (tunel)"
/ip/firewall/filter add chain=input action=accept protocol=icmp
/ip/firewall/filter add chain=input action=drop in-interface=%s comment="WAN input drop"
# ============ bootstrap sonu — panelde 'online' gorununce devam edin ============
`, d.Name, warn, d.AdminUser, d.AdminPassword, wan, d.DNSServers, wgPriv, serverPub, epHost, epPort, d.WgIP, d.WanInterface)
}

// routerosConfig: sıfır config'li MikroTik (RouterOS v7) için eksiksiz provizyon betiği.
func routerosConfig(d Device, wgPriv, serverPub, epHost, epPort, radiusSecret string) string {
	gw, pool, cidr := lanParams(d.LanSubnet)

	// LAN bridge portları
	var ports strings.Builder
	for _, p := range strings.Split(d.LanInterfaces, ",") {
		p = strings.TrimSpace(p)
		if p != "" {
			fmt.Fprintf(&ports, "add bridge=gox-lan interface=%s\n", p)
		}
	}

	// WAN bölümü
	var wan string
	if d.WanMode == "static" {
		wan = fmt.Sprintf(`# WAN: STATIK (hat dogrudan MikroTik'te sonlaniyor)
/ip/address add address=%s interface=%s comment="goX WAN"
/ip/route add dst-address=0.0.0.0/0 gateway=%s comment="goX default route"
`, d.WanIP, d.WanInterface, d.WanGateway)
	} else {
		wan = fmt.Sprintf(`# WAN: DHCP (modem/firewall sonrasi)
/ip/dhcp-client add interface=%s use-peer-dns=no add-default-route=yes disabled=no comment="goX WAN"
`, d.WanInterface)
	}

	warn := ""
	if d.RouterosVer == "6" {
		warn = "# UYARI: RouterOS v6 native WireGuard desteklemez; bu cihaz icin alternatif tunel gerekir.\n\n"
	}

	return fmt.Sprintf(`# ================= goX cihaz provizyonu =================
# Cihaz: %s   |   RouterOS v%s   |   WAN: %s   |   Ic ag: %s
# Bu betigi MikroTik terminaline KOMPLE yapistirin (Winbox/SSH > New Terminal).
# Sifir config'li cihaz icin tasarlandi. Bittiginde cihaz goX paneline baglanir.
%s
# --- 1) Yonetim kullanicisi (goX) ---
/user add name=%s password="%s" group=full comment="goX yonetim - degistirmeyin"

# --- 2) WAN (internet tarafi) ---
%s
# --- 3) DNS ---
/ip/dns set servers=%s allow-remote-requests=yes

# --- 4) Misafir ic agi (bridge + portlar) ---
/interface/bridge add name=gox-lan
/interface/bridge/port
%s/ip/address add address=%s/%s interface=gox-lan
/ip/pool add name=gox-pool ranges=%s
/ip/dhcp-server add name=gox-dhcp interface=gox-lan address-pool=gox-pool lease-time=1h disabled=no
/ip/dhcp-server/network add address=%s gateway=%s dns-server=%s

# --- 5) NAT (misafir internet cikisi) ---
/ip/firewall/nat add chain=srcnat out-interface=%s action=masquerade comment="goX guest out"

# --- 6) WireGuard tuneli (goX merkez) ---
/interface/wireguard add name=gox-wg listen-port=51820 private-key="%s"
/interface/wireguard/peers add interface=gox-wg public-key="%s" \
    endpoint-address=%s endpoint-port=%s allowed-address=10.88.0.0/24 persistent-keepalive=25s
/ip/address add address=%s/24 interface=gox-wg

# --- 7) RADIUS (goX merkez, tunel uzerinden) ---
/radius add service=hotspot address=10.88.0.1 secret="%s" timeout=3s comment="goX"

# --- 8) Hotspot (misafir karsilama / kimlik) ---
/ip/hotspot/profile add name=gox-profile hotspot-address=%s login-by=mac,http-chap,http-pap use-radius=yes
/ip/hotspot add name=gox-hotspot interface=gox-lan address-pool=gox-pool profile=gox-profile addresses-per-mac=unlimited
# Portal sayfasi yetkisiz misafire de acilabilsin (captive portal alan adi)
/ip/hotspot/walled-garden add dst-host=*.xshield.com.tr action=allow comment="goX portal"

# --- 9) Guvenlik duvari (temel + misafir kimlik kapisi) ---
/ip/firewall/filter
add chain=input action=accept connection-state=established,related comment="goX"
add chain=input action=accept protocol=icmp
add chain=input action=accept in-interface=gox-lan comment="LAN -> router"
add chain=input action=accept in-interface=gox-wg comment="goX mgmt"
add chain=input action=drop in-interface=%s comment="WAN input drop"
# KRITIK: misafir agindan internete cikis YALNIZ kimligi dogrulanmis oturumlara.
# (forward default policy accept oldugu icin bu DROP olmadan yetkisiz cihaz sizabilir.)
add chain=forward action=accept in-interface=gox-lan out-interface=%s hotspot=auth comment="goX: dogrulanmis misafir -> internet"
add chain=forward action=drop in-interface=gox-lan out-interface=%s comment="goX: dogrulanmamis misafir internete CIKAMAZ"
# ================= goX provizyon sonu =================
# Yonetim kullanicisi: %s  /  Sifre: %s
`,
		d.Name, d.RouterosVer, d.WanMode, cidr, warn,
		d.AdminUser, d.AdminPassword,
		wan,
		d.DNSServers,
		ports.String(), gw, prefixOf(cidr), pool, cidr, gw, gw,
		d.WanInterface,
		wgPriv, serverPub, epHost, epPort, d.WgIP,
		radiusSecret,
		gw,
		d.WanInterface, d.WanInterface, d.WanInterface,
		d.AdminUser, d.AdminPassword,
	)
}

func prefixOf(cidr string) string {
	if i := strings.LastIndex(cidr, "/"); i >= 0 {
		return cidr[i+1:]
	}
	return "24"
}
