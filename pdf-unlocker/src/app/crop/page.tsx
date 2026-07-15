"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Crop, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cropPDF, type CropMode } from "@/lib/pdf-crop";

interface Bounds { x1: number; y1: number; x2: number; y2: number; }
const PT_TO_MM = 25.4 / 72;

export default function CropPage() {
  const [file, setFile] = useState<File | null>(null);
  const [allPages, setAllPages] = useState(true);
  const [cropMode, setCropMode] = useState<CropMode>("destructive");
  const [pdfjsScale, setPdfjsScale] = useState(1);
  const [canvasW, setCanvasW] = useState(0);
  const [canvasH, setCanvasH] = useState(0);
  const [bounds, setBounds] = useState<Bounds>({ x1: 0, y1: 0, x2: 0, y2: 0 });
  const [isRendering, setIsRendering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // bgCanvasRef must ALWAYS be in the DOM when a file is loaded so renderPdf can write to it
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  // containerRef used only to measure available width for scale calculation
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    edge: "top" | "bottom" | "left" | "right";
    startMouse: number;
    startBound: number;
  } | null>(null);

  const renderPdf = useCallback(async (f: File) => {
    if (!bgCanvasRef.current) return;
    setIsRendering(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const bytes = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const page = await pdf.getPage(1);

      // Read container width now that it is mounted
      const containerW = containerRef.current?.clientWidth ?? 560;
      const s = Math.max(0.4, Math.min(containerW - 2, 760) / 816);
      setPdfjsScale(s);

      const vp = page.getViewport({ scale: s });
      const w = Math.round(vp.width);
      const h = Math.round(vp.height);
      bgCanvasRef.current.width = w;
      bgCanvasRef.current.height = h;
      const ctx = bgCanvasRef.current.getContext("2d")!;
      await page.render({ canvasContext: ctx, canvas: bgCanvasRef.current, viewport: vp }).promise;

      setCanvasW(w);
      setCanvasH(h);
      setBounds({ x1: 0, y1: 0, x2: w, y2: h });
    } finally {
      setIsRendering(false);
    }
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setResultUrl(null);
    setCanvasW(0);
    setCanvasH(0);
    // 80ms delay: give React time to commit the render that mounts bgCanvasRef
    setTimeout(() => renderPdf(files[0]), 80);
  }, [renderPdf]);

  const handleRemove = useCallback(() => {
    setFile(null);
    setError(null);
    setResultUrl(null);
    setCanvasW(0);
    setCanvasH(0);
  }, []);

  // Global drag listeners so the handle doesn't get "stuck" if mouse leaves the element
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const vertical = d.edge === "top" || d.edge === "bottom";
      const delta = (vertical ? e.clientY : e.clientX) - d.startMouse;
      const raw = d.startBound + delta;
      setBounds((prev) => {
        const next = { ...prev };
        if (d.edge === "top")    next.y1 = Math.max(0, Math.min(raw, prev.y2 - 10));
        if (d.edge === "bottom") next.y2 = Math.max(prev.y1 + 10, Math.min(raw, canvasH));
        if (d.edge === "left")   next.x1 = Math.max(0, Math.min(raw, prev.x2 - 10));
        if (d.edge === "right")  next.x2 = Math.max(prev.x1 + 10, Math.min(raw, canvasW));
        return next;
      });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [canvasW, canvasH]);

  const startDrag = (e: React.MouseEvent, edge: "top" | "bottom" | "left" | "right") => {
    e.preventDefault();
    const vertical = edge === "top" || edge === "bottom";
    dragRef.current = {
      edge,
      startMouse: vertical ? e.clientY : e.clientX,
      startBound: edge === "top" ? bounds.y1 : edge === "bottom" ? bounds.y2 : edge === "left" ? bounds.x1 : bounds.x2,
    };
  };

  const handleCrop = async () => {
    if (!file || !canvasW || !canvasH) return;
    setIsLoading(true);
    setError(null);
    try {
      const left   = (bounds.x1 / pdfjsScale) * PT_TO_MM;
      const top    = (bounds.y1 / pdfjsScale) * PT_TO_MM;
      const right  = ((canvasW - bounds.x2) / pdfjsScale) * PT_TO_MM;
      const bottom = ((canvasH - bounds.y2) / pdfjsScale) * PT_TO_MM;
      const bytes = await cropPDF(file, { top, right, bottom, left }, allPages ? "all" : [0], cropMode);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Crop failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a"); a.href = resultUrl; a.download = `cropped_${file.name}`; a.click();
  };

  const reset = () => {
    setFile(null); setError(null); setResultUrl(null);
    setCanvasW(0); setCanvasH(0); setAllPages(true);
  };

  const cropW = canvasW > 0 ? ((bounds.x2 - bounds.x1) / pdfjsScale * PT_TO_MM).toFixed(1) : "-";
  const cropH = canvasH > 0 ? ((bounds.y2 - bounds.y1) / pdfjsScale * PT_TO_MM).toFixed(1) : "-";
  const H = 8; // handle half-size in px

  return (
    <ToolLayout
      title="Crop PDF"
      description="Drag the blue handles to select the area you want to keep"
      icon={Crop}
      wide
      notice="Destructive crop re-renders pages as images so trimmed margins are gone. Soft crop only sets CropBox (content may still be recoverable)."
    >
      {/* containerRef here so it's always mounted and we can read clientWidth in renderPdf */}
      <div className="space-y-5" ref={containerRef}>
        {!file && (
          <PdfDropzone onFiles={handleFiles} files={[]} onRemove={handleRemove} label="Drop your PDF here" />
        )}

        {file && (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{canvasW > 0 ? "Drag the blue handles to set the crop area" : "Loading preview…"}</span>
              {canvasW > 0 && <span className="font-medium text-foreground">{cropW} × {cropH} mm</span>}
            </div>

            {/* Canvas wrapper - bgCanvasRef is ALWAYS in DOM here so renderPdf can write to it */}
            <div className="relative border border-border rounded-lg overflow-hidden bg-white select-none"
              style={{ minHeight: canvasW > 0 ? canvasH : 160 }}>

              {/* Loading overlay */}
              {isRendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* PDF background - always mounted, populated by renderPdf */}
              <canvas ref={bgCanvasRef} className="block" />

              {/* Crop overlay - only rendered after canvas has content */}
              {canvasW > 0 && canvasH > 0 && (
                <>
                  {/* Dark strips outside the crop box */}
                  <div className="absolute pointer-events-none" style={{ left: 0, top: 0, width: canvasW, height: bounds.y1, background: "rgba(0,0,0,0.45)" }} />
                  <div className="absolute pointer-events-none" style={{ left: 0, top: bounds.y2, width: canvasW, bottom: 0, background: "rgba(0,0,0,0.45)" }} />
                  <div className="absolute pointer-events-none" style={{ left: 0, top: bounds.y1, width: bounds.x1, height: bounds.y2 - bounds.y1, background: "rgba(0,0,0,0.45)" }} />
                  <div className="absolute pointer-events-none" style={{ left: bounds.x2, top: bounds.y1, right: 0, height: bounds.y2 - bounds.y1, background: "rgba(0,0,0,0.45)" }} />
                  {/* Crop box border */}
                  <div className="absolute pointer-events-none border-2 border-primary"
                    style={{ left: bounds.x1, top: bounds.y1, width: bounds.x2 - bounds.x1, height: bounds.y2 - bounds.y1 }} />
                  {/* Handles - top */}
                  <div className="absolute bg-primary rounded-full cursor-ns-resize z-10"
                    style={{ left: (bounds.x1 + bounds.x2) / 2 - 20, top: bounds.y1 - H / 2, width: 40, height: H }}
                    onMouseDown={(e) => startDrag(e, "top")} />
                  {/* bottom */}
                  <div className="absolute bg-primary rounded-full cursor-ns-resize z-10"
                    style={{ left: (bounds.x1 + bounds.x2) / 2 - 20, top: bounds.y2 - H / 2, width: 40, height: H }}
                    onMouseDown={(e) => startDrag(e, "bottom")} />
                  {/* left */}
                  <div className="absolute bg-primary rounded-full cursor-ew-resize z-10"
                    style={{ left: bounds.x1 - H / 2, top: (bounds.y1 + bounds.y2) / 2 - 20, width: H, height: 40 }}
                    onMouseDown={(e) => startDrag(e, "left")} />
                  {/* right */}
                  <div className="absolute bg-primary rounded-full cursor-ew-resize z-10"
                    style={{ left: bounds.x2 - H / 2, top: (bounds.y1 + bounds.y2) / 2 - 20, width: H, height: 40 }}
                    onMouseDown={(e) => startDrag(e, "right")} />
                </>
              )}
            </div>

            {canvasW > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={allPages} onChange={(e) => setAllPages(e.target.checked)} className="rounded" />
                    Apply to all pages
                  </label>
                  <button
                    onClick={() => setBounds({ x1: 0, y1: 0, x2: canvasW, y2: canvasH })}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    Reset to full page
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {(
                    [
                      ["destructive", "Hard crop (remove content)"],
                      ["cropbox", "Soft crop (CropBox only)"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setCropMode(value)}
                      className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                        cropMode === value
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        {resultUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> PDF cropped to {cropW} × {cropH} mm!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download cropped PDF
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          {!resultUrl ? (
            <Button onClick={handleCrop} disabled={!file || !canvasW || isLoading} className="flex-1">
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cropping…</> : <><Crop className="h-4 w-4 mr-2" /> Crop PDF</>}
            </Button>
          ) : (
            <Button onClick={reset} variant="outline" className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" /> Crop Another PDF
            </Button>
          )}
          {file && !resultUrl && (
            <Button variant="outline" onClick={handleRemove} title="Remove file">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
