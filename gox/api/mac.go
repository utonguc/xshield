package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

type MacEntry struct {
	ID          int64  `json:"id"`
	SiteID      int64  `json:"site_id"`
	SiteName    string `json:"site_name,omitempty"`
	Mac         string `json:"mac"`
	ProfileID   *int64 `json:"profile_id"`
	ProfileName string `json:"profile_name,omitempty"`
	ListType    string `json:"list_type"`
	Note        string `json:"note"`
}

var validListTypes = map[string]bool{"normal": true, "whitelist": true, "blacklist": true}

// handleSiteLeases: bir lokasyonun güncel DHCP havuzu (ajan tarafından tazelenir).
// Erişim listesinde MAC'i elle yazmak yerine buradan arayıp seçmek için.
func (a *app) handleSiteLeases(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	sid, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if !a.siteOwned(r.Context(), sid, cid) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "lokasyon yok"})
		return
	}
	rows, err := a.db.Query(r.Context(),
		`SELECT DISTINCT ON (lower(l.mac)) l.mac, COALESCE(l.ip,''), COALESCE(l.host,''),
		        EXISTS(SELECT 1 FROM mac_entries m WHERE m.site_id=$1 AND lower(m.mac::text)=lower(l.mac))
		 FROM dhcp_leases l WHERE l.site_id=$1 ORDER BY lower(l.mac), l.updated_at DESC`, sid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var mac, ip, host string
		var added bool
		if rows.Scan(&mac, &ip, &host, &added) == nil {
			list = append(list, map[string]any{"mac": mac, "ip": ip, "host": host, "in_list": added})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"leases": list})
}

func (a *app) handleMacsList(w http.ResponseWriter, r *http.Request) {
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
		`SELECT m.id, m.site_id, s.name, m.mac::text, m.profile_id, COALESCE(cp.name,''), m.list_type, COALESCE(m.note,'')
		 FROM mac_entries m
		 JOIN sites s ON s.id=m.site_id
		 LEFT JOIN connection_profiles cp ON cp.id=m.profile_id
		 WHERE s.customer_id=$1 AND ($2=0 OR m.site_id=$2) ORDER BY m.id DESC`, cid, loc)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []MacEntry{}
	for rows.Next() {
		var m MacEntry
		if err := rows.Scan(&m.ID, &m.SiteID, &m.SiteName, &m.Mac, &m.ProfileID, &m.ProfileName, &m.ListType, &m.Note); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "okuma hatası"})
			return
		}
		list = append(list, m)
	}
	writeJSON(w, http.StatusOK, map[string]any{"macs": list})
}

func (a *app) handleMacCreate(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	var in MacEntry
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Mac = strings.TrimSpace(in.Mac)
	if in.Mac == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "MAC gerekli"})
		return
	}
	if in.ListType == "" {
		in.ListType = "normal"
	}
	if !validListTypes[in.ListType] {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz liste türü"})
		return
	}
	// Lokasyon müşteriye ait mi
	var siteOK bool
	if err := a.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM sites WHERE id=$1 AND customer_id=$2)`, in.SiteID, cid).Scan(&siteOK); err != nil || !siteOK {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz lokasyon"})
		return
	}
	// Profil (varsa) müşteriye ait mi
	if in.ProfileID != nil {
		var profOK bool
		if err := a.db.QueryRow(r.Context(),
			`SELECT EXISTS(SELECT 1 FROM connection_profiles WHERE id=$1 AND customer_id=$2)`, *in.ProfileID, cid).Scan(&profOK); err != nil || !profOK {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz profil"})
			return
		}
	}
	var m MacEntry
	err = a.db.QueryRow(r.Context(),
		`INSERT INTO mac_entries (site_id, mac, profile_id, list_type, note)
		 VALUES ($1,$2::macaddr,$3,$4,$5)
		 RETURNING id, site_id, mac::text, profile_id, list_type, COALESCE(note,'')`,
		in.SiteID, in.Mac, in.ProfileID, in.ListType, in.Note).
		Scan(&m.ID, &m.SiteID, &m.Mac, &m.ProfileID, &m.ListType, &m.Note)
	if err != nil {
		if strings.Contains(err.Error(), "invalid input") || strings.Contains(err.Error(), "macaddr") {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz MAC formatı"})
			return
		}
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Bu MAC bu lokasyonda zaten kayıtlı"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"mac": m})
}

func (a *app) handleMacUpdate(w http.ResponseWriter, r *http.Request) {
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
	var in MacEntry
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	if in.ListType == "" || !validListTypes[in.ListType] {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz liste türü"})
		return
	}
	// Lokasyon değiştirilebilir; hedef lokasyon müşteriye ait olmalı (0 = değiştirme).
	if in.SiteID > 0 {
		var okSite bool
		if a.db.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM sites WHERE id=$1 AND customer_id=$2)`, in.SiteID, cid).Scan(&okSite); !okSite {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz lokasyon"})
			return
		}
	}
	ct, err := a.db.Exec(r.Context(),
		`UPDATE mac_entries m SET profile_id=$1, list_type=$2, note=$3, site_id=COALESCE(NULLIF($6,0),m.site_id)
		 FROM sites s WHERE m.site_id=s.id AND m.id=$4 AND s.customer_id=$5`,
		in.ProfileID, in.ListType, in.Note, id, cid, in.SiteID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "güncelleme hatası"})
		return
	}
	if ct.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	// Profil/hız değişimi: ajan statik queue'yu canlı günceller, oturum DÜŞMEZ.
	// Yalnız blacklist'e alınınca misafiri at (disconnect).
	if in.ListType == "blacklist" {
		var sid int64
		var mac string
		if a.db.QueryRow(r.Context(), `SELECT site_id, mac::text FROM mac_entries WHERE id=$1`, id).Scan(&sid, &mac) == nil {
			a.enqueueCoaForMac(r.Context(), sid, mac)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleMacDelete(w http.ResponseWriter, r *http.Request) {
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
	var sid int64
	var mac string
	_ = a.db.QueryRow(r.Context(),
		`SELECT m.site_id, m.mac::text FROM mac_entries m JOIN sites s ON s.id=m.site_id WHERE m.id=$1 AND s.customer_id=$2`, id, cid).Scan(&sid, &mac)
	ct, err := a.db.Exec(r.Context(),
		`DELETE FROM mac_entries m USING sites s WHERE m.site_id=s.id AND m.id=$1 AND s.customer_id=$2`, id, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "silme hatası"})
		return
	}
	if ct.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	if sid > 0 {
		a.enqueueCoaForMac(r.Context(), sid, mac)
		// Gerçek düşürme: mac_entry silindi (radcheck reddeder) + oturum/host/conntrack temizle.
		a.enqueueDisconnectMac(r.Context(), sid, mac)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
