"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { FileOrderList } from "@/components/file-order-list";
import { ResultCard, formatSize } from "@/components/result-card";
import { ErrorNote, Step, Steps, Working } from "@/components/steps";
import { GitMerge } from "lucide-react";
import { mergePDFs } from "@/lib/pdf-merge";
import { addHistoryEntry } from "@/lib/local-history";

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const handleFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
    setResult(null);
  }, []);

  const reset = () => {
    setFiles([]);
    setError(null);
    setResult(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setWorking(true);
    setError(null);
    try {
      const bytes = await mergePDFs(files);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResult(blob);
      void addHistoryEntry({ tool: "Merge", fileName: `${files.length} files merged`, size: blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed.");
    } finally {
      setWorking(false);
    }
  };

  const total = files.reduce((n, f) => n + f.size, 0);

  return (
    <ToolLayout title="Merge PDF" description="Combine PDFs into one file, in the order you choose" icon={GitMerge} medium>
      <Steps>
        <Step
          n={1}
          title="Add and order PDFs"
          state={result ? "done" : "current"}
          summary={`${files.length} files · ${formatSize(total)}`}
          onChange={() => setResult(null)}
        >
          <PdfDropzone onFiles={handleFiles} multiple label={files.length ? "Add more PDFs" : "Drop the PDFs to combine"} />
          <FileOrderList files={files} onChange={setFiles} />
          {working && <Working>Merging…</Working>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={handleMerge} disabled={files.length < 2 || working} className="w-full">
            <GitMerge className="h-4 w-4" /> Merge {files.length > 0 ? `${files.length} PDFs` : "PDFs"}
          </Button>
          {files.length === 1 && <p className="text-center text-xs text-muted-foreground">Add at least one more PDF.</p>}
        </Step>

        <Step n={2} title="Save" state={result ? "current" : "todo"}>
          {result && (
            <ResultCard
              verb="Merged"
              blob={result}
              fileName="merged.pdf"
              facts={[{ label: "Files in", value: String(files.length) }]}
              onReset={reset}
              resetLabel="Merge others"
            />
          )}
        </Step>
      </Steps>
    </ToolLayout>
  );
}
