"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EditInventoryForm } from "./_edit_form";
import type { Definition, Category } from "./_add_form";

interface Customer { id: number; company_name: string; }
interface Employee { id: number; first_name: string; last_name: string; customer_id: number; }

export interface InventoryItem {
  id: number; name: string; category: string; brand: string | null; model: string | null;
  serial_no: string | null; asset_tag: string | null; status: string;
  assigned_date: string | null; purchase_date: string | null; notes: string | null;
  customer_id: number; company_name: string;
  employee_id: number | null; emp_first: string | null; emp_last: string | null;
}

interface Props {
  items: InventoryItem[];
  editId: number | null;
  isAdmin: boolean;
  catMap: Record<string, string>;
  customers: Customer[];
  allEmployees: Employee[];
  definitions: Definition[];
  categories: Category[];
  updateItem: (fd: FormData) => Promise<void>;
  filters: { customer?: string; category?: string; status?: string };
}

const STATUS_LABEL: Record<string, string> = { active: "Aktif", maintenance: "Bakımda", retired: "Hizmetten Çıktı" };
const STATUS_COLOR: Record<string, string> = { active: "#22c55e", maintenance: "#f59e0b", retired: "#64748b" };

function makeLink(filters: Record<string, string | undefined>, patch: Record<string, string>) {
  const merged = { ...filters, ...patch };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) p.set(k, v);
  }
  return `/inventory?${p}`;
}

export function InventoryTable({
  items, editId, isAdmin, catMap, customers, allEmployees,
  definitions, categories, updateItem, filters,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const toggle = useCallback((id: number) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev =>
      prev.size === items.length ? new Set() : new Set(items.map(i => i.id))
    );
  }, [items]);

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleBulkDelete = async () => {
    setBusy(true);
    setConfirming(false);
    try {
      const res = await fetch("/api/inventory/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([...selected]),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      showMsg(`${data.deleted} envanter silindi`, true);
      setSelected(new Set());
      router.refresh();
    } catch {
      showMsg("Silme işlemi başarısız", false);
    } finally {
      setBusy(false);
    }
  };

  const colSpan = isAdmin ? 9 : 8;
  const allChecked = items.length > 0 && selected.size === items.length;
  const someChecked = selected.size > 0 && selected.size < items.length;

  if (items.length === 0) {
    return <div className="empty">Kayıt bulunamadı.</div>;
  }

  return (
    <div className="inv-table-root">
      {msg && (
        <div className={`inv-msg ${msg.ok ? "inv-msg-ok" : "inv-msg-err"}`}>{msg.text}</div>
      )}

      {isAdmin && selected.size > 0 && (
        <div className="bulk-bar">
          {!confirming ? (
            <>
              <span className="bulk-count">{selected.size} kayıt seçildi</span>
              <button
                className="bulk-del-btn"
                onClick={() => setConfirming(true)}
                disabled={busy}
              >
                🗑 Seçilenleri Sil
              </button>
              <button className="bulk-cancel-btn" onClick={() => setSelected(new Set())}>
                İptal
              </button>
            </>
          ) : (
            <>
              <span className="bulk-confirm-text">{selected.size} kayıt silinsin mi? Bu işlem geri alınamaz.</span>
              <button className="bulk-del-btn" onClick={handleBulkDelete} disabled={busy}>
                {busy ? "Siliniyor…" : "Evet, Sil"}
              </button>
              <button className="bulk-cancel-btn" onClick={() => setConfirming(false)}>
                İptal
              </button>
            </>
          )}
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {isAdmin && (
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll}
                    title="Tümünü seç"
                  />
                </th>
              )}
              <th>Firma</th><th>Cihaz</th><th>Kategori</th>
              <th>Marka / Model</th><th>Seri No</th><th>Durum</th>
              <th>Zimmetli</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isEditing = editId === item.id;
              const isSelected = selected.has(item.id);
              const sc = STATUS_COLOR[item.status] ?? "#64748b";
              const cancelHref = makeLink(filters, {});

              if (isEditing) {
                return (
                  <tr key={item.id} className="editing-row">
                    <td colSpan={colSpan}>
                      <EditInventoryForm
                        item={item}
                        customers={customers}
                        allEmployees={allEmployees}
                        definitions={definitions}
                        categories={categories}
                        updateItem={updateItem}
                        cancelHref={cancelHref}
                      />
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={item.id} className={isSelected ? "row-sel" : ""}>
                  {isAdmin && (
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(item.id)}
                      />
                    </td>
                  )}
                  <td>
                    <Link href={`/customers/${item.customer_id}`} className="cust-link">
                      {item.company_name}
                    </Link>
                  </td>
                  <td>
                    <span className="item-name">{item.name}</span>
                    {item.asset_tag && <span className="asset-tag">#{item.asset_tag}</span>}
                  </td>
                  <td><span className="cat-badge">{catMap[item.category] ?? item.category}</span></td>
                  <td className="brand-col">{[item.brand, item.model].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="mono">{item.serial_no || "—"}</td>
                  <td>
                    <span className="status-badge" style={{ color: sc, background: `${sc}15`, borderColor: `${sc}30` }}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </td>
                  <td>
                    {item.employee_id
                      ? <Link href={`/customers/${item.customer_id}/employees`} className="emp-link">
                          {item.emp_first} {item.emp_last}
                        </Link>
                      : <span className="dim">—</span>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link
                        href={makeLink(filters, { edit: String(item.id) })}
                        className="act-btn"
                      >
                        Düzenle
                      </Link>
                      {isAdmin && (
                        <RowDeleteButton
                          itemId={item.id}
                          name={item.name}
                          onDeleted={() => router.refresh()}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowDeleteButton({ itemId, name, onDeleted }: { itemId: number; name: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "#fca5a5" }}>&quot;{name}&quot; silinsin mi?</span>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await fetch("/api/inventory/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify([itemId]),
            });
            onDeleted();
          }}
          style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
        >
          {busy ? "…" : "Evet"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{ padding: "4px 10px", borderRadius: 6, background: "transparent", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontSize: 11 }}
        >
          İptal
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="act-btn act-btn-del"
    >
      Sil
    </button>
  );
}
