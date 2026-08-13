package main

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// GET /devices/{id}/backup — cihazın goX config'ini .rsc olarak indirir (ZTP tek-satır + misafir-ağı
// betiği). goX yönetimli cihazın config'i DB'den deterministik üretilir; cihaza bağımlı değildir,
// cihaz offline olsa bile alınabilir ve cihazı bire bir yeniden kurar.
func (a *app) handleDeviceBackupDownload(w http.ResponseWriter, r *http.Request) {
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
	err = a.db.QueryRow(r.Context(),
		`SELECT d.name, d.site_id, COALESCE(d.lan_interfaces,'ether2,ether3,ether4,ether5'),
		        COALESCE(d.lan_subnet,'172.16.0.0/16'), COALESCE(d.wan_interface,'ether1'),
		        COALESCE(d.has_wifi,false), COALESCE(d.wifi_kind,''), d.wifi_bridge, COALESCE(d.ssid,''),
		        COALESCE(d.enroll_token,'')
		 FROM devices d JOIN sites s ON s.id=d.site_id WHERE d.id=$1 AND s.customer_id=$2`, id, cid).
		Scan(&d.Name, &d.SiteID, &d.LanInterfaces, &d.LanSubnet, &d.WanInterface, &d.HasWifi, &d.WifiKind,
			&d.WifiBridge, &d.SSID, &d.EnrollToken)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	out := fmt.Sprintf(`# ================= goX cihaz config yedegi =================
# Cihaz: %s
# Bu dosya cihazi bire bir yeniden kurar.
#
# 1) TUNEL: Cihazi fabrika ayarina sifirla, asagidaki tek satiri terminale yapistir:
#    /tool fetch url="https://%s/api/enroll/%s" check-certificate=no output=file dst-path=goxenroll.rsc; :delay 2s; /import goxenroll.rsc
#
# 2) MISAFIR AGI + DHCP REZERVASYONLARI: Cihaz online olunca panelden "Yapilandir" — ya da asagidaki betigi calistir:
# -----------------------------------------------------------
%s%s
# ================= yedek sonu =================
`, d.Name, goxPublicHost, d.EnrollToken,
		guestConfigScript(d, env("GOX_RADIUS_SECRET", "goxradius")), a.reservationLeases(r.Context(), id))

	fn := strings.ReplaceAll(d.Name, " ", "_") + "_goX.rsc"
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+fn+"\"")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(out))
}
