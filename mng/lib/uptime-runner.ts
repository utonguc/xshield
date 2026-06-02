import "server-only";
import { query } from "./db";
import net from "net";
import tls from "tls";
import { spawn } from "child_process";

function safeHost(t: string) {
  return t.replace(/[^a-zA-Z0-9.\-:_]/g, "");
}

async function checkIcmp(target: string): Promise<{ up: boolean; ms: number | null; detail?: string }> {
  const host = safeHost(target);
  if (!host) return { up: false, ms: null, detail: "Geçersiz hedef" };
  return new Promise((resolve) => {
    const start = Date.now();
    let done = false;
    const child = spawn("ping", ["-c", "1", "-W", "2", host]);
    const timer = setTimeout(() => {
      if (!done) { done = true; child.kill(); resolve({ up: false, ms: null, detail: "Zaman aşımı" }); }
    }, 4000);
    child.on("close", (code) => {
      if (!done) { done = true; clearTimeout(timer); resolve(code === 0 ? { up: true, ms: Date.now() - start } : { up: false, ms: null, detail: "Yanıt yok" }); }
    });
    child.on("error", () => {
      if (!done) { done = true; clearTimeout(timer); resolve({ up: false, ms: null, detail: "ping bulunamadı" }); }
    });
  });
}

async function checkTcp(target: string, port: number): Promise<{ up: boolean; ms: number | null; detail?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(4000);
    socket.connect(port, safeHost(target), () => { socket.destroy(); resolve({ up: true, ms: Date.now() - start }); });
    socket.on("timeout", () => { socket.destroy(); resolve({ up: false, ms: null, detail: "Zaman aşımı" }); });
    socket.on("error", (e) => resolve({ up: false, ms: null, detail: e.message.slice(0, 80) }));
  });
}

async function checkHttp(rawTarget: string): Promise<{ up: boolean; ms: number | null; detail?: string }> {
  const url = /^https?:\/\//.test(rawTarget) ? rawTarget : `http://${rawTarget}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  const start = Date.now();
  try {
    const resp = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    clearTimeout(timer);
    return { up: resp.status < 500, ms: Date.now() - start, detail: `HTTP ${resp.status}` };
  } catch (e: any) {
    clearTimeout(timer);
    return { up: false, ms: null, detail: (e.message ?? "").slice(0, 80) };
  }
}

async function checkHttps(rawTarget: string): Promise<{ up: boolean; ms: number | null; detail?: string }> {
  const url = /^https?:\/\//.test(rawTarget) ? rawTarget.replace(/^http:\/\//, "https://") : `https://${rawTarget}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  const start = Date.now();
  try {
    const resp = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    clearTimeout(timer);
    return { up: resp.status < 500, ms: Date.now() - start, detail: `HTTPS ${resp.status}` };
  } catch (e: any) {
    clearTimeout(timer);
    return { up: false, ms: null, detail: (e.message ?? "").slice(0, 80) };
  }
}

async function checkSsl(rawTarget: string): Promise<{ up: boolean; ms: number | null; detail?: string }> {
  const hostname = safeHost(rawTarget.replace(/^https?:\/\//, "").split("/")[0]);
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = tls.connect(443, hostname, { servername: hostname, rejectUnauthorized: false }, () => {
      try {
        const cert = socket.getPeerCertificate();
        const days = Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000);
        socket.destroy();
        if (days < 0) resolve({ up: false, ms: Date.now() - start, detail: "SSL süresi dolmuş" });
        else if (days < 14) resolve({ up: true, ms: Date.now() - start, detail: `SSL: ${days}g kaldı ⚠` });
        else resolve({ up: true, ms: Date.now() - start, detail: `SSL: ${days}g kaldı` });
      } catch { socket.destroy(); resolve({ up: false, ms: null, detail: "Sertifika okunamadı" }); }
    });
    socket.setTimeout(6000);
    socket.on("timeout", () => { socket.destroy(); resolve({ up: false, ms: null, detail: "Zaman aşımı" }); });
    socket.on("error", (e) => resolve({ up: false, ms: null, detail: e.message.slice(0, 80) }));
  });
}

export async function runUptimeChecks(): Promise<{ checked: number; results: unknown[] }> {
  const monitors = await query<{
    id: number; target: string; type: string; port: number | null;
    interval_seconds: number; last_checked_at: string | null;
  }>(
    `SELECT m.id, m.target, m.type, m.port, m.interval_seconds,
            MAX(c.checked_at)::text AS last_checked_at
     FROM uptime_monitors m
     LEFT JOIN uptime_checks c ON c.monitor_id = m.id
     WHERE m.enabled = true
     GROUP BY m.id`
  );

  const due = monitors.filter((m) => {
    if (!m.last_checked_at) return true;
    return Date.now() - new Date(m.last_checked_at).getTime() >= m.interval_seconds * 1000;
  });

  if (due.length === 0) return { checked: 0, results: [] };

  const results = await Promise.allSettled(
    due.map(async (m) => {
      let r: { up: boolean; ms: number | null; detail?: string };
      if      (m.type === "icmp")  r = await checkIcmp(m.target);
      else if (m.type === "tcp")   r = await checkTcp(m.target, m.port ?? 80);
      else if (m.type === "http")  r = await checkHttp(m.target);
      else if (m.type === "https") r = await checkHttps(m.target);
      else if (m.type === "ssl")   r = await checkSsl(m.target);
      else r = { up: false, ms: null, detail: "Bilinmeyen tür" };

      await query(
        `INSERT INTO uptime_checks (monitor_id, is_up, response_ms, detail) VALUES ($1,$2,$3,$4)`,
        [m.id, r.up, r.ms ?? null, r.detail ?? null]
      );
      return { id: m.id, ...r };
    })
  );

  return {
    checked: due.length,
    results: results.map((r, i) =>
      r.status === "fulfilled" ? r.value : { id: due[i].id, up: false, error: String((r as PromiseRejectedResult).reason) }
    ),
  };
}

// Background loop — called once from instrumentation.ts
let started = false;

export function startUptimeLoop() {
  if (started) return;
  started = true;

  const tick = async () => {
    try { await runUptimeChecks(); } catch { /* silent */ }
    setTimeout(tick, 5_000);
  };

  // Delay initial check to let DB connections settle
  setTimeout(tick, 5_000);
  console.log("[uptime] background check loop started (5s interval)");
}
