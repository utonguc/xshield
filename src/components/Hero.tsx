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
    <section className="relative min-h-dvh flex items-center pt-28 pb-16 overflow-hidden">
      <div className="container grid md:grid-cols-[1fr_1fr] gap-14 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="kicker mb-6">xShield</div>

          <h1 className="text-[clamp(1.9rem,4vw,3rem)] font-extrabold leading-[1.15] tracking-[-1.5px] mb-5 text-[var(--ink)]">
            Altyapınızı <span className="marker">Canlı</span> Görün
          </h1>

          <p className="text-[var(--muted)] text-base sm:text-lg mb-7 leading-relaxed max-w-[440px]">
            Sağdaki haritada dolaşın — her düğüm sizin için yönettiğimiz bir hizmet alanı.
            Dokunun, ne yaptığımızı gösterelim.
          </p>

          <div className="relative min-h-[176px] panel p-6 mb-8 overflow-hidden">
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

          <div className="flex gap-4 flex-wrap">
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

        {/* Etkileşimli düğüm haritası — klasik "başlık + istatistik şeridi"
            hero'su yerine: 6 hizmet, merkezdeki xShield çekirdeğine bağlı
            canlı düğümler olarak. Üzerine gel/dokun, bilgisi solda değişsin. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
          className="relative mx-auto aspect-square w-full max-w-[360px]"
        >
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
            style={{ left: "50%", top: "50%", width: 64, height: 64, transform: "translate(-50%,-50%)" }}
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
                className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full border flex items-center justify-center text-xl sm:text-2xl leading-none cursor-pointer"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: "translate(-50%,-50%)",
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
        </motion.div>
      </div>
    </section>
  );
}
