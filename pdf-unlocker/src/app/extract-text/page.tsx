"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard, formatSize } from "@/components/result-card";
import { ErrorNote, Step, Steps, Working } from "@/components/steps";
import { FileType, Copy, ScanText } from "lucide-react";
import { useRouter } from "next/navigation";
import { setHandoff } from "@/lib/handoff";
import { extractTextFromPDF } from "@/lib/pdf-extract-text";
import { addHistoryEntry } from "@/lib/local-history";

export default function ExtractTextPage() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setText(null);
  }, []);

  const reset = () => {
    setFile(null);
    setError(null);
    setText(null);
    setProgress(null);
  };

  const handleExtract = async () => {
    if (!file) return;
    setError(null);
    setProgress("Reading pages…");
    try {
      const result = await extractTextFromPDF(file, (page, total) => {
        setProgress(`Reading page ${page} of ${total}…`);
      });
      setText(result);
      await addHistoryEntry({ tool: "Extract Text", fileName: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setProgress(null);
    }
  };

  // The text carries "--- Page n ---" markers, so look past them for real text.
  const hasText = !!text && text.replace(/^--- Page \d+ ---$/gm, "").trim().length > 0;

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked; the text is still selectable below
    }
  };

  return (
    <ToolLayout title="Extract Text" description="Pull all the text out of a PDF into a plain text file" icon={FileType} medium>
      <Steps>
        <Step n={1} title="Add a PDF" state={file ? "done" : "current"} summary={file && `${file.name} · ${formatSize(file.size)}`} onChange={reset}>
          <PdfDropzone onFiles={handleFiles} label="Drop the PDF to read" />
        </Step>

        <Step n={2} title="Extract" state={!file ? "todo" : text !== null ? "done" : "current"}>
          <EncryptedNotice file={file} />
          {progress && <Working>{progress}</Working>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={handleExtract} disabled={!!progress} className="w-full">
            <FileType className="h-4 w-4" /> Extract text
          </Button>
        </Step>

        <Step n={3} title="Save" state={text !== null ? "current" : "todo"}>
          {text !== null && file && (
            <>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground">
                {hasText ? text : "No text found. This is probably a scanned PDF, which holds pictures of text rather than text."}
              </pre>
              {!hasText && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setHandoff([file]);
                    router.push("/ocr");
                  }}
                >
                  <ScanText className="h-4 w-4" /> Make it searchable with OCR
                </Button>
              )}
              <ResultCard
                verb="Extracted"
                blob={new Blob([text], { type: "text/plain;charset=utf-8" })}
                fileName={file.name.replace(/\.pdf$/i, ".txt")}
                facts={[{ label: "Characters", value: text.length.toLocaleString() }]}
                actions={
                  <Button variant="outline" onClick={handleCopy}>
                    <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy"}
                  </Button>
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
