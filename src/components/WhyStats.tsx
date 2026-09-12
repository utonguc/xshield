import { motion } from "framer-motion";
import { whyItems } from "../data/content";

export default function WhyStats() {
  return (
    <section id="neden" className="section bg-[var(--surface)]">
      <div className="container">
        <div className="max-w-2xl mb-14">
          <div className="kicker mb-4">Güven</div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold text-[var(--ink)] mb-5 leading-[1.15]">
            Farkımızı <span className="marker">Hissedeceksiniz</span>
          </h2>
          <p className="text-[var(--muted)] text-lg leading-relaxed">
            Sadece teknik çözüm değil, uzun vadeli iş ortağı arıyorsanız doğru yerdesiniz.
          </p>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {whyItems.map((w, i) => (
            <motion.div
              key={w.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: "easeOut" }}
              className="panel p-7 flex gap-5"
            >
              <div className="w-12 h-12 shrink-0 rounded-xl bg-accent/20 flex items-center justify-center text-2xl leading-none">
                {w.icon}
              </div>
              <div>
                <h3 className="text-[var(--ink)] font-bold text-base mb-2">{w.title}</h3>
                <p className="text-[var(--muted)] text-sm leading-[1.7]">{w.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
