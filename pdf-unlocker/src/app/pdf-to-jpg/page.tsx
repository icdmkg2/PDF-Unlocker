"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard } from "@/components/result-card";
import { ErrorNote, Working } from "@/components/steps";
import { LoadingPages, PageGrid, PanelField, PanelFile, Pills, SelectionControls, Workbench, usePdfDoc } from "@/components/workbench";
import { Images, SlidersHorizontal } from "lucide-react";
import { addHistoryEntry } from "@/lib/local-history";

const QUALITY = [
  { id: 1, label: "Screen" },
  { id: 2, label: "Sharp" },
  { id: 3, label: "Print" },
];

export default function PdfToJpgPage() {
  const [file, setFile] = useState<File | null>(null);
  const { doc, pageCount, loading, error: loadError } = usePdfDoc(file);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scale, setScale] = useState(2);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; name: string; count: number } | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setSelected(new Set());
    setError(null);
    setResult(null);
  }, []);

  const reset = () => {
    setFile(null);
    setSelected(new Set());
    setError(null);
    setResult(null);
  };

  // No selection means every page.
  const pages = selected.size ? [...selected].sort((a, b) => a - b) : Array.from({ length: pageCount }, (_, i) => i);

  const handleExport = async () => {
    if (!file || !doc) return;
    setError(null);
    try {
      const base = file.name.replace(/\.pdf$/i, "");
      const images: { name: string; blob: Blob }[] = [];
      for (const [n, i] of pages.entries()) {
        setProgress(`Rendering page ${i + 1} (${n + 1} of ${pages.length})…`);
        const page = await doc.getPage(i + 1);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        await page.render({ canvasContext: canvas.getContext("2d")!, canvas, viewport }).promise;
        const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't encode the image."))), "image/jpeg", 0.92));
        images.push({ name: `${base}_page${String(i + 1).padStart(3, "0")}.jpg`, blob });
      }
      let out: { blob: Blob; name: string };
      if (images.length === 1) {
        out = images[0];
      } else {
        setProgress("Packing ZIP…");
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const img of images) zip.file(img.name, img.blob);
        out = { blob: await zip.generateAsync({ type: "blob" }), name: `${base}_pages.zip` };
      }
      setResult({ ...out, count: images.length });
      void addHistoryEntry({ tool: "PDF to JPG", fileName: file.name, size: out.blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setProgress(null);
    }
  };

  return (
    <ToolLayout title="PDF to JPG" description="Save pages as JPG images; pick which pages, or take them all" icon={Images} wide>
      {!file ? (
        <PdfDropzone onFiles={handleFiles} label="Drop the PDF to turn into images" />
      ) : result ? (
        <ResultCard
          verb={result.count === 1 ? "1 image saved" : `${result.count} images saved`}
          blob={result.blob}
          fileName={result.name}
          facts={[{ label: "Images", value: String(result.count) }]}
          actions={
            <Button variant="outline" onClick={() => setResult(null)}>
              <SlidersHorizontal className="h-4 w-4" /> Adjust
            </Button>
          }
          onReset={reset}
          resetLabel="Convert another"
        />
      ) : (
        <Workbench
          panel={
            <>
              <PanelFile file={file} pageCount={pageCount} onChange={reset} />
              <EncryptedNotice file={file} />
              <PanelField label="Quality">
                <Pills label="Image quality" options={QUALITY} value={scale} onChange={setScale} />
                <p className="text-xs text-muted-foreground">
                  {scale === 1 ? "About 72 dpi. Small files for screens." : scale === 2 ? "About 144 dpi. Good for most uses." : "About 216 dpi. Large files for printing."}
                </p>
              </PanelField>
              {progress && <Working>{progress}</Working>}
              {(error || loadError) && <ErrorNote>{error || loadError}</ErrorNote>}
              <Button onClick={handleExport} disabled={!doc || !!progress} className="w-full">
                <Images className="h-4 w-4" />
                {selected.size ? `Save ${pages.length} page${pages.length === 1 ? "" : "s"} as JPG` : `Save all ${pageCount} pages as JPG`}
              </Button>
              <p className="text-center text-xs text-muted-foreground">More than one page arrives as a ZIP.</p>
            </>
          }
          header={doc && <SelectionControls count={pageCount} selected={selected} onSelect={setSelected} />}
        >
          {loading || !doc ? (
            <LoadingPages />
          ) : (
            <PageGrid doc={doc} order={Array.from({ length: pageCount }, (_, i) => i)} selected={selected} onSelect={setSelected} />
          )}
        </Workbench>
      )}
    </ToolLayout>
  );
}
