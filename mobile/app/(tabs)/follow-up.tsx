import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "@/src/api";
import { useLanguage } from "@/src/i18n";
import { discardPendingEntries, enqueueEntry, makePendingEntry, readPendingEntries, syncPendingEntries, type PendingEntry } from "@/src/offlineQueue";
import type { BlockerStatus, MobileBlocker, MobileOrder } from "@/src/types";
import { ActionButton, Card, ChoiceChip, GrowingLoader, Notice, ScreenFrame, ScreenHeader, SectionHeading, TextField } from "@/src/ui";
import { colors } from "@/src/theme";

const STATUSES: BlockerStatus[] = ["open", "acknowledged", "in_progress", "resolved", "cannot_resolve", "closed"];
const BLOCKERS_CACHE_KEY = "@ekyan/mobile-follow-up-blockers";
const ORDERS_CACHE_KEY = "@ekyan/mobile-follow-up-orders";

type Draft = { status: BlockerStatus; note: string; confirmed: boolean };

function statusText(status: string, t: (key: string) => string) {
  const labels: Record<string, string> = {
    open: "Open",
    acknowledged: "Acknowledged",
    in_progress: "In progress",
    resolved: "Resolved",
    cannot_resolve: "Cannot resolve",
    closed: "Closed",
    committed: "Supplier committed",
    fulfilled: "Received",
  };
  return t(labels[status] ?? status.replaceAll("_", " "));
}

