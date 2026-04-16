"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { API_BASE_URL, staticUrl } from "@/lib/api";

type Clinic = {
  slug: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  primaryColor: string;
  branches: string[];
  bookingEnabled: boolean;
  heroTitle?: string;
  aboutText?: string;
  instagramUrl?: string;
  whatsAppNumber?: string;
};

async function publicFetch(path: string) {
  return fetch(`${API_BASE_URL}/public${path}`);
}

export default function KliniklerPage() {
  const [clinics,   setClinics]   = useState<Clinic[]>([]);
  const [cities,    setCities]    = useState<string[]>([]);
  const [branches,  setBranches]  = useState<string[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);

  const [q,         setQ]         = useState("");
  const [city,      setCity]      = useState("");
  const [branch,    setBranch]    = useState("");
  const [page,      setPage]      = useState(1);
  const PAGE_SIZE = 12;

  useEffect(() => {
    publicFetch("/clinics/cities").then(r => r.ok ? r.json() : []).then(setCities);
    publicFetch("/clinics/branches").then(r => r.ok ? r.json() : []).then(setBranches);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (q)      qs.set("q",      q);
    if (city)   qs.set("city",   city);
    if (branch) qs.set("branch", branch);
    try {
      const res  = await publicFetch(`/clinics?${qs}`);
      const data = await res.json();
      setClinics(data.items ?? []);
      setTotal(data.total ?? 0);
    } finally { setLoading(false); }
  }, [q, city, branch, page]);

  useEffect(() => { load(); }, [load]);

  const search = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load(); };
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ fontFamily: "Inter, -apple-system, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>

      {/* ── Top bar ── */}
      <div style={{
        background: "#0f172a", padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 900, fontSize: 18, color: "#fff" }}>
          <span style={{ color: "#60a5fa" }}>x</span>Shield{" "}
          <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>e-Clinic</span>
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/demo" style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Ücretsiz Dene
          </Link>
          <Link href="/login" style={{ padding: "8px 16px", borderRadius: 8, background: "#1d4ed8", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Giriş Yap
          </Link>
        </div>
      </div>

      {/* ── Hero / Search ── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        padding: "56px 24px 48px", textAlign: "center",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 12, textTransform: "uppercase", letterSpacing: "1px" }}>
          Klinik Rehberi
        </div>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
          Size en uygun kliniği bulun
        </h1>
        <p style={{ margin: "0 auto 24px", maxWidth: 520, fontSize: 16, color: "#94a3b8" }}>
          Türkiye genelinde {total > 0 ? `${total}+` : "yüzlerce"} klinik arasından şehir, branş ve isme göre arama yapın.
        </p>

        {/* AI Arama Banneri */}
        <Link href="/klinik-bul" style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "linear-gradient(135deg, rgba(109,40,217,0.7), rgba(29,78,216,0.7))",
          border: "1px solid rgba(139,92,246,0.5)",
          borderRadius: 14, padding: "12px 20px", marginBottom: 28,
          textDecoration: "none", backdropFilter: "blur(8px)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.transform = "translateY(-1px)"; el.style.boxShadow = "0 8px 24px rgba(109,40,217,0.4)"; }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.transform = "none"; el.style.boxShadow = "none"; }}
        >
          <span style={{ fontSize: 18 }}>✨</span>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>
            Yapay Zeka ile Ara
          </span>
          <span style={{ color: "#c4b5fd", fontSize: 13 }}>
            — Semptomlarınızı anlatın, AI size uygun kliniği bulsun
          </span>
          <span style={{ color: "#a78bfa", fontSize: 16 }}>→</span>
        </Link>

        {/* Ayraç */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 500, margin: "0 auto 28px" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>veya klasik arama yapın</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
        </div>

        {/* Search form */}
        <form onSubmit={search} style={{
          maxWidth: 700, margin: "0 auto",
          display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
        }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Klinik adı ara..."
            style={{
              flex: "2 1 200px", padding: "12px 16px", borderRadius: 10, border: "none",
              fontSize: 14, background: "#fff", color: "#0f172a", outline: "none",
            }}
          />
          <select value={city} onChange={e => { setCity(e.target.value); setPage(1); }} style={{
            flex: "1 1 140px", padding: "12px 14px", borderRadius: 10, border: "none",
            fontSize: 14, background: "#fff", color: city ? "#0f172a" : "#94a3b8",
          }}>
            <option value="">Tüm Şehirler</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={branch} onChange={e => { setBranch(e.target.value); setPage(1); }} style={{
            flex: "1 1 160px", padding: "12px 14px", borderRadius: 10, border: "none",
            fontSize: 14, background: "#fff", color: branch ? "#0f172a" : "#94a3b8",
          }}>
            <option value="">Tüm Branşlar</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <button type="submit" style={{
            padding: "12px 24px", borderRadius: 10, border: "none",
            background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", flexShrink: 0,
          }}>
            Ara
          </button>
        </form>
      </div>

      {/* ── Results ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>

        {/* Count */}
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
          {loading ? "Yükleniyor..." : `${total} klinik bulundu`}
          {(city || branch || q) && (
            <button onClick={() => { setQ(""); setCity(""); setBranch(""); setPage(1); }} style={{
              marginLeft: 12, fontSize: 12, color: "#1d4ed8", background: "none",
              border: "none", cursor: "pointer", fontWeight: 600,
            }}>
              Filtreleri temizle ×
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 200, borderRadius: 16, background: "#e2e8f0", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : clinics.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏥</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#344054", marginBottom: 8 }}>Klinik bulunamadı</div>
            <div style={{ fontSize: 14 }}>Farklı bir arama terimi veya filtre deneyin.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {clinics.map(c => <ClinicCard key={c.slug} clinic={c} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 40 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={pageBtn(page === 1)}>‹ Önceki</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
              return (
                <button key={p} onClick={() => setPage(p)} style={pageBtn(false, p === page)}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={pageBtn(page === totalPages)}>Sonraki ›</button>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: "1px solid #e2e8f0", padding: "24px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
        © {new Date().getFullYear()} xShield e-Clinic · Klinik bilgileri klinikler tarafından sağlanmaktadır.
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

function ClinicCard({ clinic: c }: { clinic: Clinic }) {
  const color = c.primaryColor || "#1d4ed8";
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: "1px solid #e2e8f0", overflow: "hidden",
      display: "flex", flexDirection: "column",
      transition: "box-shadow 0.2s, transform 0.2s",
    }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; el.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "none"; }}
    >
      {/* Color band + logo */}
      <div style={{ height: 80, background: `linear-gradient(135deg, ${color}22, ${color}44)`, position: "relative", borderBottom: `3px solid ${color}` }}>
        <div style={{
          position: "absolute", bottom: -20, left: 20,
          width: 48, height: 48, borderRadius: 12,
          background: "#fff", border: `2px solid ${color}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 900, color,
          overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}>
          {c.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={staticUrl(c.logoUrl) ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : c.name.charAt(0)}
        </div>
      </div>

      <div style={{ padding: "28px 16px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{c.name}</div>

        {/* Branches */}
        {c.branches.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {c.branches.slice(0, 3).map(b => (
              <span key={b} style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                background: `${color}15`, color, border: `1px solid ${color}30`,
              }}>{b}</span>
            ))}
            {c.branches.length > 3 && (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>+{c.branches.length - 3}</span>
            )}
          </div>
        )}

        {/* Location */}
        {(c.city || c.address) && (
          <div style={{ fontSize: 13, color: "#64748b", display: "flex", gap: 4, alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0 }}>📍</span>
            <span>{[c.address, c.city].filter(Boolean).join(", ")}</span>
          </div>
        )}

        {/* Phone */}
        {c.phone && (
          <div style={{ fontSize: 13, color: "#64748b" }}>
            📞 <a href={`tel:${c.phone}`} style={{ color: "#64748b", textDecoration: "none" }}>{c.phone}</a>
          </div>
        )}

        {/* About snippet */}
        {c.aboutText && (
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {c.aboutText}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Link href={`/site/${c.slug}`} style={{
            flex: 1, padding: "10px", borderRadius: 10, textAlign: "center",
            background: "#f1f5f9", color: "#344054", fontWeight: 700, fontSize: 13,
            textDecoration: "none",
          }}>
            Kliniği Gör
          </Link>
          {c.bookingEnabled && (
            <Link href={`/site/${c.slug}/book`} style={{
              flex: 1, padding: "10px", borderRadius: 10, textAlign: "center",
              background: color, color: "#fff", fontWeight: 700, fontSize: 13,
              textDecoration: "none",
            }}>
              Randevu Al
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

const pageBtn = (disabled: boolean, active = false): React.CSSProperties => ({
  padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
  background: active ? "#1d4ed8" : "#fff",
  color: active ? "#fff" : disabled ? "#d1d5db" : "#344054",
  fontWeight: 600, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
});
