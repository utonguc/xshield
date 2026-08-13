package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

// PUBLIC: misafir geri bildirimi (MGB).
func (a *app) handleFeedbackPublic(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Site    int64  `json:"site"`
		Rating  int    `json:"rating"`
		Comment string `json:"comment"`
		Name    string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	var cid int64
	if err := a.db.QueryRow(r.Context(), `SELECT customer_id FROM sites WHERE id=$1`, in.Site).Scan(&cid); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "lokasyon yok"})
		return
	}
	if in.Rating < 0 || in.Rating > 5 {
		in.Rating = 0
	}
	if _, err := a.db.Exec(r.Context(),
		`INSERT INTO feedback (customer_id,site_id,rating,comment,guest_name) VALUES ($1,$2,$3,$4,$5)`,
		cid, in.Site, in.Rating, strings.TrimSpace(in.Comment), strings.TrimSpace(in.Name)); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleFeedbackList(w http.ResponseWriter, r *http.Request) {
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
	var avg float64
	var count int
	_ = a.db.QueryRow(r.Context(),
		`SELECT COALESCE(avg(rating) FILTER (WHERE rating>0),0)::float8, count(*) FROM feedback WHERE customer_id=$1 AND ($2=0 OR site_id=$2)`, cid, loc).
		Scan(&avg, &count)
	rows, err := a.db.Query(r.Context(),
		`SELECT id, COALESCE(rating,0), COALESCE(comment,''), COALESCE(guest_name,''), to_char(created_at,'YYYY-MM-DD HH24:MI')
		 FROM feedback WHERE customer_id=$1 AND ($2=0 OR site_id=$2) ORDER BY id DESC LIMIT 500`, cid, loc)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	type F struct {
		ID      int64  `json:"id"`
		Rating  int    `json:"rating"`
		Comment string `json:"comment"`
		Name    string `json:"name"`
		At      string `json:"at"`
	}
	list := []F{}
	for rows.Next() {
		var f F
		_ = rows.Scan(&f.ID, &f.Rating, &f.Comment, &f.Name, &f.At)
		list = append(list, f)
	}
	writeJSON(w, http.StatusOK, map[string]any{"feedback": list, "avg": avg, "count": count})
}

// Bağlantı/doğrulama kayıtları (5651 / IT). Müşteri kendi kayıtlarını görür.
func (a *app) handleVerificationsList(w http.ResponseWriter, r *http.Request) {
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
		`SELECT COALESCE(method,''), COALESCE(identity,''), COALESCE(mac,''), to_char(created_at,'YYYY-MM-DD HH24:MI')
		 FROM guest_verifications WHERE customer_id=$1 ORDER BY id DESC LIMIT 1000`, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	type V struct {
		Method   string `json:"method"`
		Identity string `json:"identity"`
		Mac      string `json:"mac"`
		At       string `json:"at"`
	}
	list := []V{}
	for rows.Next() {
		var v V
		_ = rows.Scan(&v.Method, &v.Identity, &v.Mac, &v.At)
		list = append(list, v)
	}
	writeJSON(w, http.StatusOK, map[string]any{"logs": list})
}
