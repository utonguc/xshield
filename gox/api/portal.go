package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

type PortalSettings struct {
	SiteID       int64  `json:"site_id"`
	BrandName    string `json:"brand_name"`
	WelcomeTitle string `json:"welcome_title"`
	WelcomeText  string `json:"welcome_text"`
	PrimaryColor string `json:"primary_color"`
	OptGuest     bool   `json:"opt_guest"`
	OptStaff     bool   `json:"opt_staff"`
	OptMeeting   bool   `json:"opt_meeting"`
	OptTemp      bool   `json:"opt_temp"`
	OptMernis    bool   `json:"opt_mernis"`
	OptVoucher   bool   `json:"opt_voucher"`
	OptEmail     bool   `json:"opt_email"`
	OptWhatsapp  bool   `json:"opt_whatsapp"`
	AuthMethod   string `json:"auth_method"`
	Logo         string `json:"logo"`
	Theme        string `json:"theme"`
	WelcomeTitleEn string `json:"welcome_title_en"`
	WelcomeTextEn  string `json:"welcome_text_en"`
	KvkkText       string `json:"kvkk_text"`
	RedirectURL    string `json:"redirect_url"`
	OptOrder       string `json:"opt_order"`
	TempLabel        string `json:"temp_label"`
	TempMinutes      int    `json:"temp_minutes"`
	TempOnce         bool   `json:"temp_once"`
	TempUsed         bool   `json:"temp_used"` // bu MAC temp'i kullandı mı (public yanıtında)
	TempRateDownKbps *int   `json:"temp_rate_down_kbps"`
	TempRateUpKbps   *int   `json:"temp_rate_up_kbps"`
	TempProfileID    *int64 `json:"-"`
}

// portalFor: site'ın portal ayarlarını döner; kayıt yoksa makul varsayılanlar.
// ok=false → site yok.
func (a *app) portalFor(ctx context.Context, siteID int64) (PortalSettings, bool) {
	var siteName string
	if err := a.db.QueryRow(ctx, `SELECT name FROM sites WHERE id=$1`, siteID).Scan(&siteName); err != nil {
		return PortalSettings{}, false
	}
	p := PortalSettings{
		SiteID: siteID, BrandName: siteName,
		WelcomeTitle: "Hoş geldiniz", WelcomeText: "İnternete bağlanmak için bir seçenek seçin",
		PrimaryColor: "#C7F24E", OptGuest: true, OptTemp: true, AuthMethod: "none", Theme: "editorial",
		TempMinutes: 120,
	}
	_ = a.db.QueryRow(ctx,
		`SELECT brand_name,welcome_title,welcome_text,primary_color,opt_guest,opt_staff,opt_meeting,opt_temp,COALESCE(opt_mernis,false),COALESCE(opt_voucher,false),COALESCE(opt_email,false),COALESCE(opt_whatsapp,false),COALESCE(auth_method,'none'),COALESCE(logo,''),COALESCE(theme,'editorial'),COALESCE(welcome_title_en,''),COALESCE(welcome_text_en,''),COALESCE(kvkk_text,''),COALESCE(redirect_url,''),COALESCE(opt_order,''),COALESCE(temp_label,''),COALESCE(temp_minutes,120),COALESCE(temp_once,false),temp_profile_id,temp_rate_down_kbps,temp_rate_up_kbps
		 FROM portal_settings WHERE site_id=$1`, siteID).
		Scan(&p.BrandName, &p.WelcomeTitle, &p.WelcomeText, &p.PrimaryColor, &p.OptGuest, &p.OptStaff, &p.OptMeeting, &p.OptTemp, &p.OptMernis, &p.OptVoucher, &p.OptEmail, &p.OptWhatsapp, &p.AuthMethod, &p.Logo, &p.Theme, &p.WelcomeTitleEn, &p.WelcomeTextEn, &p.KvkkText, &p.RedirectURL, &p.OptOrder, &p.TempLabel, &p.TempMinutes, &p.TempOnce, &p.TempProfileID, &p.TempRateDownKbps, &p.TempRateUpKbps)
	return p, true
}

func tempMinutesOr(m int) int {
	if m <= 0 {
		return 120
	}
	return m
}

