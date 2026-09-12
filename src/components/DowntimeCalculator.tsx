import { useState } from "react";
import { motion } from "framer-motion";
import MagneticButton from "./MagneticButton";

const fmt = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });

export default function DowntimeCalculator() {
  const [revenue, setRevenue] = useState(500_000); // aylık ortalama ciro (TL)
  const [hours, setHours] = useState(4); // haftalık ortalama kesinti (saat)

  const hourlyRevenue = revenue / (30 * 24);
  const yearlyLoss = hourlyRevenue * hours * 52;

  return (
    <section className="section bg-[var(--surface)]">
      <div className="container">
        <div className="max-w-2xl mb-12">
          <div className="kicker mb-4">Hesaplayın</div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold text-[var(--ink)] mb-5 leading-[1.15]">
            Kesintinin <span className="marker">Gerçek Maliyeti</span> Ne?
          </h2>
          <p className="text-[var(--muted)] text-lg leading-relaxed">
            Sunucu ve ağ kesintileri sandığınızdan pahalıya mal olabilir. Kendi rakamlarınızla
            tahmini yıllık kaybınızı görün.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          <div className="panel p-8 flex flex-col justify-center gap-9">
            <div>
              <label className="flex justify-between items-baseline text-sm font-semibold text-[var(--ink)] mb-3">
                <span>Aylık Ortalama Ciro</span>
                <span className="mono text-[var(--muted)] tabular-nums">{fmt(revenue)} ₺</span>
              </label>
              <input
                type="range"
                min={50_000}
                max={5_000_000}
                step={50_000}
                value={revenue}
                onChange={(e) => setRevenue(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)] cursor-pointer"
                aria-label="Aylık ortalama ciro"
              />
            </div>
            <div>
              <label className="flex justify-between items-baseline text-sm font-semibold text-[var(--ink)] mb-3">
                <span>Haftalık Ortalama Kesinti Süresi</span>
                <span className="mono text-[var(--muted)] tabular-nums">{hours} saat</span>
              </label>
              <input
                type="range"
                min={0}
                max={24}
                step={0.5}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)] cursor-pointer"
                aria-label="Haftalık ortalama kesinti süresi"
              />
            </div>
          </div>

          <motion.div
            key={Math.round(yearlyLoss)}
            initial={{ opacity: 0.7, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="panel p-8 flex flex-col items-center justify-center text-center"
          >
            <div className="mono text-xs font-semibold tracking-[0.14em] uppercase text-[var(--subtle)] mb-3">
              Tahmini Yıllık Kayıp
            </div>
            <div className="text-4xl sm:text-5xl font-extrabold text-[var(--ink)] mb-3 tabular-nums">
              {fmt(yearlyLoss)} ₺
            </div>
            <p className="text-[var(--muted)] text-sm mb-6 max-w-[280px]">
              Cloud, Sunucu Yönetimi ve Altyapı hizmetlerimizle bu kaybı büyük ölçüde azaltabiliriz.
            </p>
            <MagneticButton
              href="/#iletisim"
              className="inline-block px-6 py-3 rounded-[9px] bg-[var(--ink)] text-white no-underline text-sm font-bold"
            >
              Altyapımı Değerlendirin
            </MagneticButton>
          </motion.div>
        </div>

        <p className="text-[var(--subtle)] text-xs mt-6 max-w-xl leading-relaxed">
          * Basitleştirilmiş bir tahmindir — girdiğiniz aylık cironun saatlik karşılığının, belirttiğiniz
          kesinti süresiyle çarpımına dayanır. Gerçek etki işin doğasına göre değişebilir.
        </p>
      </div>
    </section>
  );
}
