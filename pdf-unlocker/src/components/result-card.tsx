"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Check, Download, Pencil, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/pdf-utils";
import { setHandoff } from "@/lib/handoff";
import { getChain, recordResult, replaceVersionFile, rewindTo, subscribeChain, type Version } from "@/lib/versions";
import { NEXT_STEPS } from "@/lib/next-steps";
import { toolByHref as toolsByHref } from "@/lib/tools";


/** "Original" or the tool that made the version, e.g. "Merge". */
function versionLabel(v: Version): string {
  return v.tool ? (toolsByHref.get(v.tool)?.label ?? "Edited") : "Original";
}

/** The document's versions this session; pick one to download it or go back to it. */
function History({ chain, current, onGoBack }: { chain: Version[]; current: Version; onGoBack: (v: Version) => void }) {
  const [picked, setPicked] = useState<Version | null>(null);
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="font-label text-muted-foreground">Versions this session</p>
      <ol className="flex flex-wrap items-center gap-1.5" aria-label="Versions">
        {chain.map((v, i) => {
          const isCurrent = v.id === current.id;
          return (
            <li key={v.id} className="flex items-center gap-1.5">
              {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/60" aria-hidden />}
              <button
                type="button"
                aria-current={isCurrent ? "step" : undefined}
                aria-pressed={picked?.id === v.id}
                disabled={isCurrent}
                onClick={() => setPicked(picked?.id === v.id ? null : v)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                  isCurrent
                    ? "border-emerald-500/50 bg-emerald-500/10 text-foreground"
                    : picked?.id === v.id
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {versionLabel(v)}
              </button>
            </li>
          );
        })}
      </ol>
      {picked && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-background px-3 py-2 text-xs">
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            <span className="text-foreground">{picked.file.name}</span> · {formatSize(picked.file.size)}
          </span>
          <button type="button" onClick={() => downloadBlob(picked.file, picked.file.name)} className="underline underline-offset-4 hover:text-foreground">
            Download this version
          </button>
          <button type="button" onClick={() => onGoBack(picked)} className="underline underline-offset-4 hover:text-foreground">
            Go back to this version
          </button>
        </div>
      )}
    </div>
  );
}

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

  // Record this result as the newest version of the document (PDFs only;
  // a ZIP or .txt can't be opened by the next tool).
  useEffect(() => {
    if (isPdf) recordResult(pathname, blob, fileName);
  }, [blob, isPdf, pathname, fileName]);
  const chain = useSyncExternalStore(subscribeChain, getChain, getChain);
  const version = chain.find((v) => v.source === blob) ?? null;

  /** The file to hand on: this version, renamed if the user renamed it. */
  const handOffFile = () => {
    if (version && version.file.name === finalName) return version.file;
    const file = new File([blob], finalName, { type: blob.type });
    if (version) replaceVersionFile(version.id, file);
    return file;
  };

  const openNext = (href: string) => {
    setHandoff([handOffFile()]);
    router.push(href);
  };

  /** Go back to an earlier version: drop what came after and reopen it in the step that followed. */
  const goBack = (target: Version) => {
    const at = chain.findIndex((v) => v.id === target.id);
    const nextTool = chain[at + 1]?.tool ?? pathname;
    rewindTo(target.id);
    setHandoff([target.file]);
    if (nextTool === pathname) onReset();
    else router.push(nextTool);
  };

  const position = version ? chain.findIndex((v) => v.id === version.id) : -1;
  const previous = position > 0 ? chain[position - 1] : null;

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
          {previous && (
            <Button variant="outline" onClick={() => goBack(previous)} title={`Back to ${versionLabel(previous)}`}>
              <Undo2 className="h-4 w-4" /> Undo
            </Button>
          )}
          <Button variant="ghost" onClick={onReset}>
            <RotateCcw className="h-4 w-4" /> {resetLabel}
          </Button>
        </div>

        {version && chain.length > 1 && <History chain={chain} current={version} onGoBack={goBack} />}
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
