package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// Conn: panelde "Bağlantılar" satırı — canlı oturum + whitelist + son doğrulama birleşimi.
type Conn struct {
	Mac       string  `json:"mac"`
	IP        string  `json:"ip"`
	Online    bool    `json:"online"`
	UptimeS   int     `json:"uptime_s"`
	TimeLeftS *int    `json:"time_left_s"`
	Device    string  `json:"device"`
	SiteID    int64   `json:"site_id"`
	SiteName  string  `json:"site_name"`
	ListType  string  `json:"list_type"` // normal | blacklist | "" (sadece oturum, listede yok)
	Profile   string  `json:"profile"`
	DownKbps  *int    `json:"down_kbps"`
	UpKbps    *int    `json:"up_kbps"`
	Identity  string  `json:"identity"`
	Method    string  `json:"method"`
	LastSeen  string  `json:"last_seen"`
}

// handleConnections: aktif lokasyondaki tüm bilinen misafir cihazları (canlı + whitelist + kimlik).
func (a *app) handleConnections(w http.ResponseWriter, r *http.Request) {
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

	conns := map[string]*Conn{} // anahtar: lower(mac)
	get := func(macRaw string) *Conn {
		k := strings.ToLower(strings.TrimSpace(macRaw))
		if c, ok := conns[k]; ok {
			return c
		}
		c := &Conn{Mac: k}
		conns[k] = c
		return c
	}

	// 1) Canlı oturumlar (ajan yazıyor)
	rows, err := a.db.Query(r.Context(),
		`SELECT s.mac, COALESCE(s.ip,''), s.uptime_s, s.time_left_s, s.updated_at, d.name, d.site_id, si.name
		 FROM active_sessions s JOIN devices d ON d.id=s.device_id JOIN sites si ON si.id=d.site_id
		 WHERE si.customer_id=$1 AND ($2=0 OR d.site_id=$2)`, cid, loc)
	if err == nil {
		for rows.Next() {
			var mac, ip, dev, siteName string
			var up int
			var tl *int
			var siteID int64
			var upd time.Time
			if rows.Scan(&mac, &ip, &up, &tl, &upd, &dev, &siteID, &siteName) == nil {
				c := get(mac)
				c.IP, c.UptimeS, c.TimeLeftS, c.Device, c.SiteID, c.SiteName = ip, up, tl, dev, siteID, siteName
				c.Online = time.Since(upd) < 2*time.Minute
				c.LastSeen = upd.Format("2006-01-02 15:04")
			}
		}
		rows.Close()
	}

	// 2) Erişim listesi (whitelist/blacklist + profil/hız)
	rows2, err := a.db.Query(r.Context(),
		`SELECT m.mac::text, m.site_id, si.name, m.list_type, COALESCE(cp.name,''), cp.rate_down_kbps, cp.rate_up_kbps
		 FROM mac_entries m JOIN sites si ON si.id=m.site_id LEFT JOIN connection_profiles cp ON cp.id=m.profile_id
		 WHERE si.customer_id=$1 AND ($2=0 OR m.site_id=$2)`, cid, loc)
	if err == nil {
		for rows2.Next() {
			var mac, siteName, lt, prof string
			var siteID int64
			var dn, up *int
			if rows2.Scan(&mac, &siteID, &siteName, &lt, &prof, &dn, &up) == nil {
				c := get(mac)
				c.ListType, c.Profile, c.DownKbps, c.UpKbps = lt, prof, dn, up
				if c.SiteID == 0 {
					c.SiteID, c.SiteName = siteID, siteName
				}
			}
		}
		rows2.Close()
	}

	// 3) En son doğrulama (kim/nasıl) — MAC başına en yeni
	rows3, err := a.db.Query(r.Context(),
		`SELECT DISTINCT ON (lower(gv.mac)) lower(gv.mac), COALESCE(gv.method,''), COALESCE(gv.identity,''), gv.created_at
		 FROM guest_verifications gv JOIN sites si ON si.id=gv.site_id
		 WHERE si.customer_id=$1 AND ($2=0 OR gv.site_id=$2) AND gv.mac IS NOT NULL
		 ORDER BY lower(gv.mac), gv.id DESC`, cid, loc)
	if err == nil {
		for rows3.Next() {
			var mac, method, identity string
			var at time.Time
			if rows3.Scan(&mac, &method, &identity, &at) == nil {
				c := get(mac)
				c.Method, c.Identity = method, identity
				if c.LastSeen == "" {
					c.LastSeen = at.Format("2006-01-02 15:04")
				}
			}
		}
		rows3.Close()
	}

	// Filtreler
	q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
	fMethod := r.URL.Query().Get("method")
	fStatus := r.URL.Query().Get("status") // online | offline | blocked

	list := make([]*Conn, 0, len(conns))
	for _, c := range conns {
		if q != "" && !strings.Contains(strings.ToLower(c.Mac), q) && !strings.Contains(strings.ToLower(c.Identity), q) && !strings.Contains(strings.ToLower(c.IP), q) {
			continue
		}
		if fMethod != "" && c.Method != fMethod {
			continue
		}
		switch fStatus {
		case "online":
			if !c.Online {
				continue
			}
		case "offline":
			if c.Online {
				continue
			}
		case "blocked":
			if c.ListType != "blacklist" {
				continue
			}
		}
		list = append(list, c)
	}
	// online önce, sonra son görülme
	sortConns(list)
	writeJSON(w, http.StatusOK, map[string]any{"connections": list})
}

