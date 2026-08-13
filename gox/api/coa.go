package main

import (
	"context"
	"encoding/json"
)

// CoA/Disconnect kuyruğa ekleme. gox_wg kuyruğu okuyup cihaza Disconnect gönderir.
// Cihaz ilgili MAC oturumunu düşürür → anında yeniden auth → yeni profil/limit canlı uygulanır.

func (a *app) enqueueCoaForMac(ctx context.Context, siteID int64, mac string) {
	ips := []string{}
	rows, err := a.db.Query(ctx, `SELECT host(wg_ip) FROM devices WHERE site_id=$1 AND wg_ip IS NOT NULL`, siteID)
	if err != nil {
		return
	}
	for rows.Next() {
		var ip string
		if rows.Scan(&ip) == nil {
			ips = append(ips, ip)
		}
	}
	rows.Close()
	for _, ip := range ips {
		_, _ = a.db.Exec(ctx, `INSERT INTO coa_queue (device_ip, mac) VALUES ($1,$2)`, ip, mac)
	}
}

// enqueueKickAllForCustomer: müşterinin TÜM cihazlarına kick_all komutu kuyruğa atar.
// Tenant askıya alındığında bağlı misafirleri anında düşürmek için (ajan /ip/hotspot/active siler).
func (a *app) enqueueKickAllForCustomer(ctx context.Context, customerID int64) {
	ids := []int64{}
	rows, err := a.db.Query(ctx,
		`SELECT d.id FROM devices d JOIN sites s ON s.id=d.site_id WHERE s.customer_id=$1`, customerID)
	if err != nil {
		return
	}
	for rows.Next() {
		var id int64
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	rows.Close()
	for _, id := range ids {
		_, _ = a.db.Exec(ctx,
			`INSERT INTO device_commands (device_id, action, params) VALUES ($1,'kick_all','{}')`, id)
	}
}

// enqueueDisconnectMac: bir MAC'i sitenin tüm cihazlarında GERÇEKTEN düşür
// (hotspot oturumu + host + conntrack). mac_entries silindiğinde/blacklist olduğunda
// radcheck reddeder; bu komut da mevcut oturumu/akışı keser → kalıcı düşürme.
func (a *app) enqueueDisconnectMac(ctx context.Context, siteID int64, mac string) {
	ids := []int64{}
	rows, err := a.db.Query(ctx, `SELECT id FROM devices WHERE site_id=$1`, siteID)
	if err != nil {
		return
	}
	for rows.Next() {
		var id int64
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	rows.Close()
	pj, _ := json.Marshal(map[string]any{"mac": mac})
	for _, id := range ids {
		_, _ = a.db.Exec(ctx,
			`INSERT INTO device_commands (device_id, action, params) VALUES ($1,'disconnect_mac',$2)`, id, string(pj))
	}
}

func (a *app) enqueueCoaForProfile(ctx context.Context, customerID, profileID int64) {
	type pair struct{ ip, mac string }
	list := []pair{}
	rows, err := a.db.Query(ctx,
		`SELECT host(d.wg_ip), m.mac::text
		 FROM mac_entries m JOIN sites s ON s.id=m.site_id JOIN devices d ON d.site_id=s.id
		 WHERE m.profile_id=$1 AND s.customer_id=$2 AND d.wg_ip IS NOT NULL`, profileID, customerID)
	if err != nil {
		return
	}
	for rows.Next() {
		var p pair
		if rows.Scan(&p.ip, &p.mac) == nil {
			list = append(list, p)
		}
	}
	rows.Close()
	for _, p := range list {
		_, _ = a.db.Exec(ctx, `INSERT INTO coa_queue (device_ip, mac) VALUES ($1,$2)`, p.ip, p.mac)
	}
}
