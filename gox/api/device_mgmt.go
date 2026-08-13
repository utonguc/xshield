package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// guestConfigScript: misafir ağı (bridge, DHCP, hotspot, RADIUS, walled-garden, firewall, WiFi)
// RouterOS komut betiği. Ajan bunu /system/script olarak ekleyip çalıştırır (apply_network).
func guestConfigScript(d Device, radiusSecret string) string {
	gw, pool, cidr := lanParams(d.LanSubnet)
	var ports strings.Builder
	for _, p := range strings.Split(d.LanInterfaces, ",") {
		p = strings.TrimSpace(p)
		if p != "" {
			ports.WriteString(fmt.Sprintf("/interface/bridge/port add bridge=gox-lan interface=%s\n", p))
		}
	}
	wifi := ""
	if d.HasWifi && d.WifiBridge {
		ssid := strings.TrimSpace(d.SSID)
		if ssid == "" {
			ssid = "goX"
		}
		if d.WifiKind == "wifi" { // wifiwave2
			wifi = fmt.Sprintf(`/interface/wifi set [find default-name=wifi1] configuration.mode=ap configuration.ssid="%s" disabled=no
/interface/bridge/port add bridge=gox-lan interface=wifi1
`, ssid)
		} else { // klasik wireless
			wifi = fmt.Sprintf(`/interface/wireless set [find default-name=wlan1] mode=ap-bridge ssid="%s" disabled=no
/interface/bridge/port add bridge=gox-lan interface=wlan1
`, ssid)
		}
	}
	// Önce eski goX misafir-ağı nesnelerini kaldır (idempotent: tekrar tekrar uygulanabilir).
	// Tüneli (gox-wg) ve WAN'ı ASLA bozmaz; sadece misafir tarafını sıfırlayıp yeniden kurar.
	// NOT: RouterOS script ilk hatada durur; bu yüzden add edilen HER nesnenin remove'u
	// nesneyi gerçekten bulmalı (network adres ile, ötekiler ad/comment ile).
	cleanup := fmt.Sprintf(`/ip/hotspot remove [find name=gox-hotspot]
/ip/hotspot/profile remove [find name=gox-profile]
/ip/hotspot/walled-garden remove [find comment="goX portal"]
/ip/dhcp-server remove [find name=gox-dhcp]
/ip/dhcp-server/network remove [find address="%s"]
/ip/pool remove [find name=gox-pool]
/ip/firewall/nat remove [find comment="goX guest out"]
/ip/firewall/filter remove [find comment~"goX:"]
/ip/firewall/filter remove [find action=fasttrack-connection]
/radius remove [find comment="goX"]
/interface/bridge port remove [find]
/ip/address remove [find interface=gox-lan]
/interface/bridge remove [find name=gox-lan]
`, cidr)
	setup := fmt.Sprintf(`/interface/bridge add name=gox-lan
%s/ip/address add address=%s/%s interface=gox-lan
/ip/pool add name=gox-pool ranges=%s
/ip/dhcp-server add name=gox-dhcp interface=gox-lan address-pool=gox-pool lease-time=1h disabled=no
/ip/dhcp-server/network add address=%s gateway=%s dns-server=%s comment="goX"
/ip/firewall/nat add chain=srcnat src-address=%s action=masquerade out-interface=%s comment="goX guest out"
/radius add service=hotspot address=10.88.0.1 secret="%s" timeout=3s comment="goX"
/ip/hotspot/profile add name=gox-profile hotspot-address=%s login-by=mac,http-chap,http-pap use-radius=yes
/ip/hotspot add name=gox-hotspot interface=gox-lan address-pool=gox-pool profile=gox-profile addresses-per-mac=unlimited
/ip/hotspot/walled-garden add dst-host=*.xshield.com.tr action=allow comment="goX portal"
%s`,
		ports.String(), gw, prefixOf(cidr), pool, cidr, gw, gw,
		cidr, d.WanInterface, radiusSecret, gw, wifi)
	// Misafir geçiş kapısı (auth gate). Kritik: drop kuralı, varsayılan
	// "accept established,related,untracked"in ÜSTÜNDE olmalı (yoksa açık bağlantılar sızar).
	// Ama o kural her cihazda olmayabilir (minimal/ZTP config) → place-before boşsa RouterOS
	// 404 verir. Bu yüzden kural varsa place-before, yoksa düz ekle (kural yoksa zaten sızıntı yok).
	fwGate := fmt.Sprintf(`:local est [/ip/firewall/filter find where chain=forward action=accept connection-state="established,related,untracked"]
:if ([:len $est] > 0) do={
  /ip/firewall/filter add chain=forward action=accept src-address=%s out-interface=%s hotspot=auth comment="goX: dogrulanmis -> internet" place-before=$est
  /ip/firewall/filter add chain=forward action=drop src-address=%s out-interface=%s comment="goX: dogrulanmamis CIKAMAZ" place-before=$est
} else={
  /ip/firewall/filter add chain=forward action=accept src-address=%s out-interface=%s hotspot=auth comment="goX: dogrulanmis -> internet"
  /ip/firewall/filter add chain=forward action=drop src-address=%s out-interface=%s comment="goX: dogrulanmamis CIKAMAZ"
}
`, cidr, d.WanInterface, cidr, d.WanInterface, cidr, d.WanInterface, cidr, d.WanInterface)
	// Karşılama ekranı: hotspot login.html'i goX portalına yönlendiren şablonla değiştir.
	// html-directory board'a göre değişir (flash/hotspot veya hotspot) → profilden dinamik oku.
	// fetch'i on-error ile sar: olası bir indirme hatası tüm yapılandırmayı düşürmesin.
	login := fmt.Sprintf(`:local hd [/ip/hotspot/profile get [find name=gox-profile] html-directory]
:do { /tool fetch url="https://%s/hotspot-login?site=%d" dst-path="$hd/login.html" mode=https check-certificate=no } on-error={ :log warning "goX login.html indirilemedi" }
:do { /tool fetch url="https://%s/hotspot-redirect" dst-path="$hd/redirect.html" mode=https check-certificate=no } on-error={ :log warning "goX redirect.html indirilemedi" }
/ip/hotspot enable [find name=gox-hotspot]
`, goxPublicHost, d.SiteID, goxPublicHost)
	return cleanup + setup + fwGate + login
}

