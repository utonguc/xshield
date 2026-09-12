import { contactInfo } from "../data/content";

const inputClass =
  "w-full px-3.5 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--ink)] text-sm outline-none focus:border-[var(--ink)] transition-colors";
const labelClass = "block text-[var(--muted)] text-[13px] font-semibold mb-1.5";

export default function Contact() {
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
          <form className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Ad Soyad *</label>
                <input type="text" placeholder="Ahmet Yılmaz" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Firma</label>
                <input type="text" placeholder="Şirket A.Ş." className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>E-posta *</label>
              <input type="email" placeholder="ahmet@firma.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>İlgilendiğiniz Hizmet</label>
              <select className={inputClass}>
                <option value="">Seçiniz...</option>
                <option>Cloud Sunucu</option>
                <option>Ağ Yönetimi</option>
                <option>Sunucu Yönetimi</option>
                <option>Siber Güvenlik</option>
                <option>Altyapı Hizmetleri</option>
                <option>IT Danışmanlığı</option>
                <option>e-Clinic</option>
                <option>Signed</option>
                <option>ShieldSpot</option>
                <option>Diğer</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Mesajınız *</label>
              <textarea
                placeholder="Projeniz veya ihtiyacınız hakkında kısaca bilgi verin..."
                rows={4}
                className={`${inputClass} resize-y`}
              />
            </div>
            <button
              type="submit"
              className="px-7 py-3.5 rounded-[9px] bg-[var(--ink)] text-white border-none text-[15px] font-bold cursor-pointer hover:bg-black transition-colors"
            >
              Gönder →
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
