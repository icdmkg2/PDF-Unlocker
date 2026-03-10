"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { RotateCw, RotateCcw, Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { rotatePDF } from "@/lib/pdf-rotate";
import { PDFDocument } from "pdf-lib";
import { cn } from "@/lib/utils";

const ANGLES = [
  { label: "90° CW", value: 90 as const },
  { label: "180°", value: 180 as const },
  { label: "90° CCW", value: 270 as const },
];

export default function RotatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [allPages, setAllPages] = useState(true);
  const [pageRange, setPageRange] = useState("");
  const [angle, setAngle] = useState<90 | 180 | 270>(90);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setError(null);
    setResultUrl(null);
    try {
      const bytes = await f.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setPageCount(doc.getPageCount());
    } catch {
      setPageCount(null);
    }
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setPageCount(null);
    setError(null);
    setResultUrl(null);
  }, []);

  const handleRotate = async () => {
    if (!file || !pageCount) return;
    setIsLoading(true);
    setError(null);
    try {
      let indices: number[];
      if (allPages) {
        indices = Array.from({ length: pageCount }, (_, i) => i);
      } else {
        if (!pageRange.trim()) throw new Error("Please enter page numbers or ranges.");
        indices = parsePageList(pageRange, pageCount);
      }
      const bytes = await rotatePDF(file, indices, angle);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rotation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `rotated_${file.name}`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setPageCount(null);
    setPageRange("");
    setAllPages(true);
    setAngle(90);
    setError(null);
    setResultUrl(null);
  };

  return (
    <ToolLayout
      title="Rotate PDF"
      description="Rotate pages to the correct orientation"
      icon={RotateCw}
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your PDF here"
        />

        {pageCount !== null && (
          <p className="text-xs text-muted-foreground">
            Document has <strong className="text-foreground">{pageCount}</strong> pages
          </p>
        )}

        {file && (
          <>
            {/* Rotation angle */}
            <div className="space-y-1.5">
              <Label>Rotation</Label>
              <div className="flex gap-2">
                {ANGLES.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setAngle(a.value)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors",
                      angle === a.value
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pages */}
            <div className="space-y-3">
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

              {!allPages && (
                <div className="space-y-1.5">
                  <Label htmlFor="pages">Specific pages</Label>
                  <Input
                    id="pages"
                    placeholder={`e.g. 1, 3, 5-7`}
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                  />
                </div>
              )}
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
              Pages rotated successfully!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download rotated PDF
            </Button>
          </div>
        )}

        {!resultUrl ? (
          <Button onClick={handleRotate} disabled={!file || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rotating...</>
            ) : (
              <><RotateCw className="h-4 w-4 mr-2" /> Rotate PDF</>
            )}
          </Button>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Rotate Another PDF
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}

function parsePageList(input: string, total: number): number[] {
  const indices = new Set<number>();
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const match = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Invalid page: "${part}"`);
    const start = parseInt(match[1]);
    const end = match[2] ? parseInt(match[2]) : start;
    for (let i = start; i <= Math.min(end, total); i++) indices.add(i - 1);
  }
  return Array.from(indices);
}
