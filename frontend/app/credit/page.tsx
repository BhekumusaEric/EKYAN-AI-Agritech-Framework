"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, FileCheck2, HandCoins, LoaderCircle, LockKeyhole, UserRoundCheck, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { PILOT } from "@/lib/mvp-preview";
import { apiRequest } from "@/lib/api";

const REVIEW_STEPS = [
  "Confirm the business context and requested purpose without collecting unnecessary personal information.",
  "Verify each contributing record and its evidence source.",
  "Review consent scope and expiry before any external sharing.",
  "Make and record the lending decision through an accountable human reviewer.",
];

type ReadinessProfile = {
  decision_notice: string;
  business: {
    revenue_kes: number;
    expenses_kes: number;
    operating_surplus_kes: number;
    unpaid_income_kes: number;
    unpaid_expenses_kes: number;
    existing_obligations_kes: number;
    customer_count: number;
  };
  period: { from: string; to: string };
  record_coverage: {
    months_with_entries: number;
    months_with_income: number;
    months_with_expenses: number;
    months_in_period: number;
    entry_count: number;
  };
  record_checks: { id: string; status: "complete" | "attention"; count: number }[];
};

type Consent = {
  id: string;
  lenderId: string;
  purpose: string;
  expiresAt: string;
  revokedAt: string | null;
  active: boolean;
};

const BUSINESS_METRICS: { label: string; icon: LucideIcon; value: (profile: ReadinessProfile) => string }[] = [
  { label: "Recorded revenue", icon: Wallet, value: (profile) => `KES ${profile.business.revenue_kes.toLocaleString()}` },
  { label: "Recorded expenses", icon: Wallet, value: (profile) => `KES ${profile.business.expenses_kes.toLocaleString()}` },
  { label: "Operating surplus", icon: CalendarDays, value: (profile) => `KES ${profile.business.operating_surplus_kes.toLocaleString()}` },
  { label: "Recorded borrowing estimate", icon: UserRoundCheck, value: (profile) => `KES ${profile.business.existing_obligations_kes.toLocaleString()}` },
];

