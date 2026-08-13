package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"regexp"
	"strings"
)

var emailRe = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

func numericCode(n int) string {
	const digits = "0123456789"
	b := make([]byte, n)
	for i := range b {
		idx, _ := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		b[i] = digits[idx.Int64()]
	}
	return string(b)
}

// PUBLIC: e-posta OTP gönder. Misafir e-postasını girer, 6 haneli kod e-postayla gider.
func (a *app) handleEmailOtpSend(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Site  int64  `json:"site"`
		Email string `json:"email"`
		Mac   string `json:"mac"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if !emailRe.MatchString(in.Email) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçerli bir e-posta girin"})
		return
	}
	var cid int64
	var brand string
	if err := a.db.QueryRow(r.Context(),
		`SELECT s.customer_id, COALESCE(ps.brand_name, '') FROM sites s
		 LEFT JOIN portal_settings ps ON ps.site_id=s.id WHERE s.id=$1`, in.Site).Scan(&cid, &brand); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "lokasyon yok"})
		return
	}
	if a.tenantSuspended(r.Context(), cid) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "Bu işletmenin Wi-Fi hizmeti şu anda kullanılamıyor."})
		return
	}
	// Hız sınırı: aynı e-postaya son 45 sn içinde kod gönderildiyse reddet.
	var recent bool
	_ = a.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM email_otps WHERE site_id=$1 AND lower(email)=$2 AND created_at > now()-interval '45 seconds')`,
		in.Site, in.Email).Scan(&recent)
	if recent {
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "Kod az önce gönderildi, biraz sonra tekrar deneyin."})
		return
	}
	code := numericCode(6)
	if _, err := a.db.Exec(r.Context(),
		`INSERT INTO email_otps (site_id, email, mac, code, expires_at) VALUES ($1,$2,$3,$4, now()+interval '10 minutes')`,
		in.Site, in.Email, strings.ToLower(strings.TrimSpace(in.Mac)), code); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kod üretilemedi"})
		return
	}
	if brand == "" {
		brand = "Wi-Fi"
	}
	if err := a.sendMail(in.Email, brand+" Wi-Fi giriş kodunuz: "+code, otpEmailHTML(brand, code)); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "E-posta gönderilemedi, lütfen tekrar deneyin."})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// verifyEmailOtp: handlePortalVerify "email" metodu için. Son geçerli kodu kontrol eder.
func (a *app) verifyEmailOtp(ctx context.Context, site int64, email, code string) (bool, string, string) {
	email = strings.ToLower(strings.TrimSpace(email))
	code = strings.TrimSpace(code)
	if !emailRe.MatchString(email) || code == "" {
		return false, "", "E-posta veya kod eksik"
	}
	var id int64
	var stored string
	var attempts int
	err := a.db.QueryRow(ctx,
		`SELECT id, code, attempts FROM email_otps
		 WHERE site_id=$1 AND lower(email)=$2 AND used=false AND expires_at>now()
		 ORDER BY created_at DESC LIMIT 1`, site, email).Scan(&id, &stored, &attempts)
	if err != nil {
		return false, "", "Kodun süresi dolmuş, yeni kod isteyin"
	}
	if attempts >= 5 {
		_, _ = a.db.Exec(ctx, `UPDATE email_otps SET used=true WHERE id=$1`, id)
		return false, "", "Çok fazla deneme, yeni kod isteyin"
	}
	if stored != code {
		_, _ = a.db.Exec(ctx, `UPDATE email_otps SET attempts=attempts+1 WHERE id=$1`, id)
		return false, "", "Kod hatalı"
	}
	_, _ = a.db.Exec(ctx, `UPDATE email_otps SET used=true WHERE id=$1`, id)
	return true, email, ""
}

func otpEmailHTML(brand, code string) string {
	return fmt.Sprintf(`<div style="font-family:Arial,Helvetica,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#17160F">
  <h2 style="margin:0 0 8px">%s Wi-Fi</h2>
  <p style="color:#54503F;margin:0 0 20px">İnternete bağlanmak için doğrulama kodunuz:</p>
  <div style="font-size:34px;font-weight:700;letter-spacing:8px;background:#F1EEE3;border-radius:8px;padding:16px;text-align:center">%s</div>
  <p style="color:#8B8674;font-size:13px;margin:20px 0 0">Kod 10 dakika geçerlidir. Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz.</p>
</div>`, brand, code)
}
