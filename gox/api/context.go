package main

import "net/http"

// GET /context — oturum kullanıcısı + aktif müşteri (sektör dahil; sektöre göre menü için).
func (a *app) handleContext(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"user": u, "customer": nil})
		return
	}
	var name, sector, plan string
	_ = a.db.QueryRow(r.Context(), `SELECT name, COALESCE(sector,'cafe'), COALESCE(plan,'') FROM customers WHERE id=$1`, cid).
		Scan(&name, &sector, &plan)
	// Aktif lokasyon (token sid) + kullanıcı lokasyon yöneticisi mi (DB sabit site)
	loc := a.locationID(u)
	locName := ""
	if loc > 0 {
		_ = a.db.QueryRow(r.Context(), `SELECT name FROM sites WHERE id=$1`, loc).Scan(&locName)
	}
	var fixed *int64
	_ = a.db.QueryRow(r.Context(), `SELECT site_id FROM users WHERE id=$1`, u.ID).Scan(&fixed)
	writeJSON(w, http.StatusOK, map[string]any{
		"user":                u,
		"customer":            map[string]any{"id": cid, "name": name, "sector": sector, "plan": plan},
		"active_site_id":      loc,
		"active_site_name":    locName,
		"is_location_manager": fixed != nil,
	})
}
