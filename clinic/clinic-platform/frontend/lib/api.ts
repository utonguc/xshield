export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

/** Uploads klasöründeki bir dosyayı tam URL'e çevirir.
 *  /uploads/doctors/foto.jpg → http://host/uploads/doctors/foto.jpg
 *  Hem nginx (port 80) hem doğrudan backend (port 8080) üzerinden çalışır. */
export function staticUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${API_BASE_URL.replace("/api", "")}${path}`;
}

export function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("accessToken") ?? "";
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();

  const headers: Record<string, string> = {};

  // Mevcut header'ları kopyala
  if (options.headers) {
    const existing = options.headers as Record<string, string>;
    Object.keys(existing).forEach(k => { headers[k] = existing[k]; });
  }

  // FormData değilse JSON header ekle
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // 401 gelirse token sil ve login'e yönlendir
  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }

  return response;
}
