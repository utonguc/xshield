import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { requireMember } from "@/lib/auth";
import { getStoreUrl } from "@/lib/tenant";
import { PanelNav } from "./panel-nav";
import { NewOrderWatcher } from "./new-order-watcher";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMember();
  const storeUrl = await getStoreUrl(me.tenant.id, me.tenant.slug);
  const [{ n: newOrders }] = await db
    .select({ n: count() })
    .from(orders)
    .where(and(eq(orders.tenantId, me.tenant.id), eq(orders.status, "new")));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 z-30 border-b border-stone-200 bg-white lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:py-5">
          <Logo href="/panel" />
          <div className="min-w-0 text-right lg:mt-4 lg:text-left">
            <p className="truncate text-sm font-semibold">{me.tenant.name}</p>
            <Link href={storeUrl.href} target="_blank" className="text-xs font-medium text-brand-700 hover:underline">
              Mağazayı görüntüle ↗
            </Link>
          </div>
        </div>
        <PanelNav role={me.role} newOrders={newOrders} />
        <div className="hidden px-5 pt-4 lg:absolute lg:bottom-5 lg:block">
          <p className="truncate text-xs text-stone-500">{me.user.name}</p>
          <form action={logoutAction}>
            <button className="mt-1 text-xs font-semibold text-stone-700 hover:text-red-700">Çıkış yap</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        {me.tenant.status === "suspended" && (
          <div className="bg-red-600 px-4 py-2 text-center text-sm font-medium text-white">
            Mağazanız geçici olarak askıya alındı; vitrin ziyaretçilere kapalı. Destek için bizimle iletişime geçin.
          </div>
        )}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
        <form action={logoutAction} className="px-4 pb-8 text-center lg:hidden">
          <button className="text-sm font-semibold text-stone-600">Çıkış yap ({me.user.name})</button>
        </form>
      </div>
      <NewOrderWatcher initial={newOrders} />
    </div>
  );
}
