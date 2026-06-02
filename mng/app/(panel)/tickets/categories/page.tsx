import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ticket Kategorileri — xShield MNG" };
export const dynamic = "force-dynamic";

async function addCategory(fd: FormData) {
  "use server";
  const name = (fd.get("name") as string)?.trim();
  const color = (fd.get("color") as string) || "#64748b";
  if (!name) return;
  await query("INSERT INTO ticket_categories (name,color) VALUES ($1,$2)", [name, color]);
  redirect(`/tickets/categories?_toast=${encodeURIComponent("Kategori eklendi")}&_tt=success`);
}

async function addSubcategory(fd: FormData) {
  "use server";
  const categoryId = fd.get("category_id");
  const name = (fd.get("name") as string)?.trim();
  if (!name || !categoryId) return;
  await query("INSERT INTO ticket_subcategories (category_id,name) VALUES ($1,$2)", [categoryId, name]);
  redirect(`/tickets/categories?_toast=${encodeURIComponent("Alt kategori eklendi")}&_tt=success`);
}

async function deleteCategory(fd: FormData) {
  "use server";
  const id = fd.get("id");
  const count = await queryOne<{ c: string }>(
    "SELECT COUNT(*) AS c FROM tickets WHERE category_id=$1", [id]
  );
  if (Number(count?.c) > 0) {
    redirect(`/tickets/categories?_toast=${encodeURIComponent("Kategoriye bağlı talepler var, silinemez")}&_tt=error`);
  }
  await query("DELETE FROM ticket_categories WHERE id=$1", [id]);
  redirect(`/tickets/categories?_toast=${encodeURIComponent("Kategori silindi")}&_tt=success`);
}

async function deleteSubcategory(fd: FormData) {
  "use server";
  const id = fd.get("id");
  await query("UPDATE tickets SET subcategory_id=NULL WHERE subcategory_id=$1", [id]);
  await query("DELETE FROM ticket_subcategories WHERE id=$1", [id]);
  redirect(`/tickets/categories?_toast=${encodeURIComponent("Alt kategori silindi")}&_tt=success`);
}

async function updateCategoryColor(fd: FormData) {
  "use server";
  const id = fd.get("id");
  const color = fd.get("color") as string;
  await query("UPDATE ticket_categories SET color=$1 WHERE id=$2", [color, id]);
  redirect(`/tickets/categories`);
}

