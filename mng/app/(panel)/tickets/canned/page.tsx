import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { DeleteButton } from "@/components/DeleteButton";

export const metadata: Metadata = { title: "Hazır Yanıtlar — xShield MNG" };
export const dynamic = "force-dynamic";

async function createCanned(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const title = (fd.get("title") as string)?.trim();
  const body = (fd.get("body") as string)?.trim();
  const sortOrder = Number(fd.get("sort_order") || 0);
  if (!title || !body) return;
  await query(
    "INSERT INTO canned_responses (title,body,sort_order) VALUES ($1,$2,$3)",
    [title, body, sortOrder]
  );
  redirect("/tickets/canned?_toast=" + encodeURIComponent("Hazır yanıt eklendi") + "&_tt=success");
}

async function updateCanned(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const id = fd.get("id");
  const title = (fd.get("title") as string)?.trim();
  const body = (fd.get("body") as string)?.trim();
  const sortOrder = Number(fd.get("sort_order") || 0);
  if (!title || !body) return;
  await query(
    "UPDATE canned_responses SET title=$1,body=$2,sort_order=$3 WHERE id=$4",
    [title, body, sortOrder, id]
  );
  redirect("/tickets/canned?_toast=" + encodeURIComponent("Güncellendi") + "&_tt=success");
}

