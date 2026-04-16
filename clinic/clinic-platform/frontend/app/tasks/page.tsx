"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { fmtDateShort } from "@/lib/tz";

// ── Types ─────────────────────────────────────────────────────────────────────
type Task = {
  id: string; title: string; description?: string;
  status: string; priority: string;
  assignedToId?: string; assignedToName?: string;
  createdByName?: string;
  dueAtUtc?: string; createdAtUtc: string;
  isOverdue: boolean;
};
type User = { id: string; fullName: string; userName: string };

// ── Constants ─────────────────────────────────────────────────────────────────
const COLUMNS = [
  { status: "Todo",       label: "Yapılacak",    color: "#667085", bg: "#f2f4f7", border: "#e4e7ec" },
  { status: "InProgress", label: "Devam Ediyor", color: "#1d4ed8", bg: "#eff8ff", border: "#b2ddff" },
  { status: "Done",       label: "Tamamlandı",   color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
];

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  High:   { label: "Yüksek", color: "#b42318", bg: "#fef3f2" },
  Medium: { label: "Orta",   color: "#d97706", bg: "#fffbeb" },
  Low:    { label: "Düşük",  color: "#667085", bg: "#f2f4f7" },
};

const card: React.CSSProperties = {
  background: "var(--surface, #fff)", border: "1px solid #eaecf0",
  borderRadius: 16, padding: 20,
  boxShadow: "0 1px 4px rgba(16,24,40,0.06)",
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editTask,   setEditTask]   = useState<Task | null>(null);
  const [dragOver,   setDragOver]   = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/Tasks");
      if (res.ok) setTasks(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    apiFetch("/Users").then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setUsers(d);
    });
  }, [load]);

  const deleteTask = async (id: string) => {
    if (!confirm("Görevi silmek istediğinize emin misiniz?")) return;
    await apiFetch(`/Tasks/${id}`, { method: "DELETE" });
    load();
  };

  // Drag & drop
  const onDragStart = (id: string) => setDraggingId(id);
  const onDragEnd   = () => { setDraggingId(null); setDragOver(null); };
  const onDrop = async (status: string) => {
    if (!draggingId) return;
    setDragOver(null);
    const task = tasks.find(t => t.id === draggingId);
    if (!task || task.status === status) return;
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === draggingId ? { ...t, status } : t));
    await apiFetch(`/Tasks/${draggingId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  };

  const byStatus = (status: string) => tasks.filter(t => t.status === status);

  return (
    <AppShell title="Görev Yönetimi" description="Ekip görevleri ve iş takibi">

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "center" }}>
        <button onClick={() => { setEditTask(null); setShowForm(true); }} style={{
          padding: "9px 18px", borderRadius: 10, border: "none",
          background: "#1d4ed8", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>+ Yeni Görev</button>
        <span style={{ fontSize: 13, color: "#667085" }}>
          {tasks.length} görev · {tasks.filter(t => t.isOverdue).length} gecikmiş
        </span>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div style={{ color: "#98a2b3", padding: 32, textAlign: "center" }}>Yükleniyor...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, alignItems: "start" }}>
          {COLUMNS.map(col => (
            <div key={col.status}
              onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => onDrop(col.status)}
              style={{
                background: dragOver === col.status ? col.bg : "#f8fafc",
                border: `2px dashed ${dragOver === col.status ? col.border : "#e4e7ec"}`,
                borderRadius: 16, padding: 16, minHeight: 200,
                transition: "all 0.15s",
              }}>

              {/* Column header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text, #101828)" }}>{col.label}</span>
                <span style={{
                  marginLeft: "auto", fontSize: 12, fontWeight: 700,
                  background: col.bg, color: col.color,
                  border: `1px solid ${col.border}`,
                  padding: "1px 8px", borderRadius: 999,
                }}>{byStatus(col.status).length}</span>
              </div>

              {/* Cards */}
              <div style={{ display: "grid", gap: 10 }}>
                {byStatus(col.status).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => { setEditTask(task); setShowForm(true); }}
                    onDelete={() => deleteTask(task.id)}
                    onDragStart={() => onDragStart(task.id)}
                    onDragEnd={onDragEnd}
                    isDragging={draggingId === task.id}
                  />
                ))}
                {byStatus(col.status).length === 0 && (
                  <div style={{ color: "#d0d5dd", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                    Buraya sürükleyin
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <TaskForm
          task={editTask}
          users={users}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </AppShell>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onEdit, onDelete, onDragStart, onDragEnd, isDragging }: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const pm   = PRIORITY_META[task.priority] ?? PRIORITY_META.Medium;
  const dueStr = task.dueAtUtc ? fmtDateShort(task.dueAtUtc) : null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        ...card, padding: 14, cursor: "grab",
        opacity: isDragging ? 0.5 : 1,
        borderLeft: `3px solid ${pm.color}`,
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(16,24,40,0.1)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(16,24,40,0.06)")}
    >
      {/* Title + priority */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, fontWeight: 600, fontSize: 13, color: "var(--text, #101828)", lineHeight: 1.4 }}>
          {task.title}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: pm.bg, color: pm.color, flexShrink: 0 }}>
          {pm.label}
        </span>
      </div>

      {task.description && (
        <div style={{ fontSize: 12, color: "#667085", marginBottom: 10, lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {task.description}
        </div>
      )}

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {task.assignedToName && (
          <span style={{ fontSize: 11, color: "#667085", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#e4e7ec", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>
              {task.assignedToName.charAt(0).toUpperCase()}
            </span>
            {task.assignedToName.split(" ")[0]}
          </span>
        )}

        {dueStr && (
          <span style={{ fontSize: 11, color: task.isOverdue ? "#b42318" : "#667085",
            background: task.isOverdue ? "#fef3f2" : "#f8fafc",
            padding: "2px 7px", borderRadius: 999, fontWeight: task.isOverdue ? 700 : 400 }}>
            {task.isOverdue ? "⚠ " : "◷ "}{dueStr}
          </span>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#667085", fontSize: 13, padding: "2px 4px", borderRadius: 4 }} title="Düzenle">✎</button>
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "#b42318", fontSize: 13, padding: "2px 4px", borderRadius: 4 }} title="Sil">✕</button>
        </div>
      </div>
    </div>
  );
}

// ── Task Form ─────────────────────────────────────────────────────────────────
function TaskForm({ task, users, onClose, onSaved }: {
  task: Task | null;
  users: User[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = task !== null;
  const [title,       setTitle]       = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status,      setStatus]      = useState(task?.status ?? "Todo");
  const [priority,    setPriority]    = useState(task?.priority ?? "Medium");
  const [assignedTo,  setAssignedTo]  = useState(task?.assignedToId ?? "");
  const [dueAt,       setDueAt]       = useState(task?.dueAtUtc?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1.5px solid #e4e7ec", fontSize: 13, boxSizing: "border-box",
  };

  const save = async () => {
    if (!title.trim()) { setError("Görev başlığı zorunlu."); return; }
    setSaving(true); setError("");

    const body = {
      title: title.trim(), description: description.trim() || null,
      status, priority,
      assignedToId: assignedTo || null,
      dueAtUtc: dueAt ? new Date(dueAt).toISOString() : null,
    };

    try {
      const res = await apiFetch(
        isEdit ? `/Tasks/${task!.id}` : "/Tasks",
        { method: isEdit ? "PUT" : "POST", body: JSON.stringify(body) }
      );
      if (!res.ok) { const d = await res.json(); setError(d.message ?? "Hata oluştu."); return; }
      onSaved();
    } catch { setError("Sunucuya ulaşılamadı."); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--surface, #fff)", borderRadius: 20, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{isEdit ? "Görevi Düzenle" : "Yeni Görev"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#667085" }}>×</button>
        </div>

        <div style={{ padding: 24, display: "grid", gap: 16 }}>
          {/* Başlık */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Başlık *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Görev başlığı..." style={inputStyle} autoFocus />
          </div>

          {/* Açıklama */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Açıklama</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Opsiyonel detay..." style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {/* Öncelik & Durum */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Öncelik</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
                <option value="Low">Düşük</option>
                <option value="Medium">Orta</option>
                <option value="High">Yüksek</option>
              </select>
            </div>
            {isEdit && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Durum</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                  <option value="Todo">Yapılacak</option>
                  <option value="InProgress">Devam Ediyor</option>
                  <option value="Done">Tamamlandı</option>
                </select>
              </div>
            )}
          </div>

          {/* Atanan & Vade */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Atanan Kişi</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={inputStyle}>
                <option value="">Seçim yok</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Son Tarih</label>
              <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef3f2", color: "#b42318", fontSize: 13, border: "1px solid #fecdca" }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #d0d5dd", background: "var(--surface, #fff)", color: "var(--text-2, #344054)", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
              İptal
            </button>
            <button onClick={save} disabled={saving} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: saving ? "#93c5fd" : "#1d4ed8", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 13 }}>
              {saving ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Oluştur"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
