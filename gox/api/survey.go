package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

type SurveyQuestion struct {
	ID       int64    `json:"id"`
	Position int      `json:"position"`
	QType    string   `json:"qtype"`
	Text     string   `json:"text"`
	Options  []string `json:"options"`
}

type Survey struct {
	ID            int64            `json:"id"`
	Title         string           `json:"title"`
	Status        string           `json:"status"`
	Frequency     string           `json:"frequency"`
	QuestionCount int              `json:"question_count"`
	ResponseCount int              `json:"response_count"`
	Questions     []SurveyQuestion `json:"questions,omitempty"`
}

var validQTypes = map[string]bool{"rating": true, "choice": true, "text": true}

func (a *app) handleSurveysList(w http.ResponseWriter, r *http.Request) {
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
		`SELECT s.id, s.title, s.status, s.frequency,
		   (SELECT count(*) FROM survey_questions q WHERE q.survey_id=s.id),
		   (SELECT count(*) FROM survey_responses rr WHERE rr.survey_id=s.id)
		 FROM surveys s WHERE s.customer_id=$1 AND ($2=0 OR s.site_id=$2) ORDER BY s.id DESC`, cid, loc)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "sorgu hatası"})
		return
	}
	defer rows.Close()
	list := []Survey{}
	for rows.Next() {
		var s Survey
		if err := rows.Scan(&s.ID, &s.Title, &s.Status, &s.Frequency, &s.QuestionCount, &s.ResponseCount); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "okuma hatası"})
			return
		}
		list = append(list, s)
	}
	writeJSON(w, http.StatusOK, map[string]any{"surveys": list})
}

func (a *app) handleSurveyCreate(w http.ResponseWriter, r *http.Request) {
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
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Anket oluşturmak için önce bir lokasyon seçin"})
		return
	}
	var in struct {
		Title     string           `json:"title"`
		Frequency string           `json:"frequency"`
		Questions []SurveyQuestion `json:"questions"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	in.Title = strings.TrimSpace(in.Title)
	if in.Title == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Anket başlığı gerekli"})
		return
	}
	if in.Frequency != "periodic" {
		in.Frequency = "once"
	}
	if len(in.Questions) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "En az bir soru ekleyin"})
		return
	}

	tx, err := a.db.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tx hatası"})
		return
	}
	defer tx.Rollback(r.Context())

	var sid int64
	if err := tx.QueryRow(r.Context(),
		`INSERT INTO surveys (customer_id,site_id,title,frequency,status) VALUES ($1,$2,$3,$4,'draft') RETURNING id`,
		cid, loc, in.Title, in.Frequency).Scan(&sid); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
		return
	}
	for i, q := range in.Questions {
		if !validQTypes[q.QType] {
			q.QType = "text"
		}
		q.Text = strings.TrimSpace(q.Text)
		if q.Text == "" {
			continue
		}
		optJSON, _ := json.Marshal(q.Options)
		if _, err := tx.Exec(r.Context(),
			`INSERT INTO survey_questions (survey_id,position,qtype,text,options) VALUES ($1,$2,$3,$4,$5::jsonb)`,
			sid, i, q.QType, q.Text, string(optJSON)); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "soru kayıt hatası"})
			return
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "commit hatası"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": sid})
}

func (a *app) loadQuestions(r *http.Request, surveyID int64) []SurveyQuestion {
	rows, err := a.db.Query(r.Context(),
		`SELECT id, position, qtype, text, COALESCE(options::text,'[]') FROM survey_questions WHERE survey_id=$1 ORDER BY position`, surveyID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	qs := []SurveyQuestion{}
	for rows.Next() {
		var q SurveyQuestion
		var optStr string
		if err := rows.Scan(&q.ID, &q.Position, &q.QType, &q.Text, &optStr); err != nil {
			continue
		}
		_ = json.Unmarshal([]byte(optStr), &q.Options)
		qs = append(qs, q)
	}
	return qs
}

func (a *app) handleSurveyGet(w http.ResponseWriter, r *http.Request) {
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
	var s Survey
	if err := a.db.QueryRow(r.Context(),
		`SELECT id,title,status,frequency,
		   (SELECT count(*) FROM survey_responses rr WHERE rr.survey_id=surveys.id)
		 FROM surveys WHERE id=$1 AND customer_id=$2`, id, cid).
		Scan(&s.ID, &s.Title, &s.Status, &s.Frequency, &s.ResponseCount); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	s.Questions = a.loadQuestions(r, id)
	s.QuestionCount = len(s.Questions)
	writeJSON(w, http.StatusOK, map[string]any{"survey": s})
}

func (a *app) handleSurveyUpdate(w http.ResponseWriter, r *http.Request) {
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
		Title  string `json:"title"`
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	if in.Status != "active" && in.Status != "draft" {
		in.Status = "draft"
	}
	ct, err := a.db.Exec(r.Context(),
		`UPDATE surveys SET status=$1, title=COALESCE(NULLIF($2,''),title) WHERE id=$3 AND customer_id=$4`,
		in.Status, strings.TrimSpace(in.Title), id, cid)
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

func (a *app) handleSurveyDelete(w http.ResponseWriter, r *http.Request) {
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
	ct, err := a.db.Exec(r.Context(), `DELETE FROM surveys WHERE id=$1 AND customer_id=$2`, id, cid)
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

// PUBLIC: site'a ait aktif anketi döner (captive portal / advertisement gösterir).
func (a *app) handleSurveyActivePublic(w http.ResponseWriter, r *http.Request) {
	site, _ := strconv.ParseInt(r.URL.Query().Get("site"), 10, 64)
	mac := strings.TrimSpace(r.URL.Query().Get("mac"))
	var s Survey
	if err := a.db.QueryRow(r.Context(),
		`SELECT id,title,status,frequency FROM surveys WHERE site_id=$1 AND status='active' ORDER BY id DESC LIMIT 1`, site).
		Scan(&s.ID, &s.Title, &s.Status, &s.Frequency); err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"survey": nil})
		return
	}
	// Bu MAC bu anketi daha önce yanıtladıysa tekrar gösterme (tekrar tekrar zorlamasın)
	if mac != "" {
		var answered bool
		_ = a.db.QueryRow(r.Context(),
			`SELECT EXISTS(SELECT 1 FROM survey_responses WHERE survey_id=$1 AND lower(mac::text)=lower($2))`, s.ID, mac).Scan(&answered)
		if answered {
			writeJSON(w, http.StatusOK, map[string]any{"survey": nil})
			return
		}
	}
	s.Questions = a.loadQuestions(r, s.ID)
	writeJSON(w, http.StatusOK, map[string]any{"survey": s})
}

// PUBLIC: anket yanıtı kaydeder.
func (a *app) handleSurveyRespondPublic(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	var in struct {
		Mac     string `json:"mac"`
		Answers []struct {
			QuestionID int64  `json:"question_id"`
			Value      string `json:"value"`
		} `json:"answers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek"})
		return
	}
	var active bool
	if err := a.db.QueryRow(r.Context(), `SELECT status='active' FROM surveys WHERE id=$1`, id).Scan(&active); err != nil || !active {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "anket aktif değil"})
		return
	}
	tx, err := a.db.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tx hatası"})
		return
	}
	defer tx.Rollback(r.Context())

	var rid int64
	var mac any = nil
	if strings.TrimSpace(in.Mac) != "" {
		mac = strings.TrimSpace(in.Mac)
	}
	if err := tx.QueryRow(r.Context(),
		`INSERT INTO survey_responses (survey_id, mac) VALUES ($1, $2::macaddr) RETURNING id`, id, mac).Scan(&rid); err != nil {
		// MAC parse hatası olursa mac'siz dene
		if err2 := tx.QueryRow(r.Context(),
			`INSERT INTO survey_responses (survey_id) VALUES ($1) RETURNING id`, id).Scan(&rid); err2 != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "kayıt hatası"})
			return
		}
	}
	for _, ans := range in.Answers {
		if _, err := tx.Exec(r.Context(),
			`INSERT INTO survey_answers (response_id, question_id, value) VALUES ($1,$2,$3)`,
			rid, ans.QuestionID, ans.Value); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "yanıt kayıt hatası"})
			return
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "commit hatası"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type QResult struct {
	QuestionID int64          `json:"question_id"`
	Text       string         `json:"text"`
	QType      string         `json:"qtype"`
	Options    []string       `json:"options"`
	Counts     map[string]int `json:"counts"`
	Avg        float64        `json:"avg"`
	Texts      []string       `json:"texts"`
}

