import { PDFDocument } from "pdf-lib";
import { canvasToJpegBytes, loadPdfDocument } from "./pdf-utils";

export type CompressQuality = "screen" | "ebook" | "print";

const SETTINGS: Record<CompressQuality, { scale: number; jpegQuality: number }> = {
  screen: { scale: 1.0, jpegQuality: 0.5 },
  ebook: { scale: 1.5, jpegQuality: 0.72 },
  print: { scale: 2.0, jpegQuality: 0.88 },
};

/**
 * Lossy compress: rasterizes every page to JPEG.
 * Removes selectable text, links, and form fields by design.
 */
export async function compressPDF(
  file: File,
  quality: CompressQuality = "ebook",
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
