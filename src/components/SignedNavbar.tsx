"use client";
import { useState, useEffect } from "react";

const links = [
  { label: "Özellikler", href: "#ozellikler" },
  { label: "Fiyatlandırma", href: "#fiyat" },
  { label: "Demo Talep Et", href: "#iletisim" },
];

export default function SignedNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      transition: "all 0.3s ease",
      background: scrolled ? "rgba(6,13,31,0.93)" : "transparent",
      backdropFilter: scrolled ? "blur(14px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(139,92,246,0.15)" : "1px solid transparent",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
        <a href="https://xshield.com.tr" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 36, height: 36,
            background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
            borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 16, color: "#fff",
          }}>S</div>
          <span style={{ fontWeight: 700, fontSize: 20, color: "var(--text)", letterSpacing: "-0.5px" }}>
            <span style={{ color: "#a78bfa" }}>Signed</span>
            <span style={{ color: "var(--subtle)", fontSize: 13, fontWeight: 400, marginLeft: 6 }}>by xShield</span>
          </span>
        </a>

        <div className="nav-links" style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {links.slice(0, 2).map((l) => (
            <a key={l.href} href={l.href} className="nav-link"
              style={{ color: "var(--muted)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
              {l.label}
            </a>
          ))}
          <a href="#iletisim" style={{
            padding: "9px 22px",
            background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
            borderRadius: 8, color: "#fff", textDecoration: "none",
            fontSize: 14, fontWeight: 600,
            boxShadow: "0 4px 16px rgba(139,92,246,0.35)",
          }}>Demo Talep Et</a>
        </div>

        <button onClick={() => setOpen(!open)} className="hamburger"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", padding: 8 }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {open ? (
              <><line x1="3" y1="3" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="19" y1="3" x2="3" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>
            ) : (
              <><line x1="3" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div style={{
          background: "rgba(6,13,31,0.98)", borderTop: "1px solid rgba(139,92,246,0.15)",
          padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 4,
        }}>
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} style={{
              color: "var(--muted)", textDecoration: "none", fontSize: 16, fontWeight: 500,
              padding: "10px 0", borderBottom: "1px solid rgba(139,92,246,0.08)",
            }}>{l.label}</a>
          ))}
        </div>
      )}

      <style>{`
        .nav-links { display: flex !important; }
        .hamburger  { display: none  !important; }
        .nav-link:hover { color: var(--text) !important; }
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
