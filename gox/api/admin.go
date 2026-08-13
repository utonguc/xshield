package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

func (a *app) requireOwner(w http.ResponseWriter, r *http.Request) (*User, bool) {
	u, err := a.userFromRequest(r)
	if err != nil || u.Role != "owner" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "yalnız platform yöneticisi"})
		return nil, false
	}
	return u, true
}

// ── Global istatistik ──
func (a *app) handleAdminStats(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	var s struct {
		Tenants   int     `json:"tenants"`
		Active    int     `json:"active"`
		Devices   int     `json:"devices"`
		Guests    int     `json:"guests"`
		Responses int     `json:"responses"`
		MRR       float64 `json:"mrr"`
	}
	_ = a.db.QueryRow(r.Context(), `SELECT
		(SELECT count(*) FROM customers),
		(SELECT count(*) FROM customers WHERE status='active'),
		(SELECT count(*) FROM devices),
		(SELECT count(*) FROM mac_entries),
		(SELECT count(*) FROM survey_responses),
		COALESCE((SELECT sum(monthly_fee) FROM customers WHERE status='active'),0)::float8`).
		Scan(&s.Tenants, &s.Active, &s.Devices, &s.Guests, &s.Responses, &s.MRR)
	writeJSON(w, http.StatusOK, map[string]any{"stats": s})
}

type Tenant struct {
	ID         int64   `json:"id"`
	Name       string  `json:"name"`
	Status     string  `json:"status"`
	Plan       string  `json:"plan"`
	PlanID     *int64  `json:"plan_id"`
	PlanName   string  `json:"plan_name"`
	RoomCount  int     `json:"room_count"`
	Sector     string  `json:"sector"`
	MonthlyFee float64 `json:"monthly_fee"`
	Sites      int     `json:"sites"`
	Devices    int     `json:"devices"`
	Guests     int     `json:"guests"`
}

func (a *app) handleAdminTenantsList(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	rows, err := a.db.Query(r.Context(), `SELECT c.id,c.name,c.status,COALESCE(c.plan,''),c.plan_id,COALESCE(p.name,''),COALESCE(c.room_count,0),COALESCE(c.sector,''),COALESCE(c.monthly_fee,0)::float8,
		(SELECT count(*) FROM sites s WHERE s.customer_id=c.id),
		(SELECT count(*) FROM devices d JOIN sites s ON s.id=d.site_id WHERE s.customer_id=c.id),
		(SELECT count(*) FROM mac_entries m JOIN sites s ON s.id=m.site_id WHERE s.customer_id=c.id)
		FROM customers c LEFT JOIN plans p ON p.id=c.plan_id ORDER BY c.id`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []Tenant{}
	for rows.Next() {
		var t Tenant
		if err := rows.Scan(&t.ID, &t.Name, &t.Status, &t.Plan, &t.PlanID, &t.PlanName, &t.RoomCount, &t.Sector, &t.MonthlyFee, &t.Sites, &t.Devices, &t.Guests); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "okuma hatası"})
			return
		}
		list = append(list, t)
	}
	writeJSON(w, http.StatusOK, map[string]any{"tenants": list})
}

