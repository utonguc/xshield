package main

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"strconv"
)

type Plan struct {
	ID            int64    `json:"id"`
	Name          string   `json:"name"`
	Sector        string   `json:"sector"`
	BillingModel  string   `json:"billing_model"`
	BaseFee       float64  `json:"base_fee"`
	IncludedUnits int      `json:"included_units"`
	PerUnitFee    float64  `json:"per_unit_fee"`
	MaxDevices    int      `json:"max_devices"`
	MaxLocations  int      `json:"max_locations"`
	Features      []string `json:"features"`
	Active        bool     `json:"active"`
	Sort          int      `json:"sort"`
}

// computeMonthlyFee: plana ve birim (oda/cihaz) sayısına göre aylık ücreti hesaplar.
func computeMonthlyFee(p *Plan, units int) float64 {
	switch p.BillingModel {
	case "per_room", "per_device":
		over := units - p.IncludedUnits
		if over < 0 {
			over = 0
		}
		return math.Round((p.BaseFee+p.PerUnitFee*float64(over))*100) / 100
	default: // flat
		return p.BaseFee
	}
}

// planByID + müşteri birim sayısı (per_device için cihaz adedi) yardımcı.
func (a *app) planByID(ctx context.Context, id int64) (*Plan, error) {
	var p Plan
	err := a.db.QueryRow(ctx,
		`SELECT id,name,sector,billing_model,base_fee::float8,included_units,per_unit_fee::float8,max_devices,max_locations,features,active,sort
		 FROM plans WHERE id=$1`, id).
		Scan(&p.ID, &p.Name, &p.Sector, &p.BillingModel, &p.BaseFee, &p.IncludedUnits, &p.PerUnitFee, &p.MaxDevices, &p.MaxLocations, &p.Features, &p.Active, &p.Sort)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// planForCustomer: müşterinin atanmış planı (yoksa nil) + güncel kullanım (lokasyon/cihaz adedi).
func (a *app) planForCustomer(ctx context.Context, cid int64) (p *Plan, sites, devices int, err error) {
	var planID *int64
	if err = a.db.QueryRow(ctx, `SELECT plan_id FROM customers WHERE id=$1`, cid).Scan(&planID); err != nil {
		return nil, 0, 0, err
	}
	_ = a.db.QueryRow(ctx, `SELECT
		(SELECT count(*) FROM sites WHERE customer_id=$1),
		(SELECT count(*) FROM devices d JOIN sites s ON s.id=d.site_id WHERE s.customer_id=$1)`, cid).Scan(&sites, &devices)
	if planID != nil {
		p, _ = a.planByID(ctx, *planID)
	}
	return p, sites, devices, nil
}

// enforceLimit: plan limiti aşılıyorsa (limit>0 ve mevcut>=limit) hata mesajı döndürür, aksi halde "".
func limitErr(kind string, current, max int) string {
	if max > 0 && current >= max {
		if kind == "site" {
			return "Plan lokasyon limitine ulaştınız (" + itoa(max) + "). Daha fazlası için planınızı yükseltin."
		}
		return "Plan cihaz limitine ulaştınız (" + itoa(max) + "). Daha fazlası için planınızı yükseltin."
	}
	return ""
}

func itoa(n int) string { return strconv.Itoa(n) }

func (a *app) handleAdminPlansList(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	rows, err := a.db.Query(r.Context(),
		`SELECT id,name,sector,billing_model,base_fee::float8,included_units,per_unit_fee::float8,max_devices,max_locations,features,active,sort
		 FROM plans ORDER BY sort, id`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []Plan{}
	for rows.Next() {
		var p Plan
		if err := rows.Scan(&p.ID, &p.Name, &p.Sector, &p.BillingModel, &p.BaseFee, &p.IncludedUnits, &p.PerUnitFee, &p.MaxDevices, &p.MaxLocations, &p.Features, &p.Active, &p.Sort); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "okuma hatası"})
			return
		}
		list = append(list, p)
	}
	writeJSON(w, http.StatusOK, map[string]any{"plans": list})
}

