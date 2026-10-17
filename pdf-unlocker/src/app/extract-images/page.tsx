"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard, formatSize } from "@/components/result-card";
import { ErrorNote, Step, Steps, Working } from "@/components/steps";
import { ImageIcon } from "lucide-react";
import { extractImagesFromPDF, zipImages } from "@/lib/pdf-extract-images";
import { addHistoryEntry } from "@/lib/local-history";

const PREVIEWS = 12;

type Result = { zip: Blob | null; count: number; previews: { name: string; url: string }[] };

export default function ExtractImagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const clear = (r: Result | null) => r?.previews.forEach((p) => URL.revokeObjectURL(p.url));

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setResult((r) => (clear(r), null));
  }, []);

  const reset = () => {
    clear(result);
    setFile(null);
    setError(null);
    setResult(null);
  };

  const handleExtract = async () => {
    if (!file) return;
    setWorking(true);
    setError(null);
    try {
      const images = await extractImagesFromPDF(file);
      const previews = images.slice(0, PREVIEWS).map((img) => ({
        name: img.name,
        url: URL.createObjectURL(new Blob([img.bytes as Uint8Array<ArrayBuffer>])),
      }));
      setResult({ zip: images.length ? await zipImages(images) : null, count: images.length, previews });
      await addHistoryEntry({ tool: "Extract Images", fileName: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <ToolLayout
      title="Extract Images"
      description="Save the photos and graphics inside a PDF, in their original quality"
      icon={ImageIcon}
      medium
    >
      <Steps>
        <Step n={1} title="Add a PDF" state={file ? "done" : "current"} summary={file && `${file.name} · ${formatSize(file.size)}`} onChange={reset}>
          <PdfDropzone onFiles={handleFiles} label="Drop the PDF with images" />
        </Step>

        <Step n={2} title="Extract" state={!file ? "todo" : result ? "done" : "current"}>
          <EncryptedNotice file={file} />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Images are copied out as stored in the file, without re-rendering. To save whole pages as pictures, use{" "}
            <Link href="/pdf-to-jpg" className="underline underline-offset-2 hover:text-foreground">PDF to JPG</Link>.
          </p>
          {working && <Working>Reading embedded images (first run loads pdfcpu)…</Working>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={handleExtract} disabled={working} className="w-full">
            <ImageIcon className="h-4 w-4" /> Extract Images
          </Button>
        </Step>

        <Step n={3} title="Save" state={result ? "current" : "todo"}>
          {result && file && (
            result.zip ? (
              <>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Preview of extracted images">
                  {result.previews.map((p) => (
                    <li key={p.name} className="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-border bg-[#e9e6e0]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={p.name} className="max-h-full max-w-full object-contain" />
                    </li>
                  ))}
                </ul>
                <ResultCard
                  verb={result.count === 1 ? "1 image found" : `${result.count} images found`}
                  blob={result.zip}
                  fileName={file.name.replace(/\.pdf$/i, "_images.zip")}
                  facts={[{ label: "Images", value: String(result.count) }]}
                  onReset={reset}
                  resetLabel="Start Over"
                />
              </>
            ) : (
              <div className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                <p>
                  This PDF has no embedded images. Its pages are text or vector drawings. Use{" "}
                  <Link href="/pdf-to-jpg" className="text-foreground underline underline-offset-2">PDF to JPG</Link>{" "}
                  to save the pages as pictures.
                </p>
                <Button variant="outline" onClick={reset}>Start Over</Button>
              </div>
            )
          )}
        </Step>
      </Steps>
    </ToolLayout>
  );
}
