"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { LayoutGrid, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getPageThumbnails, reorderPages } from "@/lib/pdf-organize";

export default function OrganizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [isLoadingThumbs, setIsLoadingThumbs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setError(null);
    setResultUrl(null);
    setIsLoadingThumbs(true);
    try {
      const thumbs = await getPageThumbnails(f);
      setThumbnails(thumbs);
      setOrder(thumbs.map((_, i) => i));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load thumbnails.");
    } finally {
      setIsLoadingThumbs(false);
    }
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setThumbnails([]);
    setOrder([]);
    setError(null);
    setResultUrl(null);
  }, []);

  const handleDragStart = (i: number) => setDragIndex(i);

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    setOrder((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(dragIndex, 1);
      arr.splice(i, 0, item);
      return arr;
    });
    setDragIndex(i);
  };

  const handleDeletePage = (i: number) => {
    setOrder((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleApply = async () => {
    if (!file || !order.length) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await reorderPages(file, order);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorganize pages.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `organized_${file.name}`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setThumbnails([]);
    setOrder([]);
    setError(null);
    setResultUrl(null);
  };

  const resetOrder = () => {
    setOrder(thumbnails.map((_, i) => i));
    setResultUrl(null);
  };

  return (
    <ToolLayout
      title="Organize PDF"
      description="Reorder or delete pages by dragging thumbnails"
      icon={LayoutGrid}
    >
      <div className="space-y-5">
        {!file && (
          <PdfDropzone
            onFiles={handleFiles}
            files={[]}
            onRemove={handleRemove}
            label="Drop your PDF here"
          />
        )}

        {isLoadingThumbs && (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading page thumbnails...
          </div>
        )}

        {file && thumbnails.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {order.length} of {thumbnails.length} pages • Drag to reorder, ✕ to delete
              </p>
              <Button variant="ghost" size="sm" onClick={resetOrder} className="text-xs h-7">
                Reset order
              </Button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {order.map((pageIdx, i) => (
                <div
                  key={`${pageIdx}-${i}`}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragEnd={() => setDragIndex(null)}
                  className="relative cursor-grab active:cursor-grabbing group"
                >
                  <img
                    src={thumbnails[pageIdx]}
                    alt={`Page ${pageIdx + 1}`}
                    className="w-full rounded-md border border-border shadow-sm"
                  />
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {pageIdx + 1}
                  </div>
                  <button
                    onClick={() => handleDeletePage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white text-xs items-center justify-center hidden group-hover:flex"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleApply} disabled={isLoading || !order.length} className="flex-1">
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Applying...</>
                ) : (
                  <><LayoutGrid className="h-4 w-4 mr-2" /> Apply Changes</>
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
              PDF organized successfully!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download organized PDF
            </Button>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
