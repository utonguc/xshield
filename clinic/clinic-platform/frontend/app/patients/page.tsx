"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { btn, inp } from "@/lib/ui";

const LEAD_STATUSES = ["Yeni","Görüşüldü","Teklif Verildi","Randevu Oluştu","İşlem Yapıldı","İptal"];
const LEAD_SOURCES  = ["Instagram","Facebook","Google","TikTok","Referans","Walk-in","Diğer"];
const GENDERS       = ["Erkek","Kadın","Diğer"];
const LEAD_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  "Yeni":           { bg:"#eff8ff", color:"#175cd3", border:"#b2ddff" },
  "Görüşüldü":      { bg:"#f5f3ff", color:"#6d28d9", border:"#ddd6fe" },
  "Teklif Verildi": { bg:"#fffbeb", color:"#b45309", border:"#fde68a" },
  "Randevu Oluştu": { bg:"#ecfeff", color:"#0e7490", border:"#a5f3fc" },
  "İşlem Yapıldı":  { bg:"#ecfdf5", color:"#065f46", border:"#a7f3d0" },
  "İptal":          { bg:"#fef2f2", color:"#991b1b", border:"#fecaca" },
};

type Patient = {
  id: string; firstName: string; lastName: string; fullName: string;
  phone?: string; email?: string; birthDate?: string; gender?: string;
  country?: string; city?: string; interestedProcedure?: string;
  leadSource?: string; assignedConsultant?: string; leadStatus: string;
  notes?: string; createdAtUtc: string;
};


const emptyForm = () => ({
  firstName: "", lastName: "", phone: "", email: "",
  birthDate: "", gender: "", country: "", city: "",
  interestedProcedure: "", leadSource: "", assignedConsultant: "",
  leadStatus: "Yeni", notes: "",
});

