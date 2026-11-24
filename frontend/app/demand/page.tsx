"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, LoaderCircle, MapPin, PackageCheck, ShoppingBasket, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { PILOT } from "@/lib/mvp-preview";
import { apiRequest } from "@/lib/api";

type DemandGroup = {
  id: string;
  item: string;
  county: string;
  ward: string;
  weekStart: string;
  totalQuantity: number;
  remainingQuantity: number;
  farmerCount: number;
  agripreneurCount: number;
  status: string;
};

export default function DemandPage() {
  const [committing, setCommitting] = useState<string | null>(null);
  const [groups, setGroups] = useState<DemandGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function loadGroups() {
    try {
      const response = await apiRequest<{ demandGroups: DemandGroup[] }>("/api/v1/demand-groups", undefined, "supplier");
      setGroups(response.demandGroups);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pooled demand could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGroups();
  }, []);

  async function submitCommitment(event: FormEvent<HTMLFormElement>, demandId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const quantity = Number(form.get("quantity"));
    const price = Number(form.get("price"));
    const evidence = String(form.get("evidence") ?? "").trim();
    const deliveryDate = String(form.get("deliveryDate") ?? "");
    const group = groups.find((item) => item.id === demandId);
    if (!group || !Number.isFinite(quantity) || quantity <= 0 || quantity > group.remainingQuantity || !Number.isFinite(price) || price <= 0 || !evidence.toLowerCase().startsWith("synthetic-") || !deliveryDate) {
      setFeedback({ tone: "error", message: "Enter a quantity within remaining demand, a positive unit price, a future delivery date, and a synthetic evidence reference." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await apiRequest(`/api/v1/demand-groups/${encodeURIComponent(demandId)}/commitments`, {
        method: "POST",
        body: JSON.stringify({
          quantity,
          unitPriceKes: price,
          qualityEvidenceRef: evidence,
          deliveryDate,
        }),
      }, "supplier");
      await loadGroups();
      setCommitting(null);
      setFeedback({ tone: "success", message: "Supplier commitment saved to the synthetic backend. Any agripreneur notification is recorded locally." });
    } catch (cause) {
      setFeedback({
        tone: "error",
        message: cause instanceof Error ? cause.message : "The supplier commitment could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section>
        <Badge variant="success"><ShoppingBasket aria-hidden="true" size={14} /> Supplier workspace</Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Pooled poultry input demand</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          See demand grouped by item, area and required window—without farmer names or phone numbers.
        </p>
      </section>

      <StatusNotice tone="warning" title="Synthetic aggregate data">
        All quantities and supplier records are synthetic. Commitments are saved only to the local demo backend; no real supplier or farmer is contacted.
      </StatusNotice>

      {feedback && <StatusNotice tone={feedback.tone} title={feedback.tone === "success" ? "Demo commitment recorded" : "Commitment not saved"}>{feedback.message}</StatusNotice>}
      {error && <StatusNotice tone="error" title="Demand service unavailable">{error}</StatusNotice>}

      <div className="grid gap-5 lg:grid-cols-2">
        {loading && <div role="status" className="flex items-center gap-2 text-sm text-slate-600"><LoaderCircle className="animate-spin" size={16} />Loading pooled demand…</div>}
        {!loading && !error && !groups.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">There is no open pooled demand yet.</p>}
        {groups.map((group) => {
          const isCommitted = group.remainingQuantity <= 0;
          return (
            <Card key={group.id} className="overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-brand-500 via-harvest to-sky" />
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{group.item}</CardTitle>
                    <CardDescription className="mt-1">{group.id} · synthetic demand group</CardDescription>
                  </div>
                  <Badge variant={isCommitted ? "success" : "warning"}>{isCommitted ? "Demo commitment" : "Open demand"}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-brand-50 p-4">
                    <p className="text-xs font-medium text-brand-800">Pooled quantity</p>
                    <p className="mt-1 text-2xl font-semibold text-brand-900">{group.remainingQuantity}</p>
                    <p className="text-xs text-brand-800">{group.item.match(/bags/i) ? "bags" : "doses"}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-4">
                    <p className="text-xs font-medium text-amber-900">Farmers represented</p>
                    <p className="mt-1 text-2xl font-semibold text-amber-950">{group.farmerCount}</p>
                    <p className="text-xs text-amber-900">aggregate only</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" size={14} />{group.ward}, {group.county || PILOT.county}</span>
                  <span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" size={14} />Week of {group.weekStart}</span>
                  <span className="inline-flex items-center gap-1.5"><Users aria-hidden="true" size={14} />{group.agripreneurCount} agripreneurs</span>
                </div>

                {committing === group.id ? (
                  <form onSubmit={(event) => void submitCommitment(event, group.id)} className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-600">
                      Quantity committed
                      <input name="quantity" type="number" min="0.01" step="0.01" max={group.remainingQuantity} required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                      Unit price (KES)
                      <input name="price" type="number" min="0.01" step="0.01" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                      Proposed delivery date
                      <input name="deliveryDate" type="date" min={new Date().toISOString().slice(0, 10)} required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" />
                    </label>
                    <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                      Quality / product evidence reference
                      <input name="evidence" required pattern="synthetic-.+" placeholder="synthetic-document-001" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" />
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
                        {saving && <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />}
                        Save commitment
                      </button>
                      <button type="button" onClick={() => setCommitting(null)} className="min-h-11 rounded-xl px-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      setCommitting(group.id);
                    }}
                    disabled={isCommitted}
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-200 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PackageCheck aria-hidden="true" size={17} />
                    {isCommitted ? "Saved in preview" : "Prepare supplier commitment"}
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Four-week demand forecast</CardTitle>
          <CardDescription>Moving-average estimate per item and area; requires verified history before values can be shown.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {["Week 1", "Week 2", "Week 3", "Week 4"].map((week) => (
              <div key={week} className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-600">{week}</p>
                <p className="mt-2 text-slate-400">Not calculated</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Forecasts must be labelled estimates and should never be presented as confirmed demand.</p>
        </CardContent>
      </Card>
    </div>
  );
}
