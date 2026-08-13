package main

import (
	"encoding/json"
	"net/http"
	"strconv"
)

// GET /monitoring — müşterinin tüm cihazlarının anlık izleme tablosu (filo) + özet.
func (a *app) handleMonitoring(w http.ResponseWriter, r *http.Request) {
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
		`SELECT d.id, d.name, s.name, d.status, COALESCE(d.board_name,''), COALESCE(d.ros_detected,''),
		        COALESCE(m.active_count,0), COALESCE(m.wan_rx_bps,0), COALESCE(m.wan_tx_bps,0),
		        COALESCE(m.cpu_load,0), COALESCE(m.mem_used,0), COALESCE(m.mem_total,0), COALESCE(m.uptime_s,0),
		        COALESCE(EXTRACT(EPOCH FROM (now()-m.updated_at))::int, 999999),
		        COALESCE(m.temp_c,0), COALESCE(m.sensors::text,'{}')
		 FROM devices d JOIN sites s ON s.id=d.site_id
		 LEFT JOIN device_metrics m ON m.device_id=d.id
		 WHERE s.customer_id=$1 AND ($2=0 OR d.site_id=$2) ORDER BY d.id`, cid, loc)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	var online, totalActive int
	var totalRx, totalTx int64
	for rows.Next() {
		var id int64
		var name, site, status, board, ver string
		var active, cpu, ageS, temp int
		var rx, tx, memU, memT, up int64
		var sensors string
		if rows.Scan(&id, &name, &site, &status, &board, &ver, &active, &rx, &tx, &cpu, &memU, &memT, &up, &ageS, &temp, &sensors) != nil {
			continue
		}
		// metrik 60sn'den eskiyse "stale" (ajan güncellemiyor) — online ama veri taze değil
		live := status == "online" && ageS < 60
		if live {
			online++
			totalActive += active
			totalRx += rx
			totalTx += tx
		}
		memPct := 0
		if memT > 0 {
			memPct = int(memU * 100 / memT)
		}
		list = append(list, map[string]any{
			"id": id, "name": name, "site": site, "status": status, "live": live,
			"board": board, "version": ver, "active": active,
			"rx_bps": rx, "tx_bps": tx, "cpu": cpu, "mem_pct": memPct, "uptime_s": up,
			"age_s": ageS, "temp_c": temp, "sensors": json.RawMessage(sensors),
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"devices": list,
		"summary": map[string]any{
			"total": len(list), "online": online,
			"active_guests": totalActive, "rx_bps": totalRx, "tx_bps": totalTx,
		},
	})
}

var histRanges = map[string]string{"1h": "1 hour", "6h": "6 hours", "24h": "24 hours"}

// GET /devices/{id}/metrics/history?range=1h — zaman-serisi (grafikler).
func (a *app) handleMetricsHistory(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	rng := r.URL.Query().Get("range")
	iv, ok := histRanges[rng]
	if !ok {
		iv = "1 hour"
	}
	rows, err := a.db.Query(r.Context(),
		`SELECT to_char(h.ts,'HH24:MI'), COALESCE(h.active_count,0), COALESCE(h.wan_rx_bps,0),
		        COALESCE(h.wan_tx_bps,0), COALESCE(h.cpu_load,0), COALESCE(h.mem_pct,0), COALESCE(h.temp_c,0)
		 FROM device_metrics_history h JOIN devices d ON d.id=h.device_id JOIN sites s ON s.id=d.site_id
		 WHERE h.device_id=$1 AND s.customer_id=$2 AND h.ts > now()-($3)::interval
		 ORDER BY h.ts`, id, cid, iv)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	pts := []map[string]any{}
	for rows.Next() {
		var t string
		var active, cpu, mem, temp int
		var rx, tx int64
		if rows.Scan(&t, &active, &rx, &tx, &cpu, &mem, &temp) == nil {
			pts = append(pts, map[string]any{"t": t, "active": active, "rx_bps": rx, "tx_bps": tx, "cpu": cpu, "mem_pct": mem, "temp_c": temp})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"points": pts})
}
