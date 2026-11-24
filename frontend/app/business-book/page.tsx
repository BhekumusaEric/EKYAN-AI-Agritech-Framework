"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Cloud,
  CloudOff,
  FileDown,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { useLanguage } from "@/components/LanguageProvider";
import { apiRequest, apiRequestBlob } from "@/lib/api";
import { translate as t } from "@/lib/i18n";
import {
  listPendingFieldEntries,
  removeSyncedFieldEntries,
  savePendingFieldEntry,
  type PendingFieldEntry,
} from "@/lib/offline-field-queue";

type TransactionType =
  | "sale"
  | "service"
  | "other_income"
  | "purchase"
  | "other_expense"
  | "loan_received"
  | "loan_repayment"
  | "savings_deposit"
  | "savings_out"
  | "owner_in"
  | "owner_out";
type TransactionCategory =
  | "sales"
  | "services"
  | "feed"
  | "chicks"
  | "vaccines"
  | "equipment"
  | "transport"
  | "wages"
  | "rent"
  | "phone_data"
  | "loan"
  | "savings"
  | "owner"
  | "other";

type BusinessTransaction = {
  id: string;
  transactionType: TransactionType;
  category: TransactionCategory;
  amountKes: number;
  transactionDate: string;
  paymentStatus: "paid" | "unpaid";
  dueDate: string | null;
  notes: string | null;
  counterparty: string | null;
  evidenceStatus: string;
};

type MonthlySummary = {
  month: string;
  status: "recorded" | "no_records";
  entry_count: number;
  recorded_income_kes: number;
  income_received_kes: number;
  operating_expenses_kes: number;
  expenses_paid_kes: number;
  loan_received_kes: number;
  loan_repayment_kes: number;
  savings_deposit_kes: number;
  savings_withdrawal_kes: number;
  unpaid_income_kes: number;
  unpaid_expenses_kes: number;
  net_cash_movement_kes: number;
};

type FinanceProfile = {
  agripreneur_id: string;
  decision_notice: string;
  period: { from: string; to: string };
  business: {
    revenue_kes: number;
    expenses_kes: number;
    operating_surplus_kes: number;
    unpaid_income_kes: number;
    unpaid_expenses_kes: number;
    customer_count: number;
    existing_obligations_kes: number;
    obligations_status: string;
    savings_balance_estimate_kes: number;
  };
  record_coverage: {
    months_with_entries: number;
    months_with_income: number;
    months_with_expenses: number;
    months_in_period: number;
    entry_count: number;
    unpaid_without_due_date: number;
  };
  record_checks: { id: string; status: "complete" | "attention"; count: number }[];
  monthly_summary: MonthlySummary[];
};

const ACTOR_ID = "demo-agripreneur-001";
const TRANSACTION_TYPES: { value: TransactionType; label: string; folder: string }[] = [
  { value: "sale", label: "Sale income", folder: "Money in" },
  { value: "service", label: "Service income", folder: "Money in" },
  { value: "other_income", label: "Other income", folder: "Money in" },
  { value: "purchase", label: "Purchase", folder: "Money out" },
  { value: "other_expense", label: "Other expense", folder: "Money out" },
  { value: "loan_received", label: "Loan received", folder: "Loans" },
  { value: "loan_repayment", label: "Loan repayment", folder: "Loans" },
  { value: "savings_deposit", label: "Savings deposit", folder: "Savings" },
  { value: "savings_out", label: "Savings withdrawal", folder: "Savings" },
  { value: "owner_in", label: "Owner contribution", folder: "Owner" },
  { value: "owner_out", label: "Owner withdrawal", folder: "Owner" },
];

