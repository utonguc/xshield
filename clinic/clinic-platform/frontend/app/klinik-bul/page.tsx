"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { staticUrl } from "@/lib/api";

type Clinic = {
  slug: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  primaryColor: string;
  branches: string[];
  bookingEnabled: boolean;
  heroTitle?: string;
  aboutText?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AIResponse = {
  reply: string;
  clinics: Clinic[];
  filters: { city?: string; branch?: string; query?: string };
};

const WELCOME = `Merhaba! Ben xShield e-Clinic'in yapay zeka destekli klinik arama asistanıyım. 🏥

Size en uygun kliniği bulmak için buradayım. Bana şunları anlatabilirsiniz:

• **Sağlık şikayetiniz:** "Sırtımda ağrı var", "Dişim ağrıyor"…
• **İhtiyacınız:** "Çocuğum için pediatri kliniği arıyorum"
• **Doğrudan branş:** "İstanbul'da dermatoloji kliniği"

Nasıl yardımcı olabilirim?`;

export default function KlinikBulPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [clinics, setClinics]     = useState<Clinic[]>([]);
  const [filters, setFilters]     = useState<AIResponse["filters"]>({});
  const [searched, setSearched]   = useState(false);

  const chatEndRef  = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      // Sadece user/assistant mesajlarını API'ye gönder (welcome hariç)
      const apiMessages = next
        .slice(1) // welcome message'ı atla
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai-clinic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) throw new Error("API hatası");

      const data: AIResponse = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);

      if (data.clinics.length > 0 || Object.keys(data.filters).length > 0) {
        setClinics(data.clinics);
        setFilters(data.filters);
        setSearched(true);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const activeFilters = [filters.city, filters.branch, filters.query].filter(Boolean);

  return (
    <div style={{ fontFamily: "Inter, -apple-system, sans-serif", background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Top bar ── */}
      <div style={{
        background: "#0f172a", padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 900, fontSize: 18, color: "#fff" }}>
          <span style={{ color: "#60a5fa" }}>x</span>Shield{" "}
          <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>e-Clinic</span>
        </Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/klinikler" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none", fontWeight: 500 }}>
            Klasik Arama
          </Link>
          <Link href="/demo" style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Ücretsiz Dene
          </Link>
          <Link href="/login" style={{ padding: "8px 16px", borderRadius: 8, background: "#1d4ed8", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Giriş Yap
          </Link>
        </div>
      </div>

      {/* ── Hero başlık ── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        padding: "32px 24px 28px", textAlign: "center", flexShrink: 0,
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)", borderRadius: 999, padding: "4px 14px", marginBottom: 14 }}>
          <span style={{ fontSize: 14 }}>✨</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#93c5fd", letterSpacing: "0.5px" }}>YAPAY ZEKA DESTEKLİ</span>
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 900, color: "#fff" }}>
          Size özel klinik arama
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: "#94a3b8", maxWidth: 480, marginInline: "auto" }}>
          Semptomlarınızı veya ihtiyacınızı anlatın, yapay zeka en uygun klinikleri bulsun.
        </p>
      </div>

      {/* ── Ana içerik: Chat | Sonuçlar ── */}
      <div style={{
        flex: 1, display: "flex", maxWidth: 1280, width: "100%",
        marginInline: "auto", padding: "24px", gap: 24,
        alignItems: "flex-start",
        flexWrap: "wrap",
      }}>

        {/* ── Sol: Chat paneli ── */}
        <div style={{
          flex: "0 0 420px", minWidth: 320,
          background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0",
          display: "flex", flexDirection: "column",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          overflow: "hidden",
          maxHeight: "calc(100vh - 240px)",
          position: "sticky", top: 24,
        }}>

          {/* Chat header */}
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid #f1f5f9",
            display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
            }}>🤖</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Klinik Asistanı</div>
              <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>● Çevrimiçi</div>
            </div>
          </div>

          {/* Mesajlar */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m, i) => (
              <ChatBubble key={i} message={m} />
            ))}

            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>🤖</div>
                <div style={{
                  background: "#f1f5f9", borderRadius: "4px 16px 16px 16px",
                  padding: "10px 14px", display: "flex", gap: 4, alignItems: "center",
                }}>
                  <span style={{ animation: "bounce 1s infinite", animationDelay: "0ms", display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />
                  <span style={{ animation: "bounce 1s infinite", animationDelay: "150ms", display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />
                  <span style={{ animation: "bounce 1s infinite", animationDelay: "300ms", display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
                placeholder="Şikayetinizi veya ihtiyacınızı yazın… (Enter: gönder)"
                rows={2}
                style={{
                  flex: 1, resize: "none", borderRadius: 12, border: "1.5px solid #e2e8f0",
                  padding: "10px 14px", fontSize: 14, fontFamily: "inherit",
                  outline: "none", color: "#0f172a", lineHeight: 1.5,
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#1d4ed8"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                style={{
                  width: 42, height: 42, borderRadius: 12, border: "none",
                  background: !input.trim() || loading ? "#e2e8f0" : "#1d4ed8",
                  color: !input.trim() || loading ? "#94a3b8" : "#fff",
                  cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0, transition: "background 0.2s",
                }}
              >
                ↑
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, textAlign: "center" }}>
              Enter ile gönderin · Shift+Enter ile yeni satır
            </div>
          </div>
        </div>

        {/* ── Sağ: Sonuç paneli ── */}
        <div style={{ flex: 1, minWidth: 280 }}>

          {!searched ? (
            /* Boş durum */
            <div style={{
              background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0",
              padding: "64px 40px", textAlign: "center",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>🏥</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#0f172a", marginBottom: 10 }}>
                Klinikler burada görünecek
              </div>
              <p style={{ fontSize: 14, color: "#64748b", maxWidth: 320, marginInline: "auto", lineHeight: 1.6 }}>
                Asistana şikayetinizi veya ihtiyacınızı anlatın; size uygun klinikleri
                otomatik olarak listeleyecek.
              </p>
              <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10, maxWidth: 300, marginInline: "auto" }}>
                {[
                  "Sırtımda ağrı var, İstanbul'da bir klinik önerir misin?",
                  "Çocuğum için Ankara'da diş kliniği arıyorum",
                  "Cilt sorunlarım için hangi branşa gitmeliyim?",
                ].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setInput(ex)}
                    style={{
                      padding: "10px 14px", borderRadius: 12, border: "1.5px solid #e2e8f0",
                      background: "#f8fafc", color: "#344054", fontSize: 13,
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1d4ed8"; e.currentTarget.style.background = "#eff6ff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Sonuçlar */
            <div>
              {/* Filtre bilgisi */}
              {activeFilters.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap",
                }}>
                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Arama:</span>
                  {activeFilters.map((f) => (
                    <span key={f} style={{
                      fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                      background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe",
                    }}>{f}</span>
                  ))}
                  <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: "auto" }}>
                    {clinics.length} klinik bulundu
                  </span>
                </div>
              )}

              {clinics.length === 0 ? (
                <div style={{
                  background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0",
                  padding: "48px 32px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontWeight: 700, color: "#344054", marginBottom: 8 }}>Klinik bulunamadı</div>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Asistana farklı şehir veya branş deneyin.</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {clinics.map((c) => (
                    <ClinicCard key={c.slug} clinic={c} />
                  ))}
                </div>
              )}

              {/* Tüm klinikeleri gör linki */}
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <Link href={`/klinikler?${new URLSearchParams(
                  Object.fromEntries(
                    Object.entries(filters).filter(([, v]) => v)
                  ) as Record<string, string>
                )}`} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", borderRadius: 12,
                  border: "1.5px solid #e2e8f0", background: "#fff",
                  color: "#344054", fontSize: 13, fontWeight: 600,
                  textDecoration: "none", transition: "border-color 0.2s",
                }}>
                  Tüm sonuçları klasik görünümde gör →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: "1px solid #e2e8f0", padding: "20px 24px", textAlign: "center", fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>
        © {new Date().getFullYear()} xShield e-Clinic · AI yanıtları bilgilendirme amaçlıdır, tıbbi tavsiye niteliği taşımaz.
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