export default function CreditPage() {
  const [profile, setProfile] = useState<ReadinessProfile | null>(null);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConsent, setSavingConsent] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  async function loadProfile() {
    try {
      const [profileResponse, consentResponse] = await Promise.all([
        apiRequest<ReadinessProfile>("/api/v1/profiles/me", undefined, "agripreneur"),
        apiRequest<{ consents: Consent[] }>("/api/v1/consents", undefined, "agripreneur"),
      ]);
      setProfile(profileResponse);
      setConsents(consentResponse.consents);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The business profile could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function grantConsent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const expiresDate = String(form.get("expiresAt") ?? "");
    setSavingConsent(true);
    setFeedback("");
    try {
      await apiRequest("/api/v1/consents", {
        method: "POST",
        body: JSON.stringify({
          lenderId: "demo-lender-001",
          purpose: String(form.get("purpose")),
          expiresAt: new Date(`${expiresDate}T23:59:59Z`).toISOString(),
        }),
      }, "agripreneur");
      await loadProfile();
      setFeedback("Time-limited synthetic consent granted and recorded. Revoke it at any time below.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Consent could not be granted.");
    } finally {
      setSavingConsent(false);
    }
  }

  async function revokeConsent(consentId: string) {
    setSavingConsent(true);
    setFeedback("");
    try {
      await apiRequest(`/api/v1/consents/${encodeURIComponent(consentId)}`, { method: "DELETE" }, "agripreneur");
      await loadProfile();
      setFeedback("Consent revoked. The lender can no longer access the profile.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Consent could not be revoked.");
    } finally {
      setSavingConsent(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Badge variant="info"><HandCoins size={13} /> My business</Badge>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Review your finance profile</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review your records, prepare an application summary and choose whether to share a profile with a named lender.
          </p>
        </div>
        <Badge variant="warning"><UserRoundCheck size={14} /> Human review required</Badge>
      </section>

      <div role="note" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={19} />
        <div>
          <p className="text-sm font-semibold">This is not a lending decision.</p>
          <p className="mt-1 text-sm leading-6 text-amber-900/80">
            EKYAN decision support must not approve or reject applicants or recommend a loan amount. Lenders remain responsible for underwriting.
          </p>
        </div>
      </div>

      <StatusNotice tone="warning" title="Synthetic business records · not a credit decision">
        This profile summarizes synthetic, self-reported records. It does not calculate creditworthiness or predict approval.
      </StatusNotice>
      {error && <StatusNotice tone="error" title="Profile action failed">{error}</StatusNotice>}
      {feedback && <StatusNotice tone="success" title="Consent updated">{feedback}</StatusNotice>}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Business activity summary</CardTitle>
                <CardDescription>{PILOT.county} · {PILOT.valueChain} pilot · synthetic agripreneur profile</CardDescription>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <FileCheck2 size={20} />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {BUSINESS_METRICS.map(({ label, icon: MetricIcon, value }) => (
                <div key={label} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700">{label}</p>
                    <MetricIcon aria-hidden="true" className="text-brand-700" size={16} />
                  </div>
                  <p className="mt-3 text-xl font-semibold text-slate-900">{loading ? "…" : profile ? value(profile) : "Unavailable"}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{profile ? "Synthetic recorded activity" : loading ? "Loading profile…" : "No source records"}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Record coverage", profile ? `${profile.record_coverage.months_with_entries} of ${profile.record_coverage.months_in_period} months · ${profile.record_coverage.entry_count} entries` : loading ? "Loading…" : "Unavailable"],
                ["Unpaid income", profile ? `KES ${profile.business.unpaid_income_kes.toLocaleString()}` : loading ? "Loading…" : "Unavailable"],
                ["Unpaid expenses", profile ? `KES ${profile.business.unpaid_expenses_kes.toLocaleString()}` : loading ? "Loading…" : "Unavailable"],
                ["Reporting period", profile ? `${profile.period.from} to ${profile.period.to}` : loading ? "Loading…" : "Unavailable"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">{label}</p>
                  <p className="mt-1 text-xs text-slate-500">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-700">Evidence and seasonality</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{profile?.decision_notice ?? "Monthly records are self-reported unless explicitly verified. A month without entries is not treated as zero business activity."}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Human review checklist</CardTitle>
            <CardDescription>Required safeguards before a lender receives a profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {REVIEW_STEPS.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E4F3EA] text-xs font-semibold text-[#176B45]">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm leading-5 text-slate-600">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              <LockKeyhole className="mt-0.5 shrink-0 text-slate-400" size={15} />
              <span>Consent changes and profile access must be auditable. Protected characteristics are not individual assessment inputs.</span>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs font-medium text-slate-400">
              <CheckCircle2 size={15} className="text-emerald-600" />
              No automated approvals are produced
              <ArrowRight size={14} className="ml-auto" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Record coverage checklist</CardTitle>
            <CardDescription>These checks describe the records entered; they do not measure creditworthiness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(profile?.record_checks ?? []).map((check) => (
              <div key={check.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                <span className="text-xs font-medium text-slate-700">
                  {check.id === "income_records" ? "Months with income entries" : check.id === "expense_records" ? "Months with expense entries" : "Unpaid records without a due date"}
                </span>
                <Badge variant={check.status === "complete" ? "success" : "warning"}>{check.count}</Badge>
              </div>
            ))}
            {loading && <p role="status" className="text-xs text-slate-500">Loading record checks…</p>}
            {!loading && !profile?.record_checks.length && <p className="text-xs text-slate-500">Record checks are unavailable.</p>}
            <p className="text-xs leading-5 text-slate-500">No records may mean seasonal activity or missing entries. Confirm your records; no score or approval prediction is produced.</p>
            <Link href="/business-book" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
              Open business book <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consent to share with a lender</CardTitle>
            <CardDescription>Participant-controlled, specific, time-limited and revocable.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <LockKeyhole aria-hidden="true" className="text-brand-700" size={17} />
                Participant-controlled consent
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Grant access only to the named synthetic lender and purpose. The backend records access, expiry and revocation.
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                {[
                  ["Lender", "Demo Lender"],
                  ["Purpose", "Finance record review"],
                  ["Fields shared", "Business records summary"],
                  ["Expiry", "Choose up to 90 days"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-white p-2">
                    <dt className="font-semibold text-slate-600">{label}</dt>
                    <dd className="mt-0.5 text-slate-500">{value}</dd>
                  </div>
                ))}
              </dl>
              <form onSubmit={(event) => void grantConsent(event)} className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Purpose
                  <select name="purpose" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
                    <option value="finance_readiness_review">Finance record review</option>
                    <option value="input_finance_assessment">Input finance assessment</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Consent expiry
                  <input name="expiresAt" type="date" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} max={new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)} required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal" />
                </label>
                <button type="submit" disabled={savingConsent || loading} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
                  {savingConsent && <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />}
                  Grant synthetic consent
                </button>
              </form>
              <div className="mt-4 space-y-2">
                {consents.map((consent) => (
                  <div key={consent.id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-xs">
                    <span className="min-w-0">
                      <strong className="block text-slate-700">{consent.purpose.replaceAll("_", " ")}</strong>
                      <span className="text-slate-500">{consent.active ? "Active" : consent.revokedAt ? "Revoked" : "Expired"} · ends {new Date(consent.expiresAt).toLocaleDateString()}</span>
                    </span>
                    {consent.active && <button type="button" disabled={savingConsent} onClick={() => void revokeConsent(consent.id)} className="min-h-9 shrink-0 rounded-lg border border-rose-200 px-3 font-semibold text-rose-800 disabled:opacity-50">Revoke</button>}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">The lender view remains empty until the backend verifies active consent for that lender and purpose.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
