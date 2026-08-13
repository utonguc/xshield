"use client";
import { useState, useEffect, useRef } from "react";

type ScanJob = {
  id: number; target: string; scan_type: string; status: string;
  created_at: string; started_at: string | null; completed_at: string | null;
};
type ScanFinding = {
  title: string; severity: string; cvss_score: number | null; cve: string | null;
  affected_asset: string; description: string; exploit_refs: string | null;
  remediation: string; verified: boolean;
};
type ScanDetail = ScanJob & { output: string; findings_json: ScanFinding[] };

const SCAN_TYPES = [
  { value: "discovery",  label: "🔍 Keşif",          desc: "Port + servis + OS tespiti (nmap -sV -O)" },
  { value: "vuln",       label: "🔓 Zafiyet",         desc: "CVE doğrulama (nmap --script vuln)" },
  { value: "web",        label: "🌐 Web Uygulama",    desc: "HTTP tarama + teknoloji tespiti (nikto + whatweb)" },
  { value: "ssl",        label: "🔒 SSL/TLS",         desc: "Sertifika + şifre zayıflıkları (nmap ssl-*)" },
  { value: "subdomains", label: "🌍 Alt Alanlar",     desc: "Subdomain keşfi + HTTP probe (subfinder + httpx)" },
  { value: "fuzz",       label: "💣 Dizin Tarama",    desc: "Gizli dizin/dosya keşfi (ffuf + common.txt)" },
  { value: "nuclei",     label: "☢️ Nuclei",          desc: "CVE şablon taraması — kritik/yüksek/orta (nuclei)" },
  { value: "full",       label: "⚡ Tam Tarama",       desc: "Tüm araçlar sırayla — 20-40 dk" },
];
const SEV: Record<string, { label: string; color: string }> = {
  critical: { label: "Kritik",  color: "#7c3aed" },
  high:     { label: "Yüksek", color: "#ef4444" },
  medium:   { label: "Orta",   color: "#f59e0b" },
  low:      { label: "Düşük",  color: "#22c55e" },
  info:     { label: "Bilgi",  color: "#6366f1" },
};
function getSev(v: string) { return SEV[v] ?? SEV.info; }

