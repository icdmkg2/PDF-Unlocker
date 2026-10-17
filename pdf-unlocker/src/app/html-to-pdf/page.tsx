"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { ResultCard } from "@/components/result-card";
import { ErrorNote, Step, Steps, Working } from "@/components/steps";
import { Globe } from "lucide-react";
import { dataUrlToBytes } from "@/lib/pdf-utils";
import { addHistoryEntry } from "@/lib/local-history";

export default function HtmlToPdfPage() {
  const [html, setHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

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
      setResult(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }));
      await addHistoryEntry({ tool: "HTML to PDF", fileName: "html.pdf", size: bytes.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setHtml("");
    setError(null);
    setResult(null);
  };

  return (
    <ToolLayout title="HTML to PDF" description="Paste HTML and render it as A4 pages" icon={Globe} medium>
      <Steps>
        <Step n={1} title="Paste HTML" state={result ? "done" : "current"} summary={`${html.length.toLocaleString()} characters`} onChange={() => setResult(null)}>
          <textarea
            id="html-input"
            aria-label="HTML to convert"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="<h1>Hello World</h1><p>Your HTML here...</p>"
            rows={12}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pages are rendered as images, so text in the PDF won&apos;t be selectable. Images and stylesheets from other sites may not load.
          </p>
          {isLoading && <Working>Rendering pages…</Working>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={handleConvert} disabled={!html.trim() || isLoading} className="w-full">
            <Globe className="h-4 w-4" /> Convert to PDF
          </Button>
        </Step>

        <Step n={2} title="Save" state={result ? "current" : "todo"}>
          {result && <ResultCard verb="Rendered" blob={result} fileName="page.pdf" onReset={reset} resetLabel="Convert more HTML" />}
        </Step>
      </Steps>
    </ToolLayout>
  );
}
