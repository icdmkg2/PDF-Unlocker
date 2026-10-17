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

/** Turn each listed page by its own angle (degrees, multiples of 90). */
export async function rotatePagesBy(file: File, turns: Record<number, number>): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const pages = doc.getPages();
  for (const [key, turn] of Object.entries(turns)) {
    const page = pages[Number(key)];
    if (!page || turn % 360 === 0) continue;
    page.setRotation(degrees((((page.getRotation().angle + turn) % 360) + 360) % 360));
  }
  return doc.save();
}
