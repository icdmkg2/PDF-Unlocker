"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard } from "@/components/result-card";
import { ErrorNote, Working } from "@/components/steps";
import { LoadingPages, PageGrid, PanelField, PanelFile, Pills, SelectionControls, Workbench, usePdfDoc } from "@/components/workbench";
import { Scissors, SlidersHorizontal, Download } from "lucide-react";
import { splitPDF, splitToZip, planParts, type SplitMode as Mode } from "@/lib/pdf-split";
import { downloadBlob } from "@/lib/pdf-utils";
import { addHistoryEntry } from "@/lib/local-history";


const MODES: { id: Mode; label: string }[] = [
  { id: "extract", label: "Pull out pages" },
  { id: "cut", label: "Cut into parts" },
  { id: "each", label: "Every page" },
  { id: "ranges", label: "Type ranges" },
];

const HINT: Record<Mode, string> = {
  extract: "Select the pages you want. They become one new PDF.",
  cut: "Select the pages where a new part should start. Each part becomes its own PDF.",
  each: "Every page becomes its own PDF, delivered as a ZIP.",
  ranges: "Each comma-separated range becomes its own PDF, e.g. 1-3, 5, 8-10.",
};

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const { doc, pageCount, loading, error: loadError } = usePdfDoc(file);
  const [mode, setMode] = useState<Mode>("extract");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [ranges, setRanges] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; parts: { name: string; bytes: Uint8Array }[] } | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setSelected(new Set());
    setRanges("");
    setError(null);
    setResult(null);
  }, []);

  const reset = () => {
    setFile(null);
    setSelected(new Set());
    setRanges("");
    setError(null);
    setResult(null);
  };

  let parts: number[][] = [];
  let planError: string | null = null;
  try {
    parts = planParts(mode, pageCount, selected, ranges);
  } catch (err) {
    planError = err instanceof Error ? err.message : "Check the page ranges.";
  }
  const partOf = new Map<number, number>();
  parts.forEach((p, n) => p.forEach((i) => partOf.set(i, n + 1)));

  const handleSplit = async () => {
    if (!file || !parts.length) return;
    setWorking(true);
    setError(null);
    try {
      const out = await splitPDF(file, parts);
      const blob =
        out.length === 1
          ? new Blob([out[0].bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" })
          : await splitToZip(out);
      setResult({ blob, parts: out });
      await addHistoryEntry({ tool: "Split", fileName: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Split failed.");
    } finally {
      setWorking(false);
    }
  };

  const base = file?.name.replace(/\.pdf$/i, "") ?? "split";
  const usesSelection = mode === "extract" || mode === "cut";

  return (
    <ToolLayout title="Split PDF" description="Pull pages out of a PDF or cut it into several files" icon={Scissors} wide>
      {!file ? (
        <PdfDropzone onFiles={handleFiles} label="Drop the PDF to split" />
      ) : result ? (
        <ResultCard
          verb={result.parts.length === 1 ? "Pages pulled out" : `Split into ${result.parts.length} files`}
          blob={result.blob}
          fileName={result.parts.length === 1 ? `${base}_${result.parts[0].name}` : `${base}_split.zip`}
          facts={[{ label: "Files", value: String(result.parts.length) }]}
          note={result.parts.length > 1 && `Inside the ZIP: ${result.parts.map((p) => p.name).join(", ")}`}
          actions={
            <>
              {result.parts.length > 1 && (
                <Button
                  variant="outline"
                  onClick={() =>
                    result.parts.forEach((p) =>
                      downloadBlob(new Blob([p.bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), `${base}_${p.name}`)
                    )
                  }
                >
                  <Download className="h-4 w-4" /> Each file
                </Button>
              )}
              <Button variant="outline" onClick={() => setResult(null)}>
                <SlidersHorizontal className="h-4 w-4" /> Adjust
              </Button>
            </>
          }
          onReset={reset}
          resetLabel="Split another"
        />
      ) : (
        <Workbench
          panel={
            <>
              <PanelFile file={file} pageCount={pageCount} onChange={reset} />
              <EncryptedNotice file={file} />
              <PanelField label="How to split">
                <Pills label="How to split" options={MODES} value={mode} onChange={setMode} />
                <p className="text-xs leading-relaxed text-muted-foreground">{HINT[mode]}</p>
              </PanelField>
              {mode === "ranges" && (
                <Input id="ranges" aria-label="Page ranges" placeholder={`1-3, 5, 7-${pageCount || 9}`} value={ranges} onChange={(e) => setRanges(e.target.value)} />
              )}
              {working && <Working>Splitting…</Working>}
              {(error || planError || loadError) && <ErrorNote>{error || planError || loadError}</ErrorNote>}
              <Button onClick={handleSplit} disabled={!parts.length || working} className="w-full">
                <Scissors className="h-4 w-4" />
                {parts.length > 1 ? `Make ${parts.length} files` : parts.length === 1 ? `Save ${parts[0].length} page${parts[0].length === 1 ? "" : "s"}` : "Split"}
              </Button>
            </>
          }
          header={doc && usesSelection && <SelectionControls count={pageCount} selected={selected} onSelect={setSelected} />}
        >
          {loading || !doc ? (
            <LoadingPages />
          ) : (
            <PageGrid
              doc={doc}
              order={Array.from({ length: pageCount }, (_, i) => i)}
              selected={usesSelection ? selected : undefined}
              onSelect={usesSelection ? setSelected : undefined}
              overlayOf={(i) =>
                mode === "cut" && selected.has(i) && i > 0 ? (
                  <span className="absolute -left-2.5 top-0 flex h-full items-center">
                    <span className="h-full w-0.5 rounded bg-primary" />
                  </span>
                ) : mode === "extract" && selected.size > 0 && !selected.has(i) ? (
                  <span className="absolute inset-0 rounded-[2px] bg-background/60" />
                ) : null
              }
              labelOf={(i) => (partOf.has(i) && parts.length > 1 ? `${i + 1} · file ${partOf.get(i)}` : i + 1)}
            />
          )}
        </Workbench>
      )}
    </ToolLayout>
  );
}
