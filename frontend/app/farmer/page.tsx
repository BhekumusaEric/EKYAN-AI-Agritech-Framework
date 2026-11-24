"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bird, CalendarDays, CircleHelp, MapPin, Package, ShieldCheck, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { useLanguage } from "@/components/LanguageProvider";
import { FARMER_PREVIEW_SCENARIOS } from "@/lib/farmer-preview-data";
import { translate as t } from "@/lib/i18n";

export default function FarmerPreviewPage() {
  const { language } = useLanguage();
  const [scenarioId, setScenarioId] = useState(FARMER_PREVIEW_SCENARIOS[0].id);
  const scenario = FARMER_PREVIEW_SCENARIOS.find((item) => item.id === scenarioId) ?? FARMER_PREVIEW_SCENARIOS[0];
  const tr = (text: string) => t(language, text);

  const orderStatus = scenario.inputStatus === "waiting"
    ? "Waiting for supplier confirmation"
    : "Supplier confirmed · collection pending";
  const supportStatus = {
    assigned: "Assigned for extension follow-up",
    inProgress: "In progress · update through your agripreneur",
    resolved: "Resolved · confirmed in this demo",
  }[scenario.supportStatus];

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-7 lg:p-9">
      <section className="rounded-[28px] bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-6 text-white shadow-[0_18px_50px_rgba(16,44,38,0.16)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="inverse"><Sprout aria-hidden="true" size={14} />{tr("Farmer home · demo")}</Badge>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">{tr("Busia County")} · {tr("Poultry")}</span>
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{tr("Farmer home")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/85 sm:text-base">
          {tr("A simple view of your farm requests and next steps.")}
        </p>
      </section>

      <StatusNotice tone="warning" title={tr("This is a fictional example, not a real farmer record.")}>
        {tr("No real farm or market data is connected.")} {tr("No farmer login or direct request submission is enabled in this MVP. Your agripreneur can record a request with your consent.")}
      </StatusNotice>

      <Card>
        <CardHeader>
          <CardTitle>{tr("Sample farm")}</CardTitle>
          <CardDescription>{tr("Choose a fictional farm")}</CardDescription>
        </CardHeader>
        <CardContent>
          <label htmlFor="farmer-demo-scenario" className="block text-sm font-semibold text-slate-700">
            {tr("Sample farm")}
            <select
              id="farmer-demo-scenario"
              value={scenarioId}
              onChange={(event) => setScenarioId(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-normal text-slate-800 sm:max-w-md"
            >
              {FARMER_PREVIEW_SCENARIOS.map((item) => (
                <option key={item.id} value={item.id}>{tr(item.label)} · {tr(item.ward)}</option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardDescription>{tr("Farm location")}</CardDescription>
              <CardTitle className="mt-1 flex items-center gap-2 text-lg">
                <MapPin aria-hidden="true" size={18} className="text-brand-700" />{scenario.ward}
              </CardTitle>
            </div>
            <Badge variant="neutral">{tr("Sample only · no GPS location")}</Badge>
          </CardHeader>
          <CardContent className="flex items-center gap-3 rounded-xl bg-brand-50 p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-700"><Bird aria-hidden="true" size={22} /></span>
            <div>
              <p className="text-sm font-semibold text-brand-950">{tr("Flock size")}</p>
              <p className="text-sm text-brand-800">{scenario.flockSize} {tr("birds")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{tr("Input request")}</CardDescription>
            <CardTitle className="mt-1 flex items-center gap-2 text-lg">
              <Package aria-hidden="true" size={19} className="text-amber-700" />{tr(scenario.input)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">{scenario.inputQuantity} {tr(scenario.input === "Feed (bags)" ? "bags" : scenario.input === "Vaccines (doses)" ? "doses" : "chicks")}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Badge variant={scenario.inputStatus === "confirmed" ? "success" : "warning"}>{tr(orderStatus)}</Badge>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <CalendarDays aria-hidden="true" size={14} />
                {tr(scenario.inputTiming === "thisWeek" ? "Needed this week" : "Needed next week")}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardDescription>{tr("Support request")}</CardDescription>
            <CardTitle className="mt-1 flex items-center gap-2 text-lg">
              <CircleHelp aria-hidden="true" size={19} className="text-sky-700" />{tr(scenario.supportIssue)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tr("Request status")}</p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-800">{tr(supportStatus)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{tr("Next step")}</CardDescription>
            <CardTitle className="mt-1 flex items-center gap-2 text-lg">
              <ShieldCheck aria-hidden="true" size={19} className="text-emerald-700" />{tr("Your data and consent")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-700">{tr("Ask your agripreneur for an update. This preview does not send a message or create a request.")}</p>
            <p className="mt-3 text-xs leading-5 text-slate-500">{tr("The demo contains no real names, phone numbers, or live partner updates.")}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-brand-100 bg-brand-50/50">
        <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold text-slate-900">{tr("For the agripreneur supporting this farmer")}</p>
            <p className="mt-1 text-sm leading-5 text-slate-600">{tr("Use the field log to record a request only after the farmer agrees.")}</p>
          </div>
          <Link href="/field-log" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
            {tr("Open field log")} <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
