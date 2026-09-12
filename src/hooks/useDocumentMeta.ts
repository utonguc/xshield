import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Sayfaya özel <title> ve meta description ayarlar, aynı anda GA4'e doğru
 * page_title/page_path ile bir pageview gönderir.
 *
 * Analitik burada, title ayarlamayla AYNI effect içinde tetiklenir —
 * react-router + AnimatePresence (mode="wait") ile sayfa geçişinde yeni
 * sayfa ancak eski sayfanın çıkış animasyonu bittikten sonra mount olur;
 * pageview'ı App seviyesinde location.pathname'e bağlarsanız title henüz
 * güncellenmeden (bir önceki sayfanınkiyle) gönderilir. Burada, tam da
 * doğru title yazıldığı anda gönderilerek bu yarış durumu önlenir.
 * (Prerender script'i bu effect'in commit ETTİĞİ hâli yakaladığı için
 * doğru title/description statik HTML'e de yansır.)
 */
export function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    let meta = document.querySelector('meta[name="description"]');
    const prevDescription = meta?.getAttribute("content") ?? "";
    if (meta) meta.setAttribute("content", description);

    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: window.location.pathname,
        page_title: title,
        page_location: window.location.href,
      });
    }

    return () => {
      document.title = prevTitle;
      if (meta) meta.setAttribute("content", prevDescription);
    };
  }, [title, description]);
}
