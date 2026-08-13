import { getPrices, fmt, calcTotal, fmtRange } from "@/lib/proposal-config";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function SozlesmePage() {
  const p = getPrices();
  const total = calcTotal(p);
  const taksit = Math.round(total / 2);

  return (
    <>
      <style>{css}</style>
      <div className="bar no-print">
        <span>Nexus — Yazılım Geliştirme Sözleşmesi · XS-2026-047</span>
        <PrintButton />
      </div>
      <div className="contract">

        <div className="header-block">
          <h1>YAZILIM GELİŞTİRME VE TESLİM SÖZLEŞMESİ</h1>
          <p className="ref">Sözleşme No: <strong>XS-2026-047</strong> &nbsp;·&nbsp; Tarih: <strong>Mayıs 2026</strong> &nbsp;·&nbsp; Geçerlilik: <strong>30 gün</strong></p>
        </div>

        <section>
          <h2>TARAFLAR</h2>
          <table>
            <tbody>
              <tr>
                <td className="lbl">Hizmet Sağlayıcı</td>
                <td><strong>xShield Yazılım</strong><br/>xshield.com.tr &nbsp;·&nbsp; info@xshield.com.tr</td>
              </tr>
              <tr>
                <td className="lbl">Müşteri</td>
                <td>
                  <strong>EKİPHAN OTEL EKİPMANLARI A.Ş</strong><br/>
                  Proje Yetkilisi: Halil Karabaş<br/>
                  halilkrbs007@gmail.com &nbsp;·&nbsp; 0539 940 07 79
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Madde 1 — Sözleşmenin Konusu</h2>
          <p>Bu sözleşme; aşağıda tanımlanan taraflar arasında, <strong>Nexus</strong> adıyla anılan, Tiger 3 ERP entegrasyonlu kurumsal B2B sipariş ve stok yönetim platformunun tasarımı, geliştirilmesi ve teslimini kapsar. Platform; Müşteri&apos;nin Tiger 3 SQL Server veritabanına Sync Agent aracılığıyla bağlanacak, bayi ve kurumsal alıcılara özel sipariş portalı, e-belge ve kargo entegrasyonlarını içerecektir.</p>
        </section>

        <section>
          <h2>Madde 2 — Proje Kapsamı ve Teslim Modülleri</h2>
          <p>xShield, aşağıdaki 9 modülü en fazla <strong>8 hafta</strong> içinde teslim etmeyi taahhüt eder:</p>
          <ol>
            <li><strong>Tiger 3 Sync Agent</strong> — Ürün, stok, cari ve fiyat listesi delta senkronizasyonu; sipariş yazımı; Windows Service MSI installer.</li>
            <li><strong>Ürün Kataloğu Yönetimi</strong> — 60.000+ SKU, varyant grupları, toplu fotoğraf yükleme, gelişmiş arama.</li>
            <li><strong>Stok Yönetimi</strong> — Giriş/çıkış hareketleri, sayım formu, tedarikçi kartları.</li>
            <li><strong>B2B Sipariş Portalı</strong> — Müşteri bazlı fiyat listeleri, onay akışlı sipariş, bakiye/borç görüntüleme.</li>
            <li><strong>e-Fatura / e-Arşiv / e-İrsaliye</strong> — GİB onaylı entegratör API, otomatik belge üretimi, iptal/iade akışı.</li>
            <li><strong>Kargo Entegrasyonları</strong> — Yurtiçi, Aras, MNG Kargo API; otomatik gönderi ve takip linki.</li>
            <li><strong>Sanal POS</strong> — 3D Secure ödeme, sipariş bazlı tahsilat ve iade.</li>
            <li><strong>Admin Paneli & Raporlama</strong> — Kullanıcı/yetki yönetimi, sipariş dashboard, Excel/PDF export.</li>
            <li><strong>Test, Canlıya Alım & Eğitim</strong> — Kullanıcı kabul testleri, production deployment, 3 kullanıcı eğitimi.</li>
          </ol>
        </section>

        <section>
          <h2>Madde 3 — Proje Bedeli</h2>
          <table>
            <tbody>
              <tr><td>Yazılım geliştirme (tüm modüller, entegrasyonlar, testler)</td><td className="amt">{fmt(p.gelistirme)}</td></tr>
              <tr><td>Veri aktarımı (60.000+ SKU Tiger 3&apos;ten Nexus&apos;a)</td><td className="amt">{fmt(p.veri_aktarimi)}</td></tr>
              <tr><td>Altyapı kurulumu ve DevOps yapılandırması</td><td className="amt">{fmt(p.altyapi)}</td></tr>
              <tr><td>Eğitim ve dokümantasyon (3 kullanıcı)</td><td className="amt">{fmt(p.egitim)}</td></tr>
              <tr><td>6 aylık garanti desteği</td><td className="amt">{fmt(p.garanti)}</td></tr>
              <tr className="total-row"><td><strong>TOPLAM (KDV Hariç)</strong></td><td className="amt"><strong>{fmt(total)}</strong></td></tr>
            </tbody>
          </table>
          <p className="note">* Aylık sunucu/hosting bedeli ({fmtRange(p.sunucu_min, p.sunucu_max)}) bu tutara dahil değildir ve ayrıca uygulanır.</p>
        </section>

        <section>
          <h2>Madde 4 — Ödeme Planı</h2>
          <table>
            <thead>
              <tr><th>Taksit</th><th>Tutar</th><th>Ödeme Zamanı</th></tr>
            </thead>
            <tbody>
              <tr><td>1. Taksit — %50</td><td className="amt"><strong>{fmt(taksit)}</strong></td><td>Sözleşme imzalanmasında — proje başlangıcında</td></tr>
              <tr><td>2. Taksit — %50</td><td className="amt"><strong>{fmt(taksit)}</strong></td><td>Canlıya alım onayında — production&apos;a geçişte</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Madde 5 — Üçüncü Taraf Gider Yükümlülükleri</h2>
          <p>Projede kullanılacak tüm üçüncü taraf lisans, abonelik ve entegrasyon ücretleri <strong>Müşteri tarafından</strong> karşılanır. xShield yalnızca teknik entegrasyon yazılımını geliştirmekle yükümlüdür.</p>
          <table>
            <thead>
              <tr><th>Hizmet</th><th>Müşteri Yükümlülüğü</th><th>Gereklilik Zamanı</th></tr>
            </thead>
            <tbody>
              <tr><td>Tiger 3 SQL Server Erişimi</td><td>Bağlantı bilgileri ve okuma/yazma yetkili DB kullanıcısı</td><td>Proje başında</td></tr>
              <tr><td>e-Fatura / e-Arşiv Entegratörü</td><td>GİB onaylı entegratörle sözleşme, API bilgileri ve abonelik</td><td>Faz 2 öncesi</td></tr>
              <tr><td>Kargo Firması API Sözleşmeleri</td><td>Her firma için teknik entegrasyon sözleşmesi ve API anahtarı</td><td>Faz 2 öncesi</td></tr>
              <tr><td>Sanal POS / Ödeme Kuruluşu</td><td>Banka veya ödeme kuruluşuyla sözleşme, API bilgileri</td><td>Faz 2 öncesi</td></tr>
              <tr><td>Sunucu / Hosting</td><td>Aylık {fmtRange(p.sunucu_min, p.sunucu_max)} sunucu bedeli</td><td>Canlı öncesi</td></tr>
              <tr><td>Tiger 3 API Lisansı (opsiyonel)</td><td>Gerektiğinde Logo&apos;dan API modül lisansı</td><td>Talep halinde</td></tr>
            </tbody>
          </table>
          <p className="note">* Herhangi bir hizmet zamanında temin edilmez ya da API bilgileri geç sağlanırsa teslim tarihi müşteri kaynaklı gecikme kapsamında revize edilir.</p>
        </section>

        <section>
          <h2>Madde 6 — Sorumluluk Sınırları</h2>
          <table>
            <thead>
              <tr><th>Konu</th><th>xShield Sorumluluğu</th><th>Müşteri Sorumluluğu</th></tr>
            </thead>
            <tbody>
              <tr><td>Tiger 3 veri doğruluğu</td><td>Senkronizasyonun hatasız çalışması</td><td>ERP&apos;deki kaynak verinin doğru ve güncel olması</td></tr>
              <tr><td>e-Fatura geçerliliği</td><td>Teknik entegrasyon ve belge üretim yazılımı</td><td>GİB kaydı, Mali Mühür ve entegratör aboneliği</td></tr>
              <tr><td>Kargo teslimatı</td><td>API entegrasyonu ve gönderi oluşturma</td><td>Kargo firmasıyla sözleşme ve ücretler</td></tr>
              <tr><td>Üçüncü taraf servis kesintisi</td><td>Teknik destek ve alternatif çözüm önerisi</td><td>Kesintiden doğan iş kaybı xShield sorumluluğunda değildir</td></tr>
              <tr><td>Tiger 3 güncelleme sonrası uyum</td><td>Bakım kapsamında şema değişikliği takibi</td><td>Planlı güncellemeyi en az 2 hafta önceden bildirmek</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Madde 7 — Genel Koşullar</h2>
          <ol>
            <li>Tam ödeme tamamlandıktan sonra yazılımın kaynak kodu ve tüm hakları Müşteri&apos;ye devredilir.</li>
            <li>Keşif formunda tanımlanan kapsamı aşan talepler ayrı değerlendirmeyle fiyatlandırılır.</li>
            <li>Ödeme planına uyulmaması halinde xShield geliştirme çalışmalarını geçici olarak dondurma hakkını saklı tutar.</li>
            <li>Her iki taraf da proje süresince paylaşılan bilgilerin gizliliğini korumayı taahhüt eder.</li>
            <li>Bu teklif imza tarihinden itibaren 30 gün geçerlidir.</li>
            <li>Anlaşmazlık halinde İstanbul mahkemeleri ve icra daireleri yetkilidir.</li>
          </ol>
        </section>

        <section>
          <h2>Madde 8 — Yürürlük</h2>
          <p>Bu sözleşme, her iki tarafça imzalandığı tarihten itibaren yürürlüğe girer.</p>
        </section>

        <section className="sig-section">
          <h2>İMZALAR</h2>
          <div className="sig-grid">
            <div className="sig-block">
              <p className="sig-role">Hizmet Sağlayıcı</p>
              <p className="sig-name">xShield Yazılım</p>
              <div className="sig-line" />
              <p className="sig-label">Yetkili İmza</p>
              <p className="sig-date">Tarih: _____ / _____ / 2026</p>
            </div>
            <div className="sig-block">
              <p className="sig-role">Müşteri</p>
              <p className="sig-name">EKİPHAN OTEL EKİPMANLARI A.Ş</p>
              <p className="sig-authorized">Halil Karabaş — Proje Yetkilisi</p>
              <div className="sig-line" />
              <p className="sig-label">Yetkili İmza / Kaşe</p>
              <p className="sig-date">Tarih: _____ / _____ / 2026</p>
            </div>
          </div>
        </section>

        <div className="doc-footer">
          xShield Yazılım &nbsp;·&nbsp; xshield.com.tr &nbsp;·&nbsp; Sözleşme No: XS-2026-047 &nbsp;·&nbsp; Gizli
        </div>

      </div>
    </>
  );
}

