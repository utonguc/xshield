"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

/*
 * Google Analytics (GA4) + çerez onayı.
 * KVKK gereği analitik çerezler ziyaretçi onay verene kadar KAPALI başlar (Google consent
 * mode: analytics_storage = denied). Kabul edilirse açılır; karar tarayıcıda hatırlanır.
 * Etiket yoksa (gaIds boş) hiçbir şey yüklenmez, onay çubuğu da çıkmaz.
 */

const CONSENT_KEY = "pet-cerez-onayi";
type Consent = "granted" | "denied";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function Analytics({ gaIds, privacyHref }: { gaIds: string[]; privacyHref?: string | null }) {
  const ids = [...new Set(gaIds.filter(Boolean))];
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Tercih yalnızca tarayıcıda bilinir; sunucu render'ında çubuk gösterilmez.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(readConsent());
    setReady(true);
  }, []);

  if (ids.length === 0) return null;

  function decide(v: Consent) {
    try {
      localStorage.setItem(CONSENT_KEY, v);
    } catch {
      // gizli sekme: karar bu sayfa için geçerli
    }
    window.gtag?.("consent", "update", { analytics_storage: v });
    setConsent(v);
  }

  const bootstrap = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
var c = null; try { c = localStorage.getItem(${JSON.stringify(CONSENT_KEY)}); } catch (e) {}
gtag('consent', 'default', { analytics_storage: c === 'granted' ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
gtag('js', new Date());
${ids.map((id) => `gtag('config', ${JSON.stringify(id)}, { anonymize_ip: true });`).join("\n")}
`;

  return (
    <>
      <Script id="ga-bootstrap" strategy="afterInteractive">
        {bootstrap}
      </Script>
      <Script id="ga-lib" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids[0])}`} strategy="afterInteractive" />
      {ready && consent === null && (
        <div
          role="dialog"
          aria-label="Çerez tercihi"
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-xl bg-stone-900 p-4 text-sm text-stone-100 shadow-2xl sm:inset-x-6"
        >
          <p className="min-w-56 flex-1 leading-snug">
            Sitenin nasıl kullanıldığını anlamak için analitik çerezler kullanmak istiyoruz. Onay vermezseniz kullanılmaz.
            {privacyHref && (
              <>
                {" "}
                <a href={privacyHref} className="underline">
                  Ayrıntılar
                </a>
              </>
            )}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => decide("denied")} className="rounded-lg px-3 py-2 font-medium ring-1 ring-stone-500 hover:bg-stone-800">
              Reddet
            </button>
            <button type="button" onClick={() => decide("granted")} className="rounded-lg bg-white px-3 py-2 font-semibold text-stone-900 hover:bg-stone-200">
              Kabul et
            </button>
          </div>
        </div>
      )}
    </>
  );
}
