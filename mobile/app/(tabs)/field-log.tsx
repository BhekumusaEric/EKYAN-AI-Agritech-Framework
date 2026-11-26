import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "@/src/api";
import { useLanguage } from "@/src/i18n";
import { enqueueEntry, makePendingEntry, readPendingEntries, syncPendingEntries, type PendingEntry, type QueueKind } from "@/src/offlineQueue";
import type { FarmerReference } from "@/src/types";
import { ActionButton, Card, ChoiceChip, Notice, ScreenFrame, ScreenHeader, SectionHeading, TextField } from "@/src/ui";
import { colors } from "@/src/theme";

type EntryType = "farmer" | "order" | "blocker" | "intention";
type Feedback = { tone: "success" | "info" | "error"; message: string };

const CATEGORIES = ["Inputs", "Finance", "Water", "Market", "Disease", "Labour", "Land access", "Time"];
const INPUTS = ["Day-old chicks", "Feed (bags)", "Vaccines (doses)", "Drinkers/feeders"];
const WARDS = ["Teso South", "Nambale", "Matayos"];
const URGENCIES = ["low", "medium", "high"] as const;
const FARMER_CACHE_KEY = "@ekyan/mobile-synthetic-farmers";

function tomorrowIsoDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function isValidFutureDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value &&
    value >= new Date().toISOString().slice(0, 10);
}

function parseCachedFarmers(value: string): FarmerReference[] {
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    throw new Error("Saved synthetic farmer references are unreadable.");
  }
  if (!Array.isArray(decoded) || !decoded.every((item) =>
    item && typeof item === "object" &&
    typeof item.id === "string" &&
    item.id.startsWith("synthetic-farmer-") &&
    item.synthetic === true
  )) {
    throw new Error("Saved synthetic farmer references have an unexpected format.");
  }
  return decoded;
}

function pendingFarmerReferences(entries: PendingEntry[]): FarmerReference[] {
  return entries
    .filter((entry) => entry.kind === "farmer" && typeof entry.payload.name === "string")
    .map((entry) => ({ id: entry.clientId, name: String(entry.payload.name), synthetic: true }));
}

function mergeFarmerReferences(server: FarmerReference[], pending: FarmerReference[]) {
  const known = new Set(server.map((farmer) => farmer.id));
  return [...server, ...pending.filter((farmer) => !known.has(farmer.id))];
}

