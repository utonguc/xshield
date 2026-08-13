package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

type Site struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	DeviceCount int    `json:"device_count"`
}

func (a *app) handleSitesList(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	rows, err := a.db.Query(r.Context(),
		`SELECT s.id, s.name, count(d.id)
		 FROM sites s LEFT JOIN devices d ON d.site_id=s.id
		 WHERE s.customer_id=$1 GROUP BY s.id ORDER BY s.id`, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []Site{}
	for rows.Next() {
		var s Site
		if err := rows.Scan(&s.ID, &s.Name, &s.DeviceCount); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "okuma hatası"})
			return
		}
		list = append(list, s)
	}
	writeJSON(w, http.StatusOK, map[string]any{"sites": list})
}

func (a *app) handleSiteCreate(w http.ResponseWriter, r *http.Request) {
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
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Lokasyon adı gerekli"})
		return
	}
	// Plan limiti: lokasyon
	if p, sites, _, err := a.planForCustomer(r.Context(), cid); err == nil && p != nil {
		if msg := limitErr("site", sites, p.MaxLocations); msg != "" {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": msg})
			return
		}
	}
	var s Site
	if err := a.db.QueryRow(r.Context(),
		`INSERT INTO sites (customer_id, name) VALUES ($1,$2) RETURNING id, name`,
		cid, in.Name).Scan(&s.ID, &s.Name); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"site": s})
}

func (a *app) handleSiteDelete(w http.ResponseWriter, r *http.Request) {
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
	ct, err := a.db.Exec(r.Context(), `DELETE FROM sites WHERE id=$1 AND customer_id=$2`, id, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "silme hatası"})
		return
	}
	if ct.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
