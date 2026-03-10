"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Images, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function PdfToJpgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [rangeInput, setRangeInput] = useState("");
  const [allPages, setAllPages] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setError(null);
    setDone(false);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const bytes = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      setPageCount(pdf.numPages);
    } catch {
      setPageCount(null);
    }
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setPageCount(null);
    setError(null);
    setDone(false);
  }, []);

  const handleExport = async () => {
    if (!file || !pageCount) return;
    setIsLoading(true);
    setError(null);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const bytes = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

      let indices: number[];
      if (allPages) {
        indices = Array.from({ length: pageCount }, (_, i) => i + 1);
      } else {
        indices = parsePageList(rangeInput, pageCount);
      }

      if (indices.length === 1) {
        const page = await pdf.getPage(indices[0]);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, canvas, viewport }).promise;
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${file.name.replace(/\.pdf$/i, "")}_page${indices[0]}.jpg`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, "image/jpeg", 0.92);
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const pageNum of indices) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d")!, canvas, viewport }).promise;
          const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.92));
          zip.file(`page${pageNum}.jpg`, blob);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${file.name.replace(/\.pdf$/i, "")}_pages.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPageCount(null);
    setRangeInput("");
    setAllPages(true);
    setError(null);
    setDone(false);
  };

  return (
    <ToolLayout
      title="PDF to JPG"
      description="Export PDF pages as JPEG images"
      icon={Images}
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

        {file && pageCount && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allPages"
                checked={allPages}
                onChange={(e) => setAllPages(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="allPages">Export all pages</Label>
            </div>

            {!allPages && (
              <div className="space-y-1.5">
                <Label htmlFor="ranges">Page range</Label>
                <Input
                  id="ranges"
                  placeholder={`e.g. 1-3, 5`}
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Multiple pages will be downloaded as a ZIP file
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {done && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Export complete! Check your downloads folder.
          </div>
        )}

        {!done ? (
          <Button onClick={handleExport} disabled={!file || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exporting...</>
            ) : (
              <><Images className="h-4 w-4 mr-2" /> Export as JPG</>
            )}
          </Button>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Export Another PDF
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
    for (let i = start; i <= Math.min(end, total); i++) indices.add(i);
  }
  return Array.from(indices);
}
