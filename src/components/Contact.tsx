import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { contactInfo } from "../data/content";

const inputClass =
  "w-full px-3.5 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--ink)] text-sm outline-none focus:border-[var(--ink)] transition-colors disabled:opacity-50";
const labelClass = "block text-[var(--muted)] text-[13px] font-semibold mb-1.5";

type Status = "idle" | "sending" | "sent" | "error";

export default function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Bir şeyler ters gitti.");
      setStatus("sent");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Mesaj gönderilemedi, lütfen tekrar deneyin.");
    }
  }

  return (
    <section id="iletisim" className="section bg-[var(--surface)]">
      <div className="container grid md:grid-cols-2 gap-10 md:gap-16 items-start">
        <div>
          <div className="kicker mb-5">İletişim</div>
          <h2 className="text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold text-[var(--ink)] mb-5 leading-tight">
            Projenizi
            <br />
            <span className="marker">Birlikte Konuşalım</span>
          </h2>
          <p className="text-[var(--muted)] text-[15px] leading-[1.8] mb-9">
            Bir sorunuz mu var, teklif mi almak istiyorsunuz ya da mevcut altyapınız hakkında fikir mi
            almak istiyorsunuz? Formu doldurun, en kısa sürede dönelim.
          </p>

          <div className="flex flex-col gap-5">
            {contactInfo.map((c) => (
              <div key={c.label} className="flex gap-3.5 items-start">
                <div className="w-10 h-10 shrink-0 bg-accent/20 rounded-[10px] flex items-center justify-center text-lg leading-none">
                  {c.icon}
                </div>
                <div>
                  <div className="text-[var(--subtle)] text-xs font-semibold uppercase tracking-wide">{c.label}</div>
                  <div className="text-[var(--ink)] text-[15px] font-medium mt-0.5">{c.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-9">
          <h3 className="text-[var(--ink)] font-bold text-lg mb-6">Bize Yazın</h3>

          <AnimatePresence mode="wait">
            {status === "sent" ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center py-10"
              >
                <div className="w-14 h-14 rounded-full bg-accent/25 flex items-center justify-center text-2xl mb-4">
                  ✓
                </div>
                <h4 className="font-bold text-[var(--ink)] mb-2">Mesajınız iletildi</h4>
                <p className="text-[var(--muted)] text-sm max-w-[280px]">
                  En kısa sürede size dönüş yapacağız. İlginiz için teşekkürler.
                </p>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="mt-6 text-sm font-semibold text-[var(--ink)] underline underline-offset-2"
                >
                  Yeni mesaj gönder
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Ad Soyad *</label>
                    <input name="name" required disabled={status === "sending"} type="text" placeholder="Ahmet Yılmaz" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Firma</label>
                    <input name="company" disabled={status === "sending"} type="text" placeholder="Şirket A.Ş." className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>E-posta *</label>
                  <input name="email" required disabled={status === "sending"} type="email" placeholder="ahmet@firma.com" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>İlgilendiğiniz Hizmet</label>
                  <select name="service" disabled={status === "sending"} className={inputClass} defaultValue="">
                    <option value="">Seçiniz...</option>
                    <option>Cloud Sunucu</option>
                    <option>Ağ Yönetimi</option>
                    <option>Sunucu Yönetimi</option>
                    <option>Siber Güvenlik</option>
                    <option>Altyapı Hizmetleri</option>
                    <option>IT Danışmanlığı</option>
                    <option>e-Clinic</option>
                    <option>Signed</option>
                    <option>xCut</option>
                    <option>xSignage</option>
                    <option>ShieldSpot</option>
                    <option>Diğer</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Mesajınız *</label>
                  <textarea
                    name="message"
                    required
                    disabled={status === "sending"}
                    placeholder="Projeniz veya ihtiyacınız hakkında kısaca bilgi verin..."
                    rows={4}
                    className={`${inputClass} resize-y`}
                  />
                </div>

                {status === "error" && (
                  <p className="text-sm font-medium" style={{ color: "#b3261e" }}>
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="px-7 py-3.5 rounded-[9px] bg-[var(--ink)] text-white border-none text-[15px] font-bold cursor-pointer hover:bg-black transition-colors disabled:opacity-60 disabled:cursor-wait"
                >
                  {status === "sending" ? "Gönderiliyor..." : "Gönder →"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
