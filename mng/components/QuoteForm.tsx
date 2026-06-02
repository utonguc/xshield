"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type Customer = {
  id: number;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

type Item = {
  product_code: string;
  description: string;
  quantity: string;
  unit_price: string;
  total_price: number;
  cost_price: string;
  margin_pct: string;
  supplier_note: string;
};

type SearchProduct = {
  source: string;
  product_code: string;
  title: string;
  price_havale: string | null;
  currency: string;
  stock_status: string | null;
};

type SearchState = {
  idx: number;
  results: SearchProduct[];
  open: boolean;
  loading: boolean;
  focused: number;
};

type DdPos = { top: number; left: number; width: number };

type InitialData = {
  id: number;
  quote_no: string;
  customer_id: number | null;
  contact_person: string | null;
  quote_date: string;
  valid_until: string | null;
  status: string;
  currency: string;
  tax_rate: string | number;
  notes: string | null;
  terms: string | null;
  prepared_by: string | null;
  items: any[];
};

const SOURCE_COLORS: Record<string, string> = {
  erem: "#1d4ed8",
  bilsam: "#6d28d9",
  ergen: "#b45309",
};

const DEFAULT_NOTES = `* Teklifimize kurulum ve konfigürasyon dahildir.
* Ürünlerimiz standart olarak üretici garantisi ile önerilmiştir.
* Teklifimiz gizli ve 15 (on beş) gün süre ile geçerlidir.
* Ödeme peşin, fatura tarihindeki Merkez Bankası döviz satış kuru üzerinden yapılacaktır.`;

const DEFAULT_TERMS = `TEKLİF VE SATIŞ KOŞULLARI

Sipariş: Teklif koşullarımızın yazılı onayınız ile geçerli olacaktır.
Teslimat: Stoklarda olan ürünler için 1 hafta, yurtdışından sipariş için 4-6 haftadır.
Garanti: Ürünlerimiz standart olarak üretici garantisi ile önerilmiştir.`;

function emptyItem(): Item {
  return { product_code: "", description: "", quantity: "1", unit_price: "0", total_price: 0, cost_price: "", margin_pct: "", supplier_note: "" };
}

const curSym = (cur: string) => cur === "TRY" ? "₺" : cur === "USD" ? "$" : "€";

