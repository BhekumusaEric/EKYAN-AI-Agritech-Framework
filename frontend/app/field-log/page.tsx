"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  LoaderCircle,
  Plus,
  RefreshCw,
  Sprout,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { useLanguage } from "@/components/LanguageProvider";
import { BLOCKER_CATEGORIES, INPUT_CATALOGUE, PILOT } from "@/lib/mvp-preview";
import { translate as t } from "@/lib/i18n";
import {
  listPendingFieldEntries,
  removeSyncedFieldEntries,
  savePendingFieldEntry,
  type FieldEntryKind,
  type PendingFieldEntry,
} from "@/lib/offline-field-queue";
import { apiRequest } from "@/lib/api";

const FARMER_ID = /^synthetic-farmer-[a-z0-9-]+$/i;
const ACTOR_ID = "demo-agripreneur-001";
const WARDS = ["Teso South", "Nambale", "Matayos"];
const ENTRY_TYPES: { value: FieldEntryKind; label: string; caption: string }[] = [
  { value: "farmer", label: "Farmer", caption: "Add synthetic farmer" },
  { value: "intention", label: "Adoption intention", caption: "Record a planned practice" },
  { value: "order", label: "Order", caption: "Pool an input request" },
  { value: "blocker", label: "Blocker", caption: "Report a barrier" },
  { value: "transaction", label: "Sale or purchase", caption: "Record business activity" },
];
const ENTRY_LABELS: Record<FieldEntryKind, string> = {
  farmer: "Farmer",
  intention: "Adoption intention",
  order: "Order",
  blocker: "Blocker",
  transaction: "Sale or purchase",
};

