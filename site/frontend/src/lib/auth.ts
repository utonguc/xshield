export type AuthUser = {
  token: string;
  role: "SiteAdmin" | "Manager" | "Resident";
  siteId: number;
  userId: number;
  fullName: string;
};

export function saveAuth(data: AuthUser) {
  localStorage.setItem("site_token", data.token);
  localStorage.setItem("site_user", JSON.stringify(data));
}

export function getAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("site_user");
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem("site_token");
  localStorage.removeItem("site_user");
}

export function isManager(role: string) {
  return role === "SiteAdmin" || role === "Manager";
}
