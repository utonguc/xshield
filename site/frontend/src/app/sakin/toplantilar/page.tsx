"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime, STATUS_LABELS } from "@/lib/utils";

type Meeting = { id: number; title: string; description?: string; agenda?: string; meetingDate: string; location?: string; status: string };

export default function SakinToplantılarPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Meeting[]>("/meetings").then(setMeetings).finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    Scheduled: "bg-blue-100 text-blue-700", Completed: "bg-green-100 text-green-700",
    Cancelled: "bg-red-100 text-red-700", Postponed: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Toplantılar</h1>
      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> :
        meetings.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">Toplantı yok.</div>
        ) : meetings.map(m => (
          <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-medium">{m.title}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor[m.status]}`}>
                {STATUS_LABELS[m.status] ?? m.status}
              </span>
            </div>
            <div className="text-xs text-slate-400 mb-2">
              📅 {formatDateTime(m.meetingDate)}{m.location && ` · 📍 ${m.location}`}
            </div>
            {m.description && <p className="text-sm text-slate-600">{m.description}</p>}
            {m.agenda && (
              <div className="mt-2 bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
                <strong className="block mb-1">Gündem</strong>
                <pre className="whitespace-pre-wrap font-sans">{m.agenda}</pre>
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}
