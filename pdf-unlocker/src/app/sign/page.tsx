"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard } from "@/components/result-card";
import { ErrorNote } from "@/components/steps";
import { usePdfDoc } from "@/components/workbench";
import { DockDivider, DockItem, PageCanvas, Viewer, type PageBox } from "@/components/viewer";
import { SignaturePad, type Signature } from "@/components/signature-pad";
import { PenLine, Loader2, SlidersHorizontal, Pencil } from "lucide-react";
import { signPDF } from "@/lib/pdf-sign";
import { addHistoryEntry } from "@/lib/local-history";

/** Where the signature sits, in PDF points measured from the page's top-left. */
interface Placement {
  page: number;
  x: number;
  y: number;
  width: number;
}

export default function SignPage() {
  const [file, setFile] = useState<File | null>(null);
  const { doc, pageCount } = usePdfDoc(file);
  const [page, setPage] = useState(0);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const drag = useRef<{ startX: number; startY: number; x: number; y: number; k: number; box: PageBox } | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setPage(0);
    setPlacement(null);
    setError(null);
    setResult(null);
  }, []);

  const reset = () => {
    setFile(null);
    setPlacement(null);
    setError(null);
    setResult(null);
  };

  /** Once a signature exists, drop it near the bottom right of the page in view, where signatures usually go. */
  const placeDefault = (box: PageBox) => {
    if (!signature || placement) return;
    const width = Math.min(170, box.ptWidth * 0.3);
    const height = width * signature.aspect;
    setPlacement({ page, width, x: box.ptWidth - width - 54, y: box.ptHeight - height - 72 });
  };

  const handleSign = async () => {
    if (!file || !signature || !placement) return;
    setWorking(true);
    setError(null);
    try {
      const out = await signPDF(file, signature.dataUrl, {
        pageIndex: placement.page,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.width * signature.aspect,
      });
      const blob = new Blob([out as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResult(blob);
      void addHistoryEntry({ tool: "Sign", fileName: file.name, size: blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signing failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <ToolLayout title="Sign PDF" description="Draw your signature, then drag it where it belongs" icon={PenLine} wide>
      {!file ? (
        <PdfDropzone onFiles={handleFiles} label="Drop the PDF to sign" />
      ) : result ? (
        <ResultCard
          verb={`Signed on page ${placement!.page + 1}`}
          blob={result}
          fileName={file.name.replace(/\.pdf$/i, "") + "_signed.pdf"}
          note="This is a visible signature stamp, not a certificate-based digital signature."
          actions={
            <Button variant="outline" onClick={() => setResult(null)}>
              <SlidersHorizontal className="h-4 w-4" /> Adjust
            </Button>
          }
          onReset={() => {
            reset();
            setSignature(null);
          }}
          resetLabel="Sign another"
        />
      ) : !signature ? (
        <div className="mx-auto max-w-2xl space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl">Your signature</h2>
            <span className="truncate text-xs text-muted-foreground">{file.name}</span>
          </div>
          <SignaturePad onDone={setSignature} />
          <p className="text-xs text-muted-foreground">
            This adds a picture of your signature to the page. It is not a certificate-based digital signature.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <EncryptedNotice file={file} />
          {error && <ErrorNote>{error}</ErrorNote>}
          <Viewer
            file={file}
            doc={doc}
            pageCount={pageCount}
            page={page}
            onPage={setPage}
            onChangeFile={reset}
            badgeOf={(i) =>
              placement?.page === i ? (
                <span className="absolute right-1 top-1 rounded bg-primary px-1 text-[9px] font-medium text-primary-foreground">Signed</span>
              ) : null
            }
            dock={
              <>
                <span className="text-xs text-muted-foreground">
                  {placement && placement.page !== page ? `Signature is on page ${placement.page + 1}` : "Drag the signature into place"}
                </span>
                {placement && placement.page !== page && (
                  <Button size="sm" variant="outline" onClick={() => setPlacement({ ...placement, page })}>
                    Move here
                  </Button>
                )}
                <DockDivider />
                {placement && (
                  <DockItem label="Size">
                    <input
                      id="sig-size"
                      aria-label="Signature size"
                      type="range"
                      min="60"
                      max="320"
                      step="5"
                      value={placement.width}
                      onChange={(e) => setPlacement({ ...placement, width: Number(e.target.value) })}
                      className="w-24 accent-[var(--paper)]"
                    />
                  </DockItem>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSignature(null)}>
                  <Pencil className="h-4 w-4" /> Redraw
                </Button>
                <Button size="sm" onClick={handleSign} disabled={!placement || working}>
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />} Sign
                </Button>
              </>
            }
          >
            {doc && (
              <PageCanvas doc={doc} index={page} onBox={placeDefault}>
                {(box) => {
                  if (!placement || placement.page !== page) return null;
                  const k = box.width / box.ptWidth;
                  const w = placement.width * k;
                  const h = w * signature.aspect;
                  return (
                    <div
                      role="img"
                      aria-label="Signature, drag to move"
                      className="absolute cursor-move touch-none rounded-sm outline outline-1 outline-dashed outline-[#1d4ed8]/60 hover:outline-[#1d4ed8]"
                      style={{ left: placement.x * k, top: placement.y * k, width: w, height: h }}
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        drag.current = { startX: e.clientX, startY: e.clientY, x: placement.x, y: placement.y, k, box };
                      }}
                      onPointerMove={(e) => {
                        const d = drag.current;
                        if (!d) return;
                        const hPt = placement.width * signature.aspect;
                        const x = Math.min(Math.max(0, d.x + (e.clientX - d.startX) / d.k), d.box.ptWidth - placement.width);
                        const y = Math.min(Math.max(0, d.y + (e.clientY - d.startY) / d.k), d.box.ptHeight - hPt);
                        setPlacement({ ...placement, x, y });
                      }}
                      onPointerUp={() => (drag.current = null)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={signature.dataUrl} alt="" draggable={false} className="h-full w-full select-none" />
                    </div>
                  );
                }}
              </PageCanvas>
            )}
          </Viewer>
        </div>
      )}
    </ToolLayout>
  );
}
