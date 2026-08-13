package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

// PMS çerçevesi (otel). Gerçek Sedna/Elektra konnektörü API bilgisi gelince eklenecek;
// adaptör yuvası handlePmsSync içinde.

type PmsConfig struct {
	Provider  string `json:"provider"`
	Endpoint  string `json:"endpoint"`
	APIKey    string `json:"api_key"`
	HotelCode string `json:"hotel_code"`
	Enabled   bool   `json:"enabled"`
	LastSync  string `json:"last_sync"`
	// Entegrasyon modu + bağlantı (A: connector/push, B: tunnel/pull)
	ConnMode    string `json:"conn_mode"`
	HasToken    bool   `json:"has_token"`
	DbKind      string `json:"db_kind"`
	DbHost      string `json:"db_host"`
	DbPort      int    `json:"db_port"`
	DbName      string `json:"db_name"`
	DbUser      string `json:"db_user"`
	HasDbPass   bool   `json:"has_db_pass"`
	DbPass      string `json:"db_pass,omitempty"` // yalnız girişte; çıkışta HasDbPass kullanılır
	DbQuery     string `json:"db_query"`
	LastPull    string `json:"last_pull"`
	LastPullMsg string `json:"last_pull_msg"`
}

func (a *app) handlePmsConfigGet(w http.ResponseWriter, r *http.Request) {
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
	c := PmsConfig{Provider: "manual", ConnMode: "manual", DbKind: "sqlserver"}
	if loc > 0 {
		var tok, pass *string
		_ = a.db.QueryRow(r.Context(),
			`SELECT provider, COALESCE(endpoint,''), COALESCE(api_key,''), COALESCE(hotel_code,''), enabled, COALESCE(last_sync::text,''),
			        COALESCE(conn_mode,'manual'), push_token, COALESCE(db_kind,'sqlserver'), COALESCE(db_host,''), COALESCE(db_port,0),
			        COALESCE(db_name,''), COALESCE(db_user,''), NULLIF(COALESCE(db_pass,''),''), COALESCE(db_query,''),
			        COALESCE(last_pull::text,''), COALESCE(last_pull_msg,'')
			 FROM pms_config WHERE site_id=$1`, loc).
			Scan(&c.Provider, &c.Endpoint, &c.APIKey, &c.HotelCode, &c.Enabled, &c.LastSync,
				&c.ConnMode, &tok, &c.DbKind, &c.DbHost, &c.DbPort, &c.DbName, &c.DbUser, &pass, &c.DbQuery, &c.LastPull, &c.LastPullMsg)
		c.HasToken = tok != nil && *tok != ""
		c.HasDbPass = pass != nil
	}
	_ = cid
	writeJSON(w, http.StatusOK, map[string]any{"config": c, "location_required": loc == 0})
}

