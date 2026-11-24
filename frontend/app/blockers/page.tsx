"use client";

import { useEffect, useState } from "react";
import { ClipboardList, LoaderCircle, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { apiRequest } from "@/lib/api";

type Status = "Open" | "Acknowledged" | "In Progress" | "Resolved" | "Cannot Resolve" | "Closed";

const STATUSES: Status[] = ["Open", "Acknowledged", "In Progress", "Resolved", "Cannot Resolve", "Closed"];

type BlockerRecord = {
  id: string;
  category: string;
  summary: string;
  ward: string;
  due: string;
  routeTo: string;
  urgency: "Low" | "Medium" | "High";
  status: Status;
  farmerConfirmed: boolean;
  note: string;
  feedback: string;
};

const API_STATUSES: Record<string, Status> = {
  open: "Open",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  resolved: "Resolved",
  cannot_resolve: "Cannot Resolve",
  closed: "Closed",
};

const API_ROUTES: Record<Status, string> = {
  Open: "open",
  Acknowledged: "acknowledged",
  "In Progress": "in_progress",
  Resolved: "resolved",
  "Cannot Resolve": "cannot_resolve",
  Closed: "closed",
};

const statusStyle: Record<Status, "warning" | "info" | "success" | "danger" | "neutral"> = {
  Open: "warning",
  Acknowledged: "info",
  "In Progress": "info",
  Resolved: "success",
  "Cannot Resolve": "danger",
  Closed: "neutral",
};

export default function BlockersPage() {
  const [records, setRecords] = useState<BlockerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void apiRequest<{ blockers: {
      id: string;
      category: string;
      description: string | null;
      ward: string;
      dueAt: string;
      routeTo: string;
      urgency: "low" | "medium" | "high";
      status: string;
      farmerConfirmed: boolean;
    }[] }>("/api/v1/blockers", undefined, "agripreneur")
      .then((response) => {
        if (!active) return;
        setRecords(response.blockers.map((blocker) => ({
          id: blocker.id,
          category: blocker.category,
          summary: blocker.description ?? "Description hidden",
          ward: blocker.ward,
          due: new Date(blocker.dueAt).toLocaleDateString(),
          routeTo: blocker.routeTo,
          urgency: blocker.urgency[0].toUpperCase() + blocker.urgency.slice(1) as BlockerRecord["urgency"],
          status: API_STATUSES[blocker.status] ?? "Open",
          farmerConfirmed: blocker.farmerConfirmed,
          note: "",
          feedback: "",
        })));
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "The blocker queue could not be loaded.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateBlocker(
    id: string,
    update: Partial<BlockerRecord>
  ) {
    setRecords((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));
  }

  async function saveStatus(id: string) {
    const record = records.find((item) => item.id === id);
    if (!record) return;
    if ((record.status === "Resolved" || record.status === "Cannot Resolve" || record.status === "Closed") && !record.note.trim()) {
      updateBlocker(id, { feedback: "Add a resolution note before closing this blocker." });
      return;
    }
    if ((record.status === "Resolved" || record.status === "Closed") && !record.farmerConfirmed) {
      updateBlocker(id, { feedback: "Ask the agripreneur to confirm that the resolution was effective." });
      return;
    }
    setSavingId(id);
    try {
      await apiRequest(`/api/v1/blockers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: API_ROUTES[record.status],
          resolutionNote: record.note,
          farmerConfirmed: record.farmerConfirmed,
        }),
      }, "agripreneur");
      updateBlocker(id, { feedback: `Status saved to the synthetic backend as “${record.status}”.` });
    } catch (cause) {
      updateBlocker(id, {
        feedback: cause instanceof Error ? cause.message : "The blocker status could not be saved.",
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section>
        <Badge variant="warning"><ClipboardList aria-hidden="true" size={14} /> Blocker resolution</Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Every blocker needs an owner</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Review the suggested category and route, confirm or correct it, then track the outcome with the farmer through their agripreneur.
        </p>
      </section>

      <StatusNotice tone="warning" title="Synthetic backend records">
        This queue contains synthetic-only records. Routing, status changes, audit entries and notifications are saved to the local demo backend.
      </StatusNotice>
      <StatusNotice tone="info" title="Routing remains a human decision">
        The agripreneur confirms the category and urgency when creating a blocker. Resolution still requires a note and farmer/agripreneur confirmation.
      </StatusNotice>

      <Card>
        <CardHeader>
          <CardTitle>Blockers awaiting action</CardTitle>
          <CardDescription>Human confirmation is required before a suggested route is treated as an assignment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <div role="status" className="flex items-center gap-2 text-sm text-slate-600"><LoaderCircle className="animate-spin" size={16} />Loading synthetic blockers…</div>}
          {error && <StatusNotice tone="error" title="Could not load blockers">{error}</StatusNotice>}
          {!loading && !error && !records.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No blockers are currently assigned to this agripreneur.</p>}
          {records.map((record) => (
            <article key={record.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{record.summary}</h2>
                    <Badge variant={record.urgency === "High" ? "danger" : record.urgency === "Medium" ? "warning" : "neutral"}>
                      {record.urgency} urgency
                    </Badge>
                    <Badge variant={statusStyle[record.status]}>{record.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {record.id} · Busia · {record.ward} · {record.due} · synthetic record
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                  <UserCheck aria-hidden="true" size={14} /> Agripreneur proxy report
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Confirmed category</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{record.category}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Route owner</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{record.routeTo.replaceAll("_", " ")}</p>
                </div>
                <div className="rounded-xl bg-sky-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">Response deadline</p>
                  <p className="mt-1 text-sm font-medium text-sky-950">{record.due}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
                <label className="text-xs font-semibold text-slate-600">
                  Workflow status
                  <select
                    value={record.status}
                    onChange={(event) => {
                      const status = event.target.value as Status;
                      updateBlocker(record.id, {
                        status,
                        farmerConfirmed: status === "Closed" ? record.farmerConfirmed : false,
                        feedback: "",
                      });
                    }}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800"
                  >
                    {STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Resolution / follow-up note
                  <input
                    value={record.note}
                    onChange={(event) => updateBlocker(record.id, { note: event.target.value, feedback: "" })}
                    placeholder="Required when resolving or unable to resolve"
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void saveStatus(record.id)}
                  disabled={savingId === record.id}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-200 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {savingId === record.id && <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />}
                  Save update
                </button>
              </div>
              {(record.status === "Resolved" || record.status === "Closed") && (
                <label className="mt-3 flex min-h-11 items-start gap-2 text-xs leading-5 text-slate-600">
                  <input
                    type="checkbox"
                    checked={record.farmerConfirmed}
                    onChange={(event) => updateBlocker(record.id, { farmerConfirmed: event.target.checked, feedback: "" })}
                    className="mt-1 h-4 w-4 accent-brand-700"
                  />
                  The agripreneur confirmed that the resolution was effective for the farmer.
                </label>
              )}

              {record.feedback && (
                <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-xs ${record.feedback.includes("required") || record.feedback.includes("could not") ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>
                  {record.feedback}
                </p>
              )}
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
