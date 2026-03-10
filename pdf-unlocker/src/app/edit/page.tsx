"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Button } from "@/components/ui/button";
import {
  PenTool, MousePointer2, Square, Circle, Minus, Type,
  StickyNote, PenLine, Eraser, Download, RotateCcw,
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Trash2,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
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

  const sigFabricCanvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sigFabricRef = useRef<any>(null);

  // Keep rotation ref in sync with state
  useEffect(() => { pageRotationsRef.current = pageRotations; }, [pageRotations]);

  const calcScale = useCallback(() => {
    if (!containerRef.current) return 1.5;
    const w = containerRef.current.clientWidth - 64;
    return Math.max(0.5, Math.min(w, 900) / 816);
  }, []);

  // Render a PDF page onto bgCanvasRef. rotation is additional degrees on top of native.
  const renderPdfPage = useCallback(async (pageNum: number, scale: number, rotation: number) => {
    if (!pdfDocRef.current || !bgCanvasRef.current) return null;
    const page = await pdfDocRef.current.getPage(pageNum + 1);
    const viewport = page.getViewport({ scale, rotation });
    const canvas = bgCanvasRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // canvas property is required in pdfjs-dist v5
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    return { width: viewport.width, height: viewport.height };
  }, []);

  const saveCurrentPageState = useCallback(() => {
    if (fabricRef.current) {
      pageStatesRef.current[currentPageRef.current] = { json: fabricRef.current.toJSON() };
    }
  }, []);

  const initFabricForPage = useCallback(async (pageNum: number, width: number, height: number) => {
    if (!fabricCanvasRef.current) return;
    if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }
    const { Canvas, PencilBrush } = await import("fabric");
    const fc = new Canvas(fabricCanvasRef.current, { width, height, isDrawingMode: false, selection: true });
    fc.freeDrawingBrush = new PencilBrush(fc);
    fc.freeDrawingBrush.color = color;
    fc.freeDrawingBrush.width = strokeWidth;
    const saved = pageStatesRef.current[pageNum];
    if (saved?.json) { await fc.loadFromJSON(saved.json); fc.renderAll(); }
    fabricRef.current = fc;

    // Fabric v6 wraps the canvas in a div.canvas-container with position:relative,
    // which puts it in normal document flow below the PDF canvas instead of overlaying it.
    // Force it to be absolutely positioned so it sits on top of bgCanvasRef.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapperEl = (fc as any).wrapperEl as HTMLElement | undefined;
    if (wrapperEl) {
      wrapperEl.style.position = "absolute";
      wrapperEl.style.top = "0";
      wrapperEl.style.left = "0";
    }

    // Increment version so the mouse-handler effect re-runs with the new canvas instance
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
      const s = calcScale();
      scaleRef.current = s;
      const rot = rotation !== undefined ? rotation : (pageRotationsRef.current[pageNum] ?? 0);
      const dims = await renderPdfPage(pageNum, s, rot);
      if (dims) { await initFabricForPage(pageNum, dims.width, dims.height); }
    } finally {
      setIsLoadingPdf(false);
    }
  }, [calcScale, renderPdfPage, initFabricForPage]);

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
      const n = pdf.numPages;
      setTotalPages(n);
      pageStatesRef.current = Array.from({ length: n }, () => ({ json: null }));
      const rotations = Array(n).fill(0);
      setPageRotations(rotations);
      pageRotationsRef.current = rotations;
      setTimeout(async () => {
        const s = calcScale();
        scaleRef.current = s;
        const dims = await renderPdfPage(0, s, 0);
        if (dims) await initFabricForPage(0, dims.width, dims.height);
        setIsLoadingPdf(false);
      }, 80);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Failed to load PDF.");
      setIsLoadingPdf(false);
    }
  }, [calcScale, renderPdfPage, initFabricForPage]);

  const handleRemove = useCallback(() => {
    if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }
    pdfDocRef.current = null;
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

  // Apply tool settings whenever they change
  useEffect(() => { applyActiveTool(activeTool, color, strokeWidth); }, [activeTool, color, strokeWidth, applyActiveTool]);

  // Mouse handler — depends on fabricVersion so it re-runs each time a new canvas is created
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `edited_${file.name}`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) { console.error("Export error:", err); }
    finally { setIsExporting(false); }
  };

  const openSignatureModal = () => {
    setShowSignatureModal(true);
    setTimeout(async () => {
      if (!sigFabricCanvasRef.current) return;
      const { Canvas, PencilBrush } = await import("fabric");
      if (sigFabricRef.current) { sigFabricRef.current.dispose(); sigFabricRef.current = null; }
      const fc = new Canvas(sigFabricCanvasRef.current, { width: 420, height: 160, isDrawingMode: true, backgroundColor: "#f8fafc" });
      fc.freeDrawingBrush = new PencilBrush(fc);
      fc.freeDrawingBrush.color = "#0f172a";
      fc.freeDrawingBrush.width = 2;
      sigFabricRef.current = fc;
    }, 60);
  };

  const insertSignature = async () => {
    if (!sigFabricRef.current || !fabricRef.current) return;
    const dataUrl = sigFabricRef.current.toDataURL({ format: "png" });
    const { FabricImage } = await import("fabric");
    const img = await FabricImage.fromURL(dataUrl);
    img.scale(0.5); img.set({ left: 60, top: 60 });
    fabricRef.current.add(img); fabricRef.current.setActiveObject(img); fabricRef.current.renderAll();
    setShowSignatureModal(false);
  };

  // ── UPLOAD SCREEN ─────────────────────────────────────────────────────────
  if (!file) {
    return (
      <ToolLayout title="Edit PDF" description="Annotate, draw, add text, shapes and signatures" icon={PenTool}>
        <div className="space-y-4">
          <PdfDropzone onFiles={handleFiles} files={[]} label="Drop your PDF to start editing" />
          {pdfError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {pdfError}
            </div>
          )}
        </div>
      </ToolLayout>
    );
  }

  // ── EDITOR SCREEN ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background">

      {/* ── Top ribbon ───────────────────────────────────────────── */}
      <div className="flex flex-col border-b border-border bg-card flex-shrink-0">

        {/* File bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            <PenTool className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-foreground truncate max-w-xs">{file.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={deleteSelected} title="Delete selected">
              <Trash2 className="h-3.5 w-3.5 mr-1" /><span className="text-xs">Delete</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRemove}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /><span className="text-xs">New file</span>
            </Button>
            <Button size="sm" onClick={handleExport} disabled={isExporting}>
              {isExporting
                ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Exporting…</>
                : <><Download className="h-3.5 w-3.5 mr-1" />Export PDF</>}
            </Button>
          </div>
        </div>

        {/* Tool ribbon */}
        <div className="flex items-stretch gap-0 px-2 py-1 overflow-x-auto">

          {/* Tool groups */}
          {TOOL_GROUPS.map((group, gi) => (
            <div key={group.label} className={cn("flex items-center gap-0.5 px-2", gi < TOOL_GROUPS.length - 1 && "border-r border-border")}>
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-0.5">
                  {group.tools.map((t) => (
                    <button
                      key={t.id}
                      title={t.label}
                      onClick={() => t.id === "signature" ? openSignatureModal() : setActiveTool(t.id)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded text-xs min-w-[44px] transition-colors",
                        activeTool === t.id && t.id !== "signature"
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {t.icon}
                      <span className="text-[10px] leading-none">{t.label}</span>
                    </button>
                  ))}
                </div>
                <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">{group.label}</span>
              </div>
            </div>
          ))}

          {/* Rotate group */}
          <div className="flex items-center gap-0.5 px-2 border-r border-border">
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-0.5">
                {[
                  { icon: <RotateCcw className="h-4 w-4" />, label: "90° CCW", delta: -90 },
                  { icon: <RotateCw className="h-4 w-4" />, label: "90° CW", delta: 90 },
                ].map(({ icon, label, delta }) => (
                  <button
                    key={label}
                    title={label}
                    onClick={() => rotatePage(delta)}
                    className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded text-xs min-w-[44px] transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    {icon}
                    <span className="text-[10px] leading-none">{label}</span>
                  </button>
                ))}
              </div>
              <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">Rotate</span>
            </div>
          </div>

          {/* Format group */}
          <div className="flex items-center gap-0.5 px-2 border-r border-border">
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <div className="flex flex-col items-center gap-0.5">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-7 rounded cursor-pointer p-0 border border-border bg-transparent" title="Color" />
                  <span className="text-[10px] leading-none text-muted-foreground">Color</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 px-1">
                  <select value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="h-7 text-xs bg-background border border-border rounded px-1 text-foreground">
                    {[1, 2, 3, 4, 6, 8, 12].map((n) => <option key={n} value={n}>{n}px</option>)}
                  </select>
                  <span className="text-[10px] leading-none text-muted-foreground">Width</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 px-1">
                  <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}
                    className="h-7 text-xs bg-background border border-border rounded px-1 text-foreground">
                    {[10, 12, 14, 16, 18, 24, 32, 48].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="text-[10px] leading-none text-muted-foreground">Size</span>
                </div>
              </div>
              <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">Format</span>
            </div>
          </div>

          {/* Text formatting group */}
          <div className="flex items-center gap-0.5 px-2">
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-0.5">
                {[
                  { icon: <Bold className="h-3.5 w-3.5" />, label: "Bold", action: () => { const o = fabricRef.current?.getActiveObject(); if (o && "fontWeight" in o) { (o as { fontWeight: string }).fontWeight = (o as { fontWeight: string }).fontWeight === "bold" ? "normal" : "bold"; fabricRef.current.renderAll(); } } },
                  { icon: <Italic className="h-3.5 w-3.5" />, label: "Italic", action: () => { const o = fabricRef.current?.getActiveObject(); if (o && "fontStyle" in o) { (o as { fontStyle: string }).fontStyle = (o as { fontStyle: string }).fontStyle === "italic" ? "normal" : "italic"; fabricRef.current.renderAll(); } } },
                  { icon: <Underline className="h-3.5 w-3.5" />, label: "Underline", action: () => { const o = fabricRef.current?.getActiveObject(); if (o && "underline" in o) { (o as { underline: boolean }).underline = !(o as { underline: boolean }).underline; fabricRef.current.renderAll(); } } },
                  { icon: <AlignLeft className="h-3.5 w-3.5" />, label: "Left", action: () => { const o = fabricRef.current?.getActiveObject(); if (o && "textAlign" in o) { (o as { textAlign: string }).textAlign = "left"; fabricRef.current.renderAll(); } } },
                  { icon: <AlignCenter className="h-3.5 w-3.5" />, label: "Center", action: () => { const o = fabricRef.current?.getActiveObject(); if (o && "textAlign" in o) { (o as { textAlign: string }).textAlign = "center"; fabricRef.current.renderAll(); } } },
                  { icon: <AlignRight className="h-3.5 w-3.5" />, label: "Right", action: () => { const o = fabricRef.current?.getActiveObject(); if (o && "textAlign" in o) { (o as { textAlign: string }).textAlign = "right"; fabricRef.current.renderAll(); } } },
                ].map(({ icon, label, action }) => (
                  <button key={label} title={label} onClick={action}
                    className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded text-xs transition-colors text-muted-foreground hover:text-foreground hover:bg-muted min-w-[32px]">
                    {icon}
                    <span className="text-[10px] leading-none">{label}</span>
                  </button>
                ))}
              </div>
              <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">Text</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Canvas area ──────────────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-[#e8e8e8] dark:bg-[#3a3a3a] p-6 flex flex-col items-center gap-4">
        {isLoadingPdf && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm mt-16">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        )}

        <div ref={wrapperRef} style={{ display: isLoadingPdf ? "none" : "inline-block" }}
          className="relative shadow-[0_2px_16px_rgba(0,0,0,0.25)] bg-white">
          <canvas ref={bgCanvasRef} className="block" />
          <canvas ref={fabricCanvasRef} />
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-3 bg-card border border-border rounded-full px-4 py-1.5 shadow-sm">
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0 || isLoadingPdf}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground min-w-[90px] text-center">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages - 1 || isLoadingPdf}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Rotation indicator */}
        {pageRotations[currentPage] !== undefined && pageRotations[currentPage] !== 0 && (
          <div className="text-xs text-muted-foreground">
            Page rotated {pageRotations[currentPage]}°
          </div>
        )}
      </div>

      {/* ── Signature modal ───────────────────────────────────────── */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 w-[500px] max-w-[95vw]">
            <div>
              <h2 className="text-base font-semibold text-foreground">Draw your signature</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Sign below with your mouse or finger</p>
            </div>
            <div className="border-2 border-border rounded-lg overflow-hidden bg-[#f8fafc]">
              <canvas ref={sigFabricCanvasRef} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => sigFabricRef.current?.clear()} className="flex-1">Clear</Button>
              <Button variant="outline" size="sm" onClick={() => setShowSignatureModal(false)} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={insertSignature} className="flex-1">Insert Signature</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
