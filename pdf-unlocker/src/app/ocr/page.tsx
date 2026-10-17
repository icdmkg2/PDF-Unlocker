"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard, formatSize } from "@/components/result-card";
import { ErrorNote, Step, Steps, Working } from "@/components/steps";
import { ScanText, Copy, FileType } from "lucide-react";
import { ocrPdf, type OcrPage } from "@/lib/ocr";
import { downloadBlob } from "@/lib/pdf-utils";
import { addHistoryEntry } from "@/lib/local-history";

export default function OcrPage() {
  const [file, setFile] = useState<File | null>(null);
  const [skipText, setSkipText] = useState(true);
  const [progress, setProgress] = useState<{ message: string; done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; pages: OcrPage[] } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setResult(null);
  }, []);

  const reset = () => {
    setFile(null);
    setError(null);
    setResult(null);
    setProgress(null);
  };

  const handleRun = async () => {
    if (!file) return;
    setError(null);
    setProgress({ message: "Starting…", done: 0, total: 1 });
    try {
      const { bytes, pages } = await ocrPdf(file, {
        redoTextPages: !skipText,
        onProgress: (message, done, total) => setProgress({ message, done, total }),
      });
      setResult({ blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), pages });
      await addHistoryEntry({ tool: "OCR", fileName: file.name, size: bytes.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recognition failed.");
    } finally {
      setProgress(null);
    }
  };

  const read = result?.pages.filter((p) => !p.skipped) ?? [];
  const lines = read.reduce((n, p) => n + p.lines.length, 0);
  const text = result?.pages.map((p) => p.text).filter(Boolean).join("\n\n") ?? "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked; the text is still selectable below
    }
  };

  return (
    <ToolLayout title="OCR" description="Recognize the text in scanned pages so you can search, select and copy it" icon={ScanText} medium>
      <Steps>
        <Step n={1} title="Add a PDF" state={file ? "done" : "current"} summary={file && `${file.name} · ${formatSize(file.size)}`} onChange={reset}>
          <PdfDropzone onFiles={handleFiles} label="Drop a scanned PDF" />
        </Step>

        <Step n={2} title="Recognize text" state={!file ? "todo" : result ? "done" : "current"} summary={result && `${read.length} page${read.length === 1 ? "" : "s"} read`}>
          <EncryptedNotice file={file} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={skipText} onChange={(e) => setSkipText(e.target.checked)} className="mt-0.5 accent-primary" />
            <span>
              Skip pages that already have text
              <span className="block text-xs text-muted-foreground">Faster, and avoids doubling up text that is already searchable.</span>
            </span>
          </label>
          <p className="text-xs text-muted-foreground">English. Runs on this device; the engine downloads once from this site and then works offline.</p>
          {progress && (
            <div className="space-y-2">
              <Working>{progress.message}</Working>
              <div className="h-1 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
                <div className="h-full bg-primary transition-[width]" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
              </div>
            </div>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={handleRun} disabled={!!progress} className="w-full">
            <ScanText className="h-4 w-4" /> Recognize text
          </Button>
        </Step>

        <Step n={3} title="Save" state={result ? "current" : "todo"}>
          {result && file && (
            <>
              <pre data-testid="ocr-text" className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground">
                {text || "No text was recognized. The pages may be blank, handwritten, or too low in resolution."}
              </pre>
              <ResultCard
                verb="Made searchable"
                blob={result.blob}
                fileName={file.name.replace(/\.pdf$/i, "") + " (searchable).pdf"}
                inputSize={file.size}
                facts={[
                  { label: "Pages read", value: String(read.length) },
                  { label: "Lines", value: lines.toLocaleString() },
                ]}
                note={
                  result.pages.some((p) => p.skipped)
                    ? `${result.pages.filter((p) => p.skipped).length} page(s) already had text and were left as they are.`
                    : "The pages look the same; the recognized text sits invisibly on top of them."
                }
                actions={
                  <>
                    <Button variant="outline" onClick={handleCopy} disabled={!text}>
                      <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy text"}
                    </Button>
                    <Button variant="outline" onClick={() => downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), file.name.replace(/\.pdf$/i, ".txt"))} disabled={!text}>
                      <FileType className="h-4 w-4" /> .txt
                    </Button>
                  </>
                }
                onReset={reset}
                resetLabel="Read another"
              />
            </>
          )}
        </Step>
      </Steps>
    </ToolLayout>
  );
}