export default function FieldLogPage() {
  const { language } = useLanguage();
  const tr = (text: string) => t(language, text);
  const [kind, setKind] = useState<FieldEntryKind>("order");
  const [farmerId, setFarmerId] = useState("synthetic-farmer-001");
  const [ward, setWard] = useState(WARDS[0]);
  const [consentToRecord, setConsentToRecord] = useState(false);
  const [entries, setEntries] = useState<PendingFieldEntry[]>([]);
  const [online, setOnline] = useState(true);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const updateConnection = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    void listPendingFieldEntries()
      .then((saved) => {
        setEntries(saved);
        setStorageReady(true);
      })
      .catch((error: unknown) => {
        setStorageError(error instanceof Error ? error.message : "Local field storage could not be opened.");
      });
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (kind !== "transaction" && !FARMER_ID.test(farmerId.trim())) {
      setFeedback({ tone: "error", message: tr("Use a synthetic farmer reference such as synthetic-farmer-001.") });
      return;
    }
    if (kind !== "transaction" && !consentToRecord) {
      setFeedback({ tone: "error", message: tr("Confirm the farmer's consent to record this synthetic entry before saving.") });
      return;
    }

    const form = new FormData(event.currentTarget);
    const payload: Record<string, string | number | boolean> =
      kind === "transaction" || kind === "intention" ? {} : { ward };
    if (kind === "farmer") {
      payload.name = String(form.get("name") ?? "").trim();
      payload.village = String(form.get("village") ?? "").trim();
      payload.gender = String(form.get("gender") ?? "not_stated");
      payload.disability = String(form.get("disability") ?? "not_stated");
      payload.consentToRecord = true;
    } else if (kind === "order") {
      const quantity = Number(form.get("quantity"));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setFeedback({ tone: "error", message: tr("Quantity must be greater than zero.") });
        return;
      }
      payload.item = String(form.get("item") ?? "");
      payload.quantity = quantity;
      payload.neededBy = String(form.get("neededBy") ?? "");
    } else if (kind === "blocker") {
      payload.category = String(form.get("category") ?? "");
      payload.description = String(form.get("description") ?? "");
      payload.urgency = String(form.get("urgency") ?? "medium");
      if (form.get("confirmTriage") !== "on") {
        setFeedback({ tone: "error", message: tr("Review and confirm the suggested category and urgency before routing.") });
        return;
      }
      payload.confirmedSuggestion = true;
    } else if (kind === "intention") {
      payload.practice = String(form.get("practice") ?? "").trim();
      payload.targetDate = String(form.get("targetDate") ?? "");
    } else {
      const amount = Number(form.get("amount"));
      if (!Number.isFinite(amount) || amount <= 0) {
        setFeedback({ tone: "error", message: tr("Amount must be greater than zero.") });
        return;
      }
      payload.transactionType = String(form.get("transactionType") ?? "sale");
      payload.amountKes = amount;
      payload.date = String(form.get("date") ?? "");
      const counterparty = String(form.get("counterparty") ?? "").trim();
      if (counterparty) payload.counterparty = counterparty;
    }

    const clientId = kind === "farmer"
      ? `synthetic-farmer-${crypto.randomUUID()}`
      : crypto.randomUUID();
    const entry: PendingFieldEntry = {
      clientId,
      kind,
      actedBy: ACTOR_ID,
      ...(["order", "blocker", "intention"].includes(kind) ? { onBehalfOf: farmerId.trim() } : {}),
      createdAt: new Date().toISOString(),
      payload,
      syncStatus: "pending_sync",
    };

    try {
      await savePendingFieldEntry(entry);
      setEntries((current) => [entry, ...current]);
      if (kind === "farmer") setFarmerId(clientId);
      setConsentToRecord(false);
      setFeedback({
        tone: "success",
        message: online
          ? tr("Saved securely on this device. Use Sync pending entries to send this synthetic record to the authenticated demo API.")
          : tr("Saved offline on this device and marked pending sync. It will remain queued until the connection returns."),
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : tr("Could not save this entry to local storage."),
      });
    }
  }

  async function syncPendingEntries() {
    if (!online) {
      setFeedback({ tone: "error", message: tr("Reconnect to the internet before syncing queued entries.") });
      return;
    }
    if (!entries.length) return;
    setSyncing(true);
    setFeedback(null);
    try {
      const orderedEntries = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const response = await apiRequest<{
        results: { clientId: string; status: string; reason?: string }[];
      }>("/api/v1/sync", {
        method: "POST",
        body: JSON.stringify({
          entries: orderedEntries.map(({ clientId, kind, onBehalfOf, createdAt, payload }) => ({
            clientId,
            kind,
            onBehalfOf,
            createdAt,
            payload,
          })),
        }),
      }, "agripreneur");
      const syncedIds = response.results
        .filter((result) => result.status === "created" || result.status === "duplicate")
        .map((result) => result.clientId);
      await removeSyncedFieldEntries(syncedIds);
      setEntries((current) => current.filter((entry) => !syncedIds.includes(entry.clientId)));
      const rejected = response.results.filter((result) => result.status !== "created" && result.status !== "duplicate");
      setFeedback({
        tone: rejected.length ? "error" : "success",
        message: rejected.length
          ? `${syncedIds.length} ${tr("entries synced.")} ${rejected.length} ${tr("remain queued:")} ${rejected.map((item) => item.reason ?? item.status).join("; ")}`
          : `${syncedIds.length} ${tr("entries synced to the authenticated synthetic demo API. No external partner was contacted.")}`,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : tr("The queued entries could not be synced."),
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 p-3 sm:space-y-6 sm:p-7 lg:p-9">
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end sm:gap-5">
        <div>
          <Badge variant="success"><Sprout aria-hidden="true" size={14} /> {tr("Field operations")}</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:mt-4 sm:text-3xl">{tr("Log once, support many")}</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
            {tr("Record a farmer's input need or blocker, then follow it through to a response—even when the connection drops.")}
          </p>
        </div>
        <Badge variant={!storageReady || storageError || !online ? "warning" : "success"}>
          {online ? <Cloud aria-hidden="true" size={14} /> : <CloudOff aria-hidden="true" size={14} />}
          {!storageReady ? tr("Checking local storage") : storageError ? tr("Local storage unavailable") : online ? tr("Online · local queue ready") : tr("Offline · device queue")}
        </Badge>
      </section>

      <StatusNotice tone="warning" title={tr("Synthetic records only")}>
        {tr("This demo stores entries in this browser's IndexedDB and syncs only to the local synthetic API. Do not enter real participant information; external sharing and partner integrations are disabled.")}
      </StatusNotice>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{tr("New field entry")}</CardTitle>
            <CardDescription>{tr("Start with an input request or a blocker. Record other business activity from the additional options.")} · {PILOT.county} {tr("County")} · {tr(PILOT.valueChain)} {tr("pilot")} · {tr("consent before proxy recording")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label={tr("Choose entry type")}>
              {ENTRY_TYPES.filter((entryType) => entryType.value === "order" || entryType.value === "blocker").map((entryType) => (
                <button
                  key={entryType.value}
                  type="button"
                  aria-pressed={kind === entryType.value}
                  onClick={() => {
                    setKind(entryType.value);
                    setFeedback(null);
                  }}
                  className={`min-h-16 rounded-xl border p-3 text-left transition ${
                    kind === entryType.value
                      ? "border-brand-300 bg-brand-50 text-brand-900 ring-2 ring-brand-500/15"
                      : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/50"
                  }`}
                >
                  <span className="block text-sm font-semibold">{tr(entryType.label)}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-slate-500">{tr(entryType.caption)}</span>
                </button>
              ))}
            </div>
            <details className="mb-5 rounded-xl border border-slate-200 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                {tr("More record types")}{kind !== "order" && kind !== "blocker" ? ` · ${tr(ENTRY_LABELS[kind])}` : ""}
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label={tr("Additional record types")}>
                {ENTRY_TYPES.filter((entryType) => entryType.value !== "order" && entryType.value !== "blocker").map((entryType) => (
                  <button
                    key={entryType.value}
                    type="button"
                    aria-pressed={kind === entryType.value}
                    onClick={() => {
                      setKind(entryType.value);
                      setFeedback(null);
                    }}
                    className={`min-h-16 rounded-xl border p-3 text-left transition ${
                      kind === entryType.value
                        ? "border-brand-300 bg-brand-50 text-brand-900 ring-2 ring-brand-500/15"
                        : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/50"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{tr(entryType.label)}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-500">{tr(entryType.caption)}</span>
                  </button>
                ))}
              </div>
            </details>

            {storageError && <StatusNotice tone="error" title={tr("Local storage unavailable")}>{storageError}</StatusNotice>}
            {feedback && (
              <div className="mb-4">
                <StatusNotice tone={feedback.tone} title={tr(feedback.tone === "success" ? "Entry saved locally" : "Entry not saved")}>
                  {feedback.message}
                </StatusNotice>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {kind !== "transaction" && (
                <label className="block text-sm font-medium text-slate-700">
                  {tr("Synthetic farmer reference")}
                  <input
                    value={farmerId}
                    onChange={(event) => setFarmerId(event.target.value)}
                    required
                    pattern="synthetic-farmer-[a-z0-9\-]+"
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </label>
              )}

              {kind !== "transaction" && kind !== "intention" && (
                <label className="block text-sm font-medium text-slate-700">
                  {tr("Village / ward")}
                  <select value={ward} onChange={(event) => setWard(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    {WARDS.map((name) => <option key={name} value={name}>{tr(name)}</option>)}
                  </select>
                </label>
              )}

              {kind === "farmer" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    {tr("Synthetic farmer name")}
                    <input name="name" required minLength={3} maxLength={120} pattern="(Synthetic|Demo) .+" placeholder="Synthetic Farmer 003" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    {tr("Synthetic village")}
                    <input name="village" required maxLength={120} placeholder="Synthetic Village C" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    {tr("Gender · inclusion reporting only")}
                    <select name="gender" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                      <option value="not_stated">{tr("Prefer not to state")}</option>
                      <option value="woman">{tr("Woman")}</option>
                      <option value="man">{tr("Man")}</option>
                      <option value="another">{tr("Another identity")}</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    {tr("Disability status · optional")}
                    <select name="disability" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                      <option value="not_stated">{tr("Prefer not to state")}</option>
                      <option value="yes">{tr("Person with a disability")}</option>
                      <option value="no">{tr("No disability reported")}</option>
                    </select>
                  </label>
                  <p className="text-xs leading-5 text-slate-500 sm:col-span-2">{tr("These attributes are for inclusion reporting only and must never affect finance readiness.")}</p>
                </div>
              )}

              {kind === "order" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    {tr("Poultry input")}
                    <select name="item" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                      {INPUT_CATALOGUE.map((item) => <option key={item} value={item}>{tr(item)}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    {tr("Quantity")}
                    <input name="quantity" type="number" min="0.01" step="0.01" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  </label>
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    {tr("Needed by")}
                    <input name="neededBy" type="date" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  </label>
                </div>
              )}

              {kind === "intention" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    {tr("Synthetic practice intention")}
                    <input
                      name="practice"
                      required
                      minLength={3}
                      maxLength={200}
                      pattern="(Synthetic|Demo) .+"
                      placeholder="Synthetic vaccination plan"
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                    />
                    <span className="mt-1 block text-xs font-normal text-slate-500">{tr("The linked farmer's ward is used for reporting. This synthetic intention does not verify later adoption.")}</span>
                  </label>
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    {tr("Target date")}
                    <input name="targetDate" type="date" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  </label>
                </div>
              )}

              {kind === "blocker" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    {tr("Category")}
                    <select name="category" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                      {BLOCKER_CATEGORIES.map((category) => <option key={category} value={category}>{tr(category)}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    {tr("Urgency")}
                    <select name="urgency" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                      <option value="low">{tr("Low")}</option>
                      <option value="medium">{tr("Medium")}</option>
                      <option value="high">{tr("High")}</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    {tr("What is stopping progress?")}
                    <textarea name="description" required minLength={8} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10" />
                  </label>
                  <label className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700 sm:col-span-2">
                    <input name="confirmTriage" type="checkbox" required className="mt-1 h-4 w-4 accent-brand-700" />
                    {tr("I reviewed and confirm this category, urgency, and proposed route before submission.")}
                  </label>
                </div>
              )}

              {kind === "transaction" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    {tr("Record type")}
                    <select name="transactionType" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                      <option value="sale">{tr("Sale / income")}</option>
                      <option value="purchase">{tr("Purchase / expense")}</option>
                      <option value="service">{tr("Service")}</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    {tr("Amount (KES)")}
                    <input name="amount" type="number" min="0.01" step="0.01" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  </label>
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    {tr("Date")}
                    <input name="date" type="date" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  </label>
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    {tr("Synthetic counterparty reference · optional")}
                    <input name="counterparty" pattern="synthetic-[a-z0-9-]+" placeholder="synthetic-buyer-001" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" />
                  </label>
                </div>
              )}

              {kind !== "transaction" && (
                <label className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                  <input
                    type="checkbox"
                    checked={consentToRecord}
                    onChange={(event) => setConsentToRecord(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-brand-700"
                  />
                  {tr("I have consent to record this synthetic farmer entry. This does not grant consent to share a finance profile.")}
                </label>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">
                  {tr("Recorded by")} <strong>{ACTOR_ID}</strong>{kind !== "transaction" && <> · {tr("on behalf of")} <strong>{farmerId || tr("synthetic farmer")}</strong></>}
                </p>
                <button
                  type="submit"
                  disabled={!storageReady || Boolean(storageError)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus aria-hidden="true" size={16} />
                  {tr("Save to device")}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{tr("Pending sync")}</CardTitle>
                <CardDescription>{tr("Local-first queue · authenticated demo API sync")}</CardDescription>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                <Database aria-hidden="true" size={19} />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span className="text-sm font-medium text-slate-700">{tr("Saved on this device")}</span>
              <Badge variant={entries.length ? "warning" : "neutral"}>{entries.length} {tr("pending")}</Badge>
            </div>
            {entries.length ? (
              <ul className="space-y-3">
                {entries.map((entry) => (
                  <li key={entry.clientId} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{tr(ENTRY_LABELS[entry.kind])}</p>
                      <Badge variant="warning">{tr("Pending sync")}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {entry.onBehalfOf ? `${tr("For")} ${entry.onBehalfOf} · ` : ""}{new Date(entry.createdAt).toLocaleString(language === "sw" ? "sw-KE" : "en-KE")}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 text-center">
                <CheckCircle2 aria-hidden="true" className="text-emerald-700" size={22} />
                <p className="mt-2 text-sm font-semibold text-slate-700">{tr("Nothing waiting to sync")}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{tr("Saved test entries will appear here with an idempotent client reference.")}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => void syncPendingEntries()}
              disabled={!entries.length || !online || syncing}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncing ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <RefreshCw aria-hidden="true" size={16} />}
              {syncing ? tr("Syncing entries…") : online ? tr("Sync pending entries") : tr("Waiting for connection")}
            </button>
            <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-950">
              {tr("Entries are processed oldest first so newly added synthetic farmers can be referenced by later orders.")}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
