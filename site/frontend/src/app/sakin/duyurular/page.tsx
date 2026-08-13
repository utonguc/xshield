"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime, CATEGORY_LABELS } from "@/lib/utils";

type Announcement = { id: number; title: string; content: string; isPinned: boolean; category: string; createdAt: string };

export default function SakinDuyurularPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Announcement[]>("/announcements").then(setAnnouncements).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Duyurular</h1>
      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> :
        announcements.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">Duyuru yok.</div>
        ) : announcements.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start gap-2 mb-2">
              {a.isPinned && <span className="text-sm">📌</span>}
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-slate-400">{CATEGORY_LABELS[a.category] ?? a.category} · {formatDateTime(a.createdAt)}</div>
              </div>
            </div>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.content}</p>
          </div>
        ))
      }
    </div>
  );
}
