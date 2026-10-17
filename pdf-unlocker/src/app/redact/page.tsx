"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard } from "@/components/result-card";
import { ErrorNote } from "@/components/steps";
import { usePdfDoc } from "@/components/workbench";
import { DockDivider, PageCanvas, Viewer } from "@/components/viewer";
import { EyeOff, Loader2, SlidersHorizontal, Undo2, X } from "lucide-react";
import { applyRedactions, type Redaction } from "@/lib/pdf-redact";
import { addHistoryEntry } from "@/lib/local-history";

export default function RedactPage() {
  const [file, setFile] = useState<File | null>(null);
  const { doc, pageCount } = usePdfDoc(file);
  const [page, setPage] = useState(0);
  const [redactions, setRedactions] = useState<Redaction[]>([]);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const start = useRef<{ x: number; y: number; k: number } | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setPage(0);
    setRedactions([]);
    setError(null);
    setResult(null);
  }, []);

  const reset = () => {
    setFile(null);
    setRedactions([]);
    setError(null);
    setResult(null);
  };

  const onPage = redactions.filter((r) => r.pageIndex === page);
  const pagesTouched = new Set(redactions.map((r) => r.pageIndex)).size;

  const handleApply = async () => {
    if (!file || !redactions.length) return;
    setWorking(true);
    setError(null);
    try {
      const bytes = await applyRedactions(file, redactions);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResult(blob);
      void addHistoryEntry({ tool: "Redact", fileName: file.name, size: blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redaction failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <ToolLayout title="Redact PDF" description="Draw boxes over anything private; it is removed for good" icon={EyeOff} wide>
      {!file ? (
        <PdfDropzone onFiles={handleFiles} label="Drop the PDF to redact" />
      ) : result ? (
        <ResultCard
          verb={`${redactions.length} area${redactions.length === 1 ? "" : "s"} redacted`}
          blob={result}
          fileName={file.name.replace(/\.pdf$/i, "") + "_redacted.pdf"}
          facts={[{ label: "Pages changed", value: String(pagesTouched) }]}
          note="Redacted pages are now images: the covered content is gone, and text on those pages can't be selected."
          actions={
            <Button variant="outline" onClick={() => setResult(null)}>
              <SlidersHorizontal className="h-4 w-4" /> Adjust
            </Button>
          }
          onReset={reset}
          resetLabel="Redact another"
        />
      ) : (
        <div className="space-y-3">
          <EncryptedNotice file={file} />
          <p className="rounded-lg border border-[#3d3420] bg-[#1a1610] px-3 py-2 text-xs leading-relaxed text-[#d4c4a0]">
            Each page you redact is rebuilt as an image with the boxes burned in, so nothing underneath can be recovered.
            Text on those pages won&apos;t be selectable afterwards.
          </p>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Viewer
            file={file}
            doc={doc}
            pageCount={pageCount}
            page={page}
            onPage={setPage}
            onChangeFile={reset}
            badgeOf={(i) => {
              const n = redactions.filter((r) => r.pageIndex === i).length;
              return n ? (
                <span className="absolute right-1 top-1 rounded bg-[#0c0c0c] px-1 font-mono text-[9px] text-[#f2efe9]">{n}</span>
              ) : null;
            }}
            dock={
              <>
                <span className="text-xs text-muted-foreground">
                  {redactions.length === 0
                    ? "Drag over the page to cover something"
                    : `${redactions.length} box${redactions.length === 1 ? "" : "es"} on ${pagesTouched} page${pagesTouched === 1 ? "" : "s"}`}
                </span>
                <DockDivider />
                <Button size="sm" variant="ghost" disabled={!redactions.length} onClick={() => setRedactions(redactions.slice(0, -1))}>
                  <Undo2 className="h-4 w-4" /> Undo
                </Button>
                <Button size="sm" variant="ghost" disabled={!onPage.length} onClick={() => setRedactions(redactions.filter((r) => r.pageIndex !== page))}>
                  Clear page
                </Button>
                <Button size="sm" onClick={handleApply} disabled={!redactions.length || working}>
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />} Redact
                </Button>
              </>
            }
          >
            {doc && (
              <PageCanvas doc={doc} index={page}>
                {(box) => {
                  const k = box.width / box.ptWidth;
                  const local = (e: React.PointerEvent) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    return { x: Math.max(0, Math.min(e.clientX - r.left, box.width)), y: Math.max(0, Math.min(e.clientY - r.top, box.height)) };
                  };
                  return (
                    <div
                      data-testid="redact-surface"
                      className="absolute inset-0 cursor-crosshair touch-none"
                      onPointerDown={(e) => {
                        if ((e.target as HTMLElement).closest("button")) return;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        const p = local(e);
                        start.current = { ...p, k };
                        setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
                      }}
                      onPointerMove={(e) => {
                        if (!start.current) return;
                        const p = local(e);
                        const s = start.current;
                        setDraft({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
                      }}
                      onPointerUp={() => {
                        const s = start.current;
                        start.current = null;
                        if (draft && s && draft.w > 4 && draft.h > 4) {
                          setRedactions((prev) => [
                            ...prev,
                            { pageIndex: page, x: draft.x / s.k, y: draft.y / s.k, width: draft.w / s.k, height: draft.h / s.k },
                          ]);
                        }
                        setDraft(null);
                      }}
                    >
                      {onPage.map((r) => {
                        const index = redactions.indexOf(r);
                        return (
                          <div
                            key={index}
                            className="group absolute bg-[#0c0c0c]"
                            style={{ left: r.x * k, top: r.y * k, width: r.width * k, height: r.height * k }}
                          >
                            <button
                              type="button"
                              aria-label="Remove this box"
                              onClick={() => setRedactions(redactions.filter((_, i) => i !== index))}
                              className="absolute -right-2.5 -top-2.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                      {draft && (
                        <div className="absolute border border-dashed border-[#0c0c0c] bg-[#0c0c0c]/60" style={{ left: draft.x, top: draft.y, width: draft.w, height: draft.h }} />
                      )}
                    </div>
                  );
                }}
              </PageCanvas>
            )}
          </Viewer>
        </div>
      )}
    </ToolLayout>
  );
}