// Anket sonuç analitiği (soru bazlı kırılım).
func (a *app) handleSurveyResults(w http.ResponseWriter, r *http.Request) {
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
	var title string
	if err := a.db.QueryRow(r.Context(), `SELECT title FROM surveys WHERE id=$1 AND customer_id=$2`, id, cid).Scan(&title); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "bulunamadı"})
		return
	}
	var respCount int
	_ = a.db.QueryRow(r.Context(), `SELECT count(*) FROM survey_responses WHERE survey_id=$1`, id).Scan(&respCount)

	results := []QResult{}
	for _, q := range a.loadQuestions(r, id) {
		qr := QResult{QuestionID: q.ID, Text: q.Text, QType: q.QType, Options: q.Options, Counts: map[string]int{}, Texts: []string{}}
		rows, _ := a.db.Query(r.Context(), `SELECT value, count(*) FROM survey_answers WHERE question_id=$1 GROUP BY value`, q.ID)
		if rows != nil {
			for rows.Next() {
				var v string
				var c int
				_ = rows.Scan(&v, &c)
				qr.Counts[v] = c
			}
			rows.Close()
		}
		if q.QType == "rating" {
			_ = a.db.QueryRow(r.Context(),
				`SELECT COALESCE(avg(value::int),0)::float8 FROM survey_answers WHERE question_id=$1 AND value ~ '^[0-9]+$'`, q.ID).Scan(&qr.Avg)
		}
		if q.QType == "text" {
			trows, _ := a.db.Query(r.Context(), `SELECT value FROM survey_answers WHERE question_id=$1 AND value<>'' ORDER BY id DESC LIMIT 100`, q.ID)
			if trows != nil {
				for trows.Next() {
					var v string
					_ = trows.Scan(&v)
					qr.Texts = append(qr.Texts, v)
				}
				trows.Close()
			}
		}
		results = append(results, qr)
	}
	writeJSON(w, http.StatusOK, map[string]any{"title": title, "response_count": respCount, "results": results})
}
