package main

import "net/http"

// Genel Bakış: müşterinin lokasyonlarındaki cihaz ajanının (gox_wg) yazdığı
// canlı verilerden (device_metrics + active_sessions) ve DB sayımlarından
// gerçek değerleri toplar.

type overviewGuest struct {
	Mac       string `json:"mac"`
	IP        string `json:"ip"`
	Type      string `json:"type"`
	UptimeS   int64  `json:"uptime_s"`
	TimeLeftS *int64 `json:"time_left_s"`
}

func (a *app) handleOverview(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	ctx := r.Context()
	loc := a.locationID(u) // 0 = tüm lokasyonlar (konsolide)

	var connected, activeSites, staffCount, pmsInhouse, surveyWeek int64
	var downBps, upBps int64

	_ = a.db.QueryRow(ctx,
		`SELECT count(*) FROM active_sessions a
		 JOIN devices d ON d.id=a.device_id JOIN sites s ON s.id=d.site_id
		 WHERE s.customer_id=$1 AND ($2=0 OR d.site_id=$2)`, cid, loc).Scan(&connected)

	_ = a.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(m.wan_rx_bps),0), COALESCE(SUM(m.wan_tx_bps),0)
		 FROM device_metrics m JOIN devices d ON d.id=m.device_id JOIN sites s ON s.id=d.site_id
		 WHERE s.customer_id=$1 AND ($2=0 OR d.site_id=$2) AND m.updated_at > now()-interval '60 seconds'`, cid, loc).Scan(&downBps, &upBps)

	_ = a.db.QueryRow(ctx,
		`SELECT count(DISTINCT s.id) FROM sites s
		 JOIN devices d ON d.site_id=s.id JOIN device_metrics m ON m.device_id=d.id
		 WHERE s.customer_id=$1 AND ($2=0 OR s.id=$2) AND m.updated_at > now()-interval '60 seconds'`, cid, loc).Scan(&activeSites)

	_ = a.db.QueryRow(ctx,
		`SELECT count(*) FROM mac_entries me
		 JOIN sites s ON s.id=me.site_id JOIN connection_profiles cp ON cp.id=me.profile_id
		 WHERE s.customer_id=$1 AND ($2=0 OR me.site_id=$2) AND cp.kind='staff' AND me.list_type<>'blacklist'`, cid, loc).Scan(&staffCount)

	_ = a.db.QueryRow(ctx,
		`SELECT count(*) FROM pms_guests
		 WHERE customer_id=$1 AND ($2=0 OR site_id=$2) AND checkin <= current_date
		 AND (checkout IS NULL OR checkout >= current_date)`, cid, loc).Scan(&pmsInhouse)

	_ = a.db.QueryRow(ctx,
		`SELECT count(*) FROM survey_responses sr JOIN surveys su ON su.id=sr.survey_id
		 WHERE su.customer_id=$1 AND ($2=0 OR su.site_id=$2) AND sr.submitted_at > now()-interval '7 days'`, cid, loc).Scan(&surveyWeek)

	guests := []overviewGuest{}
	rows, err := a.db.Query(ctx,
		`SELECT a.mac, COALESCE(a.ip,''), COALESCE(cp.name,'—'), a.uptime_s, a.time_left_s
		 FROM active_sessions a
		 JOIN devices d ON d.id=a.device_id JOIN sites s ON s.id=d.site_id
		 LEFT JOIN mac_entries me ON me.site_id=s.id AND lower(me.mac::text)=lower(a.mac)
		 LEFT JOIN connection_profiles cp ON cp.id=me.profile_id
		 WHERE s.customer_id=$1 AND ($2=0 OR d.site_id=$2) ORDER BY a.uptime_s DESC LIMIT 50`, cid, loc)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var g overviewGuest
			if rows.Scan(&g.Mac, &g.IP, &g.Type, &g.UptimeS, &g.TimeLeftS) == nil {
				guests = append(guests, g)
			}
		}
	}

	// Giriş seçenekleri (müşterinin lokasyonlarındaki portal ayarlarından; herhangi birinde açıksa açık)
	var oG, oS, oM, oT, oMer bool
	_ = a.db.QueryRow(ctx,
		`SELECT COALESCE(bool_or(ps.opt_guest),false), COALESCE(bool_or(ps.opt_staff),false),
		        COALESCE(bool_or(ps.opt_meeting),false), COALESCE(bool_or(ps.opt_temp),false),
		        COALESCE(bool_or(ps.opt_mernis),false)
		 FROM portal_settings ps JOIN sites s ON s.id=ps.site_id WHERE s.customer_id=$1 AND ($2=0 OR ps.site_id=$2)`, cid, loc).
		Scan(&oG, &oS, &oM, &oT, &oMer)
	options := []map[string]any{
		{"ad": "Misafir girişi", "acik": oG},
		{"ad": "Personel girişi", "acik": oS},
		{"ad": "Toplantı girişi", "acik": oM},
		{"ad": "2 saatlik geçici erişim", "acik": oT},
		{"ad": "TC ile giriş (MERNIS)", "acik": oMer},
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"options": options,
		"stats": map[string]any{
			"connected":    connected,
			"download_bps": downBps,
			"upload_bps":   upBps,
			"active_sites": activeSites,
			"staff_count":  staffCount,
			"pms_inhouse":  pmsInhouse,
			"survey_week":  surveyWeek,
		},
		"guests": guests,
	})
}
