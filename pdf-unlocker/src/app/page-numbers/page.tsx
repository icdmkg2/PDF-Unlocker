"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Hash, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { addPageNumbers, type PageNumberPosition } from "@/lib/pdf-page-numbers";
import { cn } from "@/lib/utils";

const POSITIONS: { label: string; value: PageNumberPosition; col: number; row: number }[] = [
  { label: "TL", value: "top-left", col: 1, row: 1 },
  { label: "TC", value: "top-center", col: 2, row: 1 },
  { label: "TR", value: "top-right", col: 3, row: 1 },
  { label: "BL", value: "bottom-left", col: 1, row: 2 },
  { label: "BC", value: "bottom-center", col: 2, row: 2 },
  { label: "BR", value: "bottom-right", col: 3, row: 2 },
];

const FONT_SIZES = [8, 10, 12, 14];

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export default function PageNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<PageNumberPosition>("bottom-center");
  const [startFrom, setStartFrom] = useState(1);
  const [fontSize, setFontSize] = useState(10);
  const [color, setColor] = useState("#000000");
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

  const handleAdd = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await addPageNumbers(file, {
        position,
        startFrom,
        fontSize,
        color: hexToRgb(color),
      });
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add page numbers.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `numbered_${file.name}`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setError(null);
    setResultUrl(null);
  };

  return (
    <ToolLayout
      title="Page Numbers"
      description="Add page numbers to your PDF at any position"
      icon={Hash}
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
            <div className="space-y-2">
              <Label>Position</Label>
              <div className="grid grid-cols-3 gap-1.5 max-w-[200px]">
                {POSITIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setPosition(value)}
                    className={cn(
                      "py-2 rounded-md border text-xs font-medium transition-colors",
                      position === value
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startFrom">Start from</Label>
                <Input
                  id="startFrom"
                  type="number"
                  min="0"
                  value={startFrom}
                  onChange={(e) => setStartFrom(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Font size</Label>
                <div className="flex gap-1">
                  {FONT_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setFontSize(s)}
                      className={cn(
                        "flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors",
                        fontSize === s
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pn-color">Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="pn-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-16 rounded border border-border cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">{color}</span>
              </div>
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
              Page numbers added!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download numbered PDF
            </Button>
          </div>
        )}

        {!resultUrl ? (
          <Button onClick={handleAdd} disabled={!file || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding numbers...</>
            ) : (
              <><Hash className="h-4 w-4 mr-2" /> Add Page Numbers</>
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
