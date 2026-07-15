"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { Globe, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { dataUrlToBytes, revokeUrl } from "@/lib/pdf-utils";
import { addHistoryEntry } from "@/lib/local-history";

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
      div.style.cssText =
        "position:fixed;left:-9999px;top:0;width:794px;background:white;padding:40px;box-sizing:border-box;";
      div.innerHTML = html;
      document.body.appendChild(div);

      const canvas = await html2canvas(div, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      document.body.removeChild(div);

      const doc = await PDFDocument.create();
      const A4W = 595;
      const A4H = 842;
      // canvas is 2× CSS pixels; CSS width was 794px ≈ A4 at 96dpi
      const imgW = canvas.width / 2;
      const imgH = canvas.height / 2;
      const scale = A4W / imgW;
      const scaledH = imgH * scale;
      const pageCount = Math.max(1, Math.ceil(scaledH / A4H));

      for (let p = 0; p < pageCount; p++) {
        // Crop a slice of the full canvas for this page
        const srcYCss = (p * A4H) / scale;
        const srcHCss = Math.min(A4H / scale, imgH - srcYCss);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = Math.max(1, Math.round(srcHCss * 2));
        slice.getContext("2d")!.drawImage(
          canvas,
          0,
          Math.round(srcYCss * 2),
          canvas.width,
          slice.height,
          0,
          0,
          canvas.width,
          slice.height
        );

        const pngBytes = dataUrlToBytes(slice.toDataURL("image/png"));
        const embedded = await doc.embedPng(pngBytes as Uint8Array<ArrayBuffer>);
        const page = doc.addPage([A4W, A4H]);
        const drawH = srcHCss * scale;
        page.drawImage(embedded, {
          x: 0,
          y: A4H - drawH,
          width: A4W,
          height: drawH,
        });
      }

      const bytes = await doc.save();
      revokeUrl(resultUrl);
      setResultUrl(URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" })));
      await addHistoryEntry({ tool: "HTML to PDF", fileName: "html.pdf", size: bytes.length });
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
    revokeUrl(resultUrl);
    setResultUrl(null);
  };

  return (
    <ToolLayout
      title="HTML to PDF"
      description="Paste HTML and render it to a multi-page A4 PDF"
      icon={Globe}
      notice="Renders HTML as images (not selectable text). External CSS/images may not load due to browser CORS."
    >
      <div className="space-y-5">
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="<h1>Hello World</h1><p>Your HTML here...</p>"
          rows={12}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
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
              PDF ready
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </div>
        )}

        {!resultUrl ? (
          <Button onClick={handleConvert} disabled={!html.trim() || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Converting…</>
            ) : (
              <><Globe className="h-4 w-4 mr-2" /> Convert to PDF</>
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
