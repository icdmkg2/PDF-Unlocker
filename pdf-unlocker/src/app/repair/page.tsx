"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { ResultCard, formatSize } from "@/components/result-card";
import { ErrorNote, Step, Steps, Working } from "@/components/steps";
import { Wrench } from "lucide-react";
import { repairPDF, type RepairResult } from "@/lib/pdf-repair";
import { addHistoryEntry } from "@/lib/local-history";

export default function RepairPage() {
  const [file, setFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; info: RepairResult } | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setResult(null);
  }, []);

  const reset = () => {
    setFile(null);
    setError(null);
    setResult(null);
  };

  const handleRepair = async () => {
    if (!file) return;
    setWorking(true);
    setError(null);
    try {
      const info = await repairPDF(file);
      setResult({ blob: new Blob([info.bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), info });
      await addHistoryEntry({ tool: "Repair", fileName: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Repair failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <ToolLayout title="Repair PDF" description="Rebuild a PDF's structure so other apps can open it" icon={Wrench} medium>
      <Steps>
        <Step n={1} title="Add a PDF" state={file ? "done" : "current"} summary={file && `${file.name} · ${formatSize(file.size)}`} onChange={reset}>
          <PdfDropzone onFiles={handleFiles} label="Drop the PDF that won't open properly" />
        </Step>

        <Step n={2} title="Rebuild it" state={!file ? "todo" : result ? "done" : "current"} summary={result && `via ${result.info.method}`}>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Repair rewrites the file&apos;s internal structure, falling back to pdfcpu if needed. It can&apos;t recover
            every damaged file, and a clean rebuild doesn&apos;t guarantee every original error is gone.
          </p>
          {working && <Working>Rebuilding…</Working>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={handleRepair} disabled={working} className="w-full">
            <Wrench className="h-4 w-4" /> Repair
          </Button>
        </Step>

        <Step n={3} title="Save" state={result ? "current" : "todo"}>
          {result && file && (
            <ResultCard
              verb="Rebuilt"
              blob={result.blob}
              fileName={file.name.replace(/\.pdf$/i, "") + "_repaired.pdf"}
              inputSize={file.size}
              note={
                result.info.notes.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-4">
                    {result.info.notes.map((n) => <li key={n}>{n}</li>)}
                  </ul>
                )
              }
              onReset={reset}
              resetLabel="Repair another"
            />
          )}
        </Step>
      </Steps>
    </ToolLayout>
  );
}