export default function PatientsPage() {
  const [items, setItems]       = useState<Patient[]>([]);
  const [counts, setCounts]     = useState<Record<string, number>>({});
  const [message, setMessage]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");
  const [filterStatus, setFilter] = useState("");
  const [view, setView]         = useState<"list"|"kanban">("list");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm]         = useState(emptyForm());
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async (q = search, s = filterStatus) => {
    try {
      const qs = new URLSearchParams();
      if (q) qs.set("search", q);
      if (s) qs.set("leadStatus", s);
      const res = await apiFetch(`/Patients?${qs}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
      // Counts
      const cr = await apiFetch("/Patients/lead-counts");
      const cd = await cr.json();
      const map: Record<string, number> = {};
      (Array.isArray(cd) ? cd : []).forEach((x: { status: string; count: number }) => { map[x.status] = x.count; });
      setCounts(map);
      setMessage("");
    } catch { setMessage("Hastalar yüklenemedi."); }
  }, [search, filterStatus]);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, filterStatus), 350);
    return () => clearTimeout(t);
  }, [search, filterStatus]);

  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, birthDate: form.birthDate || undefined };
      const res = await apiFetch(editingId ? `/Patients/${editingId}` : "/Patients", {
        method: editingId ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message ?? "Hata"); }
      resetForm(); await load();
      setMessage(editingId ? "Hasta güncellendi." : "Hasta eklendi.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Hata"); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setEditingId(null); setForm(emptyForm()); setShowForm(false); };

  const startEdit = (p: Patient) => {
    setEditingId(p.id);
    setForm({
      firstName: p.firstName, lastName: p.lastName, phone: p.phone ?? "",
      email: p.email ?? "", birthDate: p.birthDate?.slice(0,10) ?? "",
      gender: p.gender ?? "", country: p.country ?? "", city: p.city ?? "",
      interestedProcedure: p.interestedProcedure ?? "",
      leadSource: p.leadSource ?? "", assignedConsultant: p.assignedConsultant ?? "",
      leadStatus: p.leadStatus, notes: p.notes ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeStatus = async (id: string, status: string) => {
    await apiFetch(`/Patients/${id}/lead-status`, {
      method: "PATCH", body: JSON.stringify({ leadStatus: status }),
    });
    await load();
  };

  const del = async (id: string) => {
    if (!confirm("Hasta silinsin mi?")) return;
    const res = await apiFetch(`/Patients/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) { await load(); setMessage("Hasta silindi."); }
    else setMessage("Silinemedi.");
  };

  return (
    <AppShell title="Hastalar & CRM" description="Lead takibi ve hasta yönetimi">

      {/* Toolbar */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm()); }}
          style={btn("white","#1d4ed8")}>
          {showForm && !editingId ? "✕ Kapat" : "+ Yeni Hasta"}
        </button>
        <input placeholder="🔍 Ara..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inp, width: 220 }} />
        <select value={filterStatus} onChange={e => setFilter(e.target.value)} style={{ ...inp, width: 180 }}>
          <option value="">Tüm Durumlar</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{s} ({counts[s] ?? 0})</option>)}
        </select>
        <div style={{ display:"flex", gap:4, marginLeft:"auto" }}>
          <button onClick={() => setShowImport(true)}
            style={btn("#344054","white","1px solid #d0d5dd")}>
            ↑ İçe Aktar
          </button>
          {(["list","kanban"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={btn(view===v ? "white" : "#667085", view===v ? "#1d4ed8" : "white", "1px solid #d0d5dd")}>
              {v === "list" ? "☰ Liste" : "⬜ Kanban"}
            </button>
          ))}
        </div>
      </div>

      {/* CSV Import Modal */}
      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); load(); setMessage("Hastalar içe aktarıldı."); }}
        />
      )}

      {/* Form */}
      {showForm && (
        <div style={{ border:"1px solid #e4e7ec", borderRadius:20, padding:20, marginBottom:20, background:"#f8fafc" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:15 }}>{editingId ? "Hasta Güncelle" : "Yeni Hasta"}</h3>
          <form onSubmit={submit} className="form-grid-3" style={{ gap: 12 }}>
            <input placeholder="Ad *" value={form.firstName} onChange={e => f("firstName",e.target.value)} style={inp}/>
            <input placeholder="Soyad *" value={form.lastName} onChange={e => f("lastName",e.target.value)} style={inp}/>
            <input placeholder="Telefon" value={form.phone} onChange={e => f("phone",e.target.value)} style={inp}/>
            <input placeholder="E-posta" value={form.email} onChange={e => f("email",e.target.value)} style={inp}/>
            <input type="date" placeholder="Doğum Tarihi" value={form.birthDate} onChange={e => f("birthDate",e.target.value)} style={inp}/>
            <select value={form.gender} onChange={e => f("gender",e.target.value)} style={inp}>
              <option value="">Cinsiyet</option>
              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <input placeholder="Ülke" value={form.country} onChange={e => f("country",e.target.value)} style={inp}/>
            <input placeholder="Şehir" value={form.city} onChange={e => f("city",e.target.value)} style={inp}/>
            <input placeholder="İlgilendiği İşlem" value={form.interestedProcedure} onChange={e => f("interestedProcedure",e.target.value)} style={inp}/>
            <select value={form.leadSource} onChange={e => f("leadSource",e.target.value)} style={inp}>
              <option value="">İletişim Kaynağı</option>
              {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Danışman" value={form.assignedConsultant} onChange={e => f("assignedConsultant",e.target.value)} style={inp}/>
            <select value={form.leadStatus} onChange={e => f("leadStatus",e.target.value)} style={inp}>
              {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <textarea placeholder="Notlar" value={form.notes} onChange={e => f("notes",e.target.value)}
              className="form-full" style={{ ...inp, minHeight:72, resize:"vertical" }}/>
            <div className="form-full" style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <button type="submit" disabled={loading} style={btn("white","#1d4ed8")}>
                {loading ? "Kaydediliyor..." : editingId ? "Güncelle" : "Kaydet"}
              </button>
              <button type="button" onClick={resetForm} style={btn("#344054","white","1px solid #d0d5dd")}>İptal</button>
            </div>
          </form>
        </div>
      )}

      {message && <div style={{ padding:10, background:"#f2f4f7", borderRadius:10, marginBottom:14, fontSize:13 }}>{message}</div>}

      {/* Kanban View */}
      {view === "kanban" ? (
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${LEAD_STATUSES.length},1fr)`, gap:12, overflowX:"auto" }}>
          {LEAD_STATUSES.map(status => {
            const col = LEAD_COLORS[status];
            const colItems = items.filter(p => p.leadStatus === status);
            return (
              <div key={status} style={{ minWidth:180 }}>
                <div style={{ padding:"6px 12px", borderRadius:8, marginBottom:8, fontSize:12, fontWeight:700,
                  background:col.bg, color:col.color, border:`1px solid ${col.border}` }}>
                  {status} <span style={{ fontWeight:400 }}>({colItems.length})</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {colItems.map(p => (
                    <div key={p.id} style={{ background:"white", border:"1px solid #eaecf0",
                      borderRadius:12, padding:12, fontSize:12 }}>
                      <div style={{ fontWeight:700 }}>{p.fullName}</div>
                      {p.interestedProcedure && <div style={{ color:"#667085", marginTop:3 }}>{p.interestedProcedure}</div>}
                      {p.phone && <div style={{ color:"#98a2b3" }}>{p.phone}</div>}
                      <div style={{ display:"flex", gap:4, marginTop:8, flexWrap:"wrap" }}>
                        {LEAD_STATUSES.filter(s => s !== status).map(s => {
                          const sc = LEAD_COLORS[s];
                          return (
                            <button key={s} onClick={() => changeStatus(p.id, s)}
                              style={{ padding:"2px 6px", borderRadius:6, border:`1px solid ${sc.border}`,
                                background:sc.bg, color:sc.color, fontSize:10, cursor:"pointer", fontWeight:600 }}>
                              → {s.split(" ")[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div style={{ display:"grid", gap:10 }}>
          {items.map(p => {
            const col = LEAD_COLORS[p.leadStatus] ?? LEAD_COLORS["Yeni"];
            return (
              <div key={p.id} style={{ border:"1px solid #eaecf0", borderRadius:16, padding:16,
                background:"white", display:"flex", justifyContent:"space-between", alignItems:"center", gap:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:700, fontSize:15 }}>{p.fullName}</span>
                    <span style={{ padding:"2px 10px", borderRadius:999, fontSize:12, fontWeight:600,
                      background:col.bg, color:col.color, border:`1px solid ${col.border}` }}>
                      {p.leadStatus}
                    </span>
                  </div>
                  <div style={{ color:"#667085", fontSize:12, marginTop:4 }}>
                    {[p.phone, p.email, p.city && p.country ? `${p.city} / ${p.country}` : (p.city || p.country),
                      p.interestedProcedure, p.leadSource].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  <button onClick={() => startEdit(p)} style={btn("#175cd3","#eff8ff","1px solid #b2ddff")}>Düzenle</button>
                  <button onClick={() => del(p.id)} style={btn("#b42318","#fef3f2","1px solid #fecdca")}>Sil</button>
                </div>
              </div>
            );
          })}
          {items.length === 0 && <div style={{ color:"#98a2b3", padding:16 }}>Kayıt bulunamadı.</div>}
        </div>
      )}
    </AppShell>
  );
}

function CsvImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file,     setFile]     = useState<File | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<{ imported: number; skipped: number; total: number; errors: string[] } | null>(null);
  const [error,    setError]    = useState("");

  const downloadTemplate = async () => {
    const res = await apiFetch("/Patients/import/template");
    if (!res.ok) return;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "hasta_import_sablonu.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async () => {
    if (!file) { setError("Dosya seçiniz."); return; }
    setLoading(true); setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/Patients/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const d = await res.json();
      if (res.ok) setResult(d);
      else setError(d.message ?? "Yükleme hatası.");
    } catch { setError("Bağlantı hatası."); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", zIndex:100, backdropFilter:"blur(2px)" }} />
      <div style={{
        position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        width:"min(480px,90vw)", zIndex:101,
        background:"var(--surface,#fff)", borderRadius:20,
        boxShadow:"0 20px 60px rgba(15,23,42,0.2)",
        border:"1px solid var(--border,#eaecf0)", overflow:"hidden",
      }}>
        <div style={{ padding:"18px 20px", borderBottom:"1px solid var(--border,#eaecf0)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:800, fontSize:15 }}>CSV ile Hasta İçe Aktarma</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94a3b8" }}>×</button>
        </div>
        <div style={{ padding:"20px" }}>
          {!result ? (
            <>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:16, lineHeight:1.6 }}>
                CSV dosyanızda şu kolonlar olmalıdır:<br/>
                <strong>Ad</strong>, <strong>Soyad</strong> (zorunlu) + Telefon, Email, Cinsiyet, DoğumTarihi, Şehir, Ülke, İlgiProsedür, LeadKaynak, LeadDurum, Notlar (isteğe bağlı)
              </div>
              <button onClick={downloadTemplate} style={{
                display:"flex", alignItems:"center", gap:8, marginBottom:16,
                padding:"8px 14px", borderRadius:10, border:"1px solid #b2ddff",
                background:"#eff8ff", color:"#175cd3", fontWeight:600, cursor:"pointer", fontSize:13,
              }}>
                ↓ Örnek Şablon İndir
              </button>
              <label style={{
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                gap:8, padding:24, borderRadius:12, border:"2px dashed #d0d5dd",
                cursor:"pointer", background:"#f8fafc", marginBottom:16,
              }}>
                <span style={{ fontSize:32 }}>📄</span>
                <span style={{ fontWeight:600, color:"#344054", fontSize:13 }}>
                  {file ? file.name : "CSV dosyası seçin veya sürükleyin"}
                </span>
                <span style={{ fontSize:12, color:"#94a3b8" }}>Yalnızca .csv formatı</span>
                <input type="file" accept=".csv" style={{ display:"none" }}
                  onChange={e => { setFile(e.target.files?.[0] ?? null); setError(""); }} />
              </label>
              {error && <div style={{ color:"#b42318", fontSize:13, marginBottom:12 }}>{error}</div>}
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button onClick={onClose} style={{ padding:"9px 18px", borderRadius:10, border:"1px solid #e4e7ec", background:"#fff", color:"#344054", fontWeight:600, cursor:"pointer", fontSize:13 }}>İptal</button>
                <button onClick={upload} disabled={!file || loading} style={{ padding:"9px 18px", borderRadius:10, border:"none", background:"#1d4ed8", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13, opacity:(!file || loading) ? 0.6 : 1 }}>
                  {loading ? "Yükleniyor..." : "İçe Aktar"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <div style={{ fontSize:40, marginBottom:8 }}>✓</div>
                <div style={{ fontWeight:800, fontSize:16, color:"#059669" }}>İçe Aktarma Tamamlandı</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                <div style={{ padding:"12px 16px", borderRadius:12, background:"#f0fdf4", border:"1px solid #a7f3d0", textAlign:"center" }}>
                  <div style={{ fontSize:28, fontWeight:800, color:"#059669" }}>{result.imported}</div>
                  <div style={{ fontSize:12, color:"#166534", fontWeight:600 }}>İçe Aktarıldı</div>
                </div>
                <div style={{ padding:"12px 16px", borderRadius:12, background:"#fffbeb", border:"1px solid #fde68a", textAlign:"center" }}>
                  <div style={{ fontSize:28, fontWeight:800, color:"#b45309" }}>{result.skipped}</div>
                  <div style={{ fontSize:12, color:"#92400e", fontWeight:600 }}>Atlandı</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div style={{ maxHeight:120, overflowY:"auto", padding:10, background:"#fef3f2", borderRadius:10, border:"1px solid #fecdca", fontSize:12, color:"#b42318", marginBottom:16 }}>
                  {result.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"flex-end" }}>
                <button onClick={onImported} style={{ padding:"9px 20px", borderRadius:10, border:"none", background:"#1d4ed8", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                  Tamam
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
