import { PDFDocument } from "pdf-lib";

const MM_TO_PT = 2.835;

export async function cropPDF(
  file: File,
  margins: { top: number; right: number; bottom: number; left: number },
  pageIndices: "all" | number[]
): Promise<Uint8Array> {
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
    page.setCropBox(left, bottom, width - left - right, height - top - bottom);
  }

  return doc.save();
}
