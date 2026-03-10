"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { GitMerge, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle, GripVertical } from "lucide-react";
import { mergePDFs } from "@/lib/pdf-merge";

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
    setResultUrl(null);
  }, []);

  const handleRemove = useCallback((i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setResultUrl(null);
  }, []);

  const handleDragStart = (i: number) => setDragIndex(i);

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    setFiles((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(dragIndex, 1);
      arr.splice(i, 0, item);
      return arr;
    });
    setDragIndex(i);
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await mergePDFs(files);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "merged.pdf";
    a.click();
  };

  const reset = () => {
    setFiles([]);
    setError(null);
    setResultUrl(null);
  };

  return (
    <ToolLayout
      title="Merge PDF"
      description="Combine multiple PDF files into a single document"
      icon={GitMerge}
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          multiple
          files={[]}
          label="Drop PDFs here to add them"
        />

        {/* Ordered file list with drag to reorder */}
        {files.length > 0 && (
          <ul className="space-y-1.5">
            {files.map((f, i) => (
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
                <span className="text-muted-foreground text-xs">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
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
              {files.length} PDFs merged successfully!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download merged.pdf
            </Button>
          </div>
        )}

        {!resultUrl ? (
          <Button onClick={handleMerge} disabled={files.length < 2 || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Merging...</>
            ) : (
              <><GitMerge className="h-4 w-4 mr-2" /> Merge {files.length > 0 ? `${files.length} PDFs` : "PDFs"}</>
            )}
          </Button>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Start Over
          </Button>
        )}

        {files.length < 2 && files.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">Add at least 2 PDFs to merge</p>
        )}
      </div>
    </ToolLayout>
  );
}
