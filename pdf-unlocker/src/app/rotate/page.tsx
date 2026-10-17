"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard } from "@/components/result-card";
import { ErrorNote, Working } from "@/components/steps";
import { LoadingPages, PageGrid, PanelField, PanelFile, SelectionControls, Workbench, usePdfDoc } from "@/components/workbench";
import { RotateCw, RotateCcw, Undo2, SlidersHorizontal } from "lucide-react";
import { rotatePagesBy } from "@/lib/pdf-rotate";
import { addHistoryEntry } from "@/lib/local-history";

export default function RotatePage() {
  const [file, setFile] = useState<File | null>(null);
  const { doc, pageCount, loading, error: loadError } = usePdfDoc(file);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [turns, setTurns] = useState<Record<number, number>>({});
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setSelected(new Set());
    setTurns({});
    setError(null);
    setResult(null);
  }, []);

  const reset = () => {
    setFile(null);
    setSelected(new Set());
    setTurns({});
    setError(null);
    setResult(null);
  };

  /** Turn the selected pages, or every page when none are selected. */
  const turn = (deg: number) => {
    const targets = selected.size ? [...selected] : Array.from({ length: pageCount }, (_, i) => i);
    setTurns((prev) => {
      const next = { ...prev };
      for (const i of targets) next[i] = (next[i] ?? 0) + deg;
      return next;
    });
  };

  const changed = Object.values(turns).filter((t) => t % 360 !== 0).length;

  const handleSave = async () => {
    if (!file) return;
    setWorking(true);
    setError(null);
    try {
      const bytes = await rotatePagesBy(file, turns);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResult(blob);
      void addHistoryEntry({ tool: "Rotate", fileName: file.name, size: blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rotation failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <ToolLayout title="Rotate PDF" description="Pick pages and turn them; you see the result before saving" icon={RotateCw} wide>
      {!file ? (
        <PdfDropzone onFiles={handleFiles} label="Drop the PDF to rotate" />
      ) : result ? (
        <ResultCard
          verb="Rotated"
          blob={result}
          fileName={file.name.replace(/\.pdf$/i, "") + "_rotated.pdf"}
          facts={[{ label: "Pages turned", value: String(changed) }]}
          actions={
            <Button variant="outline" onClick={() => setResult(null)}>
              <SlidersHorizontal className="h-4 w-4" /> Adjust
            </Button>
          }
          onReset={reset}
          resetLabel="Rotate another"
        />
      ) : (
        <Workbench
          panel={
            <>
              <PanelFile file={file} pageCount={pageCount} onChange={reset} />
              <EncryptedNotice file={file} />
              <PanelField label={selected.size ? `Turn ${selected.size} selected page${selected.size === 1 ? "" : "s"}` : "Turn all pages"}>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => turn(-90)} aria-label="Turn left 90 degrees">
                    <RotateCcw className="h-4 w-4" /> 90°
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => turn(90)} aria-label="Turn right 90 degrees">
                    <RotateCw className="h-4 w-4" /> 90°
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => turn(180)} aria-label="Turn 180 degrees">
                    180°
                  </Button>
                </div>
              </PanelField>
              {changed > 0 && (
                <button type="button" onClick={() => setTurns({})} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <Undo2 className="h-3.5 w-3.5" /> Undo all turns
                </button>
              )}
              {working && <Working>Saving…</Working>}
              {(error || loadError) && <ErrorNote>{error || loadError}</ErrorNote>}
              <Button onClick={handleSave} disabled={!changed || working} className="w-full">
                Save rotated PDF
              </Button>
              {!changed && <p className="text-center text-xs text-muted-foreground">Turn at least one page first.</p>}
            </>
          }
          header={doc && <SelectionControls count={pageCount} selected={selected} onSelect={setSelected} />}
        >
          {loading || !doc ? (
            <LoadingPages />
          ) : (
            <PageGrid
              doc={doc}
              order={Array.from({ length: pageCount }, (_, i) => i)}
              selected={selected}
              onSelect={setSelected}
              rotationOf={(i) => turns[i] ?? 0}
            />
          )}
        </Workbench>
      )}
    </ToolLayout>
  );
}
