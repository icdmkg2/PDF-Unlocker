"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { GitCompare, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "visual" | "text";

export default function ComparePage() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [tab, setTab] = useState<Tab>("visual");
  const [error, setError] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compared, setCompared] = useState(false);

  // Visual compare state
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);

  // Text diff state
  const [diffResult, setDiffResult] = useState<Array<{ value: string; added?: boolean; removed?: boolean }>>([]);

  const handleFilesA = useCallback((files: File[]) => {
    setFileA(files[0]);
    setCompared(false);
    setError(null);
  }, []);

  const handleFilesB = useCallback((files: File[]) => {
    setFileB(files[0]);
    setCompared(false);
    setError(null);
  }, []);

  const renderPageToCanvas = async (
    file: File,
    pageNum: number,
    canvas: HTMLCanvasElement,
    scale: number
  ) => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const bytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d")!, canvas, viewport }).promise;
    return pdf.numPages;
  };

  const extractText = async (file: File): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const bytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      parts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
    return parts.join("\n");
  };

  const handleCompare = async () => {
    if (!fileA || !fileB) return;
    setIsComparing(true);
    setError(null);
    try {
      if (tab === "visual") {
        if (!canvasARef.current || !canvasBRef.current) return;
        const countA = await renderPageToCanvas(fileA, currentPage, canvasARef.current, 1.2);
        const countB = await renderPageToCanvas(fileB, currentPage, canvasBRef.current, 1.2);
        setPageCount(Math.max(countA, countB));
      } else {
        const [textA, textB] = await Promise.all([extractText(fileA), extractText(fileB)]);
        const { diffLines } = await import("diff");
        setDiffResult(diffLines(textA, textB));
      }
      setCompared(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed.");
    } finally {
      setIsComparing(false);
    }
  };

  useEffect(() => {
    if (!compared || tab !== "visual" || !fileA || !fileB) return;
    if (!canvasARef.current || !canvasBRef.current) return;
    const render = async () => {
      await Promise.all([
        renderPageToCanvas(fileA, currentPage, canvasARef.current!, 1.2),
        renderPageToCanvas(fileB, currentPage, canvasBRef.current!, 1.2),
      ]);
    };
    render();
  }, [currentPage, compared, tab, fileA, fileB]);

  return (
    <ToolLayout
      title="Compare PDF"
      description="Compare two PDFs visually or by text content"
      icon={GitCompare}
    >
      <div className="space-y-5">
        {/* File dropzones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">PDF A</p>
            <PdfDropzone
              onFiles={handleFilesA}
              files={fileA ? [fileA] : []}
              onRemove={() => { setFileA(null); setCompared(false); }}
              label="Drop PDF A"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">PDF B</p>
            <PdfDropzone
              onFiles={handleFilesB}
              files={fileB ? [fileB] : []}
              onRemove={() => { setFileB(null); setCompared(false); }}
              label="Drop PDF B"
            />
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 border-b border-border">
          {(["visual", "text"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setCompared(false); }}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize",
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "visual" ? "Visual" : "Text Diff"}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <Button
          onClick={handleCompare}
          disabled={!fileA || !fileB || isComparing}
          className="w-full"
        >
          {isComparing ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Comparing...</>
          ) : (
            <><GitCompare className="h-4 w-4 mr-2" /> Compare PDFs</>
          )}
        </Button>

        {/* Visual tab result */}
        {compared && tab === "visual" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Side-by-side comparison</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs px-2">Page {currentPage} of {pageCount}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage >= pageCount}
                  className="p-1 rounded hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground text-center">{fileA?.name}</p>
                <div className="border border-border rounded overflow-hidden">
                  <canvas ref={canvasARef} className="w-full" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground text-center">{fileB?.name}</p>
                <div className="border border-border rounded overflow-hidden">
                  <canvas ref={canvasBRef} className="w-full" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Text diff result */}
        {compared && tab === "text" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Text differences</p>
            {diffResult.every((d) => !d.added && !d.removed) ? (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
                No text differences found — the PDFs have identical content.
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
                    {part.added ? "+ " : part.removed ? "- " : "  "}
                    {part.value}
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
