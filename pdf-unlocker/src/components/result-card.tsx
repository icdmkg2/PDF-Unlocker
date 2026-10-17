"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Check, Download, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/pdf-utils";
import { setHandoff } from "@/lib/handoff";
import { NEXT_STEPS } from "@/lib/next-steps";
import { toolSections } from "@/lib/tools";

const toolsByHref = new Map(toolSections.flatMap((s) => s.tools).map((t) => [t.href, t]));

export interface Fact {
  label: string;
  value: string;
  good?: boolean;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function countPages(blob: Blob): Promise<number | null> {
  try {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
    return doc.isEncrypted ? null : doc.getPageCount();
  } catch {
    return null;
  }
}

/**
 * What a tool produced: name, before/after numbers, download, and the tools
 * that usually come next, which open with this output already loaded.
 */
export function ResultCard({
  verb,
  blob,
  fileName,
  inputSize,
  facts,
  note,
  actions,
  onReset,
  resetLabel = "Start over",
}: {
  /** Past tense, e.g. "Merged". */
  verb: string;
  blob: Blob;
  fileName: string;
  /** Total size of what went in, to show the change. */
  inputSize?: number;
  /** Extra facts shown before the computed ones. */
  facts?: Fact[];
  note?: React.ReactNode;
  actions?: React.ReactNode;
  onReset: () => void;
  resetLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isPdf = blob.type === "application/pdf";
  const [pages, setPages] = useState<number | null>(null);
  const [name, setName] = useState(fileName);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    let live = true;
    if (isPdf) countPages(blob).then((n) => live && setPages(n));
    return () => {
      live = false;
    };
  }, [blob, isPdf]);

  const ext = fileName.match(/\.[a-z0-9]+$/i)?.[0] ?? "";
  const finalName = name.trim() ? (name.trim().toLowerCase().endsWith(ext.toLowerCase()) ? name.trim() : name.trim() + ext) : fileName;

  const all: Fact[] = [...(facts ?? [])];
  if (pages != null) all.push({ label: "Pages", value: String(pages) });
  all.push({ label: "Size", value: formatSize(blob.size) });
  if (inputSize) {
    const change = Math.round((blob.size / inputSize - 1) * 100);
    all.push({
      label: "Change",
      value: change === 0 ? "Same" : `${change > 0 ? "+" : "−"}${Math.abs(change)}%`,
      good: change < 0,
    });
  }

  const next = isPdf ? (NEXT_STEPS[pathname] ?? []).map((h) => toolsByHref.get(h)).filter(Boolean) : [];

  const openNext = (href: string) => {
    setHandoff([new File([blob], finalName, { type: blob.type })]);
    router.push(href);
  };

  return (
    <div className={cn("grid gap-4", next.length > 0 && "lg:grid-cols-[minmax(0,1fr)_15rem]")} data-testid="result-card">
      <div className="space-y-4 rounded-lg border border-border bg-card p-5">
        <span className="font-label flex items-center gap-2 text-emerald-500/90">
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {verb}
        </span>

        {renaming ? (
          <div className="flex items-center gap-2">
            <input
              id="result-name"
              aria-label="File name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setRenaming(false)}
              className="font-display min-w-0 flex-1 border-b border-border bg-transparent text-2xl focus:border-muted-foreground focus:outline-none"
            />
            <button type="button" aria-label="Done renaming" onClick={() => setRenaming(false)} className="rounded p-1.5 text-muted-foreground hover:text-foreground">
              <Check className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="font-display break-words text-2xl leading-tight sm:text-[1.75rem]">{finalName}</p>
        )}

        <dl
          className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border max-sm:[&>*:last-child:nth-child(odd)]:col-span-2 sm:[grid-template-columns:repeat(var(--facts),minmax(0,1fr))]"
          style={{ "--facts": all.length } as React.CSSProperties}
        >
          {all.map((f) => (
            <div key={f.label} className="bg-card px-3 py-2.5">
              <dt className="font-label text-[9px] text-muted-foreground">{f.label}</dt>
              <dd className={cn("mt-0.5 text-sm font-medium tabular-nums", f.good && "text-emerald-500")}>{f.value}</dd>
            </div>
          ))}
        </dl>

        {note && <div className="text-xs leading-relaxed text-muted-foreground">{note}</div>}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => downloadBlob(blob, finalName)}>
            <Download className="h-4 w-4" /> Download
          </Button>
          <Button variant="outline" onClick={() => setRenaming(true)}>
            <Pencil className="h-4 w-4" /> Rename
          </Button>
          {actions}
          <Button variant="ghost" onClick={onReset}>
            <RotateCcw className="h-4 w-4" /> {resetLabel}
          </Button>
        </div>
      </div>

      {next.length > 0 && (
        <nav aria-label="Next steps" className="self-start rounded-lg border border-border p-4">
          <p className="font-label mb-2 text-muted-foreground">Next, with this file</p>
          <ul>
            {next.map((t) => {
              const Icon = t!.icon;
              return (
                <li key={t!.href}>
                  <button
                    type="button"
                    onClick={() => openNext(t!.href)}
                    className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-card"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{t!.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{t!.desc}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
