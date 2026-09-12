import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { services } from "../data/content";
import MagneticButton from "./MagneticButton";

// Düğüm konumları yüzde (0-100) cinsinden — SVG viewBox 0 0 100 100 ve
// buton left/top'ları aynı birimi kullanıyor, böylece herhangi bir ekran
// genişliğinde JS'siz, orantılı şekilde ölçekleniyor.
const NODE_RADIUS = 38;
function nodePosition(i: number, total: number) {
  const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
  return {
    x: 50 + NODE_RADIUS * Math.cos(angle),
    y: 50 + NODE_RADIUS * Math.sin(angle),
  };
}

export default function Hero() {
  const [active, setActive] = useState(0);
  const activeService = services[active];

  return (
    <section className="relative min-h-dvh flex flex-col justify-center pt-32 pb-20 overflow-hidden">
      <div className="container">
        {/* ── Karşılama ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-2xl mx-auto text-center mb-20"
        >
          <div className="kicker justify-center mb-6">xShield</div>
          <h1 className="text-[clamp(2.4rem,6vw,4.6rem)] font-extrabold leading-[1.08] tracking-[-2px] mb-6 text-[var(--ink)]">
            Teknoloji Altyapınızı
            <br />
            <span className="marker">Güçlendiriyoruz</span>
          </h1>
          <p className="text-[var(--muted)] text-base sm:text-lg mb-9 leading-relaxed max-w-[560px] mx-auto">
            Cloud, Ağ, Siber Güvenlik, Sunucu Yönetimi ve IT Danışmanlığında uzman ekibimizle
            işletmenizin dijital dönüşümünü hızlandırıyoruz.
          </p>
          <div className="flex gap-4 flex-wrap justify-center">
            <MagneticButton
              href="/#iletisim"
              className="inline-block px-8 py-3.5 rounded-[10px] bg-[var(--ink)] text-white no-underline text-base font-bold"
            >
              Ücretsiz Danışmanlık
            </MagneticButton>
            <a
              href="/#hizmetler"
              className="inline-flex items-center px-8 py-3.5 rounded-[10px] bg-transparent border-[1.5px] border-[var(--ink)] text-[var(--ink)] no-underline text-base font-semibold"
            >
              Tüm Hizmetler
            </a>
          </div>
        </motion.div>

        {/* ── Keşif widget'ı: klasik istatistik şeridi yerine, hizmetleri
              dokunarak keşfedebileceğiniz canlı bir düğüm haritası ────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          className="max-w-4xl mx-auto w-full grid md:grid-cols-[1fr_1fr] gap-10 items-center"
        >
          <div className="order-2 md:order-1">
            <div className="mono text-xs font-semibold tracking-[0.14em] uppercase text-[var(--subtle)] mb-4">
              Hizmetlerimizi Keşfedin
            </div>
            <div className="relative min-h-[176px] panel p-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeService.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl leading-none">{activeService.icon}</span>
                    <h3 className="text-lg font-extrabold text-[var(--ink)]">{activeService.title}</h3>
                  </div>
                  <p className="text-[var(--muted)] text-sm leading-relaxed mb-4">{activeService.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {activeService.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 bg-[var(--surface)] rounded-full text-xs font-semibold text-[var(--ink)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="order-1 md:order-2 relative mx-auto aspect-square w-full max-w-[300px]">
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden>
              {services.map((s, i) => {
                const p = nodePosition(i, services.length);
                const isActive = i === active;
                return (
                  <motion.line
                    key={s.title}
                    x1={50}
                    y1={50}
                    x2={p.x}
                    y2={p.y}
                    vectorEffect="non-scaling-stroke"
                    stroke={isActive ? "var(--color-accent)" : "var(--border)"}
                    strokeWidth={isActive ? 1.6 : 1}
                    animate={{ opacity: isActive ? 1 : 0.6 }}
                    transition={{ duration: 0.25 }}
                  />
                );
              })}
            </svg>

            <div
              className="absolute rounded-full bg-[var(--ink)] flex items-center justify-center font-black text-lg text-accent"
              style={{ left: "50%", top: "50%", width: 60, height: 60, transform: "translate(-50%,-50%)" }}
            >
              x
            </div>

            {services.map((s, i) => {
              const p = nodePosition(i, services.length);
              const isActive = i === active;
              return (
                <motion.button
                  key={s.title}
                  type="button"
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  aria-label={s.title}
                  aria-pressed={isActive}
                  className="absolute w-11 h-11 sm:w-13 sm:h-13 rounded-full border flex items-center justify-center text-lg sm:text-xl leading-none cursor-pointer"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    // Ortalama (-50%,-50%) framer-motion'ın kendi x/y'si
                    // olarak veriliyor — animate'teki scale ile AYNI transform
                    // hattında birleşsin diye. Ayrı bir CSS transform ile
                    // karıştırılırsa framer-motion onu ezer, düğümler kayar.
                    x: "-50%",
                    y: "-50%",
                    background: isActive ? "var(--color-accent)" : "var(--card)",
                    borderColor: isActive ? "var(--color-accent)" : "var(--border)",
                  }}
                  animate={{ scale: isActive ? 1.15 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                >
                  {s.icon}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
