package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

type MenuItem struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Available   bool    `json:"available"`
}
type MenuCategory struct {
	ID    int64      `json:"id"`
	Name  string     `json:"name"`
	Items []MenuItem `json:"items"`
}

func (a *app) loadMenu(ctx context.Context, customerID, siteID int64, onlyAvailable bool) []MenuCategory {
	cats := []MenuCategory{}
	rows, err := a.db.Query(ctx,
		`SELECT id,name FROM menu_categories WHERE ($1=0 OR customer_id=$1) AND ($2=0 OR site_id=$2) ORDER BY position,id`,
		customerID, siteID)
	if err != nil {
		return cats
	}
	defer rows.Close()
	for rows.Next() {
		var c MenuCategory
		_ = rows.Scan(&c.ID, &c.Name)
		c.Items = []MenuItem{}
		cats = append(cats, c)
	}
	for i := range cats {
		q := `SELECT id,name,COALESCE(description,''),price::float8,available FROM menu_items WHERE category_id=$1`
		if onlyAvailable {
			q += ` AND available=true`
		}
		q += ` ORDER BY position,id`
		irows, err := a.db.Query(ctx, q, cats[i].ID)
		if err != nil {
			continue
		}
		for irows.Next() {
			var it MenuItem
			_ = irows.Scan(&it.ID, &it.Name, &it.Description, &it.Price, &it.Available)
			cats[i].Items = append(cats[i].Items, it)
		}
		irows.Close()
	}
	return cats
}

func (a *app) handleMenuList(w http.ResponseWriter, r *http.Request) {
	u, ok := a.requireAuth(w, r)
	if !ok {
		return
	}
	cid, err := a.customerID(r.Context(), u)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "müşteri yok"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"categories": a.loadMenu(r.Context(), cid, a.locationID(u), false)})
}

func (a *app) handleMenuCategoryCreate(w http.ResponseWriter, r *http.Request) {
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
		Name string `json:"name"`
	}
	_ = json.NewDecoder(r.Body).Decode(&in)
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Kategori adı gerekli"})
		return
	}
	loc := a.locationID(u)
	if loc == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Menü için önce bir lokasyon seçin"})
		return
	}
	var id int64
	_ = a.db.QueryRow(r.Context(), `INSERT INTO menu_categories (customer_id,site_id,name) VALUES ($1,$2,$3) RETURNING id`, cid, loc, in.Name).Scan(&id)
	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}

func (a *app) handleMenuCategoryDelete(w http.ResponseWriter, r *http.Request) {
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
	_, _ = a.db.Exec(r.Context(), `DELETE FROM menu_categories WHERE id=$1 AND customer_id=$2`, id, cid)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// item'ın kategorisi bu müşteriye mi ait
func (a *app) ownsCategory(r *http.Request, catID, cid int64) bool {
	var ok bool
	_ = a.db.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM menu_categories WHERE id=$1 AND customer_id=$2)`, catID, cid).Scan(&ok)
	return ok
}

func (a *app) handleMenuItemCreate(w http.ResponseWriter, r *http.Request) {
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
		CategoryID  int64   `json:"category_id"`
		Name        string  `json:"name"`
		Description string  `json:"description"`
		Price       float64 `json:"price"`
		Available   bool    `json:"available"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	if !a.ownsCategory(r, in.CategoryID, cid) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz kategori"})
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Ürün adı gerekli"})
		return
	}
	var id int64
	_ = a.db.QueryRow(r.Context(),
		`INSERT INTO menu_items (category_id,name,description,price,available) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		in.CategoryID, in.Name, in.Description, in.Price, in.Available).Scan(&id)
	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}

func (a *app) handleMenuItemUpdate(w http.ResponseWriter, r *http.Request) {
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
	var in struct {
		Name        string  `json:"name"`
		Description string  `json:"description"`
		Price       float64 `json:"price"`
		Available   bool    `json:"available"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	ct, _ := a.db.Exec(r.Context(),
		`UPDATE menu_items i SET name=$1,description=$2,price=$3,available=$4
		 FROM menu_categories c WHERE i.category_id=c.id AND i.id=$5 AND c.customer_id=$6`,
		strings.TrimSpace(in.Name), in.Description, in.Price, in.Available, id, cid)
	if ct.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleMenuItemDelete(w http.ResponseWriter, r *http.Request) {
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
	_, _ = a.db.Exec(r.Context(),
		`DELETE FROM menu_items i USING menu_categories c WHERE i.category_id=c.id AND i.id=$1 AND c.customer_id=$2`, id, cid)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// PUBLIC: misafir QR menüsü (site → customer).
func (a *app) handleMenuPublic(w http.ResponseWriter, r *http.Request) {
	site, _ := strconv.ParseInt(r.URL.Query().Get("site"), 10, 64)
	var cid int64
	var name string
	if err := a.db.QueryRow(r.Context(), `SELECT customer_id,name FROM sites WHERE id=$1`, site).Scan(&cid, &name); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	var brand string
	_ = a.db.QueryRow(r.Context(), `SELECT name FROM customers WHERE id=$1`, cid).Scan(&brand)
	// Lokasyona ait menü (site_id); o lokasyonda menü yoksa müşteri genelini göster (geriye dönük uyumlu)
	cats := a.loadMenu(r.Context(), 0, site, true)
	if len(cats) == 0 {
		cats = a.loadMenu(r.Context(), cid, 0, true)
	}
	writeJSON(w, http.StatusOK, map[string]any{"brand": brand, "categories": cats})
}
