"use client";
import { useState } from "react";

interface Customer { id: number; company_name: string; }
interface Employee { id: number; first_name: string; last_name: string; customer_id: number; }
export interface Definition { id: number; name: string; category: string; brand: string | null; model: string | null; }
export interface Category { key: string; label: string; }

interface Props {
  customers: Customer[];
  allEmployees: Employee[];
  definitions: Definition[];
  categories: Category[];
  createItem: (fd: FormData) => Promise<void>;
  defaultCustomer?: string;
}

export function AddInventoryForm({ customers, allEmployees, definitions, categories, createItem, defaultCustomer }: Props) {
  const [custId, setCustId] = useState(defaultCustomer ?? "");
  const [defId, setDefId] = useState("");

  const employees = allEmployees.filter((e) => e.customer_id === Number(custId));
  const selectedDef = definitions.find((d) => d.id === Number(defId));
  const catMap = Object.fromEntries(categories.map((c) => [c.key, c.label]));

  return (
    <form action={createItem} className="item-form">
      {/* Row 1: Müşteri + Çalışan + Tanım */}
      <div className="form-row">
        <div className="field">
          <label>Müşteri *</label>
          <select name="customer_id" required value={custId} onChange={(e) => setCustId(e.target.value)}>
            <option value="">Seçin…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Zimmetli Çalışan</label>
          <select name="employee_id" disabled={!custId}>
            <option value="">{custId ? "— Zimmetlenmemiş —" : "Önce müşteri seçin"}</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Tanım seç */}
      <div className="form-row">
        <div className="field field-wide">
          <label>Cihaz Tanımı *</label>
          {definitions.length === 0 ? (
            <div className="def-empty-note">
              Henüz tanım eklenmemiş. Sayfanın altındaki <strong>Tanımlamalar</strong> bölümünden marka/model şablonu ekleyin.
            </div>
          ) : (
            <select
              required
              value={defId}
              onChange={(e) => setDefId(e.target.value)}
            >
              <option value="">— Tanım seçin —</option>
              {definitions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.brand ? ` · ${d.brand}` : ""}{d.model ? ` ${d.model}` : ""}
                  {" — "}{catMap[d.category] ?? d.category}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Hidden fields populated from definition */}
      <input type="hidden" name="category" value={selectedDef?.category ?? "other"} />
      <input type="hidden" name="brand" value={selectedDef?.brand ?? ""} />
      <input type="hidden" name="model" value={selectedDef?.model ?? ""} />

      {/* Definition preview */}
      {selectedDef && (
        <div className="def-preview">
          <span className="def-preview-chip">{catMap[selectedDef.category] ?? selectedDef.category}</span>
          {selectedDef.brand && <span className="def-preview-text">{selectedDef.brand}</span>}
          {selectedDef.model && <span className="def-preview-model">{selectedDef.model}</span>}
        </div>
      )}

      {/* Row 3: Cihaz adı + Seri No + Envanter No */}
      <div className="form-row">
        <div className="field">
          <label>Cihaz Adı *</label>
          <input name="name" type="text" required placeholder="ör. Ahmet Bey'in Dizüstü" />
        </div>
        <div className="field">
          <label>Seri No</label>
          <input name="serial_no" type="text" />
        </div>
        <div className="field">
          <label>Envanter No</label>
          <input name="asset_tag" type="text" />
        </div>
      </div>

      {/* Row 4: Durum + Tarihler */}
      <div className="form-row">
        <div className="field">
          <label>Durum</label>
          <select name="status">
            <option value="active">Aktif</option>
            <option value="maintenance">Bakımda</option>
            <option value="retired">Hizmetten Çıktı</option>
          </select>
        </div>
        <div className="field"><label>Alım Tarihi</label><input name="purchase_date" type="date" /></div>
        <div className="field"><label>Zimmet Tarihi</label><input name="assigned_date" type="date" /></div>
        <div className="field field-wide"><label>Notlar</label><input name="notes" type="text" /></div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-save">Ekle</button>
      </div>
    </form>
  );
}