const CATEGORIES: Record<TransactionType, TransactionCategory[]> = {
  sale: ["sales"],
  service: ["services"],
  other_income: ["other"],
  purchase: ["feed", "chicks", "vaccines", "equipment", "other"],
  other_expense: ["transport", "wages", "rent", "phone_data", "other"],
  loan_received: ["loan"],
  loan_repayment: ["loan"],
  savings_deposit: ["savings"],
  savings_out: ["savings"],
  owner_in: ["owner"],
  owner_out: ["owner"],
};

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  sales: "Sales",
  services: "Services",
  feed: "Feed",
  chicks: "Chicks",
  vaccines: "Vaccines",
  equipment: "Equipment",
  transport: "Transport",
  wages: "Wages",
  rent: "Rent",
  phone_data: "Phone / data",
  loan: "Loan",
  savings: "Savings",
  owner: "Owner funds",
  other: "Other",
};

const FOLDERS = ["All records", "Money in", "Money out", "Loans", "Savings", "Owner"];

function formatKes(value: number): string {
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function folderForType(type: TransactionType): string {
  return TRANSACTION_TYPES.find((item) => item.value === type)?.folder ?? "Owner";
}

function transactionLabel(type: TransactionType): string {
  return TRANSACTION_TYPES.find((item) => item.value === type)?.label ?? type;
}

export default function BusinessBookPage() {
  const { language } = useLanguage();
  const tr = useCallback((text: string) => t(language, text), [language]);
  const [transactions, setTransactions] = useState<BusinessTransaction[]>([]);
  const [profile, setProfile] = useState<FinanceProfile | null>(null);
  const [pending, setPending] = useState<PendingFieldEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [online, setOnline] = useState(true);
  const [queueReady, setQueueReady] = useState(false);
  const [error, setError] = useState("");
  const [queueError, setQueueError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [folder, setFolder] = useState("All records");
  const [recordType, setRecordType] = useState<TransactionType>("sale");
  const [editing, setEditing] = useState<BusinessTransaction | null>(null);
  const [includeTransactions, setIncludeTransactions] = useState(false);

  const loadServerData = useCallback(async () => {
    setError("");
    try {
      const [transactionResponse, profileResponse] = await Promise.all([
        apiRequest<{ transactions: BusinessTransaction[] }>("/api/v1/transactions", undefined, "agripreneur"),
        apiRequest<FinanceProfile>("/api/v1/profiles/me", undefined, "agripreneur"),
      ]);
      setTransactions(transactionResponse.transactions);
      setProfile(profileResponse);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tr("Business records could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [tr]);

  const refreshPending = useCallback(async () => {
    const saved = await listPendingFieldEntries();
    setPending(saved.filter((entry) => entry.kind === "transaction"));
    setQueueError("");
    setQueueReady(true);
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const updateConnection = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    void loadServerData();
    void refreshPending().catch((cause: unknown) => {
      setQueueError(cause instanceof Error ? cause.message : tr("Local business-record storage is unavailable."));
      setQueueReady(true);
    });
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, [loadServerData, refreshPending, tr]);

  async function syncEntries(entries: PendingFieldEntry[]) {
    if (!entries.length) return;
    if (!navigator.onLine) {
      setFeedback(tr("You are offline. Records remain saved on this device until you sync."));
      return;
    }
    setSyncing(true);
    setFeedback("");
    try {
      const response = await apiRequest<{
        results: { clientId: string; status: string; reason?: string }[];
      }>("/api/v1/sync", {
        method: "POST",
        body: JSON.stringify({
          entries: entries.map((entry) => ({
            clientId: entry.clientId,
            kind: entry.kind,
            payload: entry.payload,
            createdAt: entry.createdAt,
          })),
        }),
      }, "agripreneur");
      const syncedIds = response.results
        .filter((result) => result.status === "created" || result.status === "duplicate")
        .map((result) => result.clientId);
      await removeSyncedFieldEntries(syncedIds);
      await refreshPending();
      await loadServerData();
      const rejected = response.results.find((result) => result.status === "rejected" || result.status === "conflict");
      if (rejected) {
        setFeedback(`${tr("Some records remain on this device:")} ${rejected.reason ?? rejected.status}`);
      } else {
        setFeedback(tr("Business records synced successfully."));
      }
    } catch (cause) {
      setFeedback(
        `${tr("Records are saved on this device but could not sync:")} ${
          cause instanceof Error ? cause.message : tr("The API is unavailable.")
        }`
      );
    } finally {
      setSyncing(false);
    }
  }

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFeedback("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const type = TRANSACTION_TYPES.find((item) => item.value === String(form.get("transactionType")))?.value;
    const category = CATEGORIES[recordType].find((item) => item === String(form.get("category")));
    const amount = Number(form.get("amountKes"));
    const date = String(form.get("transactionDate") ?? "");
    const paymentStatus = form.get("paymentStatus") === "unpaid" ? "unpaid" : "paid";
    const dueDate = String(form.get("dueDate") ?? "");
    const counterparty = String(form.get("counterparty") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();

    if (!type || type !== recordType || !category || !Number.isFinite(amount) || amount <= 0 || !date) {
      setError(tr("Check the record type, category, amount and date."));
      return;
    }
    if (paymentStatus === "unpaid" && dueDate && dueDate < date) {
      setError(tr("The due date cannot be before the record date."));
      return;
    }
    if (editing && !navigator.onLine) {
      setError(tr("Reconnect to edit a saved business record."));
      return;
    }

    const payload = {
      transactionType: type,
      category,
      amountKes: amount,
      transactionDate: date,
      paymentStatus,
      dueDate: dueDate || null,
      counterparty: counterparty || null,
      notes: notes || null,
    };
    setSaving(true);
    try {
      if (editing) {
        await apiRequest(`/api/v1/transactions/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }, "agripreneur");
        setFeedback(tr("Business record updated."));
      } else if (!navigator.onLine) {
        const offlinePayload: PendingFieldEntry["payload"] = {
          transactionType: type,
          category,
          amountKes: amount,
          transactionDate: date,
          paymentStatus,
        };
        if (dueDate) offlinePayload.dueDate = dueDate;
        if (counterparty) offlinePayload.counterparty = counterparty;
        if (notes) offlinePayload.notes = notes;
        const entry: PendingFieldEntry = {
          clientId: crypto.randomUUID(),
          kind: "transaction",
          actedBy: ACTOR_ID,
          createdAt: new Date().toISOString(),
          payload: offlinePayload,
          syncStatus: "pending_sync",
        };
        await savePendingFieldEntry(entry);
        await refreshPending();
        setFeedback(tr("Record saved offline on this device and marked pending sync."));
      } else {
        await apiRequest("/api/v1/transactions", {
          method: "POST",
          body: JSON.stringify({ ...payload, clientId: crypto.randomUUID() }),
        }, "agripreneur");
        setFeedback(tr("Business record saved."));
      }
      formElement.reset();
      setEditing(null);
      setRecordType("sale");
      if (navigator.onLine) await loadServerData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tr("The business record could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function downloadPack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExporting(true);
    setError("");
    setFeedback("");
    const form = new FormData(event.currentTarget);
    try {
      const blob = await apiRequestBlob(
        "/api/v1/profiles/me/application-pack",
        "agripreneur",
        {
          method: "POST",
          body: JSON.stringify({
            purpose: String(form.get("purpose")),
            requestedAmountKes: Number(form.get("requestedAmountKes")),
            termMonths: Number(form.get("termMonths")),
            includeTransactions,
          }),
        }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ekyan-finance-summary-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback(tr("Application summary downloaded. It has not been sent to a lender."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tr("The application summary could not be generated."));
    } finally {
      setExporting(false);
    }
  }

  function startEditing(transaction: BusinessTransaction) {
    if (!navigator.onLine) {
      setError(tr("Reconnect to edit a saved business record."));
      return;
    }
    setError("");
    setFeedback("");
    setEditing(transaction);
    setRecordType(transaction.transactionType);
  }

  const visibleTransactions = useMemo(
    () => transactions.filter((item) => folder === "All records" || folderForType(item.transactionType) === folder),
    [transactions, folder]
  );
  const coachMessages = useMemo(() => {
    if (!profile) return [];
    const coverage = profile.record_coverage;
    const messages: { key: string; count?: number }[] = [];
    if (coverage.months_with_income === 0) messages.push({ key: "No income records appear in this six-month view yet. Add a sale/service or confirm that none were recorded." });
    if (coverage.months_with_expenses === 0) messages.push({ key: "No operating-cost records appear in this view. Add costs such as feed, transport or vaccines, or confirm there were none." });
    if (coverage.unpaid_without_due_date > 0) messages.push({ key: "{count} unpaid record(s) have no due date.", count: coverage.unpaid_without_due_date });
    if (!messages.length) messages.push({ key: "Your current records include income and operating costs. Review the month-by-month summary and correct anything that is missing." });
    return messages;
  }, [profile]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Badge variant="info"><BookOpen aria-hidden="true" size={14} /> {tr("My business book")}</Badge>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{tr("Simple records, ready when you need them")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{tr("Keep sales, costs, loans and savings together. These records help you prepare; they do not decide whether you get a loan.")}</p>
        </div>
        <Badge variant={online ? "success" : "warning"}>
          {online ? <Cloud aria-hidden="true" size={14} /> : <CloudOff aria-hidden="true" size={14} />}
          {online ? tr("Online") : tr("Offline · saved on device")}
        </Badge>
      </section>

      <StatusNotice tone="warning" title={tr("Synthetic demo records only")}>
        {tr("Do not enter real participant or financial information. Records are self-reported unless explicitly verified; nothing is sent to a lender by this page.")}
      </StatusNotice>
      {error && <StatusNotice tone="error" title={tr("Business book action failed")}>{error}</StatusNotice>}
      {feedback && <StatusNotice tone="success" title={tr("Business book updated")}>{feedback}</StatusNotice>}
      {queueError && <StatusNotice tone="error" title={tr("Offline record storage unavailable")}>{queueError}</StatusNotice>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Recorded income · 6 months", profile ? formatKes(profile.business.revenue_kes) : "—"],
          ["Operating costs · 6 months", profile ? formatKes(profile.business.expenses_kes) : "—"],
          ["Operating surplus estimate", profile ? formatKes(profile.business.operating_surplus_kes) : "—"],
          ["Unpaid amounts", profile ? formatKes(profile.business.unpaid_income_kes + profile.business.unpaid_expenses_kes) : "—"],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500">{tr(label)}</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{loading ? <LoaderCircle className="animate-spin text-slate-400" size={18} /> : value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{editing ? tr("Correct a business record") : tr("Add a business record")}</CardTitle>
            <CardDescription>{tr("One short entry at a time. Categories keep your records easy to review.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form key={editing?.id ?? "new-record"} onSubmit={(event) => void submitRecord(event)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  {tr("Record type")}
                  <select
                    name="transactionType"
                    value={recordType}
                    onChange={(event) => {
                      const next = TRANSACTION_TYPES.find((item) => item.value === event.target.value);
                      if (next) setRecordType(next.value);
                    }}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  >
                    {TRANSACTION_TYPES.map((item) => <option key={item.value} value={item.value}>{tr(item.label)}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {tr("Category")}
                  <select
                    key={`${editing?.id ?? "new"}-${recordType}`}
                    name="category"
                    defaultValue={editing?.category ?? CATEGORIES[recordType][0]}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  >
                    {CATEGORIES[recordType].map((item) => <option key={item} value={item}>{tr(CATEGORY_LABELS[item])}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {tr("Amount (KES)")}
                  <input name="amountKes" type="number" min="0.01" max="1000000000" step="0.01" required defaultValue={editing?.amountKes} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {tr("Record date")}
                  <input name="transactionDate" type="date" required defaultValue={editing?.transactionDate ?? new Date().toISOString().slice(0, 10)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {tr("Payment status")}
                  <select name="paymentStatus" defaultValue={editing?.paymentStatus ?? "paid"} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    <option value="paid">{tr("Paid / received")}</option>
                    <option value="unpaid">{tr("Still owed / not yet paid")}</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {tr("Due date · if unpaid")}
                  <input name="dueDate" type="date" defaultValue={editing?.dueDate ?? ""} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                </label>
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  {tr("Synthetic counterparty reference · optional")}
                  <input name="counterparty" pattern="(synthetic|demo)-[a-z0-9-]+" defaultValue={editing?.counterparty ?? ""} placeholder="synthetic-buyer-001" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                </label>
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  {tr("Optional note · synthetic only")}
                  <input name="notes" pattern="(Synthetic|Demo) .+" defaultValue={editing?.notes ?? ""} placeholder="Synthetic feed purchase for this week" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  <span className="mt-1 block text-xs font-normal text-slate-500">{tr("If you add a note, begin it with Synthetic or Demo. Do not enter real names or phone numbers.")}</span>
                </label>
              </div>
              <p className="flex gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-amber-700" size={15} />
                {tr("Loan, savings and owner entries are shown separately; they are not sales or operating expenses.")}
              </p>
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-slate-500">{tr("Recorded by")} <strong>{ACTOR_ID}</strong> · {tr("Self-reported")}</span>
                <div className="flex flex-wrap gap-2">
                  {editing && <button type="button" onClick={() => { setEditing(null); setRecordType("sale"); }} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">{tr("Cancel")}</button>}
                  <button type="submit" disabled={saving || !queueReady} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
                    {saving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : editing ? <Pencil aria-hidden="true" size={15} /> : <Plus aria-hidden="true" size={15} />}
                    {editing ? tr("Save correction") : tr("Save record")}
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>{tr("Record folders")}</CardTitle>
                  <CardDescription>{tr("Choose a folder to review records.")}</CardDescription>
                </div>
                <Wallet aria-hidden="true" className="text-brand-700" size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {FOLDERS.map((name) => (
                  <button key={name} type="button" onClick={() => setFolder(name)} aria-pressed={folder === name} className={`min-h-10 rounded-full border px-3 text-xs font-semibold ${folder === name ? "border-brand-700 bg-brand-50 text-brand-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {tr(name)}
                  </button>
                ))}
              </div>
              {!online && (
                <button type="button" disabled={syncing || !pending.length} onClick={() => void syncEntries(pending)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">
                  {syncing ? <LoaderCircle className="animate-spin" size={15} /> : <RefreshCw size={15} />}
                  {tr("Sync pending records")} ({pending.length})
                </button>
              )}
              {online && pending.length > 0 && (
                <button type="button" disabled={syncing} onClick={() => void syncEntries(pending)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">
                  {syncing ? <LoaderCircle className="animate-spin" size={15} /> : <RefreshCw size={15} />}
                  {tr("Sync pending records")} ({pending.length})
                </button>
              )}
              <div className="mt-4 space-y-2">
                {pending.map((entry) => (
                  <div key={entry.clientId} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                    <strong>{tr("Pending sync")}</strong> · {formatKes(Number(entry.payload.amountKes ?? 0))} · {tr("Saved on this device")}
                  </div>
                ))}
                {loading && <p role="status" className="py-6 text-center text-sm text-slate-500">{tr("Loading business records…")}</p>}
                {!loading && !visibleTransactions.length && !pending.length && (
                  <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{tr("No records in this folder yet.")}</p>
                )}
                {visibleTransactions.map((item) => (
                  <article key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-slate-800">{tr(transactionLabel(item.transactionType))}</strong>
                        <Badge variant={item.paymentStatus === "paid" ? "success" : "warning"}>{tr(item.paymentStatus === "paid" ? "Paid / received" : "Still owed / not yet paid")}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{tr(CATEGORY_LABELS[item.category])} · {item.transactionDate}{item.dueDate ? ` · ${tr("Due")} ${item.dueDate}` : ""}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{tr("Evidence")}: {tr("Self-reported · not independently verified")}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <strong className="text-sm text-slate-900">{formatKes(item.amountKes)}</strong>
                      <button type="button" disabled={!online || saving} onClick={() => startEditing(item)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-40">
                        <Pencil aria-hidden="true" size={13} /> {tr("Correct")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tr("Credit Coach · record prompts")}</CardTitle>
              <CardDescription>{tr("Helpful reminders about your records, never an approval prediction.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile ? coachMessages.map((message) => (
                <div key={`${message.key}-${message.count ?? ""}`} className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-950">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-700" size={15} />
                  <span>{tr(message.key).replace("{count}", String(message.count ?? ""))}</span>
                </div>
              )) : <p role="status" className="text-sm text-slate-500">{tr("Loading record prompts…")}</p>}
              <p className="text-xs leading-5 text-slate-500">{tr("A month with no entries may be seasonal or simply unrecorded; it is not treated as zero income. Add or correct records only when you can confirm them.")}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{tr("Six-month business picture")}</CardTitle>
          <CardDescription>{profile ? `${profile.period.from} – ${profile.period.to}` : tr("Loading reporting period…")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs leading-5 text-slate-500">{tr("Operating surplus is recorded income minus recorded operating costs. It is an estimate, not audited profit. Unpaid amounts are not counted as cash received or paid.")}</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {profile?.monthly_summary.map((month) => (
              <article key={month.month} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{month.month}</h3>
                  <Badge variant={month.status === "recorded" ? "info" : "neutral"}>{month.status === "recorded" ? tr("Records entered") : tr("No records")}</Badge>
                </div>
                {month.status === "no_records" ? (
                  <p className="mt-3 text-xs leading-5 text-slate-500">{tr("No records entered for this month; this does not mean there was no business activity.")}</p>
                ) : (
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Metric label={tr("Income recorded")} value={formatKes(month.recorded_income_kes)} />
                    <Metric label={tr("Income received")} value={formatKes(month.income_received_kes)} />
                    <Metric label={tr("Costs recorded")} value={formatKes(month.operating_expenses_kes)} />
                    <Metric label={tr("Costs paid")} value={formatKes(month.expenses_paid_kes)} />
                    <Metric label={tr("Net cash movement")} value={formatKes(month.net_cash_movement_kes)} />
                    <Metric label={tr("Entries")} value={String(month.entry_count)} />
                  </dl>
                )}
              </article>
            ))}
          </div>
          {profile && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              {tr("Record coverage")}: {profile.record_coverage.months_with_entries} {tr("of")} {profile.record_coverage.months_in_period} {tr("months contain entries")} · {profile.record_coverage.entry_count} {tr("entries")} · {tr("Recorded borrowing estimate")}: {formatKes(profile.business.existing_obligations_kes)} ({tr(profile.business.obligations_status)})
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{tr("Prepare a finance application summary")}</CardTitle>
            <CardDescription>{tr("Create a file to review and share yourself. Downloading does not send anything to a lender.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void downloadPack(event)} className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                {tr("Purpose")}
                <select name="purpose" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                  <option value="working_capital">{tr("Working capital")}</option>
                  <option value="inputs">{tr("Farm inputs")}</option>
                  <option value="equipment">{tr("Equipment")}</option>
                  <option value="other">{tr("Other purpose")}</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {tr("Requested amount (KES)")}
                <input name="requestedAmountKes" type="number" min="1" max="1000000000" step="0.01" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {tr("Requested term (months)")}
                <input name="termMonths" type="number" min="1" max="60" step="1" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
              </label>
              <label className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700 sm:col-span-2">
                <input type="checkbox" checked={includeTransactions} onChange={(event) => setIncludeTransactions(event.target.checked)} className="mt-1 h-4 w-4 accent-brand-700" />
                {tr("Include detailed transaction rows in the downloaded file (optional).")}
              </label>
              <button type="submit" disabled={exporting || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50 sm:col-span-2">
                {exporting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <FileDown aria-hidden="true" size={15} />}
                {tr("Download CSV application summary")}
              </button>
            </form>
          </CardContent>
        </Card>
        <StatusNotice tone="warning" title={tr("What this summary does not do")}>
          {tr("It is not a loan application submission, tax certificate, verified statement, credit score or promise of approval. Review every figure and ask the lender what else they require.")}
        </StatusNotice>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
