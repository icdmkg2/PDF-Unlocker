"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Crop, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cropPDF } from "@/lib/pdf-crop";

export default function CropPage() {
  const [file, setFile] = useState<File | null>(null);
  const [margins, setMargins] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [allPages, setAllPages] = useState(true);
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

  const setMargin = (key: keyof typeof margins, value: string) => {
    const num = parseFloat(value) || 0;
    setMargins((prev) => ({ ...prev, [key]: Math.max(0, num) }));
  };

  const handleCrop = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await cropPDF(file, margins, allPages ? "all" : []);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Crop failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `cropped_${file.name}`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setMargins({ top: 0, right: 0, bottom: 0, left: 0 });
    setAllPages(true);
    setError(null);
    setResultUrl(null);
  };

  return (
    <ToolLayout
      title="Crop PDF"
      description="Trim margins from PDF pages"
      icon={Crop}
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your PDF here"
        />

        {file && (
          <>
            <div className="space-y-3">
              <Label>Margins to remove (mm)</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["top", "right", "bottom", "left"] as const).map((side) => (
                  <div key={side} className="space-y-1">
                    <Label htmlFor={side} className="text-xs capitalize">{side}</Label>
                    <Input
                      id={side}
                      type="number"
                      min="0"
                      step="0.5"
                      value={margins[side]}
                      onChange={(e) => setMargin(side, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allPages"
                checked={allPages}
                onChange={(e) => setAllPages(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="allPages">Apply to all pages</Label>
            </div>
          </>
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
              PDF cropped successfully!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download cropped PDF
            </Button>
          </div>
        )}

        {!resultUrl ? (
          <Button onClick={handleCrop} disabled={!file || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cropping...</>
            ) : (
              <><Crop className="h-4 w-4 mr-2" /> Crop PDF</>
            )}
          </Button>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Crop Another PDF
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
