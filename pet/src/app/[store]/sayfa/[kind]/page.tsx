import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { LEGAL_KINDS, legalPages, type LegalKind } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { LEGAL_LABELS } from "@/lib/labels";
import { getStoreBySlug } from "@/lib/tenant";

export async function generateMetadata({ params }: PageProps<"/[store]/sayfa/[kind]">): Promise<Metadata> {
  const { kind } = await params;
  return { title: LEGAL_LABELS[kind as LegalKind] ?? "Sayfa" };
}

export default async function LegalPage({ params }: PageProps<"/[store]/sayfa/[kind]">) {
  const { store: slug, kind } = await params;
  const store = await getStoreBySlug(slug);
  if (!store || !(LEGAL_KINDS as readonly string[]).includes(kind)) notFound();
  const [page] = await db
    .select()
    .from(legalPages)
    .where(and(eq(legalPages.tenantId, store.id), eq(legalPages.kind, kind as LegalKind)));
  if (!page) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">{LEGAL_LABELS[page.kind]}</h1>
      <p className="mt-1 text-xs text-stone-500">Son güncelleme: {formatDate(page.updatedAt)}</p>
      <div className="mt-6 rounded-2xl bg-white p-6 text-sm leading-relaxed whitespace-pre-line text-stone-800 ring-1 ring-stone-200">{page.body}</div>
    </main>
  );
}
