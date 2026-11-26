"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, LoaderCircle, Sprout, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { apiRequest } from "@/lib/api";

type InvestorProfile = {
  agripreneur_id: string;
  display_name: string;
  gender: string;
  value_chain: string;
  county: string;
  business: {
    revenue_kes: number;
    expenses_kes: number;
    operating_surplus_kes: number;
    margin_percent: number;
  };
  network: {
    farmers_served: number;
    orders_placed: number;
    orders_fulfilled: number;
    fulfilment_rate_percent: number;
  };
  impact: {
    blockers_resolved: number;
    women_farmers: number;
    farmers_with_disability: number;
  };
  readiness: {
    has_income_records: boolean;
    has_expense_records: boolean;
    transaction_count: number;
  };
  decision_notice: string;
};

function formatKes(value: number) {
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export default function InvestorPage() {
  const [profiles, setProfiles] = useState<InvestorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void apiRequest<{ profiles: InvestorProfile[] }>("/api/v1/investor/profiles", undefined, "investor")
      .then((response) => { if (active) setProfiles(response.profiles); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Investor profiles could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section>
        <Badge variant="info"><Sprout aria-hidden="true" size={14} /> Investor workspace</Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Opportunity profiles · evidence first</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Verified business and programme evidence for human due diligence. Not an automated funding recommendation.
        </p>
      </section>

      <StatusNotice tone="warning" title="Synthetic profiles only">
        All profiles are generated from synthetic, self-reported records. No real enterprise data, investment offer or participant consent is connected. No financial decision can be made from this preview.
      </StatusNotice>

      {error && <StatusNotice tone="error" title="Profile service unavailable">{error}</StatusNotice>}

      {loading && (
        <div role="status" className="flex items-center gap-2 text-sm text-slate-600">
          <LoaderCircle className="animate-spin" size={16} /> Loading opportunity profiles…
        </div>
      )}

      {!loading && !error && !profiles.length && (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No investor profiles are shared. EKYAN will only enable this view after an investor-specific consent flow is approved.</p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {profiles.map((profile) => (
          <Card key={profile.agripreneur_id} className="overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-brand-500 via-emerald-400 to-sky-400" />
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{profile.display_name}</CardTitle>
                  <CardDescription className="mt-1">{profile.value_chain} · {profile.county} · synthetic</CardDescription>
                </div>
                <Badge variant={profile.readiness.has_income_records && profile.readiness.has_expense_records ? "success" : "warning"}>
                  {profile.readiness.has_income_records && profile.readiness.has_expense_records ? "Records present" : "Incomplete records"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric icon={TrendingUp} label="Revenue" value={formatKes(profile.business.revenue_kes)} tone="brand" />
                <Metric icon={BarChart3} label="Surplus" value={formatKes(profile.business.operating_surplus_kes)} tone="emerald" />
                <Metric icon={Users} label="Farmers" value={String(profile.network.farmers_served)} tone="sky" />
                <Metric icon={Sprout} label="Fulfilment" value={`${profile.network.fulfilment_rate_percent}%`} tone="amber" />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-600">Margin</p>
                  <p className="mt-1 text-slate-900">{profile.business.margin_percent}%</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-600">Blockers resolved</p>
                  <p className="mt-1 text-slate-900">{profile.impact.blockers_resolved}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-600">Women farmers</p>
                  <p className="mt-1 text-slate-900">{profile.impact.women_farmers}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="font-semibold text-slate-600">Income records</p>
                  <Badge variant={profile.readiness.has_income_records ? "success" : "warning"} className="mt-1">
                    {profile.readiness.has_income_records ? "Present" : "Missing"}
                  </Badge>
                </div>
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="font-semibold text-slate-600">Expense records</p>
                  <Badge variant={profile.readiness.has_expense_records ? "success" : "warning"} className="mt-1">
                    {profile.readiness.has_expense_records ? "Present" : "Missing"}
                  </Badge>
                </div>
              </div>

              <p className="text-[11px] leading-5 text-slate-500">{profile.decision_notice}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Before making an investment decision</CardTitle>
          <CardDescription>Required checks for every profile access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Verify participant consent before accessing any profile.",
            "Confirm evidence sources, reporting period and missing fields.",
            "Conduct independent due diligence — this profile is not a verified financial statement.",
            "Investors retain full responsibility for investment decisions.",
          ].map((text) => (
            <div key={text} className="flex gap-2 rounded-xl bg-brand-50 p-3 text-xs leading-5 text-brand-950">
              <Sprout aria-hidden="true" className="mt-0.5 shrink-0 text-brand-700" size={15} />
              <span>{text}</span>
            </div>
          ))}
          <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 hover:text-brand-950">
            View programme KPI definitions <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    brand: "bg-brand-50 text-brand-800",
    emerald: "bg-emerald-50 text-emerald-800",
    sky: "bg-sky-50 text-sky-800",
    amber: "bg-amber-50 text-amber-900",
  };
  return (
    <div className={`rounded-xl p-3 ${tones[tone] ?? tones.brand}`}>
      <Icon aria-hidden="true" size={16} className="mb-1" />
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
