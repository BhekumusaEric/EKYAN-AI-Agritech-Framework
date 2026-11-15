import { fetchMeKpis, fetchBlockerStats, fetchClimateAdvisory, fetchMarketPrice } from "@/lib/api";
import StatCard from "@/components/StatCard";
import BlockerChart from "@/components/BlockerChart";
import ClimateNudgePanel from "@/components/ClimateNudgePanel";
import MarketPriceCard from "@/components/MarketPriceCard";

const COMMODITIES = ["tomato", "maize", "beans", "kale", "chicken"];
export const revalidate = 300;

export default async function DashboardPage() {
  const [kpis, blockers, climate, ...prices] = await Promise.allSettled([
    fetchMeKpis(),
    fetchBlockerStats(),
    fetchClimateAdvisory("Kirinyaga", 0.42),
    ...COMMODITIES.map((c) => fetchMarketPrice(c)),
  ]);

  const kpiData     = kpis.status     === "fulfilled" ? kpis.value     : null;
  const blockerData = blockers.status === "fulfilled" ? blockers.value : [];
  const climateData = climate.status  === "fulfilled" ? climate.value  : null;
  const priceData   = prices
    .filter((p) => p.status === "fulfilled")
    .map((p) => (p as PromiseFulfilledResult<unknown>).value as Record<string, unknown>);

  const open     = blockerData.filter((b: { status: string }) => b.status === "open").length;
  const resolved = blockerData.filter((b: { status: string }) => b.status === "resolved").length;
  const rate     = blockerData.length ? Math.round((resolved / blockerData.length) * 100) : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Impact Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Real-time M&amp;E · Kenya · {new Date().toLocaleDateString("en-KE", { dateStyle: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-unicef-pale px-4 py-2 text-xs font-semibold text-unicef-navy">
          <span className="h-2 w-2 rounded-full bg-unicef-blue animate-pulse" />
          Live · Refreshes every 5 min
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Youth Agripreneurs"
          value={kpiData?.youth_enrolled?.toLocaleString() ?? "—"}
          sub={kpiData ? `${kpiData.youth_female_pct}% female` : "Awaiting data"}
          trend="up" color="blue"
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
          trend="up" color="blue"
        />
        <StatCard
          label="Children Reached"
          value={kpiData?.children_nutrition_reached?.toLocaleString() ?? "—"}
          sub="Nutrition impact"
          color="yellow"
        />
      </div>

      {/* Blockers + Climate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl bg-white border border-border p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900">Farmer Blockers</h2>
              <p className="text-xs text-gray-400 mt-0.5">Captured via WhatsApp · USSD</p>
            </div>
            <div className="flex gap-2 text-xs font-medium">
              <span className="rounded-full bg-red-50 text-unicef-red px-2.5 py-1">{open} open</span>
              <span className="rounded-full bg-green-50 text-unicef-green px-2.5 py-1">{resolved} resolved</span>
              <span className="rounded-full bg-gray-100 text-gray-500 px-2.5 py-1">{rate}%</span>
            </div>
          </div>
          <BlockerChart data={blockerData} />
          <p className="mt-3 text-xs text-gray-400">BRS P01–P05 · Updated every 5 min</p>
        </div>

        <div className="rounded-xl bg-white border border-border p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-gray-900">Climate Advisory</h2>
            <p className="text-xs text-gray-400 mt-0.5">Kirinyaga · Sentinel-2 NDVI · Open-Meteo</p>
          </div>
          {climateData?.nudges
            ? <ClimateNudgePanel county="Kirinyaga" nudges={climateData.nudges} />
            : <p className="text-sm text-gray-400">Loading climate data…</p>
          }
        </div>
      </div>

      {/* Market prices */}
      <div className="rounded-xl bg-white border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-gray-900">Fair Market Prices</h2>
            <p className="text-xs text-gray-400 mt-0.5">14-day forecast · KES/kg · Broker markup eliminated</p>
          </div>
          <span className="text-xs text-gray-400">KNBS baseline · Seasonal adjustment</span>
        </div>
        {priceData.length > 0
          ? <MarketPriceCard prices={priceData as unknown as Parameters<typeof MarketPriceCard>[0]["prices"]} />
          : <p className="text-sm text-gray-400">Loading market data…</p>
        }
      </div>

      {/* Counties */}
      <div className="rounded-xl bg-white border border-border p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Target Counties</h2>
        <div className="flex flex-wrap gap-2">
          {["Kirinyaga", "Busia", "Kisumu", "Samburu", "Nakuru", "Kakamega"].map((c) => (
            <span key={c} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-gray-600">
              <span className="h-1.5 w-1.5 rounded-full bg-unicef-blue" />
              {c}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Mapbox GIS layer — farm plot polygons, NDVI heatmap, blocker clusters · v1.1
        </p>
      </div>
    </div>
  );
}
