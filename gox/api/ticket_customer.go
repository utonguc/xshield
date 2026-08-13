package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

// Müşteri tarafı ticket (kendi customer_id'sine scope'lu). author='customer'.
// Owner /admin/tickets ile aynı kayıtları görür; thread çift yönlü.

func (a *app) handleCustTicketsList(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	rows, err := a.db.Query(r.Context(),
		`SELECT t.id, t.subject, t.status, t.priority, t.updated_at::date::text,
		   (SELECT count(*) FROM ticket_messages m WHERE m.ticket_id=t.id)
		 FROM tickets t WHERE t.customer_id=$1 ORDER BY (t.status='open') DESC, t.updated_at DESC`, cid)
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
		Updated  string `json:"updated"`
		Messages int    `json:"messages"`
	}
	list := []T{}
	for rows.Next() {
		var t T
		_ = rows.Scan(&t.ID, &t.Subject, &t.Status, &t.Priority, &t.Updated, &t.Messages)
		list = append(list, t)
	}
	writeJSON(w, http.StatusOK, map[string]any{"tickets": list})
}

func (a *app) handleCustTicketCreate(w http.ResponseWriter, r *http.Request) {
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
		Subject  string `json:"subject"`
		Priority string `json:"priority"`
		Body     string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Subject = strings.TrimSpace(in.Subject)
	if in.Subject == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Konu gerekli"})
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
		cid, in.Subject, in.Priority).Scan(&tid); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	if strings.TrimSpace(in.Body) != "" {
		_, _ = tx.Exec(r.Context(), `INSERT INTO ticket_messages (ticket_id,author,body) VALUES ($1,'customer',$2)`, tid, in.Body)
	}
	_ = tx.Commit(r.Context())
	writeJSON(w, http.StatusCreated, map[string]any{"id": tid})
}

func (a *app) custOwnsTicket(r *http.Request, ticketID, cid int64) bool {
	var ok bool
	_ = a.db.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM tickets WHERE id=$1 AND customer_id=$2)`, ticketID, cid).Scan(&ok)
	return ok
}

func (a *app) handleCustTicketGet(w http.ResponseWriter, r *http.Request) {
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
	if !a.custOwnsTicket(r, id, cid) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	var t struct {
		ID       int64  `json:"id"`
		Subject  string `json:"subject"`
		Status   string `json:"status"`
		Priority string `json:"priority"`
	}
	_ = a.db.QueryRow(r.Context(), `SELECT id,subject,status,priority FROM tickets WHERE id=$1`, id).
		Scan(&t.ID, &t.Subject, &t.Status, &t.Priority)
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

func (a *app) handleCustTicketReply(w http.ResponseWriter, r *http.Request) {
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
	if !a.custOwnsTicket(r, id, cid) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	var in struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Body) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "mesaj gerekli"})
		return
	}
	if _, err := a.db.Exec(r.Context(),
		`INSERT INTO ticket_messages (ticket_id,author,body) VALUES ($1,'customer',$2)`, id, in.Body); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	_, _ = a.db.Exec(r.Context(), `UPDATE tickets SET status='open', updated_at=now() WHERE id=$1`, id)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
