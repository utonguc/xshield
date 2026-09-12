import { Component, type ReactNode } from "react";

type Props = { fallback: ReactNode; children: ReactNode };
type State = { hasError: boolean };

/**
 * WebGL desteklemeyen bir tarayıcı, iframe'i engelleyen bir kurumsal ağ ya da
 * beklenmedik herhangi bir çalışma zamanı hatası olsa bile bu, sadece bu
 * sahneyi sessizce geri düşürür — sitenin geri kalanını çökertmez.
 */
export default class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) {
      console.warn("ThreeUI sahnesi yüklenemedi, geri dönüşe geçildi:", error);
    }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
