import { lazy } from "react";
import { securitySteps } from "../data/content";
import Roadmap from "./Roadmap";
import Scene from "./Scene";
import SecurityChecklist from "./SecurityChecklist";

const DefenseLines = lazy(() =>
  import("@designcodeio/threeui/components/DefenseLines").then((m) => ({ default: m.DefenseLines })),
);

export default function SecurityRoadmap() {
  return (
    <section id="guvenlik-yol-haritasi" className="section">
      <div className="container">
        <div className="max-w-2xl mb-10">
          <div className="kicker mb-4">Siber Güvenlik</div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold text-[var(--ink)] mb-5 leading-[1.15]">
            Güvenlik, <span className="marker">Bir Seferlik Proje</span> Değildir
          </h2>
          <p className="text-[var(--muted)] text-lg leading-relaxed">
            Envanterden sürekli izlemeye — sızma testinden yasal uyuma kadar xShield'in siber güvenlik
            hizmetini nasıl kurguladığımız.
          </p>
        </div>

        {/* ThreeUI: "savunma hatları" sahnesi — bölümün temasıyla birebir örtüşen tek bir görsel banner */}
        <div className="relative w-full h-56 sm:h-72 rounded-3xl overflow-hidden border border-[var(--border)] mb-16">
          <Scene
            component={DefenseLines}
            props={{ mode: "light", hue: 172, saturation: 0.85, opacity: 0.5, density: 1, className: "w-full h-full" }}
            margin="400px"
            fallback={
              <div
                className="w-full h-full"
                style={{ background: "radial-gradient(circle at 30% 40%, rgba(31,111,92,0.35), transparent 60%), var(--surface)" }}
              />
            }
          />
        </div>

        <Roadmap steps={securitySteps} dotClassName="bg-graphite" />

        <SecurityChecklist />
      </div>
    </section>
  );
}
