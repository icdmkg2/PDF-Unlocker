"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Button } from "@/components/ui/button";
import {
  PenTool, MousePointer2, Square, Circle, Minus, Type,
  StickyNote, PenLine, Eraser, Download, RotateCcw, X,
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Trash2,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  RotateCw, Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addHistoryEntry } from "@/lib/local-history";
import { ResultCard } from "@/components/result-card";
import { PageThumb } from "@/components/workbench";
import { SignaturePad, type Signature } from "@/components/signature-pad";
import type { PDFDocumentProxy } from "pdfjs-dist";

type Tool = "select" | "pen" | "highlight" | "rect" | "ellipse" | "line" | "text" | "sticky" | "signature" | "eraser";

interface PageState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any | null;
}

const TOOL_GROUPS = [
  {
    label: "Selection",
    tools: [{ id: "select" as Tool, icon: <MousePointer2 className="h-4 w-4" />, label: "Select" }],
  },
  {
    label: "Draw",
    tools: [
      { id: "pen" as Tool, icon: <PenTool className="h-4 w-4" />, label: "Pen" },
      { id: "highlight" as Tool, icon: <span className="text-xs font-bold leading-none">A</span>, label: "Highlight" },
      { id: "eraser" as Tool, icon: <Eraser className="h-4 w-4" />, label: "Eraser" },
    ],
  },
  {
    label: "Shapes",
    tools: [
      { id: "rect" as Tool, icon: <Square className="h-4 w-4" />, label: "Rectangle" },
      { id: "ellipse" as Tool, icon: <Circle className="h-4 w-4" />, label: "Ellipse" },
      { id: "line" as Tool, icon: <Minus className="h-4 w-4" />, label: "Line" },
    ],
  },
  {
    label: "Insert",
    tools: [
      { id: "text" as Tool, icon: <Type className="h-4 w-4" />, label: "Text" },
      { id: "sticky" as Tool, icon: <StickyNote className="h-4 w-4" />, label: "Note" },
      { id: "signature" as Tool, icon: <PenLine className="h-4 w-4" />, label: "Signature" },
    ],
  },
];

