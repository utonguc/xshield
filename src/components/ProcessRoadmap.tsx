import { processSteps } from "../data/content";
import Roadmap from "./Roadmap";

export default function ProcessRoadmap() {
  return (
    <section id="surec" className="section bg-[var(--surface)]">
      <div className="container">
        <div className="max-w-2xl mb-16">
          <div className="kicker mb-4">Süreç</div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold text-[var(--ink)] mb-5 leading-[1.15]">
            Bir Anlaşma <span className="marker">Nasıl İlerler?</span>
          </h2>
          <p className="text-[var(--muted)] text-lg leading-relaxed">
            İlk görüşmeden bakım anlaşması sonrasına kadar her adımı önceden biliyorsunuz —
            sürpriz yok, belirsizlik yok.
          </p>
        </div>

        <Roadmap steps={processSteps} />
      </div>
    </section>
  );
}
