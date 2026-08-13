package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type alertCfg struct {
	enabled                    bool
	offlineSec, cpu, mem, temp int
	tgToken, tgChat            string
}

func defaultAlertCfg() alertCfg { return alertCfg{true, 120, 90, 90, 75, "", ""} }

// alertLoop: 30 sn'de bir metrikleri eşiklere göre değerlendirir, alarm açar/kapatır + bildirir.
func (a *app) alertLoop() {
	for {
		time.Sleep(30 * time.Second)
		func() {
			defer func() { _ = recover() }()
			a.evaluateAlerts()
		}()
	}
}

func (a *app) loadAlertCfgs(ctx context.Context) map[int64]alertCfg {
	m := map[int64]alertCfg{}
	rows, err := a.db.Query(ctx, `SELECT customer_id, enabled, offline_sec, cpu_pct, mem_pct, temp_c, COALESCE(telegram_token,''), COALESCE(telegram_chat,'') FROM alert_settings`)
	if err != nil {
		return m
	}
	defer rows.Close()
	for rows.Next() {
		var cid int64
		var c alertCfg
		if rows.Scan(&cid, &c.enabled, &c.offlineSec, &c.cpu, &c.mem, &c.temp, &c.tgToken, &c.tgChat) == nil {
			m[cid] = c
		}
	}
	return m
}

func (a *app) evaluateAlerts() {
	ctx := context.Background()
	cfgs := a.loadAlertCfgs(ctx)
	rows, err := a.db.Query(ctx,
		`SELECT d.id, d.name, s.customer_id, d.status, (d.last_seen IS NOT NULL),
		        COALESCE(EXTRACT(EPOCH FROM (now()-m.updated_at))::int, 999999),
		        COALESCE(m.cpu_load,0),
		        CASE WHEN COALESCE(m.mem_total,0)>0 THEN (m.mem_used*100/m.mem_total)::int ELSE 0 END,
		        COALESCE(m.temp_c,0)
		 FROM devices d JOIN sites s ON s.id=d.site_id
		 LEFT JOIN device_metrics m ON m.device_id=d.id`)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var did, cid int64
		var name, status string
		var seen bool
		var ageS, cpu, memPct, temp int
		if rows.Scan(&did, &name, &cid, &status, &seen, &ageS, &cpu, &memPct, &temp) != nil {
			continue
		}
		c, ok := cfgs[cid]
		if !ok {
			c = defaultAlertCfg()
		}
		if !c.enabled {
			continue
		}
		online := status == "online" && ageS < c.offlineSec
		// Çevrimdışı (yalnız daha önce bağlanmış cihazlar için)
		a.setAlert(ctx, did, cid, c, "offline", "critical", seen && !online, name+" çevrimdışı")
		// CPU / RAM (yalnız online cihazlarda anlamlı)
		a.setAlert(ctx, did, cid, c, "high_cpu", "warning", online && cpu >= c.cpu, fmt.Sprintf("%s yüksek CPU (%%%d)", name, cpu))
		a.setAlert(ctx, did, cid, c, "high_mem", "warning", online && memPct >= c.mem, fmt.Sprintf("%s yüksek RAM (%%%d)", name, memPct))
		a.setAlert(ctx, did, cid, c, "high_temp", "warning", online && temp > 0 && c.temp > 0 && temp >= c.temp, fmt.Sprintf("%s yüksek sıcaklık (%d°C)", name, temp))
	}
}

func (a *app) setAlert(ctx context.Context, deviceID, customerID int64, c alertCfg, typ, sev string, active bool, msg string) {
	if active {
		var id int64
		err := a.db.QueryRow(ctx,
			`INSERT INTO alerts (device_id, customer_id, type, severity, message) VALUES ($1,$2,$3,$4,$5)
			 ON CONFLICT (device_id, type) WHERE status='active' DO NOTHING RETURNING id`,
			deviceID, customerID, typ, sev, msg).Scan(&id)
		if err == nil { // yeni alarm
			a.notify(c, "ALARM: "+msg)
		}
	} else {
		ct, _ := a.db.Exec(ctx,
			`UPDATE alerts SET status='resolved', resolved_at=now() WHERE device_id=$1 AND type=$2 AND status='active'`,
			deviceID, typ)
		if ct.RowsAffected() > 0 {
			a.notify(c, "DUZELDI: "+msg)
		}
	}
}

