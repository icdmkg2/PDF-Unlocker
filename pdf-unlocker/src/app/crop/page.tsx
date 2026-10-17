"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Crop, Loader2, SlidersHorizontal } from "lucide-react";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard } from "@/components/result-card";
import { ErrorNote, Working } from "@/components/steps";
import { PanelField, PanelFile, Pills, Workbench } from "@/components/workbench";
import { cropPDF, type CropMode } from "@/lib/pdf-crop";
import { addHistoryEntry } from "@/lib/local-history";

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
  const [result, setResult] = useState<Blob | null>(null);

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
    setResult(null);
    setCanvasW(0);
    setCanvasH(0);
    // 80ms delay: give React time to commit the render that mounts bgCanvasRef
    setTimeout(() => renderPdf(files[0]), 80);
  }, [renderPdf]);

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
      setResult(blob);
      void addHistoryEntry({ tool: "Crop", fileName: file.name, size: blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Crop failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setError(null); setResult(null);
    setCanvasW(0); setCanvasH(0); setAllPages(true);
  };

  const cropW = canvasW > 0 ? ((bounds.x2 - bounds.x1) / pdfjsScale * PT_TO_MM).toFixed(1) : "-";
  const cropH = canvasH > 0 ? ((bounds.y2 - bounds.y1) / pdfjsScale * PT_TO_MM).toFixed(1) : "-";
  const H = 8; // handle half-size in px

  const trimmed = canvasW > 0 && (bounds.x1 > 0 || bounds.y1 > 0 || bounds.x2 < canvasW || bounds.y2 < canvasH);

  return (
    <ToolLayout title="Crop PDF" description="Drag the edges of the page to keep only the part you want" icon={Crop} wide>
      {!file ? (
        <PdfDropzone onFiles={handleFiles} label="Drop the PDF to crop" />
      ) : (
        <>
          {result && (
            <ResultCard
              verb={`Cropped to ${cropW} × ${cropH} mm`}
              blob={result}
              fileName={file.name.replace(/\.pdf$/i, "") + "_cropped.pdf"}
              inputSize={file.size}
              actions={
                <Button variant="outline" onClick={() => setResult(null)}>
                  <SlidersHorizontal className="h-4 w-4" /> Adjust
                </Button>
              }
              onReset={reset}
              resetLabel="Crop another"
            />
          )}
          {/* Kept mounted while the result shows so the rendered page survives "Adjust". */}
          <div hidden={!!result}>
            <Workbench
              panel={
                <>
                  <PanelFile file={file} pageCount={0} onChange={reset} />
                  <EncryptedNotice file={file} />
                  <PanelField label="Area kept">
                    <p className="font-mono text-lg tabular-nums">{cropW} × {cropH} <span className="text-xs text-muted-foreground">mm</span></p>
                    {trimmed && (
                      <button type="button" onClick={() => setBounds({ x1: 0, y1: 0, x2: canvasW, y2: canvasH })} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                        Reset to full page
                      </button>
                    )}
                  </PanelField>
                  <PanelField label="Pages">
                    <Pills label="Pages to crop" options={[{ id: "all", label: "All pages" }, { id: "first", label: "First page only" }]} value={allPages ? "all" : "first"} onChange={(v) => setAllPages(v === "all")} />
                  </PanelField>
                  <PanelField label="Method">
                    <Pills
                      label="Crop method"
                      options={[{ id: "destructive", label: "Remove the rest" }, { id: "cropbox", label: "Hide the rest" }] as { id: CropMode; label: string }[]}
                      value={cropMode}
                      onChange={setCropMode}
                    />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {cropMode === "destructive"
                        ? "Pages become images and the trimmed area is gone for good. Text won't be selectable."
                        : "Keeps text, but the hidden area is still in the file and can be recovered."}
                    </p>
                  </PanelField>
                  {isLoading && <Working>Cropping…</Working>}
                  {error && <ErrorNote>{error}</ErrorNote>}
                  <Button onClick={handleCrop} disabled={!canvasW || !trimmed || isLoading} className="w-full">
                    <Crop className="h-4 w-4" /> Crop PDF
                  </Button>
                  {canvasW > 0 && !trimmed && <p className="text-center text-xs text-muted-foreground">Drag an edge of the page first.</p>}
                </>
              }
              header={<span>{canvasW > 0 ? "Drag the handles on each edge · Page 1 shown" : "Loading preview…"}</span>}
            >
              <div ref={containerRef} className="flex justify-center">
                <div className="relative select-none overflow-hidden rounded-sm bg-white" style={{ minHeight: canvasW > 0 ? canvasH : 160, minWidth: 120 }}>
                  {isRendering && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  <canvas ref={bgCanvasRef} className="block" />
                  {canvasW > 0 && canvasH > 0 && (
                    <>
                      <div className="pointer-events-none absolute" style={{ left: 0, top: 0, width: canvasW, height: bounds.y1, background: "rgba(0,0,0,0.55)" }} />
                      <div className="pointer-events-none absolute" style={{ left: 0, top: bounds.y2, width: canvasW, bottom: 0, background: "rgba(0,0,0,0.55)" }} />
                      <div className="pointer-events-none absolute" style={{ left: 0, top: bounds.y1, width: bounds.x1, height: bounds.y2 - bounds.y1, background: "rgba(0,0,0,0.55)" }} />
                      <div className="pointer-events-none absolute" style={{ left: bounds.x2, top: bounds.y1, right: 0, height: bounds.y2 - bounds.y1, background: "rgba(0,0,0,0.55)" }} />
                      <div className="pointer-events-none absolute border-2 border-dashed border-[#0c0c0c]" style={{ left: bounds.x1, top: bounds.y1, width: bounds.x2 - bounds.x1, height: bounds.y2 - bounds.y1 }} />
                      {(["top", "bottom", "left", "right"] as const).map((edge) => {
                        const vertical = edge === "top" || edge === "bottom";
                        const style = vertical
                          ? { left: (bounds.x1 + bounds.x2) / 2 - 22, top: (edge === "top" ? bounds.y1 : bounds.y2) - H / 2, width: 44, height: H }
                          : { left: (edge === "left" ? bounds.x1 : bounds.x2) - H / 2, top: (bounds.y1 + bounds.y2) / 2 - 22, width: H, height: 44 };
                        return (
                          <div
                            key={edge}
                            role="slider"
                            aria-label={`${edge} edge`}
                            aria-valuenow={Math.round(edge === "top" ? bounds.y1 : edge === "bottom" ? bounds.y2 : edge === "left" ? bounds.x1 : bounds.x2)}
                            className={`absolute z-10 rounded-full border-2 border-white bg-[#0c0c0c] shadow ${vertical ? "cursor-ns-resize" : "cursor-ew-resize"}`}
                            style={style}
                            onMouseDown={(e) => startDrag(e, edge)}
                          />
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </Workbench>
          </div>
        </>
      )}
    </ToolLayout>
  );
}
