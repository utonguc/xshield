import { Suspense, useRef, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import { useInView } from "framer-motion";
import { usePerfMode } from "../hooks/usePerfMode";
import SceneErrorBoundary from "./SceneErrorBoundary";

type SceneProps<P extends object> = {
  /** React.lazy(...) ile sarılmış ThreeUI bileşeni */
  component: LazyExoticComponent<ComponentType<P>>;
  props?: P;
  className?: string;
  /** Ekrana bu kadar yaklaşınca sahne yüklenir/canlanır (perf: aynı anda tek sahne çalışır) */
  margin?: `${number}px`;
  /**
   * Düşük donanım/erişilebilirlik tercihi, yükleme sırası ya da çalışma zamanı
   * hatası durumunda gösterilecek sade CSS arka plan. Sahne olmadan da bölüm
   * anlamlı ve markaya uygun görünmeli.
   */
  fallback: ReactNode;
};

/**
 * Ağır WebGL/canvas sahnelerini görünürlüğe göre monte/demonte eden,
 * düşük performanslı cihazlarda ve hata durumunda sade bir CSS arka plana
 * geri dönen ortak sarmalayıcı.
 */
export default function Scene<P extends object>({
  component: LazyComponent,
  props,
  className = "absolute inset-0 z-0",
  margin = "400px",
  fallback,
}: SceneProps<P>) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: `${margin} 0px ${margin} 0px` as any });
  const reduceMotion = usePerfMode();

  return (
    <div ref={ref} className={className}>
      {reduceMotion || !isInView ? (
        fallback
      ) : (
        <SceneErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <LazyComponent {...(props as P)} />
          </Suspense>
        </SceneErrorBoundary>
      )}
    </div>
  );
}
