const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export function getPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("portal_token");
}

export function setPortalToken(token: string) {
  localStorage.setItem("portal_token", token);
}

export function clearPortalToken() {
  localStorage.removeItem("portal_token");
  localStorage.removeItem("portal_clinic_id");
}

export function getPortalClinicId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("portal_clinic_id");
}

export function setPortalClinicId(id: string) {
  localStorage.setItem("portal_clinic_id", id);
}

export async function portalFetch(path: string, opts?: RequestInit): Promise<Response> {
  const token = getPortalToken();
  return fetch(`${BASE}/api/portal${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}
