"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { inp } from "@/lib/ui";
import { fmtDateTime, fmtTime, utcToLocal, localToUtc } from "@/lib/tz";

type Req = {
  id: string;
  doctorName: string;
  doctorBranch: string;
  requestedStartUtc: string;
  requestedEndUtc: string;
  procedureName: string;
  patientFirstName: string;
  patientLastName: string;
  patientPhone: string;
  patientEmail: string;
  patientNotes: string;
  status: string;
  rejectionReason: string;
  createdAtUtc: string;
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  Pending:  { label: "Bekliyor",  color: "#92400e", bg: "#fffbeb" },
  Approved: { label: "Onaylandı", color: "#065f46", bg: "#f0fdf4" },
  Rejected: { label: "Reddedildi",color: "#b42318", bg: "#fef3f2" },
};

// timezone helpers are imported from @/lib/tz

function ReviewModal({
  req, onClose, onDone,
}: {
  req: Req;
  onClose: () => void;
  onDone: () => void;
}) {
  const [action, setAction]     = useState<"approve" | "reject">("approve");
  const [reason, setReason]     = useState("");
  const [procedure, setProcedure] = useState(req.procedureName);
  const [startUtc, setStartUtc] = useState(utcToLocal(req.requestedStartUtc));
  const [endUtc, setEndUtc]     = useState(utcToLocal(req.requestedEndUtc));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setSaving(true);
    setErr("");
    try {
      const body: Record<string, unknown> = { action };
      if (action === "approve") {
        body.procedureName = procedure;
        body.startAtUtc = localToUtc(startUtc);
        body.endAtUtc   = localToUtc(endUtc);
      } else {
        body.rejectionReason = reason;
      }
      const res = await apiFetch(`/AppointmentRequests/${req.id}/review`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Hata oluştu.");
      }
      onDone();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--surface, #fff)", borderRadius: 20,
        padding: "24px 20px", width: "100%", maxWidth: 520,
        boxShadow: "0 24px 48px rgba(16,24,40,0.18)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Talep İncele</div>
        <div style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>
          {req.patientFirstName} {req.patientLastName} · {req.doctorName}
        </div>

        {/* Patient info */}
        <div style={{
          background: "var(--surface-2, #f8fafc)", borderRadius: 12, padding: 16, marginBottom: 20,
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13,
        }}>
          <div><span style={{ color: "#64748b" }}>Hasta:</span> <strong>{req.patientFirstName} {req.patientLastName}</strong></div>
          <div><span style={{ color: "#64748b" }}>İşlem:</span> {req.procedureName}</div>
          <div><span style={{ color: "#64748b" }}>Telefon:</span> {req.patientPhone || "—"}</div>
          <div><span style={{ color: "#64748b" }}>E-posta:</span> {req.patientEmail || "—"}</div>
          <div style={{ gridColumn: "span 2" }}>
            <span style={{ color: "#64748b" }}>İstenen Saat:</span> {fmtDateTime(req.requestedStartUtc)} – {fmtTime(req.requestedEndUtc)}
          </div>
          {req.patientNotes && (
            <div style={{ gridColumn: "span 2" }}>
              <span style={{ color: "#64748b" }}>Not:</span> {req.patientNotes}
            </div>
          )}
        </div>

        {/* Action tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["approve", "reject"] as const).map(a => (
            <button key={a} onClick={() => setAction(a)} style={{
              flex: 1, minHeight: 48, borderRadius: 12, fontWeight: 700, fontSize: 14,
              border: action === a
                ? (a === "approve" ? "2px solid #16a34a" : "2px solid #dc2626")
                : "2px solid #e4e7ec",
              background: action === a
                ? (a === "approve" ? "#f0fdf4" : "#fef2f2")
                : "transparent",
              color: action === a
                ? (a === "approve" ? "#16a34a" : "#dc2626")
                : "#64748b",
              cursor: "pointer",
            }}>
              {a === "approve" ? "✓ Onayla" : "✕ Reddet"}
            </button>
          ))}
        </div>

        {action === "approve" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 4 }}>İşlem Adı</label>
              <input value={procedure} onChange={e => setProcedure(e.target.value)} style={inp} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 4 }}>Başlangıç</label>
                <input type="datetime-local" value={startUtc} onChange={e => setStartUtc(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 4 }}>Bitiş</label>
                <input type="datetime-local" value={endUtc} onChange={e => setEndUtc(e.target.value)} style={inp} />
              </div>
            </div>
          </div>
        )}

        {action === "reject" && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 4 }}>Red Sebebi (isteğe bağlı)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Hastaya iletilecek açıklama..." style={{ ...inp, resize: "vertical" }} />
          </div>
        )}

        {err && (
          <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button onClick={onClose} style={{
            flex: 1, minHeight: 48, borderRadius: 12, border: "1px solid #e4e7ec",
            background: "transparent", color: "var(--text-2, #344054)", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>İptal</button>
          <button onClick={submit} disabled={saving} style={{
            flex: 2, minHeight: 48, borderRadius: 12, border: "none",
            background: action === "approve" ? "#16a34a" : "#dc2626",
            color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "İşleniyor..." : (action === "approve" ? "Onayla ve Randevu Oluştur" : "Reddet")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"all" | "Pending" | "Approved" | "Rejected">("Pending");
  const [selected, setSelected] = useState<Req | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = filter === "all" ? "" : filter;
      const [res, countRes] = await Promise.all([
        apiFetch(`/AppointmentRequests${status ? `?status=${status}` : ""}`),
        apiFetch("/AppointmentRequests/count-pending"),
      ]);
      if (res.ok) setRequests(await res.json());
      if (countRes.ok) { const d = await countRes.json(); setPendingCount(d.count ?? 0); }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleDone = () => {
    setSelected(null);
    load();
  };

  return (
    <AppShell title="Randevu İstekleri" description="Online rezervasyon taleplerini incele ve onayla">
      {selected && (
        <ReviewModal
          req={selected}
          onClose={() => setSelected(null)}
          onDone={handleDone}
        />
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {([
          { key: "Pending",  label: "Bekleyenler",  count: pendingCount as number | undefined },
          { key: "Approved", label: "Onaylananlar",  count: undefined },
          { key: "Rejected", label: "Reddedilenler", count: undefined },
          { key: "all",      label: "Tümü",          count: undefined },
        ] as const).map(({ key, label, count }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: "8px 16px", borderRadius: 10, fontWeight: 600, fontSize: 13,
            border: filter === key ? "2px solid #1d4ed8" : "2px solid #e4e7ec",
            background: filter === key ? "#eff6ff" : "transparent",
            color: filter === key ? "#1d4ed8" : "#64748b",
            cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {label}
            {count !== undefined && count > 0 && (
              <span style={{
                background: "#dc2626", color: "#fff", borderRadius: 999,
                fontSize: 10, fontWeight: 800, padding: "1px 6px", minWidth: 16, textAlign: "center",
              }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Yükleniyor...</div>
      ) : requests.length === 0 ? (
        <div style={{
          background: "var(--surface, #fff)", borderRadius: 16, padding: 60,
          textAlign: "center", border: "1px solid var(--border, #eaecf0)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
            {filter === "Pending" ? "Bekleyen talep yok" : "Sonuç bulunamadı"}
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            {filter === "Pending" ? "Tüm talepler işlenmiş." : "Filtre değiştirerek tekrar deneyin."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {requests.map(r => {
            const s = STATUS_MAP[r.status] ?? STATUS_MAP.Pending;
            return (
              <div key={r.id} style={{
                background: "var(--surface, #fff)", borderRadius: 16, padding: "18px 20px",
                border: "1px solid var(--border, #eaecf0)",
                display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
              }}>
                {/* Status indicator */}
                <div style={{
                  width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                  background: r.status === "Pending" ? "#f59e0b" : r.status === "Approved" ? "#16a34a" : "#dc2626",
                }} />

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {r.patientFirstName} {r.patientLastName}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>👨‍⚕️ {r.doctorName}</span>
                    <span>💊 {r.procedureName}</span>
                    {r.patientPhone && <span>📞 {r.patientPhone}</span>}
                  </div>
                </div>

                {/* Date */}
                <div style={{ fontSize: 13, color: "#475569", textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontWeight: 600 }}>{fmtDateTime(r.requestedStartUtc)}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    – {fmtTime(r.requestedEndUtc)}
                  </div>
                </div>

                {/* Status badge */}
                <span style={{
                  padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  background: s.bg, color: s.color, flexShrink: 0,
                }}>{s.label}</span>

                {/* Action */}
                {r.status === "Pending" ? (
                  <button onClick={() => setSelected(r)} style={{
                    minHeight: 48, padding: "12px 20px", borderRadius: 12, border: "none",
                    background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 14,
                    cursor: "pointer", flexShrink: 0,
                  }}>
                    İncele
                  </button>
                ) : (
                  <button onClick={() => setSelected(r)} style={{
                    minHeight: 48, padding: "12px 20px", borderRadius: 12, border: "1px solid #e4e7ec",
                    background: "transparent", color: "#475569", fontWeight: 600, fontSize: 14,
                    cursor: "pointer", flexShrink: 0,
                  }}>
                    Detay
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
