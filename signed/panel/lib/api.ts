/**
 * Server-side API client — all calls go to signature-core.
 * The API_URL is server-only (no NEXT_PUBLIC_), keeping credentials off the browser.
 */

const API_URL = process.env.API_URL ?? "http://api:5000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function apiFetch<T>(
  path: string,
  token: string | null,
  init: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const loginApi = (email: string, password: string) =>
  apiFetch<{ token: string; role: string; email: string }>(
    "/v1/admin/auth/login",
    null,
    { method: "POST", body: JSON.stringify({ email, password }) }
  );

// ── Tenants ───────────────────────────────────────────────────────────────────

export const getTenants = (token: string) =>
  apiFetch<import("./types").Tenant[]>("/v1/admin/tenants", token);

export const getTenant = (token: string, id: string) =>
  apiFetch<import("./types").Tenant>(`/v1/admin/tenants/${id}`, token);

export const createTenant = (token: string, body: { name: string; slug: string }) =>
  apiFetch<import("./types").Tenant>("/v1/admin/tenants", token, {
    method: "POST", body: JSON.stringify(body),
  });

export const updateTenant = (token: string, id: string, body: object) =>
  apiFetch<import("./types").Tenant>(`/v1/admin/tenants/${id}`, token, {
    method: "PUT", body: JSON.stringify(body),
  });

