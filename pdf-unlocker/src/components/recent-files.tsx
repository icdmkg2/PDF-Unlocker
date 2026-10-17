"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import {
  HISTORY_EVENT,
  clearHistory,
  deleteHistoryEntry,
  listHistory,
  type HistoryEntry,
} from "@/lib/local-history";
import { toolByHref as toolsByHref } from "@/lib/tools";

const SHOWN = 6;

function timeAgo(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(ts).toLocaleDateString();
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Recent work on this device. Renders nothing until there is something to show. */
export function RecentFiles() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [now, setNow] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(() => {
    listHistory().then((list) => {
      setEntries(list);
      setNow(Date.now());
    });
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(HISTORY_EVENT, load);
    return () => window.removeEventListener(HISTORY_EVENT, load);
  }, [load]);

  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="recent-heading" className="mb-16">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
        <div>
          <h2 id="recent-heading" className="font-display text-2xl">Recent</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            File names and sizes only, kept in this browser. No file contents are stored.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs">
          {confirmClear ? (
            <>
              <button type="button" onClick={() => { clearHistory(); setConfirmClear(false); }} className="text-destructive hover:underline">
                Clear all
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} className="text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)} className="text-muted-foreground hover:text-foreground">
              Clear
            </button>
          )}
        </div>
      </div>

      <ul className="mt-2 grid gap-x-10 sm:grid-cols-2">
        {entries.slice(0, SHOWN).map((e) => {
          const tool = e.href ? toolsByHref.get(e.href) : undefined;
          const Icon = tool?.icon ?? FileText;
          const body = (
            <>
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{e.fileName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {tool?.label ?? e.tool} · {formatSize(e.size)} · {timeAgo(e.createdAt, now)}
                </span>
              </span>
            </>
          );
          return (
            <li key={e.id} className="group -mx-2 flex items-center rounded-md transition-colors hover:bg-card">
              {e.href ? (
                <Link href={e.href} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2">
                  {body}
                </Link>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2">{body}</div>
              )}
              <button
                type="button"
                aria-label={`Remove ${e.fileName} from recent`}
                onClick={() => deleteHistoryEntry(e.id)}
                className="mr-1 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
