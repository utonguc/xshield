"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch, API_BASE_URL, getToken } from "@/lib/api";
import { fmtDate } from "@/lib/tz";

// ── Types ─────────────────────────────────────────────────────────────────────
type Doc = {
  id: string; originalName: string; category: string; description?: string;
  mimeType: string; fileSize: number; fileSizeLabel: string;
  patientId?: string; patientName?: string;
  uploadedByName?: string; createdAtUtc: string;
};
type Patient = { id: string; firstName: string; lastName: string };

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ["Hasta","Fatura","Sözleşme","Tetkik","Diğer"];

const CAT_META: Record<string, { color: string; bg: string; icon: string }> = {
  Hasta:    { color: "#1d4ed8", bg: "#eff8ff",  icon: "♥" },
  Fatura:   { color: "#059669", bg: "#f0fdf4",  icon: "₺" },
  Sözleşme: { color: "#7c3aed", bg: "#f5f3ff",  icon: "📜" },
  Tetkik:   { color: "#d97706", bg: "#fffbeb",  icon: "🔬" },
  Diğer:    { color: "#667085", bg: "#f2f4f7",  icon: "📄" },
};


const card: React.CSSProperties = {
  background: "var(--surface, #fff)", border: "1px solid #eaecf0",
  borderRadius: 16, padding: 20,
  boxShadow: "0 1px 4px rgba(16,24,40,0.06)",
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [docs,    setDocs]    = useState<Doc[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat,    setFilterCat]    = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [showUpload,   setShowUpload]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterCat)    qs.set("category", filterCat);
      if (filterSearch) qs.set("search",   filterSearch);
      const res = await apiFetch(`/Documents?${qs}`);
      if (res.ok) setDocs(await res.json());
    } finally { setLoading(false); }
  }, [filterCat, filterSearch]);

  useEffect(() => {
    load();
    apiFetch("/Patients?pageSize=200").then(r => r.ok ? r.json() : null).then(d => {
      if (Array.isArray(d)) setPatients(d);
    });
  }, [load]);

  const deleteDoc = async (id: string) => {
    if (!confirm("Belgeyi silmek istediğinize emin misiniz?")) return;
    await apiFetch(`/Documents/${id}`, { method: "DELETE" });
    load();
  };

  const download = (id: string, name: string) => {
    const token = getToken();
    const a = document.createElement("a");
    a.href = `${API_BASE_URL}/Documents/${id}/download`;
    // Token'ı header ile gönderemeyiz, geçici link oluşturuyoruz
    fetch(`${API_BASE_URL}/Documents/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.blob()).then(blob => {
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  };

  // Kategori sayıları
  const countBy = (cat: string) => docs.filter(d => d.category === cat).length;

  return (
    <AppShell title="Belge Yönetimi" description="Klinik ve hasta belgeleri">

      {/* Kategori özet kartları */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12, marginBottom: 24 }}>
        {CATEGORIES.map(cat => {
          const m = CAT_META[cat];
          return (
            <button key={cat} onClick={() => setFilterCat(filterCat === cat ? "" : cat)}
              style={{ ...card, padding: "14px 16px", cursor: "pointer", border: filterCat === cat ? `2px solid ${m.color}` : "1px solid #eaecf0", textAlign: "left" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>{cat}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text, #101828)" }}>{countBy(cat)}</div>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setShowUpload(true)} style={{
          padding: "9px 18px", borderRadius: 10, border: "none",
          background: "#1d4ed8", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>↑ Belge Yükle</button>

        <input value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
          placeholder="Belge ara..." style={{
            padding: "9px 14px", borderRadius: 10, border: "1px solid #e4e7ec",
            fontSize: 13, width: 220, outline: "none",
          }} />

        {(filterCat || filterSearch) && (
          <button onClick={() => { setFilterCat(""); setFilterSearch(""); }}
            style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #e4e7ec", background: "var(--surface, #fff)", color: "#667085", cursor: "pointer", fontSize: 13 }}>
            ✕ Filtreyi temizle
          </button>
        )}

        <span style={{ marginLeft: "auto", fontSize: 13, color: "#667085" }}>{docs.length} belge</span>
      </div>

      {/* Dosya grid */}
      {loading ? (
        <div style={{ color: "#98a2b3", textAlign: "center", padding: 48 }}>Yükleniyor...</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#98a2b3" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#667085", marginBottom: 8 }}>Belge bulunamadı</div>
          <div style={{ fontSize: 13 }}>Belge Yükle butonundan yeni belge ekleyebilirsiniz.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          {docs.map(doc => {
            const cm = CAT_META[doc.category] ?? CAT_META["Diğer"];
            return (
              <div key={doc.id} style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Icon + name */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{mimeIcon(doc.mimeType)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text, #101828)", wordBreak: "break-word", lineHeight: 1.4 }}>
                      {doc.originalName}
                    </div>
                    {doc.description && (
                      <div style={{ fontSize: 12, color: "#667085", marginTop: 3 }}>{doc.description}</div>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: cm.bg, color: cm.color }}>
                    {cm.icon} {doc.category}
                  </span>
                  <span style={{ fontSize: 11, color: "#98a2b3", padding: "2px 8px", borderRadius: 999, background: "var(--surface-2, #f8fafc)" }}>
                    {doc.fileSizeLabel}
                  </span>
                  {doc.patientName && (
                    <span style={{ fontSize: 11, color: "#667085", padding: "2px 8px", borderRadius: 999, background: "var(--surface-2, #f8fafc)" }}>
                      ♥ {doc.patientName}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f2f4f7" }}>
                  <span style={{ fontSize: 11, color: "#98a2b3" }}>
                    {fmtDate(doc.createdAtUtc)}
                    {doc.uploadedByName && ` · ${doc.uploadedByName.split(" ")[0]}`}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <ActionBtn label="↓" title="İndir" onClick={() => download(doc.id, doc.originalName)} color="#1d4ed8" />
                    <ActionBtn label="✕" title="Sil"   onClick={() => deleteDoc(doc.id)} color="#b42318" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUpload && (
        <UploadModal
          patients={patients}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); load(); }}
        />
      )}
    </AppShell>
  );
}

function mimeIcon(mime: string) {
  if (mime.startsWith("image/"))        return "🖼";
  if (mime === "application/pdf")       return "📕";
  if (mime.includes("word"))            return "📘";
  if (mime.includes("sheet") || mime.includes("excel")) return "📗";
  return "📄";
}

function ActionBtn({ label, title, onClick, color }: { label: string; title: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} title={title} style={{
      padding: "4px 10px", borderRadius: 6, border: `1px solid ${color}30`,
      background: `${color}10`, color, fontWeight: 700, cursor: "pointer", fontSize: 13,
    }}>{label}</button>
  );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ patients, onClose, onUploaded }: {
  patients: Patient[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [files,       setFiles]       = useState<File[]>([]);
  const [category,    setCategory]    = useState("Diğer");
  const [description, setDescription] = useState("");
  const [patientId,   setPatientId]   = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [error,       setError]       = useState("");
  const [dragActive,  setDragActive]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
  };

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, j) => j !== i));

  const upload = async () => {
    if (files.length === 0) { setError("En az bir dosya seçin."); return; }
    setUploading(true); setError("");
    let done = 0;

    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      if (description) form.append("description", description);
      if (patientId)   form.append("patientId", patientId);

      try {
        const res = await apiFetch("/Documents/upload", { method: "POST", body: form });
        if (!res.ok) { const d = await res.json(); setError(d.message ?? "Yükleme hatası."); setUploading(false); return; }
      } catch { setError("Sunucuya ulaşılamadı."); setUploading(false); return; }

      done++;
      setProgress(Math.round((done / files.length) * 100));
    }

    setUploading(false);
    onUploaded();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1.5px solid #e4e7ec", fontSize: 13, boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--surface, #fff)", borderRadius: 20, width: "100%", maxWidth: 540, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Belge Yükle</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#667085" }}>×</button>
        </div>

        <div style={{ padding: 24, display: "grid", gap: 16 }}>
          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={e => { e.preventDefault(); setDragActive(false); addFiles(e.dataTransfer.files); }}
            style={{
              border: `2px dashed ${dragActive ? "#1d4ed8" : "#d0d5dd"}`,
              borderRadius: 12, padding: "32px 20px", textAlign: "center",
              cursor: "pointer", background: dragActive ? "#eff8ff" : "#f8fafc",
              transition: "all 0.15s",
            }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2, #344054)", marginBottom: 4 }}>
              Dosyaları buraya sürükleyin
            </div>
            <div style={{ fontSize: 13, color: "#98a2b3" }}>veya tıklayarak seçin · Maks. 50 MB</div>
            <input ref={inputRef} type="file" multiple style={{ display: "none" }} onChange={e => addFiles(e.target.files)} />
          </div>

          {/* Seçilen dosyalar */}
          {files.length > 0 && (
            <div style={{ display: "grid", gap: 6 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--surface-2, #f8fafc)", borderRadius: 8, fontSize: 13 }}>
                  <span>{mimeIcon(f.type)}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <span style={{ color: "#98a2b3", flexShrink: 0 }}>{(f.size / 1024).toFixed(0)} KB</span>
                  <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#b42318", fontSize: 16 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Kategori & Hasta */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Kategori</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Hasta (opsiyonel)</label>
              <select value={patientId} onChange={e => setPatientId(e.target.value)} style={inputStyle}>
                <option value="">Bağlantısız</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
            </div>
          </div>

          {/* Açıklama */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Açıklama (opsiyonel)</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Kısa açıklama..." style={inputStyle} />
          </div>

          {/* Progress */}
          {uploading && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#667085", marginBottom: 6 }}>
                <span>Yükleniyor...</span><span>%{progress}</span>
              </div>
              <div style={{ height: 6, background: "#e4e7ec", borderRadius: 3 }}>
                <div style={{ height: 6, background: "#1d4ed8", borderRadius: 3, width: `${progress}%`, transition: "width 0.2s" }} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef3f2", color: "#b42318", fontSize: 13, border: "1px solid #fecdca" }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #d0d5dd", background: "var(--surface, #fff)", color: "var(--text-2, #344054)", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
              İptal
            </button>
            <button onClick={upload} disabled={uploading || files.length === 0} style={{
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: uploading || files.length === 0 ? "#93c5fd" : "#1d4ed8",
              color: "#fff", fontWeight: 700, cursor: uploading || files.length === 0 ? "not-allowed" : "pointer", fontSize: 13,
            }}>
              {uploading ? `Yükleniyor... %${progress}` : `↑ ${files.length} Dosyayı Yükle`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

