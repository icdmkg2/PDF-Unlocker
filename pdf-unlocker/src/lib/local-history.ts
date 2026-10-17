const DB_NAME = "pdf-studio";
const STORE = "history";
const MAX_ENTRIES = 30;
export const HISTORY_EVENT = "pdf-studio:history-changed";

/** A record of work done, kept in this browser only. File contents are never stored. */
export interface HistoryEntry {
  id: string;
  tool: string;
  /** Path of the tool page, for linking back. Missing on entries saved before it existed. */
  href?: string;
  fileName: string;
  createdAt: number;
  size: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(HISTORY_EVENT));
}

export async function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "createdAt" | "href">): Promise<void> {
  try {
    const db = await openDb();
    const full: HistoryEntry = {
      ...entry,
      href: typeof window !== "undefined" ? window.location.pathname : undefined,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(full);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await trimHistory(db);
    db.close();
    notify();
  } catch {
    // IndexedDB may be blocked; ignore
  }
}

async function trimHistory(db: IDBDatabase) {
  const all = await new Promise<HistoryEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as HistoryEntry[]);
    req.onerror = () => reject(req.error);
  });
  if (all.length <= MAX_ENTRIES) return;
  all.sort((a, b) => b.createdAt - a.createdAt);
  const drop = all.slice(MAX_ENTRIES);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    for (const e of drop) tx.objectStore(STORE).delete(e.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listHistory(): Promise<HistoryEntry[]> {
  try {
    const db = await openDb();
    const all = await new Promise<HistoryEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as HistoryEntry[]);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    notify();
  } catch {
    // ignore
  }
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    notify();
  } catch {
    // ignore
  }
}
