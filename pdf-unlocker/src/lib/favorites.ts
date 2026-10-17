/**
 * Favorite tools, kept in this browser's localStorage as an ordered list of
 * tool paths (most recently starred last). Same snapshot pattern as
 * saved-passwords so React can subscribe with useSyncExternalStore.
 */
import { toolByHref } from "./tools";

const KEY = "pdf-studio:favorite-tools";
const EVENT = "pdf-studio:favorites-changed";
const EMPTY: string[] = [];

let cache: { raw: string | null; list: string[] } = { raw: null, list: EMPTY };

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Favorite tool paths, filtered to tools that still exist. Stable until storage changes. */
export function getFavorites(): string[] {
  const raw = readRaw();
  if (raw === cache.raw) return cache.list;
  let list = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed.filter((h): h is string => typeof h === "string" && toolByHref.has(h));
  } catch {
    // corrupt value; treat as empty
  }
  cache = { raw, list };
  return list;
}

export function getServerFavorites(): string[] {
  return EMPTY;
}

export function subscribeFavorites(onChange: () => void): () => void {
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

function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // storage blocked; favorites just won't persist
  }
}

export function isFavorite(href: string): boolean {
  return getFavorites().includes(href);
}

export function toggleFavorite(href: string): void {
  if (!toolByHref.has(href)) return;
  const list = getFavorites();
  write(list.includes(href) ? list.filter((h) => h !== href) : [...list, href]);
}

/** Move a favorite one place earlier (-1) or later (+1). */
export function moveFavorite(href: string, by: -1 | 1): void {
  const list = [...getFavorites()];
  const i = list.indexOf(href);
  const j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  write(list);
}
