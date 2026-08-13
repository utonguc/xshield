package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID         int64  `json:"id"`
	CustomerID *int64 `json:"customer_id"`
	SiteID     *int64 `json:"site_id"` // aktif lokasyon (token sid claim); NULL = tüm lokasyonlar/konsolide
	Email      string `json:"email"`
	Role       string `json:"role"`
}

// locationID: aktif lokasyon (0 = tüm lokasyonlar/konsolide). Lokasyon yöneticisi ise sabit kendi lokasyonu.
func (a *app) locationID(u *User) int64 {
	if u.SiteID != nil {
		return *u.SiteID
	}
	return 0
}

// bootstrapOwner: owner hesabı yoksa .env değerleriyle oluşturur (idempotent).
func (a *app) bootstrapOwner(ctx context.Context, email, password string) error {
	if email == "" || password == "" {
		return nil // bootstrap istenmemiş
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	// Sadece yoksa ekle; mevcut parolayı ezme.
	_, err = a.db.Exec(ctx,
		`INSERT INTO users (customer_id, email, password_hash, role)
		 VALUES (NULL, $1, $2, 'owner')
		 ON CONFLICT (email) DO NOTHING`,
		strings.ToLower(email), string(hash))
	return err
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (a *app) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method"})
		return
	}
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	var u User
	var hash string
	err := a.db.QueryRow(r.Context(),
		`SELECT id, customer_id, site_id, email, role, password_hash FROM users WHERE email = $1`,
		req.Email).Scan(&u.ID, &u.CustomerID, &u.SiteID, &u.Email, &u.Role, &hash)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "E-posta veya parola hatalı"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sunucu hatası"})
		return
	}

	token, err := a.issueToken(u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "token üretilemedi"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": u})
}

func (a *app) handleMe(w http.ResponseWriter, r *http.Request) {
	u, err := a.userFromRequest(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "yetkisiz"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": u})
}

func (a *app) issueToken(u User) (string, error) {
	claims := jwt.MapClaims{
		"sub":   u.ID,
		"email": u.Email,
		"role":  u.Role,
		"exp":   time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	}
	if u.CustomerID != nil {
		claims["cid"] = *u.CustomerID
	}
	if u.SiteID != nil {
		claims["sid"] = *u.SiteID
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(a.jwtSecret)
}

// handleSetLocation: aktif lokasyonu değiştirir (token'ı sid claim'iyle yeniden üretir).
// site_id=0 → tüm lokasyonlar (konsolide). Lokasyon yöneticisi (sabit site) değiştiremez.
func (a *app) handleSetLocation(w http.ResponseWriter, r *http.Request) {
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
		SiteID int64 `json:"site_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&in)
	// Lokasyon yöneticisi mi (DB'de sabit lokasyon)?
	var fixed *int64
	_ = a.db.QueryRow(r.Context(), `SELECT site_id FROM users WHERE id=$1`, u.ID).Scan(&fixed)
	if fixed != nil {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "lokasyon yöneticisi lokasyon değiştiremez"})
		return
	}
	nu := User{ID: u.ID, Email: u.Email, Role: u.Role, CustomerID: u.CustomerID}
	siteName := "Tüm lokasyonlar"
	if in.SiteID > 0 {
		if err := a.db.QueryRow(r.Context(), `SELECT name FROM sites WHERE id=$1 AND customer_id=$2`, in.SiteID, cid).Scan(&siteName); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz lokasyon"})
			return
		}
		nu.SiteID = &in.SiteID
	}
	token, err := a.issueToken(nu)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "token hatası"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "site_id": in.SiteID, "site_name": siteName})
}

func (a *app) userFromRequest(r *http.Request) (*User, error) {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		return nil, errors.New("token yok")
	}
	tokenStr := strings.TrimPrefix(auth, "Bearer ")
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("imza yöntemi")
		}
		return a.jwtSecret, nil
	})
	if err != nil || !tok.Valid {
		return nil, errors.New("geçersiz token")
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("claims")
	}
	u := &User{
		Email: asString(claims["email"]),
		Role:  asString(claims["role"]),
	}
	if sub, ok := claims["sub"].(float64); ok {
		u.ID = int64(sub)
	}
	if cid, ok := claims["cid"].(float64); ok {
		v := int64(cid)
		u.CustomerID = &v
	}
	if sid, ok := claims["sid"].(float64); ok {
		v := int64(sid)
		u.SiteID = &v
	}
	// Tek lokasyonlu tenant: aktif lokasyon seçili değilse o tek lokasyonu otomatik aktif say.
	// Böylece tek lokasyonlu işletmede loc-bazlı menüler/sayfalar görünür (sahte 2. lokasyon gerekmez).
	if u.SiteID == nil && u.CustomerID != nil {
		var only *int64
		_ = a.db.QueryRow(r.Context(),
			`SELECT CASE WHEN count(*)=1 THEN min(id) END FROM sites WHERE customer_id=$1`, *u.CustomerID).Scan(&only)
		if only != nil {
			u.SiteID = only
		}
	}
	return u, nil
}

func asString(v any) string {
	s, _ := v.(string)
	return s
}
