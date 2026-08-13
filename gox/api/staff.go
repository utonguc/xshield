package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

type Staff struct {
	ID       int64  `json:"id"`
	SiteID   int64  `json:"site_id"`
	SiteName string `json:"site_name,omitempty"`
	FullName string `json:"full_name"`
	Username string `json:"username"`
	Title    string `json:"title"`
	Active   bool   `json:"active"`
	Password string `json:"password,omitempty"` // yalnız create isteğinde gelir, asla dönülmez
}

func (a *app) handleStaffList(w http.ResponseWriter, r *http.Request) {
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
		`SELECT st.id, st.site_id, s.name, st.full_name, st.username, st.title, st.active
		 FROM staff st JOIN sites s ON s.id=st.site_id
		 WHERE s.customer_id=$1 AND ($2=0 OR st.site_id=$2) ORDER BY st.id DESC`, cid, loc)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []Staff{}
	for rows.Next() {
		var s Staff
		if err := rows.Scan(&s.ID, &s.SiteID, &s.SiteName, &s.FullName, &s.Username, &s.Title, &s.Active); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "okuma hatası"})
			return
		}
		list = append(list, s)
	}
	writeJSON(w, http.StatusOK, map[string]any{"staff": list})
}

func (a *app) handleStaffCreate(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	var in Staff
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.FullName = strings.TrimSpace(in.FullName)
	in.Username = strings.TrimSpace(in.Username)
	in.Title = strings.TrimSpace(in.Title)
	if in.FullName == "" || in.Username == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Ad ve kullanıcı adı gerekli"})
		return
	}
	if len(in.Password) < 4 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Parola en az 4 karakter olmalı"})
		return
	}
	// Lokasyon müşteriye ait mi
	var siteOK bool
	if err := a.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM sites WHERE id=$1 AND customer_id=$2)`, in.SiteID, cid).Scan(&siteOK); err != nil || !siteOK {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz lokasyon"})
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "parola hatası"})
		return
	}
	var s Staff
	err = a.db.QueryRow(r.Context(),
		`INSERT INTO staff (site_id, full_name, username, password_hash, title)
		 VALUES ($1,$2,$3,$4,$5)
		 RETURNING id, site_id, full_name, username, title, active`,
		in.SiteID, in.FullName, in.Username, string(hash), in.Title).
		Scan(&s.ID, &s.SiteID, &s.FullName, &s.Username, &s.Title, &s.Active)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "staff_site_username") {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Bu kullanıcı adı bu lokasyonda zaten var"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"staff": s})
}

// handleStaffUpdate: parola sıfırlama / aktiflik / unvan güncelleme.
func (a *app) handleStaffUpdate(w http.ResponseWriter, r *http.Request) {
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
	var in struct {
		FullName *string `json:"full_name"`
		Username *string `json:"username"`
		Password *string `json:"password"`
		Title    *string `json:"title"`
		Active   *bool   `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	var hash *string
	if in.Password != nil && *in.Password != "" {
		if len(*in.Password) < 4 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Parola en az 4 karakter olmalı"})
			return
		}
		h, _ := bcrypt.GenerateFromPassword([]byte(*in.Password), bcrypt.DefaultCost)
		hs := string(h)
		hash = &hs
	}
	if in.FullName != nil {
		v := strings.TrimSpace(*in.FullName)
		in.FullName = &v
	}
	if in.Username != nil {
		v := strings.TrimSpace(*in.Username)
		in.Username = &v
	}
	ct, err := a.db.Exec(r.Context(),
		`UPDATE staff st SET
		   full_name=COALESCE(NULLIF($1,''),full_name), username=COALESCE(NULLIF($2,''),username),
		   password_hash=COALESCE($3,password_hash), title=COALESCE($4,title), active=COALESCE($5,active)
		 FROM sites s WHERE st.site_id=s.id AND st.id=$6 AND s.customer_id=$7`,
		in.FullName, in.Username, hash, in.Title, in.Active, id, cid)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "staff_site_username") {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Bu kullanıcı adı bu lokasyonda zaten var"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "güncelleme hatası"})
		return
	}
	if ct.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleStaffDelete(w http.ResponseWriter, r *http.Request) {
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
		`DELETE FROM staff st USING sites s WHERE st.site_id=s.id AND st.id=$1 AND s.customer_id=$2`, id, cid)
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

// verifyStaff: portal "Personel girişi" — site bazlı kullanıcı adı + parola doğrular.
func (a *app) verifyStaff(ctx context.Context, siteID int64, username, password string) (bool, string) {
	username = strings.TrimSpace(username)
	if username == "" || password == "" {
		return false, ""
	}
	var hash, fullName string
	err := a.db.QueryRow(ctx,
		`SELECT password_hash, full_name FROM staff
		 WHERE site_id=$1 AND lower(username)=lower($2) AND active=true LIMIT 1`, siteID, username).
		Scan(&hash, &fullName)
	if err != nil {
		return false, ""
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return false, ""
	}
	return true, fullName
}
