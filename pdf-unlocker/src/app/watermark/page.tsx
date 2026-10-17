"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard } from "@/components/result-card";
import { ErrorNote } from "@/components/steps";
import { usePdfDoc, Pills } from "@/components/workbench";
import { DockDivider, DockItem, PageCanvas, Viewer, type PageBox } from "@/components/viewer";
import { Droplets, Loader2, SlidersHorizontal, ImagePlus } from "lucide-react";
import { addWatermark, centeredOrigin } from "@/lib/pdf-watermark";
import { addHistoryEntry } from "@/lib/local-history";

const SIZES = [
  { id: 24, label: "S" },
  { id: 48, label: "M" },
  { id: 72, label: "L" },
];
const IMAGE_SCALE = 0.35;

function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/** Width of the text in PDF points, measured the way pdf-lib's Helvetica Bold will draw it. */
function textWidthPt(text: string, size: number) {
  if (typeof document === "undefined") return text.length * size * 0.6;
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = `bold ${size}px Helvetica, Arial, sans-serif`;
  return ctx.measureText(text).width;
}

/** Positions of every stamp on a page, mirroring addWatermark's layout. */
function stampPositions(box: PageBox, w: number, h: number, tiled: boolean, isText: boolean, fontSize: number, rotation: number) {
  const { ptWidth: pw, ptHeight: ph } = box;
  if (!tiled) return [centeredOrigin(pw / 2, ph / 2, w, isText ? fontSize * 0.7 : h, rotation)];
  const out: { x: number; y: number }[] = [];
  if (isText) {
    const step = fontSize * 4;
    for (let y = 0; y < ph + step; y += step) for (let x = -w; x < pw + w; x += step + w) out.push({ x, y });
  } else {
    for (let y = 0; y < ph + h * 1.5; y += h * 1.5) for (let x = 0; x < pw + w * 1.5; x += w * 1.5) out.push({ x, y });
  }
  return out;
}

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const { doc, pageCount } = usePdfDoc(file);
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(45);
  const [fontSize, setFontSize] = useState(48);
  const [tiled, setTiled] = useState(false);
  const [color, setColor] = useState("#888888");
  const [image, setImage] = useState<{ url: string; w: number; h: number } | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setPage(0);
    setError(null);
    setResult(null);
  }, []);

  const reset = () => {
    setFile(null);
    setError(null);
    setResult(null);
  };

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const img = new Image();
      img.onload = () => setImage({ url, w: img.naturalWidth, h: img.naturalHeight });
      img.src = url;
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const isText = mode === "text";
  const stampW = useMemo(() => (isText ? textWidthPt(text, fontSize) : (image?.w ?? 0) * IMAGE_SCALE), [isText, text, fontSize, image]);
  const stampH = isText ? fontSize : (image?.h ?? 0) * IMAGE_SCALE;
  const ready = isText ? !!text.trim() : !!image;

  const handleSave = async () => {
    if (!file || !ready) return;
    setWorking(true);
    setError(null);
    try {
      const bytes = await addWatermark(file, {
        text: isText ? text : "",
        opacity,
        fontSize,
        rotation,
        tiled,
        color: hexToRgb(color),
        imageDataUrl: isText ? null : image?.url,
        imageScale: IMAGE_SCALE,
      });
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResult(blob);
      void addHistoryEntry({ tool: "Watermark", fileName: file.name, size: blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Watermark failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <ToolLayout title="Add Watermark" description="Stamp text or an image on every page; the page shows exactly where" icon={Droplets} wide>
      {!file ? (
        <PdfDropzone onFiles={handleFiles} label="Drop the PDF to watermark" />
      ) : result ? (
        <ResultCard
          verb="Watermarked"
          blob={result}
          fileName={file.name.replace(/\.pdf$/i, "") + "_watermarked.pdf"}
          actions={
            <Button variant="outline" onClick={() => setResult(null)}>
              <SlidersHorizontal className="h-4 w-4" /> Adjust
            </Button>
          }
          onReset={reset}
          resetLabel="Watermark another"
        />
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
            dock={
              <>
                <Pills label="Watermark type" options={[{ id: "text", label: "Text" }, { id: "image", label: "Image" }]} value={mode} onChange={setMode} />
                <DockDivider />
                {isText ? (
                  <>
                    <Input id="wm-text" aria-label="Watermark text" value={text} onChange={(e) => setText(e.target.value)} className="h-8 w-36" />
                    <Pills label="Text size" options={SIZES} value={fontSize} onChange={setFontSize} />
                    <input id="wm-color" aria-label="Color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-8 cursor-pointer rounded border border-border bg-transparent" />
                  </>
                ) : (
                  <label className="flex h-8 cursor-pointer items-center gap-2 rounded-full border border-border px-3 text-xs text-muted-foreground hover:text-foreground">
                    <ImagePlus className="h-3.5 w-3.5" /> {image ? "Change image" : "Choose image"}
                    <input id="wm-image" type="file" accept="image/png,image/jpeg" className="hidden" onChange={pickImage} />
                  </label>
                )}
                <DockDivider />
                <DockItem label={`${Math.round(opacity * 100)}%`}>
                  <input id="wm-opacity" aria-label="Opacity" type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-20 accent-[var(--paper)]" />
                </DockItem>
                <DockItem label={`${rotation}°`}>
                  <input id="wm-angle" aria-label="Angle" type="range" min="-90" max="90" step="5" value={rotation} onChange={(e) => setRotation(parseInt(e.target.value))} className="w-20 accent-[var(--paper)]" />
                </DockItem>
                <Pills label="Layout" options={[{ id: "center", label: "Center" }, { id: "tile", label: "Tile" }]} value={tiled ? "tile" : "center"} onChange={(v) => setTiled(v === "tile")} />
                <Button size="sm" onClick={handleSave} disabled={!ready || working}>
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />} Save
                </Button>
              </>
            }
          >
            {doc && (
              <PageCanvas doc={doc} index={page}>
                {(box) => {
                  const k = box.width / box.ptWidth;
                  return (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                      {ready &&
                        stampPositions(box, stampW, stampH, tiled, isText, fontSize, rotation).map((p, i) => (
                          <span
                            key={i}
                            className="absolute whitespace-nowrap font-bold leading-none"
                            style={{
                              left: p.x * k,
                              bottom: p.y * k,
                              transform: `rotate(${-rotation}deg)`,
                              transformOrigin: "left bottom",
                              opacity,
                              color,
                              fontSize: fontSize * k,
                              fontFamily: "Helvetica, Arial, sans-serif",
                            }}
                          >
                            {isText ? (
                              text
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={image!.url} alt="" style={{ width: stampW * k, height: stampH * k, display: "block" }} />
                            )}
                          </span>
                        ))}
                    </div>
                  );
                }}
              </PageCanvas>
            )}
          </Viewer>
          <p className="text-center text-xs text-muted-foreground">The watermark goes on every page.</p>
        </div>
      )}
    </ToolLayout>
  );
}
