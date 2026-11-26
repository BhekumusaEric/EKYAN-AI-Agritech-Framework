const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "ekyan.access-token";
const REQUEST_TIMEOUT_MS = 15000;
export type ApiDemoRole =
  | "agripreneur"
  | "supplier"
  | "lender"
  | "buyer"
  | "investor"
  | "extension_officer"
  | "programme_manager"
  | "administrator";

export type AccountRole = ApiDemoRole;
export type AccountActor = { id: string; displayName: string; role: AccountRole; email?: string; synthetic?: boolean };

export function getApiBaseUrl() {
  return API_BASE;
}

async function fetchApi(url: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new Error(`The EKYAN API did not respond within ${Math.ceil(timeoutMs / 1000)} seconds. Check that the API server is running at ${API_BASE}.`);
    }
    if (cause instanceof TypeError) {
      throw new Error(`Could not reach the EKYAN API at ${API_BASE}. Start the backend and check NEXT_PUBLIC_API_URL, ALLOWED_ORIGINS, and your network connection.`);
    }
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
}

export function readAccessToken() {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

export function clearAccountSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function signIn(email: string, password: string) {
  const response = await fetchApi(`${API_BASE}/api/v1/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await responseError(response));
  const session = await response.json();
  if (typeof session.actor !== "object" || session.actor === null) throw new Error("Sign in returned an invalid session.");
  clearAccountSession();
  return session.actor as AccountActor;
}

export async function signUp(displayName: string, email: string, password: string, role: AccountRole) {
  const response = await fetchApi(`${API_BASE}/api/v1/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ displayName, email, password, role }),
  });
  if (!response.ok) throw new Error(await responseError(response));
  const result = await response.json();
  clearAccountSession();
  if (typeof result.active !== "boolean") throw new Error("Account registration returned an invalid response.");
  return result as { accessToken?: string; active: boolean; status?: string; message?: string; actor?: AccountActor };
}

export async function signOut() {
  const token = readAccessToken();
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    });
  } finally {
    clearAccountSession();
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  _role?: ApiDemoRole
): Promise<T> {
  const response = await authenticatedFetch(path, init);
  if (!response.ok) {
    throw new Error(await responseError(response));
  }
  return response.json() as Promise<T>;
}

export async function apiRequestBlob(
  path: string,
  initOrLegacyRole: RequestInit | ApiDemoRole = {},
  legacyInit: RequestInit = {}
): Promise<Blob> {
  // Legacy role hints are ignored: the account token alone determines server permissions.
  const init = typeof initOrLegacyRole === "string" ? legacyInit : initOrLegacyRole;
  const response = await authenticatedFetch(path, init);
  if (!response.ok) {
    throw new Error(await responseError(response));
  }
  return response.blob();
}

async function authenticatedFetch(
  path: string,
  init: RequestInit
): Promise<Response> {
  const token = readAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetchApi(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401) {
    clearAccountSession();
    window.dispatchEvent(new Event("ekyan:session-expired"));
  }
  return response;
}

async function responseError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const detail = body && typeof body === "object" && "detail" in body ? body.detail : null;
    return typeof detail === "string" ? detail : `API request failed with status ${response.status}.`;
  } catch {
    return `API request failed with status ${response.status}.`;
  }
}

function requireOk(res: Response) {
  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}`);
  }
  return res;
}

export async function fetchHealth() {
  return requireOk(await fetchApi(`${API_BASE}/health`, {}, 5000)).json();
}

export async function fetchClimateAdvisory(county: string, ndvi?: number) {
  const params = new URLSearchParams({ county });
  if (ndvi !== undefined) params.set("ndvi", String(ndvi));
  return apiRequest(`/api/v1/climate/advisory?${params}`);
}

export async function fetchMarketPrice(commodity: string, daysAhead = 14) {
  return apiRequest(`/api/v1/market/price?commodity=${encodeURIComponent(commodity)}&days_ahead=${daysAhead}`);
}

export async function fetchCreditScore(profile: Record<string, unknown>) {
  return apiRequest(`/api/v1/credit/score`, {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export async function fetchInvestorProfiles() {
  return apiRequest(`/api/v1/investor/profiles`);
}

export async function fetchMarketplaceListings(commodity?: string, county?: string) {
  const params = new URLSearchParams();
  if (commodity) params.set("commodity", commodity);
  if (county) params.set("county", county);
  return apiRequest(`/api/v1/marketplace/listings?${params}`);
}

export async function fetchPriceForecast(commodity: string, daysAhead = 14) {
  const res = await fetch(
    `${API_BASE}/api/v1/marketplace/price-forecast?commodity=${commodity}&days_ahead=${daysAhead}`
  );
  return requireOk(res).json();
}

export async function advisoryChat(message: string, participantId: string) {
  const res = await fetch(`${API_BASE}/api/v1/advisory/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, participant_id: participantId }),
  });
  return requireOk(res).json();
}

// M&E KPIs — reads from Supabase public table directly
export async function fetchMeKpis() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/me_kpis?order=snapshot_date.desc&limit=1`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      next: { revalidate: 300 },
    }
  );
  requireOk(res);
  const data = await res.json();
  return data[0] ?? null;
}

export async function fetchBlockerStats() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/blockers?select=category,status&limit=500`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      next: { revalidate: 300 },
    }
  );
  requireOk(res);
  const data: unknown = await res.json();
  if (
    !Array.isArray(data) ||
    !data.every(
      (row) =>
        row !== null &&
        typeof row === "object" &&
        "category" in row &&
        typeof row.category === "string" &&
        "status" in row &&
        typeof row.status === "string"
    )
  ) {
    throw new Error("Blocker service returned an invalid response");
  }
  return data as { category: string; status: string }[];
}
