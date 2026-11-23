import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { TagsForm } from "@/components/tags-form";
import { requireMember } from "@/lib/auth";
import { getStoreCanonicalBase } from "@/lib/seo";
import { saveStoreTagsAction } from "./actions";

export default async function StoreSeoPage() {
  const me = await requireMember(["owner"]);
  const [[t], base] = await Promise.all([
    db.select({ ga: tenants.gaMeasurementId, gsc: tenants.gscVerification }).from(tenants).where(eq(tenants.id, me.tenant.id)),
    getStoreCanonicalBase(me.tenant.id, me.tenant.slug),
  ]);
  return (
    <div className="space-y-6">
      <section className="card space-y-2 p-5 text-sm">
        <h2 className="font-semibold">Mağazanız Google’da</h2>
        <p className="text-stone-600">
          Ürün sayfalarınız Google’a fiyat ve stok bilgisiyle tanıtılır; mağazanızın adresi, telefonu ve çalışma saatleri de arama sonuçlarında
          görünebilir. Bunun için Ayarlar’daki mağaza bilgilerini eksiksiz doldurun ve ürünlere açıklama ile fotoğraf ekleyin.
        </p>
        <dl className="grid gap-1 pt-2 sm:grid-cols-[10rem_1fr]">
          <dt className="text-stone-500">Mağaza adresi</dt>
          <dd className="font-mono break-all">{base}</dd>
          <dt className="text-stone-500">Site haritası</dt>
          <dd className="font-mono break-all">
            <a href={`${base}/sitemap.xml`} target="_blank" rel="noopener" className="text-brand-700 hover:underline">
              {base}/sitemap.xml
            </a>
          </dd>
        </dl>
      </section>
      <section className="card p-5">
        <h2 className="mb-1 font-semibold">Google Analytics ve Search Console</h2>
        <p className="mb-5 text-sm text-stone-600">İsteğe bağlı. Kendi Google hesaplarınızla mağazanızın ziyaretçilerini ve arama performansını izlersiniz.</p>
        <TagsForm action={saveStoreTagsAction} ga={t.ga} gsc={t.gsc} siteUrl={`${base}/`} />
      </section>
    </div>
  );
}
