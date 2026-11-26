import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "./api";

const QUEUE_KEY = "@ekyan/mobile-pending-entries";
const BATCH_SIZE = 100;

export type QueueKind = "transaction" | "intention" | "blocker" | "order" | "farmer" | "blocker_update" | "order_fulfilment";

export type PendingEntry = {
  clientId: string;
  kind: QueueKind;
  payload: Record<string, unknown>;
  onBehalfOf?: string;
  createdAt: string;
};

type SyncResult = {
  clientId: string;
  status: string;
  reason?: string;
};

function isPendingEntry(value: unknown): value is PendingEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.clientId === "string" &&
    (entry.kind === "transaction" || entry.kind === "intention" || entry.kind === "blocker" ||
      entry.kind === "order" || entry.kind === "farmer" || entry.kind === "blocker_update" || entry.kind === "order_fulfilment") &&
    !!entry.payload &&
    typeof entry.payload === "object" &&
    !Array.isArray(entry.payload) &&
    typeof entry.createdAt === "string"
  );
}

export async function readPendingEntries(): Promise<PendingEntry[]> {
  const saved = await AsyncStorage.getItem(QUEUE_KEY);
  if (!saved) return [];
  let decoded: unknown;
  try {
    decoded = JSON.parse(saved);
  } catch {
    throw new Error("Saved offline entries could not be read. Keep this app data and contact support.");
  }
  if (!Array.isArray(decoded) || !decoded.every(isPendingEntry)) {
    throw new Error("The saved offline queue has an unexpected format.");
  }
  return decoded;
}

export function makePendingEntry(
  kind: QueueKind,
  payload: Record<string, unknown>,
  onBehalfOf?: string
): PendingEntry {
  const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    clientId: kind === "farmer" ? `synthetic-farmer-${uniquePart}` : uniquePart,
    kind,
    payload,
    onBehalfOf,
    createdAt: new Date().toISOString(),
  };
}

export async function enqueueEntry(entry: PendingEntry) {
  const pending = await readPendingEntries();
  if (pending.some((saved) => saved.clientId === entry.clientId)) return pending;
  const updated = [...pending, entry];
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  return updated;
}

async function removeEntries(clientIds: string[]) {
  if (!clientIds.length) return;
  const accepted = new Set(clientIds);
  const remaining = (await readPendingEntries()).filter((entry) => !accepted.has(entry.clientId));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

export async function discardPendingEntries(clientIds: string[]) {
  await removeEntries(clientIds);
}

export async function syncPendingEntries() {
  const pending = await readPendingEntries();
  if (!pending.length) return { synced: 0, rejected: [] as SyncResult[] };
  const batch = pending.slice(0, BATCH_SIZE);
  const response = await apiRequest<{ results: SyncResult[] }>("/api/v1/sync", {
    method: "POST",
    body: JSON.stringify({
      entries: batch.map(({ clientId, kind, payload, onBehalfOf, createdAt }) => ({
        clientId,
        kind,
        payload,
        onBehalfOf,
        createdAt,
      })),
    }),
  });
  const acceptedIds = response.results
    .filter((result) => result.status === "created" || result.status === "duplicate")
    .map((result) => result.clientId);
  await removeEntries(acceptedIds);
  return {
    synced: acceptedIds.length,
    rejected: response.results.filter((result) => result.status !== "created" && result.status !== "duplicate"),
  };
}
