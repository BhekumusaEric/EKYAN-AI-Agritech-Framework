"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleHelp,
  ClipboardList,
  Database,
  Download,
  Filter,
  Leaf,
  LoaderCircle,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { KPI_DICTIONARY, PILOT } from "@/lib/mvp-preview";
import { apiRequest, apiRequestBlob } from "@/lib/api";

type KpiValue = {
  value: number | null;
  unit: string;
  unavailableReason?: string;
  funnel?: {
    intentionFarmers: number;
    orderedFarmers: number;
    fulfilledFarmers: number;
    adoptionVerified: number | null;
  };
};
type KpiResponse = { values: Record<string, KpiValue> };
type DataQualityResponse = { summary: { checked: number; passed: number; exceptions: number; score: number | null } };
type BlockerSummary = { blockers: { category: string; status: string }[] };

const FUNNEL = [
  { title: "Intention", icon: Sprout, tone: "bg-brand-50 text-brand-800" },
  { title: "Order placed", icon: ClipboardList, tone: "bg-sky-50 text-sky-800" },
  { title: "Fulfilled", icon: ShieldCheck, tone: "bg-amber-50 text-amber-900" },
  { title: "Adoption verified", icon: Leaf, tone: "bg-emerald-50 text-emerald-800" },
];

export default function DashboardPage() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [gender, setGender] = useState("");
  const [kpis, setKpis] = useState<KpiResponse | null>(null);
  const [quality, setQuality] = useState<DataQualityResponse | null>(null);
  const [blockers, setBlockers] = useState<BlockerSummary["blockers"]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ county: PILOT.county, valueChain: PILOT.valueChain });
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    if (gender) params.set("gender", gender);
    setLoading(true);
    void Promise.all([
      apiRequest<KpiResponse>(`/api/v1/kpi?${params}`, undefined, "programme_manager"),
      apiRequest<DataQualityResponse>("/api/v1/data-quality", undefined, "programme_manager"),
      apiRequest<BlockerSummary>("/api/v1/blockers", undefined, "programme_manager"),
    ])
      .then(([kpiResponse, qualityResponse, blockerResponse]) => {
        if (!active) return;
        setKpis(kpiResponse);
        setQuality(qualityResponse);
        setBlockers(blockerResponse.blockers);
        setError("");
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Programme metrics could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [start, end, gender]);

  async function exportKpis() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ county: PILOT.county, valueChain: PILOT.valueChain });
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      if (gender) params.set("gender", gender);
      const file = await apiRequestBlob(`/api/v1/kpi/export.csv?${params}`);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = "ekyan-kpis.csv";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The KPI export could not be downloaded.");
    } finally {
      setExporting(false);
    }
  }

  const blockerCounts = blockers.reduce<Record<string, number>>((counts, blocker) => {
    counts[blocker.category] = (counts[blocker.category] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-6 text-white shadow-[0_18px_50px_rgba(16,44,38,0.16)] sm:p-8 lg:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-16 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <Badge variant="inverse"><Sprout aria-hidden="true" size={14} /> Programme oversight</Badge>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Turn field activity into trusted evidence.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/80 sm:text-base">
              Follow blockers to resolution, pooled demand to fulfilment, and logged intentions to service action. Practice adoption verification remains separate.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">{PILOT.county} pilot</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">{PILOT.valueChain} value chain</span>
          </div>
        </div>
      </section>

      <StatusNotice tone="warning" title="Synthetic programme data">
        These pilot metrics are calculated from synthetic local records only. Do not treat them as live programme results.
      </StatusNotice>
      {error && <StatusNotice tone="error" title="Dashboard data unavailable">{error}</StatusNotice>}

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Reporting filters</CardTitle>
            <CardDescription>Reporting period and inclusion filter for synthetic programme reporting.</CardDescription>
          </div>
          <Filter aria-hidden="true" className="text-brand-700" size={19} />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-xs font-semibold text-slate-600">County
              <input value={PILOT.county} readOnly className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-600" />
            </label>
            <label className="text-xs font-semibold text-slate-600">Value chain
              <input value={PILOT.valueChain} readOnly className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-600" />
            </label>
            <label className="text-xs font-semibold text-slate-600">From
              <input type="date" value={start} onChange={(event) => setStart(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-600">To
              <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-600">Gender
              <select value={gender} onChange={(event) => setGender(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
                <option value="">All participants</option><option value="woman">Woman</option><option value="man">Man</option>
              </select>
            </label>
          </div>
          <p id="filter-connection-note" className="mt-3 text-xs text-slate-500">
            Metrics refresh automatically for the selected reporting period and inclusion filter.
          </p>
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">K1–K11 pilot KPI dictionary</h2>
            <p className="mt-1 text-xs text-slate-500">Values are calculated from the local synthetic seed and field activity.</p>
          </div>
          <Badge variant={loading ? "warning" : "info"}>{loading ? <LoaderCircle aria-hidden="true" className="animate-spin" size={13} /> : <Database aria-hidden="true" size={13} />} {loading ? "Refreshing values" : "Synthetic values loaded"}</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {KPI_DICTIONARY.map((kpi) => (
            <Card key={kpi.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">{kpi.id}</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{kpi.name}</h3>
                </div>
                <button
                  type="button"
                  title={`${kpi.formula}. Source: ${kpi.source}.`}
                  aria-label={`${kpi.id} definition and source: ${kpi.formula}. Source: ${kpi.source}.`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  <CircleHelp aria-hidden="true" size={17} />
                </button>
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-900" aria-label={`${kpi.name}: ${kpis?.values[kpi.id]?.value ?? "unavailable"}`}>
                {loading ? "…" : kpis?.values[kpi.id]?.value === null || kpis?.values[kpi.id]?.value === undefined
                  ? "—"
                  : `${kpis.values[kpi.id].value}${kpis.values[kpi.id].unit === "percent" ? "%" : ""}`}
              </p>
              {kpis?.values[kpi.id]?.unavailableReason && <p className="mt-1 text-[11px] text-slate-500">{kpis.values[kpi.id].unavailableReason}</p>}
              <p className="mt-2 text-xs leading-5 text-slate-600">{kpi.formula}</p>
              <p className="mt-2 text-[11px] font-medium text-slate-500">Source: {kpi.source}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Intention → action → outcome</CardTitle>
            <CardDescription>Counts are distinct farmers in the intention cohort; practice adoption verification is not yet captured.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {FUNNEL.map(({ title, icon: Icon, tone }, index) => {
                const counts = kpis?.values.K6?.funnel;
                const values = counts
                  ? [counts.intentionFarmers, counts.orderedFarmers, counts.fulfilledFarmers, counts.adoptionVerified]
                  : null;
                const value = values?.[index];
                return (
                  <div key={title} className="relative rounded-xl border border-slate-100 p-4">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                      <Icon aria-hidden="true" size={19} />
                    </span>
                    <p className="mt-3 text-xs font-semibold text-slate-700">{title}</p>
                    <p className="mt-1 text-xl font-semibold text-slate-500">
                      {value == null ? (index === 3 && kpis ? "Not tracked" : "—") : value.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">{index === 3 ? "requires verification records" : "farmers"}</p>
                    {index < FUNNEL.length - 1 && <ArrowRight aria-hidden="true" className="absolute right-3 top-7 hidden text-slate-300 xl:block" size={15} />}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Fulfilled orders are service actions, not proof of practice adoption. A verification method is still required.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blockers by category</CardTitle>
            <CardDescription>Volume, resolution rate and time to resolution.</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(blockerCounts).length ? <ul className="space-y-2">{Object.entries(blockerCounts).map(([category, count]) => <li key={category} className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"><span>{category}</span><strong>{count}</strong></li>)}</ul> : <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center"><ClipboardList aria-hidden="true" className="text-brand-700" size={22} /><p className="mt-2 text-sm font-semibold text-slate-700">No blockers recorded</p><p className="mt-1 text-xs leading-5 text-slate-500">Counts reflect synthetic backend records.</p></div>}
            <Link href="/extension" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 hover:text-brand-950">
              Open synthetic extension queue <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Data quality · K11</CardTitle>
            <CardDescription>Duplicates, outliers, missing fields and records requiring review.</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusNotice tone="info" title="Synthetic quality results">
              {quality ? `${quality.summary.passed} of ${quality.summary.checked} records passed · ${quality.summary.exceptions} exceptions · score ${quality.summary.score ?? "unavailable"}%.` : "Data-quality checks are running."}
            </StatusNotice>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost per meaningful outcome · K10</CardTitle>
            <CardDescription>Uses an approved programme-cost method and verified outcome counts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[220px] flex-1 rounded-xl bg-slate-50 p-3 text-sm">
                <p className="text-xs font-semibold text-slate-600">Cost per verified outcome</p>
                <p className="mt-1 font-semibold text-slate-900">{kpis?.values.K10?.value === null || kpis?.values.K10?.value === undefined ? "Unavailable" : `KES ${kpis.values.K10.value.toLocaleString()}`}</p>
              </div>
              <button onClick={() => void exportKpis()} disabled={exporting || loading} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-200 px-4 text-sm font-semibold text-brand-800 disabled:cursor-not-allowed disabled:opacity-50">
                {exporting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Download aria-hidden="true" size={15} />} Export CSV
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Cost inputs and exports require programme-admin permissions and audit logging.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
