"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { Tags, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { readPdfMetadata, writePdfMetadata, type PdfMetadata } from "@/lib/pdf-metadata";
import { downloadBytes, revokeUrl } from "@/lib/pdf-utils";
import { addHistoryEntry } from "@/lib/local-history";

export default function MetadataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<PdfMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    revokeUrl(resultUrl);
    setFile(f);
    setError(null);
    setResultUrl(null);
    setIsLoading(true);
    try {
      setMeta(await readPdfMetadata(f));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read metadata.");
      setMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [resultUrl]);

  const handleRemove = useCallback(() => {
    revokeUrl(resultUrl);
    setFile(null);
    setMeta(null);
    setError(null);
    setResultUrl(null);
  }, [resultUrl]);

  const update = (key: keyof PdfMetadata, value: string) => {
    if (!meta) return;
    setMeta({ ...meta, [key]: value });
  };

  const handleSave = async () => {
    if (!file || !meta) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await writePdfMetadata(file, {
        title: meta.title,
        author: meta.author,
        subject: meta.subject,
        keywords: meta.keywords,
        creator: meta.creator,
      });
      revokeUrl(resultUrl);
      setResultUrl(URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" })));
      await addHistoryEntry({ tool: "Metadata", fileName: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = file.name.replace(/\.pdf$/i, "_meta.pdf");
    a.click();
  };

  const reset = () => handleRemove();

  return (
    <ToolLayout
      title="PDF Metadata"
      description="View and edit title, author, subject, and keywords"
      icon={Tags}
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your PDF here"
        />
        <EncryptedNotice file={file} />

        {meta && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {meta.pageCount} pages · Producer: {meta.producer || "—"} · Created: {meta.creationDate || "—"}
            </p>
            {(
              [
                ["title", "Title"],
                ["author", "Author"],
                ["subject", "Subject"],
                ["keywords", "Keywords"],
                ["creator", "Creator"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  value={meta[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              </div>
            ))}
          </div>
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
              Metadata updated
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </div>
        )}

        {meta && !resultUrl && (
          <Button onClick={handleSave} disabled={isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              <><Tags className="h-4 w-4 mr-2" /> Save Metadata</>
            )}
          </Button>
        )}

        {resultUrl && (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Start Over
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