// ensureTempProfile: site'a özel geçici-erişim profilini (kind='temporary') oluşturur/günceller.
// Süre (dk) bu profilin duration_min'i; RADIUS Session-Timeout buradan gelir.
func (a *app) ensureTempProfile(ctx context.Context, sid, cid int64, minutes int, rateDown, rateUp *int) {
	var pid *int64
	_ = a.db.QueryRow(ctx, `SELECT temp_profile_id FROM portal_settings WHERE site_id=$1`, sid).Scan(&pid)
	if pid != nil {
		_, _ = a.db.Exec(ctx, `UPDATE connection_profiles SET duration_min=$1, rate_down_kbps=$2, rate_up_kbps=$3 WHERE id=$4 AND kind='temporary'`,
			minutes, rateDown, rateUp, *pid)
		return
	}
	var newID int64
	if a.db.QueryRow(ctx,
		`INSERT INTO connection_profiles (customer_id,site_id,name,kind,duration_min,rate_down_kbps,rate_up_kbps)
		 VALUES ($1,$2,$3,'temporary',$4,$5,$6) RETURNING id`,
		cid, sid, "Geçici Erişim", minutes, rateDown, rateUp).Scan(&newID) == nil {
		_, _ = a.db.Exec(ctx, `UPDATE portal_settings SET temp_profile_id=$1 WHERE site_id=$2`, newID, sid)
	}
}

