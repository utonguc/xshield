"use client";
import { useState, FormEvent } from "react";

type FormData = {
  // İletişim
  firmaAdi: string; yetkiliAdi: string; email: string; telefon: string;
  // Mevcut durum
  urunKaynagi: string; urunAktiflik: string; urunFotograf: string;
  urunBilgiler: string; urunVaryant: string;
  // Stok
  stokTakip: string; stokDepo: string; stokSayim: string;
  stokTedarik: string; stokUyari: string;
  // B2B
  b2bKullanici: string; b2bFiyat: string; b2bToplu: string;
  b2bOnay: string; b2bBakiye: string;
  // Entegrasyon
  entERP: string; entEFatura: string; entKargo: string; entOdeme: string;
  // Ölçek & PM
  olcekKullanici: string; olcekSiparis: string; olcekMobil: string;
  pmTarih: string; pmMuhatap: string; pmEgitim: string; pmDestek: string;
};

const EMPTY: FormData = {
  firmaAdi:"", yetkiliAdi:"", email:"", telefon:"",
  urunKaynagi:"", urunAktiflik:"", urunFotograf:"", urunBilgiler:"", urunVaryant:"",
  stokTakip:"", stokDepo:"", stokSayim:"", stokTedarik:"", stokUyari:"",
  b2bKullanici:"", b2bFiyat:"", b2bToplu:"", b2bOnay:"", b2bBakiye:"",
  entERP:"", entEFatura:"", entKargo:"", entOdeme:"",
  olcekKullanici:"", olcekSiparis:"", olcekMobil:"",
  pmTarih:"", pmMuhatap:"", pmEgitim:"", pmDestek:"",
};

// ── küçük yardımcı bileşenler ────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.35)",
        textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width:"100%", padding:"11px 14px", background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(255,255,255,0.09)", borderRadius:10, color:"#fff",
  fontSize:14, outline:"none", boxSizing:"border-box",
};

function Input({ value, onChange, placeholder, type="text" }:
  { value:string; onChange:(v:string)=>void; placeholder?:string; type?:string }) {
  return (
    <input type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={inputStyle}
      onFocus={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)"; }}
      onBlur={e  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }} />
  );
}

function Select({ value, onChange, options }: { value:string; onChange:(v:string)=>void; options:string[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...inputStyle, background:"rgba(10,15,30,0.95)", appearance:"none" }}
      onFocus={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)"; }}
      onBlur={e  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}>
      <option value="">Seçiniz…</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Radio({ name, value, current, onChange, label }:
  { name:string; value:string; current:string; onChange:(v:string)=>void; label:string }) {
  const checked = current === value;
  return (
    <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer",
      fontSize:14, color: checked ? "#fff" : "rgba(255,255,255,0.5)", userSelect:"none" }}>
      <span style={{
        width:16, height:16, borderRadius:"50%", flexShrink:0,
        border: checked ? "5px solid #3b82f6" : "2px solid rgba(255,255,255,0.2)",
        background: checked ? "#fff" : "transparent", transition:"all 0.15s",
      }} />
      <input type="radio" name={name} value={value} checked={checked}
        onChange={() => onChange(value)} style={{ display:"none" }} />
      {label}
    </label>
  );
}

function RadioGroup({ name, options, value, onChange }:
  { name:string; options:string[]; value:string; onChange:(v:string)=>void }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:"10px 28px" }}>
      {options.map(o => <Radio key={o} name={name} value={o} current={value} onChange={onChange} label={o} />)}
    </div>
  );
}

function Section({ num, title, color, children }:
  { num:string; title:string; color:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:40, padding:"32px 28px", borderRadius:16,
      border:`1px solid rgba(255,255,255,0.07)`, background:"rgba(255,255,255,0.015)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
        <span style={{ width:28, height:28, borderRadius:8, background:`${color}22`,
          border:`1px solid ${color}55`, display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:11, fontWeight:800, color }}>
          {num}
        </span>
        <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:"#fff", letterSpacing:"-0.3px" }}>{title}</h2>
      </div>
      <div style={{ display:"grid", gap:20 }}>
        {children}
      </div>
    </div>
  );
}

// ── Ana bileşen ──────────────────────────────────────────────────────────────

