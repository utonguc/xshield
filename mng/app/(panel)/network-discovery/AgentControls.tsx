"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type LastCommand = {
  command: string;
  status: string;
  result: string | null;
  executed_at: string | null;
  created_at: string;
};

type Props = {
  agentId: number;
  lastCommand?: LastCommand;
};

const CMD_LABEL: Record<string, string> = {
  scan_now: "Ağ Taraması",
  sysinfo_now: "Bilgi Toplama",
  stop: "Durdur",
  update: "Güncelle",
  uninstall: "Kaldır",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "⏳ Kuyrukta",
  running: "⚙ Çalışıyor",
  done: "✓ Tamamlandı",
  error: "✗ Hata",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "cs-pending",
  running: "cs-running",
  done: "cs-done",
  error: "cs-error",
};

export function AgentControls({ agentId, lastCommand }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ text: string; err?: boolean } | null>(null);

  const send = async (command: string) => {
    setBusy(true);
    setFlash(null);
    try {
      const r = await fetch("/api/agent/commands/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, command }),
      });
      if (!r.ok) throw new Error();
      const msgs: Record<string, string> = {
        scan_now: "Tarama kuyruğa alındı (~30sn)",
        sysinfo_now: "Bilgi toplama kuyruğa alındı (~30sn)",
        stop: "Durdurma komutu gönderildi",
        update: "Güncelleme kuyruğa alındı (~30sn)",
        uninstall: "Kaldırma komutu gönderildi",
      };
      setFlash({ text: msgs[command] ?? "Komut gönderildi" });
    } catch {
      setFlash({ text: "Hata oluştu", err: true });
    } finally {
      setBusy(false);
    }
  };

  const handleUninstall = async () => {
    if (!confirm("Ajan bu makineden kaldırılacak ve panelden silinecek. Emin misiniz?")) return;
    setBusy(true);
    setFlash(null);
    try {
      // Send uninstall command to agent
      await fetch("/api/agent/commands/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, command: "uninstall" }),
      });
      // Delete from DB
      const r = await fetch("/api/agents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (!r.ok) throw new Error();
      router.refresh();
    } catch {
      setFlash({ text: "Silme hatası", err: true });
      setBusy(false);
    }
  };

  return (
    <div className="agent-controls">
      <div className="ctrl-btns">
        <button className="btn-ctrl" onClick={() => send("scan_now")} disabled={busy} title="Ağ taramasını hemen başlat">
          🔍 Hemen Tara
        </button>
        <button className="btn-ctrl" onClick={() => send("sysinfo_now")} disabled={busy} title="Yazılım/servis bilgisini güncelle">
          📊 Bilgi Topla
        </button>
        <button className="btn-ctrl" onClick={() => send("stop")} disabled={busy} title="Ajan servisini durdur">
          ⏹ Durdur
        </button>
        <button className="btn-ctrl-warn" onClick={() => send("update")} disabled={busy} title="Ajanı son sürüme güncelle ve yeniden başlat">
          🔄 Güncelle
        </button>
        <button className="btn-ctrl-danger" onClick={handleUninstall} disabled={busy} title="Ajanı makineden kaldır ve panelden sil">
          🗑 Sil
        </button>
      </div>

      {flash && (
        <div className={`ctrl-flash ${flash.err ? "ctrl-flash-err" : ""}`}>{flash.text}</div>
      )}

      {lastCommand && (
        <div className="last-cmd">
          <span className={`cmd-status ${STATUS_CLASS[lastCommand.status] ?? ""}`}>
            {STATUS_LABEL[lastCommand.status] ?? lastCommand.status}
          </span>
          <span className="cmd-name">{CMD_LABEL[lastCommand.command] ?? lastCommand.command}</span>
          <span className="cmd-time">
            {new Date(lastCommand.executed_at ?? lastCommand.created_at).toLocaleString("tr-TR")}
          </span>
          {lastCommand.result && <span className="cmd-result">{lastCommand.result}</span>}
        </div>
      )}
    </div>
  );
}