export default function QuoteForm({
  customers,
  initial,
  defaultPreparedBy = "",
}: {
  customers: Customer[];
  initial?: InitialData;
  defaultPreparedBy?: string;
}) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [customerId, setCustomerId] = useState<string>(initial?.customer_id ? String(initial.customer_id) : "");
  const [contactPerson, setContactPerson] = useState(initial?.contact_person ?? "");
  const [quoteDate, setQuoteDate] = useState(
    initial?.quote_date
      ? new Date(initial.quote_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [validUntil, setValidUntil] = useState(
    initial?.valid_until ? new Date(initial.valid_until).toISOString().split("T")[0] : ""
  );
  const [status, setStatus] = useState(initial?.status ?? "draft");
  const [currency, setCurrency] = useState(initial?.currency ?? "TRY");
  const [taxRate, setTaxRate] = useState(String(initial?.tax_rate ?? "20"));
  const [notes, setNotes] = useState(initial?.notes ?? DEFAULT_NOTES);
  const [terms, setTerms] = useState(initial?.terms ?? "");
  const [preparedBy, setPreparedBy] = useState(initial?.prepared_by ?? defaultPreparedBy);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showTerms, setShowTerms] = useState(!!initial?.terms);

  const [items, setItems] = useState<Item[]>(
    initial?.items?.length
      ? initial.items.map((i) => ({
          product_code: i.product_code ?? "",
          description: i.description ?? "",
          quantity: String(i.quantity ?? 1),
          unit_price: String(i.unit_price ?? 0),
          total_price: Number(i.total_price ?? 0),
          cost_price: i.cost_price != null ? String(i.cost_price) : "",
          margin_pct: i.margin_pct != null ? String(i.margin_pct) : "",
          supplier_note: i.supplier_note ?? "",
        }))
      : [emptyItem()]
  );

  // ── Product search state ──────────────────────────────────────────────────
  const [search, setSearch] = useState<SearchState | null>(null);
  const [ddPos, setDdPos] = useState<DdPos | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!search?.open || search.idx == null) { setDdPos(null); return; }
    const el = inputRefs.current[search.idx];
    if (!el) { setDdPos(null); return; }
    const r = el.getBoundingClientRect();
    setDdPos({ top: r.bottom + 2, left: r.left, width: r.width });
  }, [search?.open, search?.idx]);

  useEffect(() => {
    if (!search?.open) return;
    const update = () => {
      const el = search.idx != null ? inputRefs.current[search.idx] : null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDdPos({ top: r.bottom + 2, left: r.left, width: r.width });
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [search?.open, search?.idx]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inputEl = search?.idx != null ? inputRefs.current[search.idx] : null;
      if (dropdownRef.current?.contains(target) || inputEl?.contains(target)) return;
      setSearch(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [search?.idx]);

  const fetchProducts = async (idx: number, q: string) => {
    if (q.length < 2) { setSearch(null); return; }
    setSearch(s => s?.idx === idx ? { ...s, loading: true, open: true } : { idx, results: [], open: true, loading: true, focused: -1 });
    try {
      const res = await fetch(`/api/supplier/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data: SearchProduct[] = await res.json();
      setSearch(s => s?.idx === idx ? { ...s, results: data, loading: false, open: true } : s);
    } catch {
      setSearch(s => s?.idx === idx ? { ...s, loading: false } : s);
    }
  };

  const handleDescriptionChange = (idx: number, value: string) => {
    updateItem(idx, "description", value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.length < 2) { setSearch(null); return; }
    searchTimer.current = setTimeout(() => fetchProducts(idx, value), 260);
  };

  const selectProduct = (idx: number, p: SearchProduct) => {
    setItems(prev => {
      const next = [...prev];
      const cost = p.price_havale ? parseFloat(p.price_havale) : 0;
      const marginPct = parseFloat(next[idx].margin_pct) || 0;
      const sellingPrice = cost > 0 && marginPct > 0
        ? parseFloat((cost * (1 + marginPct / 100)).toFixed(2))
        : cost > 0 ? cost : parseFloat(next[idx].unit_price) || 0;
      const updated = {
        ...next[idx],
        product_code: p.product_code,
        description: p.title,
        cost_price: cost > 0 ? String(cost) : next[idx].cost_price,
        unit_price: String(sellingPrice),
        supplier_note: p.source,
      };
      next[idx] = recalc(updated);
      return next;
    });
    setSearch(null);
    setTimeout(() => {
      const row = document.querySelector(`.item-row-${idx} .qty-inp`) as HTMLInputElement | null;
      row?.focus();
      row?.select();
    }, 30);
  };

  const handleDescriptionKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!search || search.idx !== idx || !search.open) return;
    if (e.key === "Escape") { e.preventDefault(); setSearch(null); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearch(s => s ? { ...s, focused: Math.min((s.focused ?? -1) + 1, s.results.length - 1) } : s);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearch(s => s ? { ...s, focused: Math.max((s.focused ?? 0) - 1, 0) } : s);
      return;
    }
    if (e.key === "Enter" && search.focused >= 0 && search.results[search.focused]) {
      e.preventDefault();
      selectProduct(idx, search.results[search.focused]);
      return;
    }
  };

  const handleMarginChange = (idx: number, value: string) => {
    setItems(prev => {
      const next = [...prev];
      const item = next[idx];
      const cost = parseFloat(item.cost_price) || 0;
      const margin = parseFloat(value) || 0;
      const newUnitPrice = cost > 0
        ? parseFloat((cost * (1 + margin / 100)).toFixed(2))
        : parseFloat(item.unit_price) || 0;
      const updated = { ...item, margin_pct: value, unit_price: String(newUnitPrice) };
      next[idx] = recalc(updated);
      return next;
    });
  };

  // ── Items ──────────────────────────────────────────────────────────────────
  const recalc = (it: Item): Item => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unit_price) || 0;
    return { ...it, total_price: parseFloat((qty * price).toFixed(2)) };
  };

  const updateItem = useCallback((idx: number, field: keyof Item, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[idx], [field]: value };
      next[idx] = (field === "quantity" || field === "unit_price") ? recalc(updated) : updated;
      return next;
    });
  }, []);

  const addItem = () => setItems((p) => [...p, emptyItem()]);
  const removeItem = (idx: number) => { setItems((p) => p.filter((_, i) => i !== idx)); setSearch(null); };
  const duplicateItem = (idx: number) => setItems((p) => {
    const copy = [...p];
    copy.splice(idx + 1, 0, { ...p[idx] });
    return copy;
  });

  const subtotal = items.reduce((s, i) => s + i.total_price, 0);
  const taxAmt = subtotal * ((parseFloat(taxRate) || 0) / 100);
  const grandTotal = subtotal + taxAmt;
  const sym = curSym(currency);
  const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPrice = (v: string | null) => v ? parseFloat(v).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;

  const selectedCustomer = customers.find((c) => c.id === Number(customerId));

  const handleCustomerChange = (val: string) => {
    setCustomerId(val);
    const c = customers.find((x) => x.id === Number(val));
    if (c && !contactPerson) setContactPerson(c.contact_name ?? "");
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        customer_id: customerId ? Number(customerId) : null,
        contact_person: contactPerson || null,
        quote_date: quoteDate,
        valid_until: validUntil || null,
        status,
        currency,
        tax_rate: parseFloat(taxRate) || 0,
        notes: notes || null,
        terms: showTerms && terms ? terms : null,
        prepared_by: preparedBy || null,
        items: items.map((i, idx) => ({
          sort_order: idx,
          product_code: i.product_code || null,
          description: i.description,
          quantity: parseFloat(i.quantity) || 1,
          unit_price: parseFloat(i.unit_price) || 0,
          total_price: i.total_price,
          cost_price: i.cost_price !== "" ? parseFloat(i.cost_price) : null,
          margin_pct: i.margin_pct !== "" ? parseFloat(i.margin_pct) : null,
          supplier_note: i.supplier_note || null,
        })),
      };

      const url = isEdit ? `/api/quotes/${initial!.id}` : "/api/quotes";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { setError("Kayıt hatası: " + (await res.text())); return; }
      const data = await res.json();
      router.push(`/quotes/${isEdit ? initial!.id : data.id}`);
    } catch (e: any) {
      setError(e.message ?? "Bilinmeyen hata");
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = {
    background: "var(--input-bg)", border: "1px solid var(--input-border)",
    borderRadius: 8, padding: "9px 12px", color: "var(--text)",
    fontSize: 13, outline: "none", width: "100%",
  };
  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "var(--section-title)",
    textTransform: "uppercase", letterSpacing: "0.06em",
    display: "block", marginBottom: 5,
  };
  const fieldBox: React.CSSProperties = { display: "flex", flexDirection: "column" };

  // ── Portal dropdown ───────────────────────────────────────────────────────
  const dropdownPortal = search?.open && ddPos
    ? createPortal(
        <div
          ref={dropdownRef}
          className="prod-dropdown"
          style={{
            position: "fixed",
            top: ddPos.top,
            left: ddPos.left,
            width: Math.max(ddPos.width, 360),
          }}
        >
          {search.loading && <div className="prod-dd-empty">Aranıyor...</div>}
          {!search.loading && search.results.length === 0 && (
            <div className="prod-dd-empty">Stoktaki ürün bulunamadı — elle yazabilirsiniz</div>
          )}
          {!search.loading && search.results.map((p, ri) => (
            <div
              key={ri}
              className={`prod-dd-row${search.focused === ri ? " prod-dd-row-focused" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); selectProduct(search.idx, p); }}
              onMouseEnter={() => setSearch(s => s ? { ...s, focused: ri } : s)}
            >
              <div className="prod-dd-top">
                <span className="prod-dd-src" style={{ background: SOURCE_COLORS[p.source] ?? "#374151" }}>
                  {p.source}
                </span>
                <span className="prod-dd-code">{p.product_code}</span>
                {p.stock_status && <span className="prod-dd-stock">{p.stock_status}</span>}
                {p.price_havale && (
                  <span className="prod-dd-price">{fmtPrice(p.price_havale)} {p.currency}</span>
                )}
              </div>
              <div className="prod-dd-title">{p.title}</div>
            </div>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <style>{css}</style>
      {dropdownPortal}
      <div className="qf-wrap">

        {/* ── Header Info ── */}
        <div className="qf-card">
          <div className="qf-card-title">Teklif Bilgileri</div>
          <div className="qf-grid-3">
            <div style={fieldBox}>
              <label style={lbl}>Teklif Tarihi *</label>
              <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} style={inp} />
            </div>
            <div style={fieldBox}>
              <label style={lbl}>Geçerlilik Tarihi</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={inp} />
            </div>
            <div style={fieldBox}>
              <label style={lbl}>Durum</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={inp}>
                <option value="draft">Taslak</option>
                <option value="sent">Gönderildi</option>
                <option value="accepted">Onaylandı</option>
                <option value="rejected">Reddedildi</option>
                <option value="expired">Süresi Doldu</option>
              </select>
            </div>
            <div style={fieldBox}>
              <label style={lbl}>Para Birimi</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inp}>
                <option value="TRY">TRY — ₺</option>
                <option value="USD">USD — $</option>
                <option value="EUR">EUR — €</option>
              </select>
            </div>
            <div style={fieldBox}>
              <label style={lbl}>KDV Oranı (%)</label>
              <input type="number" min="0" max="100" step="1" value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)} style={inp} />
            </div>
            <div style={fieldBox}>
              <label style={lbl}>Hazırlayan</label>
              <input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)}
                placeholder="Adınız" style={inp} />
            </div>
          </div>
        </div>

        {/* ── Customer ── */}
        <div className="qf-card">
          <div className="qf-card-title">Müşteri Bilgileri</div>
          <div className="qf-grid-2">
            <div style={{ ...fieldBox, gridColumn: "1 / -1" }}>
              <label style={lbl}>Müşteri Seç</label>
              <select value={customerId} onChange={(e) => handleCustomerChange(e.target.value)} style={inp}>
                <option value="">— Müşteri seçiniz —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
              {selectedCustomer && (
                <div className="customer-info-row">
                  {selectedCustomer.contact_name && <span>👤 {selectedCustomer.contact_name}</span>}
                  {selectedCustomer.contact_email && <span>✉ {selectedCustomer.contact_email}</span>}
                  {selectedCustomer.contact_phone && <span>📞 {selectedCustomer.contact_phone}</span>}
                </div>
              )}
            </div>
            <div style={fieldBox}>
              <label style={lbl}>İlgili Kişi</label>
              <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Yetkili adı" style={inp} />
            </div>
          </div>
        </div>

        {/* ── Items ── */}
        <div className="qf-card">
          <div className="qf-card-title-row">
            <div className="qf-card-title">Teklif Kalemleri</div>
            <button onClick={addItem} className="qf-btn-add">+ Kalem Ekle</button>
          </div>

          <div className="items-table-wrap">
            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Ürün Kodu</th>
                  <th>
                    Ürün Tanımı
                    <span className="search-hint">— yazmaya başlayın</span>
                  </th>
                  <th style={{ width: 72 }}>Adet</th>
                  <th style={{ width: 120 }}>Birim Fiyat ({sym})</th>
                  <th style={{ width: 120 }}>Toplam ({sym})</th>
                  <th style={{ width: 72 }} className="int-th" title="Dahili — müşteriye gösterilmez">Marj %</th>
                  <th style={{ width: 140 }} className="int-th" title="Dahili — müşteriye gösterilmez">Tedarikçi</th>
                  <th style={{ width: 56 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className={`item-row-${idx}`}>
                    <td>
                      <input value={item.product_code}
                        onChange={(e) => updateItem(idx, "product_code", e.target.value)}
                        placeholder="—" className="cell-inp" style={{ fontFamily: "monospace" }} />
                    </td>
                    <td>
                      <input
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        value={item.description}
                        onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                        onKeyDown={(e) => handleDescriptionKeyDown(idx, e)}
                        onFocus={() => {
                          if (item.description.length >= 2) {
                            if (searchTimer.current) clearTimeout(searchTimer.current);
                            searchTimer.current = setTimeout(() => fetchProducts(idx, item.description), 260);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setSearch(s => s?.idx === idx ? null : s), 160);
                        }}
                        placeholder="Ürün veya hizmet açıklaması"
                        className="cell-inp"
                        autoComplete="off"
                      />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.001" value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        className="cell-inp qty-inp" style={{ textAlign: "center" }} />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" value={item.unit_price}
                        onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
                        className="cell-inp" style={{ textAlign: "right" }} />
                    </td>
                    <td className="cell-total">
                      {sym}{fmt(item.total_price)}
                    </td>
                    <td className="int-td">
                      <input type="number" min="0" max="100" step="0.5" value={item.margin_pct}
                        onChange={(e) => handleMarginChange(idx, e.target.value)}
                        placeholder="—" className="cell-inp int-inp" style={{ textAlign: "right" }} />
                    </td>
                    <td className="int-td">
                      <input value={item.supplier_note}
                        onChange={(e) => updateItem(idx, "supplier_note", e.target.value)}
                        placeholder="tedarikçi / kaynak"
                        className="cell-inp int-inp" />
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button onClick={() => duplicateItem(idx)} title="Kopyala" className="cell-btn">⊕</button>
                        {items.length > 1 && (
                          <button onClick={() => removeItem(idx)} title="Sil" className="cell-btn cell-btn-del">×</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="totals-section">
            <div className="total-row">
              <span>Ara Toplam</span>
              <span>{sym}{fmt(subtotal)}</span>
            </div>
            <div className="total-row">
              <span>KDV %{taxRate || 0}</span>
              <span>{sym}{fmt(taxAmt)}</span>
            </div>
            <div className="total-row total-grand">
              <span>Genel Toplam</span>
              <span>{sym}{fmt(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="qf-card">
          <div className="qf-card-title">Notlar ve Koşullar</div>
          <div style={fieldBox}>
            <label style={lbl}>Teklif Notları</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={5} style={{ ...inp, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }}
              placeholder="Teklife eklenmesini istediğiniz notlar..." />
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => { setShowTerms(!showTerms); if (!showTerms && !terms) setTerms(DEFAULT_TERMS); }}
              className="qf-terms-toggle">
              {showTerms ? "▲ Teklif Satış Koşullarını Gizle" : "▼ Teklif Satış Koşulları Ekle"}
            </button>
          </div>
          {showTerms && (
            <div style={{ marginTop: 12, ...fieldBox }}>
              <label style={lbl}>Satış Koşulları</label>
              <textarea value={terms} onChange={(e) => setTerms(e.target.value)}
                rows={8} style={{ ...inp, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#ef4444", fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}
        <div className="qf-actions">
          <button onClick={() => router.back()} className="qf-btn-ghost">İptal</button>
          <button onClick={save} disabled={saving} className="qf-btn-primary">
            {saving ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Teklif Oluştur"}
          </button>
        </div>
      </div>
    </>
  );
}

const css = `
.qf-wrap { display:flex; flex-direction:column; gap:16px; max-width:960px; }
.qf-card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:20px; }
.qf-card-title { font-size:13px; font-weight:700; color:var(--text-sub); margin-bottom:16px; letter-spacing:-0.2px; }
.qf-card-title-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.qf-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.qf-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
@media(max-width:640px) { .qf-grid-2,.qf-grid-3 { grid-template-columns:1fr; } }
.customer-info-row { display:flex; gap:16px; flex-wrap:wrap; margin-top:8px; }
.customer-info-row span { font-size:11px; color:var(--text-dim); }
.search-hint { font-size:10px; font-weight:400; color:var(--text-dimmer,#6b7280); margin-left:6px; text-transform:none; letter-spacing:0; }
.items-table-wrap { overflow-x:auto; margin-bottom:0; border:1px solid var(--border); border-radius:8px; }
.items-table { width:100%; border-collapse:collapse; min-width:700px; }
.items-table th { padding:9px 10px; text-align:left; font-size:10px; font-weight:700; color:var(--text-dimmer); text-transform:uppercase; letter-spacing:0.06em; background:var(--card2); border-bottom:1px solid var(--border); white-space:nowrap; }
.items-table td { padding:5px 5px; border-bottom:1px solid var(--row-border); vertical-align:middle; }
.items-table tr:last-child td { border-bottom:none; }
.items-table tr:hover td { background:var(--row-hover); }
.int-th { background:rgba(99,102,241,0.08)!important; color:#818cf8!important; }
.int-th::before { content:"🔒 "; font-size:9px; }
.int-td { background:rgba(99,102,241,0.03); }
.int-inp:focus { border-color:#6366f1!important; background:rgba(99,102,241,0.07)!important; }
.cell-inp { width:100%; background:transparent; border:1px solid transparent; border-radius:6px; padding:6px 7px; color:var(--text); font-size:13px; outline:none; transition:border-color 0.12s,background 0.12s; }
.cell-inp:focus { border-color:#3b82f6; background:var(--input-bg); }
.cell-inp:hover { background:var(--input-bg); }
.cell-total { font-weight:700; color:var(--text-sub); font-size:13px; text-align:right; padding-right:10px!important; white-space:nowrap; }
.cell-actions { display:flex; gap:4px; justify-content:center; }
.cell-btn { padding:4px 7px; border-radius:5px; border:1px solid var(--border); background:transparent; color:var(--text-dim); cursor:pointer; font-size:13px; line-height:1; transition:all 0.12s; }
.cell-btn:hover { background:var(--input-bg); color:var(--text); }
.cell-btn-del { color:#ef4444; border-color:rgba(239,68,68,0.3); }
.cell-btn-del:hover { background:rgba(239,68,68,0.1); }
.totals-section { margin-top:16px; display:flex; flex-direction:column; align-items:flex-end; gap:5px; }
.total-row { display:flex; gap:48px; justify-content:space-between; min-width:280px; font-size:13px; color:var(--text-dim); padding:4px 8px; }
.total-grand { background:#1e3a5f; border-radius:8px; padding:10px 14px; margin-top:4px; }
.total-grand span:first-child { font-size:14px; font-weight:700; color:#fff; }
.total-grand span:last-child { font-size:16px; font-weight:900; color:#3b82f6; }
.qf-btn-add { padding:7px 14px; border-radius:7px; border:1px dashed #3b82f6; background:rgba(59,130,246,0.06); color:#3b82f6; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.12s; white-space:nowrap; }
.qf-btn-add:hover { background:rgba(59,130,246,0.12); }
.qf-terms-toggle { background:none; border:none; color:#3b82f6; font-size:12px; font-weight:600; cursor:pointer; padding:0; }
.qf-actions { display:flex; gap:10px; justify-content:flex-end; padding-bottom:24px; }
.qf-btn-ghost { padding:10px 22px; border-radius:8px; border:1px solid var(--border); background:transparent; color:var(--text-dim); font-size:13px; font-weight:600; cursor:pointer; }
.qf-btn-primary { padding:10px 28px; border-radius:8px; border:none; background:#2563eb; color:#fff; font-size:13px; font-weight:700; cursor:pointer; min-width:140px; }
.qf-btn-primary:hover { background:#1d4ed8; }
.qf-btn-primary:disabled { opacity:0.6; cursor:not-allowed; }

/* ── Product search dropdown (portal — position:fixed via inline style) ── */
.prod-dropdown {
  background:var(--card,#1a1f2e); border:1px solid var(--border,#2d3550);
  border-radius:10px; box-shadow:0 8px 32px rgba(0,0,0,0.5);
  z-index:99999; overflow:hidden; max-height:320px; overflow-y:auto;
}
.prod-dd-empty { padding:12px 14px; font-size:12px; color:var(--text-dim,#9ca3af); text-align:center; }
.prod-dd-row { padding:10px 14px; cursor:pointer; transition:background 0.1s; border-bottom:1px solid var(--row-border,rgba(255,255,255,0.05)); }
.prod-dd-row:last-child { border-bottom:none; }
.prod-dd-row:hover, .prod-dd-row-focused { background:rgba(59,130,246,0.1); }
.prod-dd-top { display:flex; align-items:center; gap:7px; margin-bottom:4px; flex-wrap:wrap; }
.prod-dd-src { font-size:9px; font-weight:800; color:#fff; padding:2px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.04em; white-space:nowrap; }
.prod-dd-code { font-size:11px; font-family:monospace; color:var(--text-sub,#9ca3af); }
.prod-dd-stock { font-size:10px; color:#22c55e; margin-left:auto; white-space:nowrap; }
.prod-dd-price { font-size:11px; font-weight:700; color:#3b82f6; white-space:nowrap; }
.prod-dd-title { font-size:12px; color:var(--text,#e2e8f0); line-height:1.4; }
`;
