"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { ErrorNote, Working } from "@/components/steps";
import { usePdfDoc, Pills } from "@/components/workbench";
import { PageCanvas } from "@/components/viewer";
import { formatSize } from "@/components/result-card";
import { GitCompare, ChevronLeft, ChevronRight, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { comparePage, extractAllText } from "@/lib/pdf-compare";

type Mode = "side" | "highlight" | "text";
type Part = { value: string; added?: boolean; removed?: boolean };

function Pick({ label, file, onFiles, onClear, multiple }: { label: string; file: File | null; onFiles: (f: File[]) => void; onClear: () => void; multiple?: boolean }) {
  return (
    <div className="space-y-2">
      <p className="font-label text-muted-foreground">{label}</p>
      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3">
          <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{formatSize(file.size)}</span>
          <button type="button" onClick={onClear} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Change</button>
        </div>
      ) : (
        <PdfDropzone onFiles={onFiles} multiple={multiple} label={multiple ? "Drop the original, or both PDFs" : `Drop the ${label.toLowerCase()} PDF`} />
      )}
    </div>
  );
}

export default function ComparePage() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const a = usePdfDoc(fileA);
  const b = usePdfDoc(fileB);
  const [mode, setMode] = useState<Mode>("highlight");
  const [page, setPage] = useState(0);
  const [diffs, setDiffs] = useState<Record<number, { overlay: string | null; changed: number; differs: boolean }>>({});
  const [text, setText] = useState<Part[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = !!(a.doc && b.doc);
  const pageCount = Math.max(a.pageCount, b.pageCount);

  const resetResults = () => {
    setDiffs({});
    setText(null);
    setPage(0);
  };
  // Dropping two files at once fills both sides.
  const onA = useCallback((f: File[]) => { setFileA(f[0]); if (f[1]) setFileB(f[1]); setDiffs({}); setText(null); setPage(0); }, []);
  const onB = useCallback((f: File[]) => { setFileB(f[0]); setDiffs({}); setText(null); setPage(0); }, []);

  // Compute the highlight for the page in view, once per page.
  useEffect(() => {
    if (!a.doc || !b.doc || mode === "text" || diffs[page]) return;
    let live = true;
    comparePage(a.doc, b.doc, page)
      .then((d) => live && setDiffs((prev) => ({ ...prev, [page]: d })))
      .catch((err) => live && setError(err instanceof Error ? err.message : "Couldn't compare this page."));
    return () => {
      live = false;
    };
  }, [a.doc, b.doc, page, mode, diffs]);

  const runText = async () => {
    if (!a.doc || !b.doc) return;
    setBusy("Reading text from both files…");
    try {
      const [ta, tb] = await Promise.all([extractAllText(a.doc), extractAllText(b.doc)]);
      const { diffLines } = await import("diff");
      setText(diffLines(ta, tb));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Text comparison failed.");
    } finally {
      setBusy(null);
    }
  };

  const changeMode = (m: Mode) => {
    setMode(m);
    if (m === "text" && !text) void runText();
  };

  const current = diffs[page];
  const pct = (n: number) => (n === 1 ? "missing" : n < 0.001 ? "under 0.1%" : `${Math.round(n * 1000) / 10}%`);

  return (
    <ToolLayout title="Compare PDF" description="See what changed between two versions of a document" icon={GitCompare} wide>
      <div className="space-y-4">
        {(!fileA || !fileB) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Pick label="Original" multiple file={fileA} onFiles={onA} onClear={() => { setFileA(null); resetResults(); }} />
            <Pick label="Changed" file={fileB} onFiles={onB} onClear={() => { setFileB(null); resetResults(); }} />
          </div>
        )}

        {fileA && fileB && (
          <div className="rounded-lg border border-border bg-[#111]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
              <span className="min-w-0 truncate"><span className="text-foreground">{fileA.name}</span> → <span className="text-foreground">{fileB.name}</span></span>
              <button type="button" onClick={() => { setFileA(fileB); setFileB(fileA); resetResults(); }} className="flex items-center gap-1 hover:text-foreground">
                <ArrowLeftRight className="h-3.5 w-3.5" /> Swap
              </button>
              <button type="button" onClick={() => { setFileA(null); setFileB(null); resetResults(); }} className="underline underline-offset-4 hover:text-foreground">
                Change files
              </button>
              <span className="ml-auto">
                <Pills label="View" options={[{ id: "highlight", label: "Highlight changes" }, { id: "side", label: "Side by side" }, { id: "text", label: "Text" }]} value={mode} onChange={changeMode} />
              </span>
            </div>

            {mode !== "text" && pageCount > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2" aria-label="Pages">
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    aria-current={i === page ? "page" : undefined}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 font-mono text-[10px] transition-colors",
                      i === page ? "border-primary/60 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                      diffs[i]?.differs && "border-[#e62828]/60"
                    )}
                    title={diffs[i] ? pct(diffs[i].changed) : undefined}
                  >
                    {i + 1}
                    {diffs[i] && <span className="ml-1">{diffs[i].differs ? "•" : "✓"}</span>}
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 py-6 sm:px-8">
              {!ready ? (
                <Working>Loading both files…</Working>
              ) : mode === "text" ? (
                busy ? <Working>{busy}</Working> : text && (
                  text.every((d) => !d.added && !d.removed) ? (
                    <p className="rounded-lg border border-border bg-card p-4 text-sm">The text is identical. Use Highlight changes to check images and layout.</p>
                  ) : (
                    <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-card font-mono text-xs">
                      {text.map((part, i) => (
                        <div key={i} className={cn("whitespace-pre-wrap px-3 py-0.5", part.added && "bg-emerald-500/15 text-emerald-300", part.removed && "bg-red-500/15 text-red-300 line-through decoration-red-300/50")}>
                          {part.added ? "+ " : part.removed ? "− " : "  "}{part.value}
                        </div>
                      ))}
                    </div>
                  )
                )
              ) : (
                <>
                  <p className="mb-4 text-center text-xs text-muted-foreground">
                    {!current
                      ? "Comparing this page…"
                      : current.changed === 1
                        ? `Page ${page + 1} exists in only one of the files.`
                        : !current.differs
                          ? `Page ${page + 1} looks the same in both.`
                          : `About ${pct(current.changed)} of page ${page + 1} changed, shown in red.`}
                  </p>
                  <div className={cn("grid gap-6", mode === "side" && "md:grid-cols-2")}>
                    {mode === "side" && (
                      <figure className="space-y-2">
                        <figcaption className="text-center font-label text-muted-foreground">Original</figcaption>
                        {page < a.pageCount ? <PageCanvas doc={a.doc!} index={page} maxWidth={520} /> : <p className="py-16 text-center text-sm text-muted-foreground">No page {page + 1}</p>}
                      </figure>
                    )}
                    <figure className="space-y-2">
                      {mode === "side" && <figcaption className="text-center font-label text-muted-foreground">Changed</figcaption>}
                      {page < b.pageCount ? (
                        <PageCanvas doc={b.doc!} index={page} maxWidth={mode === "side" ? 520 : 720}>
                          {() =>
                            current?.overlay ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={current.overlay} alt="Changed areas" className="pointer-events-none absolute inset-0 h-full w-full" />
                            ) : null
                          }
                        </PageCanvas>
                      ) : (
                        <p className="py-16 text-center text-sm text-muted-foreground">No page {page + 1} in the changed file</p>
                      )}
                    </figure>
                  </div>
                  {pageCount > 1 && (
                    <div className="mt-4 flex justify-center gap-2">
                      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button>
                      <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  )}
                </>
              )}
              {(error || a.error || b.error) && <div className="mt-4"><ErrorNote>{error || a.error || b.error}</ErrorNote></div>}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
