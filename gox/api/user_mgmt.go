package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// isTenantAdmin: kullanıcı tenant yöneticisi mi (DB'de sabit lokasyonu YOK). Lokasyon yöneticileri
// kullanıcı yönetemez. (u.SiteID token'daki seçili lokasyon olabilir; DB'deki sabit alan asıl ölçüt.)
func (a *app) isTenantAdmin(ctx context.Context, u *User) bool {
	var site *int64
	_ = a.db.QueryRow(ctx, `SELECT site_id FROM users WHERE id=$1`, u.ID).Scan(&site)
	return site == nil
}

func (a *app) handleUsersList(w http.ResponseWriter, r *http.Request) {
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
	rows, err := a.db.Query(r.Context(),
		`SELECT u.id, u.email, u.role, u.site_id, COALESCE(s.name,'')
		 FROM users u LEFT JOIN sites s ON s.id=u.site_id
		 WHERE u.customer_id=$1 ORDER BY u.id`, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var id int64
		var email, role, siteName string
		var siteID *int64
		if rows.Scan(&id, &email, &role, &siteID, &siteName) == nil {
			scope := "Tüm lokasyonlar"
			if siteID != nil {
				scope = siteName
			}
			list = append(list, map[string]any{
				"id": id, "email": email, "role": role, "site_id": siteID, "scope": scope,
				"self": id == u.ID,
			})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": list})
}

func (a *app) handleUserCreate(w http.ResponseWriter, r *http.Request) {
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
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		SiteID   int64  `json:"site_id"` // 0 = tenant yöneticisi (tüm lokasyonlar), >0 = lokasyon yöneticisi
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if in.Email == "" || !strings.Contains(in.Email, "@") {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçerli e-posta gerekli"})
		return
	}
	if len(in.Password) < 6 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Parola en az 6 karakter"})
		return
	}
	role := "customer_admin"
	var siteParam any = nil
	if in.SiteID > 0 {
		var okSite bool
		_ = a.db.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM sites WHERE id=$1 AND customer_id=$2)`, in.SiteID, cid).Scan(&okSite)
		if !okSite {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz lokasyon"})
			return
		}
		role = "location_manager"
		siteParam = in.SiteID
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	_, err = a.db.Exec(r.Context(),
		`INSERT INTO users (customer_id, site_id, email, password_hash, role) VALUES ($1,$2,$3,$4,$5)`,
		cid, siteParam, in.Email, string(hash), role)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Bu e-posta zaten kayıtlı"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true})
}

func (a *app) handleUserDelete(w http.ResponseWriter, r *http.Request) {
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
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if id == u.ID {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Kendinizi silemezsiniz"})
		return
	}
	_, _ = a.db.Exec(r.Context(), `DELETE FROM users WHERE id=$1 AND customer_id=$2`, id, cid)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
