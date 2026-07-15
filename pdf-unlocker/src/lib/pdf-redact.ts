import { PDFDocument } from "pdf-lib";
import { canvasToJpegBytes, loadPdfDocument } from "./pdf-utils";

export interface Redaction {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * True redaction: rasterize each page, paint permanent black boxes, rebuild PDF.
 * Content under boxes is destroyed (not just covered). Text/links on redacted
 * pages are lost because the page becomes an image - by design for security.
 */
export async function applyRedactions(file: File, redactions: Redaction[]): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const srcPdf = await loadPdfDocument(bytes);
  const outDoc = await PDFDocument.create();
  const byPage = new Map<number, Redaction[]>();

  for (const r of redactions) {
    const list = byPage.get(r.pageIndex) ?? [];
    list.push(r);
    byPage.set(r.pageIndex, list);
  }

  const scale = 2;

  for (let i = 1; i <= srcPdf.numPages; i++) {
    const page = await srcPdf.getPage(i);
    const vpNative = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;

    const pageRedactions = byPage.get(i - 1) ?? [];
    if (pageRedactions.length) {
      ctx.fillStyle = "#000000";
      for (const r of pageRedactions) {
        // UI coords are in preview space; page UI typically matches pdf.js at some scale.
        // Callers pass coordinates in the same unit system as the preview canvas at `previewScale`.
        // We accept coords already scaled to PDF-point space (top-left origin) via convert on the page.
        // Convention: x,y,width,height are in PDF points, top-left origin.
        const x = r.x * scale;
        const y = r.y * scale;
        const w = r.width * scale;
        const h = r.height * scale;
        ctx.fillRect(x, y, w, h);
      }
    }

    const jpegBytes = await canvasToJpegBytes(canvas, 0.92);
    const img = await outDoc.embedJpg(jpegBytes as Uint8Array<ArrayBuffer>);
    const newPage = outDoc.addPage([vpNative.width, vpNative.height]);
    newPage.drawImage(img, { x: 0, y: 0, width: vpNative.width, height: vpNative.height });
  }

  return outDoc.save();
}

/** Soft cover (legacy): draw black rectangles without removing content. */
export async function coverWithBoxes(file: File, redactions: Redaction[]): Promise<Uint8Array> {
  const { rgb } = await import("pdf-lib");
  const doc = await PDFDocument.load(await file.arrayBuffer());

  for (const r of redactions) {
    const page = doc.getPage(r.pageIndex);
    const { height } = page.getSize();
    page.drawRectangle({
      x: r.x,
      y: height - r.y - r.height,
      width: r.width,
      height: r.height,
      color: rgb(0, 0, 0),
      borderColor: rgb(0, 0, 0),
    });
  }

  return doc.save();
}