export default async function CannedPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const session = await getSession();
  const isAdmin = session?.role === "admin";

  const items = await query<{
    id: number; title: string; body: string; sort_order: number; created_at: string;
  }>("SELECT * FROM canned_responses ORDER BY sort_order, title");

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="title">Hazır Yanıtlar</h1>
            <p className="subtitle">Ticket yanıtlarken hızlıca eklenebilecek şablon metinler.</p>
          </div>
        </div>

        <div className="tabs">
          <Link href="/tickets" className="tab">Talepler</Link>
          <Link href="/tickets/categories" className="tab">Kategoriler</Link>
          <Link href="/tickets/canned" className="tab active">Hazır Yanıtlar</Link>
          <Link href="/tickets/export" className="tab">CSV Export/Import</Link>
        </div>

        {/* Add form — admin only */}
        {isAdmin && (
          <details className="panel">
            <summary className="panel-summary">+ Yeni Hazır Yanıt Ekle</summary>
            <form action={createCanned} className="canned-form">
              <div className="field">
                <label>Başlık *</label>
                <input name="title" type="text" required placeholder="ör. Teşekkür — Kapatma" />
              </div>
              <div className="field">
                <label>Metin *</label>
                <textarea name="body" rows={5} required
                  placeholder="Müşteriye gönderilecek şablon metin…" />
              </div>
              <div className="field field-sm">
                <label>Sıra</label>
                <input name="sort_order" type="number" defaultValue={0} style={{ width: 80 }} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-save">Ekle</button>
              </div>
            </form>
          </details>
        )}

        {/* List */}
        {items.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">✦</div>
            <div>Henüz hazır yanıt yok.</div>
            {isAdmin && <div className="empty-hint">Yukarıdan ekleyebilirsin.</div>}
          </div>
        ) : (
          <div className="list">
            {items.map((item) =>
              edit === String(item.id) && isAdmin ? (
                /* ── Edit form ── */
                <div key={item.id} className="canned-card editing">
                  <form action={updateCanned} className="canned-form">
                    <input type="hidden" name="id" value={item.id} />
                    <div className="field">
                      <label>Başlık *</label>
                      <input name="title" type="text" required defaultValue={item.title} />
                    </div>
                    <div className="field">
                      <label>Metin *</label>
                      <textarea name="body" rows={6} required defaultValue={item.body} />
                    </div>
                    <div className="field field-sm">
                      <label>Sıra</label>
                      <input name="sort_order" type="number" defaultValue={item.sort_order} style={{ width: 80 }} />
                    </div>
                    <div className="form-actions">
                      <Link href="/tickets/canned" className="btn-cancel">İptal</Link>
                      <button type="submit" className="btn-save">Kaydet</button>
                    </div>
                  </form>
                </div>
              ) : (
                /* ── View card ── */
                <div key={item.id} className="canned-card">
                  <div className="card-head">
                    <span className="card-title">{item.title}</span>
                    {item.sort_order > 0 && (
                      <span className="sort-badge">#{item.sort_order}</span>
                    )}
                    {isAdmin && (
                      <div className="card-actions">
                        <Link href={`/tickets/canned?edit=${item.id}`} className="act-edit">
                          Düzenle
                        </Link>
                        <DeleteButton
                          entityId={item.id}
                          label="Sil"
                          confirmMsg={`"${item.title}" silinsin mi?`}
                          action="/api/canned-responses/delete"
                          redirectTo="/tickets/canned"
                        />
                      </div>
                    )}
                  </div>
                  <div className="card-body">{item.body}</div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </>
  );
}

const css = `
.page{padding:28px;max-width:780px;display:flex;flex-direction:column;gap:16px}
@media(max-width:640px){.page{padding:16px;gap:12px}}
.page-header{display:flex;align-items:flex-start;justify-content:space-between}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
.subtitle{font-size:13px;color:var(--text-dim);margin-top:4px}
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--divider)}
.tab{padding:10px 18px;font-size:13px;font-weight:600;color:var(--text-dim);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;text-decoration:none;white-space:nowrap}
.tab:hover{color:var(--text-muted)}
.tab.active{color:#3b82f6;border-bottom-color:#3b82f6}
/* Panel */
.panel{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.panel-summary{padding:13px 18px;font-size:13px;font-weight:600;color:#3b82f6;cursor:pointer;list-style:none;user-select:none}
.panel-summary::-webkit-details-marker{display:none}
.panel[open] .panel-summary{border-bottom:1px solid var(--divider)}
/* Form */
.canned-form{display:flex;flex-direction:column;gap:12px;padding:16px 18px}
.field{display:flex;flex-direction:column;gap:5px}
.field-sm{flex-direction:row;align-items:center;gap:10px}
.field label{font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.field input,.field textarea{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:10px 12px;color:var(--text);outline:none;resize:vertical;font-size:13px;font-family:inherit;transition:border-color 0.15s}
.field input:focus,.field textarea:focus{border-color:#3b82f6}
.form-actions{display:flex;gap:8px;justify-content:flex-end}
.btn-save{padding:9px 22px;border-radius:8px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer}
.btn-save:hover{background:#1d4ed8}
.btn-cancel{padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;color:var(--text-dim);border:1px solid var(--border2);background:transparent;display:inline-flex;align-items:center}
/* List */
.list{display:flex;flex-direction:column;gap:10px}
.empty{padding:56px;text-align:center;color:var(--text-ghost);font-size:13px;display:flex;flex-direction:column;align-items:center;gap:8px}
.empty-icon{font-size:24px;opacity:0.3}
.empty-hint{font-size:12px;color:var(--text-ghost)}
/* Cards */
.canned-card{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.canned-card.editing{border-color:rgba(59,130,246,0.3)}
.card-head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--row-border);background:var(--input-bg);flex-wrap:wrap}
.card-title{font-size:13px;font-weight:700;color:var(--text);flex:1;min-width:0}
.sort-badge{font-size:10px;color:var(--text-ghost);background:var(--card2);border:1px solid var(--border2);border-radius:4px;padding:1px 6px}
.card-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
.act-edit{font-size:11px;font-weight:600;color:var(--text-dim);padding:4px 10px;border-radius:5px;border:1px solid var(--border2)}
.act-edit:hover{color:var(--text);border-color:var(--border)}
.card-body{padding:14px 16px;font-size:13px;color:var(--text-muted);line-height:1.7;white-space:pre-wrap;word-break:break-word}
@media(max-width:480px){.tabs{overflow-x:auto}.tab{padding:10px 14px;font-size:12px}}
`;
