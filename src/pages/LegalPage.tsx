import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import type { LegalSection } from "../data/legal";

export default function LegalPage({
  title,
  updated,
  sections,
  otherHref,
  otherLabel,
  metaDescription,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
  otherHref: string;
  otherLabel: string;
  metaDescription: string;
}) {
  useDocumentMeta(`${title} | xShield`, metaDescription);

  return (
    <>
      <Navbar />
      <main className="bg-[var(--bg)] min-h-dvh pt-32 pb-24">
        <div className="container max-w-3xl">
          <div className="mb-12">
            <div className="kicker mb-4">Yasal</div>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold text-[var(--ink)] tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-[var(--subtle)] text-sm mt-3">{updated}</p>
          </div>

          <div className="flex flex-col gap-9">
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="text-lg font-extrabold text-[var(--ink)] mb-3">{s.title}</h2>
                {s.body.map((p, i) => (
                  <p key={i} className="text-[var(--muted)] text-[15px] leading-[1.85] mb-3 last:mb-0">
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-14 pt-8 border-t border-[var(--border)] flex flex-wrap gap-4">
            <Link
              to="/"
              className="px-6 py-3 rounded-[10px] bg-[var(--card)] border border-[var(--border)] text-[var(--ink)] no-underline text-sm font-semibold"
            >
              ← Ana Sayfaya Dön
            </Link>
            <Link
              to={otherHref}
              className="px-6 py-3 rounded-[10px] bg-accent/20 text-[var(--ink)] no-underline text-sm font-semibold"
            >
              {otherLabel} →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