func sortConns(list []*Conn) {
	for i := 1; i < len(list); i++ {
		for j := i; j > 0; j-- {
			a, b := list[j-1], list[j]
			// online > offline; eşitse son görülme yeni > eski
			if (!a.Online && b.Online) || (a.Online == b.Online && a.LastSeen < b.LastSeen) {
				list[j-1], list[j] = b, a
			} else {
				break
			}
		}
	}
}

// handleConnectionAction: bir MAC için çıkar(kick) / engelle(block) / izin(allow).
func (a *app) handleConnectionAction(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	var in struct {
		SiteID int64  `json:"site_id"`
		Mac    string `json:"mac"`
		Action string `json:"action"` // kick | block | allow
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Mac = strings.TrimSpace(strings.ToLower(in.Mac))
	if in.Mac == "" || in.SiteID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "site ve MAC gerekli"})
		return
	}
	if !a.siteOwned(r.Context(), in.SiteID, cid) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "lokasyon yok"})
		return
	}
	switch in.Action {
	case "kick":
		// Erişim listesinden çıkar (radcheck reddeder) + oturum/conntrack temizle.
		_, _ = a.db.Exec(r.Context(), `DELETE FROM mac_entries WHERE site_id=$1 AND mac=$2::macaddr`, in.SiteID, in.Mac)
		a.enqueueCoaForMac(r.Context(), in.SiteID, in.Mac)
		a.enqueueDisconnectMac(r.Context(), in.SiteID, in.Mac)
	case "block":
		if _, err := a.db.Exec(r.Context(),
			`INSERT INTO mac_entries (site_id,mac,list_type) VALUES ($1,$2::macaddr,'blacklist')
			 ON CONFLICT (site_id,mac) DO UPDATE SET list_type='blacklist', profile_id=NULL`, in.SiteID, in.Mac); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "engellenemedi"})
			return
		}
		a.enqueueCoaForMac(r.Context(), in.SiteID, in.Mac)
		a.enqueueDisconnectMac(r.Context(), in.SiteID, in.Mac)
	case "allow":
		// Engeli kaldır: blacklist → normal.
		_, _ = a.db.Exec(r.Context(), `UPDATE mac_entries SET list_type='normal' WHERE site_id=$1 AND mac=$2::macaddr AND list_type='blacklist'`, in.SiteID, in.Mac)
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "bilinmeyen işlem"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
