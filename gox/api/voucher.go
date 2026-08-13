package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	qrcode "github.com/skip2/go-qrcode"
)

// Karışık/okunaklı alfabe (0/O/1/I/L yok) — kod elle yazılabilir olsun.
const voucherAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func genVoucherCode(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	out := make([]byte, n)
	for i := range b {
		out[i] = voucherAlphabet[int(b[i])%len(voucherAlphabet)]
	}
	return string(out)
}

type Voucher struct {
	ID         int64   `json:"id"`
	SiteID     int64   `json:"site_id"`
	SiteName   string  `json:"site_name,omitempty"`
	Name       string  `json:"name"`
	Code       string  `json:"code"`
	MaxUsers   *int    `json:"max_users"`
	UsedCount  int     `json:"used_count"`
	ExpiresAt  *string `json:"expires_at"`
	RateUpKbps *int    `json:"rate_up_kbps"`
	RateDnKbps *int    `json:"rate_down_kbps"`
	Active     bool    `json:"active"`
	Expired    bool    `json:"expired"`
}

func (a *app) handleVouchersList(w http.ResponseWriter, r *http.Request) {
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
		`SELECT v.id, v.site_id, s.name, v.name, v.code, v.max_users,
		        (SELECT count(*) FROM voucher_redemptions vr WHERE vr.voucher_id=v.id),
		        to_char(v.expires_at,'YYYY-MM-DD HH24:MI'),
		        cp.rate_up_kbps, cp.rate_down_kbps, v.active,
		        (v.expires_at IS NOT NULL AND v.expires_at < now())
		 FROM vouchers v
		 JOIN sites s ON s.id=v.site_id
		 LEFT JOIN connection_profiles cp ON cp.id=v.profile_id
		 WHERE s.customer_id=$1 AND ($2=0 OR v.site_id=$2) ORDER BY v.id DESC`, cid, loc)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []Voucher{}
	for rows.Next() {
		var v Voucher
		var exp *string
		if err := rows.Scan(&v.ID, &v.SiteID, &v.SiteName, &v.Name, &v.Code, &v.MaxUsers,
			&v.UsedCount, &exp, &v.RateUpKbps, &v.RateDnKbps, &v.Active, &v.Expired); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "okuma hatası"})
			return
		}
		v.ExpiresAt = exp
		list = append(list, v)
	}
	writeJSON(w, http.StatusOK, map[string]any{"vouchers": list})
}

func parseExpiry(s string) *time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	for _, f := range []string{time.RFC3339, "2006-01-02T15:04:05", "2006-01-02T15:04", "2006-01-02 15:04", "2006-01-02"} {
		if t, err := time.Parse(f, s); err == nil {
			return &t
		}
	}
	return nil
}

