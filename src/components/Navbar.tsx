import { useEffect, useState } from "react";
import { navLinks } from "../data/content";

// navLinks'teki "/#hizmetler" gibi href'lerden gerçek section id'sini çıkarır
const sectionIds = navLinks.map((l) => l.href.replace("/#", ""));

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return; // /gizlilik, /kvkk gibi sayfalarda bölüm yok

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }, // ekranın orta şeridi referans alınır
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled ? "bg-[var(--bg)]/92 backdrop-blur-md border-[var(--border)]" : "bg-transparent border-transparent"
      }`}
    >
      <div className="container flex items-center justify-between h-[68px]">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-9 h-9 rounded-[9px] bg-[var(--ink)] flex items-center justify-center font-black text-base text-accent leading-none">
            x
          </div>
          <span className="font-bold text-xl text-[var(--ink)] tracking-tight">xShield</span>
        </a>

        <div className="hidden md:flex gap-8 items-center">
          {navLinks.map((l) => {
            const isActive = activeId === l.href.replace("/#", "");
            return (
              <a
                key={l.href}
                href={l.href}
                className={`no-underline text-sm font-medium transition-colors ${
                  isActive ? "text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {l.label}
              </a>
            );
          })}
          <a
            href="/#iletisim"
            className="px-[22px] py-2.5 rounded-lg bg-[var(--ink)] text-white no-underline text-sm font-semibold hover:bg-black transition-colors"
          >
            Teklif Al
          </a>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden bg-transparent border-none cursor-pointer text-[var(--ink)] p-2"
          aria-label="Menüyü aç/kapat"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {open ? (
              <>
                <line x1="3" y1="3" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="19" y1="3" x2="3" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[var(--bg)] border-t border-[var(--border)] px-6 pt-4 pb-6 flex flex-col gap-1">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-[var(--muted)] no-underline text-base font-medium py-2.5 border-b border-[var(--border)]"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/#iletisim"
            onClick={() => setOpen(false)}
            className="mt-3 px-5 py-3 rounded-lg bg-[var(--ink)] text-white no-underline text-[15px] font-semibold text-center"
          >
            Teklif Al
          </a>
        </div>
      )}
    </nav>
  );
}
