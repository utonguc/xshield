import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/auth";
import { displayPhone } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { removeMemberAction } from "./actions";
import { AddMemberForm, ResetPassword } from "./forms";

export default async function TeamPage() {
  const me = await requireMember(["owner"]);
  const members = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.tenantId, me.tenant.id))
    .orderBy(asc(memberships.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader title="Ekip" description="Personel ve kuryeleriniz kendi hesaplarıyla giriş yapar. Kuryeler telefondan /kurye ekranını kullanır." />
      <div className="card divide-y divide-stone-100">
        {members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-48 flex-1">
              <p className="font-medium">
                {m.name} {m.id === me.user.id && <span className="text-xs text-stone-500">(siz)</span>}
              </p>
              <p className="text-xs text-stone-500">{[m.email, displayPhone(m.phone)].filter(Boolean).join(" · ")}</p>
            </div>
            <span className="badge bg-stone-50 text-stone-700 ring-stone-200">{ROLE_LABELS[m.role]}</span>
            {m.role !== "owner" && (
              <div className="flex items-center gap-4">
                <ResetPassword userId={m.id} />
                <form action={removeMemberAction.bind(null, m.id)}>
                  <button className="text-xs font-medium text-red-700 hover:underline">Çıkar</button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
      <AddMemberForm />
    </div>
  );
}