func (a *app) siteOwned(ctx context.Context, siteID, cid int64) bool {
	var ok bool
	_ = a.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM sites WHERE id=$1 AND customer_id=$2)`, siteID, cid).Scan(&ok)
	return ok
}

func (a *app) handlePortalGet(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	sid, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if !a.siteOwned(r.Context(), sid, cid) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "lokasyon yok"})
		return
	}
	p, _ := a.portalFor(r.Context(), sid)
	writeJSON(w, http.StatusOK, map[string]any{"portal": p})
}

func (a *app) handlePortalUpdate(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	sid, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if !a.siteOwned(r.Context(), sid, cid) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "lokasyon yok"})
		return
	}
	var in PortalSettings
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	// opt_email/opt_whatsapp değişimini yakala (değişirse ilgili walled-garden'ı cihaza canlı it).
	var prevEmail, prevWa bool
	_ = a.db.QueryRow(r.Context(), `SELECT COALESCE(opt_email,false), COALESCE(opt_whatsapp,false) FROM portal_settings WHERE site_id=$1`, sid).Scan(&prevEmail, &prevWa)
	if in.PrimaryColor == "" {
		in.PrimaryColor = "#C7F24E"
	}
	if in.AuthMethod != "mernis" && in.AuthMethod != "pms" {
		in.AuthMethod = "none"
	}
	switch in.Theme {
	case "editorial", "dark", "soft", "minimal":
	default:
		in.Theme = "editorial"
	}
	_, err = a.db.Exec(r.Context(),
		`INSERT INTO portal_settings (site_id,brand_name,welcome_title,welcome_text,primary_color,opt_guest,opt_staff,opt_meeting,opt_temp,opt_mernis,opt_voucher,auth_method,logo,theme,welcome_title_en,welcome_text_en,kvkk_text,redirect_url,opt_order,temp_label,temp_minutes,temp_once,temp_rate_down_kbps,temp_rate_up_kbps,opt_email,opt_whatsapp,updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,now())
		 ON CONFLICT (site_id) DO UPDATE SET
		   brand_name=EXCLUDED.brand_name, welcome_title=EXCLUDED.welcome_title, welcome_text=EXCLUDED.welcome_text,
		   primary_color=EXCLUDED.primary_color, opt_guest=EXCLUDED.opt_guest, opt_staff=EXCLUDED.opt_staff,
		   opt_meeting=EXCLUDED.opt_meeting, opt_temp=EXCLUDED.opt_temp, opt_mernis=EXCLUDED.opt_mernis, opt_voucher=EXCLUDED.opt_voucher, auth_method=EXCLUDED.auth_method,
		   logo=EXCLUDED.logo, theme=EXCLUDED.theme, welcome_title_en=EXCLUDED.welcome_title_en, welcome_text_en=EXCLUDED.welcome_text_en,
		   kvkk_text=EXCLUDED.kvkk_text, redirect_url=EXCLUDED.redirect_url, opt_order=EXCLUDED.opt_order,
		   temp_label=EXCLUDED.temp_label, temp_minutes=EXCLUDED.temp_minutes, temp_once=EXCLUDED.temp_once,
		   temp_rate_down_kbps=EXCLUDED.temp_rate_down_kbps, temp_rate_up_kbps=EXCLUDED.temp_rate_up_kbps,
		   opt_email=EXCLUDED.opt_email, opt_whatsapp=EXCLUDED.opt_whatsapp, updated_at=now()`,
		sid, in.BrandName, in.WelcomeTitle, in.WelcomeText, in.PrimaryColor,
		in.OptGuest, in.OptStaff, in.OptMeeting, in.OptTemp, in.OptMernis, in.OptVoucher, in.AuthMethod, in.Logo, in.Theme,
		in.WelcomeTitleEn, in.WelcomeTextEn, in.KvkkText, in.RedirectURL, in.OptOrder, in.TempLabel, tempMinutesOr(in.TempMinutes), in.TempOnce,
		in.TempRateDownKbps, in.TempRateUpKbps, in.OptEmail, in.OptWhatsapp)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	// Geçici erişim profili (kind='temporary', site'a özel): süre + hız buradan yönetilir.
	a.ensureTempProfile(r.Context(), sid, cid, tempMinutesOr(in.TempMinutes), in.TempRateDownKbps, in.TempRateUpKbps)
	// opt_email/opt_whatsapp değiştiyse ilgili walled-garden'ı cihazlara canlı uygula (kopmasız).
	if in.OptEmail != prevEmail || in.OptWhatsapp != prevWa {
		a.enqueueSyncPolicyForSite(r.Context(), sid)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// handlePortalPublic: AUTH YOK — captive portal sayfası için ayarlar + sektör + pms durumu.
func (a *app) handlePortalPublic(w http.ResponseWriter, r *http.Request) {
	sid, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	p, ok := a.portalFor(r.Context(), sid)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "lokasyon yok"})
		return
	}
	var cid int64
	sector := "cafe"
	status := "active"
	_ = a.db.QueryRow(r.Context(),
		`SELECT s.customer_id, COALESCE(c.sector,'cafe'), COALESCE(c.status,'active') FROM sites s JOIN customers c ON c.id=s.customer_id WHERE s.id=$1`, sid).
		Scan(&cid, &sector, &status)
	suspended := status == "suspended"
	var pmsEnabled bool
	_ = a.db.QueryRow(r.Context(), `SELECT COALESCE(enabled,false) FROM pms_config WHERE customer_id=$1`, cid).Scan(&pmsEnabled)
	// Tek-kullanımlık temp: bu cihaz (MAC) daha önce kullandıysa link gizlenecek.
	mac := strings.TrimSpace(r.URL.Query().Get("mac"))
	if p.OptTemp && p.TempOnce && mac != "" {
		var used bool
		_ = a.db.QueryRow(r.Context(),
			`SELECT EXISTS(SELECT 1 FROM temp_usage WHERE site_id=$1 AND lower(mac)=lower($2))`, sid, mac).Scan(&used)
		p.TempUsed = used
	}
	writeJSON(w, http.StatusOK, map[string]any{"portal": p, "sector": sector, "pms_enabled": pmsEnabled, "suspended": suspended})
}

// tenantSuspended: işletme (tenant) askıya alınmış mı? Portal girişini kesmek için.
func (a *app) tenantSuspended(ctx context.Context, cid int64) bool {
	var status string
	_ = a.db.QueryRow(ctx, `SELECT status FROM customers WHERE id=$1`, cid).Scan(&status)
	return status == "suspended"
}

// PUBLIC: captive portal misafir doğrulama (MERNIS / PMS). Başarılıysa log + ok.
func (a *app) handlePortalVerify(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Site      int64  `json:"site"`
		Method    string `json:"method"`
		Mac       string `json:"mac"`
		TC        string `json:"tc"`
		Ad        string `json:"ad"`
		Soyad     string `json:"soyad"`
		DogumYili int    `json:"dogum_yili"`
		Room      string `json:"room"`
		Surname   string `json:"surname"`
		Username  string `json:"username"`
		Password  string `json:"password"`
		Code      string `json:"code"`
		Email     string `json:"email"`
		Token     string `json:"token"`
		IP        string `json:"ip"`
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
	if a.tenantSuspended(r.Context(), cid) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "Bu işletmenin Wi-Fi hizmeti şu anda kullanılamıyor."})
		return
	}

	var verified bool
	var identity string
	var customErr string
	switch in.Method {
	case "mernis":
		okv, err := verifyMernis(r.Context(), in.TC, in.Ad, in.Soyad, in.DogumYili)
		if err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "TC doğrulama servisi şu an kullanılamıyor (resmi NVI KPS erişimi gerekli)"})
			return
		}
		verified = okv
		identity = turkishUpper(in.Ad) + " " + turkishUpper(in.Soyad)
	case "staff":
		verified, identity = a.verifyStaff(r.Context(), in.Site, in.Username, in.Password)
	case "voucher":
		verified, identity, customErr = a.redeemVoucher(r.Context(), cid, in.Site, in.Code, in.Mac, in.IP)
	case "email":
		verified, identity, customErr = a.verifyEmailOtp(r.Context(), in.Site, in.Email, in.Code)
	case "whatsapp":
		verified, identity, customErr = a.verifyWhatsapp(r.Context(), in.Site, in.Token)
	case "pms":
		_ = a.db.QueryRow(r.Context(),
			`SELECT EXISTS(SELECT 1 FROM pms_guests
			   WHERE customer_id=$1 AND lower(surname)=lower($2) AND ($3='' OR room=$3)
			     AND (checkin IS NULL OR checkin<=current_date) AND (checkout IS NULL OR checkout>=current_date))`,
			cid, in.Surname, in.Room).Scan(&verified)
		identity = in.Room + " " + in.Surname
	default:
		verified = true
	}
	if !verified {
		msg := "Doğrulanamadı, bilgileri kontrol edin"
		if customErr != "" {
			msg = customErr
		}
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": msg})
		return
	}
	_, _ = a.db.Exec(r.Context(),
		`INSERT INTO guest_verifications (customer_id,site_id,method,identity,mac) VALUES ($1,$2,$3,$4,$5)`,
		cid, in.Site, in.Method, identity, in.Mac)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "name": identity})
}

// PUBLIC: misafir captive portal'da bir seçenek seçince MAC'i ilgili profile yazar (whitelist).
func (a *app) handlePortalGrant(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Site   int64  `json:"site"`
		Mac    string `json:"mac"`
		Option string `json:"option"`
		IP     string `json:"ip"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Mac = strings.TrimSpace(in.Mac)
	if in.Mac == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "mac yok"})
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
	kind := map[string]string{"guest": "guest", "staff": "staff", "meeting": "meeting", "temp": "temporary"}[in.Option]
	if kind == "" {
		kind = "guest"
	}
	var pid *int64
	var p int64
	if in.Option == "temp" {
		// Geçici erişim: site'a özel temp profilini kullan + tek-kullanım kaydı tut.
		var tpid *int64
		_ = a.db.QueryRow(r.Context(), `SELECT temp_profile_id FROM portal_settings WHERE site_id=$1`, in.Site).Scan(&tpid)
		pid = tpid
		_, _ = a.db.Exec(r.Context(),
			`INSERT INTO temp_usage (site_id,mac) VALUES ($1,$2) ON CONFLICT DO NOTHING`, in.Site, strings.ToLower(in.Mac))
	}
	if pid == nil && a.db.QueryRow(r.Context(),
		`SELECT id FROM connection_profiles WHERE customer_id=$1 AND kind=$2 AND (site_id=$3 OR site_id IS NULL)
		 ORDER BY (site_id=$3) DESC NULLS LAST, id LIMIT 1`, cid, kind, in.Site).Scan(&p) == nil {
		pid = &p
	}
	if _, err := a.db.Exec(r.Context(),
		`INSERT INTO mac_entries (site_id,mac,profile_id,list_type) VALUES ($1,$2::macaddr,$3,'normal')
		 ON CONFLICT (site_id,mac) DO UPDATE SET profile_id=EXCLUDED.profile_id, list_type='normal'`,
		in.Site, in.Mac, pid); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "MAC kaydedilemedi"})
		return
	}
	// 5651 erişim kaydı portal'da DEĞİL, ajan tarafında oturum başlangıcında tutulur
	// (MAC ile otomatik giriş dahil TÜM erişimi yakalamak + hash zincirini tek yazarda
	// tutmak için). Bkz. wg/agent.py log_access.
	_ = in.IP
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
