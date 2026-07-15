"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { GitCompare, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadPdfDocument } from "@/lib/pdf-utils";

type Tab = "visual" | "pixel" | "text";

export default function ComparePage() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [tab, setTab] = useState<Tab>("visual");
  const [error, setError] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compared, setCompared] = useState(false);

  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement>(null);
  const [diffPct, setDiffPct] = useState<number | null>(null);

  const [diffResult, setDiffResult] = useState<Array<{ value: string; added?: boolean; removed?: boolean }>>([]);

  // Cache loaded docs to avoid re-parsing every page change
  const pdfARef = useRef<Awaited<ReturnType<typeof loadPdfDocument>> | null>(null);
  const pdfBRef = useRef<Awaited<ReturnType<typeof loadPdfDocument>> | null>(null);

  const handleFilesA = useCallback((files: File[]) => {
    setFileA(files[0]);
    setCompared(false);
    setError(null);
    pdfARef.current = null;
  }, []);
  const handleFilesB = useCallback((files: File[]) => {
    setFileB(files[0]);
    setCompared(false);
    setError(null);
    pdfBRef.current = null;
  }, []);

  const ensureDocs = async () => {
    if (!fileA || !fileB) throw new Error("Both PDFs required");
    if (!pdfARef.current) pdfARef.current = await loadPdfDocument(await fileA.arrayBuffer());
    if (!pdfBRef.current) pdfBRef.current = await loadPdfDocument(await fileB.arrayBuffer());
    return { pdfA: pdfARef.current, pdfB: pdfBRef.current };
  };

  const renderPageToCanvas = async (
    pdf: Awaited<ReturnType<typeof loadPdfDocument>>,
    pageNum: number,
    canvas: HTMLCanvasElement,
    scale: number
  ) => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d")!, canvas, viewport }).promise;
  };

  const extractText = async (pdf: Awaited<ReturnType<typeof loadPdfDocument>>): Promise<string> => {
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const p = await pdf.getPage(i);
      const content = await p.getTextContent();
      parts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
    return parts.join("\n");
  };

  const handleCompare = async () => {
    if (!fileA || !fileB) return;
    setIsComparing(true);
    setError(null);
    try {
      const { pdfA, pdfB } = await ensureDocs();
      if (tab === "text") {
        const [textA, textB] = await Promise.all([extractText(pdfA), extractText(pdfB)]);
        const { diffLines } = await import("diff");
        setDiffResult(diffLines(textA, textB));
        setCompared(true);
      } else {
        setPageCount(Math.max(pdfA.numPages, pdfB.numPages));
        setCurrentPage(1);
        setCompared(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed.");
    } finally {
      setIsComparing(false);
    }
  };

  useEffect(() => {
    if (!compared || tab === "text" || !fileA || !fileB) return;
    if (!canvasARef.current || !canvasBRef.current) return;

    const run = async () => {
      try {
        const { pdfA, pdfB } = await ensureDocs();
        const pageA = Math.min(currentPage, pdfA.numPages);
        const pageB = Math.min(currentPage, pdfB.numPages);
        await Promise.all([
          renderPageToCanvas(pdfA, pageA, canvasARef.current!, 1.2),
          renderPageToCanvas(pdfB, pageB, canvasBRef.current!, 1.2),
        ]);

        if (tab === "pixel" && diffCanvasRef.current) {
          const a = canvasARef.current!;
          const b = canvasBRef.current!;
          const w = Math.max(a.width, b.width);
          const h = Math.max(a.height, b.height);
          const diff = diffCanvasRef.current;
          diff.width = w;
          diff.height = h;
          const ctx = diff.getContext("2d")!;
          ctx.fillStyle = "#111";
          ctx.fillRect(0, 0, w, h);

          const tmpA = document.createElement("canvas");
          tmpA.width = w;
          tmpA.height = h;
          const ctxA = tmpA.getContext("2d")!;
          ctxA.drawImage(a, 0, 0);

          const tmpB = document.createElement("canvas");
          tmpB.width = w;
          tmpB.height = h;
          const ctxB = tmpB.getContext("2d")!;
          ctxB.drawImage(b, 0, 0);

          const dataA = ctxA.getImageData(0, 0, w, h);
          const dataB = ctxB.getImageData(0, 0, w, h);
          const out = ctx.createImageData(w, h);
          let changed = 0;
          const total = w * h;
          for (let i = 0; i < dataA.data.length; i += 4) {
            const dr = Math.abs(dataA.data[i] - dataB.data[i]);
            const dg = Math.abs(dataA.data[i + 1] - dataB.data[i + 1]);
            const db = Math.abs(dataA.data[i + 2] - dataB.data[i + 2]);
            const delta = (dr + dg + db) / 3;
            if (delta > 12) {
              changed++;
              out.data[i] = 255;
              out.data[i + 1] = 60;
              out.data[i + 2] = 60;
              out.data[i + 3] = 220;
            } else {
              const g = dataA.data[i];
              out.data[i] = g;
              out.data[i + 1] = g;
              out.data[i + 2] = g;
              out.data[i + 3] = 80;
            }
          }
          ctx.putImageData(out, 0, 0);
          setDiffPct(Math.round((changed / total) * 1000) / 10);
        } else {
          setDiffPct(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Render failed.");
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, compared, tab, fileA, fileB]);

  return (
    <ToolLayout
      title="Compare PDF"
      description="Side-by-side, pixel heatmap, or text diff"
      icon={GitCompare}
      wide
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">PDF A (original)</p>
            <PdfDropzone onFiles={handleFilesA} files={fileA ? [fileA] : []} onRemove={() => { setFileA(null); setCompared(false); pdfARef.current = null; }} label="Drop PDF A" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">PDF B (modified)</p>
            <PdfDropzone onFiles={handleFilesB} files={fileB ? [fileB] : []} onRemove={() => { setFileB(null); setCompared(false); pdfBRef.current = null; }} label="Drop PDF B" />
          </div>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-border">
          {([
            ["visual", "Visual"],
            ["pixel", "Pixel Diff"],
            ["text", "Text Diff"],
          ] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => { setTab(t); setCompared(false); }}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        <Button onClick={handleCompare} disabled={!fileA || !fileB || isComparing} className="w-full">
          {isComparing
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Comparing…</>
            : <><GitCompare className="h-4 w-4 mr-2" /> Compare PDFs</>}
        </Button>

        {compared && (tab === "visual" || tab === "pixel") && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {tab === "pixel" && diffPct !== null
                  ? `Pixel differences: ~${diffPct}% of page`
                  : "Side-by-side comparison"}
              </p>
              {pageCount > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1 rounded hover:bg-muted disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs px-2">Page {currentPage} of {pageCount}</span>
                  <button onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount} className="p-1 rounded hover:bg-muted disabled:opacity-40">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground text-center truncate px-1">{fileA?.name}</p>
                <div className="border border-border rounded overflow-hidden bg-white">
                  <canvas ref={canvasARef} className="w-full block" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground text-center truncate px-1">{fileB?.name}</p>
                <div className="border border-border rounded overflow-hidden bg-white">
                  <canvas ref={canvasBRef} className="w-full block" />
                </div>
              </div>
            </div>
            {tab === "pixel" && (
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground text-center">Difference heatmap (red = changed)</p>
                <div className="border border-border rounded overflow-hidden bg-black">
                  <canvas ref={diffCanvasRef} className="w-full block" />
                </div>
              </div>
            )}
          </div>
        )}

        {compared && tab === "text" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Text differences</p>
            {diffResult.every((d) => !d.added && !d.removed) ? (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
                No text differences found - the PDFs have identical content.
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-auto max-h-96 text-xs font-mono">
                {diffResult.map((part, i) => (
                  <div
                    key={i}
                    className={cn(
                      "px-3 py-0.5 whitespace-pre-wrap",
                      part.added && "bg-green-500/15 text-green-700 dark:text-green-400",
                      part.removed && "bg-red-500/15 text-red-700 dark:text-red-400"
                    )}
                  >
                    {part.added ? "+ " : part.removed ? "- " : "  "}{part.value}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