const css = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,'Times New Roman',serif;font-size:12pt;color:#111;background:#f5f5f5;line-height:1.7}

.bar{background:#1e293b;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:12px 32px;font-family:Arial,sans-serif;font-size:12px;position:sticky;top:0;z-index:10}
.bar button{background:#2563eb;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Arial,sans-serif}
.bar button:hover{background:#1d4ed8}

.contract{max-width:750px;margin:32px auto 60px;background:#fff;padding:56px 64px;box-shadow:0 2px 16px rgba(0,0,0,0.1)}

.header-block{text-align:center;padding-bottom:28px;border-bottom:2px solid #111;margin-bottom:32px}
h1{font-size:16pt;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:10px}
.ref{font-size:10pt;color:#444;letter-spacing:0.3px}

section{margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid #ddd}
section:last-of-type{border-bottom:none}
h2{font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;color:#111}
p{margin-bottom:8px;font-size:11pt}

table{width:100%;border-collapse:collapse;margin:10px 0;font-size:10.5pt}
th{background:#111;color:#fff;padding:7px 10px;text-align:left;font-size:9.5pt;font-weight:600;font-family:Arial,sans-serif}
td{padding:7px 10px;border:1px solid #ccc;vertical-align:top}
td.lbl{font-weight:600;width:140px;background:#f9f9f9}
td.amt{text-align:right;width:90px;white-space:nowrap}
tr.total-row td{border-top:2px solid #111;background:#f9f9f9}

ol{margin:10px 0 0 20px}
li{margin-bottom:6px;font-size:11pt}

.note{font-size:9.5pt;color:#666;margin-top:6px;font-style:italic}

.sig-section h2{margin-bottom:20px}
.sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px}
.sig-block{padding-top:8px}
.sig-role{font-size:9pt;text-transform:uppercase;letter-spacing:0.5px;color:#666;margin-bottom:4px}
.sig-name{font-size:12pt;font-weight:700;margin-bottom:4px}
.sig-authorized{font-size:10pt;color:#444;margin-bottom:40px}
.sig-line{border-bottom:1px solid #111;margin-bottom:6px}
.sig-label{font-size:9.5pt;color:#444}
.sig-date{font-size:9.5pt;color:#666;margin-top:4px}

.doc-footer{text-align:center;font-size:8.5pt;color:#999;margin-top:32px;padding-top:16px;border-top:1px solid #ddd;font-family:Arial,sans-serif}

@page{size:A4 portrait;margin:20mm 18mm}
@media print{
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{background:#fff}
  .bar,.no-print{display:none!important}
  .contract{margin:0;padding:0;box-shadow:none;max-width:100%}
  section{break-inside:avoid}
  .sig-grid{break-inside:avoid}
  table{break-inside:auto}
  tr{break-inside:avoid}
}
`;
