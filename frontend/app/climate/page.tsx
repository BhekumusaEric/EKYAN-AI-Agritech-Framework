"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CloudSun, LoaderCircle, RefreshCw, Sprout, Thermometer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { apiRequest } from "@/lib/api";

type Nudge = {
  trigger: string;
  severity: string;
  action_required: boolean;
  swahili: string;
  english: string;
};

type AdvisoryResponse = {
  county: string;
  nudges: Nudge[];
};

const COUNTIES = ["Busia", "Kirinyaga", "Nakuru", "Machakos", "Turkana"];

const severityStyle: Record<string, string> = {
  high: "border-rose-200 bg-rose-50 text-rose-950",
  medium: "border-amber-200 bg-amber-50 text-amber-950",
  low: "border-sky-200 bg-sky-50 text-sky-950",
  info: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function ClimatePage() {
  const [county, setCounty] = useState("Busia");
  const [ndvi, setNdvi] = useState("");
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadAdvisory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [county]);

  async function loadAdvisory() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ county });
      if (ndvi) params.set("ndvi", ndvi);
      const data = await apiRequest<AdvisoryResponse>(`/api/v1/climate/advisory?${params}`);
      setAdvisory(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Climate advisory could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section>
        <Badge variant="info"><CloudSun aria-hidden="true" size={14} /> Climate intelligence</Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Hyperlocal climate advisory</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Actionable nudges based on weather patterns and NDVI vegetation health. Escalates to extension officers when risk is high.
        </p>
      </section>

      <StatusNotice tone="warning" title="Synthetic climate data">
        Advisory nudges are generated from rule-based logic and synthetic weather patterns. No live Sentinel-2 or Open-Meteo data is connected in this MVP.
      </StatusNotice>

      {error && <StatusNotice tone="error" title="Advisory service unavailable">{error}</StatusNotice>}

      <Card>
        <CardHeader>
          <CardTitle>Advisory filters</CardTitle>
          <CardDescription>Select a county and optional NDVI reading to generate nudges.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-slate-700">
              County
              <select
                value={county}
                onChange={(event) => setCounty(event.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"
              >
                {COUNTIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              NDVI reading (0–1 · optional)
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={ndvi}
                onChange={(event) => setNdvi(event.target.value)}
                placeholder="e.g. 0.45"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void loadAdvisory()}
                disabled={loading}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-200 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-50"
              >
                {loading ? <LoaderCircle className="animate-spin" size={15} /> : <RefreshCw size={15} />}
                Refresh advisory
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div role="status" className="flex items-center gap-2 text-sm text-slate-600">
          <LoaderCircle className="animate-spin" size={16} /> Loading climate advisory for {county}…
        </div>
      )}

      {advisory && !loading && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {advisory.county} · {advisory.nudges.length} nudge{advisory.nudges.length !== 1 ? "s" : ""}
            </h2>
            <Badge variant={advisory.nudges.some((n) => n.severity === "high") ? "danger" : advisory.nudges.some((n) => n.severity === "medium") ? "warning" : "success"}>
              {advisory.nudges.some((n) => n.severity === "high") ? "High risk" : advisory.nudges.some((n) => n.severity === "medium") ? "Medium risk" : "Low risk"}
            </Badge>
          </div>

          {!advisory.nudges.length ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
              <Sprout aria-hidden="true" className="text-emerald-700" size={22} />
              <p className="mt-2 text-sm font-semibold text-slate-700">No active nudges for {advisory.county}</p>
              <p className="mt-1 text-xs text-slate-500">Conditions appear normal. Continue monitoring.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {advisory.nudges.map((nudge, index) => (
                <article key={`${nudge.trigger}-${index}`} className={`rounded-2xl border p-4 ${severityStyle[nudge.severity] ?? severityStyle.info}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {nudge.severity === "high" ? (
                        <AlertTriangle aria-hidden="true" size={18} className="shrink-0 text-rose-700" />
                      ) : (
                        <Thermometer aria-hidden="true" size={18} className="shrink-0 text-amber-700" />
                      )}
                      <p className="font-semibold">{nudge.trigger}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={nudge.severity === "high" ? "danger" : nudge.severity === "medium" ? "warning" : "info"}>
                        {nudge.severity}
                      </Badge>
                      {nudge.action_required && <Badge variant="warning">Action required</Badge>}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/60 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">English</p>
                      <p className="mt-1 text-sm leading-5">{nudge.english}</p>
                    </div>
                    <div className="rounded-xl bg-white/60 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Kiswahili</p>
                      <p className="mt-1 text-sm leading-5">{nudge.swahili}</p>
                    </div>
                  </div>
                  {nudge.action_required && nudge.severity === "high" && (
                    <Link href="/blockers" className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-rose-800 underline underline-offset-2">
                      Log as a blocker for extension follow-up <ArrowRight size={13} />
                    </Link>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Phase 2: live integrations</CardTitle>
            <CardDescription>Connect through a replaceable ClimateAdapter after partner validation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Open-Meteo", "Free hyperlocal 7-day hourly forecasts"],
              ["Sentinel-2", "NDVI canopy moisture tracking"],
              ["Tomorrow.io", "High-res ASAL drought early warning"],
            ].map(([label, detail]) => (
              <div key={label} className="rounded-xl border border-slate-100 p-3">
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Safety and escalation</CardTitle>
            <CardDescription>High-risk advice always remains under qualified human review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-950">
              <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-amber-700" size={16} />
              No pesticide or veterinary dosage instructions may be displayed without an approved source.
            </p>
            <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              When confidence is low or risk is high, route the question to a qualified extension officer.
            </p>
            <Link href="/agronomist" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 hover:text-brand-950">
              Open Ask Nia advisory <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
