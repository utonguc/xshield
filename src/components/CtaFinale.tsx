import { lazy } from "react";
import { motion } from "framer-motion";
import Scene from "./Scene";
import MagneticButton from "./MagneticButton";

const WarpFieldBackground = lazy(() =>
  import("@designcodeio/threeui/components/WarpFieldBackground").then((m) => ({
    default: m.WarpFieldBackground,
  })),
);

/**
 * Sitenin tek koyu anı — bilinçli bir kontrast: ferah/açık bir deneyimin
 * sonunda "kalkış" hissi veren, tek seferlik sinematik bir kapanış.
 */
export default function CtaFinale() {
  return (
    <section className="relative h-dvh min-h-[520px] flex items-center justify-center overflow-hidden bg-[var(--ink)]">
      <Scene
        component={WarpFieldBackground}
        props={{ variant: "hyperspace", hue: 172, saturation: 0.8, brightness: 1, speed: 0.8, className: "w-full h-full" }}
        margin="500px"
        fallback={
          <div
            className="w-full h-full"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(31,111,92,0.25), transparent 65%), var(--ink)" }}
          />
        }
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[var(--ink)] via-transparent to-[var(--ink)]/60" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="container relative z-10 text-center px-6"
      >
        <div className="mono text-xs font-semibold tracking-[0.14em] uppercase text-white/50 mb-6">Başlangıç</div>
        <h2 className="text-[clamp(1.8rem,4.5vw,3.4rem)] font-extrabold text-white mb-5 leading-tight">
          Altyapınız İçin <span className="text-accent">Ücretsiz Analiz</span> Yapıyoruz
        </h2>
        <p className="text-white/65 text-base sm:text-lg max-w-[520px] mx-auto mb-10 leading-relaxed">
          Mevcut IT altyapınızı inceliyor, iyileştirme fırsatlarını ve güvenlik açıklarını raporluyoruz.
          Tamamen ücretsiz, taahhütsüz.
        </p>
        <MagneticButton
          href="/#iletisim"
          className="inline-block px-10 py-4 rounded-[10px] bg-accent text-[var(--ink)] no-underline text-lg font-bold"
        >
          Ücretsiz Analiz Talep Et
        </MagneticButton>
      </motion.div>
    </section>
  );
}
