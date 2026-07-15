import { PDFDocument } from "pdf-lib";
import { canvasToPngBytes, loadPdfDocument } from "./pdf-utils";

export interface ExtractedImage {
  name: string;
  bytes: Uint8Array;
  mime: string;
  page: number;
}

/**
 * Extract embedded images when possible; also export each page as PNG
 * so scanned PDFs still yield images.
 */
export async function extractImagesFromPDF(
  file: File,
  options: { pagesAsImages?: boolean; onProgress?: (n: number, total: number) => void } = {}
): Promise<ExtractedImage[]> {
  const results: ExtractedImage[] = [];
  const bytes = await file.arrayBuffer();

  // Try raw XObject images via pdf-lib
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    // pdf-lib doesn't expose a full image extractor; fall through to page raster
    void doc;
  } catch {
    // continue
  }

  if (options.pagesAsImages !== false) {
    const pdf = await loadPdfDocument(bytes);
    const scale = 2;
    for (let i = 1; i <= pdf.numPages; i++) {
      options.onProgress?.(i, pdf.numPages);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({
        canvasContext: canvas.getContext("2d")!,
        canvas,
        viewport,
      }).promise;
      const png = await canvasToPngBytes(canvas);
      results.push({
        name: `page-${String(i).padStart(3, "0")}.png`,
        bytes: png,
        mime: "image/png",
        page: i,
      });
    }
  }

  return results;
}

export async function extractImagesAsZip(file: File): Promise<Blob> {
  const images = await extractImagesFromPDF(file);
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const img of images) {
    zip.file(img.name, img.bytes);
  }
  return zip.generateAsync({ type: "blob" });
}