func (a *app) handleVoucherCreate(w http.ResponseWriter, r *http.Request) {
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
		SiteID     int64  `json:"site_id"`
		Name       string `json:"name"`
		MaxUsers   int    `json:"max_users"`     // 0 = sınırsız
		ExpiresAt  string `json:"expires_at"`    // boş = süresiz
		RateUpKbps int    `json:"rate_up_kbps"`  // 0 = sınırsız
		RateDnKbps int    `json:"rate_down_kbps"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Kod adı gerekli"})
		return
	}
	if !a.siteOwned(r.Context(), in.SiteID, cid) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz lokasyon"})
		return
	}
	// Hız limiti varsa voucher'a özel connection_profile oluştur (ajan queue'su bunu kullanır).
	var profileID *int64
	if in.RateUpKbps > 0 || in.RateDnKbps > 0 {
		var pid int64
		if err := a.db.QueryRow(r.Context(),
			`INSERT INTO connection_profiles (customer_id,site_id,name,kind,rate_up_kbps,rate_down_kbps)
			 VALUES ($1,$2,$3,'voucher',$4,$5) RETURNING id`,
			cid, in.SiteID, "Kod: "+in.Name, in.RateUpKbps, in.RateDnKbps).Scan(&pid); err == nil {
			profileID = &pid
		}
	}
	var maxUsers *int
	if in.MaxUsers > 0 {
		maxUsers = &in.MaxUsers
	}
	expires := parseExpiry(in.ExpiresAt)

	// Benzersiz kod üret (çakışmada birkaç kez dene).
	var v Voucher
	var lastErr error
	for try := 0; try < 6; try++ {
		code := genVoucherCode(8)
		lastErr = a.db.QueryRow(r.Context(),
			`INSERT INTO vouchers (site_id,name,code,profile_id,max_users,expires_at)
			 VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, code, active`,
			in.SiteID, in.Name, code, profileID, maxUsers, expires).Scan(&v.ID, &v.Code, &v.Active)
		if lastErr == nil {
			break
		}
		if !strings.Contains(lastErr.Error(), "duplicate") && !strings.Contains(lastErr.Error(), "unique") {
			break
		}
	}
	if lastErr != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kod oluşturulamadı"})
		return
	}
	v.SiteID = in.SiteID
	v.Name = in.Name
	v.MaxUsers = maxUsers
	if in.RateUpKbps > 0 {
		v.RateUpKbps = &in.RateUpKbps
	}
	if in.RateDnKbps > 0 {
		v.RateDnKbps = &in.RateDnKbps
	}
	if expires != nil {
		s := expires.Format("2006-01-02 15:04")
		v.ExpiresAt = &s
	}
	writeJSON(w, http.StatusCreated, map[string]any{"voucher": v})
}

// handleVoucherUpdate: ad, kullanıcı adedi, bitiş süresi ve hız limitini değiştirir.
// Hız değişimi voucher'a bağlı connection_profile'da uygulanır (yoksa oluşturulur),
// böylece o kodu kullanan misafirlerin hızı oturum düşmeden güncellenir.
func (a *app) handleVoucherUpdate(w http.ResponseWriter, r *http.Request) {
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
		Name       string `json:"name"`
		MaxUsers   int    `json:"max_users"`
		ExpiresAt  string `json:"expires_at"`
		RateUpKbps int    `json:"rate_up_kbps"`
		RateDnKbps int    `json:"rate_down_kbps"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Kod adı gerekli"})
		return
	}
	// Voucher müşteriye ait mi + profil id'sini al
	var profileID *int64
	if err := a.db.QueryRow(r.Context(),
		`SELECT v.profile_id FROM vouchers v JOIN sites s ON s.id=v.site_id WHERE v.id=$1 AND s.customer_id=$2`,
		id, cid).Scan(&profileID); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	// Hız: profil varsa güncelle, yoksa (ve hız girildiyse) oluştur, hız sıfırlandıysa profili kaldır.
	if in.RateUpKbps > 0 || in.RateDnKbps > 0 {
		if profileID != nil {
			_, _ = a.db.Exec(r.Context(),
				`UPDATE connection_profiles SET name=$1, rate_up_kbps=$2, rate_down_kbps=$3 WHERE id=$4 AND kind='voucher'`,
				"Kod: "+in.Name, in.RateUpKbps, in.RateDnKbps, *profileID)
		} else {
			var pid int64
			if a.db.QueryRow(r.Context(),
				`INSERT INTO connection_profiles (customer_id,site_id,name,kind,rate_up_kbps,rate_down_kbps)
				 SELECT $1, v.site_id, $2, 'voucher', $3, $4 FROM vouchers v WHERE v.id=$5 RETURNING id`,
				cid, "Kod: "+in.Name, in.RateUpKbps, in.RateDnKbps, id).Scan(&pid) == nil {
				profileID = &pid
			}
		}
	} else if profileID != nil {
		// hız sınırsıza çekildi: mac_entry FK SET NULL, profili sil
		old := *profileID
		profileID = nil
		_, _ = a.db.Exec(r.Context(), `UPDATE vouchers SET profile_id=NULL WHERE id=$1`, id)
		_, _ = a.db.Exec(r.Context(), `DELETE FROM connection_profiles WHERE id=$1 AND kind='voucher'`, old)
	}
	var maxUsers *int
	if in.MaxUsers > 0 {
		maxUsers = &in.MaxUsers
	}
	expires := parseExpiry(in.ExpiresAt)
	ct, err := a.db.Exec(r.Context(),
		`UPDATE vouchers v SET name=$1, max_users=$2, expires_at=$3, profile_id=$4
		 FROM sites s WHERE v.site_id=s.id AND v.id=$5 AND s.customer_id=$6`,
		in.Name, maxUsers, expires, profileID, id, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "güncelleme hatası"})
		return
	}
	if ct.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// handleVoucherBulkCreate: tek seferde N adet kod üretir (otel/etkinlik dağıtımı için).
