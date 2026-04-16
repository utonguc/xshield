"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type SearchResult = {
  id: string;
  type: "patient" | "doctor" | "appointment" | "task";
  title: string;
  subtitle: string;
  href: string;
};

type SearchData = {
  patients: SearchResult[];
  doctors: SearchResult[];
  appointments: SearchResult[];
  tasks: SearchResult[];
};

const TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  patient:     { label: "Hasta",    icon: "♥", color: "#1d4ed8", bg: "#eff8ff" },
  doctor:      { label: "Doktor",   icon: "✚", color: "#059669", bg: "#f0fdf4" },
  appointment: { label: "Randevu",  icon: "◷", color: "#7c3aed", bg: "#f5f3ff" },
  task:        { label: "Görev",    icon: "✓", color: "#d97706", bg: "#fffbeb" },
};

function flattenResults(data: SearchData): SearchResult[] {
  return [
    ...data.patients,
    ...data.doctors,
    ...data.appointments,
    ...data.tasks,
  ];
}

export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}

export default function GlobalSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router  = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`/Search?q=${encodeURIComponent(q)}&limit=4`);
      if (res.ok) {
        const data: SearchData = await res.json();
        setResults(flattenResults(data));
        setSelected(0);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 280);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) navigate(results[selected].href);
    if (e.key === "Escape") onClose();
  };

  if (!open) return null;

  const QUICK_LINKS = [
    { href: "/patients",     label: "Hastalar",      icon: "♥" },
    { href: "/appointments", label: "Randevular",    icon: "◷" },
    { href: "/tasks",        label: "Görevler",      icon: "✓" },
    { href: "/dashboard",    label: "Dashboard",     icon: "▦" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
          zIndex: 200, backdropFilter: "blur(3px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)",
        width: "min(600px, 90vw)", zIndex: 201,
        background: "var(--surface, #fff)",
        borderRadius: 20, overflow: "hidden",
        boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
        border: "1px solid var(--border, #eaecf0)",
      }}>

        {/* Search input row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 18px",
          borderBottom: `1px solid ${query || results.length ? "var(--border,#eaecf0)" : "transparent"}`,
        }}>
          <span style={{ fontSize: 18, color: "#94a3b8", flexShrink: 0 }}>
            {loading ? (
              <span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }}>◌</span>
            ) : "⌕"}
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hasta, doktor, randevu veya görev ara..."
            style={{
              flex: 1, border: "none", outline: "none", fontSize: 15,
              background: "transparent", color: "var(--text, #0f172a)",
            }}
          />
          <kbd style={{
            padding: "2px 7px", borderRadius: 6, fontSize: 11, fontWeight: 700,
            background: "#f1f5f9", color: "#94a3b8", border: "1px solid #e2e8f0",
            flexShrink: 0,
          }}>ESC</kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div style={{ maxHeight: 360, overflowY: "auto", padding: "8px 0" }}>
            {results.map((r, i) => {
              const meta = TYPE_META[r.type] ?? TYPE_META.patient;
              return (
                <div
                  key={r.id}
                  onClick={() => navigate(r.href)}
                  onMouseEnter={() => setSelected(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 18px", cursor: "pointer",
                    background: i === selected ? "#f8fafc" : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: meta.bg, color: meta.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 700,
                  }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text, #101828)" }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: "#667085", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subtitle}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                    background: meta.bg, color: meta.color, flexShrink: 0,
                  }}>{meta.label}</span>
                </div>
              );
            })}
          </div>
        ) : query.length >= 2 && !loading ? (
          <div style={{ padding: "32px 18px", textAlign: "center", color: "#98a2b3", fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⌕</div>
            &quot;{query}&quot; için sonuç bulunamadı
          </div>
        ) : !query ? (
          /* Quick links shown when no query */
          <div style={{ padding: "12px 10px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", padding: "4px 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Hızlı Erişim
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 6 }}>
              {QUICK_LINKS.map(l => (
                <div
                  key={l.href}
                  onClick={() => navigate(l.href)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{l.icon}</span>
                  <span style={{ fontSize: 13, color: "var(--text-2, #344054)", fontWeight: 500 }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Footer hint */}
        <div style={{
          padding: "8px 18px", borderTop: "1px solid var(--border,#eaecf0)",
          display: "flex", gap: 16, fontSize: 11, color: "#94a3b8",
        }}>
          <span><kbd style={{ padding: "1px 5px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 4, color: "#64748b" }}>↑↓</kbd> seçim</span>
          <span><kbd style={{ padding: "1px 5px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 4, color: "#64748b" }}>↵</kbd> git</span>
          <span><kbd style={{ padding: "1px 5px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 4, color: "#64748b" }}>Ctrl+K</kbd> aç/kapat</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