export default function FollowUpScreen() {
  const { t } = useLanguage();
  const [blockers, setBlockers] = useState<MobileBlocker[]>([]);
  const [orders, setOrders] = useState<MobileOrder[]>([]);
  const [pending, setPending] = useState<PendingEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineView, setOfflineView] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"success" | "info" | "error">("info");
  const [syncFailures, setSyncFailures] = useState<Record<string, string>>({});

  const loadData = useCallback(async (pullToRefresh = false) => {
    if (pullToRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [blockerResponse, orderResponse, pendingEntries] = await Promise.all([
        apiRequest<{ blockers: MobileBlocker[] }>("/api/v1/blockers"),
        apiRequest<{ orders: MobileOrder[] }>("/api/v1/orders"),
        readPendingEntries(),
      ]);
      await Promise.all([
        AsyncStorage.setItem(BLOCKERS_CACHE_KEY, JSON.stringify(blockerResponse.blockers)),
        AsyncStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(orderResponse.orders)),
      ]);
      setBlockers(blockerResponse.blockers);
      setOrders(orderResponse.orders);
      setPending(pendingEntries);
      setOfflineView(false);
      setDrafts((current) => {
        const next = { ...current };
        for (const blocker of blockerResponse.blockers) {
          const queued = [...pendingEntries].reverse().find((entry) => entry.kind === "blocker_update" && entry.payload.blockerId === blocker.id);
          if (queued) {
            next[blocker.id] = {
              status: (queued.payload.status as BlockerStatus) ?? blocker.status,
              note: String(queued.payload.resolutionNote ?? blocker.resolutionNote ?? ""),
              confirmed: queued.payload.farmerConfirmed === true,
            };
          } else if (!next[blocker.id] || next[blocker.id].status !== blocker.status) {
            next[blocker.id] = {
              status: blocker.status,
              note: blocker.resolutionNote ?? "",
              confirmed: blocker.farmerConfirmed,
            };
          }
        }
        return next;
      });
    } catch {
      try {
        const [cachedBlockers, cachedOrders, pendingEntries] = await Promise.all([
          AsyncStorage.getItem(BLOCKERS_CACHE_KEY),
          AsyncStorage.getItem(ORDERS_CACHE_KEY),
          readPendingEntries(),
        ]);
        const parsedBlockers: unknown = cachedBlockers ? JSON.parse(cachedBlockers) : null;
        const parsedOrders: unknown = cachedOrders ? JSON.parse(cachedOrders) : null;
        if (!Array.isArray(parsedBlockers) || !Array.isArray(parsedOrders)) throw new Error(t("No saved request list is available offline."));
        setBlockers(parsedBlockers as MobileBlocker[]);
        setOrders(parsedOrders as MobileOrder[]);
        setPending(pendingEntries);
        setOfflineView(true);
        setError("");
      } catch (cacheCause) {
        setError(cacheCause instanceof Error ? cacheCause.message : t("Requests could not be loaded."));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => {
    void loadData();
  }, [loadData]));

  async function queueAndSync(entry: PendingEntry, busyId = entry.clientId) {
    setSavingId(busyId);
    setError("");
    setFeedback("");
    try {
      await enqueueEntry(entry);
      setPending(await readPendingEntries());
      const result = await syncPendingEntries();
      setPending(await readPendingEntries());
      const rejection = result.rejected.find((item) => item.clientId === entry.clientId);
      if (rejection) {
        setSyncFailures((current) => ({ ...current, [entry.clientId]: rejection.reason ?? rejection.status }));
        setFeedbackTone("error");
        setFeedback(`${t("Saved on this phone. Sync needs attention:")} ${rejection.reason ?? rejection.status}`);
      } else {
        setSyncFailures((current) => {
          const next = { ...current };
          delete next[entry.clientId];
          return next;
        });
        setFeedbackTone("success");
        setFeedback(t("Update synced."));
        await loadData(true);
      }
    } catch (cause) {
      setFeedbackTone("info");
      setFeedback(`${t("Saved on this phone. It will sync when you are connected.")} ${cause instanceof Error ? cause.message : ""}`.trim());
      setPending(await readPendingEntries().catch(() => []));
    } finally { setSavingId(null); }
  }

  async function syncAll() {
    setSavingId("sync-all");
    setError("");
    try {
      const result = await syncPendingEntries();
      const remaining = await readPendingEntries();
      setPending(remaining);
      setSyncFailures(Object.fromEntries(result.rejected.map((item) => [item.clientId, item.reason ?? item.status])));
      if (result.rejected.length) {
        setFeedbackTone("error");
        setFeedback(`${t("Some updates need attention:")} ${result.rejected[0].reason ?? result.rejected[0].status}`);
      } else {
        setFeedbackTone("success");
        setFeedback(t("Updates synced."));
        await loadData(true);
      }
    } catch (cause) {
      setFeedbackTone("info");
      setFeedback(`${t("Updates remain saved on this phone until a connection returns.")} ${cause instanceof Error ? cause.message : ""}`.trim());
      setPending(await readPendingEntries().catch(() => []));
    } finally {
      setSavingId(null);
    }
  }

  async function saveBlocker(blocker: MobileBlocker) {
    const draft = drafts[blocker.id] ?? { status: blocker.status, note: "", confirmed: blocker.farmerConfirmed };
    if (["resolved", "cannot_resolve", "closed"].includes(draft.status) && !draft.note.trim()) {
      setError(t("Add a follow-up note before closing this request."));
      return;
    }
    if (draft.status === "resolved" && !draft.confirmed) {
      setError(t("Confirm with the farmer before marking this request resolved."));
      return;
    }
    const entry = makePendingEntry("blocker_update", {
      blockerId: blocker.id,
      expectedStatus: blocker.status,
      status: draft.status,
      resolutionNote: draft.note.trim(),
      farmerConfirmed: draft.confirmed,
      synthetic: true,
    });
    await queueAndSync(entry, blocker.id);
  }

  async function confirmOrder(order: MobileOrder) {
    if (order.status !== "committed") return;
    await queueAndSync(makePendingEntry("order_fulfilment", {
      orderId: order.id,
      expectedStatus: "committed",
      synthetic: true,
    }), order.id);
  }

  async function discardQueuedUpdate(clientId: string) {
    await discardPendingEntries([clientId]);
    setPending(await readPendingEntries());
    setSyncFailures((current) => {
      const next = { ...current };
      delete next[clientId];
      return next;
    });
    setFeedbackTone("info");
    setFeedback(t("Outdated update removed from this phone."));
    await loadData(true);
  }

  return (
    <ScreenFrame refreshing={refreshing} onRefresh={() => void loadData(true)} backgroundImage={require("../../assets/images/auth-signup.jpg")}>
      <ScreenHeader title={t("Follow up")} subtitle={t("See who is responding and what happens next.")} />

      <Notice title={t("Synthetic demo only")}>
        {t("Request details are fictional. Updates save on this phone first and sync safely when a connection is available.")}
      </Notice>
      {offlineView ? <Notice title={t("Showing saved request lists")} tone="info">{t("These lists may be out of date. Your changes will be checked against the server before they are applied.")}</Notice> : null}
      {error ? <Notice title={t("Could not save or load this update.")} tone="error">{error}</Notice> : null}
      {feedback ? <Notice title={t("Sync status")} tone={feedbackTone}>{feedback}</Notice> : null}

      <View>
        <SectionHeading title={t("Farmer needs")} subtitle={t("Owner, due date and response status")} />
        {loading ? (
          <Card style={styles.loadingCard}><GrowingLoader /><Text style={styles.muted}>{t("Loading requests…")}</Text></Card>
        ) : blockers.length ? blockers.map((blocker) => {
          const draft = drafts[blocker.id] ?? { status: blocker.status, note: "", confirmed: blocker.farmerConfirmed };
          const pendingUpdate = pending.find((entry) => entry.kind === "blocker_update" && entry.payload.blockerId === blocker.id);
          const isPending = Boolean(pendingUpdate);
          const pendingFailure = pendingUpdate ? syncFailures[pendingUpdate.clientId] : undefined;
          return (
            <Card key={blocker.id} style={styles.requestCard}>
              <View style={styles.cardTop}>
                <View style={styles.requestTitleWrap}>
                  <Text style={styles.requestTitle}>{blocker.description || t(blocker.category)}</Text>
                  <Text style={styles.requestMeta}>{t(blocker.category)} · {t(blocker.ward)} · {blocker.dueAt.slice(0, 10)}</Text>
                </View>
                <View style={[styles.statusPill, blocker.overdue && styles.statusPillLate]}>
                  <Text style={[styles.statusText, blocker.overdue && styles.statusTextLate]}>{blocker.overdue ? t("Overdue") : statusText(blocker.status, t)}</Text>
                </View>
              </View>
              <View style={styles.ownerRow}>
                <Ionicons name="person-outline" size={15} color={colors.muted} />
                <Text style={styles.ownerText}>{t("Follow-up owner")}: {t(blocker.routeTo.replaceAll("_", " "))}</Text>
                {blocker.urgency === "high" ? <Text style={styles.highUrgency}>{t("High")}</Text> : null}
              </View>
              <Text style={styles.fieldLabel}>{t("Update status")}</Text>
              <View style={styles.choices}>
                {STATUSES.map((status) => (
                  <ChoiceChip
                    key={status}
                    label={statusText(status, t)}
                    selected={draft.status === status}
                    onPress={() => setDrafts((current) => ({ ...current, [blocker.id]: { ...draft, status, confirmed: status === "resolved" ? draft.confirmed : false } }))}
                  />
                ))}
              </View>
              {["resolved", "cannot_resolve", "closed"].includes(draft.status) ? (
                <TextField
                  label={t("Response or reason")}
                  value={draft.note}
                  onChangeText={(note) => setDrafts((current) => ({ ...current, [blocker.id]: { ...draft, note } }))}
                  placeholder={t("What happened? Keep it brief.")}
                  multiline
                  maxLength={4000}
                />
              ) : null}
              {draft.status === "resolved" ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: draft.confirmed }}
                  onPress={() => setDrafts((current) => ({ ...current, [blocker.id]: { ...draft, confirmed: !draft.confirmed } }))}
                  style={styles.confirmRow}
                >
                  <View style={[styles.checkbox, draft.confirmed && styles.checkboxChecked]}>
                    {draft.confirmed ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                  </View>
                  <Text style={styles.confirmText}>{t("The agripreneur checked with the farmer and confirms this helped (proxy confirmation).")}</Text>
                </Pressable>
              ) : null}
              {isPending ? <Text style={styles.pendingText}>{t("Update saved on this phone; waiting to sync.")}</Text> : null}
              {pendingFailure ? <Text style={styles.failureText}>{pendingFailure}</Text> : null}
              <ActionButton
                label={t(pendingFailure ? "Remove outdated update" : isPending ? "Retry pending sync" : "Save follow-up")}
                icon={pendingFailure ? "trash-outline" : isPending ? "cloud-upload-outline" : "save-outline"}
                loading={savingId === blocker.id}
                onPress={() => void (pendingFailure && pendingUpdate ? discardQueuedUpdate(pendingUpdate.clientId) : isPending ? syncAll() : saveBlocker(blocker))}
              />
            </Card>
          );
        }) : <Card style={styles.emptyCard}><Text style={styles.emptyTitle}>{t("No farmer needs to follow up")}</Text><Text style={styles.muted}>{t("New blockers will appear here after they are recorded.")}</Text></Card>}
      </View>

      <View>
        <SectionHeading title={t("Input requests")} subtitle={t("Supplier commitment and delivery status")} />
        {!loading && !orders.some((order) => order.status !== "fulfilled") ? (
          <Card style={styles.emptyCard}><Text style={styles.emptyTitle}>{t(orders.length ? "No open input requests" : "No input requests yet")}</Text><Text style={styles.muted}>{t(orders.length ? "New input requests will appear here when recorded." : "Record a request when a farmer needs poultry inputs.")}</Text></Card>
        ) : orders.filter((order) => order.status !== "fulfilled").map((order) => {
          const pendingFulfilment = pending.find((entry) => entry.kind === "order_fulfilment" && entry.payload.orderId === order.id);
          const isPending = Boolean(pendingFulfilment);
          const pendingFailure = pendingFulfilment ? syncFailures[pendingFulfilment.clientId] : undefined;
          return (
            <Card key={order.id} style={styles.orderCard}>
              <View style={styles.cardTop}>
                <View style={styles.requestTitleWrap}>
                  <Text style={styles.requestTitle}>{order.quantity} · {t(order.item)}</Text>
                  <Text style={styles.requestMeta}>{t(order.ward)} · {t("Needed by")} {order.neededBy}</Text>
                </View>
                <View style={styles.statusPill}><Text style={styles.statusText}>{statusText(order.status, t)}</Text></View>
              </View>
              {order.status === "committed" ? (
                <>
                  <Text style={styles.orderHelp}>{t("The supplier has committed. Confirm when the farmer receives the input.")}</Text>
                  {pendingFailure ? <Text style={styles.failureText}>{pendingFailure}</Text> : null}
                  <ActionButton
                    label={t(pendingFailure ? "Remove outdated update" : isPending ? "Retry pending sync" : "Confirm received")}
                    icon={pendingFailure ? "trash-outline" : "checkmark-circle-outline"}
                    loading={savingId === order.id}
                    onPress={() => void (pendingFailure && pendingFulfilment ? discardQueuedUpdate(pendingFulfilment.clientId) : isPending ? syncAll() : confirmOrder(order))}
                  />
                </>
              ) : (
                <Text style={styles.orderHelp}>{isPending ? t("Receipt confirmation is saved on this phone and waiting to sync.") : t("Waiting for a supplier commitment.")}</Text>
              )}
            </Card>
          );
        })}
      </View>

      {pending.length > 0 ? (
        <Card>
          <SectionHeading title={t("Pending sync")} subtitle={`${pending.length} ${t("updates saved on this phone")}`} />
          <ActionButton label={t("Sync pending entries")} icon="cloud-upload-outline" variant="secondary" loading={savingId === "sync-all"} onPress={() => void syncAll()} />
        </Card>
      ) : null}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  loadingCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  requestCard: { gap: 12, marginBottom: 10 },
  orderCard: { gap: 12, marginBottom: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  requestTitleWrap: { flex: 1, gap: 4 },
  requestTitle: { color: colors.ink, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  requestMeta: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  statusPill: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: colors.greenSoft },
  statusPillLate: { backgroundColor: colors.goldSoft },
  statusText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  statusTextLate: { color: "#80570E" },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ownerText: { flex: 1, color: colors.muted, fontSize: 10 },
  highUrgency: { color: colors.danger, fontSize: 10, fontWeight: "800" },
  fieldLabel: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  confirmRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  checkbox: { width: 21, height: 21, borderRadius: 6, borderWidth: 1, borderColor: "#AABBB0", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  confirmText: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 15 },
  pendingText: { color: "#80570E", fontSize: 10, fontWeight: "700" },
  failureText: { color: colors.danger, fontSize: 10, lineHeight: 15 },
  orderHelp: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  emptyCard: { gap: 5, paddingVertical: 18 },
  emptyTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  muted: { color: colors.muted, fontSize: 11, lineHeight: 16 },
});
