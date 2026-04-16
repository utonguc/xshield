"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/tz";

type AuditEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  changesJson?: string;
  ipAddress?: string;
  createdAtUtc: string;
  userName: string;
  userRole?: string;
};

type Changes = Record<string, [unknown, unknown]>;

const ACTION_META: Record<string, { label: string; color: string; bg: string }> = {
  Created:       { label: "Oluşturuldu",   color: "#065f46", bg: "#f0fdf4" },
  Updated:       { label: "Güncellendi",   color: "#1d4ed8", bg: "#eff8ff" },
  Deleted:       { label: "Silindi",       color: "#b42318", bg: "#fef3f2" },
  StatusChanged: { label: "Durum Değişti", color: "#92400e", bg: "#fffbeb" },
  Login:         { label: "Giriş",         color: "#7c3aed", bg: "#f5f3ff" },
  PasswordChanged:{ label: "Şifre Değişti",color: "#0e7490", bg: "#f0f9ff" },
  Approved:      { label: "Onaylandı",     color: "#065f46", bg: "#f0fdf4" },
  Rejected:      { label: "Reddedildi",    color: "#b42318", bg: "#fef3f2" },
};

const ENTITY_LABELS: Record<string, string> = {
  Patient: "Hasta", Invoice: "Fatura", Appointment: "Randevu",
  Doctor: "Doktor", User: "Kullanıcı", Document: "Belge",
  StockItem: "Stok", Asset: "Demirbaş", Survey: "Anket",
  AppointmentRequest: "Randevu İsteği", ClinicWebsite: "Web Sitesi",
  TaskItem: "Görev", WhatsAppLog: "WhatsApp",
};

function fmtDt(utc: string) { return fmtDateTime(utc); }

function ChangesDetail({ json }: { json: string }) {
  let changes: Changes;
  try { changes = JSON.parse(json); } catch { return null; }

  const entries = Object.entries(changes);
  if (entries.length === 0) return null;

  return (
    <div style={{
      marginTop: 8, padding: "10px 14px", background: "var(--surface-2, #f8fafc)",
      borderRadius: 8, border: "1px solid #eaecf0", fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, color: "#475569", marginBottom: 6 }}>Değişiklikler</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {entries.map(([field, [oldVal, newVal]]) => (
          <div key={field} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ color: "#94a3b8", minWidth: 120, flexShrink: 0 }}>{field}</span>
            <span style={{ color: "#b42318", textDecoration: "line-through" }}>
              {oldVal !== null && oldVal !== undefined ? String(oldVal) : "—"}
            </span>
            <span style={{ color: "#94a3b8" }}>→</span>
            <span style={{ color: "#059669", fontWeight: 600 }}>
              {newVal !== null && newVal !== undefined ? String(newVal) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuditPage() {
  const [entries, setEntries]     = useState<AuditEntry[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch]       = useState("");
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (entityFilter) qs.set("entityType", entityFilter);
      if (actionFilter) qs.set("action", actionFilter);
      if (search)       qs.set("search", search);
      const res = await apiFetch(`/Audit?${qs}`);
      if (res.ok) {
        const d = await res.json();
        setEntries(d.items ?? []);
        setTotal(d.total ?? 0);
      }
    } finally { setLoading(false); }
  }, [page, entityFilter, actionFilter, search]);

  useEffect(() => {
    apiFetch("/Audit/entity-types").then(r => r.ok ? r.json() : []).then(setEntityTypes);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AppShell title="Denetim Günlüğü" description="Sistemde gerçekleştirilen tüm işlemlerin kaydı">

      {/* Filters */}
      <div style={{
        background: "var(--surface, #fff)", borderRadius: 16,
        border: "1px solid var(--border, #eaecf0)", padding: "16px 20px",
        marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
      }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Kullanıcı veya açıklama ara..."
          style={{
            flex: "1 1 220px", padding: "8px 12px", borderRadius: 8,
            border: "1px solid #d0d5dd", fontSize: 13,
          }}
        />
        <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(1); }} style={{
          padding: "8px 12px", borderRadius: 8, border: "1px solid #d0d5dd", fontSize: 13, minWidth: 160,
        }}>
          <option value="">Tüm Varlıklar</option>
          {entityTypes.map(t => (
            <option key={t} value={t}>{ENTITY_LABELS[t] ?? t}</option>
          ))}
        </select>
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} style={{
          padding: "8px 12px", borderRadius: 8, border: "1px solid #d0d5dd", fontSize: 13, minWidth: 160,
        }}>
          <option value="">Tüm İşlemler</option>
          {Object.entries(ACTION_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <div style={{ marginLeft: "auto", fontSize: 13, color: "#64748b" }}>
          {total.toLocaleString("tr-TR")} kayıt
        </div>
      </div>

      {/* Log entries */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Yükleniyor...</div>
        ) : entries.length === 0 ? (
          <div style={{
            background: "var(--surface, #fff)", borderRadius: 16, padding: 60,
            textAlign: "center", border: "1px solid var(--border, #eaecf0)",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Kayıt bulunamadı</div>
            <div style={{ color: "#64748b", fontSize: 13 }}>Filtre değiştirerek tekrar deneyin.</div>
          </div>
        ) : entries.map(entry => {
          const meta = ACTION_META[entry.action] ?? { label: entry.action, color: "#667085", bg: "#f2f4f7" };
          const isExpanded = expanded === entry.id;
          return (
            <div
              key={entry.id}
              style={{
                background: "var(--surface, #fff)", borderRadius: 12,
                border: "1px solid var(--border, #eaecf0)",
                padding: "14px 16px", cursor: "pointer",
                transition: "box-shadow 0.1s",
              }}
              onClick={() => setExpanded(isExpanded ? null : entry.id)}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {/* Action badge */}
                <span style={{
                  padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: meta.bg, color: meta.color, flexShrink: 0,
                }}>{meta.label}</span>

                {/* Entity type chip */}
                <span style={{
                  padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: "#f1f5f9", color: "#475569", flexShrink: 0,
                }}>{ENTITY_LABELS[entry.entityType] ?? entry.entityType}</span>

                {/* Description */}
                <span style={{ flex: 1, fontSize: 13, color: "var(--text, #0f172a)", minWidth: 150 }}>
                  {entry.description}
                </span>

                {/* Right side */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)" }}>{entry.userName}</div>
                    {entry.userRole && (
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>{entry.userRole}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
                    {fmtDt(entry.createdAtUtc)}
                  </div>
                  {entry.ipAddress && (
                    <div style={{ fontSize: 10, color: "#cbd5e1", display: "none" }}>{entry.ipAddress}</div>
                  )}
                  {entry.changesJson && (
                    <span style={{ color: "#94a3b8", fontSize: 14 }}>{isExpanded ? "▲" : "▼"}</span>
                  )}
                </div>
              </div>

              {/* Changes detail */}
              {isExpanded && entry.changesJson && (
                <ChangesDetail json={entry.changesJson} />
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e4e7ec", background: page === 1 ? "#f8fafc" : "#fff", cursor: page === 1 ? "default" : "pointer", fontSize: 13, fontWeight: 600 }}
          >←</button>
          <span style={{ padding: "7px 16px", fontSize: 13, color: "#475569" }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e4e7ec", background: page === totalPages ? "#f8fafc" : "#fff", cursor: page === totalPages ? "default" : "pointer", fontSize: 13, fontWeight: 600 }}
          >→</button>
        </div>
      )}
    </AppShell>
  );
}
