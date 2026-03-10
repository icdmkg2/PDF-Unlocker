"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { Globe, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function HtmlToPdfPage() {
  const [html, setHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleConvert = async () => {
    if (!html.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const html2canvas = (await import("html2canvas")).default;

      const div = document.createElement("div");
      div.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:white;padding:40px;box-sizing:border-box;";
      div.innerHTML = html;
      document.body.appendChild(div);

      const canvas = await html2canvas(div, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      document.body.removeChild(div);

      const imgData = canvas.toDataURL("image/png");
      const doc = await PDFDocument.create();

      // A4 in points: 595 × 842
      const A4W = 595;
      const A4H = 842;
      const imgW = canvas.width / 2;
      const imgH = canvas.height / 2;
      const scale = A4W / imgW;
      const scaledH = imgH * scale;

      // Split into multiple pages if needed
      const pageCount = Math.ceil(scaledH / A4H);
      const base64 = imgData.replace(/^data:image\/png;base64,/, "");
      const pngBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const embedded = await doc.embedPng(pngBytes);

      for (let p = 0; p < pageCount; p++) {
        const page = doc.addPage([A4W, A4H]);
        const srcY = (p * A4H) / scale;
        const srcH = Math.min(A4H / scale, imgH - srcY);
        page.drawImage(embedded, {
          x: 0,
          y: A4H - srcH * scale,
          width: A4W,
          height: srcH * scale,
        });
      }

      const bytes = await doc.save();
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "html.pdf";
    a.click();
  };

  const reset = () => {
    setHtml("");
    setError(null);
    setResultUrl(null);
  };

  return (
    <ToolLayout
      title="HTML to PDF"
      description="Convert HTML content to a PDF document"
      icon={Globe}
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="html-input">Paste HTML content</Label>
          <textarea
            id="html-input"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="<h1>Hello World</h1><p>Your HTML here...</p>"
            rows={12}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
          />
        </div>

        <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
          Supports inline styles and simple HTML. External stylesheets and images may not render correctly.
        </div>

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
              HTML converted to PDF!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download html.pdf
            </Button>
          </div>
        )}

        {!resultUrl ? (
          <Button onClick={handleConvert} disabled={!html.trim() || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Converting...</>
            ) : (
              <><Globe className="h-4 w-4 mr-2" /> Convert to PDF</>
            )}
          </Button>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Convert Another
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
