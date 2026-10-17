"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSize } from "@/components/result-card";
import { PageThumb } from "@/components/workbench";

export interface PageBox {
  /** Rendered size in CSS pixels. */
  width: number;
  height: number;
  /** PDF page size in points. */
  ptWidth: number;
  ptHeight: number;
}

/**
 * One page drawn large enough to work on. Fits the available width (up to
 * maxWidth) and reports its size so tools can map between screen and PDF
 * coordinates. Children are positioned over the page.
 */
export function PageCanvas({
  doc,
  index,
  maxWidth = 720,
  onBox,
  children,
  className,
}: {
  doc: PDFDocumentProxy;
  index: number;
  maxWidth?: number;
  onBox?: (box: PageBox) => void;
  children?: (box: PageBox) => React.ReactNode;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [avail, setAvail] = useState(0);
  const [box, setBox] = useState<PageBox | null>(null);
  const onBoxRef = useRef(onBox);
  useEffect(() => {
    onBoxRef.current = onBox;
  });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setAvail(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!avail) return;
    let live = true;
    let task: { cancel: () => void } | null = null;
    (async () => {
      const page = await doc.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      // Fit the width and keep the whole page on screen, leaving room for the controls.
      const maxHeight = Math.max(360, window.innerHeight - 300);
      const width = Math.min(avail, maxWidth, (maxHeight * base.width) / base.height);
      const scale = width / base.width;
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr });
      const canvas = canvasRef.current;
      if (!canvas || !live) return;
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      canvas.style.width = `${Math.round(base.width * scale)}px`;
      canvas.style.height = `${Math.round(base.height * scale)}px`;
      const render = page.render({ canvasContext: canvas.getContext("2d")!, canvas, viewport });
      task = render;
      await render.promise.catch(() => {});
      if (!live) return;
      const next = { width: base.width * scale, height: base.height * scale, ptWidth: base.width, ptHeight: base.height };
      setBox(next);
      onBoxRef.current?.(next);
    })();
    return () => {
      live = false;
      task?.cancel();
    };
  }, [doc, index, avail, maxWidth]);

  return (
    <div ref={wrapRef} className={cn("flex w-full justify-center", className)}>
      <div className="relative bg-white shadow-[0_8px_30px_rgba(0,0,0,.45)]" style={box ? { width: box.width, height: box.height } : { width: "100%", aspectRatio: "3/4", maxWidth }}>
        <canvas ref={canvasRef} className="block" />
        {!box && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#8a8680]" />
          </div>
        )}
        {box && children?.(box)}
      </div>
    </div>
  );
}

/**
 * Viewer-first frame: a page strip, the current page large, and the tool's
 * controls in a bar floating under the page.
 */
export function Viewer({
  file,
  doc,
  pageCount,
  page,
  onPage,
  onChangeFile,
  dock,
  badgeOf,
  children,
}: {
  file: File;
  doc: PDFDocumentProxy | null;
  pageCount: number;
  page: number;
  onPage: (i: number) => void;
  onChangeFile: () => void;
  dock: React.ReactNode;
  /** Small marker on a strip thumbnail, e.g. a count of redactions. */
  badgeOf?: (i: number) => React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // No overflow clipping here: it would stop the control bar from sticking to the screen bottom.
    <div className="rounded-lg border border-border bg-[#111]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-t-lg border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
        <span className="min-w-0 truncate text-sm text-foreground">{file.name}</span>
        <span className="font-mono text-[10px]">{formatSize(file.size)}</span>
        <button type="button" onClick={onChangeFile} className="underline underline-offset-4 hover:text-foreground">
          Change file
        </button>
        {pageCount > 1 && (
          <span className="ml-auto flex items-center gap-1">
            <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)} className="rounded p-1 hover:text-foreground disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular-nums">
              Page {page + 1} of {pageCount}
            </span>
            <button type="button" aria-label="Next page" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)} className="rounded p-1 hover:text-foreground disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </span>
        )}
      </div>

      <div className={cn("grid", pageCount > 1 && "md:grid-cols-[6.5rem_minmax(0,1fr)]")}>
        {doc && pageCount > 1 && (
          <ol className="hidden max-h-[calc(100vh-14rem)] space-y-3 overflow-y-auto border-r border-border p-3 md:block" aria-label="Pages">
            {Array.from({ length: pageCount }, (_, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onPage(i)}
                  aria-current={i === page ? "page" : undefined}
                  aria-label={`Show page ${i + 1}`}
                  className={cn("relative block w-full rounded p-1 transition-colors", i === page ? "ring-2 ring-primary" : "hover:bg-card")}
                >
                  <PageThumb doc={doc} index={i} />
                  <span className="mt-1 block text-center font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                  {badgeOf?.(i)}
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className="min-w-0 px-4 pb-28 pt-6 sm:px-8">
          {doc ? children : (
            <div className="flex items-center justify-center gap-3 py-24 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading pages…
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none sticky bottom-4 z-20 -mt-24 flex justify-center px-3 pb-4">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-border bg-[#1b1b1b]/95 px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,.5)] backdrop-blur">
          {dock}
        </div>
      </div>
    </div>
  );
}

/** Label + control pair for the dock. */
export function DockItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function DockDivider() {
  return <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />;
}
