"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Wrench, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { repairPDF } from "@/lib/pdf-repair";

export default function RepairPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setResultUrl(null);
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setError(null);
    setResultUrl(null);
  }, []);

  const handleRepair = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await repairPDF(file);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
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

  const reset = () => {
    setFile(null);
    setError(null);
    setResultUrl(null);
  };

  return (
    <ToolLayout
      title="Repair PDF"
      description="Fix corrupted or damaged PDF files"
      icon={Wrench}
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
              PDF repaired successfully!
            </div>
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
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Repair Another PDF
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
