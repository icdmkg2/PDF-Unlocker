"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadPdfDocument } from "@/lib/pdf-utils";
import { formatSize } from "@/components/result-card";

/** Load a PDF once with pdf.js for previews. */
export function usePdfDoc(file: File | null) {
  const [state, setState] = useState<{ file: File; doc: PDFDocumentProxy | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!file) return;
    let live = true;
    let loaded: PDFDocumentProxy | null = null;
    file
      .arrayBuffer()
      .then((buf) => loadPdfDocument(buf))
      .then((doc) => {
        loaded = doc;
        if (live) setState({ file, doc, error: null });
        else doc.destroy();
      })
      .catch((err) => {
        if (live) setState({ file, doc: null, error: err instanceof Error ? err.message : "Couldn't read this PDF." });
      });
    return () => {
      live = false;
      loaded?.destroy();
    };
  }, [file]);

  const current = state?.file === file ? state : null;
  return {
    doc: current?.doc ?? null,
    pageCount: current?.doc?.numPages ?? 0,
    loading: !!file && !current,
    error: current?.error ?? null,
  };
}

const cache = new WeakMap<PDFDocumentProxy, Map<number, string>>();

async function renderThumb(doc: PDFDocumentProxy, index: number, width: number): Promise<string> {
  let docCache = cache.get(doc);
  if (!docCache) cache.set(doc, (docCache = new Map()));
  const hit = docCache.get(index);
  if (hit) return hit;
  const page = await doc.getPage(index + 1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: (width * 2) / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvasContext: canvas.getContext("2d")!, canvas, viewport }).promise;
  const url = canvas.toDataURL("image/jpeg", 0.8);
  docCache.set(index, url);
  return url;
}

