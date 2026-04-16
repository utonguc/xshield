"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { exportExcel, exportPDF } from "@/lib/export";
import { btn, inp } from "@/lib/ui";
import { fmtDate, fmtDateTime } from "@/lib/tz";

const FREQ_LABELS: Record<string, string> = { daily:"Günlük", weekly:"Haftalık", monthly:"Aylık" };
const LEAD_COLORS: Record<string, string> = {
  "Yeni":"#175cd3","Görüşüldü":"#6d28d9","Teklif Verildi":"#b45309",
  "Randevu Oluştu":"#0e7490","İşlem Yapıldı":"#065f46","İptal":"#991b1b",
};

type SummaryData = {
  totalPatients: number; totalDoctors: number;
  totalAppointments: number; thisMonthAppointments: number;
  leadFunnel: { status: string; count: number }[];
  upcomingByDoctor: { doctor: string; count: number }[];
  latestAppointments: { id: string; patient: string; doctor: string; procedureName: string; startAtUtc: string; status: string }[];
  monthlyTrend: { year: number; month: number; count: number }[];
};

type ScheduledReport = {
  id: string; name: string; reportType: string; reportTypeLabel: string;
  frequency: string; recipientEmails?: string; isActive: boolean;
  lastSentAtUtc?: string; nextRunAtUtc?: string; createdAtUtc: string;
};

type ReportType = { code: string; label: string };

const card: React.CSSProperties = { background:"white", border:"1px solid #eaecf0", borderRadius:20, padding:20 };

const MONTHS = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];

type FinancialData = {
  totalRevenue: number; thisMonthRevenue: number; lastMonthRevenue: number; totalReceivable: number;
  monthlyRevenue: { year: number; month: number; total: number; count: number }[];
  statusBreakdown: { status: string; count: number; total: number }[];
  topProcedures: { procedure: string; count: number }[];
};
type PatientsAnalytics = {
  monthlyNew: { year: number; month: number; count: number }[];
  bySource: { source: string; count: number }[];
  byGender: { gender: string; count: number }[];
  byCity: { city: string; count: number }[];
  byProcedure: { procedure: string; count: number }[];
};

