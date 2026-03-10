"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Minimize2, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { compressPDF } from "@/lib/pdf-compress";

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
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
    setProgress("Loading pdfcpu (first time may take a moment)...");
    try {
      setProgress("Optimizing PDF...");
      const bytes = await compressPDF(file);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResult({
        url: URL.createObjectURL(blob),
        originalSize: file.size,
        compressedSize: bytes.length,
      });
      setProgress(null);
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

  const reduction = result
    ? Math.round((1 - result.compressedSize / result.originalSize) * 100)
    : 0;

  const toMB = (n: number) => (n / 1024 / 1024).toFixed(2);

  return (
    <ToolLayout
      title="Compress PDF"
      description="Reduce file size while maintaining quality"
      icon={Minimize2}
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your PDF here"
        />

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
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-primary text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                Compression complete!
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm pt-1">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">Original</p>
                  <p className="font-medium text-foreground">{toMB(result.originalSize)} MB</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">Compressed</p>
                  <p className="font-medium text-foreground">{toMB(result.compressedSize)} MB</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">Reduction</p>
                  <p className={`font-medium ${reduction > 0 ? "text-green-500" : "text-muted-foreground"}`}>
                    {reduction > 0 ? `-${reduction}%` : "Optimal"}
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
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Compressing...</>
            ) : (
              <><Minimize2 className="h-4 w-4 mr-2" /> Compress PDF</>
            )}
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
