package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// logAccess: 5651 erişim olayını append-only + hash-zincirli yazar. Best-effort:
// hata olsa bile misafirin bağlantısını ASLA engellemez (sessiz log).
func (a *app) logAccess(ctx context.Context, customerID int64, siteID *int64, mac, ip, identity, method, event string) {
	if customerID == 0 {
		return
	}
	ts := time.Now().UTC()
	var prev string
	_ = a.db.QueryRow(ctx, `SELECT row_hash FROM access_logs WHERE customer_id=$1 ORDER BY id DESC LIMIT 1`, customerID).Scan(&prev)
	payload := fmt.Sprintf("%d|%s|%s|%s|%s|%s|%s|%s",
		customerID, ts.Format(time.RFC3339Nano), strings.ToLower(mac), ip, identity, method, event, prev)
	sum := sha256.Sum256([]byte(payload))
	rowHash := hex.EncodeToString(sum[:])
	var sid any
	if siteID != nil && *siteID > 0 {
		sid = *siteID
	}
	_, err := a.db.Exec(ctx,
		`INSERT INTO access_logs (customer_id, site_id, ts, mac, ip, identity, method, event, prev_hash, row_hash)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		customerID, sid, ts, strings.ToLower(mac), ip, identity, method, event, prev, rowHash)
	if err != nil {
		fmt.Println("access log yazılamadı:", err)
	}
}

type tsaConfig struct {
	Enabled  bool   `json:"enabled"`
	URL      string `json:"url"`
	Username string `json:"username"`
	HasPass  bool   `json:"has_pass"`
	HashAlg  string `json:"hash_alg"`
}

func (a *app) handleTSAConfigGet(w http.ResponseWriter, r *http.Request) {
	// TSA (KamuSM) entegrasyonu platform (goX) seviyesinde GLOBAL — yalnız owner yapılandırır.
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	var c tsaConfig
	var pass string
	_ = a.db.QueryRow(r.Context(),
		`SELECT enabled, url, username, password, hash_alg FROM tsa_config WHERE id=1`).
		Scan(&c.Enabled, &c.URL, &c.Username, &pass, &c.HashAlg)
	c.HasPass = pass != "" // parola asla geri dönülmez, yalnız var/yok
	writeJSON(w, http.StatusOK, map[string]any{"tsa": c})
}

func (a *app) handleTSAConfigUpdate(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	var in struct {
		Enabled  bool    `json:"enabled"`
		URL      string  `json:"url"`
		Username string  `json:"username"`
		Password *string `json:"password"` // nil/boş = değiştirme
		HashAlg  string  `json:"hash_alg"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	if in.HashAlg != "sha512" {
		in.HashAlg = "sha256"
	}
	// Parola yalnız yeni değer gelirse güncellenir (COALESCE).
	var passArg any
	if in.Password != nil && *in.Password != "" {
		passArg = *in.Password
	}
	_, err := a.db.Exec(r.Context(),
		`UPDATE tsa_config SET enabled=$1, url=$2, username=$3, password=COALESCE($4,password), hash_alg=$5, updated_at=now() WHERE id=1`,
		in.Enabled, strings.TrimSpace(in.URL), strings.TrimSpace(in.Username), passArg, in.HashAlg)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleAccessLogsList(w http.ResponseWriter, r *http.Request) {
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
	// Filtreler: site, q (mac/kimlik), from/to (tarih), sayfalama
	q := r.URL.Query()
	where := "l.customer_id=$1"
	args := []any{cid}
	add := func(cond string, val any) {
		args = append(args, val)
		where += " AND " + cond + "$" + strconv.Itoa(len(args))
	}
	if s := strings.TrimSpace(q.Get("site")); s != "" && s != "0" {
		add("l.site_id=", s)
	}
	if term := strings.TrimSpace(q.Get("q")); term != "" {
		args = append(args, "%"+strings.ToLower(term)+"%")
		where += " AND (lower(l.mac) LIKE $" + strconv.Itoa(len(args)) + " OR lower(l.identity) LIKE $" + strconv.Itoa(len(args)) + " OR l.ip LIKE $" + strconv.Itoa(len(args)) + ")"
	}
	if f := strings.TrimSpace(q.Get("from")); f != "" {
		args = append(args, f)
		where += " AND l.ts >= $" + strconv.Itoa(len(args)) + "::date"
	}
	if t := strings.TrimSpace(q.Get("to")); t != "" {
		args = append(args, t)
		where += " AND l.ts < ($" + strconv.Itoa(len(args)) + "::date + interval '1 day')"
	}
	limit := 100
	if n, err := strconv.Atoi(q.Get("limit")); err == nil && n > 0 && n <= 1000 {
		limit = n
	}
	offset := 0
	if n, err := strconv.Atoi(q.Get("offset")); err == nil && n > 0 {
		offset = n
	}
	var total, stampedCount int
	_ = a.db.QueryRow(r.Context(), `SELECT count(*), count(*) FILTER (WHERE stamped) FROM access_logs l WHERE `+where, args...).Scan(&total, &stampedCount)

	args = append(args, limit, offset)
	rows, err := a.db.Query(r.Context(),
		`SELECT l.id, to_char(l.ts,'YYYY-MM-DD HH24:MI:SS'), COALESCE(s.name,''), COALESCE(l.mac,''),
		        COALESCE(l.ip,''), l.identity, l.method, l.event, l.stamped
		 FROM access_logs l LEFT JOIN sites s ON s.id=l.site_id
		 WHERE `+where+` ORDER BY l.id DESC LIMIT $`+strconv.Itoa(len(args)-1)+` OFFSET $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var id int64
		var ts, site, mac, ip, identity, method, event string
		var stamped bool
		if rows.Scan(&id, &ts, &site, &mac, &ip, &identity, &method, &event, &stamped) == nil {
			list = append(list, map[string]any{
				"id": id, "ts": ts, "site": site, "mac": mac, "ip": ip,
				"identity": identity, "method": method, "event": event, "stamped": stamped,
			})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"logs": list, "total": total, "stamped": stampedCount, "limit": limit, "offset": offset})
}

// handleVerifyLogs: hash zincirini baştan hesaplayıp bütünlüğü doğrular (kurcalanma tespiti).
func (a *app) handleVerifyLogs(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil || !a.isTenantAdmin(r.Context(), u) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "yetkiniz yok"})
		return
	}
	rows, err := a.db.Query(r.Context(),
		`SELECT id, to_char(ts AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"+00:00"'),
		        COALESCE(mac,''), COALESCE(ip,''), identity, method, event, prev_hash, row_hash
		 FROM access_logs WHERE customer_id=$1 ORDER BY id`, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	checked := 0
	var brokenAt int64 = 0
	prevExpected := ""
	for rows.Next() {
		var id int64
		var ts, mac, ip, identity, method, event, prevHash, rowHash string
		if rows.Scan(&id, &ts, &mac, &ip, &identity, &method, &event, &prevHash, &rowHash) != nil {
			continue
		}
		// Zincir bağı: prev_hash bir önceki satırın row_hash'i olmalı
		if prevHash != prevExpected {
			brokenAt = id
			break
		}
		// İçerik özeti: ajanın yazdığı payload formatıyla birebir
		payload := fmt.Sprintf("%d|%s|%s|%s|%s|%s|%s|%s", cid, ts, mac, ip, identity, method, event, prevHash)
		sum := sha256.Sum256([]byte(payload))
		if hex.EncodeToString(sum[:]) != rowHash {
			brokenAt = id
			break
		}
		prevExpected = rowHash
		checked++
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": brokenAt == 0, "checked": checked, "broken_at": brokenAt})
}

func (a *app) handleAccessLogsExport(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil || !a.isTenantAdmin(r.Context(), u) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "yetkiniz yok"})
		return
	}
	rows, err := a.db.Query(r.Context(),
		`SELECT l.id, to_char(l.ts,'YYYY-MM-DD"T"HH24:MI:SSOF'), COALESCE(s.name,''), COALESCE(l.mac,''),
		        COALESCE(l.ip,''), l.identity, l.method, l.event, l.prev_hash, l.row_hash
		 FROM access_logs l LEFT JOIN sites s ON s.id=l.site_id
		 WHERE l.customer_id=$1 ORDER BY l.id`, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\"5651-erisim-kayitlari.csv\"")
	_, _ = w.Write([]byte("\xEF\xBB\xBF")) // UTF-8 BOM (Excel TR)
	_, _ = w.Write([]byte("id;zaman;lokasyon;mac;ip;kimlik;yontem;olay;onceki_hash;satir_hash\n"))
	for rows.Next() {
		var id int64
		var ts, site, mac, ip, identity, method, event, prev, rh string
		if rows.Scan(&id, &ts, &site, &mac, &ip, &identity, &method, &event, &prev, &rh) == nil {
			line := fmt.Sprintf("%d;%s;%s;%s;%s;%s;%s;%s;%s;%s\n",
				id, ts, csvSafe(site), mac, ip, csvSafe(identity), method, event, prev, rh)
			_, _ = w.Write([]byte(line))
		}
	}
}

func csvSafe(s string) string {
	return strings.NewReplacer(";", ",", "\n", " ", "\r", " ").Replace(s)
}

func (a *app) handleLogTimestampsList(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil || !a.isTenantAdmin(r.Context(), u) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "yetkiniz yok"})
		return
	}
	rows, err := a.db.Query(r.Context(),
		`SELECT id, from_id, to_id, row_count, hash_alg, digest, status, detail,
		        to_char(created_at,'YYYY-MM-DD HH24:MI:SS'), (token IS NOT NULL)
		 FROM log_timestamps WHERE customer_id=$1 ORDER BY id DESC LIMIT 200`, cid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var id, from, to int64
		var cnt int
		var alg, digest, status, detail, created string
		var hasTok bool
		if rows.Scan(&id, &from, &to, &cnt, &alg, &digest, &status, &detail, &created, &hasTok) == nil {
			list = append(list, map[string]any{
				"id": id, "from_id": from, "to_id": to, "row_count": cnt, "hash_alg": alg,
				"digest": digest, "status": status, "detail": detail, "created_at": created, "has_token": hasTok,
			})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"timestamps": list})
}

// handleStampNow: tenant admin damgalamayı elle tetikler (creds girildikten sonra test için).
func (a *app) handleStampNow(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil || !a.isTenantAdmin(r.Context(), u) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "yetkiniz yok"})
		return
	}
	cfg, cfgOK := a.loadTSAConfig(r.Context())
	if !cfgOK || !cfg.enabled || cfg.url == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "TSA ayarı yapılmamış (önce zaman damgası bilgilerini girin)"})
		return
	}
	if err := a.stampCustomerLogs(r.Context(), cid, cfg); err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type tsaCfgInternal struct {
	enabled  bool
	url      string
	username string
	password string
	hashAlg  string
}

func (a *app) loadTSAConfig(ctx context.Context) (tsaCfgInternal, bool) {
	var c tsaCfgInternal
	err := a.db.QueryRow(ctx,
		`SELECT enabled, url, username, password, hash_alg FROM tsa_config WHERE id=1`).
		Scan(&c.enabled, &c.url, &c.username, &c.password, &c.hashAlg)
	if err != nil {
		return c, false
	}
	if c.hashAlg == "" {
		c.hashAlg = "sha256"
	}
	return c, true
}

// stampCustomerLogs: müşterinin damgalanmamış loglarını tek bir RFC3161 token'ıyla mühürler.
// Zincirli olduğu için en son satırın row_hash'ini damgalamak tüm aralığı kapsar.
func (a *app) stampCustomerLogs(ctx context.Context, customerID int64, cfg tsaCfgInternal) error {
	var fromID, toID int64
	var cnt int
	var lastHash string
	err := a.db.QueryRow(ctx,
		`SELECT COALESCE(min(id),0), COALESCE(max(id),0), count(*) FROM access_logs WHERE customer_id=$1 AND stamped=false`,
		customerID).Scan(&fromID, &toID, &cnt)
	if err != nil || cnt == 0 {
		return nil // damgalanacak log yok
	}
	if err := a.db.QueryRow(ctx, `SELECT row_hash FROM access_logs WHERE id=$1`, toID).Scan(&lastHash); err != nil {
		return err
	}
	token, terr := requestTimestamp(cfg.url, cfg.username, cfg.password, cfg.hashAlg, []byte(lastHash))
	if terr != nil {
		_, _ = a.db.Exec(ctx,
			`INSERT INTO log_timestamps (customer_id, from_id, to_id, row_count, hash_alg, digest, tsa_url, status, detail)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,'error',$8)`,
			customerID, fromID, toID, cnt, cfg.hashAlg, lastHash, cfg.url, terr.Error())
		return terr
	}
	_, _ = a.db.Exec(ctx,
		`INSERT INTO log_timestamps (customer_id, from_id, to_id, row_count, hash_alg, digest, token, tsa_url, status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ok')`,
		customerID, fromID, toID, cnt, cfg.hashAlg, lastHash, token, cfg.url)
	_, _ = a.db.Exec(ctx, `UPDATE access_logs SET stamped=true WHERE customer_id=$1 AND id<=$2 AND stamped=false`, customerID, toID)
	return nil
}

// stampingLoop: TSA etkinse, periyodik olarak damgalanmamış logları olan her müşteriyi mühürler.
// TSA ayarı yoksa uykuda — hiçbir şey yapmaz (5651 zemini hazır, abonelik girilince devreye girer).
func (a *app) stampingLoop() {
	interval := time.Duration(intFromEnv("GOX_TSA_INTERVAL_MIN", 30)) * time.Minute
	if interval < time.Minute {
		interval = 30 * time.Minute
	}
	for {
		time.Sleep(interval)
		ctx := context.Background()
		cfg, ok := a.loadTSAConfig(ctx)
		if !ok || !cfg.enabled || cfg.url == "" {
			continue
		}
		rows, err := a.db.Query(ctx, `SELECT DISTINCT customer_id FROM access_logs WHERE stamped=false`)
		if err != nil {
			continue
		}
		var ids []int64
		for rows.Next() {
			var id int64
			if rows.Scan(&id) == nil {
				ids = append(ids, id)
			}
		}
		rows.Close()
		for _, id := range ids {
			if err := a.stampCustomerLogs(ctx, id, cfg); err != nil {
				fmt.Println("damgalama hatası müşteri", id, ":", err)
			}
		}
		// Saklama: 5651 en az 2 yıl tutmayı gerektirir; bundan eskisini buda (gün ayarlanabilir).
		retDays := intFromEnv("GOX_LOG_RETENTION_DAYS", 730)
		if retDays > 0 {
			_, _ = a.db.Exec(ctx, fmt.Sprintf("DELETE FROM access_logs WHERE ts < now() - interval '%d days'", retDays))
		}
	}
}

func intFromEnv(key string, def int) int {
	if v := env(key, ""); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}