export default function ReportsPage() {
  const [tab, setTab]               = useState<"overview"|"finance"|"patients"|"scheduled">("overview");
  const [summary, setSummary]       = useState<SummaryData|null>(null);
  const [financial, setFinancial]   = useState<FinancialData|null>(null);
  const [patientsAn, setPatientsAn] = useState<PatientsAnalytics|null>(null);
  const [scheduled, setScheduled]   = useState<ScheduledReport[]>([]);
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [message, setMessage]       = useState("Yükleniyor...");
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ name:"", reportType:"", frequency:"weekly", recipientEmails:"" });

  const loadAll = async () => {
    try {
      const [sr, sc, rt, fin, pa] = await Promise.all([
        apiFetch("/Reports/summary"),
        apiFetch("/Reports/scheduled"),
        apiFetch("/Reports/report-types"),
        apiFetch("/Reports/financial?months=6"),
        apiFetch("/Reports/patients-analytics"),
      ]);
      if (!sr.ok) throw new Error("Raporlar alınamadı.");
      setSummary(await sr.json());
      const scData = await sc.json(); setScheduled(Array.isArray(scData) ? scData : []);
      const rtData = await rt.json(); setReportTypes(Array.isArray(rtData) ? rtData : []);
      if (fin.ok) setFinancial(await fin.json());
      if (pa.ok)  setPatientsAn(await pa.json());
      setMessage("");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Hata"); }
  };

  useEffect(() => { loadAll(); }, []);

  const createScheduled = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/Reports/scheduled", { method:"POST", body: JSON.stringify(form) });
    if (res.ok) { setShowForm(false); setForm({ name:"", reportType:"", frequency:"weekly", recipientEmails:"" }); await loadAll(); }
    else { const d = await res.json().catch(() => ({})); setMessage(d.message ?? "Hata"); }
  };

  const toggleScheduled = async (id: string) => {
    await apiFetch(`/Reports/scheduled/${id}/toggle`, { method:"PATCH" });
    await loadAll();
  };

  const deleteScheduled = async (id: string) => {
    if (!confirm("Rapor planı silinsin mi?")) return;
    await apiFetch(`/Reports/scheduled/${id}`, { method:"DELETE" });
    await loadAll();
  };

  const sendNow = async (id: string) => {
    const r = await apiFetch(`/Reports/scheduled/${id}/send-now`, { method:"POST" });
    const d = await r.json().catch(() => ({}));
    alert(d.message ?? (r.ok ? "Gönderildi." : "Hata oluştu."));
    if (r.ok) await loadAll();
  };

  if (message && !summary) return (
    <AppShell title="Raporlar"><div style={{ padding:16, background:"#f2f4f7", borderRadius:14 }}>{message}</div></AppShell>
  );

  const maxTrend = Math.max(...(summary?.monthlyTrend?.map(r => r.count) ?? [1]), 1);
  const maxDoctor = Math.max(...(summary?.upcomingByDoctor?.map(r => r.count) ?? [1]), 1);

  const fmt = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  const trendPct = financial && financial.lastMonthRevenue > 0
    ? Math.round((financial.thisMonthRevenue - financial.lastMonthRevenue) * 100 / financial.lastMonthRevenue)
    : 0;

  return (
    <AppShell title="Raporlar" description="İstatistikler ve planlı raporlar">

      {/* Tab bar */}
      <div style={{ display:"flex", gap:4, marginBottom:20, background:"#f1f5f9", borderRadius:14, padding:4, width:"fit-content" }}>
        {([
          ["overview",  "◈ Genel Bakış"],
          ["finance",   "₺ Gelir Analizi"],
          ["patients",  "♥ Hasta Analizi"],
          ["scheduled", "⏰ Planlı Raporlar"],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:"8px 16px", borderRadius:10, border:"none", cursor:"pointer",
            fontWeight:600, fontSize:13,
            background: tab === t ? "#fff" : "transparent",
            color:      tab === t ? "#0f172a" : "#64748b",
            boxShadow:  tab === t ? "0 1px 4px rgba(0,0,0,.08)" : "none",
          }}>{label}</button>
        ))}
      </div>

      {/* KPI row (shown on all tabs) */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:20 }}>
        {[
          { label:"Toplam Hasta",      value: summary?.totalPatients },
          { label:"Aktif Doktor",      value: summary?.totalDoctors },
          { label:"Toplam Randevu",    value: summary?.totalAppointments },
          { label:"Bu Ay Randevu",     value: summary?.thisMonthAppointments },
        ].map(({ label, value }) => (
          <div key={label} style={card}>
            <div style={{ color:"#667085", fontSize:12 }}>{label}</div>
            <div style={{ fontSize:34, fontWeight:800, marginTop:4 }}>{value ?? 0}</div>
          </div>
        ))}
      </div>

      {tab === "overview" && (<>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>

        {/* Aylık Trend */}
        <div style={card}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>Aylık Randevu Trendi</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100 }}>
            {(summary?.monthlyTrend ?? []).map((r, i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ width:"100%", background:"#1d4ed8", borderRadius:"4px 4px 0 0",
                  height:`${(r.count/maxTrend)*80}px`, minHeight:4 }}/>
                <div style={{ fontSize:10, color:"#98a2b3" }}>{MONTHS[r.month-1]}</div>
              </div>
            ))}
            {!summary?.monthlyTrend?.length && <div style={{ color:"#98a2b3", fontSize:13 }}>Veri yok.</div>}
          </div>
        </div>

        {/* Lead Hunisi */}
        <div style={card}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>Lead Hunisi</div>
          <div style={{ display:"grid", gap:6 }}>
            {(summary?.leadFunnel ?? []).map((r, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between",
                padding:"6px 12px", borderRadius:8, fontSize:13,
                background:`${LEAD_COLORS[r.status] ?? "#667085"}15`,
                color: LEAD_COLORS[r.status] ?? "#667085" }}>
                <span>{r.status}</span><strong>{r.count}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Doktor Yoğunluğu */}
        <div style={card}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>Önümüzdeki 7 Gün — Doktor Yoğunluğu</div>
          {(summary?.upcomingByDoctor ?? []).length === 0
            ? <div style={{ color:"#98a2b3", fontSize:13 }}>Yaklaşan randevu yok.</div>
            : (summary?.upcomingByDoctor ?? []).map((r, i) => (
              <div key={i} style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:3 }}>
                  <span>{r.doctor}</span><strong>{r.count}</strong>
                </div>
                <div style={{ height:6, background:"#f2f4f7", borderRadius:3 }}>
                  <div style={{ height:6, borderRadius:3, background:"#1d4ed8",
                    width:`${(r.count/maxDoctor)*100}%` }}/>
                </div>
              </div>
            ))}
        </div>

        {/* Son Randevular */}
        <div style={card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontWeight:700, fontSize:14 }}>Son Randevular</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => exportExcel((summary?.latestAppointments ?? []).map(r => ({
                patient: r.patient, doctor: r.doctor, procedure: r.procedureName,
                date: fmtDate(r.startAtUtc), status: r.status,
              })), [
                { key: "patient", label: "Hasta" }, { key: "doctor", label: "Doktor" },
                { key: "procedure", label: "İşlem" }, { key: "date", label: "Tarih" }, { key: "status", label: "Durum" },
              ], "randevular")} style={{ padding:"5px 12px", borderRadius:8, border:"1px solid #e4e7ec", background:"#f8fafc", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                ⬇ Excel
              </button>
              <button onClick={() => exportPDF((summary?.latestAppointments ?? []).map(r => ({
                patient: r.patient, doctor: r.doctor, procedure: r.procedureName,
                date: fmtDate(r.startAtUtc), status: r.status,
              })), [
                { key: "patient", label: "Hasta" }, { key: "doctor", label: "Doktor" },
                { key: "procedure", label: "İşlem" }, { key: "date", label: "Tarih" }, { key: "status", label: "Durum" },
              ], "randevular", "Son Randevular")} style={{ padding:"5px 12px", borderRadius:8, border:"1px solid #e4e7ec", background:"#f8fafc", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                ⬇ PDF
              </button>
            </div>
          </div>
          <div style={{ display:"grid", gap:8 }}>
            {(summary?.latestAppointments ?? []).map(r => (
              <div key={r.id} style={{ padding:"8px 12px", background:"#f8fafc", borderRadius:10 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{r.procedureName}</div>
                <div style={{ color:"#667085", fontSize:12 }}>{r.patient} · {r.doctor}</div>
                <div style={{ color:"#98a2b3", fontSize:11 }}>{fmtDateTime(r.startAtUtc)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </>)}

      {tab === "scheduled" && (
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:15 }}>Planlı Raporlar</div>
          <button onClick={() => setShowForm(!showForm)} style={btn("white","#1d4ed8")}>
            {showForm ? "✕ Kapat" : "+ Yeni Plan"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createScheduled}
            className="form-grid"
            style={{ gap:10, marginBottom:16,
              padding:14, background:"#f8fafc", borderRadius:14, border:"1px solid #e4e7ec" }}>
            <input placeholder="Rapor adı *" value={form.name}
              onChange={e => setForm(p => ({...p, name:e.target.value}))} style={inp}/>
            <select value={form.reportType}
              onChange={e => setForm(p => ({...p, reportType:e.target.value}))} style={inp}>
              <option value="">Tür seç *</option>
              {reportTypes.map(rt => <option key={rt.code} value={rt.code}>{rt.label}</option>)}
            </select>
            <select value={form.frequency}
              onChange={e => setForm(p => ({...p, frequency:e.target.value}))} style={inp}>
              <option value="daily">Günlük</option>
              <option value="weekly">Haftalık</option>
              <option value="monthly">Aylık</option>
            </select>
            <input placeholder="E-posta (virgülle)" value={form.recipientEmails}
              onChange={e => setForm(p => ({...p, recipientEmails:e.target.value}))} style={inp}/>
            <button type="submit" style={btn("white","#1d4ed8")}>Kaydet</button>
          </form>
        )}

        <div style={{ display:"grid", gap:10 }}>
          {scheduled.map(r => (
            <div key={r.id} style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", padding:"12px 16px", border:"1px solid #eaecf0",
              borderRadius:14, gap:16 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{r.name}</div>
                <div style={{ color:"#667085", fontSize:12, marginTop:3 }}>
                  {r.reportTypeLabel} · {FREQ_LABELS[r.frequency] ?? r.frequency}
                  {r.recipientEmails && ` · ${r.recipientEmails}`}
                </div>
                {r.nextRunAtUtc && (
                  <div style={{ color:"#98a2b3", fontSize:11, marginTop:2 }}>
                    Sonraki: {fmtDate(r.nextRunAtUtc)}
                    {r.lastSentAtUtc && ` · Son gönderim: ${fmtDate(r.lastSentAtUtc)}`}
                  </div>
                )}
              </div>
              <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                <button onClick={() => sendNow(r.id)}
                  style={btn("#344054","#f8fafc","1px solid #e4e7ec")} title="Hemen gönder">
                  ▶ Gönder
                </button>
                <button onClick={() => toggleScheduled(r.id)}
                  style={btn(r.isActive ? "#065f46" : "#b42318", r.isActive ? "#ecfdf5" : "#fef2f2",
                    `1px solid ${r.isActive ? "#a7f3d0" : "#fecaca"}`)}>
                  {r.isActive ? "Aktif" : "Pasif"}
                </button>
                <button onClick={() => deleteScheduled(r.id)}
                  style={btn("#b42318","#fef3f2","1px solid #fecdca")}>Sil</button>
              </div>
            </div>
          ))}
          {scheduled.length === 0 && <div style={{ color:"#98a2b3", fontSize:13 }}>Planlı rapor yok.</div>}
        </div>
      </div>
      )}

      {/* ── Finance tab ── */}
      {tab === "finance" && financial && (
        <div style={{ display:"grid", gap:20 }}>
          {/* Financial KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14 }}>
            {[
              { label:"Toplam Ciro",     value:`${fmt(financial.totalRevenue)} ₺`,     bg:"#f0fdf4", color:"#059669" },
              { label:"Bu Ay",           value:`${fmt(financial.thisMonthRevenue)} ₺`,  bg:"#eff8ff", color:"#1d4ed8" },
              { label:"Geçen Ay",        value:`${fmt(financial.lastMonthRevenue)} ₺`,  bg:"#f5f3ff", color:"#7c3aed" },
              { label:"Alacak",          value:`${fmt(financial.totalReceivable)} ₺`,   bg:"#fffbeb", color:"#b45309" },
            ].map(s => (
              <div key={s.label} style={{ ...card, background:s.bg, border:`1px solid ${s.color}20` }}>
                <div style={{ fontSize:12, color:s.color, fontWeight:600 }}>{s.label}</div>
                <div style={{ fontSize:26, fontWeight:800, color:s.color, marginTop:4 }}>{s.value}</div>
                {s.label === "Bu Ay" && trendPct !== 0 && (
                  <div style={{ fontSize:11, marginTop:4, color:trendPct > 0 ? "#059669" : "#b42318", fontWeight:600 }}>
                    {trendPct > 0 ? "↑" : "↓"} {Math.abs(trendPct)}% geçen aya göre
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {/* Monthly revenue bars */}
            <div style={card}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>Aylık Ciro (Son 6 Ay)</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100 }}>
                {(() => {
                  const max = Math.max(...financial.monthlyRevenue.map(r => r.total), 1);
                  return financial.monthlyRevenue.map((r, i) => (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <div style={{ fontSize:9, color:"#64748b", fontWeight:700 }}>{fmt(r.total/1000)}k</div>
                      <div style={{ width:"100%", background:"#059669", borderRadius:"4px 4px 0 0",
                        height:`${Math.max((r.total/max)*76,4)}px` }}/>
                      <div style={{ fontSize:9, color:"#98a2b3" }}>{MONTHS[r.month-1]}</div>
                    </div>
                  ));
                })()}
                {!financial.monthlyRevenue.length && <div style={{ color:"#98a2b3", fontSize:13 }}>Veri yok.</div>}
              </div>
            </div>
            {/* Top procedures */}
            <div style={card}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>En Çok Yapılan İşlemler</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {(() => {
                  const max = Math.max(...financial.topProcedures.map(p => p.count), 1);
                  return financial.topProcedures.slice(0,7).map((p,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:11, color:"#94a3b8", width:16, textAlign:"right" }}>{i+1}</span>
                      <span style={{ fontSize:12, color:"#344054", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.procedure}</span>
                      <div style={{ width:80, background:"#f1f5f9", borderRadius:3, height:6, flexShrink:0 }}>
                        <div style={{ width:`${(p.count/max)*100}%`, background:"#7c3aed", height:6, borderRadius:3 }}/>
                      </div>
                      <span style={{ fontSize:11, color:"#94a3b8", width:20, textAlign:"right" }}>{p.count}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Patients analytics tab ── */}
      {tab === "patients" && patientsAn && (
        <div style={{ display:"grid", gap:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
            {/* By source */}
            <div style={card}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>Lead Kaynağı</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {(() => {
                  const max = Math.max(...patientsAn.bySource.map(s => s.count), 1);
                  return patientsAn.bySource.map((s,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:12, color:"#344054", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.source}</span>
                      <div style={{ width:60, background:"#f1f5f9", borderRadius:3, height:6, flexShrink:0 }}>
                        <div style={{ width:`${(s.count/max)*100}%`, background:"#1d4ed8", height:6, borderRadius:3 }}/>
                      </div>
                      <span style={{ fontSize:11, color:"#94a3b8", width:24, textAlign:"right" }}>{s.count}</span>
                    </div>
                  ));
                })()}
                {!patientsAn.bySource.length && <div style={{ color:"#98a2b3", fontSize:13 }}>Veri yok.</div>}
              </div>
            </div>
            {/* By gender */}
            <div style={card}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>Cinsiyet Dağılımı</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {patientsAn.byGender.map((g, i) => {
                  const total = patientsAn.byGender.reduce((a,b) => a + b.count, 0);
                  const pct   = total > 0 ? Math.round(g.count * 100 / total) : 0;
                  const clrs  = ["#1d4ed8","#db2777","#7c3aed"];
                  return (
                    <div key={i}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                        <span style={{ color:"#344054" }}>{g.gender}</span>
                        <span style={{ color:"#94a3b8" }}>{g.count} ({pct}%)</span>
                      </div>
                      <div style={{ background:"#f1f5f9", borderRadius:3, height:8 }}>
                        <div style={{ width:`${pct}%`, background:clrs[i % 3], height:8, borderRadius:3, transition:"width 0.4s" }}/>
                      </div>
                    </div>
                  );
                })}
                {!patientsAn.byGender.length && <div style={{ color:"#98a2b3", fontSize:13 }}>Veri yok.</div>}
              </div>
            </div>
            {/* By city */}
            <div style={card}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>Şehir Dağılımı</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {(() => {
                  const max = Math.max(...patientsAn.byCity.map(c => c.count), 1);
                  return patientsAn.byCity.map((c,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:12, color:"#344054", flex:1 }}>{c.city}</span>
                      <div style={{ width:60, background:"#f1f5f9", borderRadius:3, height:6 }}>
                        <div style={{ width:`${(c.count/max)*100}%`, background:"#0e7490", height:6, borderRadius:3 }}/>
                      </div>
                      <span style={{ fontSize:11, color:"#94a3b8", width:24, textAlign:"right" }}>{c.count}</span>
                    </div>
                  ));
                })()}
                {!patientsAn.byCity.length && <div style={{ color:"#98a2b3", fontSize:13 }}>Veri yok.</div>}
              </div>
            </div>
          </div>
          {/* Monthly new patients */}
          <div style={{ ...card }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>Aylık Yeni Hasta (Son 6 Ay)</div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80 }}>
              {(() => {
                const max = Math.max(...patientsAn.monthlyNew.map(r => r.count), 1);
                return patientsAn.monthlyNew.map((r, i) => (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <div style={{ fontSize:9, color:"#64748b" }}>{r.count}</div>
                    <div style={{ width:"100%", background: i === patientsAn.monthlyNew.length-1 ? "#1d4ed8" : "#93c5fd",
                      borderRadius:"4px 4px 0 0", height:`${Math.max((r.count/max)*60,4)}px` }}/>
                    <div style={{ fontSize:9, color:"#98a2b3" }}>{MONTHS[r.month-1]}</div>
                  </div>
                ));
              })()}
              {!patientsAn.monthlyNew.length && <div style={{ color:"#98a2b3", fontSize:13 }}>Veri yok.</div>}
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}
