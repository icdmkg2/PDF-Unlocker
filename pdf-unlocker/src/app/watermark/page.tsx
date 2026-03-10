"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Droplets, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { addWatermark } from "@/lib/pdf-watermark";
import { cn } from "@/lib/utils";

const FONT_SIZES = [24, 36, 48, 72];

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(45);
  const [fontSize, setFontSize] = useState(48);
  const [tiled, setTiled] = useState(false);
  const [color, setColor] = useState("#888888");
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

  const handleWatermark = async () => {
    if (!file || !text.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await addWatermark(file, {
        text,
        opacity,
        fontSize,
        rotation,
        tiled,
        color: hexToRgb(color),
      });
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Watermark failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `watermarked_${file.name}`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setError(null);
    setResultUrl(null);
  };

  return (
    <ToolLayout
      title="Add Watermark"
      description="Overlay a text watermark on all PDF pages"
      icon={Droplets}
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
            <div className="space-y-1.5">
              <Label htmlFor="wm-text">Watermark text</Label>
              <Input
                id="wm-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. CONFIDENTIAL"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Font size</Label>
                <div className="flex gap-1.5">
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

              <div className="space-y-1.5">
                <Label>Style</Label>
                <div className="flex gap-1.5">
                  {[{ label: "Center", value: false }, { label: "Tile", value: true }].map(({ label, value }) => (
                    <button
                      key={label}
                      onClick={() => setTiled(value)}
                      className={cn(
                        "flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors",
                        tiled === value
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Opacity: {Math.round(opacity * 100)}%</Label>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Rotation: {rotation}°</Label>
              <input
                type="range"
                min="-90"
                max="90"
                step="5"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wm-color">Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="wm-color"
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
              Watermark added successfully!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download watermarked PDF
            </Button>
          </div>
        )}

        {!resultUrl ? (
          <Button onClick={handleWatermark} disabled={!file || !text.trim() || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding watermark...</>
            ) : (
              <><Droplets className="h-4 w-4 mr-2" /> Add Watermark</>
            )}
          </Button>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Watermark Another PDF
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
