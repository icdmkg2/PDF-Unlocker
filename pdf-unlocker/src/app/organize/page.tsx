"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard } from "@/components/result-card";
import { ErrorNote, Working } from "@/components/steps";
import { LoadingPages, PageGrid, PanelField, PanelFile, Workbench, usePdfDoc } from "@/components/workbench";
import { LayoutGrid, SlidersHorizontal, Trash2, ArrowDownUp, Undo2 } from "lucide-react";
import { reorderPages } from "@/lib/pdf-organize";
import { addHistoryEntry } from "@/lib/local-history";

export default function OrganizePage() {
  const [file, setFile] = useState<File | null>(null);
  const { doc, pageCount, loading, error: loadError } = usePdfDoc(file);
  const [order, setOrder] = useState<number[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const original = Array.from({ length: pageCount }, (_, i) => i);
  const current = order ?? original;
  const edited = order !== null && (order.length !== pageCount || order.some((p, i) => p !== i));

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setOrder(null);
    setSelected(new Set());
    setError(null);
    setResult(null);
  }, []);

  const reset = () => {
    setFile(null);
    setOrder(null);
    setSelected(new Set());
    setError(null);
    setResult(null);
  };

  const move = (from: number, to: number) => {
    const next = [...current];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrder(next);
  };

  const deleteSelected = () => {
    setOrder(current.filter((p) => !selected.has(p)));
    setSelected(new Set());
  };

  const handleSave = async () => {
    if (!file || !current.length) return;
    setWorking(true);
    setError(null);
    try {
      const bytes = await reorderPages(file, current);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResult(blob);
      void addHistoryEntry({ tool: "Organize", fileName: file.name, size: blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorganize pages.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <ToolLayout title="Organize PDF" description="Drag pages into a new order and remove the ones you don't need" icon={LayoutGrid} wide>
      {!file ? (
        <PdfDropzone onFiles={handleFiles} label="Drop the PDF to reorganize" />
      ) : result ? (
        <ResultCard
          verb="Reorganized"
          blob={result}
          fileName={file.name.replace(/\.pdf$/i, "") + "_organized.pdf"}
          facts={[{ label: "Removed", value: String(pageCount - current.length) }]}
          inputSize={file.size}
          actions={
            <Button variant="outline" onClick={() => setResult(null)}>
              <SlidersHorizontal className="h-4 w-4" /> Adjust
            </Button>
          }
          onReset={reset}
          resetLabel="Organize another"
        />
      ) : (
        <Workbench
          panel={
            <>
              <PanelFile file={file} pageCount={pageCount} onChange={reset} />
              <EncryptedNotice file={file} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Drag pages to reorder. Hover a page and press × to remove it, or select several and delete them together.
              </p>
              <PanelField label="Change">
                <div className="grid gap-1.5">
                  <Button variant="outline" size="sm" onClick={deleteSelected} disabled={!selected.size}>
                    <Trash2 className="h-4 w-4" /> Delete {selected.size || ""} selected
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setOrder([...current].reverse())}>
                    <ArrowDownUp className="h-4 w-4" /> Reverse order
                  </Button>
                </div>
              </PanelField>
              {edited && (
                <button type="button" onClick={() => setOrder(null)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <Undo2 className="h-3.5 w-3.5" /> Back to original order
                </button>
              )}
              {working && <Working>Saving…</Working>}
              {(error || loadError) && <ErrorNote>{error || loadError}</ErrorNote>}
              <Button onClick={handleSave} disabled={!edited || !current.length || working} className="w-full">
                Save {current.length} page{current.length === 1 ? "" : "s"}
              </Button>
            </>
          }
          header={
            doc && (
              <>
                <span>{current.length} of {pageCount} pages · Numbers show the original position</span>
                {selected.size > 0 && (
                  <button type="button" className="underline-offset-4 hover:text-foreground hover:underline" onClick={() => setSelected(new Set())}>
                    Clear selection
                  </button>
                )}
              </>
            )
          }
        >
          {loading || !doc ? (
            <LoadingPages />
          ) : (
            <PageGrid
              doc={doc}
              order={current}
              selected={selected}
              onSelect={setSelected}
              onMove={move}
              onDelete={(position) => setOrder(current.filter((_, i) => i !== position))}
            />
          )}
        </Workbench>
      )}
    </ToolLayout>
  );
}
