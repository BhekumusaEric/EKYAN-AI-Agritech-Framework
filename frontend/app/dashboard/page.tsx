import {
  fetchMeKpis,
  fetchBlockerStats,
  fetchClimateAdvisory,
  fetchMarketPrice,
} from "@/lib/api";
import StatCard from "@/components/StatCard";
import BlockerChart from "@/components/BlockerChart";
import ClimateNudgePanel from "@/components/ClimateNudgePanel";
import MarketPriceCard from "@/components/MarketPriceCard";

const COUNTIES = ["Kirinyaga", "Busia", "Kisumu"];
const COMMODITIES = ["tomato", "maize", "beans", "kale", "chicken"];

export const revalidate = 300; // refresh every 5 min

export default async function DashboardPage() {
  // Fetch all data in parallel
  const [kpis, blockers, kirinyagaClimate, ...prices] = await Promise.allSettled([
    fetchMeKpis(),
    fetchBlockerStats(),
    fetchClimateAdvisory("Kirinyaga", 0.42),
    ...COMMODITIES.map((c) => fetchMarketPrice(c)),
  ]);

  const kpiData = kpis.status === "fulfilled" ? kpis.value : null;
  const blockerData = blockers.status === "fulfilled" ? blockers.value : [];
  const climateData = kirinyagaClimate.status === "fulfilled" ? kirinyagaClimate.value : null;
  const priceData = prices
    .filter((p) => p.status === "fulfilled")
    .map((p) => (p as PromiseFulfilledResult<unknown>).value as Record<string, unknown>);

  const openBlockers = blockerData.filter((b: { status: string }) => b.status === "open").length;
  const resolvedBlockers = blockerData.filter((b: { status: string }) => b.status === "resolved").length;
  const resolutionRate = blockerData.length
    ? Math.round((resolvedBlockers / blockerData.length) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg">
            E
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">EKYAN Connect</h1>
            <p className="text-sm text-gray-500">
              UNICEF Kenya · Generation Unlimited · Real-Time M&amp;E Dashboard
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-green-700 bg-green-100 px-3 py-1.5 rounded-full font-medium">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
        <StatCard
          label="Youth Agripreneurs"
          value={kpiData?.youth_enrolled?.toLocaleString() ?? "—"}
          sub={kpiData ? `${kpiData.youth_female_pct}% female` : "Connect Supabase"}
          trend="up"
          color="green"
        />
        <StatCard
          label="Acres Regenerative"
          value={kpiData?.acres_regenerative?.toLocaleString() ?? "—"}
          sub="Zero synthetic runoff"
          color="green"
        />
        <StatCard
          label="Credit Unlocked"
          value={kpiData ? `$${(kpiData.credit_unlocked_usd / 1000).toFixed(0)}k` : "—"}
          sub={kpiData ? `${kpiData.repayment_rate_pct}% repayment` : ""}
          trend="up"
          color="blue"
        />
        <StatCard
          label="Children Reached"
          value={kpiData?.children_nutrition_reached?.toLocaleString() ?? "—"}
          sub="Nutrition impact"
          color="amber"
        />
      </section>

      {/* Blocker + Climate row */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-8">
        {/* Blocker breakdown */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Farmer Blockers by Category</h2>
            <div className="flex gap-3 text-xs">
              <span className="text-red-500 font-medium">{openBlockers} open</span>
              <span className="text-green-600 font-medium">{resolvedBlockers} resolved</span>
              <span className="text-gray-400">{resolutionRate}% rate</span>
            </div>
          </div>
          <BlockerChart data={blockerData} />
          <p className="mt-3 text-xs text-gray-400">
            BRS P01–P05 · Captured via WhatsApp / USSD · Updated every 5 min
          </p>
        </div>

        {/* Climate advisory */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">
            Live Climate Advisory — Kirinyaga
          </h2>
          {climateData?.nudges ? (
            <ClimateNudgePanel county="Kirinyaga" nudges={climateData.nudges} />
          ) : (
            <p className="text-sm text-gray-400">Loading climate data…</p>
          )}
          <p className="mt-3 text-xs text-gray-400">
            Open Meteo · Sentinel-2 NDVI · Refreshed every 30 min
          </p>
        </div>
      </section>

      {/* Market prices */}
      <section className="rounded-2xl bg-white p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Fair Market Prices vs Broker</h2>
          <span className="text-xs text-gray-400">14-day forecast · KES/kg</span>
        </div>
        {priceData.length > 0 ? (
          <MarketPriceCard prices={priceData as unknown as Parameters<typeof MarketPriceCard>[0]["prices"]} />
        ) : (
          <p className="text-sm text-gray-400">Loading market data…</p>
        )}
        <p className="mt-3 text-xs text-gray-400">
          KNBS baseline · Seasonal adjustment · Broker markup eliminated
        </p>
      </section>

      {/* County selector row */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Target Counties</h2>
        <div className="flex flex-wrap gap-3">
          {COUNTIES.map((county) => (
            <div
              key={county}
              className="flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-2 text-sm font-medium text-green-800"
            >
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {county}
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-full bg-gray-100 border border-gray-200 px-4 py-2 text-sm text-gray-500">
            + Samburu · Nakuru · Kakamega
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Mapbox GIS layer — farm plot polygons, NDVI heatmap, blocker clusters coming in v1.1
        </p>
      </section>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-gray-400">
        EKYAN Connect · UNICEF Kenya · Apache 2.0 ·{" "}
        <a href="/docs" className="underline hover:text-gray-600">
          API Docs
        </a>
      </footer>
    </main>
  );
}
