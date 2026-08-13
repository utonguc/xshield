package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// walledGardenScript: portal öncesi erişilebilen siteler (goX merkezi → RouterOS betiği).
func (a *app) walledGardenScript(ctx context.Context, deviceID int64) string {
	var b strings.Builder
	b.WriteString("/ip hotspot walled-garden remove [find comment~\"goX-wg\"]\n")
	rows, err := a.db.Query(ctx, `SELECT host FROM walled_garden WHERE device_id=$1 ORDER BY id`, deviceID)
	if err != nil {
		return b.String()
	}
	defer rows.Close()
	for rows.Next() {
		var h string
		if rows.Scan(&h) == nil && strings.TrimSpace(h) != "" {
			b.WriteString(fmt.Sprintf("/ip hotspot walled-garden add dst-host=%s action=allow comment=\"goX-wg\"\n", strings.TrimSpace(h)))
		}
	}
	return b.String()
}

// mailWalledGardenHosts: e-posta OTP için portal öncesi erişilmesi gereken mail sağlayıcı host'ları.
// Misafir, internet kapalıyken bile gelen kod mailini görebilsin diye (webmail + mobil mail uygulamaları).
var mailWalledGardenHosts = []string{
	// Google / Gmail
	"*.google.com", "mail.google.com", "accounts.google.com", "*.googleapis.com",
	"*.googleusercontent.com", "*.gstatic.com", "gmail.com", "*.gmail.com", "*.googlemail.com",
	// Microsoft / Outlook / Hotmail
	"*.outlook.com", "outlook.office365.com", "outlook.live.com", "login.live.com",
	"login.microsoftonline.com", "*.office.com", "*.office365.com", "*.live.com", "*.hotmail.com", "*.msftauth.net",
	// Yandex
	"*.yandex.com", "*.yandex.com.tr", "*.yandex.ru", "*.yastatic.net",
	// Yahoo
	"*.yahoo.com", "login.yahoo.com", "*.yimg.com",
	// Apple iCloud
	"*.icloud.com", "*.me.com", "*.apple.com",
	// Proton
	"*.proton.me", "mail.proton.me",
}

// waWalledGardenHosts: WhatsApp ile giriş için portal öncesi erişilmesi gereken host'lar.
// WhatsApp uçları az ve stabil olduğundan walled-garden güvenilir çalışır.
var waWalledGardenHosts = []string{
	"*.whatsapp.net", "*.whatsapp.com", "whatsapp.com", "whatsapp.net",
	"*.cdn.whatsapp.net", "g.whatsapp.net", "mmg.whatsapp.net", "media.whatsapp.net",
	"*.fbcdn.net", "wa.me", "*.facebook.com",
}

// waWalledGardenScript: site'ta WhatsApp girişi (opt_whatsapp) açıksa WhatsApp host'larını ekler (comment "goX-wa").
func (a *app) waWalledGardenScript(ctx context.Context, deviceID int64) string {
	var b strings.Builder
	b.WriteString("/ip hotspot walled-garden remove [find comment~\"goX-wa\"]\n")
	var optWa bool
	_ = a.db.QueryRow(ctx,
		`SELECT COALESCE(ps.opt_whatsapp,false) FROM devices d
		 JOIN portal_settings ps ON ps.site_id=d.site_id WHERE d.id=$1`, deviceID).Scan(&optWa)
	if !optWa {
		return b.String()
	}
	for _, h := range waWalledGardenHosts {
		b.WriteString(fmt.Sprintf("/ip hotspot walled-garden add dst-host=%s action=allow comment=\"goX-wa\"\n", h))
	}
	return b.String()
}

// mailWalledGardenScript: site'ta e-posta OTP (opt_email) açıksa mail host'larını walled-garden'a ekler.
// Ayrı comment ("goX-mail") ile yönetilir; kullanıcının kendi listesini (goX-wg) etkilemez.
func (a *app) mailWalledGardenScript(ctx context.Context, deviceID int64) string {
	var b strings.Builder
	b.WriteString("/ip hotspot walled-garden remove [find comment~\"goX-mail\"]\n")
	var optEmail bool
	_ = a.db.QueryRow(ctx,
		`SELECT COALESCE(ps.opt_email,false) FROM devices d
		 JOIN portal_settings ps ON ps.site_id=d.site_id WHERE d.id=$1`, deviceID).Scan(&optEmail)
	if !optEmail {
		return b.String()
	}
	for _, h := range mailWalledGardenHosts {
		b.WriteString(fmt.Sprintf("/ip hotspot walled-garden add dst-host=%s action=allow comment=\"goX-mail\"\n", h))
	}
	return b.String()
}

