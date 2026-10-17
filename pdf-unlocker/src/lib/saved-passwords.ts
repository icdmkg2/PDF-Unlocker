/**
 * Passwords the user chose to remember, kept in this browser's localStorage.
 * Nothing here is sent anywhere. Values are stored as plain text, which the UI
 * states before anyone opts in.
 */

export interface SavedPassword {
  id: string;
  name: string;
  password: string;
  createdAt: number;
  lastUsedAt: number | null;
}

const KEY = "pdf-studio:saved-passwords";
const EVENT = "pdf-studio:saved-passwords-changed";
const EMPTY: SavedPassword[] = [];

let cache: { raw: string | null; list: SavedPassword[] } = { raw: null, list: EMPTY };

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Stable snapshot for useSyncExternalStore: same array until storage changes. */
export function getSavedPasswords(): SavedPassword[] {
  const raw = readRaw();
  if (raw === cache.raw) return cache.list;
  let list: SavedPassword[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed.filter(isSavedPassword);
  } catch {
    // corrupt value; treat as empty
  }
  cache = { raw, list };
  return list;
}

export function getServerSnapshot(): SavedPassword[] {
  return EMPTY;
}

export function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onChange);
  };
}

function write(list: SavedPassword[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

/**
 * Save a password under a name. If the same password is already saved, its
 * name is updated instead of adding a duplicate. Returns false when storage
 * is unavailable (private mode, blocked site data).
 */
export function savePassword(password: string, name: string): boolean {
  if (!password) return false;
  const list = getSavedPasswords();
  const label = name.trim() || defaultName(list);
  const existing = list.find((p) => p.password === password);
  if (existing) {
    return write(list.map((p) => (p.id === existing.id ? { ...p, name: name.trim() || p.name } : p)));
  }
  const entry: SavedPassword = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: label,
    password,
    createdAt: Date.now(),
    lastUsedAt: null,
  };
  return write([entry, ...list]);
}

export function renamePassword(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  write(getSavedPasswords().map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
}

export function deletePassword(id: string): void {
  write(getSavedPasswords().filter((p) => p.id !== id));
}

export function clearPasswords(): void {
  write([]);
}

export function markPasswordUsed(password: string): void {
  const list = getSavedPasswords();
  if (!list.some((p) => p.password === password)) return;
  write(list.map((p) => (p.password === password ? { ...p, lastUsedAt: Date.now() } : p)));
}

/** Most recently used first, then newest. */
export function sortForUse(list: SavedPassword[]): SavedPassword[] {
  return [...list].sort(
    (a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || b.createdAt - a.createdAt
  );
}

function defaultName(list: SavedPassword[]): string {
  return `Password ${list.length + 1}`;
}

function isSavedPassword(v: unknown): v is SavedPassword {
  const p = v as SavedPassword;
  return !!p && typeof p.id === "string" && typeof p.name === "string" && typeof p.password === "string";
}
