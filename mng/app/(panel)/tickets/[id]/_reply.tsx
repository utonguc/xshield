"use client";
import { useState, useRef } from "react";

interface CannedResponse { id: number; title: string; body: string; }

export function ReplyBox({
  ticketId,
  authorName,
  postReply,
  cannedResponses = [],
}: {
  ticketId: number;
  authorName: string;
  postReply: (fd: FormData) => Promise<void>;
  cannedResponses?: CannedResponse[];
}) {
  const [mode, setMode] = useState<"reply" | "internal">("reply");
  const [body, setBody] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const isInternal = mode === "internal";

  const insertCanned = (cr: CannedResponse) => {
    const ta = taRef.current;
    if (!ta) return;

    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const pre = body.slice(0, start);
    const post = body.slice(end);

    // Insert at cursor; if nothing selected and text exists, add blank line separator
    const sep = pre.length > 0 && !pre.endsWith("\n\n") ? "\n\n" : "";
    const newBody = pre + sep + cr.body + post;
    setBody(newBody);

    // Restore focus + move cursor to end of inserted text
    setTimeout(() => {
      ta.focus();
      const pos = pre.length + sep.length + cr.body.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleModeChange = (next: "reply" | "internal") => {
    setMode(next);
    // Don't clear body when switching modes
  };

  return (
    <div className={`reply-box${isInternal ? " reply-internal" : ""}`}>
      <div className="reply-top">
        <div className="reply-tabs">
          <button
            type="button"
            className={`rtab${!isInternal ? " rtab-active" : ""}`}
            onClick={() => handleModeChange("reply")}
          >
            Yanıt Yaz
          </button>
          <button
            type="button"
            className={`rtab${isInternal ? " rtab-int-active" : ""}`}
            onClick={() => handleModeChange("internal")}
          >
            İç Not
          </button>
        </div>

        {cannedResponses.length > 0 && (
          <select
            className="canned-sel"
            value=""
            onChange={(e) => {
              const cr = cannedResponses.find((r) => r.id === Number(e.target.value));
              if (cr) insertCanned(cr);
            }}
          >
            <option value="">Hazır yanıt seç…</option>
            {cannedResponses.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        )}
      </div>

      <form action={postReply}>
        <input type="hidden" name="ticket_id" value={ticketId} />
        <input type="hidden" name="author_name" value={authorName} />
        {isInternal && <input type="hidden" name="is_internal" value="1" />}
        <textarea
          ref={taRef}
          name="body"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            isInternal
              ? "İç not yazın — müşteriye e-posta gönderilmez..."
              : "Yanıtınızı yazın..."
          }
          className={`reply-ta${isInternal ? " reply-ta-int" : ""}`}
          required
        />
        {isInternal && (
          <div className="int-warn">
            Bu mesaj yalnızca ekip üyeleri görecek — müşteriye gönderilmeyecek.
          </div>
        )}
        <div className="reply-footer">
          <span className="reply-as">{authorName} olarak gönderilecek</span>
          <button
            type="submit"
            className={`btn-send${isInternal ? " btn-send-int" : ""}`}
          >
            {isInternal ? "İç Not Ekle" : "Yanıt Gönder"}
          </button>
        </div>
      </form>
    </div>
  );
}