func (a *app) handlePmsConfigUpdate(w http.ResponseWriter, r *http.Request) {
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
	if loc == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "PMS ayarı için önce bir lokasyon seçin"})
		return
	}
	var in PmsConfig
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	if in.Provider == "" {
		in.Provider = "manual"
	}
	switch in.ConnMode {
	case "api", "connector", "tunnel", "manual":
	default:
		in.ConnMode = "manual"
	}
	switch in.DbKind {
	case "sqlserver", "mysql", "firebird", "postgres":
	default:
		in.DbKind = "sqlserver"
	}
	var dbPass any // boşsa mevcut parolayı koru
	if in.DbPass != "" {
		dbPass = in.DbPass
	}
	_, err = a.db.Exec(r.Context(),
		`INSERT INTO pms_config (site_id,customer_id,provider,endpoint,api_key,hotel_code,enabled,
		   conn_mode,db_kind,db_host,db_port,db_name,db_user,db_pass,db_query,updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,COALESCE($14,''),$15,now())
		 ON CONFLICT (site_id) DO UPDATE SET provider=EXCLUDED.provider, endpoint=EXCLUDED.endpoint,
		   api_key=EXCLUDED.api_key, hotel_code=EXCLUDED.hotel_code, enabled=EXCLUDED.enabled,
		   conn_mode=EXCLUDED.conn_mode, db_kind=EXCLUDED.db_kind, db_host=EXCLUDED.db_host, db_port=EXCLUDED.db_port,
		   db_name=EXCLUDED.db_name, db_user=EXCLUDED.db_user, db_pass=COALESCE($14, pms_config.db_pass),
		   db_query=EXCLUDED.db_query, updated_at=now()`,
		loc, cid, in.Provider, in.Endpoint, in.APIKey, in.HotelCode, in.Enabled,
		in.ConnMode, in.DbKind, in.DbHost, nullIfZero(in.DbPort), in.DbName, in.DbUser, dbPass, in.DbQuery)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	// Connector (A) modu için lokasyona özel push token üret (yoksa).
	if in.ConnMode == "connector" {
		_, _ = a.db.Exec(r.Context(),
			`UPDATE pms_config SET push_token=$1 WHERE site_id=$2 AND (push_token IS NULL OR push_token='')`,
			genVoucherCode(24), loc)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// handlePmsConnector: A şıkkı — lokasyona özel, ön-dolu connector script'i döner (fmt=php|ps1).
func (a *app) handlePmsConnector(w http.ResponseWriter, r *http.Request) {
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
	if loc == 0 {
		http.Error(w, "Önce bir lokasyon seçin", http.StatusBadRequest)
		return
	}
	var token, kind, host, name, user, pass, query string
	var port int
	if err := a.db.QueryRow(r.Context(),
		`SELECT COALESCE(push_token,''),COALESCE(db_kind,'sqlserver'),COALESCE(db_host,''),COALESCE(db_port,0),
		        COALESCE(db_name,''),COALESCE(db_user,''),COALESCE(db_pass,''),COALESCE(db_query,'')
		 FROM pms_config pc JOIN sites s ON s.id=pc.site_id WHERE pc.site_id=$1 AND s.customer_id=$2`,
		loc, cid).Scan(&token, &kind, &host, &port, &name, &user, &pass, &query); err != nil {
		http.Error(w, "PMS ayarı bulunamadı (önce connector modunu kaydedin)", http.StatusNotFound)
		return
	}
	if token == "" {
		http.Error(w, "Önce connector modunu kaydedip token üretin", http.StatusBadRequest)
		return
	}
	if query == "" {
		query = "SELECT room, full_name, surname, checkin, checkout FROM goalan_misafir_view"
	}
	pushURL := fmt.Sprintf("https://%s/api/pms/push", goxPublicHost)
	if r.URL.Query().Get("fmt") == "ps1" {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Header().Set("Content-Disposition", "attachment; filename=\"gox-pms-connector.ps1\"")
		_, _ = w.Write([]byte(pmsPowerShell(pushURL, token, host, port, name, user, pass, query)))
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\"gox-pms-connector.php\"")
	_, _ = w.Write([]byte(pmsPHP(pushURL, token, kind, host, port, name, user, pass, query)))
}

func pmsDSN(kind, host string, port int, name string) string {
	switch kind {
	case "mysql":
		return fmt.Sprintf("mysql:host=%s;port=%d;dbname=%s;charset=utf8", host, orDef(port, 3306), name)
	case "firebird":
		return fmt.Sprintf("firebird:dbname=%s/%d:%s", host, orDef(port, 3050), name)
	case "postgres":
		return fmt.Sprintf("pgsql:host=%s;port=%d;dbname=%s", host, orDef(port, 5432), name)
	default: // sqlserver
		return fmt.Sprintf("sqlsrv:Server=%s,%d;Database=%s", host, orDef(port, 1433), name)
	}
}
func orDef(v, d int) int {
	if v > 0 {
		return v
	}
	return d
}

func pmsPHP(url, token, kind, host string, port int, name, user, pass, query string) string {
	return fmt.Sprintf(`<?php
// ===== goX PMS Connector (PHP) =====
// Otelde DB erişimi olan bir makinede çalıştırın. Zamanlama: cron */5 * * * * php gox-pms-connector.php
// View 5 sütun döndürmeli: room, full_name, surname, checkin, checkout
$GOX="%s"; $TOKEN="%s";
$DSN=%q; $USER=%q; $PASS=%q;
$SQL=<<<'Q'
%s
Q;
try {
  $db=new PDO($DSN,$USER,$PASS,[PDO::ATTR_TIMEOUT=>10, PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
  $rows=$db->query($SQL)->fetchAll(PDO::FETCH_ASSOC);
  $g=array_map(function($r){return [
    "room"=>(string)($r["room"]??""),"full_name"=>(string)($r["full_name"]??""),
    "surname"=>(string)($r["surname"]??""),"checkin"=>(string)($r["checkin"]??""),"checkout"=>(string)($r["checkout"]??"")
  ];},$rows);
  $ch=curl_init($GOX);
  curl_setopt_array($ch,[CURLOPT_POST=>1,CURLOPT_RETURNTRANSFER=>1,
    CURLOPT_HTTPHEADER=>["Content-Type: application/json","X-Push-Token: ".$TOKEN],
    CURLOPT_POSTFIELDS=>json_encode(["guests"=>$g])]);
  $resp=curl_exec($ch); $code=curl_getinfo($ch,CURLINFO_HTTP_CODE);
  echo "gonderildi: ".count($g)." kayit (HTTP $code)\n";
} catch(Exception $e){ fwrite(STDERR,"HATA: ".$e->getMessage()."\n"); exit(1); }
`, url, token, pmsDSN(kind, host, port, name), user, pass, query)
}

func pmsPowerShell(url, token, host string, port int, name, user, pass, query string) string {
	return fmt.Sprintf(`# ===== goX PMS Connector (PowerShell · MS SQL Server) =====
# DB erişimli Windows makinede çalıştırın. Zamanlanmış görev ile 5 dk'da bir.
# View 5 sütun döndürmeli: room, full_name, surname, checkin, checkout
$GOX   = "%s"
$TOKEN = "%s"
$CONN  = "Server=%s,%d;Database=%s;User Id=%s;Password=%s;TrustServerCertificate=True"
$QUERY = @"
%s
"@
try {
  $c = New-Object System.Data.SqlClient.SqlConnection $CONN; $c.Open()
  $cmd = $c.CreateCommand(); $cmd.CommandText = $QUERY
  $rd = $cmd.ExecuteReader(); $rows = @()
  while ($rd.Read()) { $rows += @{ room="$($rd['room'])"; full_name="$($rd['full_name'])"; surname="$($rd['surname'])"; checkin="$($rd['checkin'])"; checkout="$($rd['checkout'])" } }
  $c.Close()
  $body = @{ guests = $rows } | ConvertTo-Json -Depth 5
  $r = Invoke-RestMethod -Uri $GOX -Method Post -ContentType "application/json" -Headers @{ "X-Push-Token" = $TOKEN } -Body $body
  Write-Host ("gonderildi: {0} kayit" -f $rows.Count)
} catch { Write-Host ("HATA: " + $_.Exception.Message) }
`, url, token, host, orDef(port, 1433), name, user, pass, query)
}

func (a *app) handlePmsGuestsList(w http.ResponseWriter, r *http.Request) {
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
		`SELECT id, COALESCE(room,''), COALESCE(full_name,''), COALESCE(surname,''),
		        COALESCE(checkin::text,''), COALESCE(checkout::text,''), source
		 FROM pms_guests WHERE customer_id=$1 AND ($2=0 OR site_id=$2) ORDER BY id DESC LIMIT 500`, cid, loc)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	type G struct {
		ID       int64  `json:"id"`
		Room     string `json:"room"`
		FullName string `json:"full_name"`
		Surname  string `json:"surname"`
		Checkin  string `json:"checkin"`
		Checkout string `json:"checkout"`
		Source   string `json:"source"`
	}
	list := []G{}
	for rows.Next() {
		var g G
		_ = rows.Scan(&g.ID, &g.Room, &g.FullName, &g.Surname, &g.Checkin, &g.Checkout, &g.Source)
		list = append(list, g)
	}
	writeJSON(w, http.StatusOK, map[string]any{"guests": list})
}

