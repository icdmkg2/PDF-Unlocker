"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Wrench, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { repairPDF } from "@/lib/pdf-repair";
import { revokeUrl } from "@/lib/pdf-utils";
import { addHistoryEntry } from "@/lib/local-history";

export default function RepairPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [method, setMethod] = useState<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    revokeUrl(resultUrl);
    setFile(files[0]);
    setError(null);
    setResultUrl(null);
    setNotes([]);
    setMethod(null);
  }, [resultUrl]);

  const handleRemove = useCallback(() => {
    revokeUrl(resultUrl);
    setFile(null);
    setError(null);
    setResultUrl(null);
    setNotes([]);
    setMethod(null);
  }, [resultUrl]);

  const handleRepair = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await repairPDF(file);
      revokeUrl(resultUrl);
      setResultUrl(URL.createObjectURL(new Blob([result.bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" })));
      setNotes(result.notes);
      setMethod(result.method);
      await addHistoryEntry({ tool: "Repair", fileName: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Repair failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `repaired_${file.name}`;
    a.click();
  };

  return (
    <ToolLayout
      title="Repair PDF"
      description="Rebuild PDF structure for better compatibility"
      icon={Wrench}
      notice="Repair re-serializes the PDF (and may run pdfcpu optimize). It cannot recover every corrupted file. Success means a cleaner structure - not necessarily that every original error was fixed."
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your PDF here"
        />

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
              Rebuilt via {method}
            </div>
            {notes.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download repaired PDF
            </Button>
          </div>
        )}

        {!resultUrl ? (
          <Button onClick={handleRepair} disabled={!file || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Repairing...</>
            ) : (
              <><Wrench className="h-4 w-4 mr-2" /> Repair PDF</>
            )}
          </Button>
        ) : (
          <Button onClick={handleRemove} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Repair Another PDF
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