/* ── Chat Bubble ── */
function ChatBubble({ message: m }: { message: Message }) {
  const isUser = m.role === "user";
  return (
    <div style={{
      display: "flex", gap: 8,
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-start",
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
        }}>🤖</div>
      )}
      <div style={{
        maxWidth: "80%",
        background: isUser ? "#1d4ed8" : "#f1f5f9",
        color: isUser ? "#fff" : "#0f172a",
        borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
        padding: "10px 14px", fontSize: 14, lineHeight: 1.6,
        whiteSpace: "pre-wrap",
      }}>
        <MarkdownText text={m.content} isUser={isUser} />
      </div>
    </div>
  );
}

/* Basit bold/italic markdown renderer */
function MarkdownText({ text, isUser }: { text: string; isUser: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        // Bullet noktaları için • karakterini destekle
        return (
          <span key={i}>
            {part.split("\n").map((line, j, arr) => (
              <span key={j}>
                {line.startsWith("• ") ? (
                  <span style={{ display: "block", paddingLeft: 4 }}>
                    <span style={{ color: isUser ? "#93c5fd" : "#1d4ed8", marginRight: 6 }}>•</span>
                    {line.slice(2)}
                  </span>
                ) : line}
                {j < arr.length - 1 && <br />}
              </span>
            ))}
          </span>
        );
      })}
    </>
  );
}