export default async function TicketCategoriesPage() {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/tickets");

  const categories = await query<{
    id: number; name: string; color: string; ticket_count: string;
  }>(
    `SELECT tc.id, tc.name, tc.color,
            COUNT(t.id) AS ticket_count
     FROM ticket_categories tc
     LEFT JOIN tickets t ON t.category_id=tc.id
     GROUP BY tc.id ORDER BY tc.sort_order, tc.name`
  );

  const subcategories = await query<{
    id: number; category_id: number; name: string; ticket_count: string;
  }>(
    `SELECT ts.id, ts.category_id, ts.name,
            COUNT(t.id) AS ticket_count
     FROM ticket_subcategories ts
     LEFT JOIN tickets t ON t.subcategory_id=ts.id
     GROUP BY ts.id ORDER BY ts.sort_order, ts.name`
  );

  const subsByCategory = subcategories.reduce<Record<number, typeof subcategories>>((acc, s) => {
    (acc[s.category_id] ??= []).push(s);
    return acc;
  }, {});

  const PRESET_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#a78bfa","#ec4899","#14b8a6","#64748b"];

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="header">
          <h1 className="title">Destek Talepleri</h1>
        </div>

        <div className="tabs">
          <Link href="/tickets" className="tab">Talepler</Link>
          <span className="tab active">Kategoriler</span>
        </div>

        <div className="layout">
          <div className="cat-list">
            {categories.length === 0 ? (
              <div className="empty">Henüz kategori yok.</div>
            ) : categories.map((cat) => {
              const subs = subsByCategory[cat.id] ?? [];
              return (
                <div key={cat.id} className="cat-card">
                  <div className="cat-header">
                    <div className="cat-name-row">
                      <span className="cat-dot" style={{ background: cat.color }} />
                      <span className="cat-name">{cat.name}</span>
                      <span className="cat-count">{cat.ticket_count} talep</span>
                    </div>
                    <div className="cat-actions">
                      <form action={updateCategoryColor} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <input type="hidden" name="id" value={cat.id} />
                        <div className="color-row">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              type="submit"
                              name="color"
                              value={c}
                              className="color-dot"
                              style={{ background: c, outline: cat.color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }}
                              title={c}
                            />
                          ))}
                        </div>
                      </form>
                      {Number(cat.ticket_count) === 0 && (
                        <form action={deleteCategory}>
                          <input type="hidden" name="id" value={cat.id} />
                          <button type="submit" className="del-btn" title="Sil">✕</button>
                        </form>
                      )}
                    </div>
                  </div>

                  <div className="sub-list">
                    {subs.map((sub) => (
                      <div key={sub.id} className="sub-row">
                        <span className="sub-dot" style={{ background: cat.color }} />
                        <span className="sub-name">{sub.name}</span>
                        <span className="sub-count">{sub.ticket_count}</span>
                        <form action={deleteSubcategory} style={{ marginLeft: "auto" }}>
                          <input type="hidden" name="id" value={sub.id} />
                          <button type="submit" className="del-sub-btn" title="Sil">✕</button>
                        </form>
                      </div>
                    ))}
                    <form action={addSubcategory} className="add-sub-form">
                      <input type="hidden" name="category_id" value={cat.id} />
                      <input
                        name="name"
                        placeholder="Yeni alt kategori…"
                        className="sub-input"
                        required
                      />
                      <button type="submit" className="add-sub-btn">+ Ekle</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="add-panel">
            <div className="add-panel-title">Yeni Kategori</div>
            <form action={addCategory} className="add-form">
              <div className="field">
                <label>Kategori Adı *</label>
                <input name="name" required placeholder="ör. Network, Yazılım, Donanım…" />
              </div>
              <div className="field">
                <label>Renk</label>
                <div className="color-picker">
                  {PRESET_COLORS.map((c) => (
                    <label key={c} className="color-opt">
                      <input type="radio" name="color" value={c} defaultChecked={c === "#3b82f6"} className="sr-only" />
                      <span className="color-swatch" style={{ background: c }} />
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-add">Kategori Ekle</button>
            </form>

            <div className="stats-box">
              <div className="stats-title">İstatistik</div>
              <div className="stats-row">
                <span>Toplam Kategori</span>
                <strong>{categories.length}</strong>
              </div>
              <div className="stats-row">
                <span>Toplam Alt Kategori</span>
                <strong>{subcategories.length}</strong>
              </div>
              <div className="stats-row">
                <span>Kategorisiz Talep</span>
                <strong>
                  {await (async () => {
                    const r = await queryOne<{ c: string }>("SELECT COUNT(*) AS c FROM tickets WHERE category_id IS NULL");
                    return r?.c ?? 0;
                  })()}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const css = `
.page{padding:28px}
.header{margin-bottom:0}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:16px}
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--divider);margin-bottom:24px}
.tab{padding:10px 18px;font-size:13px;font-weight:600;color:var(--text-dim);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;text-decoration:none}
.tab:hover{color:var(--text-muted)}
.tab.active{color:#3b82f6;border-bottom-color:#3b82f6}
.layout{display:grid;grid-template-columns:1fr 320px;gap:24px;align-items:start}
.cat-list{display:flex;flex-direction:column;gap:14px}
.cat-card{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.cat-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--divider);gap:12px;flex-wrap:wrap}
.cat-name-row{display:flex;align-items:center;gap:10px}
.cat-dot{width:12px;height:12px;border-radius:3px;flex-shrink:0}
.cat-name{font-size:15px;font-weight:700;color:var(--text)}
.cat-count{font-size:11px;color:var(--text-ghost);background:var(--input-bg);padding:2px 7px;border-radius:10px;font-weight:600}
.cat-actions{display:flex;align-items:center;gap:8px}
.color-row{display:flex;gap:4px}
.color-dot{width:16px;height:16px;border-radius:4px;cursor:pointer;border:none;padding:0;flex-shrink:0;transition:transform 0.1s}
.color-dot:hover{transform:scale(1.2)}
.del-btn{background:transparent;border:none;color:var(--text-ghost);cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px;line-height:1}
.del-btn:hover{color:#ef4444;background:rgba(239,68,68,0.08)}
.sub-list{padding:10px 18px;display:flex;flex-direction:column;gap:6px}
.sub-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:7px;background:var(--input-bg)}
.sub-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.sub-name{font-size:13px;color:var(--text-sub);flex:1}
.sub-count{font-size:11px;color:var(--text-ghost);font-weight:600}
.del-sub-btn{background:transparent;border:none;color:var(--text-ghost);cursor:pointer;font-size:12px;padding:1px 5px;border-radius:3px}
.del-sub-btn:hover{color:#ef4444}
.add-sub-form{display:flex;gap:6px;margin-top:4px}
.sub-input{flex:1;background:var(--input-bg);border:1px solid var(--input-border);border-radius:7px;padding:7px 10px;color:var(--text);font-size:12px;outline:none}
.sub-input:focus{border-color:#3b82f6}
.add-sub-btn{background:rgba(59,130,246,0.1);color:#3b82f6;border:1px solid rgba(59,130,246,0.2);border-radius:7px;padding:7px 12px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
.add-sub-btn:hover{background:rgba(59,130,246,0.18)}
.empty{padding:32px;text-align:center;color:var(--text-ghost);font-size:13px}
.add-panel{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:20px;position:sticky;top:20px}
.add-panel-title{font-size:11px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.08em}
.add-form{display:flex;flex-direction:column;gap:14px}
.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.field input{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:9px 12px;color:var(--text);outline:none;font-size:13px}
.field input:focus{border-color:#3b82f6}
.color-picker{display:flex;gap:8px;flex-wrap:wrap}
.color-opt{cursor:pointer}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0}
.color-swatch{display:block;width:22px;height:22px;border-radius:5px;transition:transform 0.1s,box-shadow 0.1s}
.color-opt:has(input:checked) .color-swatch{transform:scale(1.15);box-shadow:0 0 0 2px var(--bg),0 0 0 4px currentColor}
.btn-add{background:#2563eb;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer}
.btn-add:hover{background:#1d4ed8}
.stats-box{border-top:1px solid var(--divider);padding-top:16px;display:flex;flex-direction:column;gap:8px}
.stats-title{font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px}
.stats-row{display:flex;justify-content:space-between;font-size:13px;color:var(--text-dim)}
.stats-row strong{color:var(--text-sub);font-weight:700}
`;
