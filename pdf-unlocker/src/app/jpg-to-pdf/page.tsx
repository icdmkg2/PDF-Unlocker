"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { FileOrderList } from "@/components/file-order-list";
import { ResultCard, formatSize } from "@/components/result-card";
import { Choice, ErrorNote, Step, Steps, Working } from "@/components/steps";
import { ImageIcon } from "lucide-react";
import { imagesToPDF, type ImagePageMode } from "@/lib/images-to-pdf";
import { addHistoryEntry } from "@/lib/local-history";

const PAGE_MODES: { id: ImagePageMode; label: string; desc: string }[] = [
  { id: "a4-fit", label: "A4, whole image", desc: "Each image fits inside an A4 page with margins." },
  { id: "a4-fill", label: "A4, edge to edge", desc: "Each image fills the A4 page; edges may be cut." },
  { id: "native", label: "Image size", desc: "Each page is exactly the size of its image." },
];

type Stage = "add" | "options" | "done";

export default function JpgToPdfPage() {
  const [images, setImages] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>("add");
  const [pageMode, setPageMode] = useState<ImagePageMode>("a4-fit");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setImages((prev) => [...prev, ...files]);
    setResult(null);
  }, []);

  const reset = () => {
    setImages([]);
    setStage("add");
    setError(null);
    setResult(null);
  };

  const handleConvert = async () => {
    if (!images.length) return;
    setWorking(true);
    setError(null);
    try {
      const bytes = await imagesToPDF(images, pageMode);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResult(blob);
      setStage("done");
      void addHistoryEntry({ tool: "JPG to PDF", fileName: `${images.length} images`, size: blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setWorking(false);
    }
  };

  const total = images.reduce((n, f) => n + f.size, 0);

  return (
    <ToolLayout title="JPG to PDF" description="Turn photos and images into one PDF" icon={ImageIcon} medium>
      <Steps>
        <Step
          n={1}
          title="Add and order images"
          state={stage === "add" ? "current" : "done"}
          summary={`${images.length} image${images.length === 1 ? "" : "s"} · ${formatSize(total)}`}
          onChange={() => setStage("add")}
        >
          <PdfDropzone kind="image" multiple onFiles={handleFiles} label={images.length ? "Add more images" : "Drop JPG or PNG images"} />
          <FileOrderList files={images} onChange={setImages} />
          <Button onClick={() => setStage("options")} disabled={!images.length} className="w-full">
            Continue
          </Button>
        </Step>

        <Step
          n={2}
          title="Choose page size"
          state={stage === "options" ? "current" : stage === "done" ? "done" : "todo"}
          summary={PAGE_MODES.find((m) => m.id === pageMode)?.label}
          onChange={() => setStage("options")}
        >
          <Choice label="Page size" options={PAGE_MODES} value={pageMode} onChange={setPageMode} />
          {working && <Working>Building the PDF…</Working>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={handleConvert} disabled={working} className="w-full">
            <ImageIcon className="h-4 w-4" /> Convert to PDF
          </Button>
        </Step>

        <Step n={3} title="Save" state={stage === "done" ? "current" : "todo"}>
          {result && stage === "done" && (
            <ResultCard
              verb="Converted"
              blob={result}
              fileName="images.pdf"
              facts={[{ label: "Images in", value: String(images.length) }]}
              inputSize={total}
              onReset={reset}
              resetLabel="Start over"
            />
          )}
        </Step>
      </Steps>
    </ToolLayout>
  );
}
