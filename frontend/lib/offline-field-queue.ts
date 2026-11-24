export type FieldEntryKind = "farmer" | "order" | "blocker" | "transaction" | "intention";

export interface PendingFieldEntry {
  clientId: string;
  kind: FieldEntryKind;
  actedBy: string;
  onBehalfOf?: string;
  createdAt: string;
  payload: Record<string, string | number | boolean>;
  syncStatus: "pending_sync";
}

const DATABASE = "ekyan-connect-preview";
const STORE = "field-entries";
const VERSION = 1;

function openQueue(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("This browser does not support local offline storage."));
      return;
    }

    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: "clientId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local field storage."));
  });
}

export async function listPendingFieldEntries(): Promise<PendingFieldEntry[]> {
  const database = await openQueue();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).getAll();
    request.onsuccess = () => {
      resolve((request.result as PendingFieldEntry[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    };
    request.onerror = () => reject(request.error ?? new Error("Could not read the local field queue."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Reading the local field queue was aborted."));
    transaction.oncomplete = () => database.close();
  });
}

export async function savePendingFieldEntry(entry: PendingFieldEntry): Promise<void> {
  const database = await openQueue();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(entry);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save this field entry locally."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Saving the field entry was aborted."));
  });
}

export async function removeSyncedFieldEntries(clientIds: string[]): Promise<void> {
  if (!clientIds.length) return;
  const database = await openQueue();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    for (const clientId of clientIds) store.delete(clientId);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove synced field entries."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Removing synced field entries was aborted."));
  });
}
