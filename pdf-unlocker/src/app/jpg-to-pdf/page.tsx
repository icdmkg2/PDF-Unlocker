"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { ImageIcon, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle, GripVertical } from "lucide-react";
import { imagesToPDF } from "@/lib/images-to-pdf";

export default function JpgToPdfPage() {
  const [images, setImages] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) {
      setImages((prev) => [...prev, ...files]);
      setResultUrl(null);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) {
      setImages((prev) => [...prev, ...files]);
      setResultUrl(null);
    }
    e.target.value = "";
  };

  const handleRemove = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    setResultUrl(null);
  };

  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    setImages((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(dragIndex, 1);
      arr.splice(i, 0, item);
      return arr;
    });
    setDragIndex(i);
  };

  const handleConvert = async () => {
    if (!images.length) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await imagesToPDF(images);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "images.pdf";
    a.click();
  };

  const reset = () => {
    setImages([]);
    setError(null);
    setResultUrl(null);
  };

  return (
    <ToolLayout
      title="JPG to PDF"
      description="Convert images (JPG, PNG) into a PDF document"
      icon={ImageIcon}
    >
      <div className="space-y-5">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors"
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">Drop images here or click to browse</p>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />
            Choose Images
          </label>
        </div>

        {images.length > 0 && (
          <ul className="space-y-1.5">
            {images.map((f, i) => (
              <li
                key={i}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={() => setDragIndex(null)}
                className="flex items-center gap-3 px-3 py-2 bg-muted rounded-md text-sm cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground w-5 text-xs">{i + 1}.</span>
                <span className="truncate text-foreground flex-1">{f.name}</span>
                <span className="text-muted-foreground text-xs">{(f.size / 1024).toFixed(0)} KB</span>
                <button
                  onClick={() => handleRemove(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors text-xs"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
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
              {images.length} image{images.length !== 1 ? "s" : ""} converted to PDF!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download images.pdf
            </Button>
          </div>
        )}

        {!resultUrl ? (
          <Button onClick={handleConvert} disabled={!images.length || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Converting...</>
            ) : (
              <><ImageIcon className="h-4 w-4 mr-2" /> Convert to PDF</>
            )}
          </Button>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Start Over
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
