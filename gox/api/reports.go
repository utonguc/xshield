package main

import (
	"net/http"
	"strconv"
	"strings"
)

// handleReports: erişim kayıtlarından (access_logs, event='login') misafir analitiği.
// Filtre: site, from, to (tarih). Tenant yöneticisi içindir.
func (a *app) handleReports(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	if !a.isTenantAdmin(r.Context(), u) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "yetkiniz yok"})
		return
	}
	q := r.URL.Query()
	where := "l.customer_id=$1 AND l.event='login'"
	args := []any{cid}
	if s := strings.TrimSpace(q.Get("site")); s != "" && s != "0" {
		args = append(args, s)
		where += " AND l.site_id=$" + strconv.Itoa(len(args))
	}
	if f := strings.TrimSpace(q.Get("from")); f != "" {
		args = append(args, f)
		where += " AND l.ts >= $" + strconv.Itoa(len(args)) + "::date"
	}
	if t := strings.TrimSpace(q.Get("to")); t != "" {
		args = append(args, t)
		where += " AND l.ts < ($" + strconv.Itoa(len(args)) + "::date + interval '1 day')"
	}

	var total, uniq int
	_ = a.db.QueryRow(r.Context(),
		`SELECT count(*), count(DISTINCT lower(mac)) FROM access_logs l WHERE `+where, args...).Scan(&total, &uniq)

	rowsToList := func(sql string) []map[string]any {
		rows, qerr := a.db.Query(r.Context(), sql, args...)
		if qerr != nil {
			return []map[string]any{}
		}
		defer rows.Close()
		out := []map[string]any{}
		for rows.Next() {
			var label string
			var n int
			if rows.Scan(&label, &n) == nil {
				out = append(out, map[string]any{"label": label, "count": n})
			}
		}
		return out
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"total":  total,
		"unique": uniq,
		"by_day": rowsToList(`SELECT to_char(l.ts,'YYYY-MM-DD'), count(*) FROM access_logs l WHERE ` + where + ` GROUP BY 1 ORDER BY 1`),
		"by_hour": rowsToList(`SELECT lpad(extract(hour from l.ts)::text,2,'0'), count(*) FROM access_logs l WHERE ` + where +
			` GROUP BY 1 ORDER BY 1`),
		"by_method": rowsToList(`SELECT COALESCE(NULLIF(l.method,''),'-'), count(*) FROM access_logs l WHERE ` + where + ` GROUP BY 1 ORDER BY 2 DESC`),
		"by_site":   rowsToList(`SELECT COALESCE(s.name,'-'), count(*) FROM access_logs l LEFT JOIN sites s ON s.id=l.site_id WHERE ` + where + ` GROUP BY 1 ORDER BY 2 DESC`),
	})
}

// GET /reports/locations — tenant düzeyi konsolide rapor (lokasyon kırılımlı). Yalnız tenant yöneticisi.
func (a *app) handleConsolidatedReport(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	if !a.isTenantAdmin(r.Context(), u) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "konsolide rapor yalnız tenant yöneticisine açık"})
		return
	}
	rows, err := a.db.Query(r.Context(),
		`SELECT s.id, s.name,
		   (SELECT count(*) FROM devices d WHERE d.site_id=s.id),
		   (SELECT count(*) FROM devices d JOIN device_metrics m ON m.device_id=d.id
		      WHERE d.site_id=s.id AND d.status='online' AND m.updated_at>now()-interval '60 seconds'),
		   (SELECT count(*) FROM active_sessions a JOIN devices d ON d.id=a.device_id WHERE d.site_id=s.id),
		   (SELECT COALESCE(SUM(m.wan_rx_bps),0) FROM device_metrics m JOIN devices d ON d.id=m.device_id
		      WHERE d.site_id=s.id AND m.updated_at>now()-interval '60 seconds'),
		   (SELECT count(*) FROM pms_guests g WHERE g.site_id=s.id AND g.checkin<=current_date
		      AND (g.checkout IS NULL OR g.checkout>=current_date)),
		   (SELECT COALESCE(avg(rating) FILTER (WHERE rating>0),0)::float8 FROM feedback f WHERE f.site_id=s.id),
		   (SELECT count(*) FROM feedback f WHERE f.site_id=s.id),
		   (SELECT count(*) FROM alerts al WHERE al.status='active'
		      AND al.device_id IN (SELECT id FROM devices WHERE site_id=s.id))
		 FROM sites s WHERE s.customer_id=$1 ORDER BY s.id`, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	var tDev, tOnline, tGuests, tInhouse, tFbCount, tAlerts int64
	var tRx int64
	for rows.Next() {
		var id, devTotal, devOnline, guests, inhouse, fbCount, alerts int64
		var rx int64
		var name string
		var fbAvg float64
		if rows.Scan(&id, &name, &devTotal, &devOnline, &guests, &rx, &inhouse, &fbAvg, &fbCount, &alerts) != nil {
			continue
		}
		tDev += devTotal
		tOnline += devOnline
		tGuests += guests
		tRx += rx
		tInhouse += inhouse
		tFbCount += fbCount
		tAlerts += alerts
		list = append(list, map[string]any{
			"site_id": id, "name": name, "devices_total": devTotal, "devices_online": devOnline,
			"guests": guests, "rx_bps": rx, "inhouse": inhouse, "feedback_avg": fbAvg,
			"feedback_count": fbCount, "alerts": alerts,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"locations": list,
		"totals": map[string]any{
			"locations": len(list), "devices_total": tDev, "devices_online": tOnline,
			"guests": tGuests, "rx_bps": tRx, "inhouse": tInhouse, "feedback_count": tFbCount, "alerts": tAlerts,
		},
	})
}