// enqueueSyncPolicyForSite: lokasyonun tüm cihazlarına politika (walled-garden + mail + engelleme)
// betiğini sync_policy komutu olarak kuyruğa atar. Kopmasız uygulanır (misafir oturumu düşmez).
func (a *app) enqueueSyncPolicyForSite(ctx context.Context, siteID int64) {
	ids := []int64{}
	rows, err := a.db.Query(ctx, `SELECT id FROM devices WHERE site_id=$1`, siteID)
	if err != nil {
		return
	}
	for rows.Next() {
		var id int64
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	rows.Close()
	for _, id := range ids {
		script := a.walledGardenScript(ctx, id) + a.mailWalledGardenScript(ctx, id) + a.waWalledGardenScript(ctx, id) + a.blockRulesScript(ctx, id)
		pj, _ := json.Marshal(map[string]any{"script": script})
		_, _ = a.db.Exec(ctx,
			`INSERT INTO device_commands (device_id, action, params) VALUES ($1,'sync_policy',$2)`, id, string(pj))
	}
}

// blockRulesScript: içerik/port engelleme. domain→DNS blackhole, ip→forward drop, port→tcp+udp drop.
func (a *app) blockRulesScript(ctx context.Context, deviceID int64) string {
	var b strings.Builder
	b.WriteString("/ip firewall filter remove [find comment~\"goX-block\"]\n")
	b.WriteString("/ip dns static remove [find comment~\"goX-block\"]\n")
	rows, err := a.db.Query(ctx, `SELECT kind, value FROM block_rules WHERE device_id=$1 ORDER BY id`, deviceID)
	if err != nil {
		return b.String()
	}
	defer rows.Close()
	for rows.Next() {
		var kind, v string
		if rows.Scan(&kind, &v) != nil {
			continue
		}
		v = strings.TrimSpace(v)
		if v == "" {
			continue
		}
		switch kind {
		case "domain":
			b.WriteString(fmt.Sprintf("/ip dns static add name=%s address=0.0.0.0 match-subdomain=yes comment=\"goX-block\"\n", v))
		case "ip":
			b.WriteString(fmt.Sprintf("/ip firewall filter add chain=forward action=drop dst-address=%s comment=\"goX-block\"\n", v))
		case "port":
			b.WriteString(fmt.Sprintf("/ip firewall filter add chain=forward action=drop protocol=tcp dst-port=%s comment=\"goX-block\"\n", v))
			b.WriteString(fmt.Sprintf("/ip firewall filter add chain=forward action=drop protocol=udp dst-port=%s comment=\"goX-block\"\n", v))
		}
	}
	return b.String()
}

func (a *app) handleDevicePolicy(w http.ResponseWriter, r *http.Request) {
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
	if !a.deviceOwned(r.Context(), id, cid) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	wg := []map[string]any{}
	if rows, e := a.db.Query(r.Context(), `SELECT id, host FROM walled_garden WHERE device_id=$1 ORDER BY id`, id); e == nil {
		defer rows.Close()
		for rows.Next() {
			var wid int64
			var h string
			if rows.Scan(&wid, &h) == nil {
				wg = append(wg, map[string]any{"id": wid, "host": h})
			}
		}
	}
	bl := []map[string]any{}
	if rows, e := a.db.Query(r.Context(), `SELECT id, kind, value, COALESCE(note,'') FROM block_rules WHERE device_id=$1 ORDER BY id`, id); e == nil {
		defer rows.Close()
		for rows.Next() {
			var bid int64
			var k, v, n string
			if rows.Scan(&bid, &k, &v, &n) == nil {
				bl = append(bl, map[string]any{"id": bid, "kind": k, "value": v, "note": n})
			}
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"walled_garden": wg, "blocks": bl})
}

func (a *app) handleWalledGardenCreate(w http.ResponseWriter, r *http.Request) {
	id, cid, ok := a.deviceCtx(w, r)
	if !ok {
		return
	}
	var in struct {
		Host string `json:"host"`
	}
	_ = json.NewDecoder(r.Body).Decode(&in)
	in.Host = strings.TrimSpace(in.Host)
	if in.Host == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Adres gerekli"})
		return
	}
	_, _ = cid, ok
	_, err := a.db.Exec(r.Context(), `INSERT INTO walled_garden (device_id, host) VALUES ($1,$2)`, id, in.Host)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true})
}

