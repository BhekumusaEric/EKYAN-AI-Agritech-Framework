import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardCheck, ShieldCheck, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";

const PROFILE_SECTIONS = [
  {
    title: "Verified business activity",
    description: "Sales, purchases, services and orders with evidence status and reporting period.",
    icon: ClipboardCheck,
  },
  {
    title: "Enterprise and impact context",
    description: "Value chain, operating area and verified programme outcomes, with missing data disclosed.",
    icon: BarChart3,
  },
  {
    title: "Consent and human due diligence",
    description: "Access only after explicit participant consent; this profile is not a credit or investment decision.",
    icon: ShieldCheck,
  },
];

export default function InvestorPage() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section>
        <Badge variant="info"><Sprout aria-hidden="true" size={14} /> Investor workspace preview</Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Opportunity profile · evidence first</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          The intended profile brings verified business and programme evidence together for human due diligence—not an automated funding recommendation.
        </p>
      </section>

      <StatusNotice tone="warning" title="No investor profiles or opportunities are connected">
        This synthetic UI does not contain real enterprise records, investment offers, participant consent or verified impact results. No financial decision can be made from this preview.
      </StatusNotice>

      <section className="grid gap-5 md:grid-cols-3">
        {PROFILE_SECTIONS.map(({ title, description, icon: Icon }) => (
          <Card key={title}>
            <CardHeader>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                <Icon aria-hidden="true" size={20} />
              </span>
              <CardTitle className="pt-2">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Profile readiness</CardTitle>
          <CardDescription>Evidence remains unavailable until approved data sources and consent controls are connected.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {["Business records", "Verified outcome evidence", "Explicit participant consent"].map((item) => (
            <div key={item} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
              <span className="text-sm font-medium text-slate-700">{item}</span>
              <Badge variant="neutral">Not connected</Badge>
            </div>
          ))}
          <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            A future profile must disclose evidence sources, reporting period, missing fields and limitations. Investors retain responsibility for due diligence.
          </p>
          <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 hover:text-brand-950">
            View programme KPI definitions <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
