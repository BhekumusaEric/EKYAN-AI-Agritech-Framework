"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, FileLock2, LoaderCircle, LockKeyhole, ScrollText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { PILOT } from "@/lib/mvp-preview";
import { apiRequest } from "@/lib/api";

type ConsentedProfile = {
  agripreneur_id: string;
  decision_notice: string;
  business: {
    revenue_kes: number;
    expenses_kes: number;
    operating_surplus_kes: number;
    existing_obligations_kes: number;
  };
  record_coverage: { months_with_entries: number; months_in_period: number; entry_count: number };
  consent: { id: string; purpose: string; expiresAt: string };
};

export default function LenderPage() {
  const [profiles, setProfiles] = useState<ConsentedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void apiRequest<{ profiles: ConsentedProfile[] }>("/api/v1/profiles/consented", undefined, "lender")
      .then((response) => {
        if (active) setProfiles(response.profiles);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Consented profiles could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section>
        <Badge variant="info"><ShieldCheck aria-hidden="true" size={14} /> Lender workspace preview</Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Profiles are shared only by consent</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          A lender should see a business profile only while the agripreneur&apos;s purpose-specific consent is active.
        </p>
      </section>

      <StatusNotice tone="warning" title="Synthetic, consent-gated profiles">
        Only synthetic profiles with active lender- and purpose-specific consent are returned. This view does not make an underwriting decision.
      </StatusNotice>
      {error && <StatusNotice tone="error" title="Profile service unavailable">{error}</StatusNotice>}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Consented profiles</CardTitle>
                <CardDescription>{PILOT.county} · {PILOT.valueChain} pilot</CardDescription>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <FileLock2 aria-hidden="true" size={21} />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <div role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-600"><LoaderCircle className="animate-spin" size={16} />Checking active consent…</div>}
            {!loading && !error && !profiles.length && (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <LockKeyhole aria-hidden="true" className="text-brand-700" size={26} />
                <h2 className="mt-3 text-sm font-semibold text-slate-800">No active consented profiles</h2>
                <p className="mt-2 max-w-md text-xs leading-5 text-slate-600">
                  Profile details remain hidden unless an agripreneur selects this lender, states a specific purpose, sets an expiry and grants consent.
                </p>
              </div>
            )}
            <div className="space-y-3">
              {profiles.map((profile) => (
                <article key={profile.consent.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-slate-900">{profile.agripreneur_id}</h2>
                      <p className="mt-1 text-xs text-slate-500">{profile.consent.purpose.replaceAll("_", " ")} · expires {new Date(profile.consent.expiresAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="warning">Human review</Badge>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Metric label="Record coverage" value={`${profile.record_coverage.months_with_entries} of ${profile.record_coverage.months_in_period} months · ${profile.record_coverage.entry_count} entries`} />
                    <Metric label="Recorded revenue" value={`KES ${profile.business.revenue_kes.toLocaleString()}`} />
                    <Metric label="Recorded expenses" value={`KES ${profile.business.expenses_kes.toLocaleString()}`} />
                    <Metric label="Operating surplus" value={`KES ${profile.business.operating_surplus_kes.toLocaleString()}`} />
                    <Metric label="Recorded borrowing estimate" value={`KES ${profile.business.existing_obligations_kes.toLocaleString()}`} />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">{profile.decision_notice}</p>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Before viewing a profile</CardTitle>
            <CardDescription>Required checks for every access request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Verify the consent is active and has not expired or been revoked.",
              "Limit viewing to the named purpose and fields.",
              "Record the lender, actor, time and profile accessed in an audit log.",
              "Keep underwriting and final decisions with the lender.",
            ].map((text) => (
              <div key={text} className="flex gap-2 rounded-xl bg-brand-50 p-3 text-xs leading-5 text-brand-950">
                <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-brand-700" size={15} />
                <span>{text}</span>
              </div>
            ))}
            <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-950">
              <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-amber-700" size={15} />
              Readiness information is not a loan approval or credit decision.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Access history</CardTitle>
          <CardDescription>Every profile view is written to the backend audit log.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            <ScrollText aria-hidden="true" size={18} />
            Access checks and successful profile views are recorded. The detailed audit-log viewer is not exposed in this demo.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