var allowedCommands = map[string]bool{
	"info": true, "apply_network": true, "reboot": true, "shutdown": true,
	"ssid": true, "dhcp_leases": true, "hotspot_toggle": true, "sync_reservations": true,
	"nat_toggle": true, "kick_all": true, "set_dns": true,
	"sync_policy": true, "get_logs": true, "set_time": true, "upgrade": true, "factory_reset": true,
	"top_talkers": true, "restore_config": true, "set_admin_pass": true,
	"disconnect_mac": true,
}

func (a *app) handleDeviceCommand(w http.ResponseWriter, r *http.Request) {
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
	var in struct {
		Action string         `json:"action"`
		Params map[string]any `json:"params"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	if !allowedCommands[in.Action] {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bilinmeyen komut"})
		return
	}
	// Cihaz bu müşteriye mi ait + alanları yükle
	var d Device
	if err := a.db.QueryRow(r.Context(),
		`SELECT d.id, d.site_id, d.name, COALESCE(d.lan_interfaces,'ether2,ether3,ether4,ether5'), COALESCE(d.lan_subnet,'172.16.0.0/16'),
		        COALESCE(d.wan_interface,'ether1'), COALESCE(d.has_wifi,false), COALESCE(d.wifi_kind,''),
		        d.wifi_bridge, COALESCE(d.ssid,''), COALESCE(d.enroll_token,'')
		 FROM devices d JOIN sites s ON s.id=d.site_id WHERE d.id=$1 AND s.customer_id=$2`,
		id, cid).Scan(&d.ID, &d.SiteID, &d.Name, &d.LanInterfaces, &d.LanSubnet, &d.WanInterface, &d.HasWifi, &d.WifiKind,
		&d.WifiBridge, &d.SSID, &d.EnrollToken); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}

	params := in.Params
	if params == nil {
		params = map[string]any{}
	}
	// apply_network: guest config + rezervasyon + walled garden + engelleme betiğini üret (config tek kaynak Go'da)
	if in.Action == "apply_network" {
		params["script"] = guestConfigScript(d, env("GOX_RADIUS_SECRET", "goxradius")) +
			a.reservationLeases(r.Context(), id) + a.walledGardenScript(r.Context(), id) +
			a.mailWalledGardenScript(r.Context(), id) + a.waWalledGardenScript(r.Context(), id) + a.blockRulesScript(r.Context(), id)
	}
	// sync_reservations: yalnız DHCP rezervasyonlarını canlı uygular (misafir ağına dokunmaz, kopma yok)
	if in.Action == "sync_reservations" {
		params["script"] = a.reservationLeases(r.Context(), id)
	}
	// sync_policy: walled garden + içerik/port engelleme kurallarını canlı uygular (kopmasız)
	if in.Action == "sync_policy" {
		params["script"] = a.walledGardenScript(r.Context(), id) +
			a.mailWalledGardenScript(r.Context(), id) + a.waWalledGardenScript(r.Context(), id) + a.blockRulesScript(r.Context(), id)
	}
	// set_admin_pass: yeni rastgele yönetim parolası üret, DB'yi şimdi güncelle, ajana ilet (cihaz user'ı değişir)
	if in.Action == "set_admin_pass" {
		np := genVoucherCode(16)
		params["password"] = np
		_, _ = a.db.Exec(r.Context(), `UPDATE devices SET admin_password=$1 WHERE id=$2`, np, id)
	}
	pj, _ := json.Marshal(params)

	var cmdID int64
	if err := a.db.QueryRow(r.Context(),
		`INSERT INTO device_commands (device_id, action, params) VALUES ($1,$2,$3) RETURNING id`,
		id, in.Action, string(pj)).Scan(&cmdID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "komut kuyruğa eklenemedi"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "command_id": cmdID})
}

func (a *app) handleDeviceCommands(w http.ResponseWriter, r *http.Request) {
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
	rows, err := a.db.Query(r.Context(),
		`SELECT c.id, c.action, c.status, COALESCE(c.result,''),
		        to_char(c.created_at,'YYYY-MM-DD HH24:MI:SS'), COALESCE(to_char(c.finished_at,'HH24:MI:SS'),'')
		 FROM device_commands c JOIN devices d ON d.id=c.device_id JOIN sites s ON s.id=d.site_id
		 WHERE c.device_id=$1 AND s.customer_id=$2 ORDER BY c.id DESC LIMIT 30`, id, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var cid2 int64
		var action, status, result, created, finished string
		if rows.Scan(&cid2, &action, &status, &result, &created, &finished) == nil {
			list = append(list, map[string]any{
				"id": cid2, "action": action, "status": status, "result": result,
				"created_at": created, "finished_at": finished,
			})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"commands": list})
}

// handleDeviceUpdate: cihaz ayarları (SSID, WiFi köprü, LAN/DNS/WAN). apply_network bunları kullanır.
func (a *app) handleDeviceUpdate(w http.ResponseWriter, r *http.Request) {
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
	var in struct {
		Name          *string `json:"name"`
		SSID          *string `json:"ssid"`
		WifiBridge    *bool   `json:"wifi_bridge"`
		LanSubnet     *string `json:"lan_subnet"`
		LanInterfaces *string `json:"lan_interfaces"`
		DNSServers    *string `json:"dns_servers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	ct, err := a.db.Exec(r.Context(),
		`UPDATE devices d SET
		   name=COALESCE($1,name), ssid=COALESCE($2,ssid), wifi_bridge=COALESCE($3,wifi_bridge),
		   lan_subnet=COALESCE($4,lan_subnet), lan_interfaces=COALESCE($5,lan_interfaces),
		   dns_servers=COALESCE($6,dns_servers)
		 FROM sites s WHERE d.site_id=s.id AND d.id=$7 AND s.customer_id=$8`,
		in.Name, in.SSID, in.WifiBridge, in.LanSubnet, in.LanInterfaces, in.DNSServers, id, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "güncelleme hatası"})
		return
	}
	if ct.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
