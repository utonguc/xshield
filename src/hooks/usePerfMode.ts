import { useEffect, useState } from "react";

type NetworkInformation = { saveData?: boolean };

function computeReduceMotion(): boolean {
  if (typeof window === "undefined") return false;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // navigator.hardwareConcurrency, düşük/orta segment telefon ve eski dizüstülerde
  // genelde 4 veya altındadır; site VPS'te yayınlanıp bilinmeyen ziyaretçi
  // cihazlarında açılacağı için kaba ama güvenli bir "düşük donanım" sinyali.
  const lowCores =
    typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency <= 4
      : false;

  const connection = (navigator as unknown as { connection?: NetworkInformation }).connection;
  const saveData = connection?.saveData === true;

  return prefersReduced || lowCores || saveData;
}

/**
 * Ağır WebGL/canvas sahnelerini ne zaman tam performansta, ne zaman
 * sade bir CSS geri dönüşle göstereceğimize karar verir. Ekran genişliği
 * DEĞİL gerçek donanım/erişilebilirlik sinyalleri kullanılır — çünkü büyük
 * ekranlı ama zayıf bir cihaz da, küçük ekranlı güçlü bir telefon da olabilir.
 */
export function usePerfMode(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(computeReduceMotion());

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(computeReduceMotion());
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduceMotion;
}