func nullDate(s string) any {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return s
}

func nullIfZero(n int) any {
	if n == 0 {
		return nil
	}
	return n
}

// handlePmsPush: A şıkkı (connector) — otelde çalışan script, lokasyon push-token'ı ile
// güncel misafir listesini gönderir. Token'a karşılık gelen site'ın connector kayıtlarını tazeler.
func (a *app) handlePmsPush(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.Header.Get("X-Push-Token"))
	if token == "" {
		token = strings.TrimSpace(r.URL.Query().Get("token"))
	}
	if token == "" {
		http.Error(w, "token gerekli", http.StatusUnauthorized)
		return
	}
	var siteID, cid int64
	if err := a.db.QueryRow(r.Context(),
		`SELECT pc.site_id, s.customer_id FROM pms_config pc JOIN sites s ON s.id=pc.site_id
		 WHERE pc.push_token=$1 AND COALESCE(pc.push_token,'')<>''`, token).Scan(&siteID, &cid); err != nil {
		http.Error(w, "gecersiz token", http.StatusUnauthorized)
		return
	}
	var in struct {
		Guests []pmsGuestRow `json:"guests"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 4<<20)).Decode(&in); err != nil {
		http.Error(w, "gecersiz istek", http.StatusBadRequest)
		return
	}
	n := a.refreshPmsGuests(r.Context(), cid, siteID, "connector", in.Guests)
	_, _ = a.db.Exec(r.Context(),
		`UPDATE pms_config SET last_pull=now(), last_pull_msg=$1 WHERE site_id=$2`,
		fmt.Sprintf("connector: %d kayıt", n), siteID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "count": n})
}

type pmsGuestRow struct {
	Room     string `json:"room"`
	FullName string `json:"full_name"`
	Surname  string `json:"surname"`
	Checkin  string `json:"checkin"`
	Checkout string `json:"checkout"`
}

// refreshPmsGuests: belirli kaynağın (connector/tunnel) misafirlerini sil + yeniden yaz (tam tazeleme).
func (a *app) refreshPmsGuests(ctx context.Context, cid, siteID int64, source string, rows []pmsGuestRow) int {
	tx, err := a.db.Begin(ctx)
	if err != nil {
		return 0
	}
	defer tx.Rollback(ctx)
	_, _ = tx.Exec(ctx, `DELETE FROM pms_guests WHERE site_id=$1 AND source=$2`, siteID, source)
	n := 0
	for _, g := range rows {
		if _, err := tx.Exec(ctx,
			`INSERT INTO pms_guests (customer_id,site_id,room,full_name,surname,checkin,checkout,source)
			 VALUES ($1,$2,$3,$4,$5,$6::date,$7::date,$8)`,
			cid, siteID, g.Room, g.FullName, g.Surname, nullDate(g.Checkin), nullDate(g.Checkout), source); err == nil {
			n++
		}
	}
	_ = tx.Commit(ctx)
	return n
}

// handlePmsGuestUpdate: misafir kaydını düzenle (oda/ad/soyad/giriş/çıkış).
func (a *app) handlePmsGuestUpdate(w http.ResponseWriter, r *http.Request) {
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
	loc := a.locationID(u)
	var in struct {
		Room     string `json:"room"`
		FullName string `json:"full_name"`
		Surname  string `json:"surname"`
		Checkin  string `json:"checkin"`
		Checkout string `json:"checkout"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	ct, err := a.db.Exec(r.Context(),
		`UPDATE pms_guests SET room=$1, full_name=$2, surname=$3, checkin=$4::date, checkout=$5::date
		 WHERE id=$6 AND customer_id=$7 AND ($8=0 OR site_id=$8)`,
		in.Room, in.FullName, in.Surname, nullDate(in.Checkin), nullDate(in.Checkout), id, cid, loc)
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

func (a *app) handlePmsGuestCreate(w http.ResponseWriter, r *http.Request) {
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
	if loc == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Misafir eklemek için önce bir lokasyon seçin"})
		return
	}
	var in struct {
		Room     string `json:"room"`
		FullName string `json:"full_name"`
		Surname  string `json:"surname"`
		Checkin  string `json:"checkin"`
		Checkout string `json:"checkout"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	if _, err := a.db.Exec(r.Context(),
		`INSERT INTO pms_guests (customer_id,site_id,room,full_name,surname,checkin,checkout,source)
		 VALUES ($1,$2,$3,$4,$5,$6::date,$7::date,'manual')`,
		cid, loc, in.Room, in.FullName, in.Surname, nullDate(in.Checkin), nullDate(in.Checkout)); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true})
}

// CSV içe aktarma: satır başına "oda,ad soyad,soyad,checkin,checkout" (soyad ve tarihler ops.)
func (a *app) handlePmsGuestsBulk(w http.ResponseWriter, r *http.Request) {
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
	if loc == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "İçe aktarmak için önce bir lokasyon seçin"})
		return
	}
	var in struct {
		CSV string `json:"csv"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	n := 0
	for _, line := range strings.Split(in.CSV, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		f := strings.Split(line, ",")
		get := func(i int) string {
			if i < len(f) {
				return strings.TrimSpace(f[i])
			}
			return ""
		}
		if _, err := a.db.Exec(r.Context(),
			`INSERT INTO pms_guests (customer_id,site_id,room,full_name,surname,checkin,checkout,source)
			 VALUES ($1,$2,$3,$4,$5,$6::date,$7::date,'manual')`,
			cid, loc, get(0), get(1), get(2), nullDate(get(3)), nullDate(get(4))); err == nil {
			n++
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"imported": n})
}

func (a *app) handlePmsGuestDelete(w http.ResponseWriter, r *http.Request) {
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
	loc := a.locationID(u)
	_, _ = a.db.Exec(r.Context(), `DELETE FROM pms_guests WHERE id=$1 AND customer_id=$2 AND ($3=0 OR site_id=$3)`, id, cid, loc)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// Adaptör yuvası — gerçek konnektör API bilgisiyle eklenecek.
func (a *app) handlePmsSync(w http.ResponseWriter, r *http.Request) {
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
	if loc == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Senkron için önce bir lokasyon seçin"})
		return
	}
	_ = cid
	var provider string
	_ = a.db.QueryRow(r.Context(), `SELECT COALESCE(provider,'manual') FROM pms_config WHERE site_id=$1`, loc).Scan(&provider)
	switch provider {
	case "sedna", "elektra":
		// TODO: gerçek konnektör — API erişim bilgileri (endpoint/api_key/hotel_code) gelince.
		writeJSON(w, http.StatusNotImplemented, map[string]string{
			"error": provider + " konnektörü henüz aktif değil — API erişim bilgileri gerekli",
		})
		return
	default:
		_, _ = a.db.Exec(r.Context(), `UPDATE pms_config SET last_sync=now() WHERE site_id=$1`, loc)
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "note": "manuel mod — senkron edilecek dış kaynak yok"})
	}
}
