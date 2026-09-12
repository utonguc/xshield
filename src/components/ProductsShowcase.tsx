import { motion } from "framer-motion";
import { products } from "../data/content";

export default function ProductsShowcase() {
  return (
    <section id="urunler" className="section">
      <div className="container">
        <div className="max-w-2xl mb-16">
          <div className="kicker mb-4">Kanıt</div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold text-[var(--ink)] mb-5 leading-[1.15]">
            Konuşmuyoruz, <span className="marker">Üretiyoruz</span>
          </h2>
          <p className="text-[var(--muted)] text-lg leading-relaxed">
            Kendi iş süreçlerimizden doğan, gerçek problemleri çözen ve bugün canlıda çalışan
            yazılım ürünlerimiz.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {products.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
              className="panel overflow-hidden flex flex-col"
            >
              <div className="h-1.5" style={{ background: p.color }} />
              <div className="p-7 flex flex-col flex-1">
                <div className="flex items-center gap-2.5 mb-5">
                  <span
                    className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide leading-none"
                    style={{ background: `rgba(${p.colorRgb},0.12)`, color: p.color }}
                  >
                    {p.badge}
                  </span>
                </div>

                <h3 className="text-2xl font-black text-[var(--ink)] mb-1.5 tracking-tight">{p.name}</h3>
                <div className="text-[var(--subtle)] text-xs font-semibold mb-4">{p.tagline}</div>

                <p className="text-[var(--muted)] text-sm leading-[1.75] mb-6">{p.desc}</p>

                <div className="flex flex-col gap-2 mb-7">
                  {p.features.map((f) => (
                    <div key={f.text} className="flex items-center gap-2.5">
                      <span className="text-sm leading-none shrink-0">{f.icon}</span>
                      <span className="text-[var(--ink)] text-[13px] font-medium leading-tight">{f.text}</span>
                    </div>
                  ))}
                </div>

                <a
                  href={p.url}
                  target={p.url.startsWith("http") ? "_blank" : undefined}
                  rel={p.url.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[10px] text-white no-underline text-sm font-bold"
                  style={{ background: p.color }}
                >
                  Ürünü İncele
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
