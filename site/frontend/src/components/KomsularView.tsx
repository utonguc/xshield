"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

type Contact = {
  userId: number; fullName: string; role: string; apartments: string[];
  unreadCount: number; lastMessage?: string; lastMessageAt?: string;
};
type Msg = {
  id: number; fromUserId: number; fromName: string; toUserId: number;
  content: string; isRead: boolean; isMine: boolean; createdAt: string;
};

const ROLE_LABELS: Record<string, string> = { SiteAdmin: "Yönetici", Manager: "Görevli", Resident: "Sakin" };
const ROLE_COLOR: Record<string, string> = {
  SiteAdmin: "bg-purple-100 text-purple-700", Manager: "bg-blue-100 text-blue-700", Resident: "bg-slate-100 text-slate-600"
};

export default function KomsularView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadContacts(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadContacts() {
    setLoading(true);
    try { setContacts(await api.get<Contact[]>("/messages/contacts")); }
    finally { setLoading(false); }
  }

  async function openConversation(c: Contact) {
    setActive(c);
    setConvLoading(true);
    try {
      const res = await api.get<{ otherName: string; messages: Msg[] }>(`/messages/conversation/${c.userId}`);
      setMessages(res.messages);
      // okundu işaretlendi → kontak listesindeki unread'i sıfırla
      setContacts(prev => prev.map(x => x.userId === c.userId ? { ...x, unreadCount: 0 } : x));
    } finally { setConvLoading(false); }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    setSending(true);
    try {
      const msg = await api.post<Msg>("/messages", { toUserId: active.userId, content: draft.trim() });
      setMessages(prev => [...prev, { ...msg, fromName: "Ben" }]);
      setDraft("");
      // kontak listesinde son mesajı güncelle
      setContacts(prev => prev.map(x => x.userId === active.userId
        ? { ...x, lastMessage: msg.content, lastMessageAt: msg.createdAt } : x));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Mesaj gönderilemedi.");
    } finally { setSending(false); }
  }

  const filtered = contacts.filter(c =>
    c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    c.apartments.some(a => a.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Komşular & Mesajlar</h1>
      <p className="text-sm text-slate-500 mb-5">Sitedeki komşularınızı görün, mesaj gönderin</p>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-3 h-[560px]">
        {/* Sol: kontak/rehber listesi */}
        <div className={`border-r border-slate-100 flex flex-col ${active ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b border-slate-100">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="İsim veya daire ara..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-slate-400 text-sm">Yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-slate-400 text-sm">Komşu bulunamadı.</div>
            ) : filtered.map(c => (
              <button key={c.userId} onClick={() => openConversation(c)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                  active?.userId === c.userId ? "bg-blue-50" : ""
                }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 flex-shrink-0">
                      {c.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{c.fullName}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {c.apartments.length > 0 ? c.apartments.join(", ") : ROLE_LABELS[c.role]}
                      </div>
                    </div>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                {c.lastMessage && (
                  <div className="text-xs text-slate-400 mt-1 truncate pl-10">{c.lastMessage}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sağ: konuşma */}
        <div className={`md:col-span-2 flex flex-col ${active ? "flex" : "hidden md:flex"}`}>
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Mesajlaşmak için bir komşu seçin
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <button onClick={() => setActive(null)} className="md:hidden text-slate-400">←</button>
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                  {active.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-sm">{active.fullName}</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${ROLE_COLOR[active.role]}`}>
                      {ROLE_LABELS[active.role]}
                    </span>
                    {active.apartments.length > 0 && (
                      <span className="text-xs text-slate-400">{active.apartments.join(", ")}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
                {convLoading ? (
                  <div className="text-slate-400 text-sm">Yükleniyor...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm py-10">
                    Henüz mesaj yok. İlk mesajı siz gönderin 👋
                  </div>
                ) : messages.map(m => (
                  <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      m.isMine ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-slate-200 rounded-bl-sm"
                    }`}>
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                      <div className={`text-[10px] mt-1 ${m.isMine ? "text-blue-200" : "text-slate-400"}`}>
                        {formatDateTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <form onSubmit={send} className="p-3 border-t border-slate-100 flex gap-2">
                <input value={draft} onChange={e => setDraft(e.target.value)}
                  placeholder="Mesaj yazın..."
                  className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" disabled={sending || !draft.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-full text-sm font-medium">
                  Gönder
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