func (a *app) handleWalledGardenDelete(w http.ResponseWriter, r *http.Request) {
	id, _, ok := a.deviceCtx(w, r)
	if !ok {
		return
	}
	wid, _ := strconv.ParseInt(r.PathValue("wid"), 10, 64)
	a.db.Exec(r.Context(), `DELETE FROM walled_garden WHERE id=$1 AND device_id=$2`, wid, id)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleBlockCreate(w http.ResponseWriter, r *http.Request) {
	id, _, ok := a.deviceCtx(w, r)
	if !ok {
		return
	}
	var in struct {
		Kind  string `json:"kind"`
		Value string `json:"value"`
		Note  string `json:"note"`
	}
	_ = json.NewDecoder(r.Body).Decode(&in)
	in.Value = strings.TrimSpace(in.Value)
	switch in.Kind {
	case "domain", "ip", "port":
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Tür domain/ip/port olmalı"})
		return
	}
	if in.Value == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Değer gerekli"})
		return
	}
	_, err := a.db.Exec(r.Context(), `INSERT INTO block_rules (device_id, kind, value, note) VALUES ($1,$2,$3,$4)`,
		id, in.Kind, in.Value, strings.TrimSpace(in.Note))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true})
}

func (a *app) handleBlockDelete(w http.ResponseWriter, r *http.Request) {
	id, _, ok := a.deviceCtx(w, r)
	if !ok {
		return
	}
	bid, _ := strconv.ParseInt(r.PathValue("bid"), 10, 64)
	a.db.Exec(r.Context(), `DELETE FROM block_rules WHERE id=$1 AND device_id=$2`, bid, id)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// handleDeviceBlockMac: modaldan hızlı engelleme — cihazın lokasyonunda MAC'i blacklist'e alır
// ve CoA ile anında düşürür.
func (a *app) handleDeviceBlockMac(w http.ResponseWriter, r *http.Request) {
	id, _, ok := a.deviceCtx(w, r)
	if !ok {
		return
	}
	var in struct {
		Mac string `json:"mac"`
	}
	_ = json.NewDecoder(r.Body).Decode(&in)
	in.Mac = strings.TrimSpace(in.Mac)
	if in.Mac == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "MAC gerekli"})
		return
	}
	var siteID int64
	if a.db.QueryRow(r.Context(), `SELECT site_id FROM devices WHERE id=$1`, id).Scan(&siteID) != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "lokasyon yok"})
		return
	}
	if _, err := a.db.Exec(r.Context(),
		`INSERT INTO mac_entries (site_id,mac,list_type) VALUES ($1,$2::macaddr,'blacklist')
		 ON CONFLICT (site_id,mac) DO UPDATE SET list_type='blacklist', profile_id=NULL`,
		siteID, in.Mac); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "engellenemedi (MAC formatı?)"})
		return
	}
	a.enqueueCoaForMac(r.Context(), siteID, in.Mac)
	// Engellenen MAC'i anında düşür (blacklist → radcheck Reject; oturum/conntrack da temizlensin).
	a.enqueueDisconnectMac(r.Context(), siteID, in.Mac)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// handleDeviceLimitMac: tek cihaza özel hız sınırı (kbps). 0 = sınırı kaldır. Ajan kopmasız uygular.
func (a *app) handleDeviceLimitMac(w http.ResponseWriter, r *http.Request) {
	id, _, ok := a.deviceCtx(w, r)
	if !ok {
		return
	}
	var in struct {
		Mac      string `json:"mac"`
		DownKbps int    `json:"down_kbps"`
		UpKbps   int    `json:"up_kbps"`
	}
	_ = json.NewDecoder(r.Body).Decode(&in)
	in.Mac = strings.TrimSpace(in.Mac)
	if in.Mac == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "MAC gerekli"})
		return
	}
	var siteID int64
	if a.db.QueryRow(r.Context(), `SELECT site_id FROM devices WHERE id=$1`, id).Scan(&siteID) != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "lokasyon yok"})
		return
	}
	var up, down any
	if in.UpKbps > 0 {
		up = in.UpKbps
	}
	if in.DownKbps > 0 {
		down = in.DownKbps
	}
	if _, err := a.db.Exec(r.Context(),
		`INSERT INTO mac_entries (site_id,mac,list_type,rate_up_kbps,rate_down_kbps) VALUES ($1,$2::macaddr,'normal',$3,$4)
		 ON CONFLICT (site_id,mac) DO UPDATE SET rate_up_kbps=EXCLUDED.rate_up_kbps, rate_down_kbps=EXCLUDED.rate_down_kbps,
		   list_type=CASE WHEN mac_entries.list_type='blacklist' THEN 'normal' ELSE mac_entries.list_type END`,
		siteID, in.Mac, up, down); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "uygulanamadı (MAC formatı?)"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// deviceCtx: auth + müşteri + cihaz sahipliği doğrular; (deviceID, customerID, ok) döner.
func (a *app) deviceCtx(w http.ResponseWriter, r *http.Request) (int64, int64, bool) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return 0, 0, false
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return 0, 0, false
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if !a.deviceOwned(r.Context(), id, cid) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return 0, 0, false
	}
	return id, cid, true
}
