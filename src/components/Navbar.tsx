"use client";
import { useState, useEffect, useRef } from "react";

const serviceItems = [
  { icon: "☁️", title: "Cloud Sunucu", desc: "Ölçeklenebilir bulut altyapısı", href: "#hizmetler" },
  { icon: "🌐", title: "Ağ Yönetimi", desc: "Firewall, VPN, SD-WAN", href: "#hizmetler" },
  { icon: "🖥️", title: "Sunucu Yönetimi", desc: "Fiziksel & sanal sunucular", href: "#hizmetler" },
  { icon: "🛡️", title: "Siber Güvenlik", desc: "Pentest, SOC, KVKK", href: "#hizmetler" },
  { icon: "🏗️", title: "Altyapı Hizmetleri", desc: "Data center & UPS çözümleri", href: "#hizmetler" },
  { icon: "💡", title: "IT Danışmanlığı", desc: "Dijital dönüşüm & entegrasyon", href: "#hizmetler" },
];

const productItems = [
  { name: "e-Clinic", tagline: "Klinik Yönetim Platformu", color: "#3b82f6", colorRgb: "59,130,246", href: "https://eclinic.xshield.com.tr", external: true, badge: null },
  { name: "Signed", tagline: "Mail İmza Yönetimi", color: "#8b5cf6", colorRgb: "139,92,246", href: "https://signed.xshield.com.tr", external: true, badge: null },
  { name: "xCut", tagline: "Salon Yönetim Platformu", color: "#7c3aed", colorRgb: "124,58,237", href: "#urunler", external: false, badge: null },
  { name: "ShieldSpot", tagline: "Hotspot Yönetimi", color: "#06b6d4", colorRgb: "6,182,212", href: "#urunler", external: false, badge: "Yakında" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const showDropdown = (name: string) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setActiveDropdown(name);
  };

  const scheduleHide = () => {
    hideTimer.current = setTimeout(() => setActiveDropdown(null), 160);
  };

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      transition: "all 0.3s ease",
      background: scrolled ? "rgba(6,13,31,0.96)" : "transparent",
      backdropFilter: scrolled ? "blur(18px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(59,130,246,0.15)" : "1px solid transparent",
    }}>
      {/* Scroll progress bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, height: 2,
        width: `${scrollProgress}%`,
        background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
        transition: "width 0.12s linear",
        zIndex: 1,
      }} />

      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, position: "relative" }}>
        {/* Logo */}
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 36, height: 36,
            background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            borderRadius: 9,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 17, color: "#fff",
          }}>x</div>
          <span style={{ fontWeight: 700, fontSize: 21, color: "var(--text)", letterSpacing: "-0.5px" }}>
            x<span style={{ color: "var(--blue)" }}>Shield</span>
          </span>
        </a>

        {/* Desktop navigation */}
        <div className="nav-links" style={{ display: "flex", gap: 2, alignItems: "center" }}>

          {/* Hizmetler mega dropdown */}
          <div style={{ position: "relative" }}
            onMouseEnter={() => showDropdown("hizmetler")}
            onMouseLeave={scheduleHide}>
            <a href="#hizmetler" className="nav-link" style={{
              color: "var(--muted)", textDecoration: "none", fontSize: 14, fontWeight: 500,
              padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 5,
            }}>
              Hizmetler
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{
                transform: activeDropdown === "hizmetler" ? "rotate(180deg)" : "none",
                transition: "transform 0.2s", opacity: 0.6,
              }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>

            {activeDropdown === "hizmetler" && (
              <div onMouseEnter={() => showDropdown("hizmetler")} onMouseLeave={scheduleHide}
                style={{
                  position: "absolute", top: "calc(100% + 10px)", left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(7,15,32,0.98)",
                  border: "1px solid rgba(59,130,246,0.2)",
                  borderRadius: 18, padding: "20px",
                  backdropFilter: "blur(24px)",
                  boxShadow: "0 28px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(59,130,246,0.06)",
                  width: 500, zIndex: 100,
                }}>
                {/* Dropdown arrow */}
                <div style={{
                  position: "absolute", top: -6, left: "50%",
                  width: 12, height: 12, background: "rgba(7,15,32,0.98)",
                  border: "1px solid rgba(59,130,246,0.2)", borderBottom: "none", borderRight: "none",
                  transform: "translateX(-50%) rotate(45deg)",
                }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {serviceItems.map((s) => (
                    <a key={s.title} href={s.href} style={{
                      display: "flex", gap: 11, alignItems: "flex-start",
                      padding: "11px 13px", borderRadius: 10, textDecoration: "none",
                      transition: "background 0.18s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.1)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <span style={{ fontSize: 19, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
                      <div>
                        <div style={{ color: "var(--text)", fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{s.title}</div>
                        <div style={{ color: "var(--muted)", fontSize: 11.5, lineHeight: 1.4 }}>{s.desc}</div>
                      </div>
                    </a>
                  ))}
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(59,130,246,0.1)" }}>
                  <a href="#iletisim" style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px", borderRadius: 9,
                    background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                    color: "var(--blue-light)", textDecoration: "none", fontSize: 13, fontWeight: 600,
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.18)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(59,130,246,0.1)")}>
                    Tüm hizmetler için ücretsiz teklif alın →
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Ürünler dropdown */}
          <div style={{ position: "relative" }}
            onMouseEnter={() => showDropdown("urunler")}
            onMouseLeave={scheduleHide}>
            <a href="#urunler" className="nav-link" style={{
              color: "var(--muted)", textDecoration: "none", fontSize: 14, fontWeight: 500,
              padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 5,
            }}>
              Ürünler
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{
                transform: activeDropdown === "urunler" ? "rotate(180deg)" : "none",
                transition: "transform 0.2s", opacity: 0.6,
              }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>

            {activeDropdown === "urunler" && (
              <div onMouseEnter={() => showDropdown("urunler")} onMouseLeave={scheduleHide}
                style={{
                  position: "absolute", top: "calc(100% + 10px)", left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(7,15,32,0.98)",
                  border: "1px solid rgba(59,130,246,0.2)",
                  borderRadius: 18, padding: "16px",
                  backdropFilter: "blur(24px)",
                  boxShadow: "0 28px 64px rgba(0,0,0,0.55)",
                  width: 380, zIndex: 100,
                }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {productItems.map((p) => (
                    <a key={p.name} href={p.href}
                      target={p.external ? "_blank" : undefined}
                      rel={p.external ? "noopener noreferrer" : undefined}
                      style={{
                        display: "flex", flexDirection: "column", gap: 5,
                        padding: "14px 13px", borderRadius: 12, textDecoration: "none",
                        border: `1px solid rgba(${p.colorRgb},0.22)`,
                        background: `rgba(${p.colorRgb},0.07)`,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `rgba(${p.colorRgb},0.16)`; e.currentTarget.style.borderColor = `rgba(${p.colorRgb},0.4)`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `rgba(${p.colorRgb},0.07)`; e.currentTarget.style.borderColor = `rgba(${p.colorRgb},0.22)`; }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: p.color, fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                        {p.badge && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 999,
                            background: `rgba(${p.colorRgb},0.2)`, color: p.color, letterSpacing: "0.5px",
                          }}>{p.badge}</span>
                        )}
                      </div>
                      <span style={{ color: "var(--muted)", fontSize: 11.5, lineHeight: 1.3 }}>{p.tagline}</span>
                    </a>
                  ))}
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(59,130,246,0.1)", textAlign: "center" }}>
                  <a href="#urunler" style={{ color: "var(--muted)", fontSize: 12, textDecoration: "none" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--blue-light)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>
                    Tüm ürünleri gör →
                  </a>
                </div>
              </div>
            )}
          </div>

          {[
            { label: "Hakkımızda", href: "#hakkimizda" },
            { label: "SSS", href: "#sss" },
            { label: "İletişim", href: "#iletisim" },
          ].map((l) => (
            <a key={l.href} href={l.href} className="nav-link" style={{
              color: "var(--muted)", textDecoration: "none", fontSize: 14, fontWeight: 500,
              padding: "8px 12px", borderRadius: 8,
            }}>{l.label}</a>
          ))}

          <a href="#iletisim" style={{
            marginLeft: 10, padding: "9px 22px",
            background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            borderRadius: 8, color: "#fff", textDecoration: "none",
            fontSize: 14, fontWeight: 600,
            boxShadow: "0 2px 12px rgba(59,130,246,0.3)",
            transition: "box-shadow 0.2s, opacity 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(59,130,246,0.5)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(59,130,246,0.3)")}>
            Teklif Al
          </a>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="hamburger"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", padding: 8 }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {mobileOpen ? (
              <>
                <line x1="3" y1="3" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="19" y1="3" x2="3" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          background: "rgba(6,13,31,0.99)",
          borderTop: "1px solid rgba(59,130,246,0.15)",
          padding: "12px 24px 24px",
          maxHeight: "80vh", overflowY: "auto",
        }}>
          {/* Hizmetler accordion */}
          <div style={{ borderBottom: "1px solid rgba(59,130,246,0.08)" }}>
            <button onClick={() => setMobileExpanded(mobileExpanded === "hizmetler" ? null : "hizmetler")}
              style={{
                width: "100%", background: "none", border: "none", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                color: "var(--text)", padding: "14px 0", fontSize: 16, fontWeight: 500,
              }}>
              Hizmetler
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{
                transform: mobileExpanded === "hizmetler" ? "rotate(180deg)" : "none",
                transition: "transform 0.2s", color: "var(--muted)",
              }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            {mobileExpanded === "hizmetler" && (
              <div style={{ paddingBottom: 8, paddingLeft: 8 }}>
                {serviceItems.map(s => (
                  <a key={s.title} href={s.href} onClick={() => setMobileOpen(false)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 8px",
                    color: "var(--muted)", textDecoration: "none", fontSize: 14, borderRadius: 8,
                  }}>
                    <span style={{ fontSize: 16 }}>{s.icon}</span> {s.title}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Ürünler accordion */}
          <div style={{ borderBottom: "1px solid rgba(59,130,246,0.08)" }}>
            <button onClick={() => setMobileExpanded(mobileExpanded === "urunler" ? null : "urunler")}
              style={{
                width: "100%", background: "none", border: "none", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                color: "var(--text)", padding: "14px 0", fontSize: 16, fontWeight: 500,
              }}>
              Ürünler
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{
                transform: mobileExpanded === "urunler" ? "rotate(180deg)" : "none",
                transition: "transform 0.2s", color: "var(--muted)",
              }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            {mobileExpanded === "urunler" && (
              <div style={{ paddingBottom: 8, paddingLeft: 8 }}>
                {productItems.map(p => (
                  <a key={p.name} href={p.href}
                    target={p.external ? "_blank" : undefined}
                    rel={p.external ? "noopener noreferrer" : undefined}
                    onClick={() => setMobileOpen(false)} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "9px 8px",
                    color: p.color, textDecoration: "none", fontSize: 14, fontWeight: 600, borderRadius: 8,
                  }}>
                    {p.name}
                    {p.badge && <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 400 }}>· {p.badge}</span>}
                  </a>
                ))}
              </div>
            )}
          </div>

          {[
            { label: "Hakkımızda", href: "#hakkimizda" },
            { label: "SSS", href: "#sss" },
            { label: "İletişim", href: "#iletisim" },
          ].map(l => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} style={{
              display: "block", color: "var(--muted)", textDecoration: "none",
              fontSize: 16, fontWeight: 500, padding: "14px 0",
              borderBottom: "1px solid rgba(59,130,246,0.08)",
            }}>{l.label}</a>
          ))}

          <a href="#iletisim" onClick={() => setMobileOpen(false)} style={{
            display: "block", marginTop: 16, padding: "13px 20px",
            background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            borderRadius: 8, color: "#fff", textDecoration: "none",
            fontSize: 15, fontWeight: 600, textAlign: "center",
          }}>Teklif Al</a>
        </div>
      )}

      <style>{`
        .nav-links { display: flex !important; }
        .hamburger  { display: none  !important; }
        .nav-link:hover { color: var(--text) !important; background: rgba(59,130,246,0.08) !important; }
        @media (max-width: 900px) {
          .nav-links { display: none !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
