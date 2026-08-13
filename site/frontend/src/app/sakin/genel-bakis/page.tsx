"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime, STATUS_LABELS } from "@/lib/utils";

type SiteInfo = { id: number; name: string; address?: string; phone?: string; email?: string };
type Apartment = { id: number; blockName: string; number: string; floor: number; type?: string; squareMeters?: number; status: string };
type Bank = { id: number; bankName: string; accountName: string; iban: string; isDefault: boolean };
type Announcement = { id: number; title: string; content: string; isPinned: boolean; category: string; createdAt: string };
type DuesRecord = { duesPeriodId: number; periodTitle: string; amount: number; status: string; paidAt?: string; dueDate: string };

export default function SakinGenelBakis() {
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dues, setDues] = useState<DuesRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<SiteInfo>("/site"),
      api.get<Apartment[]>("/apartments"),
      api.get<Bank[]>("/banks"),
      api.get<Announcement[]>("/announcements"),
      api.get<DuesRecord[]>("/dues/my"),
    ]).then(([s, apts, bks, anns, d]) => {
      setSite(s);
      setApartments(apts);
      setBanks(bks.filter(b => b.isDefault));
      setAnnouncements(anns.slice(0, 4));
      setDues(d.slice(0, 6));
    }).finally(() => setLoading(false));
  }, []);

  const pendingDues = dues.filter(d => d.status === "Pending" || d.status === "Overdue");
  const totalPending = pendingDues.reduce((s, d) => s + d.amount, 0);

  if (loading) return <div className="text-slate-400 text-sm">Yükleniyor...</div>;

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">Genel Bakış</h1>

      {/* Site bilgisi */}
      {site && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Yaşadığınız Site</div>
              <div className="text-lg font-semibold text-slate-900">{site.name}</div>
              {site.address && <div className="text-sm text-slate-500 mt-0.5">{site.address}</div>}
              <div className="flex gap-4 text-sm text-slate-400 mt-2">
                {site.phone && <span>📞 {site.phone}</span>}
                {site.email && <span>✉️ {site.email}</span>}
              </div>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🏘️</div>
          </div>
        </div>
      )}

      {/* Daire bilgileri */}
      {apartments.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">Daire Bilgileriniz</div>
          <div className="space-y-2">
            {apartments.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                <div>
                  <div className="font-medium">{a.blockName} · Daire {a.number}</div>
                  <div className="text-xs text-slate-400">
                    {a.floor}. kat{a.type ? ` · ${a.type}` : ""}{a.squareMeters ? ` · ${a.squareMeters} m²` : ""}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  a.status === "Occupied" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                }`}>{STATUS_LABELS[a.status] ?? a.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bekleyen aidatlar + ödeme hesabı */}
      {pendingDues.length > 0 ? (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <div className="font-medium text-orange-900 mb-3">⚠️ Bekleyen Aidatlarınız — {formatCurrency(totalPending)}</div>
          <div className="space-y-1.5 mb-4">
            {pendingDues.map(d => (
              <div key={d.duesPeriodId} className="flex items-center justify-between text-sm">
                <span className="text-orange-700">{d.periodTitle}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-orange-500">Son: {formatDate(d.dueDate)}</span>
                  <span className="font-semibold text-orange-900">{formatCurrency(d.amount)}</span>
                </div>
              </div>
            ))}
          </div>
          {banks.map(b => (
            <div key={b.id} className="border-t border-orange-200 pt-3">
              <div className="text-xs text-orange-600 font-medium mb-1">Ödeme Yapılacak Hesap</div>
              <div className="bg-orange-100 rounded-lg px-3 py-2">
                <div className="font-medium text-orange-900 text-sm">{b.bankName} · {b.accountName}</div>
                <div className="font-mono text-sm text-orange-800 mt-0.5 break-all">{b.iban}</div>
              </div>
            </div>
          ))}
        </div>
      ) : dues.length > 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="font-medium text-green-900">Tüm aidatlarınız güncel</div>
            <div className="text-sm text-green-700">Bekleyen ödemeniz bulunmuyor.</div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Son duyurular */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">Son Duyurular</div>
          {announcements.length === 0 ? (
            <p className="text-slate-400 text-sm">Duyuru yok.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="border-l-2 border-blue-200 pl-3">
                  <div className="flex items-center gap-1.5">
                    {a.isPinned && <span className="text-xs">📌</span>}
                    <span className="font-medium text-sm">{a.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.content}</p>
                  <div className="text-xs text-slate-400 mt-0.5">{formatDateTime(a.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aidat özeti */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">Son Aidatlar</div>
          {dues.length === 0 ? (
            <p className="text-slate-400 text-sm">Aidat kaydı yok.</p>
          ) : (
            <div className="space-y-2">
              {dues.map(d => (
                <div key={d.duesPeriodId} className="flex items-center justify-between">
                  <span className="text-sm truncate">{d.periodTitle}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-medium">{formatCurrency(d.amount)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      d.status === "Paid" ? "bg-green-100 text-green-700" :
                      d.status === "Overdue" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>{STATUS_LABELS[d.status] ?? d.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