export default function ScannerPanel({
  customerId, projectId,
  onFindingsImported,
}: {
  customerId: number;
  projectId: number;
  onFindingsImported: () => void;
}) {
  const [jobs, setJobs]           = useState<ScanJob[]>([]);
  const [target, setTarget]       = useState("");
  const [scanType, setScanType]   = useState("discovery");
  const [running, setRunning]     = useState(false);
  const [stopping, setStopping]   = useState(false);
  const [activeSid, setActiveSid] = useState<number | null>(null);
  const [detail, setDetail]       = useState<ScanDetail | null>(null);
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toast = (text: string, ok: boolean) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); };
  const base = `/api/customers/${customerId}/pentest/${projectId}`;

  const loadJobs = async () => {
    const r = await fetch(`${base}/scan`);
    if (r.ok) setJobs(await r.json());
  };

  useEffect(() => { loadJobs(); }, []);

  const stopScan = async () => {
    if (!activeSid) return;
    setStopping(true);
    try {
      await fetch(`${base}/scan/${activeSid}`, { method: "PATCH" });
      toast("Tarama durdurma isteği gönderildi.", true);
    } catch { /* ignore */ } finally {
      setStopping(false);
    }
  };

  const startScan = async () => {
    if (!target.trim()) return;
    setRunning(true);
    try {
      const res = await fetch(`${base}/scan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target.trim(), scan_type: scanType }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();
      setActiveSid(id);
      toast("Tarama başlatıldı.", true);
      await loadJobs();
    } catch (e: any) { toast(e.message, false); setRunning(false); }
  };

  const loadDetail = async (sid: number) => {
    setActiveSid(sid);
    setSelected(new Set());
    const r = await fetch(`${base}/scan/${sid}`);
    if (r.ok) {
      const d = await r.json();
      setDetail(d);
      if (d.status === "running") setRunning(true);
    }
  };

  // Poll active scan
  useEffect(() => {
    if (!activeSid) return;
    const poll = async () => {
      const r = await fetch(`${base}/scan/${activeSid}`);
      if (!r.ok) return;
      const d: ScanDetail = await r.json();
      setDetail(d);
      if (d.status !== "running" && d.status !== "pending") {
        setRunning(false);
        setStopping(false);
        clearInterval(pollRef.current!);
        loadJobs();
      }
    };
    poll();
    pollRef.current = setInterval(poll, 2500);
    return () => clearInterval(pollRef.current!);
  }, [activeSid]);

  // Auto-scroll terminal
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [detail?.output]);

  const deleteScan = async (sid: number) => {
    await fetch(`${base}/scan/${sid}`, { method: "DELETE" });
    if (activeSid === sid) { setActiveSid(null); setDetail(null); }
    await loadJobs();
  };

  const importFindings = async () => {
    if (!detail) return;
    setImporting(true);
    try {
      const indices = selected.size ? [...selected] : undefined;
      const res = await fetch(`${base}/scan/${detail.id}/import`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indices }),
      });
      const data = await res.json();
      toast(`${data.imported} bulgu projeye aktarıldı.`, true);
      setSelected(new Set());
      onFindingsImported();
    } catch (e: any) { toast(e.message, false); }
    finally { setImporting(false); }
  };

  const inp: React.CSSProperties = {
    background: "var(--input-bg)", border: "1px solid var(--input-border)",
    borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 13,
    outline: "none", width: "100%",
  };
  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "var(--section-title)",
    textTransform: "uppercase" as const, letterSpacing: "0.06em",
    display: "block", marginBottom: 5,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {msg && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999, padding: "10px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: msg.ok ? "#16a34a" : "#dc2626", color: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
          {msg.text}
        </div>
      )}

      {/* Start scan form */}
      <div style={{ background: "var(--card2)", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 12 }}>
          🔫 Yeni Tarama
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={lbl}>Hedef (IP veya URL)</label>
            <input
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="192.168.1.10 veya https://firma.com"
              style={inp}
              onKeyDown={e => e.key === "Enter" && !running && startScan()}
            />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Tarama Türü</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 6 }}>
            {SCAN_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setScanType(t.value)}
                style={{
                  padding: "8px 10px", borderRadius: 8, textAlign: "left" as const, cursor: "pointer",
                  border: `2px solid ${scanType === t.value ? "#6366f1" : "var(--border)"}`,
                  background: scanType === t.value ? "rgba(99,102,241,.08)" : "transparent",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: scanType === t.value ? "#6366f1" : "var(--text)" }}>{t.label}</div>
                <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={startScan}
            disabled={running || !target.trim()}
            style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: running ? "#374151" : "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700, cursor: running ? "default" : "pointer" }}
          >
            {running ? "⏳ Tarama Devam Ediyor…" : "🚀 Taramayı Başlat"}
          </button>
          {running && activeSid && (
            <button
              onClick={stopScan}
              disabled={stopping}
              style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #ef4444", background: "transparent", color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: stopping ? "default" : "pointer" }}
            >
              {stopping ? "⏳ Durduruluyor…" : "⏹ Durdur"}
            </button>
          )}
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
            ⚠ Yalnızca yetkili sistemlerde kullanın
          </div>
        </div>
      </div>

      {/* Job list */}
      {jobs.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>
            Geçmiş Taramalar
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {jobs.map(j => {
              const statusColor = j.status === "completed" ? "#22c55e" : j.status === "failed" ? "#ef4444" : j.status === "running" ? "#3b82f6" : j.status === "cancelled" ? "#f59e0b" : "#64748b";
              return (
                <div
                  key={j.id}
                  onClick={() => loadDetail(j.id)}
                  style={{
                    background: activeSid === j.id ? "rgba(99,102,241,.08)" : "var(--card2)",
                    border: `1px solid ${activeSid === j.id ? "#6366f1" : "var(--border)"}`,
                    borderRadius: 8, padding: "8px 12px",
                    display: "flex", alignItems: "center", gap: 10,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, padding: "2px 6px", borderRadius: 4, background: `${statusColor}18`, flexShrink: 0 }}>
                    {j.status === "running" ? "●" : j.status === "completed" ? "✓" : j.status === "failed" ? "✕" : j.status === "cancelled" ? "◉" : "○"} {j.status}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text)", fontFamily: "monospace", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {j.target}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }}>
                    {SCAN_TYPES.find(t => t.value === j.scan_type)?.label ?? j.scan_type}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }}>
                    {new Date(j.created_at).toLocaleDateString("tr-TR")}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteScan(j.id); }}
                    style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid rgba(239,68,68,.3)", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer", flexShrink: 0 }}
                  >
                    Sil
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active scan detail */}
      {detail && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Terminal output */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                Terminal Çıktısı
                {detail.status === "running" && (
                  <span style={{ marginLeft: 8, fontSize: 10, color: "#3b82f6", animation: "pulse 1s infinite" }}>● CANLI</span>
                )}
              </div>
              {detail.completed_at && (
                <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                  Süre: {Math.round((new Date(detail.completed_at).getTime() - new Date(detail.started_at!).getTime()) / 1000)}s
                </span>
              )}
            </div>
            <div
              ref={termRef}
              style={{
                background: "#0a0a0f", borderRadius: 10, padding: "12px 14px",
                fontFamily: "monospace", fontSize: 11, lineHeight: 1.6,
                color: "#a3e635", maxHeight: 320, overflowY: "auto",
                border: "1px solid rgba(163,230,53,.15)",
                whiteSpace: "pre-wrap", wordBreak: "break-all",
              }}
            >
              {detail.output || "Başlatılıyor…"}
            </div>
          </div>

          {/* Findings */}
          {detail.status === "completed" && detail.findings_json.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                  Tespit Edilen Bulgular ({detail.findings_json.length})
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => setSelected(selected.size === detail.findings_json.length ? new Set() : new Set(detail.findings_json.map((_, i) => i)))}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 11, cursor: "pointer" }}
                  >
                    {selected.size === detail.findings_json.length ? "Seçimi Kaldır" : "Tümünü Seç"}
                  </button>
                  <button
                    onClick={importFindings}
                    disabled={importing || selected.size === 0}
                    style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: selected.size > 0 ? "#6366f1" : "#374151", color: "#fff", fontSize: 11, fontWeight: 700, cursor: selected.size > 0 ? "pointer" : "default" }}
                  >
                    {importing ? "Aktarılıyor…" : `📥 Projeye Aktar${selected.size > 0 ? ` (${selected.size})` : ""}`}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {detail.findings_json.map((f, i) => {
                  const sev = getSev(f.severity);
                  const isSelected = selected.has(i);
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        const next = new Set(selected);
                        isSelected ? next.delete(i) : next.add(i);
                        setSelected(next);
                      }}
                      style={{
                        background: isSelected ? "rgba(99,102,241,.07)" : "var(--card2)",
                        border: `1px solid ${isSelected ? "#6366f1" : "var(--border)"}`,
                        borderLeft: `3px solid ${sev.color}`,
                        borderRadius: 8, padding: "10px 14px", cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ marginTop: 2, flexShrink: 0, cursor: "pointer" }}
                          onClick={e => e.stopPropagation()}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{f.title}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${sev.color}18`, color: sev.color }}>{sev.label}</span>
                            {f.cvss_score && (
                              <span style={{ fontSize: 10, fontFamily: "monospace", color: sev.color }}>CVSS {f.cvss_score}</span>
                            )}
                            {f.cve && (
                              <span style={{ fontSize: 10, fontFamily: "monospace", color: "#6366f1", background: "rgba(99,102,241,.1)", padding: "1px 6px", borderRadius: 4 }}>{f.cve}</span>
                            )}
                            {f.verified && (
                              <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>● Doğrulandı</span>
                            )}
                            {f.affected_asset && f.affected_asset !== detail.target && (
                              <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "monospace", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {f.affected_asset}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>{f.description.substring(0, 350)}{f.description.length > 350 ? "…" : ""}</div>
                          {f.exploit_refs && (
                            <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 3 }}>
                              ⚡ Exploit: {f.exploit_refs.split("\n").map((url, ei) => (
                                <a key={ei} href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#f59e0b", marginLeft: 4 }} onClick={e => e.stopPropagation()}>{url.split("/").slice(-1)[0] || url}</a>
                              ))}
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: "#22c55e" }}>✅ {f.remediation}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {detail.status === "completed" && detail.findings_json.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-dim)", fontSize: 13 }}>
              ✅ Tarama tamamlandı — kritik bulgu tespit edilmedi.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