// Tüm kodlar aynı hız profilini paylaşır (varsa). Üretilen kodları döner.
func (a *app) handleVoucherBulkCreate(w http.ResponseWriter, r *http.Request) {
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
		SiteID     int64  `json:"site_id"`
		Name       string `json:"name"`
		Count      int    `json:"count"`
		MaxUsers   int    `json:"max_users"`
		ExpiresAt  string `json:"expires_at"`
		RateUpKbps int    `json:"rate_up_kbps"`
		RateDnKbps int    `json:"rate_down_kbps"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		in.Name = "Kod"
	}
	if in.Count < 1 || in.Count > 500 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Adet 1–500 arası olmalı"})
		return
	}
	if !a.siteOwned(r.Context(), in.SiteID, cid) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz lokasyon"})
		return
	}
	var profileID *int64
	if in.RateUpKbps > 0 || in.RateDnKbps > 0 {
		var pid int64
		if a.db.QueryRow(r.Context(),
			`INSERT INTO connection_profiles (customer_id,site_id,name,kind,rate_up_kbps,rate_down_kbps)
			 VALUES ($1,$2,$3,'voucher',$4,$5) RETURNING id`,
			cid, in.SiteID, "Kod: "+in.Name, in.RateUpKbps, in.RateDnKbps).Scan(&pid) == nil {
			profileID = &pid
		}
	}
	var maxUsers *int
	if in.MaxUsers > 0 {
		maxUsers = &in.MaxUsers
	}
	expires := parseExpiry(in.ExpiresAt)
	codes := []string{}
	for i := 0; i < in.Count; i++ {
		var code string
		for try := 0; try < 6; try++ {
			c := genVoucherCode(8)
			if _, err := a.db.Exec(r.Context(),
				`INSERT INTO vouchers (site_id,name,code,profile_id,max_users,expires_at) VALUES ($1,$2,$3,$4,$5,$6)`,
				in.SiteID, in.Name, c, profileID, maxUsers, expires); err == nil {
				code = c
				break
			}
		}
		if code != "" {
			codes = append(codes, code)
		}
	}
	writeJSON(w, http.StatusCreated, map[string]any{"codes": codes, "count": len(codes)})
}

// handleVoucherQR: kodun portal-URL'sini içeren QR (PNG). Misafir okutunca kod ön-dolu açılır.
func (a *app) handleVoucherQR(w http.ResponseWriter, r *http.Request) {
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
	var code string
	var siteID int64
	if err := a.db.QueryRow(r.Context(),
		`SELECT v.code, v.site_id FROM vouchers v JOIN sites s ON s.id=v.site_id WHERE v.id=$1 AND s.customer_id=$2`,
		id, cid).Scan(&code, &siteID); err != nil {
		http.Error(w, "bulunamadı", http.StatusNotFound)
		return
	}
	url := fmt.Sprintf("https://%s/portal?site=%d&code=%s", goxPublicHost, siteID, code)
	png, err := qrcode.Encode(url, qrcode.Medium, 320)
	if err != nil {
		http.Error(w, "qr hatası", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	_, _ = w.Write(png)
}

func (a *app) handleVoucherDelete(w http.ResponseWriter, r *http.Request) {
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
	// Voucher'a bağlı otomatik profili de temizle (CASCADE FK profile→mac_entries SET NULL).
	var profileID *int64
	_ = a.db.QueryRow(r.Context(),
		`SELECT v.profile_id FROM vouchers v JOIN sites s ON s.id=v.site_id WHERE v.id=$1 AND s.customer_id=$2`, id, cid).Scan(&profileID)
	ct, err := a.db.Exec(r.Context(),
		`DELETE FROM vouchers v USING sites s WHERE v.site_id=s.id AND v.id=$1 AND s.customer_id=$2`, id, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "silme hatası"})
		return
	}
	if ct.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	if profileID != nil {
		_, _ = a.db.Exec(r.Context(), `DELETE FROM connection_profiles WHERE id=$1 AND kind='voucher'`, *profileID)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// redeemVoucher: portal "Kod ile giriş" — kodu doğrular, kullanıcı kotasını kontrol eder,
// MAC'i voucher profiline bağlar (whitelist). reason: '' = ok, aksi halde hata metni.
func (a *app) redeemVoucher(ctx context.Context, customerID, site int64, code, mac, ip string) (bool, string, string) {
	code = strings.TrimSpace(code)
	mac = strings.TrimSpace(mac)
	if code == "" {
		return false, "", "Kod girin"
	}
	var vid int64
	var profileID *int64
	var maxUsers *int
	var name string
	var active, expired bool
	err := a.db.QueryRow(ctx,
		`SELECT id, profile_id, max_users, name, active, (expires_at IS NOT NULL AND expires_at < now())
		 FROM vouchers WHERE site_id=$1 AND upper(code)=upper($2)`, site, code).
		Scan(&vid, &profileID, &maxUsers, &name, &active, &expired)
	if err != nil {
		return false, "", "Kod geçersiz"
	}
	if !active {
		return false, "", "Kod pasif"
	}
	if expired {
		return false, "", "Kodun süresi dolmuş"
	}
	if mac != "" {
		var already bool
		_ = a.db.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM voucher_redemptions WHERE voucher_id=$1 AND lower(mac)=lower($2))`, vid, mac).Scan(&already)
		if !already {
			if maxUsers != nil {
				var used int
				_ = a.db.QueryRow(ctx, `SELECT count(*) FROM voucher_redemptions WHERE voucher_id=$1`, vid).Scan(&used)
				if used >= *maxUsers {
					return false, "", "Kod kullanıcı limitine ulaştı"
				}
			}
			_, _ = a.db.Exec(ctx, `INSERT INTO voucher_redemptions (voucher_id,mac) VALUES ($1,$2) ON CONFLICT DO NOTHING`, vid, mac)
		}
		// MAC'i voucher profiline bağla (ajan hız queue'sunu uygular, RADIUS izin verir)
		_, _ = a.db.Exec(ctx,
			`INSERT INTO mac_entries (site_id,mac,profile_id,list_type) VALUES ($1,$2::macaddr,$3,'normal')
			 ON CONFLICT (site_id,mac) DO UPDATE SET profile_id=EXCLUDED.profile_id, list_type='normal'`,
			site, mac, profileID)
	}
	// 5651 erişim kaydı ajan tarafında oturum başında tutulur (bkz. wg/agent.py); burada yazmıyoruz.
	_, _ = customerID, ip
	return true, name, ""
}
