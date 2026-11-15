const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchClimateAdvisory(county: string, ndvi?: number) {
  const params = new URLSearchParams({ county });
  if (ndvi !== undefined) params.set("ndvi", String(ndvi));
  const res = await fetch(`${API_BASE}/api/v1/climate/advisory?${params}`, {
    next: { revalidate: 1800 }, // 30 min cache
  });
  return res.json();
}

export async function fetchMarketPrice(commodity: string, daysAhead = 14) {
  const res = await fetch(
    `${API_BASE}/api/v1/market/price?commodity=${commodity}&days_ahead=${daysAhead}`,
    { next: { revalidate: 3600 } }
  );
  return res.json();
}

export async function fetchCreditScore(profile: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/v1/credit/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  return res.json();
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
  const data = await res.json();
  return data[0] ?? null;
}

export async function fetchBlockerStats() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

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
  return res.json();
}