export default function EditPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fontSize, setFontSize] = useState(16);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pageRotations, setPageRotations] = useState<number[]>([]);

  // fabricVersion increments each time a new Fabric canvas is created.
  // This makes the mouse-handler useEffect re-run (refs are not reactive).
  const [fabricVersion, setFabricVersion] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [stripDoc, setStripDoc] = useState<PDFDocumentProxy | null>(null);
  const undoStackRef = useRef<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  // Single canvas: Fabric owns it entirely. The PDF is set as Fabric's backgroundImage
  // so there is no separate overlay - no transparency / z-index issues possible.
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);
  const pageStatesRef = useRef<PageState[]>([]);
  const pageRotationsRef = useRef<number[]>([]);
  const currentPageRef = useRef(0);
  const scaleRef = useRef(1.5);


  // Keep rotation ref in sync with state
  useEffect(() => { pageRotationsRef.current = pageRotations; }, [pageRotations]);

  const calcScale = useCallback(() => {
    if (!containerRef.current) return 1.5;
    // Fit a US Letter/A4-sized page in both directions, leaving room for the toolbar.
    const w = containerRef.current.clientWidth - 64;
    const h = containerRef.current.clientHeight - 140;
    return Math.max(0.5, Math.min(Math.min(w, 900) / 816, h > 200 ? h / 1056 : Infinity));
  }, []);

  const saveCurrentPageState = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    // Strip backgroundImage from the saved JSON - the PDF is re-rendered fresh on every
    // page load, so we only need to persist the annotation objects.
    const json = fc.toJSON();
    json.backgroundImage = null;
    pageStatesRef.current[currentPageRef.current] = { json };
  }, []);

  const snapshotAnnotations = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return "{}";
    const json = fc.toJSON();
    json.backgroundImage = null;
    return JSON.stringify(json);
  }, []);

  const pushUndoSnapshot = useCallback(() => {
    const snap = snapshotAnnotations();
    const stack = undoStackRef.current;
    if (stack[stack.length - 1] === snap) return;
    stack.push(snap);
    if (stack.length > 40) stack.shift();
    setCanUndo(stack.length > 1);
  }, [snapshotAnnotations]);

  const handleUndo = useCallback(async () => {
    const fc = fabricRef.current;
    const stack = undoStackRef.current;
    if (!fc || stack.length < 2) return;
    stack.pop(); // drop current
    const prev = stack[stack.length - 1];
    setCanUndo(stack.length > 1);
    const bg = fc.backgroundImage;
    // Suppress history while restoring
    fc.off("object:added");
    fc.off("object:modified");
    fc.off("object:removed");
    fc.off("path:created");
    await fc.loadFromJSON(JSON.parse(prev));
    if (bg) fc.backgroundImage = bg;
    fc.renderAll();
    const onChange = () => {
      pushUndoSnapshot();
      saveCurrentPageState();
    };
    fc.on("object:added", onChange);
    fc.on("object:modified", onChange);
    fc.on("object:removed", onChange);
    fc.on("path:created", onChange);
    saveCurrentPageState();
  }, [pushUndoSnapshot, saveCurrentPageState]);

  // Render the PDF page to a temp canvas, set as Fabric backgroundImage, restore annotations.
  // Single-canvas approach: Fabric owns the only visible canvas; no overlay / transparency needed.
  const initFabricForPage = useCallback(async (pageNum: number, rotation: number) => {
    if (!fabricCanvasRef.current || !pdfDocRef.current) return;
    if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }

    const s = calcScale();
    scaleRef.current = s;
    const page = await pdfDocRef.current.getPage(pageNum + 1);
    const viewport = page.getViewport({ scale: s, rotation });
    const w = Math.round(viewport.width);
    const h = Math.round(viewport.height);

    // Render PDF page to an off-screen canvas, then use it as Fabric's backgroundImage
    const offscreen = document.createElement("canvas");
    offscreen.width = w; offscreen.height = h;
    const ctx = offscreen.getContext("2d")!;
    await page.render({ canvasContext: ctx, canvas: offscreen, viewport }).promise;
    const bgDataUrl = offscreen.toDataURL("image/jpeg", 0.95);

    const { Canvas, PencilBrush, FabricImage } = await import("fabric");
    const fc = new Canvas(fabricCanvasRef.current, { width: w, height: h, isDrawingMode: false, selection: true });
    fc.freeDrawingBrush = new PencilBrush(fc);
    fc.freeDrawingBrush.color = color;
    fc.freeDrawingBrush.width = strokeWidth;

    // Restore saved annotation objects (backgroundImage excluded from saved state)
    const saved = pageStatesRef.current[pageNum];
    if (saved?.json) { await fc.loadFromJSON(saved.json); }

    // Set PDF as non-selectable background
    const bgImg = await FabricImage.fromURL(bgDataUrl);
    // Fabric 6+ positions objects by their center unless told otherwise; pin the page to the top-left.
    bgImg.set({ selectable: false, evented: false, hoverCursor: "default", originX: "left", originY: "top", left: 0, top: 0 });
    fc.backgroundImage = bgImg;
    fc.renderAll();

    fabricRef.current = fc;
    undoStackRef.current = [];
    // Baseline snapshot (empty or restored annotations)
    const base = fc.toJSON();
    base.backgroundImage = null;
    undoStackRef.current.push(JSON.stringify(base));
    setCanUndo(false);
    const onChange = () => {
      pushUndoSnapshot();
      saveCurrentPageState();
    };
    fc.on("object:added", onChange);
    fc.on("object:modified", onChange);
    fc.on("object:removed", onChange);
    fc.on("path:created", onChange);

    setFabricVersion((v) => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyActiveTool = useCallback((tool: Tool, col: string, sw: number) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.isDrawingMode = false;
    fc.selection = true;
    fc.defaultCursor = "default";
    if (tool === "pen") {
      fc.isDrawingMode = true;
      if (fc.freeDrawingBrush) { fc.freeDrawingBrush.color = col; fc.freeDrawingBrush.width = sw; }
    } else if (tool === "highlight") {
      fc.isDrawingMode = true;
      if (fc.freeDrawingBrush) { fc.freeDrawingBrush.color = col + "60"; fc.freeDrawingBrush.width = 18; }
    } else if (tool === "eraser") {
      fc.selection = false;
      fc.defaultCursor = "crosshair";
    }
  }, []);

  const loadPage = useCallback(async (pageNum: number, rotation?: number) => {
    setIsLoadingPdf(true);
    try {
      const rot = rotation !== undefined ? rotation : (pageRotationsRef.current[pageNum] ?? 0);
      await initFabricForPage(pageNum, rot);
    } finally {
      setIsLoadingPdf(false);
    }
  }, [initFabricForPage]);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setPdfError(null);
    setIsLoadingPdf(true);
    setCurrentPage(0);
    currentPageRef.current = 0;
    pageStatesRef.current = [];
    pageRotationsRef.current = [];
    try {
      const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
      GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const bytes = await f.arrayBuffer();
      const pdf = await getDocument({ data: bytes }).promise;
      pdfDocRef.current = pdf;
      setStripDoc(pdf);
      setResult(null);
      const n = pdf.numPages;
      setTotalPages(n);
      pageStatesRef.current = Array.from({ length: n }, () => ({ json: null }));
      const rotations = Array(n).fill(0);
      setPageRotations(rotations);
      pageRotationsRef.current = rotations;
      setTimeout(async () => {
        await initFabricForPage(0, 0);
        setIsLoadingPdf(false);
      }, 80);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Failed to load PDF.");
      setIsLoadingPdf(false);
    }
  }, [initFabricForPage]);

  const handleRemove = useCallback(() => {
    if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }
    pdfDocRef.current = null;
    setStripDoc(null);
    setResult(null);
    setFile(null); setTotalPages(0); setCurrentPage(0); setPageRotations([]);
    currentPageRef.current = 0; pageStatesRef.current = []; pageRotationsRef.current = [];
  }, []);

  const goToPage = useCallback(async (n: number) => {
    if (n < 0 || n >= totalPages || n === currentPageRef.current) return;
    saveCurrentPageState();
    setCurrentPage(n);
    currentPageRef.current = n;
    await loadPage(n);
  }, [totalPages, saveCurrentPageState, loadPage]);

  const rotatePage = useCallback(async (delta: number) => {
    const i = currentPageRef.current;
    const prev = pageRotationsRef.current[i] ?? 0;
    const next = ((prev + delta) % 360 + 360) % 360;
    const updated = [...pageRotationsRef.current];
    updated[i] = next;
    setPageRotations(updated);
    pageRotationsRef.current = updated;
    // Clear annotations for this page since dimensions will change
    pageStatesRef.current[i] = { json: null };
    await loadPage(i, next);
  }, [loadPage]);

  // Apply tool settings whenever they change OR a new Fabric canvas is created
  useEffect(() => { applyActiveTool(activeTool, color, strokeWidth); }, [fabricVersion, activeTool, color, strokeWidth, applyActiveTool]);

  // Mouse handler - depends on fabricVersion so it re-runs each time a new canvas is created
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMouseDown = async (opt: any) => {
      const pointer = fc.getScenePoint(opt.e);
      const { Rect, Ellipse, Line, IText, Group } = await import("fabric");
      if (activeTool === "eraser") {
        const result = fc.findTarget(opt.e);
        const target = result?.target ?? result;
        if (target && typeof target.type === "string") { fc.remove(target); fc.renderAll(); }
        return;
      }
      if (activeTool === "rect") {
        const r = new Rect({ left: pointer.x, top: pointer.y, width: 120, height: 80, fill: "transparent", stroke: color, strokeWidth });
        fc.add(r); fc.setActiveObject(r); setActiveTool("select");
      } else if (activeTool === "ellipse") {
        const e = new Ellipse({ left: pointer.x, top: pointer.y, rx: 60, ry: 35, fill: "transparent", stroke: color, strokeWidth });
        fc.add(e); fc.setActiveObject(e); setActiveTool("select");
      } else if (activeTool === "line") {
        const l = new Line([pointer.x, pointer.y, pointer.x + 120, pointer.y], { stroke: color, strokeWidth });
        fc.add(l); fc.setActiveObject(l); setActiveTool("select");
      } else if (activeTool === "text") {
        const t = new IText("Type here", { left: pointer.x, top: pointer.y, fill: color, fontSize, fontFamily: "Georgia, serif" });
        fc.add(t); fc.setActiveObject(t); t.enterEditing(); t.selectAll(); setActiveTool("select");
      } else if (activeTool === "sticky") {
        const bg = new Rect({ width: 160, height: 110, fill: "#fef9c3", rx: 4, ry: 4, stroke: "#fbbf24", strokeWidth: 1 });
        const txt = new IText("Note", { fontSize: 13, fill: "#713f12", fontFamily: "Georgia, serif", top: 12, left: 10, width: 140 });
        const g = new Group([bg, txt], { left: pointer.x, top: pointer.y });
        fc.add(g); fc.setActiveObject(g); setActiveTool("select");
      }
    };
    fc.on("mouse:down", handleMouseDown);
    return () => fc.off("mouse:down", handleMouseDown);
  }, [fabricVersion, activeTool, color, strokeWidth, fontSize]);

  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (obj) { fc.remove(obj); fc.discardActiveObject(); fc.renderAll(); }
  }, []);

  const handleExport = async () => {
    if (!file || !pdfDocRef.current) return;
    setIsExporting(true);
    try {
      saveCurrentPageState();
      const finalStates = [...pageStatesRef.current];
      const finalRotations = [...pageRotationsRef.current];
      const { PDFDocument, degrees, rgb } = await import("pdf-lib");
      const origBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(origBytes);
      const { StaticCanvas } = await import("fabric");

      for (let i = 0; i < totalPages; i++) {
        const additionalRot = finalRotations[i] ?? 0;
        const state = finalStates[i];
        const hasAnnotations = !!state?.json;
        if (additionalRot === 0 && !hasAnnotations) continue;

        const pdfPage = pdfDoc.getPage(i);
        const pdfJsPage = await pdfDocRef.current.getPage(i + 1);
        const vp = pdfJsPage.getViewport({ scale: scaleRef.current, rotation: additionalRot });

        // Create composite canvas: bg + annotations
        const offCanvas = document.createElement("canvas");
        offCanvas.width = vp.width;
        offCanvas.height = vp.height;
        const ctx = offCanvas.getContext("2d")!;

        // Render PDF background at the chosen rotation
        await pdfJsPage.render({ canvasContext: ctx, canvas: offCanvas, viewport: vp }).promise;

        // Render Fabric annotations on top
        if (hasAnnotations) {
          const sc = new StaticCanvas(undefined, { width: vp.width, height: vp.height });
          await sc.loadFromJSON(state.json);
          sc.renderAll();
          const annotDataUrl = sc.toDataURL({ format: "png", multiplier: 1 });
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => { ctx.drawImage(img, 0, 0); resolve(); };
            img.src = annotDataUrl;
          });
        }

        // Embed composite as PNG
        const compositeB64 = offCanvas.toDataURL("image/png").split(",")[1];
        const pngBytes = Uint8Array.from(atob(compositeB64), (c) => c.charCodeAt(0));
        const pngImage = await pdfDoc.embedPng(pngBytes as Uint8Array<ArrayBuffer>);

        // Compute new page size in PDF points
        const origSize = pdfPage.getSize();
        const is90or270 = additionalRot === 90 || additionalRot === 270;
        const newW = is90or270 ? origSize.height : origSize.width;
        const newH = is90or270 ? origSize.width : origSize.height;

        if (is90or270) pdfPage.setSize(newW, newH);
        pdfPage.setRotation(degrees(0)); // baked into composite

        // Cover existing content with white, then draw composite
        pdfPage.drawRectangle({ x: 0, y: 0, width: newW, height: newH, color: rgb(1, 1, 1) });
        pdfPage.drawImage(pngImage, { x: 0, y: 0, width: newW, height: newH });
      }

      const saved = await pdfDoc.save();
      const blob = new Blob([saved as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      void addHistoryEntry({ tool: "Edit", fileName: file.name, size: blob.size });
      setResult(blob);
    } catch (err) {
      console.error("Export error:", err);
      setPdfError(err instanceof Error ? err.message : "Export failed. Try fewer annotations or a smaller PDF.");
    }
    finally { setIsExporting(false); }
  };

  const insertSignature = async (sig: Signature) => {
    if (!fabricRef.current) return;
    const { FabricImage } = await import("fabric");
    const img = await FabricImage.fromURL(sig.dataUrl);
    img.scaleToWidth(180);
    img.set({ originX: "left", originY: "top", left: 60, top: 60 });
    fabricRef.current.add(img);
    fabricRef.current.setActiveObject(img);
    fabricRef.current.renderAll();
    setShowSignatureModal(false);
    setActiveTool("select");
  };

  const styleSelected = (apply: (o: Record<string, unknown>) => void) => {
    const o = fabricRef.current?.getActiveObject();
    if (o) {
      apply(o);
      fabricRef.current.renderAll();
    }
  };

  // ── UPLOAD SCREEN ─────────────────────────────────────────────────────────
  if (!file) {
    return (
      <ToolLayout title="Edit PDF" description="Write, highlight, draw shapes and sign, right on the page" icon={PenTool}>
        <div className="space-y-4">
          <PdfDropzone onFiles={handleFiles} files={[]} label="Drop your PDF to start editing" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pages you draw on or rotate are saved as images, so their text stops being selectable. Pages you leave alone keep their text.
          </p>
          {pdfError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {pdfError}
            </div>
          )}
        </div>
      </ToolLayout>
    );
  }

  const toolButton = (id: Tool, icon: React.ReactNode, label: string) => (
    <button
      key={id}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={activeTool === id && id !== "signature"}
      onClick={() => (id === "signature" ? setShowSignatureModal(true) : setActiveTool(id))}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
        activeTool === id && id !== "signature" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
    </button>
  );
  const divider = <span className="mx-1 h-6 w-px bg-border" aria-hidden />;
  const textish = activeTool === "text" || activeTool === "sticky";

  // ── EDITOR SCREEN ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col bg-background">
      {result && (
        <div className="p-6 lg:p-10">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center gap-3">
              <PenTool className="h-5 w-5 text-muted-foreground" />
              <h1 className="font-display text-2xl">Edit PDF</h1>
            </div>
            <ResultCard
              verb="Edited"
              blob={result}
              fileName={file.name.replace(/\.pdf$/i, "") + "_edited.pdf"}
              inputSize={file.size}
              actions={
                <Button variant="outline" onClick={() => setResult(null)}>
                  <PenTool className="h-4 w-4" /> Keep editing
                </Button>
              }
              onReset={handleRemove}
              resetLabel="Edit another"
            />
          </div>
        </div>
      )}

      {/* Kept mounted while the result shows, so "Keep editing" returns to the same canvas. */}
      <div hidden={!!result} className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2.5 pl-14 lg:pl-4">
          <PenTool className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="min-w-0 max-w-xs truncate text-sm">{file.name}</span>
          <button type="button" onClick={handleRemove} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Change file
          </button>
          {totalPages > 1 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <button type="button" aria-label="Previous page" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0 || isLoadingPdf} className="rounded p-1 hover:text-foreground disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="tabular-nums">Page {currentPage + 1} of {totalPages}</span>
              <button type="button" aria-label="Next page" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages - 1 || isLoadingPdf} className="rounded p-1 hover:text-foreground disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </span>
          )}
          <span className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleUndo} disabled={!canUndo}>
              <Undo2 className="h-4 w-4" /> Undo
            </Button>
            <Button variant="ghost" size="sm" onClick={deleteSelected}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
            <Button size="sm" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Save PDF
            </Button>
          </span>
        </div>

        {pdfError && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {pdfError}
          </div>
        )}

        <div className={cn("grid min-h-0 flex-1", totalPages > 1 && "md:grid-cols-[6.5rem_minmax(0,1fr)]")}>
          {stripDoc && totalPages > 1 && (
            <ol className="hidden space-y-3 overflow-y-auto border-r border-border p-3 md:block" aria-label="Pages">
              {Array.from({ length: totalPages }, (_, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => goToPage(i)}
                    aria-current={i === currentPage ? "page" : undefined}
                    aria-label={`Show page ${i + 1}`}
                    className={cn("block w-full rounded p-1 transition-colors", i === currentPage ? "ring-2 ring-primary" : "hover:bg-card")}
                  >
                    <PageThumb doc={stripDoc} index={i} rotation={pageRotations[i] ?? 0} />
                    <span className="mt-1 block text-center font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          <div className="relative min-h-0 overflow-hidden bg-[#111]">
            <div ref={containerRef} className="flex h-full flex-col items-center gap-4 overflow-auto p-6 pb-28">
              {isLoadingPdf && (
                <div className="mt-16 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
              )}
              {/* Single Fabric canvas: the PDF page is its background image, annotations sit on top */}
              <div ref={wrapperRef} style={{ display: isLoadingPdf ? "none" : "inline-block" }} className="shadow-[0_8px_30px_rgba(0,0,0,.45)]">
                <canvas ref={fabricCanvasRef} className="block" />
              </div>
              {pageRotations[currentPage] !== undefined && pageRotations[currentPage] !== 0 && (
                <p className="text-xs text-muted-foreground">Page turned {pageRotations[currentPage]}°</p>
              )}
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3">
              <div role="toolbar" aria-label="Editing tools" className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-2xl border border-border bg-[#1b1b1b]/95 p-1.5 shadow-[0_12px_30px_rgba(0,0,0,.5)] backdrop-blur">
                {TOOL_GROUPS.map((group, gi) => (
                  <span key={group.label} className="flex items-center gap-0.5">
                    {gi > 0 && divider}
                    {group.tools.map((t) => toolButton(t.id, t.icon, t.label))}
                  </span>
                ))}
                {divider}
                <button type="button" title="Turn page left" aria-label="Turn page left" onClick={() => rotatePage(-90)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button type="button" title="Turn page right" aria-label="Turn page right" onClick={() => rotatePage(90)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                  <RotateCw className="h-4 w-4" />
                </button>
                {divider}
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Color" title="Color" className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5" />
                {textish ? (
                  <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} aria-label="Text size" title="Text size" className="h-8 rounded border border-border bg-background px-1 text-xs">
                    {[10, 12, 14, 16, 18, 24, 32, 48].map((n) => <option key={n} value={n}>{n} pt</option>)}
                  </select>
                ) : (
                  <select value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} aria-label="Line width" title="Line width" className="h-8 rounded border border-border bg-background px-1 text-xs">
                    {[1, 2, 3, 4, 6, 8, 12].map((n) => <option key={n} value={n}>{n} px</option>)}
                  </select>
                )}
                {textish && (
                  <>
                    {divider}
                    {[
                      { icon: <Bold className="h-4 w-4" />, label: "Bold", fn: (o: Record<string, unknown>) => { if ("fontWeight" in o) o.fontWeight = o.fontWeight === "bold" ? "normal" : "bold"; } },
                      { icon: <Italic className="h-4 w-4" />, label: "Italic", fn: (o: Record<string, unknown>) => { if ("fontStyle" in o) o.fontStyle = o.fontStyle === "italic" ? "normal" : "italic"; } },
                      { icon: <Underline className="h-4 w-4" />, label: "Underline", fn: (o: Record<string, unknown>) => { if ("underline" in o) o.underline = !o.underline; } },
                      { icon: <AlignLeft className="h-4 w-4" />, label: "Align left", fn: (o: Record<string, unknown>) => { if ("textAlign" in o) o.textAlign = "left"; } },
                      { icon: <AlignCenter className="h-4 w-4" />, label: "Align center", fn: (o: Record<string, unknown>) => { if ("textAlign" in o) o.textAlign = "center"; } },
                      { icon: <AlignRight className="h-4 w-4" />, label: "Align right", fn: (o: Record<string, unknown>) => { if ("textAlign" in o) o.textAlign = "right"; } },
                    ].map(({ icon, label, fn }) => (
                      <button key={label} type="button" title={label} aria-label={label} onClick={() => styleSelected(fn)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                        {icon}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Draw your signature">
          <div className="w-full max-w-xl space-y-4 rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Your signature</h2>
              <button type="button" aria-label="Close" onClick={() => setShowSignatureModal(false)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <SignaturePad onDone={insertSignature} />
          </div>
        </div>
      )}
    </div>
  );
}