export default function FormPage() {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");

  const set = (key: keyof FormData) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.firmaAdi || !form.email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/form", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") return (
    <div style={{ minHeight:"100dvh", background:"#030508", display:"flex",
      alignItems:"center", justifyContent:"center", fontFamily:"var(--font-geist-sans)" }}>
      <div style={{ textAlign:"center", padding:"0 24px", maxWidth:480 }}>
        <div style={{ width:72, height:72, borderRadius:"50%",
          background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)",
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 28px", fontSize:28 }}>✓</div>
        <h1 style={{ margin:"0 0 16px", fontSize:28, fontWeight:900,
          letterSpacing:"-1px", color:"#fff" }}>Formunuz İletildi</h1>
        <p style={{ margin:"0 0 32px", color:"rgba(255,255,255,0.45)", fontSize:15, lineHeight:1.8 }}>
          Yanıtlarınız ekibimize iletildi. En kısa sürede sizinle iletişime geçeceğiz.
        </p>
        <a href="https://xshield.com.tr" style={{ display:"inline-flex", alignItems:"center",
          gap:8, padding:"12px 24px", background:"rgba(255,255,255,0.06)",
          border:"1px solid rgba(255,255,255,0.1)", borderRadius:10,
          color:"rgba(255,255,255,0.7)", textDecoration:"none", fontSize:14, fontWeight:600 }}>
          ← xShield Ana Sayfa
        </a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100dvh", background:"#030508",
      fontFamily:"var(--font-geist-sans)", color:"#fff" }}>

      {/* Header */}
      <div style={{ borderBottom:"1px solid rgba(255,255,255,0.06)",
        padding:"20px 0", position:"sticky", top:0, background:"rgba(3,5,8,0.92)",
        backdropFilter:"blur(12px)", zIndex:10 }}>
        <div style={{ maxWidth:760, margin:"0 auto", padding:"0 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <a href="https://xshield.com.tr" style={{ textDecoration:"none",
            display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:17, fontWeight:900, color:"#fff",
              letterSpacing:"-0.5px" }}>x<span style={{ color:"#3b82f6" }}>Shield</span></span>
          </a>
          <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.3)" }}>
            Proje Keşif Formu
          </span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth:760, margin:"0 auto", padding:"56px 24px 0" }}>
        <div style={{ marginBottom:8, fontSize:11, fontWeight:800, color:"#3b82f6",
          letterSpacing:"2px", textTransform:"uppercase" }}>
          Proje Keşif Formu
        </div>
        <h1 style={{ margin:"0 0 16px", fontSize:"clamp(1.9rem,4vw,3rem)",
          fontWeight:900, letterSpacing:"-2px", lineHeight:1.05 }}>
          Projenizi Anlayalım
        </h1>
        <p style={{ margin:"0 0 48px", color:"rgba(255,255,255,0.4)", fontSize:15, lineHeight:1.9, maxWidth:560 }}>
          Aşağıdaki formu doldurarak proje kapsamı, mevcut altyapı ve beklentilerinizi bize aktarın.
          Yanıtlarınıza göre size özel bir teknik analiz ve teklif hazırlayacağız.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}
        style={{ maxWidth:760, margin:"0 auto", padding:"0 24px 80px" }}>

        {/* 1. İletişim */}
        <Section num="01" title="İletişim Bilgileri" color="#3b82f6">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field label="Firma Adı *">
              <Input value={form.firmaAdi} onChange={set("firmaAdi")} placeholder="Şirket A.Ş." />
            </Field>
            <Field label="Yetkili Adı Soyadı">
              <Input value={form.yetkiliAdi} onChange={set("yetkiliAdi")} placeholder="Ahmet Yılmaz" />
            </Field>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field label="E-posta *">
              <Input type="email" value={form.email} onChange={set("email")} placeholder="ahmet@firma.com" />
            </Field>
            <Field label="Telefon">
              <Input type="tel" value={form.telefon} onChange={set("telefon")} placeholder="0532 000 00 00" />
            </Field>
          </div>
        </Section>

        {/* 2. Mevcut Durum */}
        <Section num="02" title="Mevcut Durum — Ürün Verisi" color="#8b5cf6">
          <Field label="Ürünleriniz şu an nerede tutuluyor?">
            <Select value={form.urunKaynagi} onChange={set("urunKaynagi")}
              options={["Excel / Google Sheets","ERP (Logo, Netsis, SAP vb.)","Başka bir yazılım","Kağıt / manuel","Bilmiyorum"]} />
          </Field>
          <Field label="Bu ürünlerin tamamı aktif mi?">
            <RadioGroup name="urunAktiflik" value={form.urunAktiflik} onChange={set("urunAktiflik")}
              options={["Tamamı aktif","Bir kısmı pasif / arşiv","Bilmiyorum"]} />
          </Field>
          <Field label="Ürün fotoğrafları mevcut mu?">
            <RadioGroup name="urunFotograf" value={form.urunFotograf} onChange={set("urunFotograf")}
              options={["Evet, dijital ortamda var","Hayır, fotoğraf yok","Bir kısmı var","Bilmiyorum"]} />
          </Field>
          <Field label="Her ürün için hangi bilgiler mevcut? (serbest metin)">
            <Input value={form.urunBilgiler} onChange={set("urunBilgiler")}
              placeholder="Ör: ürün kodu, ad, barkod, kategori, birim, fiyat…" />
          </Field>
          <Field label="Ürünlerde renk / beden / ebat gibi varyant var mı?">
            <RadioGroup name="urunVaryant" value={form.urunVaryant} onChange={set("urunVaryant")}
              options={["Evet","Hayır","Bir kısmında var","Bilmiyorum"]} />
          </Field>
        </Section>

        {/* 3. Stok */}
        <Section num="03" title="Stok Takibi" color="#06b6d4">
          <Field label="Stok giriş / çıkış hareketleri şu an nasıl takip ediliyor?">
            <Input value={form.stokTakip} onChange={set("stokTakip")}
              placeholder="Ör: Excel, ERP, elle sayım, takip edilmiyor…" />
          </Field>
          <Field label="Birden fazla depo veya lokasyon var mı?">
            <RadioGroup name="stokDepo" value={form.stokDepo} onChange={set("stokDepo")}
              options={["Tek depo","Birden fazla depo","Henüz yok / planlanıyor"]} />
          </Field>
          <Field label="Stok sayımı yapılıyor mu, ne sıklıkla?">
            <Select value={form.stokSayim} onChange={set("stokSayim")}
              options={["Hiç yapılmıyor","Yılda bir","6 ayda bir","Aylık","Sürekli / anlık"]} />
          </Field>
          <Field label="Tedarikçi takibi kapsama giriyor mu? (satın alma siparişi, irsaliye)">
            <RadioGroup name="stokTedarik" value={form.stokTedarik} onChange={set("stokTedarik")}
              options={["Evet, olsun","Hayır, sadece stok","İleride düşünülebilir"]} />
          </Field>
          <Field label="Minimum stok seviyesi / otomatik uyarı istiyor musunuz?">
            <RadioGroup name="stokUyari" value={form.stokUyari} onChange={set("stokUyari")}
              options={["Evet","Hayır","Fikrim yok"]} />
          </Field>
        </Section>

        {/* 4. B2B */}
        <Section num="04" title="B2B Satış Portalı" color="#f59e0b">
          <Field label="Portali kimler kullanacak?">
            <Input value={form.b2bKullanici} onChange={set("b2bKullanici")}
              placeholder="Ör: bayiler, toptancılar, kurumsal alıcılar…" />
          </Field>
          <Field label="Müşteri bazlı fiyatlandırma olacak mı? (farklı müşteriye farklı fiyat)">
            <RadioGroup name="b2bFiyat" value={form.b2bFiyat} onChange={set("b2bFiyat")}
              options={["Evet","Hayır, tek fiyat","Bilmiyorum"]} />
          </Field>
          <Field label="Toplu sipariş / Excel ile liste yükleme gerekiyor mu?">
            <RadioGroup name="b2bToplu" value={form.b2bToplu} onChange={set("b2bToplu")}
              options={["Evet","Hayır","İleride olabilir"]} />
          </Field>
          <Field label="Sipariş onay akışı var mı? (sipariş → onay → hazırlık → sevkiyat)">
            <RadioGroup name="b2bOnay" value={form.b2bOnay} onChange={set("b2bOnay")}
              options={["Evet, onay adımları olsun","Hayır, otomatik onay yeterli","Bilmiyorum"]} />
          </Field>
          <Field label="Müşteriler bakiye / cari hesap / borç ekstresi görebilecek mi?">
            <RadioGroup name="b2bBakiye" value={form.b2bBakiye} onChange={set("b2bBakiye")}
              options={["Evet","Hayır","İleride düşünülebilir"]} />
          </Field>
        </Section>

        {/* 5. Entegrasyonlar */}
        <Section num="05" title="Entegrasyonlar" color="#ef4444">
          <Field label="Mevcut muhasebe veya ERP yazılımı var mı?">
            <Input value={form.entERP} onChange={set("entERP")}
              placeholder="Ör: Logo Tiger, Netsis, SAP, Mikro, Luca, Kullanmıyoruz…" />
          </Field>
          <Field label="E-fatura / e-arşiv / e-irsaliye entegrasyonu kapsama giriyor mu?">
            <RadioGroup name="entEFatura" value={form.entEFatura} onChange={set("entEFatura")}
              options={["Evet, zorunlu","Hayır / henüz değil","Bilmiyorum"]} />
          </Field>
          <Field label="Kargo entegrasyonu düşünülüyor mu?">
            <Select value={form.entKargo} onChange={set("entKargo")}
              options={["Hayır","Yurtiçi Kargo","Aras Kargo","MNG Kargo","Birden fazla kargo firması","Henüz karar verilmedi"]} />
          </Field>
          <Field label="Online ödeme / sanal POS entegrasyonu gerekiyor mu?">
            <RadioGroup name="entOdeme" value={form.entOdeme} onChange={set("entOdeme")}
              options={["Evet","Hayır, havale / EFT yeterli","İleride düşünülebilir"]} />
          </Field>
        </Section>

        {/* 6. Ölçek & PM */}
        <Section num="06" title="Ölçek ve Proje Yönetimi" color="#22c55e">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field label="Aynı anda tahmini kullanıcı sayısı">
              <Select value={form.olcekKullanici} onChange={set("olcekKullanici")}
                options={["1–10","11–50","51–200","200+"]} />
            </Field>
            <Field label="Günlük ortalama sipariş adedi">
              <Select value={form.olcekSiparis} onChange={set("olcekSiparis")}
                options={["0–10","11–50","51–200","201–500","500+"]} />
            </Field>
          </div>
          <Field label="Sisteme mobil (telefon / tablet) erişim gerekiyor mu?">
            <RadioGroup name="olcekMobil" value={form.olcekMobil} onChange={set("olcekMobil")}
              options={["Evet, mobil uyumlu olsun","Hayır, sadece masaüstü","Mobil uygulama da olsun"]} />
          </Field>
          <Field label="Teslim tarihi beklentisi var mı?">
            <Input value={form.pmTarih} onChange={set("pmTarih")}
              placeholder="Ör: 3 ay içinde, Eylül 2026, Esnekiz…" />
          </Field>
          <Field label="Projeyi takip edecek teknik bir muhatap (IT sorumlusu) var mı?">
            <RadioGroup name="pmMuhatap" value={form.pmMuhatap} onChange={set("pmMuhatap")}
              options={["Evet","Hayır","Süreç içinde belirlenecek"]} />
          </Field>
          <Field label="Eğitim ihtiyacı — kaç kullanıcı eğitim alacak?">
            <Input value={form.pmEgitim} onChange={set("pmEgitim")}
              placeholder="Ör: 5 kişi, yöneticiler için yeterli, uzaktan eğitim…" />
          </Field>
          <Field label="Proje sonrası bakım / destek beklentisi?">
            <Input value={form.pmDestek} onChange={set("pmDestek")}
              placeholder="Ör: aylık bakım anlaşması, sorun çıkınca, iç ekip halleder…" />
          </Field>
        </Section>

        {/* Gönder */}
        {status === "error" && (
          <div style={{ marginBottom:20, padding:"12px 16px", borderRadius:10,
            background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)",
            color:"#fca5a5", fontSize:14 }}>
            Gönderim sırasında bir hata oluştu. Lütfen tekrar deneyin veya
            <a href="mailto:info@xshield.com.tr" style={{ color:"#f87171", marginLeft:4 }}>
              info@xshield.com.tr
            </a> adresine yazın.
          </div>
        )}

        <button type="submit" disabled={status === "loading" || !form.firmaAdi || !form.email}
          style={{
            width:"100%", padding:"16px", borderRadius:12, border:"none", cursor:"pointer",
            background: (status === "loading" || !form.firmaAdi || !form.email)
              ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg,#3b82f6,#06b6d4)",
            color:"#fff", fontSize:15, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            boxShadow:"0 4px 24px rgba(59,130,246,0.25)", transition:"all 0.2s",
          }}>
          {status === "loading" ? "Gönderiliyor…" : "Formu Gönder"}
          {status !== "loading" && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        <p style={{ marginTop:16, fontSize:12, color:"rgba(255,255,255,0.2)",
          textAlign:"center", lineHeight:1.7 }}>
          Form aracılığıyla ilettiğiniz kişisel veriler KVKK kapsamında yalnızca iletişim amacıyla işlenir.{" "}
          <a href="https://xshield.com.tr/kvkk" style={{ color:"rgba(59,130,246,0.7)", textDecoration:"none" }}>
            Aydınlatma Metni
          </a>
        </p>
      </form>
    </div>
  );
}
