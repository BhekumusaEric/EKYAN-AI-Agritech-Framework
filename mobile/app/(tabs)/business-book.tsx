import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "@/src/api";
import { useLanguage } from "@/src/i18n";
import { enqueueEntry, makePendingEntry, readPendingEntries, syncPendingEntries, type PendingEntry } from "@/src/offlineQueue";
import type { BusinessTransaction, FinanceProfile, TransactionCategory, TransactionType } from "@/src/types";
import { ActionButton, Card, ChoiceChip, GrowingLoader, Notice, ScreenFrame, ScreenHeader, SectionHeading, TextField } from "@/src/ui";
import { colors } from "@/src/theme";

type RecordOption = { value: TransactionType; label: string };
const RECORD_TYPES: RecordOption[] = [
  { value: "sale", label: "Sale income" },
  { value: "service", label: "Service income" },
  { value: "other_income", label: "Other income" },
  { value: "purchase", label: "Purchase" },
  { value: "other_expense", label: "Other expense" },
  { value: "loan_received", label: "Loan received" },
  { value: "loan_repayment", label: "Loan repayment" },
  { value: "savings_deposit", label: "Savings deposit" },
  { value: "savings_out", label: "Savings withdrawal" },
  { value: "owner_in", label: "Owner contribution" },
  { value: "owner_out", label: "Owner withdrawal" },
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

type QueuedTransaction = PendingEntry & {
  kind: "transaction";
  payload: {
    transactionType: TransactionType;
    category: TransactionCategory;
    amountKes: number;
    transactionDate: string;
    paymentStatus: "paid" | "unpaid";
    dueDate?: string | null;
  };
};

function isQueuedTransaction(entry: PendingEntry): entry is QueuedTransaction {
  const payload = entry.payload;
  return entry.kind === "transaction" &&
    typeof payload.transactionType === "string" &&
    RECORD_TYPES.some((item) => item.value === payload.transactionType) &&
    typeof payload.category === "string" &&
    Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, payload.category) &&
    typeof payload.amountKes === "number" &&
    Number.isFinite(payload.amountKes) &&
    typeof payload.transactionDate === "string" &&
    (payload.paymentStatus === "paid" || payload.paymentStatus === "unpaid");
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function formatKes(value: number) {
  return `KES ${Math.round(value).toLocaleString("en-KE")}`;
}

export default function BusinessBookScreen() {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<BusinessTransaction[]>([]);
  const [queuedTransactions, setQueuedTransactions] = useState<QueuedTransaction[]>([]);
  const [profile, setProfile] = useState<FinanceProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [recordType, setRecordType] = useState<TransactionType>("sale");
  const [category, setCategory] = useState<TransactionCategory>("sales");
  const [amount, setAmount] = useState("");
  const [recordDate, setRecordDate] = useState(localIsoDate());
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("paid");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [queueError, setQueueError] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadData = useCallback(async (pullToRefresh = false) => {
    if (pullToRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const pendingPromise = readPendingEntries().then((entries) => {
        setPendingCount(entries.length);
        setQueuedTransactions(entries.filter(isQueuedTransaction).slice(-4).reverse());
        setQueueError("");
      }).catch((cause: unknown) => {
        setQueueError(cause instanceof Error ? cause.message : t("The entry could not be saved locally."));
      });
      const serverPromise = Promise.all([
        apiRequest<{ transactions: BusinessTransaction[] }>("/api/v1/transactions"),
        apiRequest<FinanceProfile>("/api/v1/profiles/me"),
      ]).then(([transactionResponse, nextProfile]) => {
        setTransactions(transactionResponse.transactions);
        setProfile(nextProfile);
      }).catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : t("Business book data could not be loaded."));
      });
      await Promise.all([pendingPromise, serverPromise]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  async function syncQueue() {
    setSyncing(true);
    setFeedback("");
    try {
      const result = await syncPendingEntries();
      const remaining = await readPendingEntries();
      setPendingCount(remaining.length);
      setQueuedTransactions(remaining.filter(isQueuedTransaction).slice(-4).reverse());
      setQueueError("");
      if (result.rejected.length) {
        setFeedback(`${t("Still queued on this phone:")} ${result.rejected[0].reason ?? result.rejected[0].status}`);
      } else if (result.synced) {
        setFeedback(t("Saved and synced to the local demo API."));
        const [transactionResponse, nextProfile] = await Promise.all([
          apiRequest<{ transactions: BusinessTransaction[] }>("/api/v1/transactions"),
          apiRequest<FinanceProfile>("/api/v1/profiles/me"),
        ]);
        setTransactions(transactionResponse.transactions);
        setProfile(nextProfile);
      } else {
        setFeedback(t("No entries are waiting to sync."));
      }
    } catch (cause) {
      setFeedback(`${t("Still queued on this phone:")} ${cause instanceof Error ? cause.message : t("The entry could not be saved locally.")}`);
    } finally {
      setSyncing(false);
    }
  }

  async function saveRecord() {
    setError("");
    setFeedback("");
    const numericAmount = Number(amount);
    const supportedCategories = CATEGORIES[recordType];
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1_000_000_000) {
      setError(t("Enter an amount greater than zero."));
      return;
    }
    if (!supportedCategories.includes(category)) {
      setError(t("Choose a category for this record type."));
      return;
    }
    if (!isValidIsoDate(recordDate)) {
      setError(t("Enter a valid record date."));
      return;
    }
    if (dueDate && (!isValidIsoDate(dueDate) || dueDate < recordDate)) {
      setError(t("Due date cannot be before the record date."));
      return;
    }

    const payload = {
      transactionType: recordType,
      category,
      amountKes: numericAmount,
      transactionDate: recordDate,
      paymentStatus,
      dueDate: dueDate || null,
      synthetic: true,
    };
    setSaving(true);
    try {
      await enqueueEntry(makePendingEntry("transaction", payload));
      const pending = await readPendingEntries();
      setPendingCount(pending.length);
      setQueuedTransactions(pending.filter(isQueuedTransaction).slice(-4).reverse());
      setQueueError("");
      setAmount("");
      setRecordDate(localIsoDate());
      setDueDate("");
      setPaymentStatus("paid");
      setFeedback(t("Saved on this phone."));
      await syncQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("The entry could not be saved locally."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenFrame refreshing={refreshing} onRefresh={() => void loadData(true)}>
      <ScreenHeader title={t("Business book")} subtitle={t("Record sales, costs, loans and savings")} />

      <Notice title={t("Synthetic demo only")}>
        {t("Do not enter real farmer or financial details. This app stores demo records on this device and syncs them only to the local EKYAN API.")}
      </Notice>
      <Notice title={t("Financial figures are self-reported and are not an approval prediction.")} tone="info">
        {t("A record helps you understand your business. It is not a credit score, approval, or lender decision.")}
      </Notice>
      {error ? <Notice title={t("Business book data could not be loaded.")} tone="error">{error}</Notice> : null}
      {queueError ? <Notice title={t("Local business-record storage is unavailable.")} tone="error">{queueError}</Notice> : null}
      {feedback ? <Notice title={t(feedback.startsWith("Still queued") ? "Pending sync" : feedback)} tone={feedback.startsWith("Still queued") ? "info" : "success"}>{feedback}</Notice> : null}

      {profile ? (
        <View>
          <SectionHeading title={t("Your records, not a credit score")} subtitle={t("An incomplete month may be seasonal or unrecorded; it is not counted as zero income.")} />
          <View style={styles.summaryGrid}>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t("Recorded income")}</Text>
              <Text style={styles.summaryValue}>{formatKes(profile.business.revenue_kes)}</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t("Operating costs")}</Text>
              <Text style={styles.summaryValue}>{formatKes(profile.business.expenses_kes)}</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t("Operating surplus")}</Text>
              <Text style={styles.summaryValue}>{formatKes(profile.business.operating_surplus_kes)}</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t("Months with records")}</Text>
              <Text style={styles.summaryValue}>{profile.record_coverage.months_with_entries}/{profile.record_coverage.months_in_period}</Text>
            </Card>
          </View>
        </View>
      ) : loading ? (
        <Card style={styles.loadingCard}><GrowingLoader /><Text style={styles.loadingText}>{t("Loading your local profile…")}</Text></Card>
      ) : null}

      <Card style={styles.formCard}>
        <SectionHeading title={t("Add a business record")} subtitle={t("A simple entry is enough to start")} />
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("Record type")}</Text>
          <View style={styles.choiceWrap}>
            {RECORD_TYPES.map((option) => (
              <ChoiceChip
                key={option.value}
                label={t(option.label)}
                selected={recordType === option.value}
                onPress={() => {
                  setRecordType(option.value);
                  setCategory(CATEGORIES[option.value][0]);
                }}
              />
            ))}
          </View>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("Category")}</Text>
          <View style={styles.choiceWrap}>
            {CATEGORIES[recordType].map((value) => (
              <ChoiceChip
                key={value}
                label={t(CATEGORY_LABELS[value])}
                selected={category === value}
                onPress={() => setCategory(value)}
              />
            ))}
          </View>
        </View>
        <TextField
          label={t("Amount (KES)")}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          maxLength={14}
        />
        <TextField
          label={t("Date (YYYY-MM-DD)")}
          value={recordDate}
          onChangeText={setRecordDate}
          autoCapitalize="none"
          placeholder="YYYY-MM-DD"
          maxLength={10}
        />
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("Payment status")}</Text>
          <View style={styles.choiceWrap}>
            <ChoiceChip label={t("Paid / received")} selected={paymentStatus === "paid"} onPress={() => setPaymentStatus("paid")} />
            <ChoiceChip label={t("Still owed / not yet paid")} selected={paymentStatus === "unpaid"} onPress={() => setPaymentStatus("unpaid")} />
          </View>
        </View>
        <TextField
          label={t("Due date (YYYY-MM-DD, optional)")}
          value={dueDate}
          onChangeText={setDueDate}
          autoCapitalize="none"
          placeholder="YYYY-MM-DD"
          maxLength={10}
        />
        <ActionButton label={t("Save business record")} icon="save-outline" loading={saving} onPress={() => void saveRecord()} />
      </Card>

      <Card>
        <SectionHeading
          title={t("Pending sync")}
          subtitle={pendingCount ? `${pendingCount} ${t("Pending sync")}` : t("No entries are waiting to sync.")}
        />
        <ActionButton
          label={t("Sync pending entries")}
          icon="cloud-upload-outline"
          variant="secondary"
          loading={syncing}
          disabled={!pendingCount}
          onPress={() => void syncQueue()}
        />
      </Card>

      {queuedTransactions.length ? (
        <View>
          <SectionHeading title={t("Saved on this phone")} subtitle={t("These records stay here until the API accepts them.")} />
          <Card style={styles.listCard}>
            {queuedTransactions.map((entry, index) => (
              <View key={entry.clientId}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.transactionRow}>
                  <View style={[styles.statusDot, styles.unpaidDot]} />
                  <View style={styles.transactionCopy}>
                    <Text style={styles.transactionTitle}>{t(RECORD_TYPES.find((item) => item.value === entry.payload.transactionType)?.label ?? entry.payload.transactionType)}</Text>
                    <Text style={styles.transactionMeta}>{t(CATEGORY_LABELS[entry.payload.category])} · {entry.payload.transactionDate} · {t("Pending sync")}</Text>
                  </View>
                  <Text style={styles.transactionAmount}>{formatKes(entry.payload.amountKes)}</Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <View>
        <SectionHeading title={t("Latest business records")} subtitle={t("Financial figures are self-reported and are not an approval prediction.")} />
        {loading && transactions.length === 0 ? (
          <Card style={styles.loadingCard}><GrowingLoader /><Text style={styles.loadingText}>{t("Loading business records…")}</Text></Card>
        ) : transactions.length ? (
          <Card style={styles.listCard}>
            {transactions.map((transaction, index) => (
              <View key={transaction.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.transactionRow}>
                  <View style={[styles.statusDot, transaction.paymentStatus === "paid" ? styles.paidDot : styles.unpaidDot]} />
                  <View style={styles.transactionCopy}>
                    <Text style={styles.transactionTitle}>{t(RECORD_TYPES.find((item) => item.value === transaction.transactionType)?.label ?? transaction.transactionType)}</Text>
                    <Text style={styles.transactionMeta}>{t(CATEGORY_LABELS[transaction.category])} · {transaction.transactionDate}</Text>
                    {transaction.dueDate ? <Text style={styles.transactionMeta}>{t("Due")} {transaction.dueDate}</Text> : null}
                  </View>
                  <View style={styles.amountCopy}>
                    <Text style={styles.transactionAmount}>{formatKes(transaction.amountKes)}</Text>
                    <Text style={[styles.statusText, transaction.paymentStatus === "paid" ? styles.paidText : styles.unpaidText]}>
                      {t(transaction.paymentStatus === "paid" ? "Paid" : "Unpaid")}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={24} color={colors.greenDark} />
            <Text style={styles.emptyTitle}>{t("No business records yet")}</Text>
            <Text style={styles.emptyBody}>{t("Add your first sale or cost when you are ready.")}</Text>
          </Card>
        )}
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  summaryCard: { flexGrow: 1, flexBasis: "45%", gap: 8, padding: 14, borderRadius: 18 },
  summaryLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  summaryValue: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  loadingCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  loadingText: { color: colors.muted, fontSize: 12 },
  formCard: { gap: 16 },
  fieldGroup: { gap: 8 },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  listCard: { paddingVertical: 2 },
  transactionRow: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  paidDot: { backgroundColor: colors.green },
  unpaidDot: { backgroundColor: colors.gold },
  transactionCopy: { flex: 1, gap: 4 },
  transactionTitle: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  transactionMeta: { color: colors.muted, fontSize: 10 },
  amountCopy: { alignItems: "flex-end", gap: 4 },
  transactionAmount: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  statusText: { fontSize: 9, fontWeight: "700" },
  paidText: { color: colors.greenDark },
  unpaidText: { color: "#956616" },
  divider: { height: 1, backgroundColor: colors.line },
  emptyCard: { alignItems: "center", gap: 9, paddingVertical: 22 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  emptyBody: { color: colors.muted, fontSize: 11, textAlign: "center" },
});
