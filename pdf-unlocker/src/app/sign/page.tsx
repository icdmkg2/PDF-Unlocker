"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { PenLine, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { signPDF } from "@/lib/pdf-sign";
import { cn } from "@/lib/utils";
import { PDFDocument } from "pdf-lib";

const SIZE_OPTIONS = [
  { label: "Small", width: 100, height: 40 },
  { label: "Medium", width: 150, height: 60 },
  { label: "Large", width: 200, height: 80 },
];

const POSITION_OPTIONS = [
  { label: "Bottom Left", getCoords: (pw: number, ph: number, sw: number, sh: number) => ({ x: 40, y: ph - sh - 40 }) },
  { label: "Bottom Center", getCoords: (pw: number, ph: number, sw: number, sh: number) => ({ x: (pw - sw) / 2, y: ph - sh - 40 }) },
  { label: "Bottom Right", getCoords: (pw: number, ph: number, sw: number, sh: number) => ({ x: pw - sw - 40, y: ph - sh - 40 }) },
];

export default function SignPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [sizeOption, setSizeOption] = useState(1);
  const [positionOption, setPositionOption] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<import("fabric").Canvas | null>(null);

  useEffect(() => {
    return () => {
      fabricRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const initFabric = async () => {
      const { Canvas, PencilBrush } = await import("fabric");
      if (fabricRef.current) fabricRef.current.dispose();
      const fc = new Canvas(canvasRef.current!, {
        width: 500,
        height: 150,
        backgroundColor: "#fff",
        isDrawingMode: true,
      });
      fc.freeDrawingBrush = new PencilBrush(fc);
      fc.freeDrawingBrush.color = "#1a1a2e";
      fc.freeDrawingBrush.width = 2;
      fabricRef.current = fc;
    };
    initFabric();
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setError(null);
    setResultUrl(null);
    try {
      const bytes = await f.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const count = doc.getPageCount();
      setPageCount(count);
      setPageIndex(count - 1);
    } catch {
      setPageCount(null);
    }
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setPageCount(null);
    setError(null);
    setResultUrl(null);
  }, []);

  const clearSignature = () => {
    fabricRef.current?.clear();
    if (fabricRef.current) {
      fabricRef.current.backgroundColor = "#fff";
      fabricRef.current.renderAll();
    }
  };

  const handleSign = async () => {
    if (!file || !pageCount || !fabricRef.current) return;
    const fc = fabricRef.current;
    if (!fc.getObjects().length) {
      setError("Please draw your signature first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const dataUrl = fc.toDataURL({ format: "png", multiplier: 1 });

      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const page = doc.getPage(pageIndex);
      const { width: pw, height: ph } = page.getSize();

      const { width: sw, height: sh } = SIZE_OPTIONS[sizeOption];
      const { x, y } = POSITION_OPTIONS[positionOption].getCoords(pw, ph, sw, sh);

      const out = await signPDF(file, dataUrl, {
        pageIndex,
        x,
        y: ph - y - sh,
        width: sw,
        height: sh,
      });
      const blob = new Blob([out as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signing failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `signed_${file.name}`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setPageCount(null);
    setError(null);
    setResultUrl(null);
    clearSignature();
  };

  return (
    <ToolLayout
      title="Sign PDF"
      description="Draw your signature and embed it into a PDF page"
      icon={PenLine}
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your PDF here"
        />

        <div className="space-y-2">
          <Label>Draw your signature</Label>
          <div className="border border-border rounded-lg overflow-hidden">
            <canvas ref={canvasRef} />
          </div>
          <Button variant="ghost" size="sm" onClick={clearSignature} className="text-xs">
            <Trash2 className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>

        {file && pageCount && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="page-select">Place on page</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="page-select"
                  type="number"
                  min={1}
                  max={pageCount}
                  value={pageIndex + 1}
                  onChange={(e) => setPageIndex(Math.max(0, Math.min(pageCount - 1, parseInt(e.target.value) - 1 || 0)))}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">of {pageCount}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Position</Label>
              <div className="flex gap-2">
                {POSITION_OPTIONS.map(({ label }, i) => (
                  <button
                    key={label}
                    onClick={() => setPositionOption(i)}
                    className={cn(
                      "flex-1 py-1.5 px-2 rounded-md border text-xs font-medium transition-colors",
                      positionOption === i
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Size</Label>
              <div className="flex gap-2">
                {SIZE_OPTIONS.map(({ label }, i) => (
                  <button
                    key={label}
                    onClick={() => setSizeOption(i)}
                    className={cn(
                      "flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors",
                      sizeOption === i
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
              Signature added successfully!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download signed PDF
            </Button>
          </div>
        )}

        {!resultUrl ? (
          <Button onClick={handleSign} disabled={!file || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing...</>
            ) : (
              <><PenLine className="h-4 w-4 mr-2" /> Sign PDF</>
            )}
          </Button>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Sign Another PDF
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