/* ── Clinic Card ── */
function ClinicCard({ clinic: c }: { clinic: Clinic }) {
  const color = c.primaryColor || "#1d4ed8";
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: "1px solid #e2e8f0", overflow: "hidden",
      display: "flex", flexDirection: "column",
      transition: "box-shadow 0.2s, transform 0.2s",
    }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; el.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "none"; }}
    >
      <div style={{ height: 72, background: `linear-gradient(135deg, ${color}22, ${color}44)`, position: "relative", borderBottom: `3px solid ${color}` }}>
        <div style={{
          position: "absolute", bottom: -18, left: 16,
          width: 44, height: 44, borderRadius: 10,
          background: "#fff", border: `2px solid ${color}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 900, color, overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}>
          {c.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={staticUrl(c.logoUrl) ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : c.name.charAt(0)}
        </div>
      </div>

      <div style={{ padding: "26px 14px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{c.name}</div>

        {c.branches.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {c.branches.slice(0, 3).map((b) => (
              <span key={b} style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                background: `${color}15`, color, border: `1px solid ${color}30`,
              }}>{b}</span>
            ))}
            {c.branches.length > 3 && (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>+{c.branches.length - 3}</span>
            )}
          </div>
        )}

        {(c.city || c.address) && (
          <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 4 }}>
            <span>📍</span>
            <span>{[c.address, c.city].filter(Boolean).join(", ")}</span>
          </div>
        )}

        {c.aboutText && (
          <div style={{
            fontSize: 12, color: "#94a3b8", lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {c.aboutText}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <Link href={`/site/${c.slug}`} style={{
            flex: 1, padding: "9px", borderRadius: 10, textAlign: "center",
            background: "#f1f5f9", color: "#344054", fontWeight: 700, fontSize: 13,
            textDecoration: "none",
          }}>
            Kliniği Gör
          </Link>
          {c.bookingEnabled && (
            <Link href={`/site/${c.slug}/book`} style={{
              flex: 1, padding: "9px", borderRadius: 10, textAlign: "center",
              background: color, color: "#fff", fontWeight: 700, fontSize: 13,
              textDecoration: "none",
            }}>
              Randevu Al
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
