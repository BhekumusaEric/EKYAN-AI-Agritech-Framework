const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const DEMO_TOKEN_KEY = "ekyan.demo.access-token";
const DEMO_ROLE_KEY = "ekyan.demo.role";
const DEMO_ROLES: ApiDemoRole[] = [
  "agripreneur",
  "supplier",
  "lender",
  "buyer",
  "investor",
  "extension_officer",
  "programme_manager",
  "administrator",
];

export type ApiDemoRole =
  | "agripreneur"
  | "supplier"
  | "lender"
  | "buyer"
  | "investor"
  | "extension_officer"
  | "programme_manager"
  | "administrator";

export function getDemoRole(): ApiDemoRole | null {
  if (typeof window === "undefined") return null;
  const role = window.localStorage.getItem(DEMO_ROLE_KEY);
  return DEMO_ROLES.includes(role as ApiDemoRole) ? role as ApiDemoRole : null;
}

function roleForCurrentPath(): ApiDemoRole | null {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname;
  if (path.startsWith("/demand")) return "supplier";
  if (path.startsWith("/lender")) return "lender";
  if (path.startsWith("/extension")) return "extension_officer";
  if (path.startsWith("/configuration")) return "administrator";
  if (path.startsWith("/marketplace")) return "buyer";
  if (path.startsWith("/investor")) return "investor";
  if (path.startsWith("/dashboard")) return "programme_manager";
  return "agripreneur";
}

export async function activateDemoSession(role: ApiDemoRole): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/auth/demo-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    throw new Error(await responseError(response));
  }
  const session = await response.json();
  if (typeof session.accessToken !== "string") {
    throw new Error("Demo sign-in returned an invalid session.");
  }
  window.localStorage.setItem(DEMO_TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(DEMO_ROLE_KEY, role);
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  role?: ApiDemoRole
): Promise<T> {
  const response = await authenticatedFetch(path, init, role);
  if (!response.ok) {
    throw new Error(await responseError(response));
  }
  return response.json() as Promise<T>;
}

export async function apiRequestBlob(
  path: string,
  role?: ApiDemoRole,
  init: RequestInit = {}
): Promise<Blob> {
  const response = await authenticatedFetch(path, init, role);
  if (!response.ok) {
    throw new Error(await responseError(response));
  }
  return response.blob();
}

async function authenticatedFetch(
  path: string,
  init: RequestInit,
  role?: ApiDemoRole
): Promise<Response> {
  const activeRole = role ?? roleForCurrentPath() ?? getDemoRole() ?? "agripreneur";
  if (getDemoRole() !== activeRole || !window.localStorage.getItem(DEMO_TOKEN_KEY)) {
    await activateDemoSession(activeRole);
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${window.localStorage.getItem(DEMO_TOKEN_KEY)}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (response.status === 401) {
    await activateDemoSession(activeRole);
    headers.set("Authorization", `Bearer ${window.localStorage.getItem(DEMO_TOKEN_KEY)}`);
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
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
  return requireOk(await fetch(`${API_BASE}/health`)).json();
}

export async function fetchClimateAdvisory(county: string, ndvi?: number) {
  const params = new URLSearchParams({ county });
  if (ndvi !== undefined) params.set("ndvi", String(ndvi));
  const res = await fetch(`${API_BASE}/api/v1/climate/advisory?${params}`, {
    next: { revalidate: 1800 }, // 30 min cache
  });
  return requireOk(res).json();
}

export async function fetchMarketPrice(commodity: string, daysAhead = 14) {
  const res = await fetch(
    `${API_BASE}/api/v1/market/price?commodity=${commodity}&days_ahead=${daysAhead}`,
    { next: { revalidate: 3600 } }
  );
  return requireOk(res).json();
}

export async function fetchCreditScore(profile: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/v1/credit/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
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
