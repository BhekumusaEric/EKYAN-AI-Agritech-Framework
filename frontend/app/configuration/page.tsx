"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { LoaderCircle, Plus, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { PILOT } from "@/lib/mvp-preview";
import { apiRequest } from "@/lib/api";

export default function ConfigurationPage() {
  const [inputs, setInputs] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newInput, setNewInput] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRequests, setUserRequests] = useState<{ id: string; displayName: string; email: string; role: string; createdAt: string }[]>([]);

  const loadConfiguration = useCallback(async () => {
    try {
      const [response, requests] = await Promise.all([
        apiRequest<{ items: Record<string, { name: string }[]> }>("/api/v1/config"),
        apiRequest<{ users: typeof userRequests }>("/api/v1/admin/user-requests"),
      ]);
      setInputs((response.items.input ?? []).map((item) => item.name));
      setCategories((response.items.blocker_category ?? []).map((item) => item.name));
      setUserRequests(requests.users);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pilot configuration could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function reviewAccount(userId: string, status: "approved" | "rejected") {
    setSaving(true); setError("");
    try {
      await apiRequest(`/api/v1/admin/user-requests/${encodeURIComponent(userId)}`, {
        method: "POST", body: JSON.stringify({ status }),
      });
      setMessage(status === "approved" ? "Account approved. The user can now sign in." : "Account request declined.");
      await loadConfiguration();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The account request could not be reviewed.");
    } finally { setSaving(false); }
  }

  useEffect(() => {
    void loadConfiguration();
  }, [loadConfiguration]);

  async function addValue(event: FormEvent<HTMLFormElement>, type: "input" | "category") {
    event.preventDefault();
    const value = (type === "input" ? newInput : newCategory).trim();
    if (!value) return;
    const values = type === "input" ? inputs : categories;
    if (values.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setMessage(`${value} already exists in this catalogue.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiRequest("/api/v1/config/items", {
        method: "POST",
        body: JSON.stringify({
          itemType: type === "input" ? "input" : "blocker_category",
          name: value,
          ...(type === "category" ? { routeTo: "extension_officer", slaDays: 7 } : {}),
        }),
      });
      await loadConfiguration();
      if (type === "input") setNewInput("");
      else setNewCategory("");
      setMessage(`${value} added to synthetic pilot configuration.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Configuration could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section>
        <Badge variant="info"><Settings2 aria-hidden="true" size={14} /> Programme administration</Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Pilot configuration</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Catalogues should be data-driven so the pilot can change without a redeploy.
        </p>
      </section>

      <StatusNotice tone="warning" title="Synthetic pilot configuration">
        Changes are stored in the local demo backend. Newly added blocker categories use the extension officer route and a seven-day SLA by default.
      </StatusNotice>
      {message && <StatusNotice tone="info" title="Configuration feedback">{message}</StatusNotice>}
      {error && <StatusNotice tone="error" title="Configuration service unavailable">{error}</StatusNotice>}
      {loading && <div role="status" className="flex items-center gap-2 text-sm text-slate-600"><LoaderCircle className="animate-spin" size={16} />Loading pilot configuration…</div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <CatalogCard
          title="Poultry input catalogue"
          description="Item names and units shown to agripreneurs."
          items={inputs}
          value={newInput}
          onValueChange={setNewInput}
          onSubmit={(event) => void addValue(event, "input")}
          placeholder="e.g. Poultry drinker"
          disabled={saving}
        />
        <CatalogCard
          title="Blocker categories"
          description="Categories with a routing rule and configurable SLA."
          items={categories}
          value={newCategory}
          onValueChange={setNewCategory}
          onSubmit={(event) => void addValue(event, "category")}
          placeholder="e.g. Transport"
          disabled={saving}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Account access requests</CardTitle><CardDescription>Verify a partner or programme role before enabling protected workspaces.</CardDescription></CardHeader>
        <CardContent>
          {userRequests.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No account requests are waiting for review.</p> : <ul className="divide-y divide-slate-100">{userRequests.map((request) => (
            <li key={request.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="font-semibold text-slate-900">{request.displayName}</p><p className="mt-1 break-all text-xs text-slate-600">{request.email} · {request.role.replaceAll("_", " ")}</p></div>
              <div className="flex gap-2"><button disabled={saving} onClick={() => void reviewAccount(request.id, "rejected")} className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50">Decline</button><button disabled={saving} onClick={() => void reviewAccount(request.id, "approved")} className="min-h-10 rounded-xl bg-brand-700 px-3 text-xs font-semibold text-white disabled:opacity-50">Approve access</button></div>
            </li>
          ))}</ul>}
        </CardContent>
      </Card>

      <div className="grid gap-5 sm:grid-cols-3">
        {[
          ["County", PILOT.county, "Seeded for the pilot"],
          ["Value chain", PILOT.valueChain, "Seeded for the pilot"],
          ["Languages", PILOT.languages.join(" · "), "Translation expansion pending"],
        ].map(([label, value, note]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle>{value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">{note}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CatalogCard({
  title,
  description,
  items,
  value,
  onValueChange,
  onSubmit,
  placeholder,
  disabled,
}: {
  title: string;
  description: string;
  items: string[];
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">{item}</li>
          ))}
        </ul>
        <form onSubmit={onSubmit} className="mt-4 flex gap-2">
          <label className="sr-only" htmlFor={`catalog-${title}`}>Add {title}</label>
          <input
            id={`catalog-${title}`}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={placeholder}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <button type="submit" disabled={disabled} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
            <Plus aria-hidden="true" size={15} /> Add
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
