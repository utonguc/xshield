import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tenantDomains, tenants, type DomainStatus } from "@/db/schema";
import { requireMember } from "@/lib/auth";
import { cnameTarget, registrableDomain, relativeName, SSL_LABELS, txtName, txtValue } from "@/lib/domains";
import { formatDateTime } from "@/lib/format";
import { removeDomainAction } from "./actions";
import { AddDomainForm, CopyValue, VerifyButton } from "./forms";

const STATUS: Record<DomainStatus, { label: string; tone: string }> = {
  pending: { label: "DNS bekleniyor", tone: "bg-amber-50 text-amber-900 ring-amber-200" },
  verified: { label: "Doğrulandı", tone: "bg-sky-50 text-sky-900 ring-sky-200" },
  active: { label: "Yayında", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  error: { label: "Hata", tone: "bg-red-50 text-red-800 ring-red-200" },
};

export default async function DomainPage() {
  const me = await requireMember(["owner"]);
  const [[t], domains] = await Promise.all([
    db.select({ token: tenants.domainToken }).from(tenants).where(eq(tenants.id, me.tenant.id)),
    db.select().from(tenantDomains).where(eq(tenantDomains.tenantId, me.tenant.id)).orderBy(asc(tenantDomains.createdAt)),
  ]);
  const target = cnameTarget();

  return (
    <div className="space-y-6">
      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Kendi alan adınız</h2>
        <p className="text-sm text-stone-600">
          Mağazanız <strong>pet.xshield.com.tr/{me.tenant.slug}</strong> adresinde zaten yayında. Kendi alan adınızı (ör.{" "}
          <strong>www.patilerpetshop.com</strong>) bağlarsanız müşterileriniz mağazanızı doğrudan o adresten açar; platform adresi de çalışmaya devam eder.
        </p>
        <AddDomainForm disabled={domains.length >= 2} />
        <p className="hint">
          Önerimiz <strong>www.</strong> ile başlayan adresi bağlamanız. Kök adresi (alanadi.com) alan adı firmanızın panelinden “yönlendirme” ile www adresine
          yönlendirebilirsiniz.
        </p>
      </section>

      {domains.map((d) => {
        const st = STATUS[d.status];
        return (
          <section key={d.id} className="card overflow-hidden">
            <header className="flex flex-wrap items-center gap-3 border-b border-stone-100 px-5 py-4">
              <p className="font-mono font-semibold">{d.domain}</p>
              <span className={`badge ${st.tone}`}>{st.label}</span>
              {d.sslStatus && <span className="badge bg-stone-50 text-stone-700 ring-stone-200">{SSL_LABELS[d.sslStatus] ?? d.sslStatus}</span>}
              {(d.status === "verified" || d.status === "active") && (
                <a href={`https://${d.domain}`} target="_blank" rel="noopener" className="text-sm font-medium text-brand-700 hover:underline">
                  Aç ↗
                </a>
              )}
              <form action={removeDomainAction.bind(null, d.id)} className="ml-auto">
                <button className="text-xs font-medium text-red-700 hover:underline">Kaldır</button>
              </form>
            </header>
            <div className="space-y-4 p-5 text-sm">
              <p className="text-stone-600">
                Alan adınızı aldığınız firmanın (Natro, İsimtescil, GoDaddy, Cloudflare vb.) DNS yönetim ekranına şu iki kaydı ekleyin, ardından
                “Kontrol et”e basın:
              </p>
              <div className="overflow-x-auto rounded-xl ring-1 ring-stone-200">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Tür</th>
                      <th>Ad / Host</th>
                      <th>Değer</th>
                      <th>Amaç</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-mono">TXT</td>
                      <td>
                        <CopyValue value={txtName(d.domain)} />
                      </td>
                      <td>
                        <CopyValue value={txtValue(t.token ?? "")} />
                      </td>
                      <td className="text-stone-500">Alan adının size ait olduğunu doğrular</td>
                    </tr>
                    <tr>
                      <td className="font-mono">CNAME</td>
                      <td>
                        <CopyValue value={d.domain} />
                      </td>
                      <td>
                        <CopyValue value={target} />
                      </td>
                      <td className="text-stone-500">Ziyaretçileri mağazanıza yönlendirir</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="hint">
                Çoğu DNS paneli “Ad / Host” alanına yalnızca kısa adı ister: TXT için <code>{relativeName(txtName(d.domain), d.domain)}</code>, CNAME
                için <code>{relativeName(d.domain, d.domain)}</code>. Kök alan adına ({registrableDomain(d.domain)}) CNAME eklenemiyorsa www adresini
                bağlayın.
              </p>
              {d.lastError && <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200">Son kontrol: {d.lastError}</p>}
              <div className="flex flex-wrap items-start gap-4">
                <VerifyButton domainId={d.id} />
                {d.lastCheckedAt && <p className="pt-1.5 text-xs text-stone-500">Son kontrol {formatDateTime(d.lastCheckedAt)}</p>}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
