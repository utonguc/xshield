import { useState } from "react";
import { motion } from "framer-motion";
import MagneticButton from "./MagneticButton";

const items = [
  "Düzenli (en az günlük) otomatik yedekleme yapılıyor",
  "Yedekler farklı bir lokasyon/ortamda saklanıyor",
  "Son 12 ayda bir sızma testi (pentest) yaptırıldı",
  "Çalışanlar çok faktörlü kimlik doğrulama (MFA) kullanıyor",
  "Yazılım/işletim sistemi güncellemeleri düzenli uygulanıyor",
  "Bir olay müdahale (incident response) planı var",
  "KVKK aydınlatma metni ve açık rıza süreçleri güncel",
  "Ağ segmentlere ayrılmış (VLAN/firewall kuralları) durumda",
  "7/24 izlenen bir güvenlik operasyon merkezi (SOC) var",
  "Çalışanlara siber güvenlik farkındalık eğitimi veriliyor",
];

function resultFor(score: number, total: number) {
  const pct = score / total;
  if (pct >= 0.8)
    return {
      label: "İyi durumdasınız",
      color: "var(--color-accentdeep)",
      bg: "bg-accent/20",
      msg: "Temel önlemler yerinde — ince ayar ve sürekli izlemeyle bu seviyeyi koruyabiliriz.",
    };
  if (pct >= 0.5)
    return {
      label: "Geliştirilmesi gereken alanlar var",
      color: "#8a5a00",
      bg: "bg-[rgba(226,121,12,0.14)]",
      msg: "Bazı temel adımlar eksik — önceliklendirilmiş bir yol haritasıyla hızla kapatılabilir.",
    };
  return {
    label: "Ciddi risk altındasınız",
    color: "#8a2e22",
    bg: "bg-[rgba(180,68,46,0.14)]",
    msg: "Kritik açıklar var — önce bir güvenlik değerlendirmesiyle önceliklendirme yapmanızı öneririz.",
  };
}

export default function SecurityChecklist() {
  const [checked, setChecked] = useState<boolean[]>(() => Array(items.length).fill(false));
  const score = checked.filter(Boolean).length;
  const result = resultFor(score, items.length);

  function toggle(i: number) {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  return (
    <div className="mt-16 panel p-6 sm:p-8">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="kicker mb-3">Kendinizi Değerlendirin</div>
          <h3 className="text-xl font-extrabold text-[var(--ink)]">Güvenlik Hazırlık Kontrol Listesi</h3>
        </div>
        <div className="text-3xl font-extrabold tabular-nums" style={{ color: result.color }}>
          {score}/{items.length}
        </div>
      </div>

      <div className="flex flex-col gap-1 mb-6">
        {items.map((item, i) => (
          <label
            key={item}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-[var(--bg)] transition-colors"
          >
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={() => toggle(i)}
              className="w-4 h-4 accent-[var(--color-accent)] shrink-0 cursor-pointer"
            />
            <span className={`text-sm ${checked[i] ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{item}</span>
          </label>
        ))}
      </div>

      <motion.div
        key={result.label}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 ${result.bg}`}
      >
        <div>
          <div className="font-bold text-sm mb-1" style={{ color: result.color }}>
            {result.label}
          </div>
          <p className="text-[var(--muted)] text-sm max-w-md">{result.msg}</p>
        </div>
        <MagneticButton
          href="/#iletisim"
          className="inline-block px-5 py-2.5 rounded-[9px] bg-[var(--ink)] text-white no-underline text-sm font-bold whitespace-nowrap"
        >
          Ücretsiz Değerlendirme
        </MagneticButton>
      </motion.div>
    </div>
  );
}
