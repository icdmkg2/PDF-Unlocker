import { PDFDocument } from "pdf-lib";
import { canvasToJpegBytes, loadPdfDocument } from "./pdf-utils";
import { asPdfcpuInput, runPdfcpu } from "./pdfcpu";

export type RasterQuality = "screen" | "ebook" | "print";
export type CompressQuality = "lossless" | RasterQuality;

const SETTINGS: Record<RasterQuality, { scale: number; jpegQuality: number }> = {
  screen: { scale: 1.0, jpegQuality: 0.5 },
  ebook: { scale: 1.5, jpegQuality: 0.72 },
  print: { scale: 2.0, jpegQuality: 0.88 },
};

export async function compressPDF(
  file: File,
  quality: CompressQuality = "lossless",
  onProgress?: (page: number, total: number) => void
): Promise<Uint8Array> {
  return quality === "lossless"
    ? compressLossless(file)
    : compressRaster(file, quality, onProgress);
}

/**
 * Lossless: pdfcpu optimize drops duplicate fonts and images, unused objects
 * and re-compresses streams. Text, links and form fields are kept. If nothing
 * can be saved the original bytes are returned unchanged.
 */
export async function compressLossless(file: File): Promise<Uint8Array> {
  const original = new Uint8Array(await file.arrayBuffer());
  const out = await runPdfcpu(
    ["optimize", "/input/input.pdf", "/output/output.pdf"],
    [await asPdfcpuInput(file)]
  );
  const result = await out.read("output.pdf");
  if (!result) {
    throw new Error(out.errors.at(-1) ?? "This PDF could not be optimized.");
  }
  const bytes = new Uint8Array(await result.arrayBuffer());
  return bytes.length < original.length ? bytes : original;
}

/**
 * Lossy: rasterizes every page to JPEG.
 * Removes selectable text, links, and form fields by design.
 */
export async function compressRaster(
  file: File,
  quality: RasterQuality,
  onProgress?: (page: number, total: number) => void
): Promise<Uint8Array> {
  const { scale, jpegQuality } = SETTINGS[quality];
  const bytes = await file.arrayBuffer();
  const srcPdf = await loadPdfDocument(bytes);
  const outDoc = await PDFDocument.create();
  const total = srcPdf.numPages;

  for (let i = 1; i <= total; i++) {
    onProgress?.(i, total);
    const page = await srcPdf.getPage(i);
    const vpNative = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;

    const jpegBytes = await canvasToJpegBytes(canvas, jpegQuality);
    const jpegImage = await outDoc.embedJpg(jpegBytes as Uint8Array<ArrayBuffer>);
    const newPage = outDoc.addPage([vpNative.width, vpNative.height]);
    newPage.drawImage(jpegImage, { x: 0, y: 0, width: vpNative.width, height: vpNative.height });
  }

  return outDoc.save();
}
