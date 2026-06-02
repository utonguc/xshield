"use client";
import { useState, useTransition } from "react";

interface Customer { id: number; company_name: string; status: string; }

export function ExportForm({ customers }: { customers: Customer[] }) {
  const [allFirms, setAllFirms] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();

  const toggle = (id: number) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectAll = () => setSelected(new Set(customers.map((c) => c.id)));
  const clearAll = () => setSelected(new Set());

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const from = fd.get("from") as string;
    const to = fd.get("to") as string;
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (allFirms) {
      params.set("customers", "all");
    } else {
      selected.forEach((id) => params.append("customers", String(id)));
    }
    startTransition(() => {
      window.location.href = `/api/tickets/export?${params}`;
    });
  };

  return (
    <div className="card">
      <div className="card-title">Talepleri CSV olarak indir</div>
      <form onSubmit={handleSubmit} className="form">
        <div className="field-row">
          <div className="field">
            <label>Başlangıç Tarihi</label>
            <input type="date" name="from" />
          </div>
          <div className="field">
            <label>Bitiş Tarihi</label>
            <input type="date" name="to" />
          </div>
        </div>

        <div className="field">
          <label>Firmalar</label>
          <label className="all-toggle">
            <input
              type="checkbox"
              checked={allFirms}
              onChange={(e) => setAllFirms(e.target.checked)}
            />
            <span>Tüm Firmalar</span>
          </label>

          {!allFirms && (
            <div className="customer-section">
              <div className="cust-toolbar">
                <button type="button" className="link-btn" onClick={selectAll}>Tümünü seç</button>
                <span className="sep">·</span>
                <button type="button" className="link-btn" onClick={clearAll}>Temizle</button>
                <span className="sel-count">{selected.size} seçili</span>
              </div>
              <div className="customer-grid">
                {customers.map((c) => (
                  <label key={c.id} className={`cust-check${selected.has(c.id) ? " checked" : ""}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                    <span className={c.status !== "active" ? "dim" : ""}>{c.company_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="actions">
          <button type="submit" className="btn-export">
            CSV İndir
          </button>
        </div>
      </form>
    </div>
  );
}