// notify: Telegram (yapılandırılmışsa). Emojisiz düz metin.
func (a *app) notify(c alertCfg, msg string) {
	if strings.TrimSpace(c.tgToken) == "" || strings.TrimSpace(c.tgChat) == "" {
		return
	}
	go func() {
		api := "https://api.telegram.org/bot" + c.tgToken + "/sendMessage"
		_, _ = http.PostForm(api, url.Values{"chat_id": {c.tgChat}, "text": {"goX · " + msg}})
	}()
}

// ---- API ----

func (a *app) handleAlertsList(w http.ResponseWriter, r *http.Request) {
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
		`SELECT al.id, d.name, al.type, al.severity, al.message, al.status, al.acknowledged,
		        to_char(al.started_at,'YYYY-MM-DD HH24:MI'), COALESCE(to_char(al.resolved_at,'HH24:MI'),'')
		 FROM alerts al JOIN devices d ON d.id=al.device_id
		 WHERE al.customer_id=$1 AND ($2=0 OR d.site_id=$2) AND (al.status='active' OR al.started_at > now()-interval '7 days')
		 ORDER BY (al.status='active') DESC, al.started_at DESC LIMIT 100`, cid, loc)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	active := 0
	for rows.Next() {
		var id int64
		var name, typ, sev, msg, status, started, resolved string
		var ack bool
		if rows.Scan(&id, &name, &typ, &sev, &msg, &status, &ack, &started, &resolved) != nil {
			continue
		}
		if status == "active" && !ack {
			active++
		}
		list = append(list, map[string]any{
			"id": id, "device": name, "type": typ, "severity": sev, "message": msg,
			"status": status, "acknowledged": ack, "started_at": started, "resolved_at": resolved,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"alerts": list, "active": active})
}

func (a *app) handleAlertAck(w http.ResponseWriter, r *http.Request) {
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
	a.db.Exec(r.Context(), `UPDATE alerts SET acknowledged=true WHERE id=$1 AND customer_id=$2`, id, cid)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleAlertSettingsGet(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	c := defaultAlertCfg()
	a.db.QueryRow(r.Context(),
		`SELECT enabled, offline_sec, cpu_pct, mem_pct, temp_c, COALESCE(telegram_token,''), COALESCE(telegram_chat,'') FROM alert_settings WHERE customer_id=$1`, cid).
		Scan(&c.enabled, &c.offlineSec, &c.cpu, &c.mem, &c.temp, &c.tgToken, &c.tgChat)
	writeJSON(w, http.StatusOK, map[string]any{
		"enabled": c.enabled, "offline_sec": c.offlineSec, "cpu_pct": c.cpu, "mem_pct": c.mem, "temp_c": c.temp,
		"telegram_token": c.tgToken, "telegram_chat": c.tgChat,
	})
}

func (a *app) handleAlertSettingsUpdate(w http.ResponseWriter, r *http.Request) {
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
		Enabled       bool   `json:"enabled"`
		OfflineSec    int    `json:"offline_sec"`
		CPUPct        int    `json:"cpu_pct"`
		MemPct        int    `json:"mem_pct"`
		TempC         int    `json:"temp_c"`
		TelegramToken string `json:"telegram_token"`
		TelegramChat  string `json:"telegram_chat"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	if in.OfflineSec < 30 {
		in.OfflineSec = 30
	}
	_, err = a.db.Exec(r.Context(),
		`INSERT INTO alert_settings (customer_id, enabled, offline_sec, cpu_pct, mem_pct, temp_c, telegram_token, telegram_chat)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		 ON CONFLICT (customer_id) DO UPDATE SET enabled=EXCLUDED.enabled, offline_sec=EXCLUDED.offline_sec,
		   cpu_pct=EXCLUDED.cpu_pct, mem_pct=EXCLUDED.mem_pct, temp_c=EXCLUDED.temp_c,
		   telegram_token=EXCLUDED.telegram_token, telegram_chat=EXCLUDED.telegram_chat`,
		cid, in.Enabled, in.OfflineSec, in.CPUPct, in.MemPct, in.TempC, nullIfEmpty(in.TelegramToken), nullIfEmpty(in.TelegramChat))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