/** One page preview, rendered only once it scrolls near the viewport. */
export function PageThumb({
  doc,
  index,
  rotation = 0,
  overlay,
  className,
}: {
  doc: PDFDocumentProxy;
  index: number;
  rotation?: number;
  overlay?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(() => cache.get(doc)?.get(index) ?? null);

  useEffect(() => {
    if (src) return;
    const el = ref.current;
    if (!el) return;
    let live = true;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          renderThumb(doc, index, 160).then((url) => live && setSrc(url)).catch(() => {});
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, [doc, index, src]);

  const sideways = rotation % 180 !== 0;
  return (
    <div ref={ref} className={cn("relative flex aspect-[3/4] items-center justify-center", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Page ${index + 1}`}
          draggable={false}
          className="max-h-full max-w-full rounded-[2px] bg-white shadow-sm transition-transform duration-200"
          style={{ transform: `rotate(${rotation}deg)${sideways ? " scale(0.75)" : ""}` }}
        />
      ) : (
        <div className="h-full w-full animate-pulse rounded-[2px] bg-muted" />
      )}
      {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}
    </div>
  );
}

/** Click toggles a page; shift-click adds every page between it and the last one clicked. */
export function nextSelection(current: Set<number>, index: number, anchor: number | null, shift: boolean): Set<number> {
  const next = new Set(current);
  if (shift && anchor !== null) {
    const [lo, hi] = anchor < index ? [anchor, index] : [index, anchor];
    for (let i = lo; i <= hi; i++) next.add(i);
  } else if (next.has(index)) {
    next.delete(index);
  } else {
    next.add(index);
  }
  return next;
}

export function PageGrid({
  doc,
  order,
  selected,
  onSelect,
  rotationOf,
  overlayOf,
  labelOf,
  onDelete,
  onMove,
}: {
  doc: PDFDocumentProxy;
  /** Page indices to show, in display order. */
  order: number[];
  selected?: Set<number>;
  onSelect?: (next: Set<number>) => void;
  rotationOf?: (index: number) => number;
  overlayOf?: (index: number) => React.ReactNode;
  labelOf?: (index: number, position: number) => React.ReactNode;
  /** Organize: remove the page at this display position. */
  onDelete?: (position: number) => void;
  /** Organize: drag reorder by display position. */
  onMove?: (from: number, to: number) => void;
}) {
  const anchor = useRef<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4" aria-label="Pages">
      {order.map((pageIndex, position) => {
        const isSelected = selected?.has(pageIndex) ?? false;
        return (
          <li
            key={`${pageIndex}-${position}`}
            className={cn("group relative", dragFrom === position && "opacity-50")}
            draggable={!!onMove}
            onDragStart={() => setDragFrom(position)}
            onDragOver={(e) => {
              if (!onMove || dragFrom === null) return;
              e.preventDefault();
              if (dragFrom !== position) {
                onMove(dragFrom, position);
                setDragFrom(position);
              }
            }}
            onDragEnd={() => setDragFrom(null)}
          >
            <button
              type="button"
              aria-pressed={onSelect ? isSelected : undefined}
              aria-label={`Page ${pageIndex + 1}`}
              onClick={(e) => {
                if (!onSelect || !selected) return;
                onSelect(nextSelection(selected, pageIndex, anchor.current, e.shiftKey));
                anchor.current = pageIndex;
              }}
              className={cn(
                "block w-full rounded-md p-2 transition-colors",
                onMove ? "cursor-grab active:cursor-grabbing" : onSelect ? "cursor-pointer" : "cursor-default",
                isSelected ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-card"
              )}
            >
              <PageThumb doc={doc} index={pageIndex} rotation={rotationOf?.(pageIndex) ?? 0} overlay={overlayOf?.(pageIndex)} />
              <span className={cn("mt-1.5 block text-center font-mono text-[10px]", isSelected ? "text-foreground" : "text-muted-foreground")}>
                {labelOf ? labelOf(pageIndex, position) : pageIndex + 1}
              </span>
            </button>
            {onDelete && (
              <button
                type="button"
                aria-label={`Delete page ${pageIndex + 1}`}
                onClick={() => onDelete(position)}
                className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Options on the left, the pages on the right; stacks on narrow screens. */
export function Workbench({ panel, header, children }: { panel: React.ReactNode; header?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="space-y-5 rounded-lg border border-border bg-card p-4 lg:sticky lg:top-6">{panel}</aside>
      <section className="min-w-0 rounded-lg border border-border bg-[#111] p-4">
        {header && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">{header}</div>}
        {children}
      </section>
    </div>
  );
}

export function PanelFile({ file, pageCount, onChange }: { file: File; pageCount: number; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{file.name}</p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {pageCount ? `${pageCount} pages · ` : ""}
          {formatSize(file.size)}
        </p>
      </div>
      <button type="button" onClick={onChange} className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Change
      </button>
    </div>
  );
}

export function PanelField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

/** Small pill choices for the narrow options panel. */
export function Pills<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            value === o.id ? "border-primary/60 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LoadingPages() {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading pages…
    </div>
  );
}

/** Select all / none / odd / even controls for the stage header. */
export function SelectionControls({
  count,
  selected,
  onSelect,
}: {
  count: number;
  selected: Set<number>;
  onSelect: (s: Set<number>) => void;
}) {
  const pick = (f: (i: number) => boolean) => onSelect(new Set(Array.from({ length: count }, (_, i) => i).filter(f)));
  const btn = "underline-offset-4 hover:text-foreground hover:underline";
  return (
    <>
      <span>
        {selected.size === 0 ? "Click pages to select · Shift-click for a range" : `${selected.size} of ${count} selected`}
      </span>
      <span className="flex gap-3">
        <button type="button" className={btn} onClick={() => pick(() => true)}>All</button>
        <button type="button" className={btn} onClick={() => pick((i) => i % 2 === 0)}>Odd</button>
        <button type="button" className={btn} onClick={() => pick((i) => i % 2 === 1)}>Even</button>
        <button type="button" className={btn} onClick={() => onSelect(new Set())}>None</button>
      </span>
    </>
  );
}
