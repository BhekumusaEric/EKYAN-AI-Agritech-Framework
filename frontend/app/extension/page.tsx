"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, LoaderCircle, MapPin, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { apiRequest } from "@/lib/api";

type WorkflowStatus = "Open" | "Acknowledged" | "In Progress" | "Resolved" | "Cannot Resolve" | "Closed";
type ExtensionRecord = {
  id: string;
  category: string;
  summary: string;
  ward: string;
  due: string;
  urgency: "Low" | "Medium" | "High";
  status: WorkflowStatus;
  note: string;
  farmerConfirmed: boolean;
  feedback: string;
};

export default function ExtensionPage() {
  const [records, setRecords] = useState<ExtensionRecord[]>([]);
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
      urgency: "low" | "medium" | "high";
      status: string;
      farmerConfirmed: boolean;
    }[] }>("/api/v1/blockers", undefined, "extension_officer")
      .then((response) => {
        if (!active) return;
        setRecords(response.blockers.map((record) => ({
          id: record.id,
          category: record.category,
          summary: record.description ?? "Description hidden",
          ward: record.ward,
          due: new Date(record.dueAt).toLocaleDateString(),
          urgency: record.urgency[0].toUpperCase() + record.urgency.slice(1) as ExtensionRecord["urgency"],
          status: ({
            open: "Open",
            acknowledged: "Acknowledged",
            in_progress: "In Progress",
            resolved: "Resolved",
            cannot_resolve: "Cannot Resolve",
            closed: "Closed",
          } as Record<string, WorkflowStatus>)[record.status] ?? "Open",
          note: "",
          farmerConfirmed: record.farmerConfirmed,
          feedback: "",
        })));
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "The assigned blocker queue could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function setStatus(id: string, status: WorkflowStatus) {
    setRecords((current) =>
      current.map((record) =>
        record.id === id
          ? {
              ...record,
              status,
              farmerConfirmed: status === "Closed" ? record.farmerConfirmed : false,
              feedback: "",
            }
          : record
      )
    );
  }

  async function saveStatus(id: string) {
    const record = records.find((item) => item.id === id);
    if (!record) return;
    if ((record.status === "Resolved" || record.status === "Cannot Resolve" || record.status === "Closed") && !record.note.trim()) {
      setRecords((current) => current.map((item) =>
        item.id === id ? { ...item, feedback: "Add a resolution note before saving this status." } : item
      ));
      return;
    }
    if ((record.status === "Resolved" || record.status === "Closed") && !record.farmerConfirmed) {
      setRecords((current) => current.map((item) =>
        item.id === id ? { ...item, feedback: "Ask the agripreneur to confirm that the resolution was effective." } : item
      ));
      return;
    }
    setSavingId(id);
    try {
      const statuses: Record<WorkflowStatus, string> = {
        Open: "open",
        Acknowledged: "acknowledged",
        "In Progress": "in_progress",
        Resolved: "resolved",
        "Cannot Resolve": "cannot_resolve",
        Closed: "closed",
      };
      await apiRequest(`/api/v1/blockers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: statuses[record.status],
          resolutionNote: record.note,
          farmerConfirmed: record.farmerConfirmed,
        }),
      }, "extension_officer");
      setRecords((current) => current.map((item) =>
        item.id === id ? { ...item, feedback: `Saved “${record.status}” to the synthetic backend.` } : item
      ));
    } catch (cause) {
      setRecords((current) => current.map((item) =>
        item.id === id ? { ...item, feedback: cause instanceof Error ? `Could not save: ${cause.message}` : "Could not save this update." } : item
      ));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section>
        <Badge variant="info"><ClipboardCheck aria-hidden="true" size={14} /> Extension workspace</Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Assigned blockers by urgency</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Review a synthetic queue, record progress, and close the loop only after the agripreneur confirms the outcome.
        </p>
      </section>

      <StatusNotice tone="warning" title="Synthetic assigned queue">
        These are synthetic cases assigned to this demo officer. Status updates and audit events are saved to the local backend only.
      </StatusNotice>
      {error && <StatusNotice tone="error" title="Could not load assigned cases">{error}</StatusNotice>}

      {loading && <div role="status" className="flex items-center gap-2 text-sm text-slate-600"><LoaderCircle className="animate-spin" size={16} />Loading assigned blockers…</div>}
      {!loading && !error && !records.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No blockers are currently assigned to this extension officer.</p>}
      <div className="space-y-4">
        {records.map((record) => (
          <Card key={record.id}>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{record.summary}</CardTitle>
                <CardDescription className="mt-1">{record.id} · Busia · synthetic case</CardDescription>
              </div>
              <Badge variant={record.urgency === "High" ? "danger" : record.urgency === "Medium" ? "warning" : "neutral"}>
                {record.urgency} urgency
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" size={14} />{record.ward}</span>
                <span>Category: <strong>{record.category}</strong></span>
                <span>{record.due}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.3fr)]">
                <label className="text-xs font-semibold text-slate-600">
                  Workflow status
                  <select
                    value={record.status}
                    onChange={(event) => setStatus(record.id, event.target.value as WorkflowStatus)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800"
                  >
                    {["Open", "Acknowledged", "In Progress", "Resolved", "Cannot Resolve", "Closed"].map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Resolution note
                  <input
                    value={record.note}
                    onChange={(event) => setRecords((current) => current.map((item) =>
                      item.id === record.id ? { ...item, note: event.target.value, feedback: "" } : item
                    ))}
                    placeholder="Describe the action or why it could not be resolved"
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal"
                  />
                </label>
              </div>
              {(record.status === "Resolved" || record.status === "Closed") && (
                <label className="mt-3 flex min-h-11 items-start gap-2 text-xs leading-5 text-slate-600">
                  <input
                    type="checkbox"
                    checked={record.farmerConfirmed}
                    onChange={(event) => setRecords((current) => current.map((item) =>
                      item.id === record.id ? { ...item, farmerConfirmed: event.target.checked, feedback: "" } : item
                    ))}
                    className="mt-1 h-4 w-4 accent-brand-700"
                  />
                  The agripreneur confirmed that the resolution was effective for the farmer.
                </label>
              )}
              <button
                type="button"
                onClick={() => void saveStatus(record.id)}
                disabled={savingId === record.id}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-200 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-50"
              >
                {savingId === record.id && <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />}
                Save update
              </button>
              {record.feedback && (
                <p role="status" className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-xs leading-5 ${record.feedback.startsWith("Add") || record.feedback.startsWith("Ask") || record.feedback.startsWith("Could not") ? "bg-rose-50 text-rose-950" : "bg-sky-50 text-sky-950"}`}>
                  <ShieldAlert aria-hidden="true" className="mt-0.5 shrink-0" size={15} />
                  {record.feedback}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