type planInput struct {
	Name          string   `json:"name"`
	Sector        string   `json:"sector"`
	BillingModel  string   `json:"billing_model"`
	BaseFee       float64  `json:"base_fee"`
	IncludedUnits int      `json:"included_units"`
	PerUnitFee    float64  `json:"per_unit_fee"`
	MaxDevices    int      `json:"max_devices"`
	MaxLocations  int      `json:"max_locations"`
	Features      []string `json:"features"`
	Active        bool     `json:"active"`
	Sort          int      `json:"sort"`
}

func normalizePlan(in *planInput) {
	if in.Sector == "" {
		in.Sector = "all"
	}
	switch in.BillingModel {
	case "flat", "per_room", "per_device":
	default:
		in.BillingModel = "flat"
	}
	if in.Features == nil {
		in.Features = []string{}
	}
}

func (a *app) handleAdminPlanCreate(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	var in planInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "plan adı gerekli"})
		return
	}
	normalizePlan(&in)
	var id int64
	if err := a.db.QueryRow(r.Context(),
		`INSERT INTO plans (name,sector,billing_model,base_fee,included_units,per_unit_fee,max_devices,max_locations,features,active,sort)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
		in.Name, in.Sector, in.BillingModel, in.BaseFee, in.IncludedUnits, in.PerUnitFee, in.MaxDevices, in.MaxLocations, in.Features, in.Active, in.Sort).Scan(&id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}

func (a *app) handleAdminPlanUpdate(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	var in planInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "plan adı gerekli"})
		return
	}
	normalizePlan(&in)
	ct, err := a.db.Exec(r.Context(),
		`UPDATE plans SET name=$1,sector=$2,billing_model=$3,base_fee=$4,included_units=$5,per_unit_fee=$6,
		   max_devices=$7,max_locations=$8,features=$9,active=$10,sort=$11 WHERE id=$12`,
		in.Name, in.Sector, in.BillingModel, in.BaseFee, in.IncludedUnits, in.PerUnitFee, in.MaxDevices, in.MaxLocations, in.Features, in.Active, in.Sort, id)
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

func (a *app) handleAdminPlanDelete(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	ct, err := a.db.Exec(r.Context(), `DELETE FROM plans WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "silme hatası (plan bir tenanta atanmış olabilir)"})
		return
	}
	if ct.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// handlePublicPlans: landing sayfası için aktif planlar (auth gerektirmez).
func (a *app) handlePublicPlans(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.Query(r.Context(),
		`SELECT id,name,sector,billing_model,base_fee::float8,included_units,per_unit_fee::float8,max_devices,max_locations,features,active,sort
		 FROM plans WHERE active ORDER BY sort, id`)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"plans": []Plan{}})
		return
	}
	defer rows.Close()
	list := []Plan{}
	for rows.Next() {
		var p Plan
		if err := rows.Scan(&p.ID, &p.Name, &p.Sector, &p.BillingModel, &p.BaseFee, &p.IncludedUnits, &p.PerUnitFee, &p.MaxDevices, &p.MaxLocations, &p.Features, &p.Active, &p.Sort); err == nil {
			list = append(list, p)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"plans": list})
}

// handleAdminPlanPreview: bir plan + birim sayısı için hesaplanan aylık ücreti döndürür (UI canlı önizleme).
func (a *app) handleAdminPlanPreview(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.requireOwner(w, r); !ok {
		return
	}
	pid, _ := strconv.ParseInt(r.URL.Query().Get("plan_id"), 10, 64)
	units, _ := strconv.Atoi(r.URL.Query().Get("units"))
	p, err := a.planByID(r.Context(), pid)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "plan yok"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"monthly_fee": computeMonthlyFee(p, units)})
}
