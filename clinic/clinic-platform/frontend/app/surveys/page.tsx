"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────
type Survey = {
  id: string;
  title: string;
  description?: string;
  status: string;
  questionCount: number;
  responseCount: number;
  avgRating?: number;
  createdAtUtc: string;
};

type Question = {
  id?: string;
  sortOrder: number;
  text: string;
  type: string;
  options?: string;
  isRequired: boolean;
};

type SurveyDetail = Survey & { questions: Question[] };

type Answer = {
  questionText: string;
  questionType: string;
  value?: string;
};

type SurveyResponseItem = {
  id: string;
  patientName?: string;
  email?: string;
  ratingAvg?: number;
  submittedAtUtc: string;
  answers: Answer[];
};

type QuestionStat = {
  questionId: string;
  questionText: string;
  questionType: string;
  avgValue?: number;
  valueCounts: Record<string, number>;
};

type Stats = {
  totalResponses: number;
  avgRating?: number;
  positive: number;
  neutral: number;
  negative: number;
  questionStats: QuestionStat[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const QUESTION_TYPES = [
  { value: "rating", label: "Puanlama (1–5 ★)" },
  { value: "yesno",  label: "Evet / Hayır" },
  { value: "choice", label: "Çoktan Seçmeli" },
  { value: "text",   label: "Serbest Metin" },
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });

const Stars = ({ value, max = 5 }: { value: number; max?: number }) => (
  <span style={{ color: "#f59e0b", letterSpacing: 1 }}>
    {"★".repeat(Math.round(value))}{"☆".repeat(max - Math.round(value))}
  </span>
);

// ── Main Component ───────────────────────────────────────────────────────────
export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  // panel state
  const [selected, setSelected]     = useState<SurveyDetail | null>(null);
  const [responses, setResponses]   = useState<SurveyResponseItem[]>([]);
  const [stats, setStats]           = useState<Stats | null>(null);
  const [activeTab, setActiveTab]   = useState<"info" | "responses" | "stats">("info");

  // modals
  const [showForm, setShowForm]     = useState(false);
  const [editSurvey, setEditSurvey] = useState<SurveyDetail | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch("/Surveys");
    if (r.ok) setSurveys(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectSurvey = async (id: string) => {
    const [dRes, rRes, sRes] = await Promise.all([
      apiFetch(`/Surveys/${id}`),
      apiFetch(`/Surveys/${id}/responses`),
      apiFetch(`/Surveys/${id}/stats`),
    ]);
    if (dRes.ok)  setSelected(await dRes.json());
    if (rRes.ok)  setResponses(await rRes.json());
    if (sRes.ok)  setStats(await sRes.json());
    setActiveTab("info");
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "Active" ? "Inactive" : "Active";
    await apiFetch(`/Surveys/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    load();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: next } : null);
  };

  const deleteSurvey = async (id: string) => {
    if (!confirm("Bu anketi silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`/Surveys/${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    load();
  };

  const deleteResponse = async (surveyId: string, responseId: string) => {
    await apiFetch(`/Surveys/${surveyId}/responses/${responseId}`, { method: "DELETE" });
    setResponses(prev => prev.filter(r => r.id !== responseId));
    load();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppShell title="Anket & Memnuniyet" description="Hasta memnuniyet anketleri oluşturun ve sonuçları analiz edin">

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#64748b" }}>{surveys.length} anket</div>
        <button onClick={() => { setEditSurvey(null); setShowForm(true); }} style={{
          background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10,
          padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          + Yeni Anket
        </button>
      </div>

      {/* Layout: list + detail */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* Survey list */}
        <div style={{ flex: "0 0 360px", display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ background: "var(--surface, #fff)", borderRadius: 14, padding: 20, border: "1px solid #eaecf0", height: 100, opacity: 0.5 }} />
            ))
          ) : surveys.length === 0 ? (
            <div style={{ background: "var(--surface, #fff)", borderRadius: 14, padding: 40, textAlign: "center", border: "1px solid #eaecf0" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>Henüz anket oluşturulmamış</div>
            </div>
          ) : surveys.map(s => (
            <div key={s.id} onClick={() => selectSurvey(s.id)} style={{
              background: "var(--surface, #fff)", borderRadius: 14, padding: 16, border: "1px solid",
              borderColor: selected?.id === s.id ? "#1d4ed8" : "#eaecf0",
              cursor: "pointer", transition: "all 0.15s",
              boxShadow: selected?.id === s.id ? "0 0 0 3px #1d4ed822" : "none",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text, #0f172a)", lineHeight: 1.3 }}>{s.title}</div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, flexShrink: 0,
                  background: s.status === "Active" ? "#dcfce7" : "#f1f5f9",
                  color: s.status === "Active" ? "#166534" : "#475569",
                }}>
                  {s.status === "Active" ? "Aktif" : "Pasif"}
                </span>
              </div>
              {s.description && (
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, lineHeight: 1.4,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.description}
                </div>
              )}
              <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
                <span>❓ {s.questionCount} soru</span>
                <span>📝 {s.responseCount} yanıt</span>
                {s.avgRating !== undefined && (
                  <span style={{ color: "#f59e0b" }}>★ {s.avgRating.toFixed(1)}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div style={{ flex: 1, background: "var(--surface, #fff)", borderRadius: 16, border: "1px solid #eaecf0", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f2f4f7" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: "var(--text, #0f172a)" }}>{selected.title}</div>
                  {selected.description && (
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{selected.description}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setShowPreview(true)} style={{
                    padding: "7px 14px", borderRadius: 8, border: "1px solid #e4e7ec",
                    background: "var(--surface-2, #f8fafc)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--text-2, #344054)",
                  }}>Önizle</button>
                  <button onClick={() => { setEditSurvey(selected); setShowForm(true); }} style={{
                    padding: "7px 14px", borderRadius: 8, border: "1px solid #e4e7ec",
                    background: "var(--surface-2, #f8fafc)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--text-2, #344054)",
                  }}>Düzenle</button>
                  <button onClick={() => toggleStatus(selected.id, selected.status)} style={{
                    padding: "7px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: selected.status === "Active" ? "#fef3f2" : "#dcfce7",
                    color: selected.status === "Active" ? "#b42318" : "#166534",
                  }}>
                    {selected.status === "Active" ? "Pasif Yap" : "Aktif Yap"}
                  </button>
                  <button onClick={() => deleteSurvey(selected.id)} style={{
                    padding: "7px 14px", borderRadius: 8, border: "none", background: "#fef3f2",
                    color: "#b42318", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>Sil</button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
                {(["info", "responses", "stats"] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{
                    padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    background: activeTab === t ? "#1d4ed8" : "transparent",
                    color: activeTab === t ? "#fff" : "#64748b",
                  }}>
                    {t === "info" ? "Sorular" : t === "responses" ? `Yanıtlar (${responses.length})` : "İstatistik"}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div style={{ padding: 24 }}>
              {activeTab === "info" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selected.questions.map((q, i) => (
                    <div key={q.id ?? i} style={{ padding: "14px 16px", background: "var(--surface-2, #f8fafc)", borderRadius: 12, display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1d4ed8", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                        {q.sortOrder}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text, #0f172a)" }}>{q.text}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: "#64748b", background: "#e2e8f0", padding: "1px 8px", borderRadius: 999 }}>
                            {QUESTION_TYPES.find(t => t.value === q.type)?.label ?? q.type}
                          </span>
                          {q.options && (
                            <span style={{ fontSize: 11, color: "#64748b" }}>Seçenekler: {q.options}</span>
                          )}
                          {!q.isRequired && (
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>İsteğe bağlı</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "responses" && (
                <div>
                  {responses.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                      Henüz yanıt yok
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {responses.map(r => (
                        <div key={r.id} style={{ background: "var(--surface-2, #f8fafc)", borderRadius: 12, padding: 16, border: "1px solid #f1f5f9" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text, #0f172a)" }}>
                                {r.patientName ?? "Anonim"}
                              </div>
                              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                                {fmtDate(r.submittedAtUtc)}
                                {r.email && <span style={{ marginLeft: 8 }}>· {r.email}</span>}
                                {r.ratingAvg !== undefined && (
                                  <span style={{ marginLeft: 8 }}>· <Stars value={r.ratingAvg} /> {r.ratingAvg.toFixed(1)}</span>
                                )}
                              </div>
                            </div>
                            <button onClick={() => deleteResponse(selected.id, r.id)} style={{
                              background: "none", border: "none", cursor: "pointer", color: "#d0d5dd", fontSize: 16,
                            }}>×</button>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {r.answers.map((a, i) => (
                              <div key={i} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                                <span style={{ color: "#94a3b8", minWidth: 160, flexShrink: 0 }}>{a.questionText}:</span>
                                <span style={{ fontWeight: 600, color: "var(--text-2, #344054)" }}>
                                  {a.questionType === "rating"
                                    ? <><Stars value={parseInt(a.value ?? "0")} /> {a.value}</>
                                    : a.value ?? "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "stats" && stats && (
                <div>
                  {/* Summary cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                    {[
                      { label: "Toplam Yanıt", value: stats.totalResponses, color: "#1d4ed8", bg: "#eff8ff" },
                      { label: "Ort. Puan",    value: stats.avgRating?.toFixed(2) ?? "—", color: "#f59e0b", bg: "#fffbeb" },
                      { label: "Olumlu (4–5)", value: stats.positive,        color: "#059669", bg: "#f0fdf4" },
                      { label: "Olumsuz (1–2)",value: stats.negative,        color: "#b42318", bg: "#fef3f2" },
                    ].map(c => (
                      <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, color: c.color, fontWeight: 600 }}>{c.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Rating bar */}
                  {stats.totalResponses > 0 && (stats.positive + stats.neutral + stats.negative) > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)", marginBottom: 8 }}>Genel Dağılım</div>
                      <div style={{ height: 12, borderRadius: 999, overflow: "hidden", display: "flex", background: "#f1f5f9" }}>
                        {[
                          { pct: stats.positive  / (stats.positive + stats.neutral + stats.negative) * 100, color: "#22c55e" },
                          { pct: stats.neutral   / (stats.positive + stats.neutral + stats.negative) * 100, color: "#f59e0b" },
                          { pct: stats.negative  / (stats.positive + stats.neutral + stats.negative) * 100, color: "#ef4444" },
                        ].map((b, i) => b.pct > 0 ? (
                          <div key={i} style={{ width: `${b.pct}%`, background: b.color, transition: "width 0.5s" }} />
                        ) : null)}
                      </div>
                      <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 11, color: "#64748b" }}>
                        <span style={{ color: "#22c55e" }}>■ Olumlu {stats.positive}</span>
                        <span style={{ color: "#f59e0b" }}>■ Nötr {stats.neutral}</span>
                        <span style={{ color: "#ef4444" }}>■ Olumsuz {stats.negative}</span>
                      </div>
                    </div>
                  )}

                  {/* Per-question stats */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {stats.questionStats.map(qs => (
                      <div key={qs.questionId} style={{ background: "var(--surface-2, #f8fafc)", borderRadius: 12, padding: 16 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text, #0f172a)", marginBottom: 10 }}>{qs.questionText}</div>
                        {qs.questionType === "rating" && qs.avgValue !== undefined && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <Stars value={qs.avgValue} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>{qs.avgValue.toFixed(2)}</span>
                          </div>
                        )}
                        {Object.entries(qs.valueCounts).length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {Object.entries(qs.valueCounts)
                              .sort((a, b) => b[1] - a[1])
                              .map(([val, cnt]) => {
                                const total = Object.values(qs.valueCounts).reduce((a, b) => a + b, 0);
                                const pct = Math.round(cnt / total * 100);
                                return (
                                  <div key={val} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ width: 80, fontSize: 12, color: "var(--text-2, #344054)", flexShrink: 0 }}>{val}</div>
                                    <div style={{ flex: 1, height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                                      <div style={{ width: `${pct}%`, height: "100%", background: "#1d4ed8", borderRadius: 999, transition: "width 0.5s" }} />
                                    </div>
                                    <div style={{ fontSize: 12, color: "#64748b", width: 40, textAlign: "right" }}>{cnt} ({pct}%)</div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, background: "var(--surface, #fff)", borderRadius: 16, border: "1px solid #eaecf0",
            display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
            <div style={{ textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 13 }}>Sol taraftan bir anket seçin</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Survey Form Modal ─────────────────────────────────────────────────── */}
      {showForm && (
        <SurveyFormModal
          initial={editSurvey}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
            if (editSurvey) selectSurvey(editSurvey.id);
          }}
        />
      )}

      {/* ── Preview Modal ─────────────────────────────────────────────────────── */}
      {showPreview && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--surface, #fff)", borderRadius: 20, width: "100%", maxWidth: 560,
            maxHeight: "90vh", overflow: "auto", padding: 32 }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: "var(--text, #0f172a)", marginBottom: 4 }}>{selected.title}</div>
            {selected.description && (
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>{selected.description}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {selected.questions.map((q, i) => (
                <div key={q.id ?? i}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text, #0f172a)", marginBottom: 8 }}>
                    {q.sortOrder}. {q.text}
                    {q.isRequired && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
                  </div>
                  {q.type === "rating" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setPreviewAnswers(p => ({ ...p, [q.id ?? i]: String(n) }))}
                          style={{
                            width: 44, height: 44, borderRadius: 10, border: "1px solid",
                            borderColor: previewAnswers[q.id ?? i] === String(n) ? "#f59e0b" : "#e4e7ec",
                            background: previewAnswers[q.id ?? i] === String(n) ? "#fffbeb" : "#fff",
                            fontSize: 18, cursor: "pointer", fontWeight: 700, color: "#f59e0b",
                          }}>★{n}</button>
                      ))}
                    </div>
                  )}
                  {q.type === "yesno" && (
                    <div style={{ display: "flex", gap: 10 }}>
                      {["Evet", "Hayır"].map(opt => (
                        <button key={opt} onClick={() => setPreviewAnswers(p => ({ ...p, [q.id ?? i]: opt }))}
                          style={{
                            padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13,
                            border: "1px solid",
                            borderColor: previewAnswers[q.id ?? i] === opt ? "#1d4ed8" : "#e4e7ec",
                            background: previewAnswers[q.id ?? i] === opt ? "#eff8ff" : "#fff",
                            color: previewAnswers[q.id ?? i] === opt ? "#1d4ed8" : "#344054",
                          }}>{opt}</button>
                      ))}
                    </div>
                  )}
                  {q.type === "choice" && q.options && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {q.options.split(",").map(opt => opt.trim()).filter(Boolean).map(opt => (
                        <button key={opt} onClick={() => setPreviewAnswers(p => ({ ...p, [q.id ?? i]: opt }))}
                          style={{
                            padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13,
                            border: "1px solid",
                            borderColor: previewAnswers[q.id ?? i] === opt ? "#1d4ed8" : "#e4e7ec",
                            background: previewAnswers[q.id ?? i] === opt ? "#eff8ff" : "#fff",
                            color: previewAnswers[q.id ?? i] === opt ? "#1d4ed8" : "#344054",
                          }}>{opt}</button>
                      ))}
                    </div>
                  )}
                  {q.type === "text" && (
                    <textarea value={previewAnswers[q.id ?? i] ?? ""} onChange={e => setPreviewAnswers(p => ({ ...p, [q.id ?? i]: e.target.value }))}
                      placeholder="Cevabınızı buraya yazın..."
                      style={{ width: "100%", minHeight: 80, borderRadius: 10, border: "1px solid #e4e7ec",
                        padding: "10px 12px", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button onClick={() => { setShowPreview(false); setPreviewAnswers({}); }}
                style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e4e7ec", background: "var(--surface-2, #f8fafc)",
                  fontWeight: 600, fontSize: 13, cursor: "pointer", color: "var(--text-2, #344054)" }}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── Survey Form Modal ─────────────────────────────────────────────────────────
function SurveyFormModal({
  initial, onClose, onSaved,
}: {
  initial: SurveyDetail | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle]       = useState(initial?.title ?? "");
  const [desc, setDesc]         = useState(initial?.description ?? "");
  const [status, setStatus]     = useState(initial?.status ?? "Active");
  const [questions, setQuestions] = useState<Question[]>(
    initial?.questions ?? [{ sortOrder: 1, text: "", type: "rating", isRequired: true }]
  );
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const addQuestion = () => setQuestions(prev => [
    ...prev,
    { sortOrder: prev.length + 1, text: "", type: "rating", isRequired: true },
  ]);

  const removeQuestion = (i: number) => setQuestions(prev => prev.filter((_, idx) => idx !== i));

  const updateQ = (i: number, field: keyof Question, value: string | number | boolean) =>
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));

  const moveQ = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const arr = [...questions];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setQuestions(arr.map((q, idx) => ({ ...q, sortOrder: idx + 1 })));
  };

  const save = async () => {
    if (!title.trim()) { setError("Başlık zorunlu."); return; }
    if (questions.some(q => !q.text.trim())) { setError("Tüm soru metinleri dolu olmalı."); return; }
    setSaving(true);
    const body = { title, description: desc, status, questions: questions.map((q, i) => ({ ...q, sortOrder: i + 1 })) };
    const r = initial
      ? await apiFetch(`/Surveys/${initial.id}`, { method: "PUT",  body: JSON.stringify(body) })
      : await apiFetch("/Surveys",                { method: "POST", body: JSON.stringify(body) });
    setSaving(false);
    if (r.ok) onSaved();
    else { const d = await r.json().catch(() => ({})); setError(d.message ?? "Hata oluştu."); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200,
      display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 20px", overflowY: "auto" }}>
      <div style={{ background: "var(--surface, #fff)", borderRadius: 20, width: "100%", maxWidth: 640, padding: 32 }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 20 }}>
          {initial ? "Anketi Düzenle" : "Yeni Anket"}
        </div>

        {error && (
          <div style={{ background: "#fef3f2", color: "#b42318", border: "1px solid #fecaca",
            borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        {/* Title / Desc */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Anket başlığı *"
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e7ec", fontSize: 14, fontWeight: 600 }} />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Açıklama (isteğe bağlı)"
            rows={2} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e7ec", fontSize: 13, resize: "vertical" }} />
          {initial && (
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e7ec", fontSize: 13 }}>
              <option value="Active">Aktif</option>
              <option value="Inactive">Pasif</option>
            </select>
          )}
        </div>

        {/* Questions */}
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "var(--text, #0f172a)" }}>Sorular</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          {questions.map((q, i) => (
            <div key={i} style={{ background: "var(--surface-2, #f8fafc)", borderRadius: 12, padding: 16, border: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1d4ed8", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <input value={q.text} onChange={e => updateQ(i, "text", e.target.value)} placeholder="Soru metni *"
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e4e7ec", fontSize: 13 }} />
                <button onClick={() => moveQ(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, padding: "2px 4px" }}>↑</button>
                <button onClick={() => moveQ(i,  1)} disabled={i === questions.length - 1} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, padding: "2px 4px" }}>↓</button>
                <button onClick={() => removeQuestion(i)} disabled={questions.length === 1}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#d0d5dd", fontSize: 18, padding: "2px 4px" }}>×</button>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select value={q.type} onChange={e => updateQ(i, "type", e.target.value)}
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid #e4e7ec", fontSize: 12 }}>
                  {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <label style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input type="checkbox" checked={q.isRequired} onChange={e => updateQ(i, "isRequired", e.target.checked)} />
                  Zorunlu
                </label>
              </div>
              {q.type === "choice" && (
                <input value={q.options ?? ""} onChange={e => updateQ(i, "options", e.target.value)}
                  placeholder="Seçenekler: Evet,Hayır,Belki (virgülle ayırın)"
                  style={{ marginTop: 8, width: "100%", padding: "7px 12px", borderRadius: 8,
                    border: "1px solid #e4e7ec", fontSize: 12, boxSizing: "border-box" }} />
              )}
            </div>
          ))}
        </div>

        <button onClick={addQuestion} style={{
          width: "100%", padding: "10px", borderRadius: 10, border: "2px dashed #e4e7ec",
          background: "transparent", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 24,
        }}>
          + Soru Ekle
        </button>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e4e7ec",
            background: "var(--surface-2, #f8fafc)", fontWeight: 600, fontSize: 13, cursor: "pointer", color: "var(--text-2, #344054)" }}>
            İptal
          </button>
          <button onClick={save} disabled={saving} style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: saving ? "#93c5fd" : "#1d4ed8", color: "#fff",
            fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer",
          }}>
            {saving ? "Kaydediliyor..." : initial ? "Güncelle" : "Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}
