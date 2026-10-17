"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { FileType, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { extractTextFromPDF } from "@/lib/pdf-extract-text";
import { downloadBlob } from "@/lib/pdf-utils";
import { addHistoryEntry } from "@/lib/local-history";

export default function ExtractTextPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setText(null);
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setError(null);
    setText(null);
  }, []);

  const handleExtract = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await extractTextFromPDF(file, (page, total) => {
        setProgress(`Reading page ${page} of ${total}…`);
      });
      setText(result);
      setProgress(null);
      await addHistoryEntry({ tool: "Extract Text", fileName: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed.");
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!text || !file) return;
    downloadBlob(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
      file.name.replace(/\.pdf$/i, ".txt")
    );
  };

  const handleCopy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const reset = () => {
    setFile(null);
    setError(null);
    setText(null);
    setProgress(null);
  };

  return (
    <ToolLayout
      title="Extract Text"
      description="Pull all text content out of a PDF into a plain text file"
      icon={FileType}
      wide
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your PDF here"
        />
        <EncryptedNotice file={file} />

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {progress && <p className="text-xs text-muted-foreground">{progress}</p>}

        {text !== null && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Extracted {text.length.toLocaleString()} characters
            </div>
            <pre className="max-h-96 overflow-auto rounded-xl border border-border bg-card p-4 text-xs text-foreground whitespace-pre-wrap font-mono">
              {text || "(No text found - this may be a scanned PDF. Try OCR tools externally.)"}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" /> Download .txt
              </Button>
              <Button onClick={handleCopy} variant="outline">
                <Copy className="h-4 w-4 mr-2" /> {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        )}

        {!text ? (
          <Button onClick={handleExtract} disabled={!file || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Extracting…</>
            ) : (
              <><FileType className="h-4 w-4 mr-2" /> Extract Text</>
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
