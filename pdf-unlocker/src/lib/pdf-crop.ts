import { PDFDocument } from "pdf-lib";
import { canvasToJpegBytes, loadPdfDocument } from "./pdf-utils";

const MM_TO_PT = 2.835;

export type CropMode = "cropbox" | "destructive";

/**
 * Crop PDF pages.
 * - cropbox: sets CropBox only (content still in file; many viewers hide it)
 * - destructive: rasterizes cropped region so removed margins are gone forever
 */
export async function cropPDF(
  file: File,
  margins: { top: number; right: number; bottom: number; left: number },
  pageIndices: "all" | number[],
  mode: CropMode = "cropbox"
): Promise<Uint8Array> {
  if (mode === "destructive") {
    return destructiveCrop(file, margins, pageIndices);
  }

  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const count = doc.getPageCount();

  const indices =
    pageIndices === "all"
      ? Array.from({ length: count }, (_, i) => i)
      : pageIndices;

  const top = margins.top * MM_TO_PT;
  const right = margins.right * MM_TO_PT;
  const bottom = margins.bottom * MM_TO_PT;
  const left = margins.left * MM_TO_PT;

  for (const i of indices) {
    if (i < 0 || i >= count) continue;
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const cropW = Math.max(1, width - left - right);
    const cropH = Math.max(1, height - top - bottom);
    page.setCropBox(left, bottom, cropW, cropH);
    page.setMediaBox(left, bottom, cropW, cropH);
  }

  return doc.save();
}

async function destructiveCrop(
  file: File,
  margins: { top: number; right: number; bottom: number; left: number },
  pageIndices: "all" | number[]
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const srcPdf = await loadPdfDocument(bytes);
  const outDoc = await PDFDocument.create();
  const count = srcPdf.numPages;

  const indices = new Set(
    pageIndices === "all"
      ? Array.from({ length: count }, (_, i) => i)
      : pageIndices
  );

  const scale = 2;
  const top = margins.top * MM_TO_PT;
  const right = margins.right * MM_TO_PT;
  const bottom = margins.bottom * MM_TO_PT;
  const left = margins.left * MM_TO_PT;

  for (let i = 0; i < count; i++) {
    const page = await srcPdf.getPage(i + 1);
    const vpNative = page.getViewport({ scale: 1 });

    if (!indices.has(i)) {
      // Keep uncropped pages as full raster for a consistent output pipeline
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({
        canvasContext: canvas.getContext("2d")!,
        canvas,
        viewport,
      }).promise;
      const jpeg = await canvasToJpegBytes(canvas, 0.92);
      const img = await outDoc.embedJpg(jpeg as Uint8Array<ArrayBuffer>);
      const p = outDoc.addPage([vpNative.width, vpNative.height]);
      p.drawImage(img, { x: 0, y: 0, width: vpNative.width, height: vpNative.height });
      continue;
    }

    const cropX = left;
    const cropY = top;
    const cropW = Math.max(1, vpNative.width - left - right);
    const cropH = Math.max(1, vpNative.height - top - bottom);

    const viewport = page.getViewport({ scale });
    const full = document.createElement("canvas");
    full.width = Math.round(viewport.width);
    full.height = Math.round(viewport.height);
    await page.render({
      canvasContext: full.getContext("2d")!,
      canvas: full,
      viewport,
    }).promise;

    const out = document.createElement("canvas");
    out.width = Math.round(cropW * scale);
    out.height = Math.round(cropH * scale);
    out.getContext("2d")!.drawImage(
      full,
      Math.round(cropX * scale),
      Math.round(cropY * scale),
      out.width,
      out.height,
      0,
      0,
      out.width,
      out.height
    );

    const jpeg = await canvasToJpegBytes(out, 0.92);
    const img = await outDoc.embedJpg(jpeg as Uint8Array<ArrayBuffer>);
    const p = outDoc.addPage([cropW, cropH]);
    p.drawImage(img, { x: 0, y: 0, width: cropW, height: cropH });
  }

  return outDoc.save();
}
