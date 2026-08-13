package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
)

type Profile struct {
	ID           int64  `json:"id"`
	Name         string `json:"name"`
	Kind         string `json:"kind"`
	DurationMin  *int   `json:"duration_min"`
	RateUpKbps   *int   `json:"rate_up_kbps"`
	RateDownKbps *int   `json:"rate_down_kbps"`
	SiteID       *int64 `json:"site_id"`
	SiteName     string `json:"site_name,omitempty"`
}

// Elle oluşturulabilen türler: giriş seçeneğine BAĞLAM olarak bağlıdır (grant kind'e göre profil bulur).
// 'temporary' Geçici Erişim sekmesinde, 'voucher' Erişim Kodları ekranında yönetilir (elle oluşturulmaz).
var validKinds = map[string]bool{"guest": true, "staff": true, "meeting": true}

// bootstrapDemoCustomer: hiç müşteri yoksa "Demo İşletme" + varsayılan profilleri kurar.
func (a *app) bootstrapDemoCustomer(ctx context.Context) error {
	var id int64
	err := a.db.QueryRow(ctx, `SELECT id FROM customers ORDER BY id LIMIT 1`).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		if err = a.db.QueryRow(ctx, `INSERT INTO customers (name) VALUES ('Demo İşletme') RETURNING id`).Scan(&id); err != nil {
			return err
		}
	} else if err != nil {
		return err
	}

	// Demo lokasyon (yoksa)
	var siteN int
	if err = a.db.QueryRow(ctx, `SELECT count(*) FROM sites WHERE customer_id=$1`, id).Scan(&siteN); err != nil {
		return err
	}
	if siteN == 0 {
		if _, err = a.db.Exec(ctx, `INSERT INTO sites (customer_id, name) VALUES ($1, 'Merkez Lokasyon')`, id); err != nil {
			return err
		}
	}

	var n int
	if err = a.db.QueryRow(ctx, `SELECT count(*) FROM connection_profiles WHERE customer_id=$1`, id).Scan(&n); err != nil {
		return err
	}
	if n == 0 {
		defaults := []Profile{
			{Name: "Misafir", Kind: "guest", DurationMin: ptr(240), RateUpKbps: ptr(2048), RateDownKbps: ptr(8192)},
			{Name: "Personel", Kind: "staff", DurationMin: nil, RateUpKbps: ptr(10240), RateDownKbps: ptr(51200)},
			{Name: "Toplantı", Kind: "meeting", DurationMin: ptr(180), RateUpKbps: ptr(5120), RateDownKbps: ptr(20480)},
			{Name: "Geçici 2 saat", Kind: "temporary", DurationMin: ptr(120), RateUpKbps: ptr(1024), RateDownKbps: ptr(4096)},
		}
		for _, p := range defaults {
			if _, err = a.db.Exec(ctx,
				`INSERT INTO connection_profiles (customer_id,name,kind,duration_min,rate_up_kbps,rate_down_kbps)
				 VALUES ($1,$2,$3,$4,$5,$6)`,
				id, p.Name, p.Kind, p.DurationMin, p.RateUpKbps, p.RateDownKbps); err != nil {
				return err
			}
		}
	}
	return nil
}

func ptr(i int) *int { return &i }

func (a *app) requireAuth(w http.ResponseWriter, r *http.Request) (*User, bool) {
	u, err := a.userFromRequest(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "yetkisiz"})
		return nil, false
	}
	return u, true
}

// customerID: kullanıcının müşterisi; owner (customer_id NULL) ise ilk müşteri (demo).
func (a *app) customerID(ctx context.Context, u *User) (int64, error) {
	if u.CustomerID != nil {
		return *u.CustomerID, nil
	}
	var id int64
	err := a.db.QueryRow(ctx, `SELECT id FROM customers ORDER BY id LIMIT 1`).Scan(&id)
	return id, err
}

func (a *app) handleProfilesList(w http.ResponseWriter, r *http.Request) {
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
	// Tesis bazlı: lokasyon seçiliyse o lokasyonun profilleri; "tüm lokasyonlar"da hepsi (legacy NULL dahil).
	// temporary/voucher elle yönetilmez (Geçici Erişim sekmesi / Erişim Kodları) → listede gösterilmez.
	rows, err := a.db.Query(r.Context(),
		`SELECT cp.id,cp.name,cp.kind,cp.duration_min,cp.rate_up_kbps,cp.rate_down_kbps,cp.site_id,COALESCE(s.name,'')
		 FROM connection_profiles cp LEFT JOIN sites s ON s.id=cp.site_id
		 WHERE cp.customer_id=$1 AND cp.kind NOT IN ('voucher','temporary') AND ($2=0 OR cp.site_id=$2)
		 ORDER BY cp.id`, cid, loc)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []Profile{}
	for rows.Next() {
		var p Profile
		if err := rows.Scan(&p.ID, &p.Name, &p.Kind, &p.DurationMin, &p.RateUpKbps, &p.RateDownKbps, &p.SiteID, &p.SiteName); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "okuma hatası"})
			return
		}
		list = append(list, p)
	}
	writeJSON(w, http.StatusOK, map[string]any{"profiles": list, "location_required": loc == 0})
}

func (a *app) handleProfileCreate(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	var p Profile
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	if msg := validateProfile(&p); msg != "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
		return
	}
	loc := a.locationID(u)
	if loc == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Profil oluşturmak için önce bir lokasyon seçin"})
		return
	}
	p.SiteID = &loc
	err = a.db.QueryRow(r.Context(),
		`INSERT INTO connection_profiles (customer_id,name,kind,duration_min,rate_up_kbps,rate_down_kbps,site_id)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
		cid, p.Name, p.Kind, p.DurationMin, p.RateUpKbps, p.RateDownKbps, loc).Scan(&p.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"profile": p})
}

func (a *app) handleProfileUpdate(w http.ResponseWriter, r *http.Request) {
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
	var p Profile
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	if msg := validateProfile(&p); msg != "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
		return
	}
	ct, err := a.db.Exec(r.Context(),
		`UPDATE connection_profiles SET name=$1,kind=$2,duration_min=$3,rate_up_kbps=$4,rate_down_kbps=$5
		 WHERE id=$6 AND customer_id=$7`,
		p.Name, p.Kind, p.DurationMin, p.RateUpKbps, p.RateDownKbps, id, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "güncelleme hatası"})
		return
	}
	if ct.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	p.ID = id
	// Profil hız değişimi: cihaz ajanı (gox_wg) statik queue'yu canlı günceller,
	// oturum DÜŞMEZ. Disconnect tetiklenmez.
	writeJSON(w, http.StatusOK, map[string]any{"profile": p})
}

func (a *app) handleProfileDelete(w http.ResponseWriter, r *http.Request) {
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
	ct, err := a.db.Exec(r.Context(),
		`DELETE FROM connection_profiles WHERE id=$1 AND customer_id=$2`, id, cid)
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

func validateProfile(p *Profile) string {
	p.Name = strings.TrimSpace(p.Name)
	if p.Name == "" {
		return "İsim gerekli"
	}
	if !validKinds[p.Kind] {
		return "Geçersiz tür"
	}
	if p.DurationMin != nil && *p.DurationMin < 0 {
		return "Süre negatif olamaz"
	}
	if p.RateDownKbps != nil && *p.RateDownKbps < 0 {
		return "Hız negatif olamaz"
	}
	if p.RateUpKbps != nil && *p.RateUpKbps < 0 {
		return "Hız negatif olamaz"
	}
	return ""
}
