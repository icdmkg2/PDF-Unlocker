"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard, formatSize } from "@/components/result-card";
import { Choice, ErrorNote, Step, Steps, Working } from "@/components/steps";
import { Minimize2 } from "lucide-react";
import { compressPDF, type CompressQuality } from "@/lib/pdf-compress";
import { addHistoryEntry } from "@/lib/local-history";

const QUALITY_OPTIONS: { id: CompressQuality; label: string; desc: string; badge?: string }[] = [
  { id: "lossless", label: "Keep text", badge: "Recommended", desc: "Removes duplicate fonts and images, unused data. Text, links and forms stay." },
  { id: "screen", label: "Smallest", desc: "Pages become low-res images. For email and web." },
  { id: "ebook", label: "Balanced", desc: "Pages become medium-quality images." },
  { id: "print", label: "High quality", desc: "Pages become sharp images. Larger file." },
];

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<CompressQuality>("lossless");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setResult(null);
  }, []);

  const reset = () => {
    setFile(null);
    setError(null);
    setResult(null);
    setProgress(null);
  };

  const handleCompress = async () => {
    if (!file) return;
    setError(null);
    setProgress(quality === "lossless" ? "Optimizing (first run loads pdfcpu)…" : "Rendering pages…");
    try {
      const bytes = await compressPDF(file, quality, (page, total) => {
        setProgress(`Compressing page ${page} of ${total}…`);
      });
      setResult(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }));
      await addHistoryEntry({ tool: "Compress", fileName: file.name, size: bytes.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compression failed.");
    } finally {
      setProgress(null);
    }
  };

  const chosen = QUALITY_OPTIONS.find((o) => o.id === quality)!;
  const saved = result && file ? result.size < file.size : false;

  return (
    <ToolLayout title="Compress PDF" description="Shrink a PDF, keeping text by default" icon={Minimize2} medium>
      <Steps>
        <Step n={1} title="Add a PDF" state={file ? "done" : "current"} summary={file && `${file.name} · ${formatSize(file.size)}`} onChange={reset}>
          <PdfDropzone onFiles={handleFiles} label="Drop the PDF to shrink" />
        </Step>

        <Step
          n={2}
          title="Choose how small"
          state={!file ? "todo" : result ? "done" : "current"}
          summary={chosen.label}
          onChange={() => setResult(null)}
        >
          <EncryptedNotice file={file} />
          <Choice label="Compression level" options={QUALITY_OPTIONS} value={quality} onChange={setQuality} />
          {quality !== "lossless" && (
            <p className="rounded-lg border border-[#3d3420] bg-[#1a1610] px-3 py-2 text-xs leading-relaxed text-[#d4c4a0]">
              This mode turns every page into an image. Selectable text, links and form fields are removed. Scanned PDFs may not shrink.
            </p>
          )}
          {progress && <Working>{progress}</Working>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={handleCompress} disabled={!!progress} className="w-full">
            <Minimize2 className="h-4 w-4" /> Compress
          </Button>
        </Step>

        <Step n={3} title="Save" state={result ? "current" : "todo"}>
          {result && file && (
            <ResultCard
              verb={saved ? "Compressed" : "Already compact"}
              blob={result}
              fileName={file.name.replace(/\.pdf$/i, "") + "_compressed.pdf"}
              inputSize={file.size}
              note={saved ? undefined : "This mode couldn't make it smaller, so you get the original back unchanged. Try a smaller setting."}
              onReset={reset}
              resetLabel="Compress another"
            />
          )}
        </Step>
      </Steps>
    </ToolLayout>
  );
}
