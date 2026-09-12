import { motion } from "framer-motion";
import { services } from "../data/content";

export default function Pillars() {
  return (
    <section id="hizmetler" className="section">
      <div className="container">
        <div className="max-w-2xl mb-16">
          <div className="kicker mb-4">Çözüm</div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold text-[var(--ink)] mb-5 leading-[1.15]">
            Uçtan Uca <span className="marker">IT Çözümleri</span>
          </h2>
          <p className="text-[var(--muted)] text-lg leading-relaxed">
            İşletmenizin tüm teknoloji ihtiyaçlarını tek çatı altında karşılıyoruz.
          </p>
        </div>

        <div className="flex flex-col border-t border-[var(--border)]">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.06, ease: "easeOut" }}
              className="grid md:grid-cols-[80px_1.1fr_1.4fr] gap-4 md:gap-8 py-8 md:py-10 border-b border-[var(--border)] items-start group"
            >
              <div className="mono text-[var(--subtle)] text-sm">{String(i + 1).padStart(2, "0")}</div>

              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none">{s.icon}</span>
                <h3 className="text-xl font-extrabold text-[var(--ink)] tracking-tight">{s.title}</h3>
              </div>

              <div>
                <p className="text-[var(--muted)] text-[15px] leading-[1.75] mb-4 max-w-[560px]">{s.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {s.tags.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 bg-[var(--surface)] rounded-full text-xs font-semibold text-[var(--ink)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
