"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard } from "@/components/result-card";
import { ErrorNote, Working } from "@/components/steps";
import { LoadingPages, PageGrid, PanelField, PanelFile, Pills, Workbench, usePdfDoc } from "@/components/workbench";
import { Hash, SlidersHorizontal } from "lucide-react";
import { addPageNumbers, type PageNumberPosition, type PageNumberFormat } from "@/lib/pdf-page-numbers";
import { cn } from "@/lib/utils";
import { addHistoryEntry } from "@/lib/local-history";

const POSITIONS: { value: PageNumberPosition; label: string }[] = [
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
];

const FORMATS: { id: PageNumberFormat; label: string }[] = [
  { id: "number", label: "1" },
  { id: "page-n", label: "Page 1" },
  { id: "page-n-of-m", label: "Page 1 of N" },
];

const SIZES = [
  { id: 8, label: "Small" },
  { id: 10, label: "Medium" },
  { id: 14, label: "Large" },
];

function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
}

export default function PageNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const { doc, pageCount, loading, error: loadError } = usePdfDoc(file);
  const [position, setPosition] = useState<PageNumberPosition>("bottom-center");
  const [startFrom, setStartFrom] = useState(1);
  const [fontSize, setFontSize] = useState(10);
  const [color, setColor] = useState("#000000");
  const [format, setFormat] = useState<PageNumberFormat>("number");
  const [skipFirst, setSkipFirst] = useState(false);
  const [working, setWorking] = useState(false);
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
  };

  const labelFor = (i: number) => {
    const n = i + startFrom;
    const total = pageCount + startFrom - 1;
    return format === "page-n-of-m" ? `Page ${n} of ${total}` : format === "page-n" ? `Page ${n}` : String(n);
  };

  const handleAdd = async () => {
    if (!file) return;
    setWorking(true);
    setError(null);
    try {
      const bytes = await addPageNumbers(file, { position, startFrom, fontSize, color: hexToRgb(color), format, skipFirst });
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResult(blob);
      void addHistoryEntry({ tool: "Page numbers", fileName: file.name, size: blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add page numbers.");
    } finally {
      setWorking(false);
    }
  };

  const [vert, horiz] = position.split("-");

  return (
    <ToolLayout title="Page Numbers" description="Number every page; the preview shows where they land" icon={Hash} wide>
      {!file ? (
        <PdfDropzone onFiles={handleFiles} label="Drop the PDF to number" />
      ) : result ? (
        <ResultCard
          verb="Numbered"
          blob={result}
          fileName={file.name.replace(/\.pdf$/i, "") + "_numbered.pdf"}
          actions={
            <Button variant="outline" onClick={() => setResult(null)}>
              <SlidersHorizontal className="h-4 w-4" /> Adjust
            </Button>
          }
          onReset={reset}
          resetLabel="Number another"
        />
      ) : (
        <Workbench
          panel={
            <>
              <PanelFile file={file} pageCount={pageCount} onChange={reset} />
              <EncryptedNotice file={file} />
              <PanelField label="Position">
                <div role="radiogroup" aria-label="Position" className="grid grid-cols-3 gap-1.5 rounded-md border border-border bg-background p-1.5">
                  {POSITIONS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      role="radio"
                      aria-checked={position === p.value}
                      aria-label={p.label}
                      onClick={() => setPosition(p.value)}
                      className={cn(
                        "flex h-8 items-center rounded px-2",
                        p.value.endsWith("left") ? "justify-start" : p.value.endsWith("right") ? "justify-end" : "justify-center",
                        position === p.value ? "bg-primary/15" : "hover:bg-muted",
                        p.value.startsWith("bottom") && "mt-6"
                      )}
                    >
                      <span className={cn("h-1.5 w-4 rounded-full", position === p.value ? "bg-primary" : "bg-muted-foreground/40")} />
                    </button>
                  ))}
                </div>
              </PanelField>
              <PanelField label="Style">
                <Pills label="Number style" options={FORMATS} value={format} onChange={setFormat} />
                <Pills label="Size" options={SIZES} value={fontSize} onChange={setFontSize} />
              </PanelField>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startFrom" className="text-xs text-muted-foreground">Start at</Label>
                  <Input id="startFrom" type="number" min={1} value={startFrom} onChange={(e) => setStartFrom(Math.max(1, Number(e.target.value) || 1))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="color" className="text-xs text-muted-foreground">Color</Label>
                  <Input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="p-1" />
                </div>
              </div>
              <label htmlFor="skipFirst" className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input id="skipFirst" type="checkbox" checked={skipFirst} onChange={(e) => setSkipFirst(e.target.checked)} className="h-4 w-4 accent-[var(--paper)]" />
                Skip the cover page
              </label>
              {working && <Working>Adding numbers…</Working>}
              {(error || loadError) && <ErrorNote>{error || loadError}</ErrorNote>}
              <Button onClick={handleAdd} disabled={working || !doc} className="w-full">
                <Hash className="h-4 w-4" /> Add page numbers
              </Button>
            </>
          }
          header={doc && <span>Preview · {pageCount} pages</span>}
        >
          {loading || !doc ? (
            <LoadingPages />
          ) : (
            <PageGrid
              doc={doc}
              order={Array.from({ length: pageCount }, (_, i) => i)}
              overlayOf={(i) =>
                skipFirst && i === 0 ? null : (
                  <span
                    className={cn(
                      "absolute flex px-[9%]",
                      vert === "top" ? "top-[5%]" : "bottom-[5%]",
                      "inset-x-0",
                      horiz === "left" ? "justify-start" : horiz === "right" ? "justify-end" : "justify-center"
                    )}
                  >
                    <span
                      className="rounded-sm bg-amber-200/60 px-0.5 font-sans leading-none"
                      style={{ color, fontSize: `${Math.max(7, fontSize * 0.8)}px` }}
                    >
                      {labelFor(i)}
                    </span>
                  </span>
                )
              }
              labelOf={(i) => (skipFirst && i === 0 ? "cover, no number" : labelFor(i))}
            />
          )}
        </Workbench>
      )}
    </ToolLayout>
  );
}
