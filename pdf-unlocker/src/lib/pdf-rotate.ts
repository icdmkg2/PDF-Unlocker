import { PDFDocument, degrees } from "pdf-lib";

export async function rotatePDF(
  file: File,
  pageIndices: number[], // 0-based
  angle: 90 | 180 | 270
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();

  for (const i of pageIndices) {
    if (i >= 0 && i < pages.length) {
      const current = pages[i].getRotation().angle;
      pages[i].setRotation(degrees((current + angle) % 360));
    }
  }

  return doc.save();
}
