package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// WhatsApp ile giriş (misafir-başlatan). Akış:
//  1) /portal/wa-start  → token üret + wa.me linki döndür
//  2) misafir goX numarasına "GOX-<token>" mesajını gönderir
//  3) Meta webhook (/wa/webhook POST) → gönderen numara + token; eşleşirse verified=true
//  4) /portal/wa-status → portal poll eder; verified olunca /portal/verify (method=whatsapp)

// PUBLIC: WhatsApp giriş oturumu başlat → token + wa.me linki.
func (a *app) handleWaStart(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Site int64  `json:"site"`
		Mac  string `json:"mac"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	num := env("GOX_WA_NUMBER", "")
	if num == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "WhatsApp girişi henüz yapılandırılmadı."})
		return
	}
	var cid int64
	if err := a.db.QueryRow(r.Context(), `SELECT customer_id FROM sites WHERE id=$1`, in.Site).Scan(&cid); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "lokasyon yok"})
		return
	}
	if a.tenantSuspended(r.Context(), cid) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "Bu işletmenin Wi-Fi hizmeti şu anda kullanılamıyor."})
		return
	}
	token := genVoucherCode(10)
	if _, err := a.db.Exec(r.Context(),
		`INSERT INTO whatsapp_otps (site_id, mac, token, expires_at) VALUES ($1,$2,$3, now()+interval '10 minutes')`,
		in.Site, strings.ToLower(strings.TrimSpace(in.Mac)), token); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "başlatılamadı"})
		return
	}
	msg := "GOX-" + token
	link := "https://wa.me/" + strings.TrimPrefix(num, "+") + "?text=" + url.QueryEscape(msg)
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "wa_link": link, "message": msg})
}

// PUBLIC: token doğrulandı mı? Portal poll eder.
func (a *app) handleWaStatus(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "token yok"})
		return
	}
	var verified bool
	var expired bool
	err := a.db.QueryRow(r.Context(),
		`SELECT verified, expires_at < now() FROM whatsapp_otps WHERE token=$1`, token).Scan(&verified, &expired)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "oturum yok"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"verified": verified, "expired": expired})
}

// verifyWhatsapp: handlePortalVerify "whatsapp" metodu. Token webhook'ta doğrulandıysa kimlik=telefon.
func (a *app) verifyWhatsapp(ctx context.Context, site int64, token string) (bool, string, string) {
	token = strings.TrimSpace(token)
	if token == "" {
		return false, "", "Oturum bulunamadı"
	}
	var phone string
	var verified, expired bool
	err := a.db.QueryRow(ctx,
		`SELECT phone, verified, expires_at < now() FROM whatsapp_otps WHERE token=$1 AND site_id=$2`, token, site).
		Scan(&phone, &verified, &expired)
	if err != nil {
		return false, "", "Oturum bulunamadı"
	}
	if expired {
		return false, "", "Süre doldu, tekrar deneyin"
	}
	if !verified {
		return false, "", "WhatsApp mesajı henüz alınmadı"
	}
	return true, phone, ""
}

// GET /wa/webhook — Meta doğrulama el sıkışması (hub.challenge düz metin döner).
func (a *app) handleWaWebhookVerify(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if q.Get("hub.mode") == "subscribe" && q.Get("hub.verify_token") == env("GOX_WA_VERIFY_TOKEN", "") && env("GOX_WA_VERIFY_TOKEN", "") != "" {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(q.Get("hub.challenge")))
		return
	}
	w.WriteHeader(http.StatusForbidden)
}

// POST /wa/webhook — gelen WhatsApp mesajları. "GOX-<token>" yakalanır, gönderen numara kaydedilir.
func (a *app) handleWaWebhookInbound(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	// Meta her durumda 200 bekler (aksi halde tekrar dener).
	defer func() { w.WriteHeader(http.StatusOK); _, _ = w.Write([]byte("ok")) }()

	var payload struct {
		Entry []struct {
			Changes []struct {
				Value struct {
					Messages []struct {
						From string `json:"from"`
						Text struct {
							Body string `json:"body"`
						} `json:"text"`
					} `json:"messages"`
				} `json:"value"`
			} `json:"changes"`
		} `json:"entry"`
	}
	if json.Unmarshal(body, &payload) != nil {
		return
	}
	for _, e := range payload.Entry {
		for _, c := range e.Changes {
			for _, m := range c.Value.Messages {
				token := extractWaToken(m.Text.Body)
				if token == "" || m.From == "" {
					continue
				}
				ct, _ := a.db.Exec(r.Context(),
					`UPDATE whatsapp_otps SET phone=$1, verified=true
					 WHERE token=$2 AND verified=false AND expires_at>now()`, m.From, token)
				if ct.RowsAffected() > 0 {
					a.waReply(m.From) // opsiyonel onay (ücretsiz pencere)
				}
			}
		}
	}
}

// extractWaToken: mesaj gövdesinden "GOX-<token>" değerini ayıklar.
func extractWaToken(body string) string {
	body = strings.TrimSpace(body)
	up := strings.ToUpper(body)
	idx := strings.Index(up, "GOX-")
	if idx < 0 {
		return ""
	}
	rest := body[idx+4:]
	// token sonraki boşluğa/satır sonuna kadar
	if sp := strings.IndexAny(rest, " \t\r\n"); sp >= 0 {
		rest = rest[:sp]
	}
	return strings.TrimSpace(rest)
}

// waReply: doğrulanan misafire 24 saatlik pencere içinde ücretsiz onay mesajı (token + phone-id varsa).
func (a *app) waReply(to string) {
	token := env("GOX_WA_TOKEN", "")
	phoneID := env("GOX_WA_PHONE_ID", "")
	if token == "" || phoneID == "" {
		return
	}
	payload, _ := json.Marshal(map[string]any{
		"messaging_product": "whatsapp",
		"to":                to,
		"type":              "text",
		"text":              map[string]string{"body": "Bağlantınız onaylandı. İnternete bağlanabilirsiniz. İyi günler!"},
	})
	req, err := http.NewRequest("POST", "https://graph.facebook.com/v20.0/"+phoneID+"/messages", bytes.NewReader(payload))
	if err != nil {
		return
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err == nil {
		_ = resp.Body.Close()
	}
}
