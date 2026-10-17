"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ImageIcon, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { extractImagesFromPDF, zipImages } from "@/lib/pdf-extract-images";
import { revokeUrl } from "@/lib/pdf-utils";
import { addHistoryEntry } from "@/lib/local-history";

export default function ExtractImagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    revokeUrl(resultUrl);
    setFile(files[0]);
    setError(null);
    setResultUrl(null);
    setCount(null);
  }, [resultUrl]);

  const handleRemove = useCallback(() => {
    revokeUrl(resultUrl);
    setFile(null);
    setError(null);
    setResultUrl(null);
    setCount(null);
  }, [resultUrl]);

  const handleExtract = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      setProgress("Reading embedded images (first run loads pdfcpu)…");
      const images = await extractImagesFromPDF(file);
      revokeUrl(resultUrl);
      setCount(images.length);
      setResultUrl(images.length ? URL.createObjectURL(await zipImages(images)) : null);
      setProgress(null);
      await addHistoryEntry({ tool: "Extract Images", fileName: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed.");
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = file.name.replace(/\.pdf$/i, "_images.zip");
    a.click();
  };

  const reset = () => {
    revokeUrl(resultUrl);
    setFile(null);
    setError(null);
    setResultUrl(null);
    setCount(null);
    setProgress(null);
  };

  return (
    <ToolLayout
      title="Extract Images"
      description="Save the photos and graphics embedded in a PDF, in their original quality"
      icon={ImageIcon}
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your PDF here"
        />
        <EncryptedNotice file={file} />

        <p className="text-xs text-muted-foreground leading-relaxed">
          Images are copied out as stored in the file, without re-rendering. To save whole pages as
          pictures, use{" "}
          <Link href="/pdf-to-jpg" className="underline underline-offset-2 hover:text-foreground">
            PDF to JPG
          </Link>
          .
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {progress && <p className="text-xs text-muted-foreground">{progress}</p>}

        {resultUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {count === 1 ? "1 image found" : `${count} images found`}
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download ZIP
            </Button>
          </div>
        )}

        {count === 0 && (
          <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
            This PDF has no embedded images. Its pages are text or vector drawings. Use{" "}
            <Link href="/pdf-to-jpg" className="text-foreground underline underline-offset-2">
              PDF to JPG
            </Link>{" "}
            to save the pages as pictures.
          </div>
        )}

        {count === null ? (
          <Button onClick={handleExtract} disabled={!file || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Extracting…</>
            ) : (
              <><ImageIcon className="h-4 w-4 mr-2" /> Extract Images</>
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
