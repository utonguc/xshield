"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type Permit = {
  id: number; plateNumber: string; ownerName?: string; apartmentLabel?: string;
  vehicleInfo?: string; permitType: string; validUntil?: string; isActive: boolean; expired: boolean; note?: string;
};
const TYPE_LABELS: Record<string, string> = { Resident: "Sakin", Guest: "Misafir", Temporary: "Geçici", Other: "Diğer" };

export default function SakinOtoparkPage() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Permit[]>("/parking/my").then(setPermits).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Otopark İzinli Plakalarım</h1>
        <p className="text-sm text-slate-500 mt-0.5">Dairenize tanımlı, otopark giriş izni olan araçlar</p>
      </div>

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> :
        permits.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
            Dairenize tanımlı plaka yok. Eklenmesi için site yönetimiyle iletişime geçin.
          </div>
        ) : permits.map(p => (
          <div key={p.id} className={`bg-white rounded-xl border border-slate-200 p-4 ${!p.isActive || p.expired ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-base tracking-wide">{p.plateNumber}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{TYPE_LABELS[p.permitType] ?? p.permitType}</span>
              {!p.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Pasif</span>}
              {p.expired && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Süresi Doldu</span>}
            </div>
            {(p.ownerName || p.vehicleInfo) && (
              <div className="text-xs text-slate-400 mt-0.5">{p.ownerName}{p.ownerName && p.vehicleInfo && " · "}{p.vehicleInfo}</div>
            )}
            {p.validUntil && <div className="text-xs text-slate-400">Geçerlilik: {formatDate(p.validUntil)}</div>}
          </div>
        ))
      }
    </div>
  );
}
