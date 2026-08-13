"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

type Visitor = {
  id: number; fullName: string; phone?: string; apartmentLabel?: string;
  plateNumber?: string; note?: string; entryTime: string; exitTime?: string; inside: boolean;
};

export default function SakinZiyaretcilerPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Visitor[]>("/visitors/my").then(setVisitors).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Ziyaretçilerim</h1>
        <p className="text-sm text-slate-500 mt-0.5">Dairenize gelen ziyaretçi kayıtları</p>
      </div>

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> :
        visitors.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
            Henüz ziyaretçi kaydı yok.
          </div>
        ) : visitors.map(v => (
          <div key={v.id} className={`bg-white rounded-xl border p-4 ${v.inside ? "border-amber-300 bg-amber-50/40" : "border-slate-200"}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{v.fullName}</span>
              {v.inside
                ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">İçeride</span>
                : <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Çıktı</span>}
              {v.plateNumber && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{v.plateNumber}</span>}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Giriş: {formatDateTime(v.entryTime)}{v.exitTime && ` · Çıkış: ${formatDateTime(v.exitTime)}`}
            </div>
            {v.note && <div className="text-xs text-slate-500 mt-0.5">{v.note}</div>}
          </div>
        ))
      }
    </div>
  );
}
