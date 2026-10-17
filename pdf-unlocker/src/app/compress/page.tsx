"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Minimize2, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { compressPDF, type CompressQuality } from "@/lib/pdf-compress";
import { addHistoryEntry } from "@/lib/local-history";
import { cn } from "@/lib/utils";

const QUALITY_OPTIONS: { id: CompressQuality; label: string; desc: string }[] = [
  { id: "lossless", label: "Keep text", desc: "Removes duplicate fonts and images, unused data. Text, links and forms stay." },
  { id: "screen", label: "Smallest", desc: "Pages become low-res images. For email and web." },
  { id: "ebook", label: "Balanced", desc: "Pages become medium-quality images." },
  { id: "print", label: "High quality", desc: "Pages become sharp images. Larger file." },
];

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<CompressQuality>("lossless");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; originalSize: number; compressedSize: number } | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setResult(null);
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setError(null);
    setResult(null);
  }, []);

  const handleCompress = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setProgress(quality === "lossless" ? "Optimizing (first run loads pdfcpu)…" : "Rendering pages…");
    try {
      const bytes = await compressPDF(file, quality, (page, total) => {
        setProgress(`Compressing page ${page} of ${total}…`);
      });
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResult({
        url: URL.createObjectURL(blob),
        originalSize: file.size,
        compressedSize: bytes.length,
      });
      setProgress(null);
      await addHistoryEntry({ tool: "Compress", fileName: file.name, size: bytes.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compression failed.");
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `compressed_${file.name}`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setError(null);
    setResult(null);
    setProgress(null);
  };

  const reduction = result ? Math.round((1 - result.compressedSize / result.originalSize) * 100) : 0;
  const toMB = (n: number) => (n / 1024 / 1024).toFixed(2);

  return (
    <ToolLayout
      title="Compress PDF"
      description="Shrink a PDF, keeping text by default"
      icon={Minimize2}
      notice={
        quality === "lossless"
          ? undefined
          : "This mode turns every page into an image. Selectable text, links and form fields are removed. Scanned PDFs may not shrink."
      }
    >
      <div className="space-y-5">
        <PdfDropzone onFiles={handleFiles} files={file ? [file] : []} onRemove={handleRemove} label="Drop your PDF here" />

        {/* Quality selector */}
        {file && !result && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Compression level</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setQuality(opt.id)}
                  aria-pressed={quality === opt.id}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                    quality === opt.id
                      ? "border-primary/60 bg-primary/5"
                      : "border-border bg-card hover:border-muted-foreground/40"
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {opt.label}
                    {opt.id === "lossless" && (
                      <span className="font-label text-[9px] text-emerald-500/90">Recommended</span>
                    )}
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {progress && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
            {progress}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-primary text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                {reduction > 0 ? "Compression complete" : "Already as small as it gets in this mode"}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">Original</p>
                  <p className="font-semibold text-foreground">{toMB(result.originalSize)} MB</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">Compressed</p>
                  <p className="font-semibold text-foreground">{toMB(result.compressedSize)} MB</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">Saved</p>
                  <p className={`font-semibold ${reduction > 0 ? "text-green-500" : "text-muted-foreground"}`}>
                    {reduction > 0 ? `-${reduction}%` : "-"}
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download compressed PDF
            </Button>
          </div>
        )}

        {!result ? (
          <Button onClick={handleCompress} disabled={!file || isLoading} className="w-full">
            {isLoading
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Compressing…</>
              : <><Minimize2 className="h-4 w-4 mr-2" /> Compress PDF</>}
          </Button>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Compress Another PDF
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