export const deleteTenant = (token: string, id: string) =>
  fetch(`${API_URL}/v1/admin/tenants/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

// ── Domains ───────────────────────────────────────────────────────────────────

export const getDomains = (token: string, tenantId: string) =>
  apiFetch<import("./types").Domain[]>(`/v1/admin/tenants/${tenantId}/domains`, token);

export const addDomain = (token: string, tenantId: string, domain: string) =>
  apiFetch<import("./types").Domain>(`/v1/admin/tenants/${tenantId}/domains`, token, {
    method: "POST", body: JSON.stringify({ domain }),
  });

export const deleteDomain = (token: string, tenantId: string, domainId: string) =>
  fetch(`${API_URL}/v1/admin/tenants/${tenantId}/domains/${domainId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

// ── Templates ─────────────────────────────────────────────────────────────────

export const getTemplates = (token: string, tenantId: string) =>
  apiFetch<import("./types").Template[]>(`/v1/admin/tenants/${tenantId}/templates`, token);

export const getTemplate = (token: string, tenantId: string, templateId: string) =>
  apiFetch<import("./types").Template>(
    `/v1/admin/tenants/${tenantId}/templates/${templateId}`, token
  );

export const createTemplate = (token: string, tenantId: string, body: object) =>
  apiFetch<import("./types").Template>(`/v1/admin/tenants/${tenantId}/templates`, token, {
    method: "POST", body: JSON.stringify(body),
  });

export const updateTemplate = (
  token: string, tenantId: string, templateId: string, body: object
) =>
  apiFetch<import("./types").Template>(
    `/v1/admin/tenants/${tenantId}/templates/${templateId}`, token,
    { method: "PUT", body: JSON.stringify(body) }
  );

export const deleteTemplate = (token: string, tenantId: string, templateId: string) =>
  fetch(`${API_URL}/v1/admin/tenants/${tenantId}/templates/${templateId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

export const previewTemplate = (
  token: string,
  tenantId: string,
  html_content: string,
  user_data?: object
) =>
  apiFetch<{ html: string }>(`/v1/admin/tenants/${tenantId}/templates/preview`, token, {
    method: "POST",
    body: JSON.stringify({ html_content, user_data }),
  });

// ── Rules ─────────────────────────────────────────────────────────────────────

export const getRules = (token: string, tenantId: string) =>
  apiFetch<import("./types").Rule[]>(`/v1/admin/tenants/${tenantId}/rules`, token);

export const createRule = (token: string, tenantId: string, body: object) =>
  apiFetch<import("./types").Rule>(`/v1/admin/tenants/${tenantId}/rules`, token, {
    method: "POST", body: JSON.stringify(body),
  });

export const updateRule = (
  token: string, tenantId: string, ruleId: string, body: object
) =>
  apiFetch<import("./types").Rule>(
    `/v1/admin/tenants/${tenantId}/rules/${ruleId}`, token,
    { method: "PUT", body: JSON.stringify(body) }
  );

export const deleteRule = (token: string, tenantId: string, ruleId: string) =>
  fetch(`${API_URL}/v1/admin/tenants/${tenantId}/rules/${ruleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

// ── Users ─────────────────────────────────────────────────────────────────────

export const getUsers = (token: string, tenantId: string) =>
  apiFetch<import("./types").User[]>(`/v1/admin/tenants/${tenantId}/users`, token);

export const createUser = (token: string, tenantId: string, body: object) =>
  apiFetch<import("./types").User>(`/v1/admin/tenants/${tenantId}/users`, token, {
    method: "POST", body: JSON.stringify(body),
  });

export const updateUser = (
  token: string, tenantId: string, userId: string, body: object
) =>
  apiFetch<import("./types").User>(
    `/v1/admin/tenants/${tenantId}/users/${userId}`, token,
    { method: "PUT", body: JSON.stringify(body) }
  );

export const deleteUser = (token: string, tenantId: string, userId: string) =>
  fetch(`${API_URL}/v1/admin/tenants/${tenantId}/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

export const sendMagicLink = (token: string, tenantId: string, userId: string) =>
  apiFetch<{ magic_link: string }>(
    `/v1/admin/tenants/${tenantId}/users/${userId}/magic-link`, token,
    { method: "POST" }
  );

// ── Disclaimers ───────────────────────────────────────────────────────────────

export const getDisclaimers = (token: string, tenantId: string) =>
  apiFetch<import("./types").Disclaimer[]>(
    `/v1/admin/tenants/${tenantId}/disclaimers`, token
  );

export const createDisclaimer = (token: string, tenantId: string, body: object) =>
  apiFetch<import("./types").Disclaimer>(
    `/v1/admin/tenants/${tenantId}/disclaimers`, token,
    { method: "POST", body: JSON.stringify(body) }
  );

export const updateDisclaimer = (
  token: string, tenantId: string, disclaimerId: string, body: object
) =>
  apiFetch<import("./types").Disclaimer>(
    `/v1/admin/tenants/${tenantId}/disclaimers/${disclaimerId}`, token,
    { method: "PUT", body: JSON.stringify(body) }
  );

export const deleteDisclaimer = (token: string, tenantId: string, disclaimerId: string) =>
  fetch(`${API_URL}/v1/admin/tenants/${tenantId}/disclaimers/${disclaimerId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

// ── Banners ───────────────────────────────────────────────────────────────────

export const getBanners = (token: string, tenantId: string) =>
  apiFetch<import("./types").Banner[]>(`/v1/admin/tenants/${tenantId}/banners`, token);

export const createBanner = (token: string, tenantId: string, body: object) =>
  apiFetch<import("./types").Banner>(`/v1/admin/tenants/${tenantId}/banners`, token, {
    method: "POST", body: JSON.stringify(body),
  });

export const updateBanner = (token: string, tenantId: string, bannerId: string, body: object) =>
  apiFetch<import("./types").Banner>(
    `/v1/admin/tenants/${tenantId}/banners/${bannerId}`, token,
    { method: "PUT", body: JSON.stringify(body) }
  );

export const deleteBanner = (token: string, tenantId: string, bannerId: string) =>
  fetch(`${API_URL}/v1/admin/tenants/${tenantId}/banners/${bannerId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

// ── Subscription ──────────────────────────────────────────────────────────────

export const getSubscription = (token: string, tenantId: string) =>
  apiFetch<import("./types").Subscription>(
    `/v1/admin/tenants/${tenantId}/subscription`, token
  );

export const updateSubscription = (token: string, tenantId: string, body: object) =>
  apiFetch<import("./types").Subscription>(
    `/v1/admin/tenants/${tenantId}/subscription`, token,
    { method: "PUT", body: JSON.stringify(body) }
  );

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getAnalytics = (token: string, tenantId: string, days = 30) =>
  apiFetch<import("./types").Analytics>(
    `/v1/admin/tenants/${tenantId}/analytics?days=${days}`, token
  );

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboardStats = (token: string) =>
  apiFetch<import("./types").DashboardStats>("/v1/admin/dashboard/stats", token);

// ── CSV user import ───────────────────────────────────────────────────────────

export const importUsersCSV = (token: string, tenantId: string, rows: object[]) =>
  apiFetch<{ created: number; updated: number; errors: string[] }>(
    `/v1/admin/tenants/${tenantId}/users/import`, token,
    { method: "POST", body: JSON.stringify({ rows }) }
  );

// ── Azure AD integration ───────────────────────────────────────────────────────

export interface AzureConfig {
  azure_tenant_id:        string | null;
  azure_client_id:        string | null;
  azure_secret_set:       boolean;
  azure_sync_enabled:     boolean;
  azure_last_sync_at:     string | null;
  azure_last_sync_created: number;
  azure_last_sync_updated: number;
}

export const getAzureConfig = (token: string, tenantId: string) =>
  apiFetch<AzureConfig>(`/v1/admin/tenants/${tenantId}/integrations/azure`, token);

export const saveAzureConfig = (token: string, tenantId: string, body: object) =>
  apiFetch<AzureConfig>(`/v1/admin/tenants/${tenantId}/integrations/azure`, token, {
    method: "PUT", body: JSON.stringify(body),
  });

export const syncAzureUsers = (token: string, tenantId: string) =>
  apiFetch<{ created: number; updated: number; errors: string[]; synced_at: string }>(
    `/v1/admin/tenants/${tenantId}/integrations/azure/sync`, token,
    { method: "POST" }
  );

export const testAzureConnection = (token: string, tenantId: string) =>
  apiFetch<{ status: string; user_count: number }>(
    `/v1/admin/tenants/${tenantId}/integrations/azure/test`, token,
    { method: "POST" }
  );

// ── Google Workspace integration ───────────────────────────────────────────────

export interface GoogleWorkspaceStatus {
  connected:          boolean;
  admin_email:        string | null;
  last_sync_at:       string | null;
  last_sync_created:  number;
  last_sync_updated:  number;
}

export const getGoogleWorkspaceStatus = (token: string, tenantId: string) =>
  apiFetch<GoogleWorkspaceStatus>(
    `/v1/admin/tenants/${tenantId}/integrations/google`, token
  );

export const syncGoogleWorkspaceUsers = (token: string, tenantId: string) =>
  apiFetch<{ created: number; updated: number; errors: string[]; synced_at: string }>(
    `/v1/admin/tenants/${tenantId}/integrations/google/sync`, token,
    { method: "POST" }
  );

export const testGoogleWorkspaceConnection = (token: string, tenantId: string) =>
  apiFetch<{ status: string; user_count: number; admin_email: string }>(
    `/v1/admin/tenants/${tenantId}/integrations/google/test`, token,
    { method: "POST" }
  );
