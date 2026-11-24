import Link from "next/link";
import { ArrowRight, CloudSun, ShieldAlert, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";

export default function ClimatePage() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section>
        <Badge variant="info"><CloudSun aria-hidden="true" size={14} /> Planned service</Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Climate intelligence · Phase 2</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          The MVP prioritises field logging, blocker resolution and pooled poultry input demand. Weather and soil integrations are planned for a later phase.
        </p>
      </section>

      <StatusNotice tone="info" title="No live forecast or farm-condition data is shown">
        This screen has no weather, satellite or soil service connected. Do not use it to make planting, treatment or livestock decisions.
      </StatusNotice>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reuse existing services</CardTitle>
            <CardDescription>Connect through a replaceable ClimateAdapter after partner validation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Forecast", "Provider, timestamp and geographic precision"],
              ["Farm context", "Value chain, location and relevant production stage"],
              ["Guidance", "Source, confidence, expiry and escalation path"],
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
              <ShieldAlert aria-hidden="true" className="mt-0.5 shrink-0 text-amber-700" size={16} />
              No pesticide, veterinary or dosage instructions may be invented or displayed without an approved source.
            </p>
            <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              When the source is missing, confidence is low or risk is high, route the question to a qualified extension officer.
            </p>
            <Link href="/agronomist" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 hover:text-brand-950">
              Open Ask Nia bridge preview <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Link href="/field-log" className="flex min-h-14 items-center justify-between rounded-2xl border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-900 hover:bg-brand-100">
        <span className="inline-flex items-center gap-2"><Sprout aria-hidden="true" size={17} /> Continue to the Busia poultry field log</span>
        <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </div>
  );
}
