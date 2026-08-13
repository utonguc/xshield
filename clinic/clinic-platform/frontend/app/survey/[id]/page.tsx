"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

type Question = {
  id: string;
  sortOrder: number;
  text: string;
  type: string;
  options?: string;
  isRequired: boolean;
};

type Survey = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
};

const Stars = ({ value, onSelect }: { value: number; onSelect: (n: number) => void }) => (
  <div style={{ display: "flex", gap: 8 }}>
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} type="button" onClick={() => onSelect(n)} style={{
        width: 48, height: 48, borderRadius: 10, border: "1px solid",
        borderColor: value >= n ? "#f59e0b" : "#e4e7ec",
        background: value >= n ? "#fffbeb" : "#fff",
        fontSize: 20, cursor: "pointer", fontWeight: 700, color: "#f59e0b",
        transition: "all 0.1s",
      }}>
        {value >= n ? "★" : "☆"}
      </button>
    ))}
  </div>
);

export default function PublicSurveyPage() {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/Surveys/public/${id}`)
      .then(r => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then(d => { if (d) setSurvey(d); })
      .finally(() => setLoading(false));
  }, [id]);

  const setAnswer = (qId: string, val: string) =>
    setAnswers(prev => ({ ...prev, [qId]: val }));

  const submit = async () => {
    if (!survey) return;
    // Required check
    for (const q of survey.questions) {
      if (q.isRequired && !answers[q.id]) {
        setError(`"${q.text}" sorusu zorunlu.`);
        return;
      }
    }
    setError("");
    setSubmitting(true);
    const body = {
      patientName: name.trim() || undefined,
      email: email.trim() || undefined,
      answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
    };
    const r = await fetch(`${API}/Surveys/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (r.ok) setDone(true);
    else {
      const d = await r.json().catch(() => ({}));
      setError(d.message ?? "Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  if (loading) return (
    <div style={centered}>
      <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#1d4ed8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound || !survey) return (
    <div style={centered}>
      <div style={{ textAlign: "center", maxWidth: 360, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>📋</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 10 }}>Anket Bulunamadı</h1>
        <p style={{ color: "#6b7280", fontSize: 15, lineHeight: 1.6 }}>Bu anket mevcut değil veya aktif değil.</p>
      </div>
    </div>
  );

  if (done) return (
    <div style={centered}>
      <div style={{ textAlign: "center", maxWidth: 440, padding: "0 24px" }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🙏</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 12 }}>Teşekkürler!</h1>
        <p style={{ color: "#6b7280", fontSize: 16, lineHeight: 1.65 }}>
          Değerli geri bildiriminiz kaydedildi. Katkınız için teşekkür ederiz.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "var(--font-inter), system-ui, sans-serif", padding: "40px 16px" }}>
      <style>{`*{box-sizing:border-box;}`}</style>

      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>
            📝
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginBottom: 8 }}>{survey.title}</h1>
          {survey.description && (
            <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.65 }}>{survey.description}</p>
          )}
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "32px 28px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", border: "1px solid #e5e7eb" }}>
          {/* Name / Email */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            <div>
              <label style={labelStyle}>Adınız <span style={{ color: "#9ca3af", fontWeight: 400 }}>(isteğe bağlı)</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Adınız Soyadınız" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>E-posta <span style={{ color: "#9ca3af", fontWeight: 400 }}>(isteğe bağlı)</span></label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@email.com" style={inputStyle} />
            </div>
          </div>

          <div style={{ borderTop: "1px solid #f3f4f6", marginBottom: 28 }} />

          {/* Questions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {survey.questions.map((q, i) => (
              <div key={q.id}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#111827", marginBottom: 12 }}>
                  {i + 1}. {q.text}
                  {q.isRequired && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
                </div>

                {q.type === "rating" && (
                  <Stars value={parseInt(answers[q.id] ?? "0")} onSelect={n => setAnswer(q.id, String(n))} />
                )}

                {q.type === "yesno" && (
                  <div style={{ display: "flex", gap: 10 }}>
                    {["Evet", "Hayır"].map(opt => (
                      <button key={opt} type="button" onClick={() => setAnswer(q.id, opt)} style={{
                        padding: "10px 24px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14,
                        border: "1px solid",
                        borderColor: answers[q.id] === opt ? "#1d4ed8" : "#e4e7ec",
                        background: answers[q.id] === opt ? "#eff8ff" : "#fff",
                        color: answers[q.id] === opt ? "#1d4ed8" : "#374151",
                        transition: "all 0.1s",
                      }}>{opt}</button>
                    ))}
                  </div>
                )}

                {q.type === "choice" && q.options && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {q.options.split(",").map(opt => opt.trim()).filter(Boolean).map(opt => (
                      <button key={opt} type="button" onClick={() => setAnswer(q.id, opt)} style={{
                        padding: "9px 18px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14,
                        border: "1px solid",
                        borderColor: answers[q.id] === opt ? "#1d4ed8" : "#e4e7ec",
                        background: answers[q.id] === opt ? "#eff8ff" : "#fff",
                        color: answers[q.id] === opt ? "#1d4ed8" : "#374151",
                        transition: "all 0.1s",
                      }}>{opt}</button>
                    ))}
                  </div>
                )}

                {q.type === "text" && (
                  <textarea value={answers[q.id] ?? ""} onChange={e => setAnswer(q.id, e.target.value)}
                    placeholder="Cevabınızı buraya yazın..."
                    rows={3} style={{ ...inputStyle, resize: "vertical", width: "100%" }} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div style={{ marginTop: 20, background: "#fef3f2", color: "#b42318", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 14 }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={submitting} style={{
            marginTop: 28, width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: submitting ? "#93c5fd" : "#1d4ed8", color: "#fff",
            fontWeight: 700, fontSize: 16, cursor: submitting ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}>
            {submitting ? "Gönderiliyor..." : "Anketi Gönder"}
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#9ca3af" }}>
          Yanıtınız güvenli şekilde iletilecektir.
        </p>
      </div>
    </div>
  );
}

const centered: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: "#f8fafc",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e7ec",
  fontSize: 14, outline: "none",
};
