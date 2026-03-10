"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EyeOff, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { applyRedactions, type Redaction } from "@/lib/pdf-redact";

export default function RedactPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [pdfPageSize, setPdfPageSize] = useState({ width: 0, height: 0 });
  const [redactions, setRedactions] = useState<Redaction[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderPage = useCallback(async (f: File, page: number) => {
    if (!bgCanvasRef.current) return;
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const bytes = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const p = await pdf.getPage(page);
      const containerW = containerRef.current?.clientWidth ?? 600;
      const s = Math.max(0.5, Math.min(containerW - 32, 800) / 816 * 1.5);
      setScale(s);
      const viewport = p.getViewport({ scale: s });
      setPdfPageSize({ width: viewport.width / s, height: viewport.height / s });
      bgCanvasRef.current.width = viewport.width;
      bgCanvasRef.current.height = viewport.height;
      const ctx = bgCanvasRef.current.getContext("2d")!;
      await p.render({ canvasContext: ctx, canvas: bgCanvasRef.current!, viewport }).promise;
    } catch {}
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setError(null);
    setResultUrl(null);
    setRedactions([]);
    setCurrentPage(1);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const bytes = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      setPageCount(pdf.numPages);
      await renderPage(f, 1);
    } catch {
      setPageCount(null);
    }
  }, [renderPage]);

  const handleRemove = useCallback(() => {
    setFile(null);
    setPageCount(null);
    setRedactions([]);
    setError(null);
    setResultUrl(null);
  }, []);

  useEffect(() => {
    if (file) renderPage(file, currentPage);
  }, [currentPage, file, renderPage]);

  const getRelativePos = (e: React.MouseEvent) => {
    const rect = bgCanvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!bgCanvasRef.current) return;
    const pos = getRelativePos(e);
    setStartPos(pos);
    setDrawing(true);
    setCurrentRect(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const pos = getRelativePos(e);
    setCurrentRect({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drawing || !bgCanvasRef.current) return;
    setDrawing(false);
    const pos = getRelativePos(e);
    const x = Math.min(startPos.x, pos.x);
    const y = Math.min(startPos.y, pos.y);
    const w = Math.abs(pos.x - startPos.x);
    const h = Math.abs(pos.y - startPos.y);
    if (w < 5 || h < 5) { setCurrentRect(null); return; }

    // Convert canvas coords to PDF coords
    const pdfX = x / scale;
    const pdfY = y / scale;
    const pdfW = w / scale;
    const pdfH = h / scale;

    setRedactions((prev) => [
      ...prev,
      { pageIndex: currentPage - 1, x: pdfX, y: pdfY, width: pdfW, height: pdfH },
    ]);
    setCurrentRect(null);
  };

  const handleApply = async () => {
    if (!file || !redactions.length) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await applyRedactions(file, redactions);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redaction failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `redacted_${file.name}`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setPageCount(null);
    setRedactions([]);
    setError(null);
    setResultUrl(null);
    setCurrentPage(1);
  };

  const pageRedactions = redactions.filter((r) => r.pageIndex === currentPage - 1);
  const canvasW = bgCanvasRef.current?.width ?? 0;
  const canvasH = bgCanvasRef.current?.height ?? 0;

  return (
    <ToolLayout
      title="Redact PDF"
      description="Draw black boxes over sensitive content to permanently hide it"
      icon={EyeOff}
    >
      <div className="space-y-5" ref={containerRef}>
        {!file && (
          <PdfDropzone
            onFiles={handleFiles}
            files={[]}
            onRemove={handleRemove}
            label="Drop your PDF here"
          />
        )}

        {file && pageCount && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Drag to draw black redaction boxes. {redactions.length} redaction{redactions.length !== 1 ? "s" : ""} total.
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs px-2">{currentPage} / {pageCount}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage >= pageCount}
                  className="p-1 rounded hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative border border-border rounded-lg overflow-hidden cursor-crosshair select-none">
              <canvas ref={bgCanvasRef} className="block" />
              {/* Overlay for drawing */}
              <div
                className="absolute inset-0"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* Existing redactions on this page */}
                {pageRedactions.map((r, i) => (
                  <div
                    key={i}
                    className="absolute bg-black"
                    style={{
                      left: r.x * scale,
                      top: r.y * scale,
                      width: r.width * scale,
                      height: r.height * scale,
                    }}
                  />
                ))}
                {/* Currently drawing rect */}
                {currentRect && (
                  <div
                    className="absolute bg-black/70 border border-black"
                    style={{
                      left: currentRect.x,
                      top: currentRect.y,
                      width: currentRect.w,
                      height: currentRect.h,
                    }}
                  />
                )}
              </div>
            </div>

            {pageRedactions.length > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{pageRedactions.length} redaction{pageRedactions.length !== 1 ? "s" : ""} on this page</span>
                <button
                  onClick={() => setRedactions((prev) => prev.filter((r) => r.pageIndex !== currentPage - 1))}
                  className="flex items-center gap-1 text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-3 w-3" /> Clear page
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleApply} disabled={!redactions.length || isLoading} className="flex-1">
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Applying...</>
                ) : (
                  <><EyeOff className="h-4 w-4 mr-2" /> Apply Redactions ({redactions.length})</>
                )}
              </Button>
              <Button onClick={reset} variant="outline">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {resultUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Redactions applied permanently!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download redacted PDF
            </Button>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
