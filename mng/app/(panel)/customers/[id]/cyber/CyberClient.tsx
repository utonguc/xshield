"use client";
import { useState } from "react";
import ScannerPanel from "./ScannerPanel";

// ── Types ─────────────────────────────────────────────────────────────
type Campaign = {
  id: number; name: string; status: string; authorization_ref: string;
  sender_name: string; sender_email: string; created_at: string;
  started_at: string | null; completed_at: string | null;
  email_template_name: string | null; page_template_name: string | null;
  total: number; sent: number; opened: number; clicked: number; submitted: number;
};
type EmailTpl = { id: number; name: string; category: string; subject: string; sender_name: string; html_body: string | null };
type PageTpl  = { id: number; name: string; category: string; description: string | null; html_content: string | null };
type Target   = { name: string; email: string; department?: string };
type PentestProject = {
  id: number; name: string; type: string; scope: string | null;
  start_date: string | null; end_date: string | null; tester: string | null;
  status: string; authorization_ref: string | null; created_at: string;
  finding_count: number; critical_count: number; high_count: number;
};
type Finding = {
  id: number; title: string; severity: string; cvss_score: number | null;
  affected_asset: string | null; description: string | null;
  poc: string | null; remediation: string | null; status: string;
};

// ── Constants ─────────────────────────────────────────────────────────
const CAM_STATUSES: Record<string, { label: string; color: string }> = {
  draft:     { label: "Taslak",    color: "#64748b" },
  running:   { label: "Devam Ediyor", color: "#3b82f6" },
  completed: { label: "Tamamlandı",  color: "#22c55e" },
  cancelled: { label: "İptal",     color: "#ef4444" },
};
const PENTEST_TYPES = [
  { value: "web",      label: "Web Uygulaması", icon: "🌐" },
  { value: "network",  label: "Ağ/Altyapı",    icon: "🔌" },
  { value: "social",   label: "Sosyal Müh.",    icon: "🎭" },
  { value: "physical", label: "Fiziksel",       icon: "🏢" },
  { value: "full",     label: "Kapsamlı",       icon: "🎯" },
];
const SEVERITIES = [
  { value: "critical", label: "Kritik",   color: "#7c3aed" },
  { value: "high",     label: "Yüksek",   color: "#ef4444" },
  { value: "medium",   label: "Orta",     color: "#f59e0b" },
  { value: "low",      label: "Düşük",    color: "#22c55e" },
  { value: "info",     label: "Bilgi",    color: "#6366f1" },
];
const PENTEST_STATUSES = [
  { value: "planning",   label: "Planlama" },
  { value: "active",     label: "Aktif" },
  { value: "reporting",  label: "Raporlama" },
  { value: "completed",  label: "Tamamlandı" },
  { value: "cancelled",  label: "İptal" },
];
const EMAIL_CATS: Record<string, string> = {
  account:  "Hesap Güvenliği",
  hr:       "İK / Bordro",
  delivery: "Teslimat / Kargo",
  it:       "IT / Teknik",
  finance:  "Finans",
  ceo:      "CEO Dolandırıcılığı",
  other:    "Diğer",
};
const PAGE_CATS: Record<string, string> = {
  microsoft: "Microsoft",
  google:    "Google",
  generic:   "Genel Portal",
  other:     "Diğer",
};

function getSev(v: string) { return SEVERITIES.find(s => s.value === v) ?? SEVERITIES[2]; }
function getPType(v: string) { return PENTEST_TYPES.find(t => t.value === v) ?? PENTEST_TYPES[0]; }
function pct(n: number, d: number) { return d === 0 ? 0 : Math.round((n / d) * 100); }

function StatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const p = pct(value, total);
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: "var(--text-dim)" }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>({p}%)</span></span>
      </div>
      <div style={{ height: 4, background: "var(--border)", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${p}%`, background: color, borderRadius: 2, transition: "width .3s" }} />
      </div>
    </div>
  );
}

export default function CyberClient({
  customerId, customerName,
  initialCampaigns, emailTemplates, pageTemplates, initialProjects,
}: {
  customerId: number; customerName: string;
  initialCampaigns: Campaign[]; emailTemplates: EmailTpl[]; pageTemplates: PageTpl[];
  initialProjects: PentestProject[];
}) {
  const [tab, setTab]           = useState<"phishing"|"pentest"|"templates">("phishing");
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [projects, setProjects]   = useState<PentestProject[]>(initialProjects);
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null);

  // Phishing state
  const [showCampModal, setShowCampModal] = useState(false);
  const [campForm, setCampForm] = useState({
    name: "", email_template_id: "", page_template_id: "",
    sender_name: "IT Güvenlik Ekibi", sender_email: "", reply_to: "",
    awareness_url: "", authorization_ref: "",
  });
  const [targetText, setTargetText] = useState("");
  const [launching, setLaunching]   = useState<number | null>(null);
  const [expandCamp, setExpandCamp] = useState<number | null>(null);
  const [campDetail, setCampDetail] = useState<{ campaign: any; targets: any[] } | null>(null);

  // Pentest state
  const [showProjModal, setShowProjModal] = useState(false);
  const [editingProj, setEditingProj]     = useState<PentestProject | null>(null);
  const [projForm, setProjForm] = useState({ name: "", type: "web", scope: "", start_date: "", end_date: "", tester: "", status: "planning", authorization_ref: "" });
  const [expandProj, setExpandProj] = useState<number | null>(null);
  const [projDetail, setProjDetail] = useState<{ project: any; findings: Finding[] } | null>(null);
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [editingFinding, setEditingFinding]     = useState<Finding | null>(null);
  const [findingForm, setFindingForm] = useState({ title: "", severity: "medium", cvss_score: "", affected_asset: "", description: "", poc: "", remediation: "", status: "open" });
  const [saving, setSaving] = useState(false);

  // Preview state
  const [previewHtml, setPreviewHtml]   = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const toast = (text: string, ok: boolean) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); };

  const inp: React.CSSProperties = { width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 13, outline: "none" };
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: 5 };

  const openPreview = (title: string, html: string) => {
    const demo = html
      .replace(/__SUBMIT_URL__/g, "/api/ph/ORNEK_TOKEN/submit")
      .replace(/__TOKEN__/g, "ORNEK_TOKEN")
      .replace(/\{\{NAME\}\}/g, "Örnek Kullanıcı")
      .replace(/\{\{EMAIL\}\}/g, "ornek@firma.com")
      .replace(/\{\{COMPANY\}\}/g, "Örnek Firma A.Ş.");
    setPreviewTitle(title);
    setPreviewHtml(demo);
  };

  // ── Phishing handlers ─────────────────────────────────────────────
  const saveCampaign = async () => {
    if (!campForm.name.trim() || !campForm.authorization_ref.trim()) return;
    setSaving(true);
    const targets: Target[] = targetText.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split(",").map(s => s.trim());
      return { name: parts[1] || parts[0], email: parts[0], department: parts[2] };
    });
    try {
      const res = await fetch(`/api/customers/${customerId}/phishing`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...campForm, email_template_id: campForm.email_template_id ? Number(campForm.email_template_id) : null, page_template_id: campForm.page_template_id ? Number(campForm.page_template_id) : null }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();

      if (targets.length > 0) {
        await fetch(`/api/customers/${customerId}/phishing/${id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...campForm, email_template_id: campForm.email_template_id ? Number(campForm.email_template_id) : null, page_template_id: campForm.page_template_id ? Number(campForm.page_template_id) : null, targets }),
        });
      }
      toast("Kampanya oluşturuldu.", true);
      setShowCampModal(false);
      const r = await fetch(`/api/customers/${customerId}/phishing`);
      if (r.ok) setCampaigns(await r.json());
    } catch (e: any) { toast(e.message, false); }
    finally { setSaving(false); }
  };

  const launchCampaign = async (c: Campaign) => {
    if (!confirm(`"${c.name}" kampanyası başlatılacak — ${c.total} kişiye e-posta gönderilecek. Onay belgesi: ${c.authorization_ref}\n\nDevam etmek istiyor musunuz?`)) return;
    setLaunching(c.id);
    try {
      const res = await fetch(`/api/customers/${customerId}/phishing/${c.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "launch" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`${data.sent} e-posta gönderildi.`, true);
      const r = await fetch(`/api/customers/${customerId}/phishing`);
      if (r.ok) setCampaigns(await r.json());
    } catch (e: any) { toast(e.message, false); }
    finally { setLaunching(null); }
  };

  const loadCampDetail = async (id: number) => {
    if (expandCamp === id) { setExpandCamp(null); return; }
    setExpandCamp(id);
    const r = await fetch(`/api/customers/${customerId}/phishing/${id}`);
    if (r.ok) setCampDetail(await r.json());
  };

  // ── Pentest handlers ──────────────────────────────────────────────
  const openAddProj = () => { setEditingProj(null); setProjForm({ name: "", type: "web", scope: "", start_date: "", end_date: "", tester: "", status: "planning", authorization_ref: "" }); setShowProjModal(true); };
  const openEditProj = (p: PentestProject) => {
    setEditingProj(p);
    setProjForm({ name: p.name, type: p.type, scope: p.scope||"", start_date: p.start_date||"", end_date: p.end_date||"", tester: p.tester||"", status: p.status, authorization_ref: p.authorization_ref||"" });
    setShowProjModal(true);
  };

  const saveProject = async () => {
    if (!projForm.name.trim()) return;
    setSaving(true);
    try {
      const url = editingProj ? `/api/customers/${customerId}/pentest/${editingProj.id}` : `/api/customers/${customerId}/pentest`;
      const res = await fetch(url, { method: editingProj ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(projForm) });
      if (!res.ok) throw new Error(await res.text());
      toast(editingProj ? "Proje güncellendi." : "Proje oluşturuldu.", true);
      setShowProjModal(false);
      const r = await fetch(`/api/customers/${customerId}/pentest`);
      if (r.ok) setProjects(await r.json());
    } catch (e: any) { toast(e.message, false); }
    finally { setSaving(false); }
  };

  const loadProjDetail = async (id: number) => {
    if (expandProj === id) { setExpandProj(null); return; }
    setExpandProj(id);
    const r = await fetch(`/api/customers/${customerId}/pentest/${id}`);
    if (r.ok) setProjDetail(await r.json());
  };

  const openAddFinding = () => {
    setEditingFinding(null);
    setFindingForm({ title: "", severity: "medium", cvss_score: "", affected_asset: "", description: "", poc: "", remediation: "", status: "open" });
    setShowFindingModal(true);
  };
  const openEditFinding = (f: Finding) => {
    setEditingFinding(f);
    setFindingForm({ title: f.title, severity: f.severity, cvss_score: f.cvss_score ? String(f.cvss_score) : "", affected_asset: f.affected_asset||"", description: f.description||"", poc: f.poc||"", remediation: f.remediation||"", status: f.status });
    setShowFindingModal(true);
  };

  const saveFinding = async () => {
    if (!projDetail || !findingForm.title.trim()) return;
    setSaving(true);
    const pid = projDetail.project.id;
    try {
      const url = editingFinding ? `/api/customers/${customerId}/pentest/${pid}/findings/${editingFinding.id}` : `/api/customers/${customerId}/pentest/${pid}/findings`;
      const res = await fetch(url, { method: editingFinding ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...findingForm, cvss_score: findingForm.cvss_score ? Number(findingForm.cvss_score) : null }) });
      if (!res.ok) throw new Error(await res.text());
      toast(editingFinding ? "Bulgu güncellendi." : "Bulgu eklendi.", true);
      setShowFindingModal(false);
      const r = await fetch(`/api/customers/${customerId}/pentest/${pid}`);
      if (r.ok) setProjDetail(await r.json());
    } catch (e: any) { toast(e.message, false); }
    finally { setSaving(false); }
  };

  const delFinding = async (f: Finding) => {
    if (!projDetail || !confirm(`"${f.title}" bulgusu silinecek?`)) return;
    const pid = projDetail.project.id;
    await fetch(`/api/customers/${customerId}/pentest/${pid}/findings/${f.id}`, { method: "DELETE" });
    setProjDetail(d => d ? { ...d, findings: d.findings.filter(x => x.id !== f.id) } : null);
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      {msg && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: msg.ok ? "#16a34a" : "#dc2626", color: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
          {msg.text}<button onClick={() => setMsg(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", marginLeft: 10, fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>🛡️ Siber Test Modülü</h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "4px 0 0" }}>{customerName}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setTab("phishing"); setShowCampModal(true); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e9456040", background: tab === "phishing" ? "#e94560" : "transparent", color: tab === "phishing" ? "#fff" : "#e94560", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + Kampanya
          </button>
          <button onClick={() => { setTab("pentest"); openAddProj(); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #6366f140", background: tab === "pentest" ? "#6366f1" : "transparent", color: tab === "pentest" ? "#fff" : "#6366f1", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + Pentest
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid var(--border)", paddingBottom: 0 }}>
        {[
          { key: "phishing",  icon: "🎣", label: `Oltalama (${campaigns.length})` },
          { key: "pentest",   icon: "🔎", label: `Sızma Testi (${projects.length})` },
          { key: "templates", icon: "📋", label: `Şablonlar (${emailTemplates.length + pageTemplates.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding: "10px 16px", border: "none", borderBottom: `2px solid ${tab === t.key ? "#e94560" : "transparent"}`, marginBottom: -2, background: "transparent", color: tab === t.key ? "#e94560" : "var(--text-dim)", fontSize: 13, fontWeight: tab === t.key ? 700 : 500, cursor: "pointer" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── PHISHING TAB ─────────────────────────────────────────── */}
      {tab === "phishing" && (
        campaigns.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-dim)" }}>
            Henüz kampanya oluşturulmamış.
            <div><button onClick={() => setShowCampModal(true)} style={{ marginTop: 14, padding: "8px 18px", borderRadius: 8, border: "1px dashed #e94560", background: "rgba(233,69,96,.06)", color: "#e94560", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>İlk kampanyayı oluştur</button></div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {campaigns.map(c => {
              const st = CAM_STATUSES[c.status] ?? CAM_STATUSES.draft;
              const isExpanded = expandCamp === c.id;
              return (
                <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
                  <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(233,69,96,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🎣</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{c.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${st.color}18`, color: st.color }}>{st.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>
                        📋 {c.authorization_ref} &nbsp;·&nbsp; 👤 {c.sender_name} &nbsp;·&nbsp; {c.email_template_name || "Şablon yok"}
                      </div>
                      {c.total > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, maxWidth: 480 }}>
                          <StatBar label="Gönderilen" value={c.sent}      total={c.total} color="#6366f1" />
                          <StatBar label="Açılan"     value={c.opened}    total={c.total} color="#3b82f6" />
                          <StatBar label="Tıklanan"   value={c.clicked}   total={c.total} color="#f59e0b" />
                          <StatBar label="Giriş Yapan" value={c.submitted} total={c.total} color="#ef4444" />
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                      {c.status === "draft" && c.total > 0 && (
                        <button onClick={() => launchCampaign(c)} disabled={launching === c.id}
                          style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "#e94560", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          {launching === c.id ? "Gönderiliyor…" : "🚀 Başlat"}
                        </button>
                      )}
                      {c.status === "running" && (
                        <button onClick={async () => { await fetch(`/api/customers/${customerId}/phishing/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete" }) }); const r = await fetch(`/api/customers/${customerId}/phishing`); if (r.ok) setCampaigns(await r.json()); }}
                          style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #22c55e44", background: "transparent", color: "#22c55e", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Tamamla
                        </button>
                      )}
                      <button onClick={() => loadCampDetail(c.id)}
                        style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 12, cursor: "pointer" }}>
                        {isExpanded ? "Kapat" : "Detay"}
                      </button>
                    </div>
                  </div>
                  {isExpanded && campDetail && campDetail.campaign.id === c.id && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "14px 18px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 10 }}>
                        Hedef Listesi ({campDetail.targets.length} kişi)
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 6 }}>
                        {campDetail.targets.map((t: any) => (
                          <div key={t.id} style={{ background: "var(--card2)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                            <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{t.name}</div>
                            <div style={{ color: "var(--text-dim)", marginBottom: 4 }}>{t.email}</div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {t.sent_at      && <span style={{ padding: "1px 6px", borderRadius: 4, background: "#6366f118", color: "#6366f1", fontSize: 10 }}>✉ Gönderildi</span>}
                              {t.opened_at    && <span style={{ padding: "1px 6px", borderRadius: 4, background: "#3b82f618", color: "#3b82f6", fontSize: 10 }}>👁 Açtı</span>}
                              {t.clicked_at   && <span style={{ padding: "1px 6px", borderRadius: 4, background: "#f59e0b18", color: "#f59e0b", fontSize: 10 }}>🔗 Tıkladı</span>}
                              {t.submitted_at && <span style={{ padding: "1px 6px", borderRadius: 4, background: "#ef444418", color: "#ef4444", fontSize: 10, fontWeight: 700 }}>⚠ Giriş Yaptı</span>}
                              {!t.sent_at     && <span style={{ padding: "1px 6px", borderRadius: 4, background: "rgba(100,116,139,.1)", color: "var(--text-dim)", fontSize: 10 }}>Bekliyor</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── PENTEST TAB ──────────────────────────────────────────── */}
      {tab === "pentest" && (
        projects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-dim)" }}>
            Henüz sızma testi projesi oluşturulmamış.
            <div><button onClick={openAddProj} style={{ marginTop: 14, padding: "8px 18px", borderRadius: 8, border: "1px dashed #6366f1", background: "rgba(99,102,241,.06)", color: "#6366f1", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>İlk projeyi oluştur</button></div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {projects.map(p => {
              const ptype = getPType(p.type);
              const isExpanded = expandProj === p.id;
              return (
                <div key={p.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
                  <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(99,102,241,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{ptype.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{p.name}</span>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(99,102,241,.1)", color: "#6366f1" }}>{ptype.label}</span>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(100,116,139,.1)", color: "var(--text-dim)" }}>
                          {PENTEST_STATUSES.find(s => s.value === p.status)?.label ?? p.status}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-dim)", flexWrap: "wrap" }}>
                        {p.tester && <span>👤 {p.tester}</span>}
                        {p.start_date && <span>📅 {new Date(p.start_date).toLocaleDateString("tr-TR")}</span>}
                        {p.finding_count > 0 && (
                          <>
                            <span style={{ color: "#7c3aed", fontWeight: 700 }}>💥 {p.critical_count} Kritik</span>
                            <span style={{ color: "#ef4444" }}>🔴 {p.high_count} Yüksek</span>
                            <span style={{ color: "var(--text-dim)" }}>Toplam {p.finding_count} bulgu</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => loadProjDetail(p.id)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 12, cursor: "pointer" }}>
                        {isExpanded ? "Kapat" : "Bulgular"}
                      </button>
                      <button onClick={() => openEditProj(p)} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 12, cursor: "pointer" }}>Düzenle</button>
                    </div>
                  </div>
                  {isExpanded && projDetail && projDetail.project.id === p.id && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "14px 18px" }}>
                      {/* Scanner section */}
                      <div style={{ marginBottom: 20, background: "rgba(99,102,241,.05)", border: "1px solid rgba(99,102,241,.18)", borderRadius: 10, padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                          <span style={{ fontSize: 18 }}>🔫</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#6366f1" }}>Otomatik Tarama Araçları</span>
                          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>nmap · nikto · CVE lookup</span>
                        </div>
                        <ScannerPanel
                          customerId={customerId}
                          projectId={p.id}
                          onFindingsImported={() => loadProjDetail(p.id)}
                        />
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                          Bulgular ({projDetail.findings.length})
                        </div>
                        <button onClick={openAddFinding} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Bulgu Ekle</button>
                      </div>
                      {projDetail.findings.length === 0 ? (
                        <div style={{ fontSize: 13, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>Henüz bulgu eklenmemiş.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {projDetail.findings.map((f: Finding) => {
                            const sev = getSev(f.severity);
                            return (
                              <div key={f.id} style={{ background: "var(--card2)", borderRadius: 8, padding: "10px 14px", borderLeft: `3px solid ${sev.color}` }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                                      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{f.title}</span>
                                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${sev.color}18`, color: sev.color }}>{sev.label}</span>
                                      {f.cvss_score && <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-dim)" }}>CVSS {f.cvss_score}</span>}
                                    </div>
                                    {f.affected_asset && <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 3 }}>🎯 {f.affected_asset}</div>}
                                    {f.description && <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 3 }}>{f.description}</div>}
                                    {f.remediation && <div style={{ fontSize: 12, color: "#22c55e" }}>✅ {f.remediation}</div>}
                                  </div>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => openEditFinding(f)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 11, cursor: "pointer" }}>Düzenle</button>
                                    <button onClick={() => delFinding(f)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,.3)", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>Sil</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── TEMPLATES TAB ────────────────────────────────────────── */}
      {tab === "templates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Tracking flow info */}
          <div style={{ background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.18)", borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10 }}>📡 Takip Akışı — Nasıl Çalışır?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { step: "1", color: "#6366f1", icon: "✉", label: "E-posta gönderilir", desc: "Her hedef için benzersiz token oluşturulur. E-postada görünmez 1×1 piksel (open tracker) ve tıklanabilir link bulunur.", url: "/api/ph/[TOKEN]/c  →  tıklamayı kaydeder" },
                { step: "2", color: "#3b82f6", icon: "👁", label: "E-posta açılır", desc: "E-posta istemcisi piksel imajı yüklediğinde opened_at kaydedilir.", url: "/api/ph/[TOKEN]/o  →  1×1 şeffaf GIF döner" },
                { step: "3", color: "#f59e0b", icon: "🔗", label: "Linke tıklanır", desc: "clicked_at kaydedilir, kullanıcı sahte login sayfasına yönlendirilir.", url: "/api/ph/[TOKEN]/land  →  kişiselleştirilmiş HTML sayfa" },
                { step: "4", color: "#ef4444", icon: "⚠", label: "Form doldurulur", desc: "Girilen veriler TEST verisi olarak kaydedilir, kullanıcı farkındalık sayfasına yönlendirilir.", url: "/api/ph/[TOKEN]/submit  →  veriyi kaydeder, yönlendirir" },
              ].map(s => (
                <div key={s.step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: `${s.color}20`, color: s.color, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 3 }}>{s.desc}</div>
                    <code style={{ fontSize: 11, fontFamily: "monospace", color: s.color, background: `${s.color}10`, padding: "2px 6px", borderRadius: 4 }}>{s.url}</code>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(99,102,241,.08)", borderRadius: 8, fontSize: 11, color: "var(--text-dim)" }}>
              <strong style={{ color: "#6366f1" }}>Şablon değişkenleri:</strong> {"{{"} NAME {"}}"}  {"{{"} EMAIL {"}}"}  {"{{"} COMPANY {"}}"}  {"{{"} DATE {"}}"}  {"{{TRACKING_PIXEL}}"}  {"{{PHISH_LINK}}"}
            </div>
          </div>

          {/* Email Templates */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 12 }}>
              📧 E-posta Şablonları ({emailTemplates.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {emailTemplates.map(t => (
                <div key={t.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{t.name}</span>
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(233,69,96,.1)", color: "#e94560", fontWeight: 700 }}>
                        {EMAIL_CATS[t.category] ?? t.category}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 2 }}>
                      <strong style={{ color: "var(--text)" }}>Konu:</strong> {t.subject}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                      <strong style={{ color: "var(--text)" }}>Gönderen:</strong> {t.sender_name}
                    </div>
                  </div>
                  {t.html_body && (
                    <button onClick={() => openPreview(t.name, t.html_body!)}
                      style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(233,69,96,.3)", background: "rgba(233,69,96,.06)", color: "#e94560", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                      👁 Önizle
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Page Templates */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 12 }}>
              🌐 Landing Page Şablonları ({pageTemplates.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pageTemplates.map(t => (
                <div key={t.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{t.name}</span>
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(99,102,241,.1)", color: "#6366f1", fontWeight: 700 }}>
                        {PAGE_CATS[t.category] ?? t.category}
                      </span>
                    </div>
                    {t.description && (
                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{t.description}</div>
                    )}
                  </div>
                  {t.html_content && (
                    <button onClick={() => openPreview(t.name, t.html_content!)}
                      style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(99,102,241,.3)", background: "rgba(99,102,241,.06)", color: "#6366f1", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                      👁 Önizle
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Kampanya Modal ───────────────────────────────────────── */}
      {showCampModal && (
        <>
          <div onClick={() => setShowCampModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 400, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(580px,94vw)", zIndex: 401, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.4)" }}>
            <div style={{ background: "linear-gradient(135deg,#7f1d1d,#1a1a2e)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>🎣 Yeni Oltalama Kampanyası</div>
              <button onClick={() => setShowCampModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxHeight: "78vh", overflowY: "auto" }}>
              <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#ef4444" }}>
                ⚠ Bu modül yalnızca müşteri firmasının onayladığı, sözleşmede yer alan tatbikatlar içindir. Yetkisiz kullanım kesinlikle yasaktır.
              </div>
              <div>
                <label style={lbl}>Kampanya Adı *</label>
                <input value={campForm.name} onChange={e => setCampForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Q1 2025 Oltalama Tatbikatı" style={inp} autoFocus />
              </div>
              <div>
                <label style={lbl}>Onay Belgesi Referansı * <span style={{ fontWeight: 400, textTransform: "none", color: "var(--text-dim)" }}>— sözleşme/teklif no veya müşteri onay e-posta tarihi</span></label>
                <input value={campForm.authorization_ref} onChange={e => setCampForm(f => ({ ...f, authorization_ref: e.target.value }))} placeholder="Örn: TKL-2025-0012 veya 2025-03-15 tarihli e-posta" style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={lbl}>E-posta Şablonu</label>
                  <select value={campForm.email_template_id} onChange={e => setCampForm(f => ({ ...f, email_template_id: e.target.value }))} style={inp}>
                    <option value="">— Seçin —</option>
                    {emailTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Landing Page Şablonu</label>
                  <select value={campForm.page_template_id} onChange={e => setCampForm(f => ({ ...f, page_template_id: e.target.value }))} style={inp}>
                    <option value="">— Seçin —</option>
                    {pageTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Gönderen Adı</label>
                  <input value={campForm.sender_name} onChange={e => setCampForm(f => ({ ...f, sender_name: e.target.value }))} placeholder="IT Güvenlik Ekibi" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Farkındalık Yönlendirme URL</label>
                  <input value={campForm.awareness_url} onChange={e => setCampForm(f => ({ ...f, awareness_url: e.target.value }))} placeholder="https://..." style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Hedef Listesi <span style={{ fontWeight: 400, textTransform: "none", color: "var(--text-dim)" }}>— her satır: email, isim, departman</span></label>
                <textarea value={targetText} onChange={e => setTargetText(e.target.value)} rows={6}
                  placeholder={"ali@firma.com, Ali Yılmaz, Finans\nveli@firma.com, Veli Çelik, IT"}
                  style={{ ...inp, resize: "vertical", fontFamily: "monospace", lineHeight: 1.7 }} />
                {targetText.trim() && (
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
                    {targetText.split("\n").filter(l => l.trim()).length} hedef
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowCampModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>İptal</button>
                <button onClick={saveCampaign} disabled={saving || !campForm.name.trim() || !campForm.authorization_ref.trim()}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#e94560", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {saving ? "Oluşturuluyor…" : "Kampanya Oluştur"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Proje Modal ─────────────────────────────────────────── */}
      {showProjModal && (
        <>
          <div onClick={() => setShowProjModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 400, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(540px,94vw)", zIndex: 401, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.4)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{editingProj ? "Projeyi Düzenle" : "Yeni Sızma Testi Projesi"}</div>
              <button onClick={() => setShowProjModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxHeight: "75vh", overflowY: "auto" }}>
              <div>
                <label style={lbl}>Proje Adı *</label>
                <input value={projForm.name} onChange={e => setProjForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Jazz Travel Web Uyg. Sızma Testi 2025" style={inp} autoFocus />
              </div>
              <div>
                <label style={lbl}>Test Türü</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
                  {PENTEST_TYPES.map(t => (
                    <button key={t.value} type="button" onClick={() => setProjForm(f => ({ ...f, type: t.value }))}
                      style={{ padding: "8px 4px", borderRadius: 8, border: `2px solid ${projForm.type === t.value ? "#6366f1" : "var(--border)"}`, background: projForm.type === t.value ? "rgba(99,102,241,.1)" : "transparent", cursor: "pointer", textAlign: "center" as const }}>
                      <div style={{ fontSize: 18 }}>{t.icon}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: projForm.type === t.value ? "#6366f1" : "var(--text-dim)", marginTop: 2 }}>{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={lbl}>Başlangıç Tarihi</label>
                  <input type="date" value={projForm.start_date} onChange={e => setProjForm(f => ({ ...f, start_date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Bitiş Tarihi</label>
                  <input type="date" value={projForm.end_date} onChange={e => setProjForm(f => ({ ...f, end_date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Tester</label>
                  <input value={projForm.tester} onChange={e => setProjForm(f => ({ ...f, tester: e.target.value }))} placeholder="Testi yapacak kişi" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Durum</label>
                  <select value={projForm.status} onChange={e => setProjForm(f => ({ ...f, status: e.target.value }))} style={inp}>
                    {PENTEST_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Kapsam</label>
                <textarea value={projForm.scope} onChange={e => setProjForm(f => ({ ...f, scope: e.target.value }))} rows={2} placeholder="IP aralıkları, URL'ler, test edilecek sistemler…" style={{ ...inp, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
              </div>
              <div>
                <label style={lbl}>Onay Belgesi Referansı</label>
                <input value={projForm.authorization_ref} onChange={e => setProjForm(f => ({ ...f, authorization_ref: e.target.value }))} placeholder="Sözleşme / SOW no" style={inp} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowProjModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>İptal</button>
                <button onClick={saveProject} disabled={saving || !projForm.name.trim()}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {saving ? "Kaydediliyor…" : editingProj ? "Güncelle" : "Proje Oluştur"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Bulgu Modal ─────────────────────────────────────────── */}
      {showFindingModal && (
        <>
          <div onClick={() => setShowFindingModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 400, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(580px,94vw)", zIndex: 401, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.4)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{editingFinding ? "Bulguyu Düzenle" : "Yeni Bulgu"}</div>
              <button onClick={() => setShowFindingModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxHeight: "78vh", overflowY: "auto" }}>
              <div>
                <label style={lbl}>Bulgu Başlığı *</label>
                <input value={findingForm.title} onChange={e => setFindingForm(f => ({ ...f, title: e.target.value }))} placeholder="Örn: SQL Injection — /login endpoint" style={inp} autoFocus />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ gridColumn: "1/3" }}>
                  <label style={lbl}>Şiddet</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {SEVERITIES.map(s => (
                      <button key={s.value} type="button" onClick={() => setFindingForm(f => ({ ...f, severity: s.value }))}
                        style={{ flex: 1, padding: "7px 4px", borderRadius: 7, border: `2px solid ${findingForm.severity === s.value ? s.color : "var(--border)"}`, background: findingForm.severity === s.value ? `${s.color}18` : "transparent", cursor: "pointer", fontSize: 11, fontWeight: 700, color: findingForm.severity === s.value ? s.color : "var(--text-dim)" }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={lbl}>CVSS Skoru</label>
                  <input type="number" min="0" max="10" step="0.1" value={findingForm.cvss_score} onChange={e => setFindingForm(f => ({ ...f, cvss_score: e.target.value }))} placeholder="0.0–10.0" style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Etkilenen Varlık</label>
                <input value={findingForm.affected_asset} onChange={e => setFindingForm(f => ({ ...f, affected_asset: e.target.value }))} placeholder="192.168.1.10, https://app.firma.com/login" style={inp} />
              </div>
              <div>
                <label style={lbl}>Açıklama</label>
                <textarea value={findingForm.description} onChange={e => setFindingForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Zafiyet detayı, nasıl tespit edildi…" style={{ ...inp, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
              </div>
              <div>
                <label style={lbl}>Kanıt (PoC)</label>
                <textarea value={findingForm.poc} onChange={e => setFindingForm(f => ({ ...f, poc: e.target.value }))} rows={3} placeholder="curl komutu, ekran görüntüsü açıklaması, payload…" style={{ ...inp, resize: "vertical", fontFamily: "monospace", lineHeight: 1.6, fontSize: 12 }} />
              </div>
              <div>
                <label style={lbl}>Giderim Önerisi</label>
                <textarea value={findingForm.remediation} onChange={e => setFindingForm(f => ({ ...f, remediation: e.target.value }))} rows={2} placeholder="Nasıl giderilecek, hangi yapılandırma/yama…" style={{ ...inp, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowFindingModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>İptal</button>
                <button onClick={saveFinding} disabled={saving || !findingForm.title.trim()}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {saving ? "Kaydediliyor…" : editingFinding ? "Güncelle" : "Bulgu Ekle"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Preview Modal ────────────────────────────────────────── */}
      {previewHtml && (
        <>
          <div onClick={() => setPreviewHtml(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 500, backdropFilter: "blur(3px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(860px,96vw)", zIndex: 501, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,.5)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>👁 Önizleme — {previewTitle}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Örnek verilerle gösteriliyor</span>
                <button onClick={() => setPreviewHtml(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 20, lineHeight: 1 }}>×</button>
              </div>
            </div>
            <iframe
              srcDoc={previewHtml}
              sandbox="allow-same-origin allow-forms"
              style={{ width: "100%", height: "70vh", border: "none", display: "block", background: "#fff" }}
              title={previewTitle}
            />
          </div>
        </>
      )}
    </>
  );
}
