import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import Sidebar from "@/components/Sidebar";
import { ToastRenderer } from "@/components/Toast";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const row = await queryOne<{ count: string }>(
    "SELECT COUNT(*) AS count FROM tickets WHERE status NOT IN ('resolved','closed')"
  );
  const openTickets = Number(row?.count ?? 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar user={user} openTickets={openTickets} />
      <main style={{ marginLeft: 240, flex: 1, minHeight: "100vh", background: "var(--bg)" }}>
        {children}
      </main>
      <ToastRenderer />
    </div>
  );
}