export default function FieldLogScreen() {
  const { t } = useLanguage();
  const [entryType, setEntryType] = useState<EntryType>("order");
  const [farmers, setFarmers] = useState<FarmerReference[]>([]);
  const [farmerId, setFarmerId] = useState("");
  const [farmerName, setFarmerName] = useState("");
  const [village, setVillage] = useState("");
  const [practice, setPractice] = useState("");
  const [targetDate, setTargetDate] = useState(tomorrowIsoDate());
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Inputs");
  const [ward, setWard] = useState("Teso South");
  const [urgency, setUrgency] = useState<(typeof URGENCIES)[number]>("medium");
  const [inputItem, setInputItem] = useState(INPUTS[1]);
  const [inputQuantity, setInputQuantity] = useState("");
  const [inputNeededBy, setInputNeededBy] = useState(tomorrowIsoDate());
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [routeConfirmed, setRouteConfirmed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const selectedFarmerId = farmerId || farmers[0]?.id || "";

  const loadLocalAndFarmers = useCallback(async () => {
    setLoading(true);
    setError("");
    let pendingEntries: PendingEntry[] = [];
    try {
      pendingEntries = await readPendingEntries();
      setPendingCount(pendingEntries.length);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("The entry could not be saved locally."));
    }

    try {
      const farmerResponse = await apiRequest<{ farmers: FarmerReference[] }>("/api/v1/farmers");
      const demoFarmers = farmerResponse.farmers.filter(
        (farmer) => farmer.synthetic && farmer.id.startsWith("synthetic-farmer-")
      );
      const combined = mergeFarmerReferences(demoFarmers, pendingFarmerReferences(pendingEntries)).slice(0, 12);
      setFarmers(combined);
      try {
        await AsyncStorage.setItem(FARMER_CACHE_KEY, JSON.stringify(combined));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t("Synthetic farmer references could not be cached."));
      }
    } catch (cause) {
      const apiError = cause instanceof Error ? cause.message : t("Farmer records could not be loaded.");
      try {
        const cached = await AsyncStorage.getItem(FARMER_CACHE_KEY);
        if (cached) setFarmers(mergeFarmerReferences(parseCachedFarmers(cached), pendingFarmerReferences(pendingEntries)).slice(0, 12));
        else setFarmers([]);
        setError(apiError);
      } catch (cacheCause) {
        setFarmers([]);
        setError(`${apiError} ${cacheCause instanceof Error ? cacheCause.message : t("Saved synthetic farmer references could not be read.")}`);
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void loadLocalAndFarmers();
    }, [loadLocalAndFarmers])
  );

  async function refreshPendingCount() {
    const pending = await readPendingEntries();
    setPendingCount(pending.length);
  }

  async function syncQueue() {
    setSyncing(true);
    try {
      const result = await syncPendingEntries();
      await refreshPendingCount();
      if (result.rejected.length) {
        setFeedback({
          tone: "error",
          message: `${t("Still queued on this phone:")} ${result.rejected[0].reason ?? result.rejected[0].status}`,
        });
      } else if (result.synced) {
        setFeedback({ tone: "success", message: t("Saved and synced to the local demo API.") });
        await loadLocalAndFarmers();
      } else {
        setFeedback({ tone: "info", message: t("No entries are waiting to sync.") });
      }
    } catch (cause) {
      setFeedback({
        tone: "info",
        message: `${t("Still queued on this phone:")} ${cause instanceof Error ? cause.message : t("The entry could not be saved locally.")}`,
      });
    } finally {
      setSyncing(false);
    }
  }

  async function saveEntry() {
    setError("");
    setFeedback(null);
    if (entryType !== "farmer" && !selectedFarmerId.startsWith("synthetic-farmer-")) {
      setError(t("Choose a synthetic farmer record first."));
      return;
    }
    if (!consentConfirmed) {
      setError(t("Confirm consent before recording this entry."));
      return;
    }

    let kind: QueueKind;
    let payload: Record<string, unknown>;
    if (entryType === "farmer") {
      const name = farmerName.trim();
      const villageName = village.trim();
      if (name.length < 3 || !/^(Synthetic|Demo)\s.+/i.test(name) || villageName.length < 2 || !/^(Synthetic|Demo)\s.+/i.test(villageName)) {
        setError(t("Farmer name and village must begin with Synthetic or Demo."));
        return;
      }
      kind = "farmer";
      payload = {
        name,
        village: villageName,
        ward,
        county: "Busia",
        consentToRecord: true,
        synthetic: true,
      };
    } else if (entryType === "order") {
      const numericQuantity = Number(inputQuantity);
      if (!Number.isFinite(numericQuantity) || numericQuantity <= 0 || numericQuantity > 1_000_000) {
        setError(t("Enter a quantity greater than zero."));
        return;
      }
      if (!isValidFutureDate(inputNeededBy)) {
        setError(t("Choose today or a future date."));
        return;
      }
      kind = "order";
      payload = {
        farmerId: selectedFarmerId,
        item: inputItem,
        quantity: numericQuantity,
        neededBy: inputNeededBy,
        ward,
        county: "Busia",
        synthetic: true,
      };
    } else {
      const descriptionToSave = entryType === "intention" ? practice.trim() : description.trim();
      if (descriptionToSave.length < 8 || !/^(Synthetic|Demo)\s.+/i.test(descriptionToSave)) {
        setError(t("Start descriptions with Synthetic or Demo. Do not enter real names or phone numbers."));
        return;
      }
      if (entryType === "blocker" && !routeConfirmed) {
        setError(t("Review and confirm the category and urgency before routing."));
        return;
      }
      if (entryType === "intention" && !isValidFutureDate(targetDate)) {
        setError(t("Choose today or a future date."));
        return;
      }
      kind = entryType;
      payload = entryType === "intention"
        ? { farmerId: selectedFarmerId, practice: descriptionToSave, targetDate, synthetic: true }
        : {
            farmerId: selectedFarmerId,
            category,
            description: descriptionToSave,
            ward,
            county: "Busia",
            urgency,
            confirmedSuggestion: true,
            synthetic: true,
          };
    }
    setSaving(true);
    try {
      const entry = makePendingEntry(kind, payload, entryType === "farmer" ? undefined : selectedFarmerId);
      await enqueueEntry(entry);
      if (entryType === "farmer") {
        const newReference = { id: entry.clientId, name: String(payload.name), synthetic: true };
        setFarmerId(entry.clientId);
        setFarmers((current) => {
          const merged = mergeFarmerReferences(current, [newReference]);
          void AsyncStorage.setItem(FARMER_CACHE_KEY, JSON.stringify(merged)).catch(() => undefined);
          return merged;
        });
      }
      await refreshPendingCount();
      setFeedback({ tone: "success", message: t("Saved on this phone.") });
      if (entryType === "farmer") {
        setFarmerName("");
        setVillage("");
      } else if (entryType === "intention") setPractice("");
      else if (entryType === "blocker") setDescription("");
      else setInputQuantity("");
      setConsentConfirmed(false);
      setRouteConfirmed(false);
      await syncQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("The entry could not be saved locally."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenFrame>
      <ScreenHeader title={t("Record a need")} subtitle={t("Capture a farmer need, input request or practice intention")} />

      <Notice title={t("Synthetic demo only")}>
        {t("Do not enter real farmer or financial details. This app stores demo records on this device and syncs them only to the local EKYAN API.")}
      </Notice>

      {error ? <Notice title={t("The entry could not be saved locally.")} tone="error">{error}</Notice> : null}
      {feedback ? <Notice title={t(feedback.tone === "success" ? "Saved on this phone." : feedback.tone === "error" ? "Still queued on this phone:" : "Pending sync")} tone={feedback.tone}>{feedback.message}</Notice> : null}

      <View>
        <SectionHeading title={t("Record an update")} subtitle={t("Choose a record type")} />
        <View style={styles.entryChoices}>
          <ChoiceChip label={t("Input request")} selected={entryType === "order"} onPress={() => setEntryType("order")} />
          <ChoiceChip label={t("Farmer need")} selected={entryType === "blocker"} onPress={() => setEntryType("blocker")} />
          <ChoiceChip label={t("Add farmer")} selected={entryType === "farmer"} onPress={() => setEntryType("farmer")} />
          <ChoiceChip label={t("Practice intention")} selected={entryType === "intention"} onPress={() => setEntryType("intention")} />
        </View>
      </View>

      <Card style={styles.formCard}>
        <View style={styles.recordMark}>
          <Ionicons name={entryType === "intention" ? "leaf-outline" : entryType === "order" ? "basket-outline" : entryType === "farmer" ? "person-add-outline" : "hand-left-outline"} size={19} color={colors.greenDark} />
          <Text style={styles.recordMarkText}>{t(entryType === "intention" ? "Practice intention" : entryType === "order" ? "Input request" : entryType === "farmer" ? "Add farmer" : "Farmer need")}</Text>
        </View>

        {entryType === "farmer" ? (
          <>
            <TextField label={t("Synthetic farmer name")} value={farmerName} onChangeText={setFarmerName} placeholder={t("Example: Synthetic farmer 003")} maxLength={120} />
            <TextField label={t("Synthetic village")} value={village} onChangeText={setVillage} placeholder={t("Example: Synthetic village 003")} maxLength={120} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("Ward")}</Text>
              <View style={styles.choiceWrap}>{WARDS.map((item) => <ChoiceChip key={item} label={t(item)} selected={ward === item} onPress={() => setWard(item)} />)}</View>
            </View>
          </>
        ) : <View style={styles.farmerPicker}>
          <Text style={styles.fieldLabel}>{t("Choose a farmer record")}</Text>
          {loading ? (
            <Text style={styles.helperText}>{t("Loading synthetic farmer records…")}</Text>
          ) : farmers.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.farmerChips}>
              {farmers.map((farmer, index) => (
                <ChoiceChip
                  key={farmer.id}
                  label={farmer.name ?? `${t("Synthetic farmer record")} ${index + 1}`}
                  selected={selectedFarmerId === farmer.id}
                  onPress={() => setFarmerId(farmer.id)}
                />
              ))}
            </ScrollView>
          ) : (
              <Notice title={t("No farmer records are available. Add a synthetic farmer record here first.")} tone="info">
              {t("Use Add farmer to create a synthetic farmer record on this phone.")}
            </Notice>
          )}
          <TextField
            label={t("Farmer reference")}
            value={selectedFarmerId}
            onChangeText={setFarmerId}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="synthetic-farmer-001"
          />
        </View>}

        {entryType === "farmer" ? null : entryType === "intention" ? (
          <>
            <TextField
              label={t("Practice description")}
              value={practice}
              onChangeText={setPractice}
              placeholder={t("Example: Synthetic vaccination plan")}
              maxLength={200}
            />
            <TextField
              label={t("Target date (YYYY-MM-DD)")}
              value={targetDate}
              onChangeText={setTargetDate}
              autoCapitalize="none"
              placeholder="YYYY-MM-DD"
              maxLength={10}
            />
          </>
        ) : entryType === "blocker" ? (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("Category")}</Text>
              <View style={styles.choiceWrap}>
                {CATEGORIES.map((item) => (
                  <ChoiceChip key={item} label={t(item)} selected={category === item} onPress={() => { setCategory(item); setRouteConfirmed(false); }} />
                ))}
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("Ward")}</Text>
              <View style={styles.choiceWrap}>
                {WARDS.map((item) => (
                  <ChoiceChip key={item} label={t(item)} selected={ward === item} onPress={() => setWard(item)} />
                ))}
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("Urgency")}</Text>
              <View style={styles.choiceWrap}>
                {URGENCIES.map((item) => (
                  <ChoiceChip key={item} label={t(item[0].toUpperCase() + item.slice(1))} selected={urgency === item} onPress={() => { setUrgency(item); setRouteConfirmed(false); }} />
                ))}
              </View>
            </View>
            <TextField
              label={t("What is the need?")}
              value={description}
              onChangeText={setDescription}
              placeholder={t("Example: Synthetic feed access issue")}
              multiline
              maxLength={4000}
            />
          </>
        ) : (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("Poultry input")}</Text>
              <View style={styles.choiceWrap}>
                {INPUTS.map((input) => (
                  <ChoiceChip key={input} label={t(input)} selected={inputItem === input} onPress={() => setInputItem(input)} />
                ))}
              </View>
            </View>
            <TextField
              label={t("Quantity")}
              value={inputQuantity}
              onChangeText={setInputQuantity}
              keyboardType="decimal-pad"
              placeholder="1"
              maxLength={12}
            />
            <TextField
              label={t("Needed by (YYYY-MM-DD)")}
              value={inputNeededBy}
              onChangeText={setInputNeededBy}
              autoCapitalize="none"
              placeholder="YYYY-MM-DD"
              maxLength={10}
            />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("Ward")}</Text>
              <View style={styles.choiceWrap}>
                {WARDS.map((item) => <ChoiceChip key={item} label={t(item)} selected={ward === item} onPress={() => setWard(item)} />)}
              </View>
            </View>
          </>
        )}

        {entryType !== "order" && entryType !== "farmer" ? <Text style={styles.helperText}>{t("Start descriptions with Synthetic or Demo. Do not enter real names or phone numbers.")}</Text> : null}
        {entryType === "blocker" ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: routeConfirmed }}
            onPress={() => setRouteConfirmed((current) => !current)}
            style={styles.consentRow}
          >
            <View style={[styles.checkbox, routeConfirmed && styles.checkboxChecked]}>
              {routeConfirmed ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.consentText}>
              {t("I reviewed and confirm the category and urgency before routing this need.")}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consentConfirmed }}
          onPress={() => setConsentConfirmed((current) => !current)}
          style={styles.consentRow}
        >
          <View style={[styles.checkbox, consentConfirmed && styles.checkboxChecked]}>
            {consentConfirmed ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
          </View>
          <Text style={styles.consentText}>
            {t("I have consent to record this synthetic farmer entry. This does not grant consent to share a finance profile.")}
          </Text>
        </Pressable>

        <ActionButton
          label={t("Save to this phone")}
          icon="save-outline"
          loading={saving}
          disabled={loading || (entryType !== "farmer" && !farmers.length) || !consentConfirmed || (entryType === "blocker" && !routeConfirmed)}
          onPress={() => void saveEntry()}
        />
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
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  entryChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  formCard: { gap: 16 },
  recordMark: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  recordMarkText: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  farmerPicker: { gap: 10 },
  farmerChips: { gap: 7, paddingVertical: 1, paddingRight: 12 },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  helperText: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  fieldGroup: { gap: 8 },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: { width: 21, height: 21, borderRadius: 6, borderWidth: 1, borderColor: "#AABBB0", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  consentText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
});
