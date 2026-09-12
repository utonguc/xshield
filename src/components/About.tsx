import { motion } from "framer-motion";
import { aboutHighlights } from "../data/content";

export default function About() {
  return (
    <section id="hakkimizda" className="section">
      <div className="container grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="kicker mb-5">Hakkımızda</div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold text-[var(--ink)] mb-6 leading-[1.15]">
            Teknoloji ile İş Dünyasını
            <br />
            <span className="marker">Buluşturuyoruz</span>
          </h2>
          <p className="text-[var(--muted)] text-lg leading-[1.8] mb-6">
            xShield, Türkiye'de kurumsal IT altyapısı, siber güvenlik ve yazılım geliştirme alanlarında
            hizmet veren bir teknoloji firmasıdır. Deneyimli mühendis ve danışman kadromuzla küçük
            ölçekli işletmelerden büyük kurumsal yapılara kadar kapsamlı çözümler sunuyoruz.
          </p>
          <p className="text-[var(--muted)] text-[15px] leading-[1.8] mb-8">
            Kendi geliştirdiğimiz yazılım ürünleri (e-Clinic, Signed, xCut, xSignage, ShieldSpot) ve
            yönetilen hizmet modelimizle müşterilerimizin teknoloji yükünü üstleniyor, onların asıl
            işlerine odaklanmalarını sağlıyoruz.
          </p>
          <div className="flex gap-4 flex-wrap">
            <a
              href="/#iletisim"
              className="px-7 py-3 rounded-[9px] bg-[var(--ink)] text-white no-underline text-sm font-bold"
            >
              Ekibimizle Tanışın
            </a>
            <a
              href="/#hizmetler"
              className="px-7 py-3 rounded-[9px] bg-transparent border-[1.5px] border-[var(--ink)] text-[var(--ink)] no-underline text-sm font-semibold"
            >
              Hizmetleri İncele
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          {aboutHighlights.map((item) => (
            <div key={item.title} className="panel p-6">
              <div className="text-[28px] mb-3 leading-none">{item.icon}</div>
              <h4 className="text-[var(--ink)] font-bold text-[15px] mb-2">{item.title}</h4>
              <p className="text-[var(--muted)] text-[13px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
