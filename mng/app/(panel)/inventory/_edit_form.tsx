"use client";
import { useState } from "react";
import Link from "next/link";
import type { Definition, Category } from "./_add_form";

interface Customer { id: number; company_name: string; }
interface Employee { id: number; first_name: string; last_name: string; customer_id: number; }
interface Item {
  id: number; name: string; category: string; brand: string | null; model: string | null;
  serial_no: string | null; asset_tag: string | null; status: string;
  purchase_date: string | null; assigned_date: string | null; notes: string | null;
  employee_id: number | null; customer_id: number;
}

interface Props {
  item: Item;
  customers: Customer[];
  allEmployees: Employee[];
  definitions: Definition[];
  categories: Category[];
  updateItem: (fd: FormData) => Promise<void>;
  cancelHref: string;
}

function dateVal(v: string | null) {
  if (!v) return "";
  return new Date(v).toISOString().split("T")[0];
}

export function EditInventoryForm({ item, customers, allEmployees, definitions, categories, updateItem, cancelHref }: Props) {
  const catMap = Object.fromEntries(categories.map((c) => [c.key, c.label]));
  const [custId, setCustId] = useState(String(item.customer_id));
  const employees = allEmployees.filter((e) => e.customer_id === Number(custId));

  // Try to find a matching definition for this item
  const matchDef = definitions.find(
    (d) => d.category === item.category &&
      (d.brand ?? "") === (item.brand ?? "") &&
      (d.model ?? "") === (item.model ?? "")
  );
  const [defId, setDefId] = useState(matchDef ? String(matchDef.id) : "");
  const selectedDef = definitions.find((d) => d.id === Number(defId));

  // If no definition matched, fall back to stored values
  const effectiveCategory = selectedDef?.category ?? item.category;
  const effectiveBrand = selectedDef?.brand ?? item.brand ?? "";
  const effectiveModel = selectedDef?.model ?? item.model ?? "";

  return (
    <form action={updateItem} className="item-form edit-form">
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="category" value={effectiveCategory} />
      <input type="hidden" name="brand" value={effectiveBrand} />
      <input type="hidden" name="model" value={effectiveModel} />
      <input type="hidden" name="customer_id" value={custId} />

      <div className="form-row">
        <div className="field">
          <label>Cihaz Adı *</label>
          <input name="name" type="text" required defaultValue={item.name} />
        </div>
        <div className="field field-wide">
          <label>Cihaz Tanımı</label>
          <select value={defId} onChange={(e) => setDefId(e.target.value)}>
            <option value="">— Mevcut: {item.brand ? `${item.brand} ` : ""}{item.model ?? ""} ({catMap[item.category] ?? item.category}) —</option>
            {definitions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.brand ? ` · ${d.brand}` : ""}{d.model ? ` ${d.model}` : ""}
                {" — "}{catMap[d.category] ?? d.category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedDef && (
        <div className="def-preview">
          <span className="def-preview-chip">{catMap[selectedDef.category] ?? selectedDef.category}</span>
          {selectedDef.brand && <span className="def-preview-text">{selectedDef.brand}</span>}
          {selectedDef.model && <span className="def-preview-model">{selectedDef.model}</span>}
        </div>
      )}

      <div className="form-row">
        <div className="field"><label>Seri No</label><input name="serial_no" type="text" defaultValue={item.serial_no ?? ""} /></div>
        <div className="field"><label>Envanter No</label><input name="asset_tag" type="text" defaultValue={item.asset_tag ?? ""} /></div>
        <div className="field">
          <label>Durum</label>
          <select name="status" defaultValue={item.status}>
            <option value="active">Aktif</option>
            <option value="maintenance">Bakımda</option>
            <option value="retired">Hizmetten Çıktı</option>
          </select>
        </div>
        <div className="field"><label>Alım Tarihi</label><input name="purchase_date" type="date" defaultValue={dateVal(item.purchase_date)} /></div>
      </div>

      <div className="form-row">
        <div className="field">
          <label>Müşteri</label>
          <select value={custId} onChange={(e) => setCustId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Zimmetli Çalışan</label>
          <select name="employee_id" defaultValue={item.employee_id ?? ""} key={custId}>
            <option value="">— Zimmetlenmemiş —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
            ))}
          </select>
        </div>
        <div className="field"><label>Zimmet Tarihi</label><input name="assigned_date" type="date" defaultValue={dateVal(item.assigned_date)} /></div>
        <div className="field field-wide"><label>Notlar</label><input name="notes" type="text" defaultValue={item.notes ?? ""} /></div>
      </div>

      <div className="form-actions">
        <Link href={cancelHref} className="btn-cancel">İptal</Link>
        <button type="submit" className="btn-save">Kaydet</button>
      </div>
    </form>
  );
}
