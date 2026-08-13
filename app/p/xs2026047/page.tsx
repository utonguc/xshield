import type { Metadata } from "next";
import { getPrices, fmt, calcTotal, fmtRange } from "@/lib/proposal-config";

export const metadata: Metadata = {
  title: "Nexus — Proje Teklifi | xShield",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProposalPage() {
  const p = getPrices();
  const total = calcTotal(p);
  const taksit = Math.round(total / 2);
  return (
    <>
      <style>{css}</style>
      <div className="doc">

        {/* ── COVER ── */}
        <div className="cover" id="cover">
          <div className="cover-brand">
            <div className="xshield">x<span>Shield</span></div>
            <div className="vl" />
            <div className="tagline">Yazılım & Dijital Platformlar</div>
          </div>
          <div className="cover-hero">
            <div className="eyebrow">Proje Teknik Dökümanı & Teklif</div>
            <div className="cover-title">Nexus</div>
            <div className="cover-sub">Tiger 3 Entegrasyonlu Kurumsal B2B Sipariş & Stok Yönetim Platformu</div>
            <div className="pills">
              {["B2B Commerce","Tiger 3 / ERP Entegrasyon","e-Fatura · e-İrsaliye","Çok Kargo Firması","Sanal POS","60.000+ SKU"].map(p => (
                <span key={p} className="pill">{p}</span>
              ))}
            </div>
          </div>
          <div className="cover-meta">
            <div>
              <div className="meta-label">Hazırlayan</div>
              <div className="meta-name">xShield Yazılım</div>
              <div className="meta-sub">xshield.com.tr</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div className="cover-badge">Mayıs 2026</div>
              <div className="meta-sub" style={{marginTop:8}}>Müşteri: EKİPHAN OTEL EKİPMANLARI A.Ş</div>
              <div className="meta-sub" style={{color:"#334155"}}>Proje Yetkilisi: Halil Karabaş</div>
              <div className="meta-sub">Teklif No: XS-2026-047</div>
            </div>
          </div>
        </div>

        {/* ── 1. GENEL BAKIŞ ── */}
        <div className="section" id="overview">
          <div className="eyebrow">Bölüm 1</div>
          <h1 className="ptitle">Platform Genel Bakış</h1>
          <p className="pdesc">Nexus nedir, hangi ihtiyacı karşılar ve nasıl çalışır?</p>

          <h2><span className="h2n">1</span> Neden Nexus?</h2>
          <p>Tiger 3 kullanan kurumsal firmalarda depo, stok ve muhasebe süreçleri ERP içinde güçlü biçimde yönetilmektedir. Ancak dış satış kanalı — bayiler, toptancı alıcılar, kurumsal müşteriler — hâlâ telefon, e-posta veya saha satış ekibi üzerinden sipariş vermektedir. Bu iki sistem arasındaki köprüsüzlük operasyonel maliyeti artırır, hata riskini yükseltir ve müşteri deneyimini olumsuz etkiler.</p>
          <div className="cards col3">
            <div className="card"><div className="ci">📞</div><h4>Manuel Sipariş Süreci</h4><p>Bayilerden telefon veya WhatsApp ile sipariş alınması, satış ekibinin manuel ERP girişi yapması.</p></div>
            <div className="card"><div className="ci">🔄</div><h4>Çift Taraflı Veri Girişi</h4><p>Aynı siparişin hem alıcı sisteminde hem ERP&apos;de ayrı ayrı işlenmesi; hata ve gecikme kaynağı.</p></div>
            <div className="card"><div className="ci">📊</div><h4>Gerçek Zamanlı Görünürlük Eksikliği</h4><p>Müşterilerin anlık stok, sipariş durumu ve belgelerine erişememesi.</p></div>
          </div>

          <h2><span className="h2n">2</span> Nexus Ne Sağlar?</h2>
          <p>Nexus; Tiger 3 ERP&apos;yi merkeze alarak bayi ve kurumsal alıcılara özel bir B2B sipariş portalı sunar. Siparişler portal üzerinden otomatik olarak Tiger 3&apos;e aktarılır, stok gerçek zamanlı senkronize edilir, e-belgeler otomatik oluşturulur. Satış ekibinin manuel veri girişi süreci sona erer.</p>
          <div className="hl green"><strong>Temel Yaklaşım — API Bağımsız Entegrasyon:</strong> Nexus, Tiger 3&apos;ün SQL Server veritabanına Sync Agent aracılığıyla doğrudan bağlanır. Bu sayede harici API lisansı gerekmeksizin tüm ERP verisi gerçek zamanlı olarak senkronize edilir.</div>

          <h2><span className="h2n">3</span> Çözümün Kapsamı</h2>
          <div className="cards col2">
            <div className="card blue"><h4>Tiger 3 Sync Agent</h4><p>Müşteri sunucusunda çalışan, Tiger 3 veritabanı ile platformu gerçek zamanlı senkronize eden Windows servisi.</p></div>
            <div className="card blue"><h4>Ürün Kataloğu & Stok</h4><p>60.000+ SKU desteği, varyant yönetimi, anlık stok durumu, tedarikçi ve hareket takibi.</p></div>
            <div className="card blue"><h4>B2B Sipariş Portalı</h4><p>Bayi ve kurumsal alıcılara özel giriş, müşteri bazlı fiyatlandırma, onay akışlı sipariş süreci.</p></div>
            <div className="card blue"><h4>Entegrasyonlar</h4><p>e-Fatura, e-arşiv, e-irsaliye; çoklu kargo firması desteği; sanal POS ile güvenli ödeme.</p></div>
          </div>
        </div>

        {/* ── 2. MİMARİ ── */}
        <div className="section section-dark" id="architecture">
          <div className="eyebrow">Bölüm 2</div>
          <h1 className="ptitle" style={{color:"#f1f5f9"}}>Teknik Mimari</h1>
          <p className="pdesc" style={{color:"#94a3b8"}}>Nexus dört katmandan oluşur: lokal Sync Agent, bulut API platformu, entegrasyon katmanı ve kullanıcı arabirimleri.</p>
          <div className="arch">
            <div className="arch-label">Nexus — Sistem Mimarisi</div>
            <div className="arch-layer">
              <div className="albl">① Müşteri Yerel Ağı</div>
              <div className="aboxes">
                <div className="abox ob"><span className="ai">🗄️</span><span className="an">Tiger 3</span><span className="as">SQL Server</span></div>
                <span className="arr">→</span>
                <div className="abox accent"><span className="ai">⚡</span><span className="an">Nexus Sync Agent</span><span className="as">Windows Service</span></div>
                <span className="arr">→</span>
                <div className="abox"><span className="ai">🌐</span><span className="an">HTTPS</span><span className="as">Şifreli iletişim</span></div>
              </div>
            </div>
            <div className="arch-arrow">↓</div>
            <div className="arch-layer">
              <div className="albl">② Bulut — API & Platform</div>
              <div className="aboxes">
                {[["🔀","API Gateway","ASP.NET Core"],["💾","Platform DB","PostgreSQL"],["⚙️","İş Mantığı","Servis Katmanı"],["📨","Async Kuyruk","Arka plan işleri"]].map(([i,n,s]) => (
                  <div key={n} className="abox accent"><span className="ai">{i}</span><span className="an">{n}</span><span className="as">{s}</span></div>
                ))}
              </div>
            </div>
            <div className="arch-arrow">↓</div>
            <div className="arch-layer">
              <div className="albl">③ Entegrasyon Katmanı</div>
              <div className="aboxes">
                {[["📄","e-Fatura","GİB / Entegratör"],["🚚","Kargo","Yurtiçi · Aras · MNG"],["💳","Sanal POS","3D Secure"],["📧","E-posta","Transactional"]].map(([i,n,s]) => (
                  <div key={n} className="abox gb"><span className="ai">{i}</span><span className="an">{n}</span><span className="as">{s}</span></div>
                ))}
              </div>
            </div>
            <div className="arch-arrow">↓</div>
            <div className="arch-layer">
              <div className="albl">④ Kullanıcı Arabirimleri</div>
              <div className="aboxes">
                {[["🏢","Admin Paneli","Next.js"],["🛒","B2B Portal","Bayi / Kurumsal"],["📱","Mobil Uyumlu","Responsive Web"]].map(([i,n,s]) => (
                  <div key={n} className="abox accent"><span className="ai">{i}</span><span className="an">{n}</span><span className="as">{s}</span></div>
                ))}
              </div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginTop:32}}>
            <div>
              <h2 style={{color:"#f1f5f9"}}><span className="h2n">1</span> Sync Agent</h2>
              <p style={{color:"#94a3b8"}}>Sync Agent, müşterinin yerel sunucusuna kurulan .NET Worker Service uygulamasıdır. Tiger 3&apos;ün SQL Server&apos;ına bağlanarak değişen kayıtları tespit eder ve bulut platformuna iletir. Tersine, platformdan gelen siparişleri Tiger tablolarına yazar.</p>
              <div className="cards col1" style={{marginTop:12}}>
                <div className="card dark-card"><h4>Delta Senkronizasyon</h4><p>Yalnızca değişen kayıtlar aktarılır. LASTMODIFIED ve LOGICALREF alanları ile fark takibi yapılır.</p></div>
                <div className="card dark-card"><h4>Çift Yönlü Yazma</h4><p>Stok verisi Tiger → Platform yönünde akar. Siparişler Platform → Tiger yönünde yazılır.</p></div>
              </div>
            </div>
            <div>
              <h2 style={{color:"#f1f5f9"}}><span className="h2n">2</span> Teknoloji Yığını</h2>
              <table className="tech-table">
                <tbody>
                  <tr><td className="tech-lbl">Sync Agent</td><td>.NET 8 Worker Service — Windows Service</td></tr>
                  <tr><td className="tech-lbl">API / Backend</td><td>ASP.NET Core 8 + PostgreSQL 16</td></tr>
                  <tr><td className="tech-lbl">Frontend / B2B</td><td>Next.js (App Router) + TypeScript</td></tr>
                  <tr><td className="tech-lbl">Altyapı</td><td>Docker + nginx reverse proxy</td></tr>
                  <tr><td className="tech-lbl">Tiger DB</td><td>ADO.NET — SQL Server native driver</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── 3. MODÜLLER ── */}
        <div className="section" id="modules">
          <div className="eyebrow">Bölüm 3</div>
          <h1 className="ptitle">Modül Kapsamı</h1>
          <p className="pdesc">Nexus&apos;un teslim edilecek dokuz modülünün detaylı tanımı.</p>
          <div className="mod-list">
            {modules.map((m) => (
              <div key={m.n} className="mod-item">
                <div className="mod-n">{m.n}</div>
                <div className="mod-body">
                  <h4>{m.title}</h4>
                  <p>{m.desc}</p>
                  <ul>{m.items.map(i => <li key={i}>{i}</li>)}</ul>
                </div>
                <div className="mod-tags">
                  {m.crit && <span className="tag-crit">KRİTİK</span>}
                  <span className="tag-week">{m.weeks}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. ZORLUKLAR ── */}
        <div className="section" id="challenges">
          <div className="eyebrow">Bölüm 4</div>
          <h1 className="ptitle">Teknik Zorluklar & Riskler</h1>
          <p className="pdesc">Bu projeyi standart web projelerinden ayıran teknik karmaşıklıklar ve yönetim yaklaşımları.</p>

          <div className="cards col2" style={{marginBottom:28}}>
            <div>
              <h2><span className="h2n">1</span> Tiger 3 Şema Analizi</h2>
              <div className="hl orange"><strong>Zorluk:</strong> Tiger 3 tablo yapısı firma numarasına göre dinamik isimlendirilir (LG_001_ITEMS). Proje başında 3–5 günlük şema keşif süreci gerekir.</div>
              <p>Yönetim: Şema keşfi altyapı kurulumu ile eş zamanlı yürütülür.</p>
            </div>
            <div>
              <h2><span className="h2n">2</span> 60.000+ SKU Performansı</h2>
              <div className="hl orange"><strong>Zorluk:</strong> Bu ölçekteki kataloğun ilk aktarımı ve B2B portaldaki arama/filtreleme performansı özel optimizasyon gerektirir.</div>
              <p>Yönetim: İlk aktarım batch INSERT, sonrakiler delta sync ile yapılır.</p>
            </div>
            <div>
              <h2><span className="h2n">3</span> Çift Yönlü Senkronizasyon</h2>
              <div className="hl orange"><strong>Zorluk:</strong> Hem Tiger 3&apos;te hem platformda eş zamanlı değişiklik oluştuğunda veri tutarlılığının korunması kritiktir.</div>
              <p>Yönetim: &quot;Tiger otoritedir&quot; ilkesi uygulanır.</p>
            </div>
            <div>
              <h2><span className="h2n">4</span> e-Fatura Entegrasyon Süreci</h2>
              <div className="hl orange"><strong>Zorluk:</strong> GİB onaylı entegratör API&apos;si ve UBL-TR formatında belge üretimi teknik birikim gerektirir.</div>
              <p>Yönetim: Faz 2 başlamadan önce müşterinin entegratör aboneliği aktif olmalıdır.</p>
            </div>
          </div>

          <h2><span className="h2n">5</span> Risk Matrisi</h2>
          <div className="risk-wrap">
            <div className="risk-row header">
              <div>Risk</div><div>Olasılık</div><div>Etki</div><div>Seviye</div>
            </div>
            {risks.map(r => (
              <div key={r[0]} className="risk-row">
                <div>{r[0]}</div>
                <div>{r[1]}</div>
                <div>{r[2]}</div>
                <div><span className={`badge b${r[3]}`}>{r[3] === "h" ? "YÜK" : r[3] === "m" ? "ORT" : "DÜŞ"}</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. ZAMAN PLANI ── */}
        <div className="section" id="timeline">
          <div className="eyebrow">Bölüm 5</div>
          <h1 className="ptitle">Proje Zaman Planı</h1>
          <p className="pdesc">Paralel geliştirme izleri ile 8 haftalık sıkıştırılmış proje takvimi.</p>
          <div className="hl" style={{marginBottom:24}}><strong>Yaklaşım:</strong> Çekirdek modüller (Sync Agent, Katalog, B2B Portal) eş zamanlı sprint&apos;lerle geliştirilir. Entegrasyonlar ikinci sprintle paralel ilerler. Bu sayede toplam süre yarıya indirilir.</div>
          <div className="tl">
            {timeline.map((t, i) => (
              <div key={i} className="tl-item">
                <div className="tl-period">{t.period}</div>
                <div className="tl-spine">
                  <div className={`tl-dot ${t.type || ""}`} />
                  {i < timeline.length - 1 && <div className="tl-line" />}
                </div>
                <div className="tl-content">
                  <strong>{t.title}</strong>
                  <span>{t.desc}</span>
                  {t.tags && (
                    <div className="tl-subs">
                      {t.tags.map(tag => (
                        <span key={tag.label} className={`tl-sub${tag.parallel ? " parallel" : ""}`}>{tag.label}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p style={{fontSize:11.5,color:"#64748b",marginTop:16}}>⇌ simgesi paralel yürütülen iş paketlerini gösterir.</p>
        </div>

        {/* ── 6. TEKLİF ── */}
        <div className="section" id="proposal">
          <div className="eyebrow">Bölüm 6</div>
          <h1 className="ptitle">Teklif & Koşullar</h1>
          <p className="pdesc">Proje bedeli, ödeme planı ve koşulların özeti. İmzalanabilir sözleşme için aşağıdaki butonu kullanın.</p>

          <div className="parties">
            <div className="party"><div className="party-lbl">Hizmet Sağlayıcı</div><p><strong>xShield Yazılım</strong><br/>xshield.com.tr<br/>info@xshield.com.tr</p></div>
            <div className="party"><div className="party-lbl">Müşteri</div><p><strong>EKİPHAN OTEL EKİPMANLARI A.Ş</strong><br/><span style={{fontSize:11,color:"#64748b"}}>Proje Yetkilisi: Halil Karabaş</span><br/>halilkrbs007@gmail.com<br/>0539 940 07 79</p></div>
          </div>

          <div className="price-box">
            <div className="price-head"><h3>Toplam Proje Bedeli</h3><div className="price-total">{fmt(total)}</div></div>
            <div className="price-rows">
              <div className="price-row"><span>Yazılım geliştirme (tüm modüller, entegrasyonlar, testler)</span><strong>{fmt(p.gelistirme)}</strong></div>
              <div className="price-row"><span>Veri aktarımı (60.000+ SKU Tiger 3&apos;ten Nexus&apos;a)</span><strong>{fmt(p.veri_aktarimi)}</strong></div>
              <div className="price-row"><span>Altyapı kurulumu ve DevOps yapılandırması</span><strong>{fmt(p.altyapi)}</strong></div>
              <div className="price-row"><span>Eğitim ve dokümantasyon (3 kullanıcı)</span><strong>{fmt(p.egitim)}</strong></div>
              <div className="price-row"><span>6 aylık garanti desteği</span><strong>{fmt(p.garanti)}</strong></div>
            </div>
          </div>

          <div className="pay-grid">
            <div className="pay-item">
              <div className="pay-n">1. Taksit — %50</div>
              <div className="pay-amt">{fmt(taksit)}</div>
              <div className="pay-when">Sözleşme imzalanmasında</div>
            </div>
            <div className="pay-arrow">→</div>
            <div className="pay-item">
              <div className="pay-n">2. Taksit — %50</div>
              <div className="pay-amt">{fmt(taksit)}</div>
              <div className="pay-when">Canlıya alım onayında</div>
            </div>
          </div>
          <p style={{fontSize:11.5,color:"#64748b",marginBottom:32}}>* Fiyatlar KDV hariçtir. Aylık sunucu/hosting bedeli ({fmtRange(p.sunucu_min, p.sunucu_max)}) ayrıca uygulanır.</p>

          <div className="cta-block">
            <div>
              <div style={{fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:4}}>İmzalanabilir Sözleşme</div>
              <div style={{fontSize:13,color:"#64748b"}}>Teklif detayları, koşullar ve imza bloklarını içeren resmi sözleşmeyi açın, yazdırın veya PDF olarak kaydedin.</div>
            </div>
            <a className="cta-btn" href="/p/xs2026047/sozlesme" target="_blank">📄 Sözleşmeyi Aç</a>
          </div>
        </div>

      </div>

      {/* Floating button */}
      <a className="dl-float" href="/p/xs2026047/sozlesme" target="_blank">📄 Sözleşme</a>
    </>
  );
}

/* ── DATA ── */

const modules = [
  { n:1, title:"Tiger 3 Sync Agent", desc:"Tüm platformun çekirdek bileşeni. Tiger 3 veritabanını platform ile gerçek zamanlı senkronize eder.", crit:true, weeks:"4–5 gün", items:["Ürün, stok, cari ve fiyat listesi delta sync","Sipariş yazımı Tiger tablolarına (ORFICHE + STLINE)","Bağlantı koptuğunda offline kuyruk ve otomatik yeniden deneme","MSI installer ile Windows Service kurulumu"] },
  { n:2, title:"Ürün Kataloğu Yönetimi", desc:"60.000+ SKU kapasiteli performanslı katalog altyapısı.", crit:false, weeks:"3–4 gün", items:["Varyant grupları (renk, beden, model)","Toplu fotoğraf yükleme, kategori ağacı, etiket yönetimi","Barkod, stok kodu ve ürün adına göre gelişmiş arama","Tiger&apos;dan toplu aktarım scripti (ilk kurulum)"] },
  { n:3, title:"Stok Yönetimi", desc:"Tiger 3 ile senkronize anlık stok takibi ve hareket yönetimi.", crit:false, weeks:"2–3 gün", items:["Giriş / çıkış hareketleri ve audit log","Aylık sayım formu ve fark raporu","Tedarikçi kartları ve alım takibi"] },
  { n:4, title:"B2B Sipariş Portalı", desc:"Bayi ve kurumsal alıcılara özel, markaya uyumlu sipariş arayüzü.", crit:true, weeks:"4–5 gün", items:["Müşteri bazlı fiyat listeleri (Tiger&apos;dan çekilir)","Onay akışlı sipariş süreci (taslak → onay → işlemde)","Toplu ürün listesi yükleme (Excel)","Sipariş geçmişi, kargo takibi, belge indirme","Bakiye ve borç durumu görüntüleme"] },
  { n:5, title:"e-Fatura / e-Arşiv / e-İrsaliye", desc:"GİB uyumlu belge altyapısı. Sipariş onayında otomatik tetiklenir.", crit:true, weeks:"2–3 gün", items:["GİB onaylı entegratör API bağlantısı","Sipariş → e-fatura otomatik dönüşüm, PDF + XML arşiv","Müşteriye otomatik e-posta bildirimi","İptal ve iade fatura akışı"] },
  { n:6, title:"Kargo Entegrasyonları", desc:"Çoklu kargo firması desteği ile otomatik gönderi yönetimi.", crit:false, weeks:"1–2 gün", items:["Yurtiçi Kargo, Aras Kargo, MNG Kargo API entegrasyonu","Sipariş onayında otomatik gönderi oluşturma ve etiket","Müşteriye SMS / e-posta takip linki"] },
  { n:7, title:"Sanal POS", desc:"B2B portal üzerinden 3D Secure güvenli ödeme altyapısı.", crit:false, weeks:"1–2 gün", items:["1 banka / ödeme kuruluşu entegrasyonu","Sipariş bazlı tahsilat ve kısmi iade yönetimi"] },
  { n:8, title:"Admin Paneli & Raporlama", desc:"Tüm operasyonun tek noktadan yönetildiği kontrol merkezi.", crit:false, weeks:"2–3 gün", items:["Kullanıcı, bayi ve yetki yönetimi","Sipariş akışı dashboard, stok ve ciro raporları","Excel / PDF export"] },
  { n:9, title:"Test, Canlıya Alım & Eğitim", desc:"Kapsamlı test süreci ve kullanıcı onboarding.", crit:false, weeks:"3–4 gün", items:["Kullanıcı kabul testleri (UAT) gerçek Tiger verisiyle","Production deployment ve güvenlik yapılandırması","3 kullanıcı için eğitim, kullanıcı kılavuzu ve admin rehberi"] },
];

const risks: [string,string,string,string][] = [
  ["Tiger 3 şemasının beklenenden farklı çıkması","Orta","Yüksek","h"],
  ["e-Fatura entegratör onay sürecinin gecikmesi","Orta","Orta","m"],
  ["60K SKU ilk aktarımda performans sorunu","Düşük","Orta","m"],
  ["Müşteri taraflı API bilgilerinin geç sağlanması","Yüksek","Orta","m"],
  ["Tiger 3 güncelleme sonrası şema değişikliği","Düşük","Orta","l"],
];

const timeline = [
  { period:"Hf. 1", title:"Altyapı & Tiger Şema Analizi", desc:"Geliştirme ortamı, Docker altyapısı, Tiger 3 SQL Server şema keşfi, veri modeli tasarımı.", tags:[{label:"Tiger şema"},{label:"DB tasarımı"},{label:"Altyapı kurulumu"}] },
  { period:"Hf. 2–4", title:"Faz 1 — Sync Agent + Katalog + Stok", desc:"Tiger → Platform tek yönlü sync, ürün aktarımı, stok hareketleri. Eş zamanlı olarak B2B portal ekranları başlatılır.", tags:[{label:"Sync Agent v1"},{label:"60K ürün aktarımı"},{label:"Stok modülü"},{label:"⇌ B2B portal scaffold",parallel:true}] },
  { period:"Hf. 3–6", title:"Faz 2 — B2B Portal + Sipariş Akışı", desc:"Bayi/kurumsal portal, onay akışlı sipariş yönetimi, Platform → Tiger sipariş yazımı. Entegrasyon geliştirmeleri paralel başlar.", type:"", tags:[{label:"B2B portal"},{label:"Sipariş → Tiger"},{label:"Fiyat listeleri"},{label:"⇌ e-Fatura geliştirme",parallel:true}] },
  { period:"Hf. 5–7", title:"Faz 3 — Entegrasyonlar + Admin", desc:"e-Fatura/e-arşiv/e-irsaliye, kargo entegrasyonları, sanal POS, admin paneli ve raporlama tamamlanır.", tags:[{label:"e-Fatura"},{label:"Kargo API"},{label:"Sanal POS"},{label:"Admin & Raporlar"}] },
  { period:"Hf. 7", title:"UAT & Düzeltmeler", type:"ms", desc:"Gerçek Tiger verisiyle kullanıcı kabul testleri. Müşteri onaylı bulgular çözümlenir." },
  { period:"Hf. 8", title:"🚀 Canlıya Alım + Eğitim", type:"launch", desc:"Production deployment, 3 kullanıcı eğitimi, ilk 2 hafta yoğun canlı destek." },
  { period:"Ay 3–8", title:"Garanti & Bakım Dönemi (6 ay)", type:"", desc:"Hata düzeltme, kullanım deneyiminden gelen iyileştirmeler ve sonraki geliştirme talepleri bu dönemde değerlendirilir." },
];

/* ── CSS ── */
const css = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,Arial,sans-serif;font-size:13px;color:#334155;background:#0f172a;line-height:1.6}
.doc{max-width:960px;margin:0 auto}

.cover{background:linear-gradient(145deg,#0f172a 0%,#1e293b 60%,#0f2952 100%);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:60px;min-height:100vh}
.cover-brand{display:flex;align-items:center;gap:12px}
.xshield{font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#94a3b8}
.xshield span{color:#3b82f6}
.vl{width:1px;height:24px;background:#334155}
.tagline{font-size:12px;color:#64748b;letter-spacing:0.5px}
.cover-hero{flex:1;display:flex;flex-direction:column;justify-content:center;padding:80px 0 60px}
.eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#3b82f6;font-weight:700;margin-bottom:6px}
.cover-title{font-size:88px;font-weight:900;letter-spacing:-4px;line-height:1;margin-bottom:8px;background:linear-gradient(135deg,#fff 0%,#93c5fd 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.cover-sub{font-size:22px;color:#94a3b8;font-weight:400;margin-bottom:48px;letter-spacing:-0.3px}
.pills{display:flex;gap:10px;flex-wrap:wrap}
.pill{background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);color:#93c5fd;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:500}
.cover-meta{display:flex;justify-content:space-between;align-items:flex-end}
.meta-label{font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:#475569;margin-bottom:4px}
.meta-name{font-size:15px;font-weight:700;color:#cbd5e1}
.meta-sub{font-size:12px;color:#475569}
.cover-badge{display:inline-block;background:rgba(59,130,246,0.2);color:#60a5fa;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.5px}

.section{background:#fff;padding:64px 72px}
.section+.section{border-top:3px solid #f1f5f9}
.section-dark{background:#0f172a}

.ptitle{font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.6px;margin-bottom:6px;line-height:1.2}
.pdesc{font-size:13px;color:#64748b;margin-bottom:32px;max-width:560px;line-height:1.7}
h2{font-size:14px;font-weight:700;color:#0f172a;margin:28px 0 12px;display:flex;align-items:center;gap:10px}
.h2n{width:24px;height:24px;background:#2563eb;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
p{margin-bottom:10px;line-height:1.7}

.hl{border-left:4px solid #2563eb;background:#eff6ff;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;color:#1e293b;line-height:1.7}
.hl.orange{background:#fffbeb;border-color:#d97706}
.hl.green{background:#f0fdf4;border-color:#059669}

.cards{display:grid;gap:12px;margin:16px 0}
.col1{grid-template-columns:1fr}
.col2{grid-template-columns:1fr 1fr}
.col3{grid-template-columns:1fr 1fr 1fr}
.card{border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px}
.card .ci{font-size:22px;margin-bottom:10px}
.card h4{font-size:12px;font-weight:700;color:#0f172a;margin-bottom:5px}
.card p{font-size:11.5px;color:#334155;margin:0;line-height:1.6}
.card.blue{border-color:#bfdbfe;background:#eff6ff}
.dark-card{background:#1e293b;border-color:#334155}
.dark-card h4{color:#e2e8f0}
.dark-card p{color:#94a3b8}

.arch{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:32px;color:#fff;margin:24px 0}
.arch-label{font-size:11px;color:#64748b;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px}
.arch-layer{border:1px solid #334155;border-radius:8px;padding:14px 18px;margin:8px 0}
.albl{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:10px}
.aboxes{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.abox{background:#1e293b;border:1px solid #334155;border-radius:6px;padding:8px 14px;font-size:11px;color:#e2e8f0;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:100px;text-align:center}
.ai{font-size:18px}.an{font-size:11px;font-weight:600}.as{font-size:10px;color:#64748b}
.abox.accent{background:#1e3a8a;border-color:#2563eb}
.abox.gb{background:#064e3b;border-color:#059669}
.abox.ob{background:#451a03;border-color:#d97706}
.arr{color:#475569;font-size:20px}
.arch-arrow{text-align:center;color:#475569;font-size:18px;margin:4px 0;letter-spacing:4px}

.tech-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
.tech-table td{padding:8px 12px;border-bottom:1px solid #1e293b;color:#cbd5e1;vertical-align:top}
.tech-table tr:last-child td{border-bottom:none}
.tech-lbl{color:#64748b;width:120px;font-size:11px;text-transform:uppercase;letter-spacing:0.3px}

table{width:100%;border-collapse:collapse;font-size:11.5px}
th{background:#0f172a;color:#fff;padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600}
td{padding:8px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;line-height:1.55}
tr:last-child td{border-bottom:none}

.mod-list{display:flex;flex-direction:column}
.mod-item{display:grid;grid-template-columns:32px 1fr auto;gap:14px;padding:14px 0;border-bottom:1px solid #e2e8f0;align-items:start}
.mod-item:last-child{border-bottom:none}
.mod-n{width:32px;height:32px;background:#eff6ff;color:#2563eb;border-radius:7px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0}
.mod-body h4{font-size:12.5px;font-weight:700;color:#0f172a;margin-bottom:3px}
.mod-body p{font-size:11px;color:#64748b;margin:0;line-height:1.55}
.mod-body ul{list-style:none;margin-top:6px;display:flex;flex-direction:column;gap:3px}
.mod-body ul li{font-size:11px;color:#334155;padding-left:13px;position:relative}
.mod-body ul li::before{content:'→';position:absolute;left:0;color:#2563eb;font-size:9px;top:2px}
.mod-tags{display:flex;flex-direction:column;gap:5px;align-items:flex-end}
.tag-crit{background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:9.5px;font-weight:700;white-space:nowrap}
.tag-week{background:#f0fdf4;color:#065f46;padding:2px 8px;border-radius:4px;font-size:9.5px;font-weight:700;white-space:nowrap;margin-top:4px}

.risk-wrap{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:12px}
.risk-row{display:grid;grid-template-columns:2fr 80px 80px 90px}
.risk-row.header>div{background:#0f172a;color:#fff;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
.risk-row>div{padding:11px 14px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#334155}
.risk-row:last-child>div{border-bottom:none}
.badge{padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700}
.badge.bh{background:#fee2e2;color:#991b1b}
.badge.bm{background:#fef3c7;color:#92400e}
.badge.bl{background:#d1fae5;color:#065f46}

.tl{display:flex;flex-direction:column}
.tl-item{display:grid;grid-template-columns:72px 20px 1fr;gap:0 12px;min-height:56px}
.tl-period{text-align:right;font-size:10.5px;color:#64748b;padding-top:13px;font-weight:600}
.tl-spine{display:flex;flex-direction:column;align-items:center}
.tl-dot{width:14px;height:14px;border-radius:50%;background:#2563eb;border:2.5px solid #fff;box-shadow:0 0 0 2px #2563eb;margin-top:10px;flex-shrink:0;z-index:1}
.tl-dot.ms{background:#059669;box-shadow:0 0 0 2px #059669}
.tl-dot.launch{background:#7c3aed;box-shadow:0 0 0 2px #7c3aed;width:18px;height:18px;margin-top:9px}
.tl-line{flex:1;width:2px;background:#e2e8f0;margin:2px 0}
.tl-content{padding:8px 0 14px}
.tl-content strong{display:block;font-size:12px;font-weight:700;color:#0f172a;margin-bottom:2px}
.tl-content span{font-size:11px;color:#64748b}
.tl-subs{margin-top:6px;display:flex;flex-wrap:wrap;gap:5px}
.tl-sub{background:#f8fafc;border:1px solid #e2e8f0;color:#334155;padding:2px 9px;border-radius:4px;font-size:10.5px}
.tl-sub.parallel{background:#f0fdf4;border-color:#a7f3d0;color:#065f46}

.parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
.party{border:1px solid #e2e8f0;border-radius:8px;padding:18px 20px}
.party-lbl{font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;font-weight:600;margin-bottom:10px}
.party p{line-height:2;color:#334155;font-size:12.5px}
.party strong{color:#0f172a}

.price-box{background:#0f172a;border-radius:10px;overflow:hidden;margin:20px 0}
.price-head{background:#1e293b;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
.price-head h3{color:#fff;font-size:13px;margin:0}
.price-total{font-size:28px;font-weight:900;color:#60a5fa;letter-spacing:-1px}
.price-rows{padding:4px 0}
.price-row{display:flex;justify-content:space-between;padding:10px 20px;border-bottom:1px solid #1e293b}
.price-row:last-child{border-bottom:none}
.price-row span{color:#94a3b8;font-size:12px}
.price-row strong{color:#e2e8f0;font-size:12px}

.pay-grid{display:flex;align-items:center;gap:16px;margin:16px 0 12px;padding:20px 24px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0}
.pay-item{flex:1;text-align:center}
.pay-n{font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px}
.pay-amt{font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px}
.pay-when{font-size:11px;color:#94a3b8;margin-top:4px}
.pay-arrow{font-size:24px;color:#cbd5e1}

.cta-block{display:flex;align-items:center;justify-content:space-between;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px 28px;margin-top:8px;gap:24px}
.cta-btn{background:#2563eb;color:#fff;padding:13px 24px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;white-space:nowrap;flex-shrink:0}
.cta-btn:hover{background:#1d4ed8}

.dl-float{position:fixed;bottom:28px;right:28px;z-index:100;background:#2563eb;color:#fff;padding:13px 22px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;box-shadow:0 6px 24px rgba(37,99,235,0.45);letter-spacing:0.1px}
.dl-float:hover{background:#1d4ed8}
`;
