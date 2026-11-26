import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "@/src/api";
import { useLanguage } from "@/src/i18n";
import { readPendingEntries } from "@/src/offlineQueue";
import type { BusinessTransaction, FinanceProfile, MobileBlocker, MobileOrder } from "@/src/types";
import { ActionButton, Card, GrowingLoader, MetricCard, Notice, ScreenFrame, ScreenHeader, SectionHeading } from "@/src/ui";
import { colors } from "@/src/theme";

const BLOCKERS_CACHE_KEY = "@ekyan/mobile-follow-up-blockers";
const ORDERS_CACHE_KEY = "@ekyan/mobile-follow-up-orders";

function formatKes(value: number) {
  return `KES ${Math.round(value).toLocaleString("en-KE")}`;
}

function transactionName(type: string, t: (key: string) => string) {
  const label: Record<string, string> = {
    sale: "Income · sale",
    service: "Income · sale",
    other_income: "Income · sale",
    purchase: "Cost · purchase",
    other_expense: "Cost · purchase",
    loan_received: "Loan received",
    loan_repayment: "Loan repayment",
    savings_deposit: "Savings deposit",
  };
  return t(label[type] ?? "Business book");
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<FinanceProfile | null>(null);
  const [transactions, setTransactions] = useState<BusinessTransaction[]>([]);
  const [blockers, setBlockers] = useState<MobileBlocker[]>([]);
  const [orders, setOrders] = useState<MobileOrder[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (pullToRefresh = false) => {
    if (pullToRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const pending = await readPendingEntries();
      setPendingCount(pending.length);
    } catch {
      setPendingCount(0);
    }

    try {
      const [blockerResponse, orderResponse] = await Promise.all([
        apiRequest<{ blockers: MobileBlocker[] }>("/api/v1/blockers"),
        apiRequest<{ orders: MobileOrder[] }>("/api/v1/orders"),
      ]);
      await Promise.all([
        AsyncStorage.setItem(BLOCKERS_CACHE_KEY, JSON.stringify(blockerResponse.blockers)),
        AsyncStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(orderResponse.orders)),
      ]);
      setBlockers(blockerResponse.blockers);
      setOrders(orderResponse.orders);
    } catch (cause) {
      try {
        const [cachedBlockers, cachedOrders] = await Promise.all([
          AsyncStorage.getItem(BLOCKERS_CACHE_KEY),
          AsyncStorage.getItem(ORDERS_CACHE_KEY),
        ]);
        const decodedBlockers: unknown = cachedBlockers ? JSON.parse(cachedBlockers) : null;
        const decodedOrders: unknown = cachedOrders ? JSON.parse(cachedOrders) : null;
        if (!Array.isArray(decodedBlockers) || !Array.isArray(decodedOrders)) throw new Error(t("No saved request list is available offline."));
        setBlockers(decodedBlockers as MobileBlocker[]);
        setOrders(decodedOrders as MobileOrder[]);
        setError(t("Showing saved request lists"));
      } catch (cacheCause) {
        setError(cacheCause instanceof Error ? cacheCause.message : cause instanceof Error ? cause.message : t("Requests could not be loaded."));
      }
    }

    const [profileResult, transactionsResult] = await Promise.allSettled([
      apiRequest<FinanceProfile>("/api/v1/profiles/me"),
      apiRequest<{ transactions: BusinessTransaction[] }>("/api/v1/transactions"),
    ]);
    if (profileResult.status === "fulfilled") setProfile(profileResult.value);
    if (transactionsResult.status === "fulfilled") setTransactions(transactionsResult.value.transactions.slice(0, 4));
    setLoading(false);
    setRefreshing(false);
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const activeBlockers = blockers.filter((item) => ["open", "acknowledged", "in_progress"].includes(item.status));
  const activeOrders = orders.filter((item) => item.status !== "fulfilled");
  const nextItems = [
    ...activeBlockers.map((item) => ({
      id: `blocker-${item.id}`,
      title: item.description || t(item.category),
      detail: `${t(item.routeTo.replaceAll("_", " "))} · ${item.dueAt.slice(0, 10)}`,
      urgent: item.overdue || item.urgency === "high",
    })),
    ...activeOrders.map((item) => ({
      id: `order-${item.id}`,
      title: `${item.quantity} · ${t(item.item)}`,
      detail: `${t(item.status === "committed" ? "Supplier committed" : "Waiting for supplier")} · ${item.neededBy}`,
      urgent: item.status === "committed",
    })),
  ].sort((a, b) => Number(b.urgent) - Number(a.urgent)).slice(0, 3);

  return (
    <ScreenFrame refreshing={refreshing} onRefresh={() => void loadData(true)} backgroundImage={require("../../assets/images/auth-login.jpg")}>
      <ScreenHeader title={t("Good morning")} subtitle={t("Your local-first agripreneur workspace")} />

      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.heroOrbitOne} />
        <View pointerEvents="none" style={styles.heroOrbitTwo} />
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}><Ionicons name="leaf" size={22} color="#E6F4DC" /></View>
          <View style={styles.heroTag}>
            <View style={styles.liveDot} />
            <Text style={styles.heroTagText}>BUSIA · POULTRY</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>{t("Keep farmer requests moving.")}</Text>
        <Text style={styles.heroBody}>{t("See what needs attention, record a request, and follow it through—even offline.")}</Text>
        <View style={styles.heroActions}>
          <Pressable onPress={() => router.push("/(tabs)/field-log")} style={styles.heroActionPrimary}>
            <Ionicons name="leaf-outline" size={18} color={colors.forest} />
            <Text style={styles.heroActionPrimaryText}>{t("Plant a field note")}</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/follow-up")} style={styles.heroActionSecondary}>
            <Ionicons name="git-branch-outline" size={18} color="#FFFFFF" />
            <Text style={styles.heroActionSecondaryText}>{t("Follow the trail")}</Text>
          </Pressable>
        </View>
      </View>

      <Notice title={t("Synthetic demo only")}>
        {t("Do not enter real farmer or financial details. This app stores demo records on this device and syncs them only to the local EKYAN API.")}
      </Notice>

      {pendingCount > 0 ? (
        <Pressable onPress={() => router.push("/(tabs)/field-log")} style={styles.queueBanner}>
          <Ionicons name="cloud-upload-outline" size={19} color="#8C5A08" />
          <Text style={styles.queueText}>{pendingCount} {t("Pending sync")}</Text>
          <Ionicons name="chevron-forward" size={16} color="#8C5A08" />
        </Pressable>
      ) : null}

      {error ? (
        <Notice title={t(error === t("Showing saved request lists") ? "Showing saved request lists" : "Requests could not be loaded.")} tone={error === t("Showing saved request lists") ? "info" : "error"}>{error === t("Showing saved request lists") ? t("These lists may be out of date. Your changes will be checked against the server before they are applied.") : error}</Notice>
      ) : null}

      <View>
        <SectionHeading title={t("Pilot activity")} subtitle={t("Needs and input requests that are not yet complete.")} />
        <View style={styles.metrics}>
          <Pressable onPress={() => router.push("/(tabs)/follow-up")} style={styles.metricAction}>
            <MetricCard label={t("Farmer needs")} value={loading ? "…" : String(activeBlockers.length)} icon="alert-circle-outline" tone="gold" />
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/follow-up")} style={styles.metricAction}>
            <MetricCard label={t("Input requests")} value={loading ? "…" : String(activeOrders.length)} icon="basket-outline" tone="blue" />
          </Pressable>
        </View>
      </View>

      <View>
        <SectionHeading
          title={t("Next actions")}
          subtitle={t("Start with overdue requests or supplier commitments.")}
          action={<Pressable onPress={() => router.push("/(tabs)/follow-up")}><Text style={styles.linkText}>{t("See all")}</Text></Pressable>}
        />
        {nextItems.length ? (
          <Card style={styles.nextList}>
            {nextItems.map((item, index) => (
              <Pressable key={item.id} onPress={() => router.push("/(tabs)/follow-up")} style={({ pressed }) => [styles.nextRow, index > 0 && styles.nextDivider, pressed && styles.rowPressed]}>
                <View style={[styles.nextDot, item.urgent && styles.nextDotUrgent]} />
                <View style={styles.nextCopy}><Text numberOfLines={1} style={styles.nextTitle}>{item.title}</Text><Text style={styles.nextMeta}>{item.detail}</Text></View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </Card>
        ) : !loading ? (
          <Card style={styles.emptyNext}><Ionicons name="checkmark-circle-outline" size={21} color={colors.greenDark} /><Text style={styles.nextTitle}>{t("No open requests")}</Text></Card>
        ) : null}
      </View>

      <View>
        <SectionHeading
          title={t("Business records")}
          subtitle={t("Self-reported records for your own review.")}
        />
        {loading && !profile ? (
          <Card style={styles.loadingCard}>
            <GrowingLoader size={17} />
            <Text style={styles.loadingText}>{t("Loading your local profile…")}</Text>
          </Card>
        ) : profile ? (
          <View style={styles.metrics}>
            <MetricCard label={t("Recorded income")} value={formatKes(profile.business.revenue_kes)} icon="trending-up-outline" />
            <MetricCard label={t("Operating costs")} value={formatKes(profile.business.expenses_kes)} icon="cart-outline" tone="gold" />
            <MetricCard label={t("Operating surplus")} value={formatKes(profile.business.operating_surplus_kes)} icon="wallet-outline" tone="blue" />
            <MetricCard
              label={t("Months with records")}
              value={`${profile.record_coverage.months_with_entries}/${profile.record_coverage.months_in_period}`}
              icon="calendar-outline"
            />
          </View>
        ) : null}
      </View>

      <View>
        <SectionHeading
          title={t("Latest business records")}
          action={
            <Pressable onPress={() => router.push("/(tabs)/business-book")} accessibilityRole="button">
              <Text style={styles.linkText}>{t("See all")}</Text>
            </Pressable>
          }
        />
        {transactions.length ? (
          <Card style={styles.transactionCard}>
            {transactions.map((transaction, index) => (
              <View key={transaction.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.transactionRow}>
                  <View style={styles.transactionIcon}>
                    <Ionicons name={transaction.paymentStatus === "paid" ? "arrow-down-outline" : "time-outline"} size={17} color={colors.greenDark} />
                  </View>
                  <View style={styles.transactionCopy}>
                    <Text style={styles.transactionTitle}>{transactionName(transaction.transactionType, t)}</Text>
                    <Text style={styles.transactionMeta}>{transaction.transactionDate} · {t(transaction.paymentStatus === "paid" ? "Paid" : "Unpaid")}</Text>
                  </View>
                  <Text style={styles.transactionAmount}>{formatKes(transaction.amountKes)}</Text>
                </View>
              </View>
            ))}
          </Card>
        ) : !loading && !error ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={24} color={colors.greenDark} />
            <Text style={styles.emptyTitle}>{t("No business records yet")}</Text>
            <Text style={styles.emptyBody}>{t("Add your first sale or cost when you are ready.")}</Text>
            <ActionButton label={t("Keep a simple business book")} onPress={() => router.push("/(tabs)/business-book")} icon="arrow-forward" variant="secondary" />
          </Card>
        ) : null}
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.forest, borderRadius: 26, padding: 21, gap: 14, overflow: "hidden", borderBottomRightRadius: 54 },
  heroOrbitOne: { position: "absolute", width: 210, height: 210, borderWidth: 1, borderColor: "#FFFFFF14", borderRadius: 105, right: -102, top: -92 },
  heroOrbitTwo: { position: "absolute", width: 160, height: 160, borderWidth: 1, borderColor: "#FFFFFF12", borderRadius: 80, right: -74, top: -68 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroIcon: { width: 43, height: 43, borderRadius: 22, backgroundColor: "#FFFFFF1C", alignItems: "center", justifyContent: "center" },
  heroTag: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#FFFFFF17" },
  liveDot: { height: 7, width: 7, borderRadius: 4, backgroundColor: "#D8B15B" },
  heroTagText: { color: "#E8F0E7", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  heroTitle: { maxWidth: 340, color: "#FFFFFF", fontSize: 27, lineHeight: 33, fontWeight: "800", letterSpacing: -0.8 },
  heroBody: { color: "#D3E5D9", fontSize: 12, lineHeight: 18 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 1 },
  heroActionPrimary: { flexGrow: 1, flexBasis: "46%", minHeight: 48, paddingHorizontal: 12, borderRadius: 99, backgroundColor: "#E6F2DB", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  heroActionPrimaryText: { color: colors.forest, fontSize: 12, fontWeight: "800" },
  heroActionSecondary: { flexGrow: 1, flexBasis: "46%", minHeight: 48, paddingHorizontal: 12, borderRadius: 99, borderColor: "#FFFFFF55", borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  heroActionSecondaryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  queueBanner: { minHeight: 46, paddingHorizontal: 14, borderRadius: 15, backgroundColor: colors.goldSoft, flexDirection: "row", alignItems: "center", gap: 9 },
  queueText: { flex: 1, color: "#80570E", fontSize: 12, fontWeight: "800" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 9, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 5 },
  metricAction: { flex: 1, minWidth: "46%" },
  nextList: { paddingVertical: 2 },
  nextRow: { minHeight: 61, flexDirection: "row", alignItems: "center", gap: 10 },
  nextDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  rowPressed: { backgroundColor: "#ECEDE2" },
  nextDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue },
  nextDotUrgent: { backgroundColor: colors.gold },
  nextCopy: { flex: 1, gap: 4 },
  nextTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  nextMeta: { color: colors.muted, fontSize: 10 },
  emptyNext: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 8 },
  loadingCard: { minHeight: 85, flexDirection: "row", alignItems: "center", gap: 12 },
  loadingText: { color: colors.muted, fontSize: 12 },
  linkText: { color: colors.greenDark, fontSize: 11, fontWeight: "800" },
  transactionCard: { paddingVertical: 2 },
  transactionRow: { minHeight: 67, flexDirection: "row", alignItems: "center", gap: 10 },
  transactionIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" },
  transactionCopy: { flex: 1, gap: 4 },
  transactionTitle: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  transactionMeta: { color: colors.muted, fontSize: 10 },
  transactionAmount: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  divider: { height: 1, backgroundColor: colors.line },
  emptyCard: { alignItems: "center", gap: 9, paddingVertical: 22 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  emptyBody: { color: colors.muted, fontSize: 11, textAlign: "center" },
});
