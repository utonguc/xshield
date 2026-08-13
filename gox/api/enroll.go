package main

import (
	"fmt"
	"io"
	"net/http"
	"strings"
)

// goX ZTP enrollment: cihaz factory-default'tan tek satırla bu betiği çeker, kendi WireGuard
// anahtarını üretir, public key'ini geri bildirir. Private key cihazdan ASLA çıkmaz.

const goxPublicHost = "gox.xshield.com.tr"

// enrollScript: cihazın /import ile çalıştırdığı enrollment betiği (token ile kimliklenir).
func enrollScript(d Device, serverPub, epHost, epPort, token string) string {
	return fmt.Sprintf(`# ===== goX ZTP enrollment =====
# Cihaz: %s — kendi tunel anahtarini URETIR, public key'i goX'a ONCE bildirir
# (fabrika internet'i bozulmadan), SONRA LAN'i temizleyip tuneli kurar.
# --- 1) WireGuard interface'i ONCE kur: anahtar uretilir, bu adim internete DOKUNMAZ ---
:do { /interface wireguard remove [find name=gox-wg] } on-error={}
/interface wireguard add name=gox-wg listen-port=51820
:delay 2s
# --- 2) CALLBACK (GET): public key'i goX'a bildir. Cloudflare RouterOS POST'unu 400'lar,
#        GET geciyor. Fabrika DNS+internet HENUZ bozulmadan; basit iki deneme (loop YOK = import-guvenli). ---
:local pk [/interface/wireguard get [find name=gox-wg] public-key]
:do { /tool fetch url=("https://%s/api/enroll/%s/pubkey?key=" . $pk) check-certificate=no output=none } on-error={}
:delay 4s
:do { /tool fetch url=("https://%s/api/enroll/%s/pubkey?key=" . $pk) check-certificate=no output=none } on-error={}
# --- 3) DNS override (callback'ten SONRA; tunel IP'ye baglanir, DNS gerektirmez) ---
/ip dns set servers=%s allow-remote-requests=yes
# --- 4) LAN-tarafi fabrika ayarlarini temizle (WAN/internet KORUNUR) ---
# dynamic=no: RouterOS'un dinamik "dummy" firewall kurali "cannot remove builtin" verir; onu atla.
:do { /ip firewall nat remove [find dynamic=no] } on-error={}
:do { /ip firewall filter remove [find dynamic=no] } on-error={}
:do { /ip firewall mangle remove [find dynamic=no] } on-error={}
:do { /ip dhcp-server remove [find] } on-error={}
:do { /ip dhcp-server network remove [find] } on-error={}
:do { /ip pool remove [find] } on-error={}
:do { /interface bridge port remove [find] } on-error={}
:do { /ip address remove [find dynamic=no] } on-error={}
:do { /interface bridge remove [find] } on-error={}
# --- 5) yonetim kullanicisi + REST/www ---
:do { /user remove [find name=%s] } on-error={}
/user add name=%s password="%s" group=full comment="goX yonetim - silmeyin"
/ip service set www disabled=no
/ip service set api disabled=no
# --- 6) WireGuard peer + adres + guvenlik (yonetim YALNIZ tunelden) ---
# allowed-address=10.88.0.1/32: cihaz tunelde YALNIZ sunucuya rota bulur (hub). Baska
# cihaza (10.88.0.x) paket bile yonlendiremez — tunel izolasyonu icin savunma derinligi.
/interface wireguard peers add interface=gox-wg public-key="%s" endpoint-address=%s endpoint-port=%s allowed-address=10.88.0.1/32 persistent-keepalive=25s
/ip address add address=%s/24 interface=gox-wg
# gox-wg'yi LAN listesine ekle (fabrika "LAN disindan geleni dusur" kalsa bile tuneli kabul etsin)
:do { /interface list member add list=LAN interface=gox-wg } on-error={}
/ip firewall filter add chain=input action=accept in-interface=gox-wg comment="goX yonetim"
/ip firewall filter add chain=input action=accept connection-state=established,related comment="goX"
/ip firewall filter add chain=input action=accept protocol=icmp
/ip firewall filter add chain=input action=drop in-interface=%s comment="WAN input drop"
:log info "goX enrollment tamamlandi"
`, d.Name, goxPublicHost, token, goxPublicHost, token, d.DNSServers, d.AdminUser, d.AdminUser, d.AdminPassword, serverPub, epHost, epPort, d.WgIP, d.WanInterface)
}

// GET /enroll/{token} — enrollment betiğini döner (token-gated, auth yok).
func (a *app) handleEnrollScript(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.PathValue("token"))
	if token == "" {
		http.Error(w, "token gerekli", http.StatusBadRequest)
		return
	}
	var d Device
	err := a.db.QueryRow(r.Context(),
		`SELECT name, COALESCE(admin_user,'goxadmin'), COALESCE(admin_password,''), host(wg_ip),
		        COALESCE(dns_servers,'8.8.8.8,1.1.1.1'), COALESCE(wan_interface,'ether1')
		 FROM devices WHERE enroll_token=$1`, token).
		Scan(&d.Name, &d.AdminUser, &d.AdminPassword, &d.WgIP, &d.DNSServers, &d.WanInterface)
	if err != nil {
		http.Error(w, "gecersiz token", http.StatusNotFound)
		return
	}
	serverPub := a.getSetting(r.Context(), "wg_server_pubkey")
	endpoint := env("GOX_WG_ENDPOINT", "77.223.130.51:443")
	epHost, epPort := endpoint, "443"
	if i := strings.LastIndex(endpoint, ":"); i > 0 {
		epHost, epPort = endpoint[:i], endpoint[i+1:]
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(enrollScript(d, serverPub, epHost, epPort, token)))
}

// POST /enroll/{token}/pubkey — cihaz kendi WG public key'ini gövdeyle bildirir.
func (a *app) handleEnrollPubkey(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.PathValue("token"))
	body, _ := io.ReadAll(io.LimitReader(r.Body, 512))
	pk := strings.TrimSpace(string(body))
	pk = strings.TrimSpace(strings.TrimPrefix(pk, "key="))
	a.saveEnrollPubkey(w, r, token, pk)
}

// GET /enroll/{token}/pubkey?key=... — cihaz public key'ini GET ile bildirir.
// RouterOS POST'u Cloudflare 400 ile reddediyor; GET geçiyor. Cloudflare/Go query
// çözümünde '+' -> ' ' olur; base64'te boşluk olmadığı için geri '+'a çeviriyoruz.
func (a *app) handleEnrollPubkeyGet(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.PathValue("token"))
	pk := strings.TrimSpace(r.URL.Query().Get("key"))
	pk = strings.ReplaceAll(pk, " ", "+")
	a.saveEnrollPubkey(w, r, token, pk)
}

func (a *app) saveEnrollPubkey(w http.ResponseWriter, r *http.Request, token, pk string) {
	if token == "" || pk == "" {
		http.Error(w, "eksik", http.StatusBadRequest)
		return
	}
	ct, err := a.db.Exec(r.Context(),
		`UPDATE devices SET wg_pubkey=$1, enrolled=true, status='pending' WHERE enroll_token=$2`, pk, token)
	if err != nil || ct.RowsAffected() == 0 {
		http.Error(w, "gecersiz token", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}
