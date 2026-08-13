package main

import (
	"encoding/json"
	"net/http"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// Müşterinin kendi ödemeleri (tenant kendi faturalarını görür).
func (a *app) handleMyPayments(w http.ResponseWriter, r *http.Request) {
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
		`SELECT id, amount::float8, currency, COALESCE(period,''), status, created_at::date::text
		 FROM payments WHERE customer_id=$1 ORDER BY id DESC`, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	type P struct {
		ID       int64   `json:"id"`
		Amount   float64 `json:"amount"`
		Currency string  `json:"currency"`
		Period   string  `json:"period"`
		Status   string  `json:"status"`
		Date     string  `json:"date"`
	}
	list := []P{}
	for rows.Next() {
		var p P
		_ = rows.Scan(&p.ID, &p.Amount, &p.Currency, &p.Period, &p.Status, &p.Date)
		list = append(list, p)
	}
	writeJSON(w, http.StatusOK, map[string]any{"payments": list})
}

// Müşterinin kendi planı + güncel kullanım (tenant panelinde "Aboneliğiniz" kartı).
func (a *app) handleMyPlan(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	var roomCount int
	var monthlyFee float64
	var sector string
	_ = a.db.QueryRow(r.Context(),
		`SELECT COALESCE(room_count,0), COALESCE(monthly_fee,0)::float8, COALESCE(sector,'') FROM customers WHERE id=$1`, cid).
		Scan(&roomCount, &monthlyFee, &sector)
	p, sites, devices, err := a.planForCustomer(r.Context(), cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"has_plan":    p != nil,
		"plan":        p,
		"sector":      sector,
		"room_count":  roomCount,
		"monthly_fee": monthlyFee,
		"usage":       map[string]int{"sites": sites, "devices": devices},
	})
}

// Parola değiştirme (oturum sahibi).
func (a *app) handlePasswordChange(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	var in struct {
		Old string `json:"old_password"`
		New string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	if len(strings.TrimSpace(in.New)) < 6 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Yeni parola en az 6 karakter olmalı"})
		return
	}
	var hash string
	if err := a.db.QueryRow(r.Context(), `SELECT password_hash FROM users WHERE id=$1`, u.ID).Scan(&hash); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kullanıcı yok"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.Old)) != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Mevcut parola hatalı"})
		return
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(in.New), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "şifre hatası"})
		return
	}
	if _, err := a.db.Exec(r.Context(), `UPDATE users SET password_hash=$1 WHERE id=$2`, string(newHash), u.ID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "güncelleme hatası"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
