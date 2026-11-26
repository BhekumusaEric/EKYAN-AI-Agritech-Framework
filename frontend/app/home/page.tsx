"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Clock3,
  PackageCheck,
  Plus,
  Sprout,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { useLanguage } from "@/components/LanguageProvider";
import { apiRequest } from "@/lib/api";
import { PILOT } from "@/lib/mvp-preview";
import { translate } from "@/lib/i18n";

type Blocker = {
  id: string;
  category: string;
  description: string | null;
  ward: string;
  dueAt: string;
  overdue: boolean;
  urgency: "low" | "medium" | "high";
  status: string;
};

type FieldOrder = {
  id: string;
  item: string;
  quantity: number;
  neededBy: string;
  ward: string;
  status: "open" | "committed" | "fulfilled";
};

type WorkItem = {
  id: string;
  kind: "blocker" | "order";
  title: string;
  context: string;
  status: string;
  due: string;
  urgent: boolean;
};

const ACTIVE_BLOCKER_STATUSES = new Set(["open", "acknowledged", "in_progress"]);

function formatDate(value: string, language: "en" | "sw") {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(language === "sw" ? "sw-KE" : "en-KE", { day: "numeric", month: "short" });
}

export default function AgripreneurHomePage() {
  const { language } = useLanguage();
  const tr = (value: string) => translate(language, value);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [orders, setOrders] = useState<FieldOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiRequest<{ blockers: Blocker[] }>("/api/v1/blockers", undefined, "agripreneur"),
      apiRequest<{ orders: FieldOrder[] }>("/api/v1/orders", undefined, "agripreneur"),
    ])
      .then(([blockerResponse, orderResponse]) => {
        if (!active) return;
        setBlockers(blockerResponse.blockers);
        setOrders(orderResponse.orders);
        setError("");
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Your field activity could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const activeBlockers = blockers.filter((item) => ACTIVE_BLOCKER_STATUSES.has(item.status));
  const activeOrders = orders.filter((item) => item.status !== "fulfilled");
  const overdueCount = activeBlockers.filter((item) => item.overdue).length;

  const workItems = useMemo<WorkItem[]>(() => {
    const blockerItems = blockers
      .filter((item) => ACTIVE_BLOCKER_STATUSES.has(item.status))
      .map((item): WorkItem => ({
        id: item.id,
        kind: "blocker",
        title: item.description || `${item.category} support request`,
        context: `${item.category} · ${item.ward}`,
        status: item.status.replaceAll("_", " "),
        due: formatDate(item.dueAt, language),
        urgent: item.overdue || item.urgency === "high",
      }));
    const orderItems = orders
      .filter((item) => item.status !== "fulfilled")
      .map((item): WorkItem => ({
        id: item.id,
        kind: "order",
        title: `${item.quantity} · ${item.item}`,
        context: `Input request · ${item.ward}`,
        status: item.status === "committed" ? "Confirm delivery" : "Waiting for supplier",
        due: formatDate(item.neededBy, language),
        urgent: item.status === "committed",
      }));
    return [...blockerItems, ...orderItems].sort((a, b) => Number(b.urgent) - Number(a.urgent));
  }, [blockers, orders, language]);

  return (
    <div className="mx-auto max-w-[1180px] space-y-4 p-3 sm:space-y-6 sm:p-7 lg:p-9">
      <section className="relative overflow-hidden rounded-[24px] bg-[#143D32] p-5 text-white shadow-[0_18px_50px_rgba(16,44,38,0.14)] sm:rounded-[28px] sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="relative flex flex-col justify-between gap-4 sm:gap-6 sm:flex-row sm:items-end">
          <div>
            <Badge variant="inverse"><Sprout aria-hidden="true" size={14} /> {PILOT.county} · {tr(PILOT.valueChain)} {tr("pilot")}</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:mt-5 sm:text-4xl">{tr("Your field work, in one place.")}</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-emerald-50/80 sm:text-base sm:leading-6">
              {tr("Capture what is stopping a farmer, follow the response, and check whether it helped.")}
            </p>
          </div>
          <Link href="/field-log" className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#143D32] shadow-sm transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-12 sm:w-auto">
            <Plus aria-hidden="true" size={17} /> {tr("Record a need")}
          </Link>
        </div>
      </section>

      <StatusNotice tone="warning" title={tr("Synthetic demo records")}>
        {tr("This workspace uses fictional Busia poultry activity. Do not enter real participant information.")}
      </StatusNotice>
      {error && <StatusNotice tone="error" title={tr("Could not load field activity")}>{error}</StatusNotice>}

      <section aria-label={tr("Pilot activity")} className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
        <MetricCard icon={CircleAlert} label={tr("Needs awaiting response")} value={loading ? "…" : String(activeBlockers.length)} detail={overdueCount ? `${overdueCount} ${tr("overdue")}` : tr("Assigned for follow-up")} tone={overdueCount ? "amber" : "sky"} />
        <MetricCard icon={PackageCheck} label={tr("Input requests in progress")} value={loading ? "…" : String(activeOrders.length)} detail={tr("Waiting for supply or delivery confirmation")} tone="green" />
        <div className="hidden md:block"><MetricCard icon={CheckCircle2} label={tr("Farmer confirmation")} value={tr("Close the loop")} detail={tr("Record whether the response actually helped")} tone="slate" /></div>
      </section>

      <section className="grid gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <Card>
          <CardHeader className="!p-4 sm:!p-6">
            <div>
              <CardTitle>{tr("Next actions")}</CardTitle>
              <CardDescription>{tr("Start with blockers that are overdue and input requests waiting on a response.")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="!p-4 sm:!p-6">
            {loading ? (
              <div role="status" className="flex min-h-28 items-center gap-2 text-sm text-slate-500"><Clock3 aria-hidden="true" size={16} />{tr("Loading your requests…")}</div>
            ) : workItems.length ? (
              <ul className="divide-y divide-slate-100">
                {workItems.slice(0, 5).map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="flex flex-col gap-2 py-3 first:pt-1 last:pb-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.kind === "blocker" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"}`}>
                        {item.kind === "blocker" ? <ClipboardList aria-hidden="true" size={17} /> : <PackageCheck aria-hidden="true" size={17} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">{item.title}</span>
                        <span className="mt-1 block text-xs text-slate-500">{tr(item.context.split(" · ")[0])} · {tr(item.context.split(" · ")[1])}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 pl-12 sm:shrink-0 sm:pl-0">
                      <Badge variant={item.urgent ? "warning" : "neutral"}>{tr(item.status)}</Badge>
                      <span className="text-xs tabular-nums text-slate-500">{item.due}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                <CheckCircle2 aria-hidden="true" className="mx-auto text-emerald-700" size={24} />
                <p className="mt-3 text-sm font-semibold text-slate-800">{tr("You are up to date")}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{tr("New blocker and input requests will show here when they need follow-up.")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hidden border-brand-100 bg-[#F5FAF6] lg:block">
          <CardHeader>
            <CardTitle>{tr("Two useful actions")}</CardTitle>
            <CardDescription>{tr("Keep the farmer’s next step moving.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ActionLink href="/field-log" icon={Plus} title={tr("Report a blocker or request an input")} detail={tr("Capture it once, even offline.")} />
            <ActionLink href="/blockers" icon={ClipboardList} title={tr("Check a request")} detail={tr("See who owns it and what happens next.")} />
            <Link href="/business-book" className="mt-2 flex min-h-11 items-center justify-between rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-white hover:text-brand-800">
              {tr("Keep business records")} <ArrowRight aria-hidden="true" size={14} />
            </Link>
          </CardContent>
        </Card>
      </section>

      <p className="hidden text-center text-xs text-slate-400 sm:block">{PILOT.county} {tr("County")} · {tr(PILOT.valueChain)} · English and Kiswahili</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof CircleAlert;
  label: string;
  value: string;
  detail: string;
  tone: "amber" | "sky" | "green" | "slate";
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-900",
    sky: "bg-sky-50 text-sky-900",
    green: "bg-emerald-50 text-emerald-900",
    slate: "bg-slate-100 text-slate-800",
  }[tone];
  return (
    <Card className="shadow-none">
      <CardContent className="p-3 sm:flex sm:items-start sm:gap-3 sm:p-5">
        <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${toneClass}`}><Icon aria-hidden="true" size={19} /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium leading-4 text-slate-500 sm:text-xs">{label}</p>
          <p className="mt-1 text-base font-semibold leading-5 text-slate-900 sm:text-lg sm:leading-6">{value}</p>
          <p className="mt-1 hidden text-[11px] leading-4 text-slate-500 sm:block">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionLink({
  href,
  icon: Icon,
  title,
  detail,
}: {
  href: string;
  icon: typeof Plus;
  title: string;
  detail: string;
}) {
  return (
    <Link href={href} className="group flex min-h-[68px] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-brand-200 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800"><Icon aria-hidden="true" size={17} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold leading-5 text-slate-800">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{detail}</span>
      </span>
      <ArrowRight aria-hidden="true" className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-700" size={15} />
    </Link>
  );
}
