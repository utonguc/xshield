package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

type Reservation struct {
	ID       int64  `json:"id"`
	Mac      string `json:"mac"`
	IP       string `json:"ip"`
	Hostname string `json:"hostname"`
	Note     string `json:"note"`
}

// reservationLeases: cihazın DHCP rezervasyonlarını RouterOS lease betiğine çevirir
// (önce eski goX rezervasyonlarını kaldır, sonra ekle). gox-dhcp sunucusu var olmalı.
func (a *app) reservationLeases(ctx context.Context, deviceID int64) string {
	var b strings.Builder
	b.WriteString("/ip dhcp-server lease remove [find comment~\"goX-res\"]\n")
	rows, err := a.db.Query(ctx,
		`SELECT mac::text, host(ip), COALESCE(hostname,'') FROM dhcp_reservations WHERE device_id=$1 ORDER BY ip`, deviceID)
	if err != nil {
		return b.String()
	}
	defer rows.Close()
	for rows.Next() {
		var mac, ip, host string
		if rows.Scan(&mac, &ip, &host) != nil {
			continue
		}
		b.WriteString(fmt.Sprintf("/ip dhcp-server lease add address=%s mac-address=%s server=gox-dhcp comment=\"goX-res %s\"\n",
			ip, strings.ToUpper(mac), host))
	}
	return b.String()
}

func (a *app) deviceOwned(ctx context.Context, id, cid int64) bool {
	var ok bool
	a.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM devices d JOIN sites s ON s.id=d.site_id WHERE d.id=$1 AND s.customer_id=$2)`, id, cid).Scan(&ok)
	return ok
}

func (a *app) handleReservationsList(w http.ResponseWriter, r *http.Request) {
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
	if !a.deviceOwned(r.Context(), id, cid) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	rows, _ := a.db.Query(r.Context(),
		`SELECT id, mac::text, host(ip), COALESCE(hostname,''), COALESCE(note,'') FROM dhcp_reservations WHERE device_id=$1 ORDER BY ip`, id)
	list := []Reservation{}
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var rv Reservation
			if rows.Scan(&rv.ID, &rv.Mac, &rv.IP, &rv.Hostname, &rv.Note) == nil {
				list = append(list, rv)
			}
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"reservations": list})
}

// POST /devices/{id}/reservations — tek veya toplu (items dizisi) rezervasyon ekler.
func (a *app) handleReservationsCreate(w http.ResponseWriter, r *http.Request) {
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
	if !a.deviceOwned(r.Context(), id, cid) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	var in struct {
		Items []Reservation `json:"items"`
		Reservation
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	items := in.Items
	if len(items) == 0 && strings.TrimSpace(in.Mac) != "" {
		items = []Reservation{in.Reservation}
	}
	added, fail := 0, 0
	for _, it := range items {
		mac := strings.TrimSpace(it.Mac)
		ip := strings.TrimSpace(it.IP)
		if mac == "" || ip == "" {
			fail++
			continue
		}
		_, err := a.db.Exec(r.Context(),
			`INSERT INTO dhcp_reservations (device_id, mac, ip, hostname, note) VALUES ($1,$2::macaddr,$3::inet,$4,$5)
			 ON CONFLICT (device_id, mac) DO UPDATE SET ip=EXCLUDED.ip, hostname=EXCLUDED.hostname, note=EXCLUDED.note`,
			id, mac, ip, nullIfEmpty(it.Hostname), nullIfEmpty(it.Note))
		if err != nil {
			fail++
		} else {
			added++
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"added": added, "failed": fail})
}

func (a *app) handleReservationDelete(w http.ResponseWriter, r *http.Request) {
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
	rid, _ := strconv.ParseInt(r.PathValue("rid"), 10, 64)
	if !a.deviceOwned(r.Context(), id, cid) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	a.db.Exec(r.Context(), `DELETE FROM dhcp_reservations WHERE id=$1 AND device_id=$2`, rid, id)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