func (a *app) handleAdminTenantCreate(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	var in struct {
		Name       string  `json:"name"`
		Sector     string  `json:"sector"`
		Plan       string  `json:"plan"`
		PlanID     int64   `json:"plan_id"`
		RoomCount  int     `json:"room_count"`
		MonthlyFee float64 `json:"monthly_fee"`
		AdminEmail string  `json:"admin_email"`
		AdminPass  string  `json:"admin_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	in.AdminEmail = strings.ToLower(strings.TrimSpace(in.AdminEmail))
	if in.Name == "" || in.AdminEmail == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "İşletme adı ve yönetici e-postası gerekli"})
		return
	}
	if in.Sector == "" {
		in.Sector = "cafe"
	}
	// Plan seçildiyse ücreti plandan hesapla; plan adını da plan metnine yaz.
	var planID *int64
	if in.PlanID > 0 {
		if p, err := a.planByID(r.Context(), in.PlanID); err == nil {
			planID = &in.PlanID
			in.Plan = p.Name
			if in.Sector == "" {
				in.Sector = p.Sector
			}
			in.MonthlyFee = computeMonthlyFee(p, in.RoomCount) // yeni tenantta cihaz=0 → per_device tabandan başlar
		}
	}
	if in.Plan == "" {
		in.Plan = "standart"
	}
	if in.AdminPass == "" {
		in.AdminPass = randPassword(12)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.AdminPass), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "şifre hatası"})
		return
	}
	tx, err := a.db.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tx hatası"})
		return
	}
	defer tx.Rollback(r.Context())

	var cid int64
	if err := tx.QueryRow(r.Context(),
		`INSERT INTO customers (name,sector,plan,plan_id,room_count,monthly_fee,status) VALUES ($1,$2,$3,$4,$5,$6,'active') RETURNING id`,
		in.Name, in.Sector, in.Plan, planID, in.RoomCount, in.MonthlyFee).Scan(&cid); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri oluşturulamadı"})
		return
	}
	if _, err := tx.Exec(r.Context(),
		`INSERT INTO users (customer_id,email,password_hash,role) VALUES ($1,$2,$3,'customer_admin')`,
		cid, in.AdminEmail, string(hash)); err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Bu e-posta zaten kayıtlı"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "yönetici oluşturulamadı"})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "commit hatası"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"id": cid, "admin_email": in.AdminEmail, "admin_password": in.AdminPass,
	})
}

func (a *app) handleAdminTenantUpdate(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	var in struct {
		Name       string  `json:"name"`
		Status     string  `json:"status"`
		Plan       string  `json:"plan"`
		PlanID     int64   `json:"plan_id"`
		RoomCount  int     `json:"room_count"`
		Sector     string  `json:"sector"`
		MonthlyFee float64 `json:"monthly_fee"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	if in.Status != "active" && in.Status != "suspended" {
		in.Status = "active"
	}
	// Önceki durum (suspend geçişini yakalamak için).
	var prevStatus string
	_ = a.db.QueryRow(r.Context(), `SELECT status FROM customers WHERE id=$1`, id).Scan(&prevStatus)
	// Plan seçiliyse ücreti plandan hesapla (per_device → mevcut cihaz adedi).
	var planID *int64
	if in.PlanID > 0 {
		if p, err := a.planByID(r.Context(), in.PlanID); err == nil {
			planID = &in.PlanID
			in.Plan = p.Name
			units := in.RoomCount
			if p.BillingModel == "per_device" {
				_ = a.db.QueryRow(r.Context(),
					`SELECT count(*) FROM devices d JOIN sites s ON s.id=d.site_id WHERE s.customer_id=$1`, id).Scan(&units)
			}
			in.MonthlyFee = computeMonthlyFee(p, units)
		}
	}
	ct, err := a.db.Exec(r.Context(),
		`UPDATE customers SET name=COALESCE(NULLIF($1,''),name), status=$2, plan=COALESCE(NULLIF($3,''),plan),
		   sector=COALESCE(NULLIF($4,''),sector), monthly_fee=$5, plan_id=COALESCE($6,plan_id), room_count=$7 WHERE id=$8`,
		strings.TrimSpace(in.Name), in.Status, in.Plan, in.Sector, in.MonthlyFee, planID, in.RoomCount, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "güncelleme hatası"})
		return
	}
	if ct.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	// active → suspended geçişinde bağlı misafirleri düşür (her cihaza kick_all).
	if in.Status == "suspended" && prevStatus != "suspended" {
		a.enqueueKickAllForCustomer(r.Context(), id)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleAdminTenantDelete(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	ct, err := a.db.Exec(r.Context(), `DELETE FROM customers WHERE id=$1`, id)
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

// ── Impersonation: owner bir tenant'a "girer" (destek için) ──
func (a *app) handleImpersonate(w http.ResponseWriter, r *http.Request) {
	owner, ok := a.requireOwner(w, r)
	if !ok {
		return
	}
	var in struct {
		CustomerID int64 `json:"customer_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&in)

	u := User{ID: owner.ID, Email: owner.Email, Role: "owner"}
	name := ""
	if in.CustomerID > 0 {
		if err := a.db.QueryRow(r.Context(), `SELECT name FROM customers WHERE id=$1`, in.CustomerID).Scan(&name); err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "tenant yok"})
			return
		}
		u.CustomerID = &in.CustomerID
	}
	token, err := a.issueToken(u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "token hatası"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "customer_name": name})
}

// ── Ödemeler ──
func (a *app) handleAdminPaymentsList(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	rows, err := a.db.Query(r.Context(),
		`SELECT id, amount::float8, currency, COALESCE(period,''), status, COALESCE(note,''), created_at::date::text
		 FROM payments WHERE customer_id=$1 ORDER BY id DESC`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	type P struct {
		ID       int64   `json:"id"`
		Amount   float64 `json:"amount"`
		Currency string  `json:"currency"`
		Period   string  `json:"period"`
		Status   string  `json:"status"`
		Note     string  `json:"note"`
		Date     string  `json:"date"`
	}
	list := []P{}
	for rows.Next() {
		var p P
		_ = rows.Scan(&p.ID, &p.Amount, &p.Currency, &p.Period, &p.Status, &p.Note, &p.Date)
		list = append(list, p)
	}
	writeJSON(w, http.StatusOK, map[string]any{"payments": list})
}

func (a *app) handleAdminPaymentCreate(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	var in struct {
		CustomerID int64   `json:"customer_id"`
		Amount     float64 `json:"amount"`
		Period     string  `json:"period"`
		Status     string  `json:"status"`
		Note       string  `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	if in.Status == "" {
		in.Status = "paid"
	}
	if _, err := a.db.Exec(r.Context(),
		`INSERT INTO payments (customer_id,amount,period,status,note) VALUES ($1,$2,$3,$4,$5)`,
		in.CustomerID, in.Amount, in.Period, in.Status, in.Note); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true})
}

func (a *app) handleAdminPaymentDelete(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	_, _ = a.db.Exec(r.Context(), `DELETE FROM payments WHERE id=$1`, id)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// ── Ticketlar ──
func (a *app) handleAdminTicketsList(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	rows, err := a.db.Query(r.Context(),
		`SELECT t.id, t.subject, t.status, t.priority, c.name, t.updated_at::date::text,
		   (SELECT count(*) FROM ticket_messages m WHERE m.ticket_id=t.id)
		 FROM tickets t JOIN customers c ON c.id=t.customer_id ORDER BY (t.status='open') DESC, t.updated_at DESC`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	type T struct {
		ID       int64  `json:"id"`
		Subject  string `json:"subject"`
		Status   string `json:"status"`
		Priority string `json:"priority"`
		Customer string `json:"customer"`
		Updated  string `json:"updated"`
		Messages int    `json:"messages"`
	}
	list := []T{}
	for rows.Next() {
		var t T
		_ = rows.Scan(&t.ID, &t.Subject, &t.Status, &t.Priority, &t.Customer, &t.Updated, &t.Messages)
		list = append(list, t)
	}
	writeJSON(w, http.StatusOK, map[string]any{"tickets": list})
}

func (a *app) handleAdminTicketGet(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	var t struct {
		ID       int64  `json:"id"`
		Subject  string `json:"subject"`
		Status   string `json:"status"`
		Priority string `json:"priority"`
		Customer string `json:"customer"`
	}
	if err := a.db.QueryRow(r.Context(),
		`SELECT t.id,t.subject,t.status,t.priority,c.name FROM tickets t JOIN customers c ON c.id=t.customer_id WHERE t.id=$1`, id).
		Scan(&t.ID, &t.Subject, &t.Status, &t.Priority, &t.Customer); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	rows, _ := a.db.Query(r.Context(),
		`SELECT author, body, to_char(created_at,'YYYY-MM-DD HH24:MI') FROM ticket_messages WHERE ticket_id=$1 ORDER BY id`, id)
	type M struct {
		Author string `json:"author"`
		Body   string `json:"body"`
		At     string `json:"at"`
	}
	msgs := []M{}
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var m M
			_ = rows.Scan(&m.Author, &m.Body, &m.At)
			msgs = append(msgs, m)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"ticket": t, "messages": msgs})
}

func (a *app) handleAdminTicketCreate(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	var in struct {
		CustomerID int64  `json:"customer_id"`
		Subject    string `json:"subject"`
		Priority   string `json:"priority"`
		Body       string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Subject = strings.TrimSpace(in.Subject)
	if in.Subject == "" || in.CustomerID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Tenant ve konu gerekli"})
		return
	}
	if in.Priority == "" {
		in.Priority = "normal"
	}
	tx, _ := a.db.Begin(r.Context())
	defer tx.Rollback(r.Context())
	var tid int64
	if err := tx.QueryRow(r.Context(),
		`INSERT INTO tickets (customer_id,subject,priority) VALUES ($1,$2,$3) RETURNING id`,
		in.CustomerID, in.Subject, in.Priority).Scan(&tid); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	if strings.TrimSpace(in.Body) != "" {
		_, _ = tx.Exec(r.Context(), `INSERT INTO ticket_messages (ticket_id,author,body) VALUES ($1,'owner',$2)`, tid, in.Body)
	}
	_ = tx.Commit(r.Context())
	writeJSON(w, http.StatusCreated, map[string]any{"id": tid})
}

func (a *app) handleAdminTicketReply(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	var in struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Body) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "mesaj gerekli"})
		return
	}
	if _, err := a.db.Exec(r.Context(), `INSERT INTO ticket_messages (ticket_id,author,body) VALUES ($1,'owner',$2)`, id, in.Body); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	_, _ = a.db.Exec(r.Context(), `UPDATE tickets SET updated_at=now() WHERE id=$1`, id)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleAdminTicketUpdate(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	var in struct {
		Status string `json:"status"`
	}
	_ = json.NewDecoder(r.Body).Decode(&in)
	if in.Status != "open" && in.Status != "closed" {
		in.Status = "open"
	}
	_, _ = a.db.Exec(r.Context(), `UPDATE tickets SET status=$1, updated_at=now() WHERE id=$2`, in.Status, id)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// Tek tenant detayı (owner).
func (a *app) handleAdminTenantGet(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	var t Tenant
	err := a.db.QueryRow(r.Context(), `SELECT c.id,c.name,c.status,COALESCE(c.plan,''),c.plan_id,COALESCE(p.name,''),COALESCE(c.room_count,0),COALESCE(c.sector,''),COALESCE(c.monthly_fee,0)::float8,
	  (SELECT count(*) FROM sites s WHERE s.customer_id=c.id),
	  (SELECT count(*) FROM devices d JOIN sites s ON s.id=d.site_id WHERE s.customer_id=c.id),
	  (SELECT count(*) FROM mac_entries m JOIN sites s ON s.id=m.site_id WHERE s.customer_id=c.id)
	  FROM customers c LEFT JOIN plans p ON p.id=c.plan_id WHERE c.id=$1`, id).
		Scan(&t.ID, &t.Name, &t.Status, &t.Plan, &t.PlanID, &t.PlanName, &t.RoomCount, &t.Sector, &t.MonthlyFee, &t.Sites, &t.Devices, &t.Guests)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"tenant": t})
}
